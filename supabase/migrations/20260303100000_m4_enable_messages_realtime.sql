-- =============================================================================
-- MITASAFI: M4 — ENABLE REALTIME FOR BOOKING MESSAGES
-- =============================================================================
-- The useBookingMessages hook subscribes to postgres_changes (INSERT/UPDATE)
-- on booking_messages. This requires:
--   1. The table being part of the supabase_realtime publication.
--   2. REPLICA IDENTITY FULL so UPDATE payloads contain the full row
--      (needed for read-receipt synchronisation).
-- =============================================================================

-- 1. Add booking_messages to the Realtime publication
--    (idempotent: wrapped in a check so re-running is safe)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename  = 'booking_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.booking_messages;
    RAISE NOTICE 'booking_messages added to supabase_realtime publication';
  ELSE
    RAISE NOTICE 'booking_messages already in supabase_realtime publication — skipping';
  END IF;
END $$;

-- 2. Set REPLICA IDENTITY FULL so UPDATE events include the complete row
--    (allows the client to see is_read / read_at changes without a re-fetch)
ALTER TABLE public.booking_messages REPLICA IDENTITY FULL;

-- =============================================================================
-- Verification (run manually):
--   SELECT * FROM pg_publication_tables WHERE pubname = 'supabase_realtime';
-- =============================================================================
