-- Migration: Trust & Provider Layer
-- Description: Provider profiles, service capabilities, and verification
-- Dependencies: 20260108120001_discovery_layer.sql
-- Idempotent: Yes

-- =============================================================================
-- TABLE: service_providers
-- Purpose: Provider business profiles
-- =============================================================================

CREATE TABLE IF NOT EXISTS service_providers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,  -- Links to auth.users
  
  -- Business info
  business_name text NOT NULL,
  business_type text,  -- 'individual', 'company', 'cooperative'
  registration_number text,  -- Business registration
  tax_id text,  -- KRA PIN in Kenya
  
  -- Contact
  phone text NOT NULL,
  email text,
  whatsapp text,
  
  -- Location
  primary_location text,  -- Free text for now
  service_radius_km int,  -- How far they travel
  
  -- Profile
  bio text,
  years_in_business int,
  team_size int,
  
  -- Media
  profile_photo_url text,
  cover_photo_url text,
  business_photos jsonb,  -- Array of photo URLs
  
  -- Stats (denormalized for performance)
  total_jobs_completed int DEFAULT 0,
  average_rating decimal(3,2),  -- 0.00 to 5.00
  total_reviews int DEFAULT 0,
  response_time_minutes int,  -- Average time to respond to bookings
  acceptance_rate decimal(5,2),  -- Percentage of bookings accepted
  
  -- Status
  is_active boolean DEFAULT true,
  is_verified boolean DEFAULT false,  -- Any service verified = true
  verification_badge text,  -- 'bronze', 'silver', 'gold', 'premium'
  account_status text DEFAULT 'active',  -- 'active', 'suspended', 'deactivated'
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  last_active_at timestamptz,
  
  -- Constraints
  CONSTRAINT phone_format CHECK (phone ~ '^\+?[0-9]{10,15}$')
);

CREATE INDEX IF NOT EXISTS idx_providers_user_id ON service_providers(user_id);
CREATE INDEX IF NOT EXISTS idx_providers_is_active ON service_providers(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_providers_is_verified ON service_providers(is_verified) WHERE is_verified = true;
CREATE INDEX IF NOT EXISTS idx_providers_average_rating ON service_providers(average_rating) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_providers_verification_badge ON service_providers(verification_badge) WHERE is_active = true;

COMMENT ON TABLE service_providers IS 'Provider business profiles - one per provider';
COMMENT ON COLUMN service_providers.is_verified IS 'True if ANY service is verified (denormalized)';
COMMENT ON COLUMN service_providers.verification_badge IS 'Trust tier based on completed jobs and ratings';

DROP TRIGGER IF EXISTS update_service_providers_updated_at ON service_providers;
CREATE TRIGGER update_service_providers_updated_at
  BEFORE UPDATE ON service_providers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: provider_services
-- Purpose: Junction table - which services provider offers + verification per service
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid NOT NULL REFERENCES services(id) ON DELETE CASCADE,
  
  -- Experience
  experience_years int DEFAULT 0,
  
  -- Certification
  has_certification boolean DEFAULT false,
  certification_type text,
  certification_ref text,  -- License number, cert ID
  certification_expiry_date date,
  certification_document_url text,
  
  -- Verification (service-scoped)
  verification_status verification_status DEFAULT 'not_started',
  verified_at timestamptz,
  verified_by uuid,  -- Admin who verified
  verification_notes text,
  verification_expires_at timestamptz,  -- For licenses that expire
  
  -- Pricing (provider-specific)
  custom_pricing jsonb,  -- Provider's pricing for this service
  
  -- Status
  is_active boolean DEFAULT true,
  
  -- Timestamps
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  -- Constraints
  CONSTRAINT provider_service_unique UNIQUE(provider_id, service_id),
  CONSTRAINT certification_logic CHECK (
    (has_certification = false) OR
    (has_certification = true AND certification_type IS NOT NULL)
  ),
  CONSTRAINT verification_verified_at CHECK (
    (verification_status != 'verified') OR
    (verification_status = 'verified' AND verified_at IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_provider_services_provider_id ON provider_services(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_service_id ON provider_services(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_services_verification_status ON provider_services(verification_status);
CREATE INDEX IF NOT EXISTS idx_provider_services_active ON provider_services(provider_id, service_id) WHERE is_active = true;

COMMENT ON TABLE provider_services IS 'Service-scoped capability tracking - provider verified for specific services';
COMMENT ON COLUMN provider_services.verification_status IS 'Status of verification for THIS service';
COMMENT ON COLUMN provider_services.verification_expires_at IS 'When cert/license expires (re-verification needed)';

DROP TRIGGER IF EXISTS update_provider_services_updated_at ON provider_services;
CREATE TRIGGER update_provider_services_updated_at
  BEFORE UPDATE ON provider_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: provider_service_areas
-- Purpose: Geographic areas where provider offers services
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_service_areas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,  -- Nullable = all services
  
  area_name text NOT NULL,  -- 'Westlands', 'Kilimani', 'CBD', etc.
  area_type text,  -- 'neighborhood', 'constituency', 'county'
  
  is_primary_area boolean DEFAULT false,
  travel_fee decimal(10,2),  -- Extra charge for this area
  currency text DEFAULT 'KES',
  
  created_at timestamptz DEFAULT now(),
  
  CONSTRAINT provider_service_area_unique UNIQUE(provider_id, service_id, area_name)
);

CREATE INDEX IF NOT EXISTS idx_provider_service_areas_provider_id ON provider_service_areas(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_service_id ON provider_service_areas(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_area_name ON provider_service_areas(area_name);
CREATE INDEX IF NOT EXISTS idx_provider_service_areas_primary ON provider_service_areas(provider_id) WHERE is_primary_area = true;

COMMENT ON TABLE provider_service_areas IS 'Geographic coverage per provider per service';
COMMENT ON COLUMN provider_service_areas.service_id IS 'If NULL, area applies to all services provider offers';
COMMENT ON COLUMN provider_service_areas.is_primary_area IS 'Main operating area (no travel fee)';

-- =============================================================================
-- TABLE: provider_availability
-- Purpose: When provider is available for work
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_availability (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,  -- Nullable = all services
  
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),  -- 0=Sunday, 6=Saturday
  start_time time NOT NULL,
  end_time time NOT NULL,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT time_range_valid CHECK (end_time > start_time)
);

CREATE INDEX IF NOT EXISTS idx_provider_availability_provider_id ON provider_availability(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_service_id ON provider_availability(service_id);
CREATE INDEX IF NOT EXISTS idx_provider_availability_day ON provider_availability(day_of_week) WHERE is_active = true;

COMMENT ON TABLE provider_availability IS 'Provider working hours per day per service';
COMMENT ON COLUMN provider_availability.service_id IS 'If NULL, schedule applies to all services';
COMMENT ON COLUMN provider_availability.day_of_week IS '0=Sunday, 1=Monday, ..., 6=Saturday';

DROP TRIGGER IF EXISTS update_provider_availability_updated_at ON provider_availability;
CREATE TRIGGER update_provider_availability_updated_at
  BEFORE UPDATE ON provider_availability
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: provider_verification_documents
-- Purpose: Documents uploaded for verification
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_verification_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE CASCADE,  -- Nullable = general docs
  
  document_type text NOT NULL,  -- 'id_card', 'business_license', 'certification', 'insurance'
  document_name text,
  document_url text NOT NULL,
  
  status verification_status DEFAULT 'pending',
  reviewed_at timestamptz,
  reviewed_by uuid,  -- Admin who reviewed
  review_notes text,
  
  expires_at date,  -- For licenses/insurance
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_verification_docs_provider_id ON provider_verification_documents(provider_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_service_id ON provider_verification_documents(service_id);
CREATE INDEX IF NOT EXISTS idx_verification_docs_status ON provider_verification_documents(status);
CREATE INDEX IF NOT EXISTS idx_verification_docs_expiry ON provider_verification_documents(expires_at) WHERE expires_at IS NOT NULL;

COMMENT ON TABLE provider_verification_documents IS 'All verification docs uploaded by provider';
COMMENT ON COLUMN provider_verification_documents.service_id IS 'If NULL, document applies to provider generally (ID, business license)';

DROP TRIGGER IF EXISTS update_provider_verification_documents_updated_at ON provider_verification_documents;
CREATE TRIGGER update_provider_verification_documents_updated_at
  BEFORE UPDATE ON provider_verification_documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: provider_vehicles (for taxi/transport services)
-- Purpose: Registered vehicles for transport providers
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_vehicles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  registration_number text NOT NULL UNIQUE,
  make text,
  model text,
  year int,
  color text,
  vehicle_type text,  -- 'sedan', 'suv', 'van', 'pickup', 'motorcycle'
  
  insurance_policy_number text,
  insurance_provider text,
  insurance_expiry date,
  
  inspection_certificate_url text,
  inspection_expiry date,
  
  vehicle_photos jsonb,  -- Array of photo URLs
  
  is_active boolean DEFAULT true,
  verified boolean DEFAULT false,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT insurance_logic CHECK (
    insurance_policy_number IS NULL OR 
    (insurance_policy_number IS NOT NULL AND insurance_expiry IS NOT NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_provider_vehicles_provider_id ON provider_vehicles(provider_id);
CREATE INDEX IF NOT EXISTS idx_provider_vehicles_registration ON provider_vehicles(registration_number);
CREATE INDEX IF NOT EXISTS idx_provider_vehicles_active ON provider_vehicles(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_provider_vehicles_insurance_expiry ON provider_vehicles(insurance_expiry) WHERE insurance_expiry IS NOT NULL;

COMMENT ON TABLE provider_vehicles IS 'Vehicle registration for taxi/transport providers';

DROP TRIGGER IF EXISTS update_provider_vehicles_updated_at ON provider_vehicles;
CREATE TRIGGER update_provider_vehicles_updated_at
  BEFORE UPDATE ON provider_vehicles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- TABLE: provider_driver_licenses (for taxi/transport services)
-- Purpose: Driver license verification
-- =============================================================================

CREATE TABLE IF NOT EXISTS provider_driver_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id uuid NOT NULL REFERENCES service_providers(id) ON DELETE CASCADE,
  
  license_number text NOT NULL UNIQUE,
  license_type text,  -- 'private', 'commercial', 'psv'
  issue_date date,
  expiry_date date NOT NULL,
  
  license_photo_url text,
  
  background_check_status verification_status DEFAULT 'not_started',
  background_check_date date,
  background_check_provider text,  -- Company that performed check
  police_clearance_certificate_url text,
  
  is_active boolean DEFAULT true,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  CONSTRAINT license_not_expired CHECK (expiry_date > CURRENT_DATE)
);

CREATE INDEX IF NOT EXISTS idx_driver_licenses_provider_id ON provider_driver_licenses(provider_id);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_license_number ON provider_driver_licenses(license_number);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_expiry ON provider_driver_licenses(expiry_date);
CREATE INDEX IF NOT EXISTS idx_driver_licenses_background_check ON provider_driver_licenses(background_check_status);

COMMENT ON TABLE provider_driver_licenses IS 'Driver license and background check for transport providers';

DROP TRIGGER IF EXISTS update_provider_driver_licenses_updated_at ON provider_driver_licenses;
CREATE TRIGGER update_provider_driver_licenses_updated_at
  BEFORE UPDATE ON provider_driver_licenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
