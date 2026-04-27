-- Migration: Update existing commercial listings to have correct listing_category
-- This fixes listings that have commercial property types but missing listing_category

-- Define which property_type values are commercial
UPDATE listings
SET listing_category = 'commercial'
WHERE property_type IN (
  'office',
  'retail', 
  'food_beverage',
  'warehouse',
  'automotive',
  'commercial_land',
  'hospitality',
  'healthcare',
  'educational',
  'specialized',
  -- Also check for variations that might exist
  'restaurant',
  'cafe',
  'shop',
  'parking',
  'parking_lot',
  'storage'
)
AND (listing_category IS NULL OR listing_category != 'commercial');

-- Also set commercial_type based on property_type where missing
UPDATE listings
SET commercial_type = CASE property_type
  WHEN 'office' THEN 'office'
  WHEN 'retail' THEN 'retail'
  WHEN 'shop' THEN 'retail'
  WHEN 'food_beverage' THEN 'food_beverage'
  WHEN 'restaurant' THEN 'food_beverage'
  WHEN 'cafe' THEN 'food_beverage'
  WHEN 'warehouse' THEN 'warehouse'
  WHEN 'storage' THEN 'warehouse'
  WHEN 'automotive' THEN 'automotive'
  WHEN 'parking' THEN 'automotive'
  WHEN 'parking_lot' THEN 'automotive'
  WHEN 'commercial_land' THEN 'commercial_land'
  WHEN 'hospitality' THEN 'hospitality'
  WHEN 'healthcare' THEN 'healthcare'
  WHEN 'educational' THEN 'educational'
  WHEN 'specialized' THEN 'specialized'
  ELSE 'specialized'
END
WHERE listing_category = 'commercial'
AND commercial_type IS NULL;

-- Ensure residential listings have correct category
UPDATE listings
SET listing_category = 'residential'
WHERE property_type IN (
  'bedsitter',
  'studio', 
  'apartment',
  'house',
  'townhouse',
  'maisonette',
  'villa',
  'single_room',
  'one_bedroom',
  'two_bedroom',
  'three_bedroom'
)
AND (listing_category IS NULL OR listing_category = '');

-- Create index on listing_category for faster filtering
CREATE INDEX IF NOT EXISTS idx_listings_listing_category ON listings(listing_category);

-- Log the update for verification
DO $$
DECLARE
  commercial_count INTEGER;
  residential_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO commercial_count FROM listings WHERE listing_category = 'commercial';
  SELECT COUNT(*) INTO residential_count FROM listings WHERE listing_category = 'residential';
  RAISE NOTICE 'Updated listings: % commercial, % residential', commercial_count, residential_count;
END $$;
