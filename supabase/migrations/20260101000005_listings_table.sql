-- ===========================================
-- MITASAFI: VACANCY LISTINGS TABLE
-- ===========================================
-- This migration creates the listings table for
-- standalone vacancy advertisements (marketplace model).
-- Separate from the property management flow.
-- ===========================================

-- ===========================================
-- 1. CREATE LISTINGS TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Optional: Link to existing building/unit
  building_id UUID REFERENCES public.buildings(id) ON DELETE SET NULL,
  unit_id UUID REFERENCES public.units(id) ON DELETE SET NULL,
  
  -- Basic Info
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  property_type TEXT NOT NULL CHECK (property_type IN (
    'bedsitter', 'studio', 'apartment', 'house', 'townhouse', 'maisonette', 'villa'
  )),
  
  -- Location
  building_name TEXT,
  address TEXT NOT NULL,
  area TEXT NOT NULL,
  city TEXT DEFAULT 'Nairobi',
  landmarks TEXT,
  latitude DECIMAL(10, 8),
  longitude DECIMAL(11, 8),
  hide_exact_address BOOLEAN DEFAULT false,
  
  -- Property Details
  bedrooms INTEGER NOT NULL DEFAULT 1,
  bathrooms DECIMAL(3, 1) NOT NULL DEFAULT 1,
  size_sqft INTEGER,
  size_unit TEXT DEFAULT 'sqft' CHECK (size_unit IN ('sqft', 'sqm')),
  floor_level TEXT,
  total_floors INTEGER,
  year_built INTEGER,
  condition TEXT CHECK (condition IN ('excellent', 'good', 'fair', 'needs_work')),
  furnishing TEXT DEFAULT 'unfurnished' CHECK (furnishing IN ('unfurnished', 'semi_furnished', 'fully_furnished')),
  
  -- Amenities (stored as arrays/JSONB for flexibility)
  amenities TEXT[] DEFAULT '{}',
  
  -- Parking
  parking TEXT DEFAULT 'none' CHECK (parking IN ('none', 'covered', 'open', 'garage')),
  parking_spaces INTEGER DEFAULT 0,
  
  -- Policies
  pet_policy TEXT DEFAULT 'not_allowed' CHECK (pet_policy IN ('not_allowed', 'small_only', 'all_allowed', 'case_by_case')),
  smoking_policy TEXT DEFAULT 'not_allowed' CHECK (smoking_policy IN ('not_allowed', 'balcony_only', 'allowed')),
  
  -- Security & Utilities
  security_features JSONB DEFAULT '{}',
  -- Example: {"guard": "24_hour", "cctv": "full", "access_control": "card"}
  
  utilities JSONB DEFAULT '{}',
  -- Example: {"water": "24_7", "backup_power": "full", "internet_ready": true, "isps": ["safaricom", "zuku"]}
  
  -- Photos
  photos JSONB DEFAULT '[]',
  -- Array of: {"id": "uuid", "url": "https://...", "path": "listings/user/file.jpg", "category": "cover", "sort_order": 0}
  
  cover_photo TEXT,
  video_url TEXT,
  
  -- Pricing
  rent_amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'KES',
  rent_negotiable BOOLEAN DEFAULT false,
  deposit_months INTEGER DEFAULT 2,
  deposit_amount DECIMAL(10, 2),
  service_charge DECIMAL(10, 2),
  
  -- Lease Terms
  lease_term TEXT DEFAULT 'fixed' CHECK (lease_term IN ('monthly', 'fixed', 'flexible')),
  min_lease_months INTEGER DEFAULT 12,
  
  -- Availability
  available_from DATE,
  available_now BOOLEAN DEFAULT true,
  
  -- Payment
  payment_methods TEXT[] DEFAULT '{"mpesa"}',
  rent_includes TEXT[] DEFAULT '{}',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'rented', 'expired', 'archived')),
  
  -- Analytics
  views_count INTEGER DEFAULT 0,
  inquiries_count INTEGER DEFAULT 0,
  applications_count INTEGER DEFAULT 0,
  featured_until TIMESTAMPTZ,
  
  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES public.profiles(id),
  
  -- Timestamps
  published_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- ===========================================
-- 2. INDEXES
-- ===========================================

CREATE INDEX IF NOT EXISTS idx_listings_landlord ON public.listings(landlord_id);
CREATE INDEX IF NOT EXISTS idx_listings_status ON public.listings(status);
CREATE INDEX IF NOT EXISTS idx_listings_area ON public.listings(area);
CREATE INDEX IF NOT EXISTS idx_listings_property_type ON public.listings(property_type);
CREATE INDEX IF NOT EXISTS idx_listings_rent ON public.listings(rent_amount);
CREATE INDEX IF NOT EXISTS idx_listings_bedrooms ON public.listings(bedrooms);
CREATE INDEX IF NOT EXISTS idx_listings_published ON public.listings(published_at) WHERE status = 'active';
CREATE INDEX IF NOT EXISTS idx_listings_created ON public.listings(created_at DESC);

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_listings_search ON public.listings 
  USING gin(to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, '') || ' ' || coalesce(area, '')));

-- ===========================================
-- 3. ENABLE RLS
-- ===========================================

ALTER TABLE public.listings ENABLE ROW LEVEL SECURITY;

-- ===========================================
-- 4. RLS POLICIES
-- ===========================================

-- Landlords can view their own listings (all statuses)
CREATE POLICY "Landlords can view own listings" ON public.listings
  FOR SELECT USING (auth.uid() = landlord_id);

-- Landlords can insert their own listings
CREATE POLICY "Landlords can insert own listings" ON public.listings
  FOR INSERT WITH CHECK (auth.uid() = landlord_id);

-- Landlords can update their own listings
CREATE POLICY "Landlords can update own listings" ON public.listings
  FOR UPDATE USING (auth.uid() = landlord_id);

-- Landlords can delete their own listings
CREATE POLICY "Landlords can delete own listings" ON public.listings
  FOR DELETE USING (auth.uid() = landlord_id);

-- Public can view active listings
CREATE POLICY "Public can view active listings" ON public.listings
  FOR SELECT USING (status = 'active');

-- ===========================================
-- 5. UPDATED_AT TRIGGER
-- ===========================================

DROP TRIGGER IF EXISTS update_listings_updated_at ON public.listings;
CREATE TRIGGER update_listings_updated_at
  BEFORE UPDATE ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 6. VIEW COUNT FUNCTION
-- ===========================================

CREATE OR REPLACE FUNCTION public.increment_listing_views(listing_id UUID)
RETURNS void AS $$
BEGIN
  UPDATE public.listings 
  SET views_count = views_count + 1 
  WHERE id = listing_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- 7. LISTING INQUIRY TABLE
-- ===========================================

CREATE TABLE IF NOT EXISTS public.listing_inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Contact Info (for non-logged-in users)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT NOT NULL,
  
  -- Message
  message TEXT NOT NULL,
  preferred_viewing_date DATE,
  preferred_viewing_time TEXT,
  
  -- Status
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'read', 'responded', 'scheduled', 'closed')),
  
  -- Response
  landlord_response TEXT,
  responded_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes for inquiries
CREATE INDEX IF NOT EXISTS idx_inquiries_listing ON public.listing_inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.listing_inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created ON public.listing_inquiries(created_at DESC);

-- Enable RLS
ALTER TABLE public.listing_inquiries ENABLE ROW LEVEL SECURITY;

-- Inquiries RLS Policies
CREATE POLICY "Users can insert inquiries" ON public.listing_inquiries
  FOR INSERT TO authenticated, anon
  WITH CHECK (true);

CREATE POLICY "Landlords can view inquiries for own listings" ON public.listing_inquiries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_inquiries.listing_id 
      AND listings.landlord_id = auth.uid()
    )
  );

CREATE POLICY "Landlords can update inquiries for own listings" ON public.listing_inquiries
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.listings 
      WHERE listings.id = listing_inquiries.listing_id 
      AND listings.landlord_id = auth.uid()
    )
  );

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_inquiries_updated_at ON public.listing_inquiries;
CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.listing_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MITASAFI LISTINGS TABLE CREATED!';
    RAISE NOTICE 'Tables: listings, listing_inquiries';
    RAISE NOTICE 'RLS policies applied';
    RAISE NOTICE 'Full-text search enabled';
    RAISE NOTICE '========================================';
END $$;
