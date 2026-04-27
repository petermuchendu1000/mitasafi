-- =============================================================================
-- FIX: services_with_categories view to use direct category_id from services
-- =============================================================================
-- The original view joined services → subcategories → categories
-- But our services have category_id directly (not via subcategory)
-- This migration recreates the view with the correct join logic.

-- Drop and recreate the materialized view
DROP MATERIALIZED VIEW IF EXISTS services_with_categories CASCADE;

CREATE MATERIALIZED VIEW services_with_categories AS
SELECT 
  -- Service fields
  s.id,
  s.name,
  s.slug,
  s.description,
  s.created_at,
  s.updated_at,
  
  -- Subcategory fields (prefixed to avoid ambiguity)
  -- These can be NULL since services don't always have subcategories
  sc.id as subcategory_id,
  sc.name as subcategory_name,
  sc.slug as subcategory_slug,
  
  -- Category fields - NOW DIRECTLY FROM services.category_id
  cat.id as category_id,
  cat.name as category_name,
  cat.slug as category_slug,
  cat.icon as category_icon,
  
  -- Materialized path for efficient filtering
  cat.slug || '/' || COALESCE(sc.slug, '') || '/' || s.slug as full_path,
  
  -- Searchable text for full-text search
  setweight(to_tsvector('english', s.name), 'A') ||
  setweight(to_tsvector('english', COALESCE(s.description, '')), 'B') ||
  setweight(to_tsvector('english', COALESCE(cat.name, '')), 'C') ||
  setweight(to_tsvector('english', COALESCE(sc.name, '')), 'C') as search_vector

FROM services s
-- Direct category join (PRIMARY - from services.category_id)
LEFT JOIN service_categories cat ON s.category_id = cat.id
-- Optional subcategory join (SECONDARY - from services.subcategory_id)
LEFT JOIN service_subcategories sc ON s.subcategory_id = sc.id;

-- =============================================================================
-- INDEXES on materialized view
-- =============================================================================
-- Primary lookup index (most common query)
CREATE UNIQUE INDEX idx_services_with_categories_id 
ON services_with_categories(id);

-- Category filtering (critical for Step 2 filtering)
CREATE INDEX idx_services_with_categories_category 
ON services_with_categories(category_id, id);

CREATE INDEX idx_services_with_categories_category_slug 
ON services_with_categories(category_slug, id);

-- Subcategory filtering
CREATE INDEX idx_services_with_categories_subcategory 
ON services_with_categories(subcategory_id, id);

-- Full-text search index
CREATE INDEX idx_services_with_categories_search 
ON services_with_categories USING GIN(search_vector);

-- Path-based lookup for hierarchical queries
CREATE INDEX idx_services_with_categories_path 
ON services_with_categories USING btree(full_path text_pattern_ops);

-- Slug lookup (for SEO-friendly URLs)
CREATE INDEX idx_services_with_categories_slug 
ON services_with_categories(slug);

COMMENT ON MATERIALIZED VIEW services_with_categories IS
  'Denormalized view of services with complete category hierarchy.
  Uses direct category_id from services table (not via subcategory).
  Eliminates joins in application queries.
  Refresh strategy: Manual or via trigger on source tables.';

-- =============================================================================
-- REFRESH FUNCTION
-- =============================================================================
CREATE OR REPLACE FUNCTION refresh_services_with_categories()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY services_with_categories;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- =============================================================================
-- TRIGGERS for automatic refresh
-- =============================================================================
DROP TRIGGER IF EXISTS trigger_refresh_services_with_categories_services ON services;
CREATE TRIGGER trigger_refresh_services_with_categories_services
AFTER INSERT OR UPDATE OR DELETE ON services
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_services_with_categories();

DROP TRIGGER IF EXISTS trigger_refresh_services_with_categories_subcategories ON service_subcategories;
CREATE TRIGGER trigger_refresh_services_with_categories_subcategories
AFTER INSERT OR UPDATE OR DELETE ON service_subcategories
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_services_with_categories();

DROP TRIGGER IF EXISTS trigger_refresh_services_with_categories_categories ON service_categories;
CREATE TRIGGER trigger_refresh_services_with_categories_categories
AFTER INSERT OR UPDATE OR DELETE ON service_categories
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_services_with_categories();
