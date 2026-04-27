-- ==========================================================================
-- Migration: M5 Auto-Completion Timer
-- Purpose: Automatically transition bookings from 'completed' to
--          'customer_confirmed' after 72 hours if customer hasn't responded.
--
-- Mechanism:
--   A PostgreSQL function + pg_cron job that runs hourly.
--   Bookings in 'completed' state whose last status change was > 72 hours
--   ago are auto-confirmed.
--
-- Dependencies:
--   - pg_cron extension (must be enabled in Supabase Dashboard → Extensions)
--   - booking_status_history table
--   - validate_booking_status_transition trigger
--   - auto_log_booking_status_change trigger
--
-- The audit trail records the change as made by 'system' role.
-- ==========================================================================

-- 1. Create the auto-confirm function
CREATE OR REPLACE FUNCTION auto_confirm_completed_bookings()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected_count integer := 0;
  booking_row RECORD;
BEGIN
  -- Find bookings in 'completed' state where the status change to 'completed'
  -- happened more than 72 hours ago.
  FOR booking_row IN
    SELECT b.id, b.customer_id
    FROM bookings b
    INNER JOIN (
      -- Get the timestamp of the last status change TO 'completed'
      SELECT DISTINCT ON (booking_id) booking_id, created_at
      FROM booking_status_history
      WHERE to_status = 'completed'
      ORDER BY booking_id, created_at DESC
    ) h ON h.booking_id = b.id
    WHERE b.status = 'completed'
      AND h.created_at < (NOW() - INTERVAL '72 hours')
  LOOP
    BEGIN
      -- Set audit context so the trigger records 'system' as actor
      PERFORM set_config('app.current_user_id', 'system', true);
      PERFORM set_config('app.current_user_role', 'system', true);

      -- Transition to customer_confirmed
      UPDATE bookings
      SET
        status = 'customer_confirmed',
        updated_at = NOW()
      WHERE id = booking_row.id
        AND status = 'completed'; -- re-check to avoid race condition

      IF FOUND THEN
        affected_count := affected_count + 1;

        -- Insert a notification for the customer
        INSERT INTO notifications (
          user_id,
          type,
          title,
          message,
          metadata,
          created_at
        ) VALUES (
          booking_row.customer_id,
          'booking_update',
          'Booking Auto-Confirmed',
          'Your booking was automatically confirmed after 72 hours.',
          jsonb_build_object(
            'booking_id', booking_row.id,
            'auto_confirmed', true
          ),
          NOW()
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      -- Log but don't abort the entire batch
      RAISE WARNING 'Auto-confirm failed for booking %: %', booking_row.id, SQLERRM;
    END;
  END LOOP;

  RETURN affected_count;
END;
$$;

-- 2. Grant execute permission
GRANT EXECUTE ON FUNCTION auto_confirm_completed_bookings() TO service_role;

-- 3. Create the booking-media storage bucket (idempotent)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'booking-media',
  'booking-media',
  false,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Storage RLS for booking-media bucket
-- Providers can upload for their bookings
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Providers can upload booking media'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Providers can upload booking media"
      ON storage.objects
      FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'booking-media'
        AND EXISTS (
          SELECT 1 FROM service_providers sp
          JOIN bookings b ON b.provider_id = sp.id
          WHERE sp.user_id = auth.uid()
            AND b.id = (string_to_array(name, '/'))[1]::uuid
        )
      );
  END IF;
END $$;

-- Participants can view booking media
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Booking participants can view media'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Booking participants can view media"
      ON storage.objects
      FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'booking-media'
        AND (
          -- Customer
          EXISTS (
            SELECT 1 FROM bookings b
            WHERE b.customer_id = auth.uid()
              AND b.id = (string_to_array(name, '/'))[1]::uuid
          )
          OR
          -- Provider
          EXISTS (
            SELECT 1 FROM service_providers sp
            JOIN bookings b ON b.provider_id = sp.id
            WHERE sp.user_id = auth.uid()
              AND b.id = (string_to_array(name, '/'))[1]::uuid
          )
        )
      );
  END IF;
END $$;

-- Providers can delete their own uploads
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Providers can delete own booking media'
      AND tablename = 'objects' AND schemaname = 'storage'
  ) THEN
    CREATE POLICY "Providers can delete own booking media"
      ON storage.objects
      FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'booking-media'
        AND EXISTS (
          SELECT 1 FROM service_providers sp
          JOIN bookings b ON b.provider_id = sp.id
          WHERE sp.user_id = auth.uid()
            AND b.id = (string_to_array(name, '/'))[1]::uuid
        )
      );
  END IF;
END $$;

-- ==========================================================================
-- NOTE: pg_cron scheduling
-- ==========================================================================
-- After applying this migration, run the following in the Supabase SQL editor
-- (pg_cron must be enabled first):
--
--   SELECT cron.schedule(
--     'auto-confirm-completed-bookings',
--     '0 * * * *',  -- every hour
--     $$SELECT auto_confirm_completed_bookings()$$
--   );
--
-- To verify:
--   SELECT * FROM cron.job;
--
-- To remove:
--   SELECT cron.unschedule('auto-confirm-completed-bookings');
-- ==========================================================================
