-- ===========================================
-- MITASAFI: SEARCH ALERTS SOURCE TRACKING
-- ===========================================
-- Track where search alerts originated for analytics
-- and to enable "notify when THIS listing is available again"
-- ===========================================

-- Add source tracking columns to search_alerts
ALTER TABLE public.search_alerts 
ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'manual',
ADD COLUMN IF NOT EXISTS source_listing_id UUID REFERENCES public.listings(id) ON DELETE SET NULL;

-- Source values:
-- 'manual' - User created alert from save search button
-- 'no_results' - Created from empty search results
-- 'unavailable_listing' - Created when saved listing became unavailable
-- 'similar_search' - Created from "find similar" action

-- Add comment for documentation
COMMENT ON COLUMN public.search_alerts.source IS 'Where the alert was created: manual, no_results, unavailable_listing, similar_search';
COMMENT ON COLUMN public.search_alerts.source_listing_id IS 'The listing that triggered this alert (for unavailable_listing source)';

-- Index for querying alerts by source listing
CREATE INDEX IF NOT EXISTS idx_search_alerts_source_listing 
ON public.search_alerts(source_listing_id) 
WHERE source_listing_id IS NOT NULL;

-- Index for analytics by source
CREATE INDEX IF NOT EXISTS idx_search_alerts_source 
ON public.search_alerts(source);

-- ===========================================
-- WAITLIST TABLE: "Notify me when THIS listing is available"
-- ===========================================
-- Simpler than search_alerts - just tracks interest in specific listings

CREATE TABLE IF NOT EXISTS public.listing_waitlist (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- The listing they're waiting for
  listing_id UUID NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  
  -- Contact info
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  phone TEXT,
  name TEXT,
  
  -- Notification preferences
  notify_email BOOLEAN DEFAULT true,
  notify_sms BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  notified_at TIMESTAMPTZ, -- When we notified them it's available
  
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- One entry per email per listing
  UNIQUE(listing_id, email)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_listing_waitlist_listing ON public.listing_waitlist(listing_id);
CREATE INDEX IF NOT EXISTS idx_listing_waitlist_user ON public.listing_waitlist(user_id) WHERE user_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_listing_waitlist_active ON public.listing_waitlist(is_active) WHERE is_active = true;

-- Enable RLS
ALTER TABLE public.listing_waitlist ENABLE ROW LEVEL SECURITY;

-- Policies
-- Anyone can join waitlist
CREATE POLICY "Anyone can join waitlist" ON public.listing_waitlist
  FOR INSERT WITH CHECK (true);

-- Users can view their own waitlist entries
CREATE POLICY "Users can view own waitlist" ON public.listing_waitlist
  FOR SELECT USING (auth.uid() = user_id OR user_id IS NULL);

-- Users can delete their own entries
CREATE POLICY "Users can delete own waitlist" ON public.listing_waitlist
  FOR DELETE USING (auth.uid() = user_id);

-- ===========================================
-- TRIGGER: Notify waitlist when listing becomes active
-- ===========================================

CREATE OR REPLACE FUNCTION notify_waitlist_on_listing_active()
RETURNS TRIGGER AS $$
DECLARE
  waitlist_entry RECORD;
BEGIN
  -- Only trigger when status changes TO active
  IF NEW.status = 'active' AND OLD.status != 'active' THEN
    -- Notify all active waitlist entries for this listing
    FOR waitlist_entry IN
      SELECT id, user_id, email FROM public.listing_waitlist 
      WHERE listing_id = NEW.id AND is_active = true AND notified_at IS NULL
    LOOP
      -- Create notification for registered users
      IF waitlist_entry.user_id IS NOT NULL THEN
        INSERT INTO public.notifications (
          user_id,
          type,
          title,
          message,
          entity_type,
          entity_id,
          metadata
        ) VALUES (
          waitlist_entry.user_id,
          'listing_available',
          NEW.title || ' is available again!',
          'The property you were waiting for is now available.',
          'listing',
          NEW.id,
          jsonb_build_object(
            'listing_title', NEW.title,
            'area', NEW.area,
            'rent_amount', NEW.rent_amount
          )
        );
      END IF;
      
      -- Mark as notified
      UPDATE public.listing_waitlist 
      SET notified_at = now(), is_active = false
      WHERE id = waitlist_entry.id;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
DROP TRIGGER IF EXISTS notify_waitlist_on_active ON public.listings;
CREATE TRIGGER notify_waitlist_on_active
  AFTER UPDATE ON public.listings
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION notify_waitlist_on_listing_active();

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'SEARCH ALERTS SOURCE TRACKING ADDED!';
    RAISE NOTICE '- source column for analytics';
    RAISE NOTICE '- source_listing_id for tracking origin';
    RAISE NOTICE '- listing_waitlist table for specific listings';
    RAISE NOTICE '- Auto-notify trigger when listing becomes active';
    RAISE NOTICE '========================================';
END $$;
