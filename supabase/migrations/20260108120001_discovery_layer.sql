-- Migration: Discovery Layer (Categories, Services, Service Types)
-- Description: Customer-facing service discovery and operational definitions
-- Dependencies: 20260108120000_core_enums_and_types.sql
-- Idempotent: Yes

-- =============================================================================
-- TABLE: service_categories
-- Purpose: Top-level categories (what customers search for)
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  icon text,  -- Icon identifier for UI
  is_primary boolean DEFAULT true,  -- Main 12 categories vs "More Services" 8
  display_order int NOT NULL,
  is_active boolean DEFAULT true,
  meta_title text,
  meta_description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_categories_is_primary ON service_categories(is_primary) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_display_order ON service_categories(display_order) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_categories_slug ON service_categories(slug);

COMMENT ON TABLE service_categories IS 'Top-level service categories - user search intent driven';
COMMENT ON COLUMN service_categories.is_primary IS 'True = Main 12 visible, False = "More Services" section';
COMMENT ON COLUMN service_categories.display_order IS 'Sort order on homepage';

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_service_categories_updated_at ON service_categories;
CREATE TRIGGER update_service_categories_updated_at
  BEFORE UPDATE ON service_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: service_subcategories (OPTIONAL - for provider self-identification)
-- Purpose: Internal grouping, not exposed to customers
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_subcategories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid REFERENCES service_categories(id) ON DELETE CASCADE,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subcategories_category_id ON service_subcategories(category_id);
CREATE INDEX IF NOT EXISTS idx_subcategories_slug ON service_subcategories(slug);

COMMENT ON TABLE service_subcategories IS 'Optional internal grouping for analytics and provider selection (not customer-facing)';

DROP TRIGGER IF EXISTS update_service_subcategories_updated_at ON service_subcategories;
CREATE TRIGGER update_service_subcategories_updated_at
  BEFORE UPDATE ON service_subcategories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: service_types
-- Purpose: Operational behavior definitions (HOW service executes)
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,  -- 'emergency_repair', 'standard_repair', etc.
  name text NOT NULL,
  booking_flow booking_flow_type NOT NULL,  -- Links to detail table
  description text,
  risk_level int CHECK (risk_level BETWEEN 1 AND 5),  -- 1=low, 5=critical
  trust_level int CHECK (trust_level BETWEEN 1 AND 5),  -- 1=low trust needed, 5=high
  requires_quote boolean DEFAULT false,  -- If true, provider must quote before confirmation
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_service_types_code ON service_types(code);
CREATE INDEX IF NOT EXISTS idx_service_types_booking_flow ON service_types(booking_flow);

COMMENT ON TABLE service_types IS 'Defines operational execution models - maps services to booking flows';
COMMENT ON COLUMN service_types.booking_flow IS 'Which detail table to use (emergency, standard, delivery, project, personal)';
COMMENT ON COLUMN service_types.risk_level IS 'Safety/liability risk score 1-5';
COMMENT ON COLUMN service_types.trust_level IS 'Trust requirement score 1-5';

DROP TRIGGER IF EXISTS update_service_types_updated_at ON service_types;
CREATE TRIGGER update_service_types_updated_at
  BEFORE UPDATE ON service_types
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: services
-- Purpose: Individual bookable services
-- =============================================================================

CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES service_categories(id) ON DELETE RESTRICT,
  subcategory_id uuid REFERENCES service_subcategories(id) ON DELETE SET NULL,
  service_type_id uuid NOT NULL REFERENCES service_types(id) ON DELETE RESTRICT,
  
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  description text,
  short_description text,  -- For cards/lists
  
  is_active boolean DEFAULT true,
  requires_site_visit boolean DEFAULT false,
  
  -- SEO
  meta_title text,
  meta_description text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT services_name_unique_per_category UNIQUE(category_id, name)
);

CREATE INDEX IF NOT EXISTS idx_services_category_id ON services(category_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_subcategory_id ON services(subcategory_id) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_services_service_type_id ON services(service_type_id);
CREATE INDEX IF NOT EXISTS idx_services_slug ON services(slug);
CREATE INDEX IF NOT EXISTS idx_services_active ON services(is_active);

COMMENT ON TABLE services IS 'Individual bookable services - links category (discovery) to service_type (execution)';
COMMENT ON COLUMN services.subcategory_id IS 'Optional internal grouping (nullable)';
COMMENT ON COLUMN services.service_type_id IS 'Determines booking flow and validation rules';

DROP TRIGGER IF EXISTS update_services_updated_at ON services;
CREATE TRIGGER update_services_updated_at
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: service_capabilities
-- Purpose: What features/behaviors this service supports
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_capabilities (
  service_id uuid PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
  
  -- Flow support
  supports_emergency boolean DEFAULT false,
  emergency_response_sla_minutes int,  -- Only populated if supports_emergency = true
  
  -- Scheduling
  is_recurring_capable boolean DEFAULT false,
  min_booking_notice_hours int DEFAULT 24,  -- How far in advance must bookings be made?
  
  -- Location
  supports_multi_location boolean DEFAULT false,  -- Delivery services need pickup + dropoff
  travel_fee_applies boolean DEFAULT false,
  
  -- Materials
  materials_provided_by_provider boolean DEFAULT false,
  materials_provided_by_customer boolean DEFAULT false,
  
  -- Other
  requires_site_visit_default boolean DEFAULT false,
  allows_remote_service boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Validation
  CONSTRAINT emergency_sla_required CHECK (
    (supports_emergency = false) OR 
    (supports_emergency = true AND emergency_response_sla_minutes IS NOT NULL)
  ),
  CONSTRAINT multi_location_logic CHECK (
    (supports_multi_location = false) OR
    (supports_multi_location = true AND travel_fee_applies IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_capabilities_supports_emergency ON service_capabilities(supports_emergency) WHERE supports_emergency = true;
CREATE INDEX IF NOT EXISTS idx_capabilities_recurring ON service_capabilities(is_recurring_capable) WHERE is_recurring_capable = true;

COMMENT ON TABLE service_capabilities IS 'Feature flags per service - drives UI logic and validation';
COMMENT ON COLUMN service_capabilities.supports_emergency IS 'Can this service be booked as emergency?';
COMMENT ON COLUMN service_capabilities.is_recurring_capable IS 'Can customer schedule recurring bookings?';
COMMENT ON COLUMN service_capabilities.supports_multi_location IS 'Does service need pickup AND dropoff locations?';

DROP TRIGGER IF EXISTS update_service_capabilities_updated_at ON service_capabilities;
CREATE TRIGGER update_service_capabilities_updated_at
  BEFORE UPDATE ON service_capabilities
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: service_pricing
-- Purpose: Descriptive pricing info (not computational)
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_pricing (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  pricing_display_type pricing_type NOT NULL,
  base_amount decimal(10,2),  -- Starting price or fixed price
  currency text DEFAULT 'KES',
  unit text,  -- 'per kg', 'per hour', 'per sqm', etc.
  
  description text,  -- Human-readable: "KES 300 base + KES 150/kg"
  
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT service_pricing_service_unique UNIQUE(service_id, is_active)
);

CREATE INDEX IF NOT EXISTS idx_service_pricing_service_id ON service_pricing(service_id);

COMMENT ON TABLE service_pricing IS 'Display pricing info - actual calculation happens in booking logic';
COMMENT ON COLUMN service_pricing.description IS 'Customer-facing pricing explanation';

DROP TRIGGER IF EXISTS update_service_pricing_updated_at ON service_pricing;
CREATE TRIGGER update_service_pricing_updated_at
  BEFORE UPDATE ON service_pricing
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: service_pricing_components
-- Purpose: Composite pricing breakdown
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_pricing_components (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  component_type pricing_component_type NOT NULL,
  amount decimal(10,2) NOT NULL,
  unit text,  -- 'kg', 'km', 'hour', 'sqm'
  description text NOT NULL,
  display_order int NOT NULL,
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT component_order_unique UNIQUE(service_id, display_order)
);

CREATE INDEX IF NOT EXISTS idx_pricing_components_service_id ON service_pricing_components(service_id);

COMMENT ON TABLE service_pricing_components IS 'For services with composite pricing (base + unit + distance, etc)';
COMMENT ON COLUMN service_pricing_components.display_order IS 'Order to show components in UI';

-- =============================================================================
-- TABLE: service_verification_requirements
-- Purpose: What verification is needed to offer this service
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_verification_requirements (
  service_id uuid PRIMARY KEY REFERENCES services(id) ON DELETE CASCADE,
  
  min_verification_level verification_level NOT NULL,
  background_check_required boolean DEFAULT false,
  certification_required boolean DEFAULT false,
  certification_description text,  -- e.g., "Electrician License", "Plumbing Certificate"
  
  min_experience_years int DEFAULT 0,
  reference_count_required int DEFAULT 0,
  insurance_required boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

COMMENT ON TABLE service_verification_requirements IS 'Trust requirements per service - enforced during provider onboarding';
COMMENT ON COLUMN service_verification_requirements.certification_description IS 'Human-readable cert name for UI';

DROP TRIGGER IF EXISTS update_service_verification_requirements_updated_at ON service_verification_requirements;
CREATE TRIGGER update_service_verification_requirements_updated_at
  BEFORE UPDATE ON service_verification_requirements
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
