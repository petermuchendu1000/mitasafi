-- =============================================================================
-- Migration: Add display_order to service_subcategories
-- =============================================================================
-- The getCategoriesWithSubs() function sorts subcategories by display_order,
-- but the column was never created in the original migration. This adds it
-- with a safe default of 0 so existing rows are not broken.
-- Idempotent: IF NOT EXISTS guard.
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'service_subcategories'
      AND column_name = 'display_order'
  ) THEN
    ALTER TABLE public.service_subcategories
      ADD COLUMN display_order int NOT NULL DEFAULT 0;
  END IF;
END $$;

-- Index for efficient ordering queries
CREATE INDEX IF NOT EXISTS idx_subcategories_display_order
  ON service_subcategories(display_order)
  WHERE is_active = true;

COMMENT ON COLUMN public.service_subcategories.display_order IS
  'Sort order within parent category. Lower = first. Default 0.';
