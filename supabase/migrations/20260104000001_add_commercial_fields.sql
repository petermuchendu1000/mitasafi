-- ===========================================
-- MITASAFI: ADD COMMERCIAL LISTING FIELDS
-- ===========================================
-- This migration extends the listings table to support
-- commercial properties alongside residential listings.
-- ===========================================

-- ===========================================
-- 1. ADD CATEGORY & TYPE COLUMNS
-- ===========================================

-- Listing category: residential vs commercial
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS listing_category TEXT DEFAULT 'residential' 
CHECK (listing_category IN ('residential', 'commercial'));

-- Commercial type (only for commercial listings)
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS commercial_type TEXT
CHECK (commercial_type IS NULL OR commercial_type IN (
  'office', 'retail', 'food_beverage', 'warehouse', 
  'automotive', 'commercial_land', 'hospitality', 
  'healthcare', 'educational', 'specialized'
));

-- Commercial subtype for more specific categorization
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS commercial_subtype TEXT;

-- ===========================================
-- 2. ADD SIZE IN SQM (Commercial standard)
-- ===========================================

-- Commercial properties use square meters
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS size_sqm NUMERIC(10, 2);

-- ===========================================
-- 3. ADD COMMON COMMERCIAL FIELDS
-- ===========================================

-- Building grade (A, A+, B, B+, C)
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS building_grade TEXT
CHECK (building_grade IS NULL OR building_grade IN ('A+', 'A', 'B+', 'B', 'C'));

-- Ceiling height in meters
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS ceiling_height_m NUMERIC(4, 2);

-- Fitout level
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS fitout_level TEXT
CHECK (fitout_level IS NULL OR fitout_level IN ('shell', 'semi_fitted', 'fitted', 'furnished'));

-- Floor level (text for flexibility: "Ground", "1st", "Basement", etc.)
-- Already exists as floor_level TEXT

-- ===========================================
-- 4. OFFICE-SPECIFIC FIELDS
-- ===========================================

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS workstation_capacity INTEGER;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS meeting_rooms INTEGER DEFAULT 0;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS private_offices INTEGER DEFAULT 0;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS has_reception BOOLEAN DEFAULT false;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS has_server_room BOOLEAN DEFAULT false;

-- ===========================================
-- 5. RETAIL/F&B FIELDS
-- ===========================================

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS frontage_width_m NUMERIC(5, 2);

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS has_display_windows BOOLEAN DEFAULT false;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS seating_capacity INTEGER;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS kitchen_area_sqm NUMERIC(8, 2);

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS has_grease_trap BOOLEAN DEFAULT false;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS has_exhaust_system BOOLEAN DEFAULT false;

-- ===========================================
-- 6. WAREHOUSE/INDUSTRIAL FIELDS
-- ===========================================

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS clear_height_m NUMERIC(4, 2);

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS loading_docks INTEGER DEFAULT 0;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS drive_in_doors INTEGER DEFAULT 0;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS floor_load_capacity NUMERIC(8, 2);

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS has_dock_levelers BOOLEAN DEFAULT false;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS vehicle_access TEXT[] DEFAULT '{}';

-- ===========================================
-- 7. AUTOMOTIVE FIELDS
-- ===========================================

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS parking_spaces_count INTEGER;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS ev_charging_stations INTEGER DEFAULT 0;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS work_bays INTEGER DEFAULT 0;

-- ===========================================
-- 8. LAND FIELDS
-- ===========================================

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS plot_size_sqm NUMERIC(12, 2);

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS plot_size_acres NUMERIC(8, 4);

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS zoning_type TEXT;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS permitted_uses TEXT[] DEFAULT '{}';

-- ===========================================
-- 9. HOSPITALITY FIELDS
-- ===========================================

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS room_count INTEGER;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS star_rating INTEGER CHECK (star_rating IS NULL OR (star_rating >= 1 AND star_rating <= 5));

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS event_capacity_seated INTEGER;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS event_capacity_standing INTEGER;

-- ===========================================
-- 10. HEALTHCARE FIELDS
-- ===========================================

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS consultation_rooms INTEGER DEFAULT 0;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS treatment_rooms INTEGER DEFAULT 0;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS has_pharmacy_license BOOLEAN DEFAULT false;

-- ===========================================
-- 11. EDUCATIONAL FIELDS
-- ===========================================

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS classroom_count INTEGER DEFAULT 0;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS total_student_capacity INTEGER;

ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS ministry_approved BOOLEAN DEFAULT false;

-- ===========================================
-- 12. COMMERCIAL-SPECIFIC JSONB FOR FLEXIBILITY
-- ===========================================

-- Store additional commercial attributes not covered by columns
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS commercial_attributes JSONB DEFAULT '{}';

-- ===========================================
-- 13. CREATE INDEXES FOR PERFORMANCE
-- ===========================================

-- Category index for filtering
CREATE INDEX IF NOT EXISTS idx_listings_category 
ON public.listings(listing_category);

-- Commercial type index
CREATE INDEX IF NOT EXISTS idx_listings_commercial_type 
ON public.listings(commercial_type) 
WHERE listing_category = 'commercial';

-- Commercial subtype index
CREATE INDEX IF NOT EXISTS idx_listings_commercial_subtype 
ON public.listings(commercial_subtype) 
WHERE listing_category = 'commercial';

-- Size (sqm) for commercial property searches
CREATE INDEX IF NOT EXISTS idx_listings_size_sqm 
ON public.listings(size_sqm) 
WHERE listing_category = 'commercial';

-- Building grade for office searches
CREATE INDEX IF NOT EXISTS idx_listings_building_grade 
ON public.listings(building_grade) 
WHERE commercial_type = 'office';

-- Composite index for common commercial searches
CREATE INDEX IF NOT EXISTS idx_listings_commercial_search 
ON public.listings(listing_category, commercial_type, area, status) 
WHERE listing_category = 'commercial';

-- ===========================================
-- 14. UPDATE PROPERTY TYPE CHECK CONSTRAINT
-- ===========================================

-- First drop the existing constraint
ALTER TABLE public.listings 
DROP CONSTRAINT IF EXISTS listings_property_type_check;

-- Add new constraint with commercial types
ALTER TABLE public.listings 
ADD CONSTRAINT listings_property_type_check 
CHECK (property_type IN (
  -- Residential types
  'bedsitter', 'studio', 'apartment', 'house', 'townhouse', 'maisonette', 'villa',
  -- Commercial types (mapped from commercial_type for backward compatibility)
  'office', 'retail', 'restaurant', 'warehouse', 'parking', 'land', 'hotel', 'clinic', 'school', 'other'
));

-- ===========================================
-- 15. CREATE HELPER FUNCTION FOR DISPLAY
-- ===========================================

CREATE OR REPLACE FUNCTION public.get_listing_display_metrics(p_listing_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_listing RECORD;
  v_result JSONB;
BEGIN
  SELECT * INTO v_listing FROM public.listings WHERE id = p_listing_id;
  
  IF v_listing.listing_category = 'residential' THEN
    -- Residential: bedrooms, bathrooms, size
    v_result := jsonb_build_object(
      'metrics', jsonb_build_array(
        jsonb_build_object('icon', 'bed', 'value', v_listing.bedrooms, 'label', 'Beds'),
        jsonb_build_object('icon', 'bath', 'value', v_listing.bathrooms, 'label', 'Baths'),
        jsonb_build_object('icon', 'size', 'value', v_listing.size_sqft, 'unit', 'sqft')
      )
    );
  ELSE
    -- Commercial: varies by type
    CASE v_listing.commercial_type
      WHEN 'office' THEN
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'size', 'value', v_listing.size_sqm, 'unit', 'sqm'),
            jsonb_build_object('icon', 'users', 'value', v_listing.workstation_capacity, 'label', 'Desks'),
            jsonb_build_object('icon', 'building', 'value', v_listing.building_grade, 'label', 'Grade')
          )
        );
      WHEN 'retail', 'food_beverage' THEN
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'size', 'value', v_listing.size_sqm, 'unit', 'sqm'),
            jsonb_build_object('icon', 'frontage', 'value', v_listing.frontage_width_m, 'unit', 'm'),
            jsonb_build_object('icon', 'seats', 'value', v_listing.seating_capacity, 'label', 'Seats')
          )
        );
      WHEN 'warehouse' THEN
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'size', 'value', v_listing.size_sqm, 'unit', 'sqm'),
            jsonb_build_object('icon', 'height', 'value', v_listing.clear_height_m, 'unit', 'm'),
            jsonb_build_object('icon', 'dock', 'value', v_listing.loading_docks, 'label', 'Docks')
          )
        );
      WHEN 'automotive' THEN
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'size', 'value', v_listing.size_sqm, 'unit', 'sqm'),
            jsonb_build_object('icon', 'car', 'value', v_listing.parking_spaces_count, 'label', 'Spaces'),
            jsonb_build_object('icon', 'ev', 'value', v_listing.ev_charging_stations, 'label', 'EV')
          )
        );
      WHEN 'commercial_land' THEN
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'land', 'value', v_listing.plot_size_acres, 'unit', 'acres'),
            jsonb_build_object('icon', 'zoning', 'value', v_listing.zoning_type, 'label', 'Zoning')
          )
        );
      WHEN 'hospitality' THEN
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'room', 'value', v_listing.room_count, 'label', 'Rooms'),
            jsonb_build_object('icon', 'star', 'value', v_listing.star_rating, 'label', 'Stars'),
            jsonb_build_object('icon', 'event', 'value', v_listing.event_capacity_seated, 'label', 'Event Cap')
          )
        );
      WHEN 'healthcare' THEN
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'size', 'value', v_listing.size_sqm, 'unit', 'sqm'),
            jsonb_build_object('icon', 'consult', 'value', v_listing.consultation_rooms, 'label', 'Consult'),
            jsonb_build_object('icon', 'treatment', 'value', v_listing.treatment_rooms, 'label', 'Treatment')
          )
        );
      WHEN 'educational' THEN
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'classroom', 'value', v_listing.classroom_count, 'label', 'Classes'),
            jsonb_build_object('icon', 'students', 'value', v_listing.total_student_capacity, 'label', 'Capacity')
          )
        );
      ELSE
        v_result := jsonb_build_object(
          'metrics', jsonb_build_array(
            jsonb_build_object('icon', 'size', 'value', v_listing.size_sqm, 'unit', 'sqm')
          )
        );
    END CASE;
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql STABLE;

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'COMMERCIAL FIELDS MIGRATION COMPLETE';
    RAISE NOTICE 'Added: listing_category, commercial_type';
    RAISE NOTICE 'Added: 30+ commercial-specific columns';
    RAISE NOTICE 'Added: Performance indexes';
    RAISE NOTICE 'Added: get_listing_display_metrics()';
    RAISE NOTICE '========================================';
END $$;
