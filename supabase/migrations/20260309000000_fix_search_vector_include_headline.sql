-- =============================================================================
-- FIX: Include `headline` in search_vector GENERATED column
-- =============================================================================
-- The profile form writes to `headline`. The previous search_vector only
-- indexed `tagline`. Real providers (non-seeded) only have `headline` set,
-- so their marketing copy was invisible to full-text search.
--
-- Also: sync `headline` → `tagline` for any existing rows where headline
-- is set but tagline is not (fixes all real providers retroactively).
-- =============================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- 1. Sync headline → tagline for existing providers
-- ---------------------------------------------------------------------------
-- This ensures backward-compat for all code paths that read tagline:
-- browse cards, FeaturedByPrice, saved providers, search ILIKE fallback, etc.

UPDATE service_providers
SET tagline = headline
WHERE headline IS NOT NULL
  AND headline != ''
  AND (tagline IS NULL OR tagline = '');

-- ---------------------------------------------------------------------------
-- 2. Recreate search_vector to include both headline and tagline
-- ---------------------------------------------------------------------------
-- GENERATED columns cannot be ALTER-ed in-place; must drop and re-add.
-- Weight scheme:
--   A = business_name (highest relevance)
--   B = headline (provider's self-written marketing title — primary)
--   B = tagline  (legacy/seed fallback — same weight)
--   C = bio (longer text, lower per-token weight)

DROP INDEX IF EXISTS idx_service_providers_search_vector;

ALTER TABLE service_providers
DROP COLUMN IF EXISTS search_vector;

ALTER TABLE service_providers
ADD COLUMN search_vector tsvector
GENERATED ALWAYS AS (
  setweight(to_tsvector('english', coalesce(business_name, '')), 'A') ||
  setweight(to_tsvector('english', coalesce(headline, '')),      'B') ||
  setweight(to_tsvector('english', coalesce(tagline, '')),       'B') ||
  setweight(to_tsvector('english', coalesce(bio, '')),           'C')
) STORED;

CREATE INDEX idx_service_providers_search_vector
ON service_providers USING GIN (search_vector);

COMMIT;
