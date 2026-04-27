-- Migration: Booking Core
-- Description: Canonical bookings table and status tracking
-- Dependencies: 20260108120002_trust_provider_layer.sql
-- Idempotent: Yes

-- =============================================================================
-- TABLE: bookings (CANONICAL)
-- Purpose: Universal booking record - all booking types share this
-- =============================================================================

CREATE TABLE IF NOT EXISTS bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Participants
  customer_id uuid NOT NULL,  -- Links to users
  provider_id uuid REFERENCES service_providers(id) ON DELETE RESTRICT,  -- NULL until accepted
  
  -- Service
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE RESTRICT,
  service_type_id uuid NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
  booking_flow_type booking_flow_type NOT NULL,
  
  -- Status
  status booking_status DEFAULT 'draft',
  
  -- Pricing
  quoted_price decimal(10,2),  -- Provider's quote (for project/quote_only services)
  agreed_price decimal(10,2),  -- Final agreed price
  currency text DEFAULT 'KES',
  
  -- Timing
  requested_at timestamptz,  -- When customer submitted
  provider_viewed_at timestamptz,  -- When provider opened booking
  provider_responded_at timestamptz,  -- When provider accepted/quoted
  scheduled_start timestamptz,  -- Expected start time
  scheduled_end timestamptz,  -- Expected end time
  actual_start timestamptz,  -- When work actually started
  actual_end timestamptz,  -- When work actually finished
  completed_at timestamptz,  -- When marked complete
  
  -- Payment
  payment_status text DEFAULT 'pending',  -- 'pending', 'paid', 'refunded', 'disputed'
  payment_method text,  -- 'mpesa', 'card', 'cash'
  payment_ref text,  -- Transaction ID
  
  -- Notes
  customer_notes text,
  provider_notes text,
  cancellation_reason text,
  
  -- Metadata
  metadata jsonb,  -- Flexible field for service-specific data
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT booking_price_logic CHECK (
    (quoted_price IS NULL) OR (quoted_price > 0)
  ),
  CONSTRAINT booking_agreed_price_positive CHECK (
    (agreed_price IS NULL) OR (agreed_price > 0)
  ),
  CONSTRAINT booking_time_logic CHECK (
    (scheduled_end IS NULL) OR (scheduled_start IS NULL) OR (scheduled_end > scheduled_start)
  ),
  CONSTRAINT booking_actual_time_logic CHECK (
    (actual_end IS NULL) OR (actual_start IS NULL) OR (actual_end > actual_start)
  )
);

CREATE INDEX IF NOT EXISTS idx_bookings_customer_id ON bookings(customer_id);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_id ON bookings(provider_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_id ON bookings(service_id);
CREATE INDEX IF NOT EXISTS idx_bookings_service_type_id ON bookings(service_type_id);
CREATE INDEX IF NOT EXISTS idx_bookings_booking_flow_type ON bookings(booking_flow_type);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
CREATE INDEX IF NOT EXISTS idx_bookings_payment_status ON bookings(payment_status);
CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bookings_scheduled_start ON bookings(scheduled_start) WHERE scheduled_start IS NOT NULL;

-- Compound indexes for common queries
CREATE INDEX IF NOT EXISTS idx_bookings_customer_status ON bookings(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_bookings_provider_status ON bookings(provider_id, status) WHERE provider_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_bookings_provider_pending ON bookings(provider_id, status) 
  WHERE provider_id IS NOT NULL AND status IN ('submitted', 'provider_viewed');

COMMENT ON TABLE bookings IS 'Canonical booking record - contains ONLY universal fields';
COMMENT ON COLUMN bookings.booking_flow_type IS 'Determines which detail table to join (emergency, standard, delivery, project, personal)';
COMMENT ON COLUMN bookings.provider_id IS 'NULL until provider accepts/responds';
COMMENT ON COLUMN bookings.quoted_price IS 'Provider quote for project/quote_only services';
COMMENT ON COLUMN bookings.agreed_price IS 'Final price after negotiation';

DROP TRIGGER IF EXISTS update_bookings_updated_at ON bookings;
CREATE TRIGGER update_bookings_updated_at
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: booking_status_history
-- Purpose: Audit trail of status changes
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_status_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  from_status booking_status,
  to_status booking_status NOT NULL,
  
  changed_by uuid NOT NULL,  -- User who made the change
  changed_by_role text NOT NULL,  -- 'customer', 'provider', 'admin'
  
  reason text,
  notes text,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_status_history_booking_id ON booking_status_history(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_status_history_created_at ON booking_status_history(created_at DESC);

COMMENT ON TABLE booking_status_history IS 'Complete audit trail of booking status transitions';
COMMENT ON COLUMN booking_status_history.changed_by_role IS 'Who made the change (for filtering)';

-- =============================================================================
-- TABLE: locations
-- Purpose: First-class location object (reusable)
-- =============================================================================

CREATE TABLE IF NOT EXISTS locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  
  user_id uuid,  -- Owner of this location (if saved)
  
  -- Address
  address_line1 text NOT NULL,
  address_line2 text,
  area text,  -- 'Westlands', 'Kilimani'
  city text DEFAULT 'Nairobi',
  county text,
  country text DEFAULT 'Kenya',
  postal_code text,
  
  -- Coordinates
  latitude decimal(10,8),
  longitude decimal(11,8),
  
  -- Access
  access_notes text,  -- Gate code, landmarks, instructions
  
  -- Type
  location_type location_type,
  
  -- Saved location
  is_saved boolean DEFAULT false,
  label text,  -- 'Home', 'Office', etc.
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_locations_user_id ON locations(user_id) WHERE is_saved = true;
CREATE INDEX IF NOT EXISTS idx_locations_coordinates ON locations(latitude, longitude) WHERE latitude IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_locations_area ON locations(area);

COMMENT ON TABLE locations IS 'Reusable location records for bookings (pickup, dropoff, service location)';
COMMENT ON COLUMN locations.is_saved IS 'True if user saved this location for reuse';
COMMENT ON COLUMN locations.access_notes IS 'Gate codes, landmarks, special instructions';

DROP TRIGGER IF EXISTS update_locations_updated_at ON locations;
CREATE TRIGGER update_locations_updated_at
  BEFORE UPDATE ON locations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: booking_quotes
-- Purpose: Quote submissions for project/quote_only services
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  -- Quote details
  quoted_price decimal(10,2) NOT NULL CHECK (quoted_price > 0),
  currency text DEFAULT 'KES',
  
  breakdown jsonb,  -- Itemized cost breakdown
  description text,
  
  validity_days int DEFAULT 7,  -- Quote valid for how many days
  valid_until timestamptz,
  
  -- Status
  status text DEFAULT 'sent',  -- 'sent', 'viewed', 'accepted', 'rejected', 'expired'
  customer_response text,  -- Why accepted/rejected
  
  -- Timestamps
  sent_at timestamptz DEFAULT now(),
  viewed_at timestamptz,
  responded_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT quote_one_per_provider UNIQUE(booking_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_booking_quotes_booking_id ON booking_quotes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_quotes_provider_id ON booking_quotes(provider_id);
CREATE INDEX IF NOT EXISTS idx_booking_quotes_status ON booking_quotes(status);

COMMENT ON TABLE booking_quotes IS 'Provider quotes for project/quote_only services';
COMMENT ON COLUMN booking_quotes.breakdown IS 'JSON object with itemized costs';
COMMENT ON COLUMN booking_quotes.validity_days IS 'How long quote is valid';

DROP TRIGGER IF EXISTS update_booking_quotes_updated_at ON booking_quotes;
CREATE TRIGGER update_booking_quotes_updated_at
  BEFORE UPDATE ON booking_quotes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: booking_media
-- Purpose: Photos/videos attached to bookings
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_media (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  uploaded_by uuid NOT NULL,  -- Customer or provider
  uploaded_by_role text NOT NULL,  -- 'customer', 'provider'
  
  media_type text NOT NULL,  -- 'photo', 'video', 'document'
  media_url text NOT NULL,
  
  caption text,
  
  -- When/why uploaded
  stage text NOT NULL,  -- 'before', 'during', 'after', 'proof', 'issue'
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_media_booking_id ON booking_media(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_media_stage ON booking_media(stage);
CREATE INDEX IF NOT EXISTS idx_booking_media_uploaded_by ON booking_media(uploaded_by);

COMMENT ON TABLE booking_media IS 'Photos/videos for bookings (before/after, proof, issues)';
COMMENT ON COLUMN booking_media.stage IS 'When photo was taken (before work, after work, proof of completion, issue documentation)';

-- =============================================================================
-- TABLE: booking_messages
-- Purpose: Communication between customer and provider
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  sender_id uuid NOT NULL,
  sender_role text NOT NULL,  -- 'customer', 'provider', 'admin'
  
  message text NOT NULL,
  
  is_read boolean DEFAULT false,
  read_at timestamptz,
  
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking_id ON booking_messages(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_messages_created_at ON booking_messages(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_messages_unread ON booking_messages(booking_id, is_read) WHERE is_read = false;

COMMENT ON TABLE booking_messages IS 'In-app messaging between customer and provider per booking';

-- =============================================================================
-- TABLE: booking_disputes
-- Purpose: Issues raised with bookings
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  reported_by uuid NOT NULL,
  reported_by_role text NOT NULL,  -- 'customer', 'provider'
  
  dispute_type text NOT NULL,  -- 'quality', 'pricing', 'cancellation', 'safety', 'damage', 'no_show'
  severity dispute_severity DEFAULT 'medium',
  
  description text NOT NULL,
  evidence_urls jsonb,  -- Array of photo/document URLs
  
  -- Resolution
  status text DEFAULT 'open',  -- 'open', 'investigating', 'resolved', 'closed'
  resolution text,
  resolved_by uuid,  -- Admin who resolved
  resolved_at timestamptz,
  
  -- Refund
  refund_amount decimal(10,2),
  refund_status text,  -- 'pending', 'approved', 'rejected', 'processed'
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_booking_disputes_booking_id ON booking_disputes(booking_id);
CREATE INDEX IF NOT EXISTS idx_booking_disputes_status ON booking_disputes(status);
CREATE INDEX IF NOT EXISTS idx_booking_disputes_severity ON booking_disputes(severity);
CREATE INDEX IF NOT EXISTS idx_booking_disputes_reported_by ON booking_disputes(reported_by);
CREATE INDEX IF NOT EXISTS idx_booking_disputes_created_at ON booking_disputes(created_at DESC);

COMMENT ON TABLE booking_disputes IS 'Customer/provider issues and disputes';
COMMENT ON COLUMN booking_disputes.severity IS 'Triage priority (low, medium, high)';

DROP TRIGGER IF EXISTS update_booking_disputes_updated_at ON booking_disputes;
CREATE TRIGGER update_booking_disputes_updated_at
  BEFORE UPDATE ON booking_disputes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
