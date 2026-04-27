-- =============================================================================
-- Discovery Layer Idempotency Constraints
-- Date: 2026-01-09
-- Purpose: Add unique constraints for structural idempotency (not procedural)
-- Reference: Seeding audit findings — prevent silent corruption on re-seeding
-- =============================================================================

-- Service categories slug uniqueness (likely already exists, but make it explicit)
ALTER TABLE service_categories
DROP CONSTRAINT IF EXISTS service_categories_slug_unique;

ALTER TABLE service_categories
ADD CONSTRAINT service_categories_slug_unique UNIQUE (slug);

COMMENT ON CONSTRAINT service_categories_slug_unique ON service_categories IS
  'Structural idempotency: prevents duplicate categories on re-seeding.
  Without this, procedural checks can silently fail and corrupt discovery layer.';

-- Services slug uniqueness (if slug exists)
ALTER TABLE services
DROP CONSTRAINT IF EXISTS services_slug_unique;

ALTER TABLE services
ADD CONSTRAINT services_slug_unique UNIQUE (slug);

COMMENT ON CONSTRAINT services_slug_unique ON services IS
  'Structural idempotency: prevents duplicate services on re-seeding.
  Slug is the stable identifier for service discovery.';

-- Service types code uniqueness (operational identifier)
ALTER TABLE service_types
DROP CONSTRAINT IF EXISTS service_types_code_unique;

ALTER TABLE service_types
ADD CONSTRAINT service_types_code_unique UNIQUE (code);

COMMENT ON CONSTRAINT service_types_code_unique ON service_types IS
  'Structural idempotency: code is the operational identifier.
  Example: "standard_service", "emergency_repair"';

-- Service subcategories slug uniqueness (optional but consistent)
ALTER TABLE service_subcategories
DROP CONSTRAINT IF EXISTS service_subcategories_slug_unique;

ALTER TABLE service_subcategories
ADD CONSTRAINT service_subcategories_slug_unique UNIQUE (slug);

COMMENT ON CONSTRAINT service_subcategories_slug_unique ON service_subcategories IS
  'Structural idempotency: prevents duplicate subcategories.
  Even if optional, slug must be unique when present.';
