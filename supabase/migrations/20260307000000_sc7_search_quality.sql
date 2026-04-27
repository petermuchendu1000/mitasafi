-- =============================================================================
-- SC-7: IMPROVE SEARCH QUALITY
-- =============================================================================
-- 1. Add `search_vector` tsvector GENERATED column with GIN index for FTS
-- 2. Add `min_price` denormalized column + trigger for SQL-level price
--    filtering / sorting (fixes pagination mismatch from in-memory filter)
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Full-Text Search vector on service_providers
-- ---------------------------------------------------------------------------
-- Weights:
--   A = business_name (highest relevance)
--   B = tagline
--   C = bio (longer text, lower per-token weight)
-- Generated column stays in sync automatically on UPDATE.

ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(business_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(tagline, '')),        'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')),            'C')
) STORED;

CREATE INDEX IF NOT EXISTS idx_service_providers_search_vector
ON service_providers USING GIN (search_vector);

-- ---------------------------------------------------------------------------
-- 2. Denormalized min_price column
-- ---------------------------------------------------------------------------
-- Computing min_price from provider_services.custom_pricing (jsonb) in
-- application code caused:
--   a) Price filters applied AFTER pagination → wrong page sizes
--   b) Price sort applied in-memory → unreliable ordering
--   c) Total count excluded price filter → incorrect pagination metadata
--
-- Solution: trigger-maintained min_price column on service_providers.

ALTER TABLE service_providers
ADD COLUMN IF NOT EXISTS min_price numeric;

-- Index for fast range scans when filtering/sorting by price
CREATE INDEX IF NOT EXISTS idx_service_providers_min_price
ON service_providers (min_price)
WHERE min_price IS NOT NULL;

-- Trigger function: recompute min_price from all active provider_services
CREATE OR REPLACE FUNCTION fn_update_provider_min_price()
RETURNS trigger AS $$
DECLARE
  target_provider_id uuid;
BEGIN
  target_provider_id := coalesce(NEW.provider_id, OLD.provider_id);

  UPDATE service_providers
  SET min_price = sub.min_amount
  FROM (
    SELECT MIN((ps.custom_pricing->>'amount')::numeric) AS min_amount
    FROM provider_services ps
    WHERE ps.provider_id = target_provider_id
      AND ps.is_active = true
      AND ps.custom_pricing IS NOT NULL
      AND (ps.custom_pricing->>'amount') IS NOT NULL
  ) sub
  WHERE id = target_provider_id;

  RETURN coalesce(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

-- Fire on any change to provider_services that might alter the minimum
DROP TRIGGER IF EXISTS trg_update_provider_min_price ON provider_services;
CREATE TRIGGER trg_update_provider_min_price
AFTER INSERT OR UPDATE OR DELETE ON provider_services
FOR EACH ROW EXECUTE FUNCTION fn_update_provider_min_price();

-- Backfill existing data so the column is accurate immediately
UPDATE service_providers sp
SET min_price = sub.min_amount
FROM (
  SELECT ps.provider_id,
         MIN((ps.custom_pricing->>'amount')::numeric) AS min_amount
  FROM provider_services ps
  WHERE ps.is_active = true
    AND ps.custom_pricing IS NOT NULL
    AND (ps.custom_pricing->>'amount') IS NOT NULL
  GROUP BY ps.provider_id
) sub
WHERE sp.id = sub.provider_id;
