-- ===========================================
-- MITASAFI: ENGAGEMENT-FIRST TABLES
-- ===========================================
-- This migration creates tables for engagement features:
-- 1. inquiries - Lead capture (works for public and authenticated users)
-- 2. saved_listings - For syncing saved listings (authenticated users)
-- 3. search_alerts - Email/phone based alerts (no account required)
-- ===========================================

-- ===========================================
-- 1. INQUIRIES TABLE (Lead Capture)
-- ===========================================
-- Replaces listing_inquiries with a more flexible model
-- Supports both public users (no account) and authenticated users

CREATE TABLE IF NOT EXISTS public.inquiries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- What they're inquiring about
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  landlord_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Who's inquiring (may or may not have account)
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,  -- NULL if public user
  
  -- Contact info (required for public users, optional if logged in)
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  
  -- Inquiry details
  message TEXT,
  request_viewing BOOLEAN DEFAULT false,
  preferred_viewing_time TEXT CHECK (preferred_viewing_time IN ('morning', 'afternoon', 'evening')),
  preferred_viewing_day TEXT CHECK (preferred_viewing_day IN ('weekday', 'weekend', 'any')),
  
  -- Tracking for landlord
  status TEXT DEFAULT 'new' CHECK (status IN ('new', 'viewed', 'contacted', 'viewing_scheduled', 'converted', 'archived')),
  landlord_notes TEXT,
  
  -- Source tracking
  source TEXT DEFAULT 'listing_page' CHECK (source IN ('listing_page', 'search_results', 'email_share', 'whatsapp_share', 'direct_link')),
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- At least email OR phone required
  CONSTRAINT inquiry_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for inquiries
CREATE INDEX IF NOT EXISTS idx_inquiries_listing_id ON public.inquiries(listing_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_landlord_id ON public.inquiries(landlord_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_user_id ON public.inquiries(user_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_status ON public.inquiries(status);
CREATE INDEX IF NOT EXISTS idx_inquiries_created_at ON public.inquiries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inquiries_email ON public.inquiries(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_inquiries_phone ON public.inquiries(phone) WHERE phone IS NOT NULL;

-- Enable RLS on inquiries
ALTER TABLE public.inquiries ENABLE ROW LEVEL SECURITY;

-- RLS Policies for inquiries
-- Public can create inquiries (no auth required)
CREATE POLICY "Anyone can create inquiries" ON public.inquiries
  FOR INSERT WITH CHECK (true);

-- Users can view their own inquiries (sent)
CREATE POLICY "Users can view own sent inquiries" ON public.inquiries
  FOR SELECT USING (auth.uid() = user_id);

-- Landlords can view inquiries on their listings
CREATE POLICY "Landlords can view inquiries on their listings" ON public.inquiries
  FOR SELECT USING (auth.uid() = landlord_id);

-- Landlords can update inquiries on their listings
CREATE POLICY "Landlords can update inquiries on their listings" ON public.inquiries
  FOR UPDATE USING (auth.uid() = landlord_id);

-- ===========================================
-- 2. SAVED_LISTINGS TABLE (Favorites Sync)
-- ===========================================
-- For syncing saved listings across devices (authenticated users only)

CREATE TABLE IF NOT EXISTS public.saved_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Optional notes
  notes TEXT,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Unique constraint to prevent duplicates
  UNIQUE(user_id, listing_id)
);

-- Indexes for saved_listings
CREATE INDEX IF NOT EXISTS idx_saved_listings_user_id ON public.saved_listings(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_listing_id ON public.saved_listings(listing_id);
CREATE INDEX IF NOT EXISTS idx_saved_listings_created_at ON public.saved_listings(created_at DESC);

-- Enable RLS on saved_listings
ALTER TABLE public.saved_listings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for saved_listings
-- Users can only manage their own saved listings
CREATE POLICY "Users can view own saved listings" ON public.saved_listings
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own saved listings" ON public.saved_listings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own saved listings" ON public.saved_listings
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- 3. SEARCH_ALERTS TABLE (No Account Required)
-- ===========================================
-- Email/phone based alerts - works for public users

CREATE TABLE IF NOT EXISTS public.search_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- User reference (optional - can work without account)
  user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Contact for notifications (at least one required)
  email TEXT,
  phone TEXT,
  
  -- User-friendly name
  name TEXT,  -- User's label, e.g., "1BR near Ruiru"
  
  -- Search criteria
  property_types TEXT[],  -- apartment, house, etc.
  bedrooms_min INTEGER,
  bedrooms_max INTEGER,
  price_min INTEGER,
  price_max INTEGER,
  areas TEXT[],  -- Ruiru, Juja, Westlands, etc.
  city TEXT DEFAULT 'Nairobi',
  
  -- Additional filters
  verified_only BOOLEAN DEFAULT false,
  available_now BOOLEAN DEFAULT false,
  
  -- Notification preferences
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  frequency TEXT DEFAULT 'instant' CHECK (frequency IN ('instant', 'daily', 'weekly')),
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  last_notified_at TIMESTAMPTZ,
  matches_count INTEGER DEFAULT 0,
  
  -- Verification (for public users)
  verification_token UUID DEFAULT gen_random_uuid(),
  verified_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- At least email OR phone required
  CONSTRAINT alert_contact_required CHECK (email IS NOT NULL OR phone IS NOT NULL)
);

-- Indexes for search_alerts
CREATE INDEX IF NOT EXISTS idx_search_alerts_user_id ON public.search_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_search_alerts_email ON public.search_alerts(email) WHERE email IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_alerts_phone ON public.search_alerts(phone) WHERE phone IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_search_alerts_active ON public.search_alerts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_search_alerts_areas ON public.search_alerts USING GIN (areas);

-- Enable RLS on search_alerts
ALTER TABLE public.search_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies for search_alerts
-- Public can create alerts (no auth required)
CREATE POLICY "Anyone can create search alerts" ON public.search_alerts
  FOR INSERT WITH CHECK (true);

-- Users can view their own alerts
CREATE POLICY "Users can view own alerts" ON public.search_alerts
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can update their own alerts (if linked)
CREATE POLICY "Users can update own alerts" ON public.search_alerts
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can delete their own alerts (if linked)
CREATE POLICY "Users can delete own alerts" ON public.search_alerts
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- 4. TRIGGERS FOR UPDATED_AT
-- ===========================================

-- Trigger for inquiries
DROP TRIGGER IF EXISTS update_inquiries_updated_at ON public.inquiries;
CREATE TRIGGER update_inquiries_updated_at
  BEFORE UPDATE ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Trigger for search_alerts
DROP TRIGGER IF EXISTS update_search_alerts_updated_at ON public.search_alerts;
CREATE TRIGGER update_search_alerts_updated_at
  BEFORE UPDATE ON public.search_alerts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- ===========================================
-- 5. HELPER FUNCTIONS
-- ===========================================

-- Function to match listings to search alerts (for notification system)
CREATE OR REPLACE FUNCTION public.match_listing_to_alerts(p_listing_id UUID)
RETURNS TABLE (alert_id UUID, email TEXT, phone TEXT) AS $$
  SELECT 
    sa.id as alert_id,
    sa.email,
    sa.phone
  FROM public.search_alerts sa
  CROSS JOIN public.listings l
  WHERE 
    l.id = p_listing_id
    AND sa.is_active = true
    AND (sa.verified_at IS NOT NULL OR sa.user_id IS NOT NULL)  -- Must be verified or linked
    AND (
      sa.areas IS NULL 
      OR array_length(sa.areas, 1) IS NULL 
      OR l.area = ANY(sa.areas)
    )
    AND (sa.bedrooms_min IS NULL OR l.bedrooms >= sa.bedrooms_min)
    AND (sa.bedrooms_max IS NULL OR l.bedrooms <= sa.bedrooms_max)
    AND (sa.price_min IS NULL OR l.rent_amount >= sa.price_min)
    AND (sa.price_max IS NULL OR l.rent_amount <= sa.price_max)
    AND (NOT sa.verified_only OR l.is_verified = true)
    AND (NOT sa.available_now OR l.available_now = true);
$$ LANGUAGE sql SECURITY DEFINER;

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'MITASAFI ENGAGEMENT TABLES CREATED!';
    RAISE NOTICE 'Tables: inquiries, saved_listings, search_alerts';
    RAISE NOTICE 'Features:';
    RAISE NOTICE '  - Public users can contact landlords';
    RAISE NOTICE '  - Public users can create search alerts';
    RAISE NOTICE '  - Logged-in users can sync saved listings';
    RAISE NOTICE '========================================';
END $$;
