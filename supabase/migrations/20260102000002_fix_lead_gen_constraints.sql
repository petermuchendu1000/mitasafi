-- ===========================================
-- MITASAFI: FIX LEAD GENERATION CONSTRAINTS
-- ===========================================
-- Email is REQUIRED for lead generation (not optional)
-- This makes business sense - you need to contact the lead!
-- ===========================================

-- ===========================================
-- 1. FIX INQUIRIES TABLE
-- ===========================================

-- Drop old constraint
ALTER TABLE public.inquiries 
DROP CONSTRAINT IF EXISTS inquiry_contact_required;

-- Make email NOT NULL
ALTER TABLE public.inquiries 
ALTER COLUMN email SET NOT NULL;

-- Name can be derived from email, so make it have a default
-- (Will be set from email prefix in application if not provided)

-- ===========================================
-- 2. FIX SEARCH_ALERTS TABLE  
-- ===========================================

-- Drop old constraint
ALTER TABLE public.search_alerts 
DROP CONSTRAINT IF EXISTS alert_contact_required;

-- Make email NOT NULL
ALTER TABLE public.search_alerts 
ALTER COLUMN email SET NOT NULL;

-- ===========================================
-- SUCCESS MESSAGE
-- ===========================================

DO $$
BEGIN
    RAISE NOTICE '========================================';
    RAISE NOTICE 'LEAD GENERATION CONSTRAINTS FIXED!';
    RAISE NOTICE 'Email is now REQUIRED for:';
    RAISE NOTICE '  - inquiries table';
    RAISE NOTICE '  - search_alerts table';
    RAISE NOTICE '========================================';
END $$;
