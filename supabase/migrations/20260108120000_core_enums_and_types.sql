-- Migration: Core Enums and Reference Types
-- Description: Foundational type system for service marketplace
-- Dependencies: None (must run first)
-- Idempotent: Yes

-- =============================================================================
-- ENUMS: Booking Flow Types
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE booking_flow_type AS ENUM (
    'emergency',    -- Immediate response, damage risk, unknown pricing
    'standard',     -- Scheduled work with known scope (includes recurring)
    'delivery',     -- Pickup/dropoff with quantity tracking
    'project',      -- Large scope, quote-based, site visit likely
    'personal'      -- Human-to-human, trust-critical, preference-sensitive
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE booking_flow_type IS 'Defines the five operational execution models for services';

-- =============================================================================
-- ENUMS: Verification Levels
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE verification_level AS ENUM (
    'basic',              -- ID verification only
    'standard',           -- ID + experience verification
    'certified',          -- Professional certification required
    'background_checked'  -- Criminal background check required
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE verification_level IS 'Trust tier required for provider to offer service';

-- =============================================================================
-- ENUMS: Verification Status
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE verification_status AS ENUM (
    'not_started',  -- Provider has not submitted documents
    'pending',      -- Documents submitted, awaiting review
    'verified',     -- Approved and active
    'rejected',     -- Failed verification
    'expired'       -- Was verified but certification/license expired
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE verification_status IS 'Current state of provider verification for a service';

-- =============================================================================
-- ENUMS: Pricing Types
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE pricing_type AS ENUM (
    'fixed',          -- Set price per service
    'starting_from',  -- Base price, varies by scope
    'per_unit',       -- Price per kg/sqm/hour/item
    'quote_only',     -- Must inspect before pricing
    'hourly',         -- Time-based pricing
    'daily'           -- Day-rate pricing
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE pricing_type IS 'How service pricing is calculated and displayed';

-- =============================================================================
-- ENUMS: Pricing Component Types
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE pricing_component_type AS ENUM (
    'base',          -- Base/minimum fee
    'unit',          -- Per unit (kg, sqm, etc)
    'time',          -- Per hour/day
    'distance',      -- Per km
    'pass_through'   -- Materials/items customer pays for
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE pricing_component_type IS 'Components that make up composite service pricing';

-- =============================================================================
-- ENUMS: Booking Status
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE booking_status AS ENUM (
    'draft',              -- Customer creating booking
    'submitted',          -- Sent to provider
    'provider_viewed',    -- Provider opened it
    'quote_pending',      -- Provider needs to quote (project/quote_only services)
    'quote_sent',         -- Provider sent quote, awaiting customer
    'quote_accepted',     -- Customer accepted quote
    'quote_rejected',     -- Customer rejected quote
    'confirmed',          -- Both parties agreed (or provider accepted non-quote)
    'in_progress',        -- Work started
    'completed',          -- Work finished
    'customer_confirmed', -- Customer confirmed completion
    'cancelled_customer', -- Customer cancelled
    'cancelled_provider', -- Provider cancelled
    'disputed',           -- Issue raised
    'resolved'            -- Dispute resolved
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE booking_status IS 'Lifecycle state of a booking';

-- =============================================================================
-- ENUMS: Damage Risk Level (Emergency Services)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE damage_risk_level AS ENUM (
    'low',     -- Minor inconvenience, no property damage
    'medium',  -- Could cause damage if not addressed soon
    'high',    -- Active damage occurring
    'critical' -- Severe damage, safety risk
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE damage_risk_level IS 'Severity of damage risk for emergency bookings';

-- =============================================================================
-- ENUMS: Property Type
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE property_type AS ENUM (
    'apartment',
    'house',
    'townhouse',
    'villa',
    'office',
    'commercial',
    'warehouse',
    'land',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE property_type IS 'Type of property where service will be performed';

-- =============================================================================
-- ENUMS: Dispute Severity
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE dispute_severity AS ENUM (
    'low',     -- Quality complaint without evidence
    'medium',  -- Quality complaint with evidence or minor refund
    'high'     -- Safety concern or major refund request
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE dispute_severity IS 'Triage level for booking disputes';

-- =============================================================================
-- ENUMS: Review Rating (for validation)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE review_rating AS ENUM ('1', '2', '3', '4', '5');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE review_rating IS 'Star rating (1-5) for service reviews';

-- =============================================================================
-- ENUMS: Location Type (for personal services safety)
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE location_type AS ENUM (
    'home',
    'office',
    'public_place',
    'in_vehicle',
    'other'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

COMMENT ON TYPE location_type IS 'Where personal service will take place (safety context)';

-- =============================================================================
-- FUNCTIONS: Updated At Trigger
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_updated_at() IS 'Auto-updates updated_at timestamp on row modification';

-- =============================================================================
-- END OF MIGRATION
-- =============================================================================
