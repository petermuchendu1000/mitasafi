-- ===========================================
-- MITASAFI: ENABLE SUPABASE REALTIME
-- ===========================================
-- This migration enables Supabase Realtime on tables that need
-- real-time subscriptions for the WebSocket functionality.
--
-- TABLES ENABLED:
-- 1. inquiries - For landlord inquiry notifications
-- 2. listing_inquiries - Legacy inquiry table (also used)
-- 3. listings - For saved listing status change notifications
-- ===========================================

-- Enable Realtime for the inquiries table
-- This allows landlords to receive instant notifications when tenants inquire
ALTER PUBLICATION supabase_realtime ADD TABLE public.inquiries;

-- Enable Realtime for the legacy listing_inquiries table
-- Some parts of the codebase still write to this table
ALTER PUBLICATION supabase_realtime ADD TABLE public.listing_inquiries;

-- Enable Realtime for the listings table
-- This allows tenants to receive instant notifications when saved listings change status
ALTER PUBLICATION supabase_realtime ADD TABLE public.listings;

-- ===========================================
-- REPLICA IDENTITY (Required for UPDATE/DELETE events)
-- ===========================================
-- By default, Supabase only sends the primary key for UPDATE/DELETE.
-- Setting REPLICA IDENTITY FULL sends the entire row, which we need
-- for status change detection.

-- For listings, we need FULL to detect status changes
ALTER TABLE public.listings REPLICA IDENTITY FULL;

-- For inquiries, DEFAULT (primary key) is sufficient since we only need INSERT
-- ALTER TABLE public.inquiries REPLICA IDENTITY FULL;

-- ===========================================
-- VERIFICATION
-- ===========================================
-- To verify Realtime is enabled, run:
-- SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';

DO $$
BEGIN
  RAISE NOTICE 'Supabase Realtime enabled for: inquiries, listing_inquiries, listings';
  RAISE NOTICE 'REPLICA IDENTITY FULL set on: listings';
END $$;
