-- Migration: Booking Flow Detail Tables
-- Description: Flow-specific booking data (emergency, standard, delivery, project, personal)
-- Dependencies: 20260108120003_booking_core.sql
-- Idempotent: Yes

-- =============================================================================
-- TABLE: booking_emergency_details
-- Purpose: Emergency-specific booking data
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_emergency_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Problem
  problem_description text NOT NULL,
  damage_risk_level damage_risk_level NOT NULL,
  
  -- Access
  access_notes text,  -- Gate code, emergency contact, entry instructions
  
  -- Photos
  problem_photos jsonb,  -- Array of photo URLs showing the problem
  
  -- Response
  is_immediate boolean DEFAULT true,  -- Must be NOW (vs scheduled emergency)
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
  
  -- Note: Emergency service validation enforced via trigger (CHECK constraints cannot use subqueries)
);

CREATE INDEX IF NOT EXISTS idx_emergency_details_damage_risk ON booking_emergency_details(damage_risk_level);

COMMENT ON TABLE booking_emergency_details IS 'Emergency-specific booking data - burst pipes, power outages, lockouts';
COMMENT ON COLUMN booking_emergency_details.is_immediate IS 'True = NOW, False = urgent but can schedule';
COMMENT ON COLUMN booking_emergency_details.access_notes IS 'Critical for emergency access (gate codes, caretaker contact)';

DROP TRIGGER IF EXISTS update_booking_emergency_details_updated_at ON booking_emergency_details;
CREATE TRIGGER update_booking_emergency_details_updated_at
  BEFORE UPDATE ON booking_emergency_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: booking_standard_details
-- Purpose: Standard repair/installation/maintenance booking data
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_standard_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Job description
  job_description text NOT NULL,
  job_type text,  -- 'repair', 'installation', 'maintenance', 'inspection'
  
  -- Scheduling
  preferred_date date,
  preferred_time_start time,
  preferred_time_end time,
  is_flexible_timing boolean DEFAULT false,
  
  -- Site visit
  requires_site_visit boolean DEFAULT false,
  
  -- Recurrence (for recurring bookings)
  is_recurring boolean DEFAULT false,
  recurrence_pattern jsonb,  -- {frequency: 'weekly', day_of_week: 1, time: '10:00'}
  recurrence_end_date date,
  
  -- Materials
  materials_provided_by text,  -- 'customer', 'provider', 'both'
  materials_notes text,
  
  -- Photos
  reference_photos jsonb,  -- Array of photo URLs
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validation
  CONSTRAINT recurring_has_pattern CHECK (
    (is_recurring = false) OR
    (is_recurring = true AND recurrence_pattern IS NOT NULL)
  ),
  CONSTRAINT recurring_has_end_date CHECK (
    (is_recurring = false) OR
    (is_recurring = true AND recurrence_end_date IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_standard_details_preferred_date ON booking_standard_details(preferred_date);
CREATE INDEX IF NOT EXISTS idx_standard_details_is_recurring ON booking_standard_details(is_recurring) WHERE is_recurring = true;
CREATE INDEX IF NOT EXISTS idx_standard_details_job_type ON booking_standard_details(job_type);

COMMENT ON TABLE booking_standard_details IS 'Standard scheduled work - repairs, installations, maintenance';
COMMENT ON COLUMN booking_standard_details.is_recurring IS 'True for weekly cleaning, monthly maintenance, etc.';
COMMENT ON COLUMN booking_standard_details.recurrence_pattern IS 'JSON defining frequency, day, time';

DROP TRIGGER IF EXISTS update_booking_standard_details_updated_at ON booking_standard_details;
CREATE TRIGGER update_booking_standard_details_updated_at
  BEFORE UPDATE ON booking_standard_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: booking_delivery_details
-- Purpose: Delivery/pickup service booking data
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_delivery_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Item details
  item_description text NOT NULL,
  quantity decimal(10,2) NOT NULL,
  unit text NOT NULL,  -- 'kg', 'pieces', 'liters', 'items'
  
  -- Locations (using locations table)
  pickup_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  dropoff_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  
  -- Time windows
  pickup_time_window_start timestamptz,
  pickup_time_window_end timestamptz,
  dropoff_time_window_start timestamptz,
  dropoff_time_window_end timestamptz,
  
  -- Delivery type
  delivery_type text DEFAULT 'pickup_and_return',  -- 'pickup_and_return', 'one_way', 'multi_stop'
  
  -- Special instructions
  pickup_instructions text,
  dropoff_instructions text,
  special_instructions text,
  
  -- Proof of delivery
  requires_signature boolean DEFAULT false,
  proof_of_delivery_required boolean DEFAULT true,
  
  -- Photos
  pickup_photos jsonb,  -- Photos at pickup
  delivery_photos jsonb,  -- Photos at delivery
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validation
  CONSTRAINT quantity_positive CHECK (quantity > 0),
  CONSTRAINT different_locations CHECK (pickup_location_id != dropoff_location_id),
  CONSTRAINT pickup_time_window_valid CHECK (
    (pickup_time_window_end IS NULL) OR
    (pickup_time_window_start IS NULL) OR
    (pickup_time_window_end > pickup_time_window_start)
  ),
  CONSTRAINT dropoff_time_window_valid CHECK (
    (dropoff_time_window_end IS NULL) OR
    (dropoff_time_window_start IS NULL) OR
    (dropoff_time_window_end > dropoff_time_window_start)
  ),
  CONSTRAINT dropoff_after_pickup CHECK (
    (dropoff_time_window_start IS NULL) OR
    (pickup_time_window_end IS NULL) OR
    (dropoff_time_window_start > pickup_time_window_end)
  )
);

CREATE INDEX IF NOT EXISTS idx_delivery_details_pickup_location ON booking_delivery_details(pickup_location_id);
CREATE INDEX IF NOT EXISTS idx_delivery_details_dropoff_location ON booking_delivery_details(dropoff_location_id);
CREATE INDEX IF NOT EXISTS idx_delivery_details_pickup_time ON booking_delivery_details(pickup_time_window_start);
CREATE INDEX IF NOT EXISTS idx_delivery_details_delivery_type ON booking_delivery_details(delivery_type);

COMMENT ON TABLE booking_delivery_details IS 'Delivery/pickup services - laundry, water, gas, groceries';
COMMENT ON COLUMN booking_delivery_details.delivery_type IS 'pickup_and_return (laundry), one_way (water delivery), multi_stop (shopping)';

DROP TRIGGER IF EXISTS update_booking_delivery_details_updated_at ON booking_delivery_details;
CREATE TRIGGER update_booking_delivery_details_updated_at
  BEFORE UPDATE ON booking_delivery_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: booking_project_details
-- Purpose: Large project/quote-based work booking data
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_project_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Project description
  project_summary text NOT NULL,
  project_scope text,  -- Detailed scope of work
  
  -- Property context
  property_type property_type,
  property_size_sqm decimal(10,2),
  room_count int,
  floor_count int,
  property_condition text,  -- 'new', 'good', 'needs_work', 'poor'
  
  -- Site visit
  site_visit_required boolean DEFAULT true,
  preferred_site_visit_date date,
  preferred_site_visit_time time,
  
  -- Timeline
  flexible_timeline boolean DEFAULT false,
  expected_start_window text,  -- 'Next 2 weeks', 'Within month', 'Flexible'
  estimated_duration_days int,
  
  -- Budget
  budget_range_min decimal(10,2),
  budget_range_max decimal(10,2),
  budget_notes text,
  
  -- Milestones
  milestone_based boolean DEFAULT false,
  milestone_descriptions jsonb,  -- Array of milestone descriptions
  
  -- Photos/documents
  reference_photos jsonb,
  floor_plans jsonb,
  other_documents jsonb,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validation
  CONSTRAINT budget_range_valid CHECK (
    (budget_range_min IS NULL) OR 
    (budget_range_max IS NULL) OR
    (budget_range_max >= budget_range_min)
  ),
  CONSTRAINT milestone_logic CHECK (
    (milestone_based = false) OR
    (milestone_based = true AND milestone_descriptions IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_project_details_property_type ON booking_project_details(property_type);
CREATE INDEX IF NOT EXISTS idx_project_details_site_visit_date ON booking_project_details(preferred_site_visit_date);
CREATE INDEX IF NOT EXISTS idx_project_details_flexible_timeline ON booking_project_details(flexible_timeline);

COMMENT ON TABLE booking_project_details IS 'Large projects requiring quotes - moving, painting, renovations, events';
COMMENT ON COLUMN booking_project_details.site_visit_required IS 'Most projects need inspection before quoting';
COMMENT ON COLUMN booking_project_details.milestone_based IS 'True if payment by milestone (e.g., 50% upfront, 50% on completion)';

DROP TRIGGER IF EXISTS update_booking_project_details_updated_at ON booking_project_details;
CREATE TRIGGER update_booking_project_details_updated_at
  BEFORE UPDATE ON booking_project_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: booking_personal_details
-- Purpose: Personal/assisted service booking data (human-to-human)
-- =============================================================================

CREATE TABLE IF NOT EXISTS booking_personal_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- Service location (using locations table)
  service_location_id uuid NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  
  -- Duration
  duration_hours decimal(4,2) NOT NULL CHECK (duration_hours > 0),
  
  -- Personal preferences
  preferences jsonb,  -- {gender: 'female', experience: '5+ years', language: 'english'}
  
  -- Safety (CRITICAL for personal services)
  emergency_contact_name text NOT NULL,
  emergency_contact_phone text NOT NULL,
  share_location_with_emergency_contact boolean DEFAULT true,
  
  -- Service-specific fields
  special_notes text,
  
  -- For taxi/transport specifically
  route_description text,  -- 'Westlands to JKIA'
  passenger_count int,
  luggage_count int,
  vehicle_type text,  -- 'sedan', 'suv', 'van'
  
  -- For childcare specifically
  child_age_group text,  -- 'infant', 'toddler', 'child', 'teen'
  special_needs text,
  parent_present boolean,
  
  -- For beauty services specifically
  service_area text,  -- 'living_room', 'bedroom', 'bathroom', 'outdoor'
  products_provided_by text,  -- 'customer', 'provider', 'either'
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validation
  CONSTRAINT emergency_contact_phone_format CHECK (
    emergency_contact_phone ~ '^\+?[0-9]{10,15}$'
  )
);

CREATE INDEX IF NOT EXISTS idx_personal_details_service_location ON booking_personal_details(service_location_id);
CREATE INDEX IF NOT EXISTS idx_personal_details_duration ON booking_personal_details(duration_hours);

COMMENT ON TABLE booking_personal_details IS 'Personal/assisted services - taxi, beauty, childcare, pet care, training';
COMMENT ON COLUMN booking_personal_details.emergency_contact_name IS 'REQUIRED for safety - who to contact if issue';
COMMENT ON COLUMN booking_personal_details.preferences IS 'JSON object with provider preferences (gender, experience, etc)';

DROP TRIGGER IF EXISTS update_booking_personal_details_updated_at ON booking_personal_details;
CREATE TRIGGER update_booking_personal_details_updated_at
  BEFORE UPDATE ON booking_personal_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- VIEW: booking_full_details (convenience for queries)
-- Purpose: Join canonical booking with flow-specific details
-- =============================================================================

CREATE OR REPLACE VIEW booking_full_details AS
SELECT 
  b.*,
  
  -- Emergency details
  bed.problem_description,
  bed.damage_risk_level,
  bed.access_notes as emergency_access_notes,
  
  -- Standard details
  bsd.job_description,
  bsd.job_type,
  bsd.is_recurring,
  bsd.recurrence_pattern,
  
  -- Delivery details
  bdd.item_description,
  bdd.quantity,
  bdd.unit,
  bdd.pickup_location_id,
  bdd.dropoff_location_id,
  bdd.delivery_type,
  
  -- Project details
  bpd.project_summary,
  bpd.property_type,
  bpd.site_visit_required,
  bpd.flexible_timeline,
  bpd.budget_range_min,
  bpd.budget_range_max,
  
  -- Personal details
  bpsd.service_location_id,
  bpsd.duration_hours,
  bpsd.emergency_contact_name,
  bpsd.emergency_contact_phone,
  bpsd.preferences as personal_preferences
  
FROM bookings b
LEFT JOIN booking_emergency_details bed ON bed.booking_id = b.id
LEFT JOIN booking_standard_details bsd ON bsd.booking_id = b.id
LEFT JOIN booking_delivery_details bdd ON bdd.booking_id = b.id
LEFT JOIN booking_project_details bpd ON bpd.booking_id = b.id
LEFT JOIN booking_personal_details bpsd ON bpsd.booking_id = b.id;

COMMENT ON VIEW booking_full_details IS 'Convenience view joining bookings with all flow-specific details';

-- =============================================================================
-- ADDITIONAL TABLES: Shopping Assistance (Special Case - Vertical)
-- =============================================================================

-- Shopping list items
CREATE TABLE IF NOT EXISTS shopping_list_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  -- What customer wants
  item_requested text NOT NULL,
  quantity_requested decimal(10,2) NOT NULL,
  unit text NOT NULL,
  brand_preference text,
  max_price decimal(10,2),
  
  -- What was delivered
  item_delivered text,
  quantity_delivered decimal(10,2),
  unit_price_paid decimal(10,2),
  total_price_paid decimal(10,2),
  actual_brand text,
  
  -- Verification
  receipt_line_item_url text,  -- Photo of specific item on receipt
  verified_by_customer boolean DEFAULT false,
  customer_notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_items_booking_id ON shopping_list_items(booking_id);
CREATE INDEX IF NOT EXISTS idx_shopping_items_verified ON shopping_list_items(verified_by_customer);

COMMENT ON TABLE shopping_list_items IS 'Item-level tracking for shopping assistance bookings';

DROP TRIGGER IF EXISTS update_shopping_list_items_updated_at ON shopping_list_items;
CREATE TRIGGER update_shopping_list_items_updated_at
  BEFORE UPDATE ON shopping_list_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Shopping receipts
CREATE TABLE IF NOT EXISTS shopping_receipts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  
  receipt_photo_url text NOT NULL,
  receipt_number text,
  store_name text,
  total_amount decimal(10,2) NOT NULL,
  
  verified boolean DEFAULT false,
  verification_notes text,
  
  uploaded_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shopping_receipts_booking_id ON shopping_receipts(booking_id);
CREATE INDEX IF NOT EXISTS idx_shopping_receipts_verified ON shopping_receipts(verified);

COMMENT ON TABLE shopping_receipts IS 'Receipt documentation for shopping assistance bookings';

-- =============================================================================
-- ADDITIONAL TABLES: Pest Control (Special Case - Vertical)
-- =============================================================================

-- Pest control specific data
CREATE TABLE IF NOT EXISTS booking_pest_control_details (
  booking_id uuid PRIMARY KEY REFERENCES bookings(id) ON DELETE CASCADE,
  
  pest_type text NOT NULL,  -- 'cockroach', 'bedbugs', 'termites', 'rodents', 'ants', 'mosquitoes'
  infestation_level text NOT NULL,  -- 'light', 'moderate', 'severe'
  
  property_size_sqm decimal(10,2),
  affected_areas jsonb,  -- Array of affected room names
  
  -- Safety warnings (auto-generated based on treatment)
  chemical_used text,
  safety_level text,  -- 'low', 'medium', 'high', 'extreme'
  ventilation_hours int,  -- How long to ventilate after treatment
  pet_evacuation_required boolean DEFAULT false,
  human_evacuation_duration_hours int,
  
  -- Instructions
  preparation_instructions text,
  post_treatment_instructions text,
  
  -- Follow-ups
  requires_followup boolean DEFAULT false,
  followup_schedule jsonb,  -- Array of follow-up dates
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pest_control_pest_type ON booking_pest_control_details(pest_type);
CREATE INDEX IF NOT EXISTS idx_pest_control_requires_followup ON booking_pest_control_details(requires_followup) WHERE requires_followup = true;

COMMENT ON TABLE booking_pest_control_details IS 'Pest control specific data - safety warnings and follow-ups';

DROP TRIGGER IF EXISTS update_booking_pest_control_details_updated_at ON booking_pest_control_details;
CREATE TRIGGER update_booking_pest_control_details_updated_at
  BEFORE UPDATE ON booking_pest_control_details
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Pest control follow-ups
CREATE TABLE IF NOT EXISTS booking_followups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_booking_id uuid NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  followup_booking_id uuid REFERENCES bookings(id) ON DELETE SET NULL,
  
  followup_sequence int NOT NULL,  -- 1, 2, 3...
  scheduled_date date NOT NULL,
  status text DEFAULT 'scheduled',  -- 'scheduled', 'completed', 'skipped', 'cancelled'
  
  notes text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT followup_sequence_unique UNIQUE(original_booking_id, followup_sequence)
);

CREATE INDEX IF NOT EXISTS idx_followups_original_booking ON booking_followups(original_booking_id);
CREATE INDEX IF NOT EXISTS idx_followups_scheduled_date ON booking_followups(scheduled_date);
CREATE INDEX IF NOT EXISTS idx_followups_status ON booking_followups(status);

COMMENT ON TABLE booking_followups IS 'Follow-up bookings for pest control and other multi-visit services';

DROP TRIGGER IF EXISTS update_booking_followups_updated_at ON booking_followups;
CREATE TRIGGER update_booking_followups_updated_at
  BEFORE UPDATE ON booking_followups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
