-- ===========================================
-- MITASAFI: PHONE REQUIRED, EMAIL OPTIONAL
-- ===========================================
-- Phone is the primary contact method in Kenya
-- Email is optional (for additional notifications)
-- ===========================================

-- ===========================================
-- 1. FIX INQUIRIES TABLE
-- ===========================================

-- Make email nullable (optional)
ALTER TABLE public.inquiries 
ALTER COLUMN email DROP NOT NULL;

-- Make phone NOT NULL (required)
ALTER TABLE public.inquiries 
ALTER COLUMN phone SET NOT NULL;

-- Drop old constraint if exists
ALTER TABLE public.inquiries 
DROP CONSTRAINT IF EXISTS inquiry_contact_required;

-- ===========================================
-- 2. FIX SEARCH_ALERTS TABLE  
-- ===========================================

-- Make email nullable (optional)
ALTER TABLE public.search_alerts 
ALTER COLUMN email DROP NOT NULL;

-- Make phone NOT NULL (required)
ALTER TABLE public.search_alerts 
ALTER COLUMN phone SET NOT NULL;

-- Drop old constraint if exists
ALTER TABLE public.search_alerts 
DROP CONSTRAINT IF EXISTS alert_contact_required;

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'CONTACT VALIDATION UPDATED!';
    RAISE NOTICE 'Phone is REQUIRED, Email is OPTIONAL';
    RAISE NOTICE '  - inquiries table';
    RAISE NOTICE '  - search_alerts table';
    RAISE NOTICE '========================================';
END $$;
