-- ===========================================
-- MITASAFI: NOTIFICATIONS SYSTEM
-- ===========================================
-- A proper notifications system requires:
-- 1. Server-side persistence (notifications table)
-- 2. Automatic creation via triggers (not client-side)
-- 3. Realtime subscription on notifications table
-- 4. Read/unread state tracking
-- 5. Works whether user is online or offline
-- ===========================================

-- ===========================================
-- 1. NOTIFICATIONS TABLE
-- ===========================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Who receives this notification
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Notification type for UI rendering
  type TEXT NOT NULL CHECK (type IN (
    'new_inquiry',           -- Landlord: someone inquired about your listing
    'inquiry_response',      -- Tenant: landlord responded to your inquiry
    'listing_status_change', -- Tenant: a saved listing changed status
    'viewing_scheduled',     -- Both: viewing was scheduled
    'viewing_reminder',      -- Both: upcoming viewing reminder
    'application_received',  -- Landlord: new rental application
    'application_update',    -- Tenant: application status changed
    'payment_received',      -- Landlord: rent payment received
    'payment_due',           -- Tenant: rent payment reminder
    'lease_expiring',        -- Both: lease expiring soon
    'maintenance_update',    -- Both: maintenance request update
    'system'                 -- System announcements
  )),
  
  -- Human-readable content
  title TEXT NOT NULL,
  message TEXT,
  
  -- Link to related entity (for navigation)
  entity_type TEXT CHECK (entity_type IN ('listing', 'inquiry', 'application', 'lease', 'payment', 'maintenance')),
  entity_id UUID,
  
  -- Additional data for rich notifications (JSON)
  metadata JSONB DEFAULT '{}',
  
  -- Read state
  read_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  
  -- Expiry (optional - for time-sensitive notifications)
  expires_at TIMESTAMPTZ
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON public.notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON public.notifications(type);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can only see/manage their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notifications" ON public.notifications
  FOR DELETE USING (auth.uid() = user_id);

-- System can insert notifications (via triggers/functions)
CREATE POLICY "System can insert notifications" ON public.notifications
  FOR INSERT WITH CHECK (true);

-- ===========================================
-- 2. ENABLE REALTIME ON NOTIFICATIONS
-- ===========================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- ===========================================
-- 3. TRIGGER: New Inquiry → Notify Landlord
-- ===========================================
CREATE OR REPLACE FUNCTION notify_landlord_on_inquiry()
RETURNS TRIGGER AS $$
DECLARE
  listing_title TEXT;
  landlord_id UUID;
BEGIN
  -- Get listing details
  SELECT title, listings.landlord_id INTO listing_title, landlord_id
  FROM public.listings
  WHERE id = NEW.listing_id;
  
  -- Create notification for landlord
  INSERT INTO public.notifications (
    user_id,
    type,
    title,
    message,
    entity_type,
    entity_id,
    metadata
  ) VALUES (
    landlord_id,
    'new_inquiry',
    'New inquiry received',
    format('%s is interested in %s', NEW.name, listing_title),
    'inquiry',
    NEW.id,
    jsonb_build_object(
      'listing_id', NEW.listing_id,
      'listing_title', listing_title,
      'inquirer_name', NEW.name,
      'has_viewing_request', COALESCE(NEW.request_viewing, false)
    )
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Apply trigger to inquiries table
DROP TRIGGER IF EXISTS on_inquiry_created ON public.inquiries;
CREATE TRIGGER on_inquiry_created
  AFTER INSERT ON public.inquiries
  FOR EACH ROW
  EXECUTE FUNCTION notify_landlord_on_inquiry();

-- Also apply to legacy listing_inquiries table
CREATE OR REPLACE FUNCTION notify_landlord_on_legacy_inquiry()
RETURNS TRIGGER AS $$
DECLARE
  listing_record RECORD;
BEGIN
  -- Get listing details including landlord
  SELECT id, title, landlord_id INTO listing_record
  FROM public.listings
  WHERE id = NEW.listing_id;
  
  IF listing_record.landlord_id IS NOT NULL THEN
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      listing_record.landlord_id,
      'new_inquiry',
      'New inquiry received',
      format('%s is interested in %s', NEW.name, listing_record.title),
      'inquiry',
      NEW.id,
      jsonb_build_object(
        'listing_id', NEW.listing_id,
        'listing_title', listing_record.title,
        'inquirer_name', NEW.name
      )
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_legacy_inquiry_created ON public.listing_inquiries;
CREATE TRIGGER on_legacy_inquiry_created
  AFTER INSERT ON public.listing_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION notify_landlord_on_legacy_inquiry();

-- ===========================================
-- 4. TRIGGER: Listing Status Change → Notify Saved Users
-- ===========================================
CREATE OR REPLACE FUNCTION notify_saved_users_on_status_change()
RETURNS TRIGGER AS $$
DECLARE
  saved_user RECORD;
  status_message TEXT;
  notification_type TEXT := 'listing_status_change';
BEGIN
  -- Only trigger on actual status changes
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;
  
  -- Only notify for meaningful transitions from active
  IF OLD.status != 'active' AND NEW.status != 'active' THEN
    RETURN NEW;
  END IF;
  
  -- Determine message based on status
  CASE NEW.status
    WHEN 'rented' THEN status_message := 'has been rented';
    WHEN 'paused' THEN status_message := 'is temporarily unavailable';
    WHEN 'archived' THEN status_message := 'has been removed';
    WHEN 'active' THEN status_message := 'is available again';
    ELSE status_message := 'status has changed';
  END CASE;
  
  -- Notify all users who saved this listing
  FOR saved_user IN 
    SELECT user_id FROM public.saved_listings WHERE listing_id = NEW.id
  LOOP
    INSERT INTO public.notifications (
      user_id,
      type,
      title,
      message,
      entity_type,
      entity_id,
      metadata
    ) VALUES (
      saved_user.user_id,
      notification_type,
      format('%s %s', NEW.title, status_message),
      CASE NEW.status
        WHEN 'rented' THEN 'This property is no longer available for rent.'
        WHEN 'paused' THEN 'The landlord has temporarily paused this listing.'
        WHEN 'active' THEN 'Good news! This property is available again.'
        ELSE 'The listing status has been updated.'
      END,
      'listing',
      NEW.id,
      jsonb_build_object(
        'listing_title', NEW.title,
        'old_status', OLD.status,
        'new_status', NEW.status,
        'area', NEW.area
      )
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_listing_status_changed ON public.listings;
CREATE TRIGGER on_listing_status_changed
  AFTER UPDATE OF status ON public.listings
  FOR EACH ROW
  EXECUTE FUNCTION notify_saved_users_on_status_change();

-- ===========================================
-- 5. HELPER FUNCTIONS
-- ===========================================

-- Get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id UUID)
RETURNS INTEGER AS $$
  SELECT COUNT(*)::INTEGER 
  FROM public.notifications 
  WHERE user_id = p_user_id AND read_at IS NULL;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Mark notification as read
CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS VOID AS $$
  UPDATE public.notifications 
  SET read_at = now() 
  WHERE id = p_notification_id AND user_id = auth.uid();
$$ LANGUAGE SQL SECURITY DEFINER;

-- Mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS VOID AS $$
  UPDATE public.notifications 
  SET read_at = now() 
  WHERE user_id = auth.uid() AND read_at IS NULL;
$$ LANGUAGE SQL SECURITY DEFINER;

-- Clean up old notifications (call via cron)
CREATE OR REPLACE FUNCTION cleanup_old_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM public.notifications 
  WHERE created_at < now() - INTERVAL '30 days'
    AND read_at IS NOT NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ===========================================
-- VERIFICATION
-- ===========================================
DO $$
BEGIN
  RAISE NOTICE 'Notifications system created:';
  RAISE NOTICE '  - notifications table with RLS';
  RAISE NOTICE '  - Realtime enabled';
  RAISE NOTICE '  - Trigger: inquiry → notify landlord';
  RAISE NOTICE '  - Trigger: listing status → notify saved users';
  RAISE NOTICE '  - Helper functions for read state';
END $$;
