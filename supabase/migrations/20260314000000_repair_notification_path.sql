-- =============================================================================
-- B-notifications.sql  --  Repair of the NOTIFICATION path (Mitasafi)
-- =============================================================================
-- STATUS : AUTHORED, NOT APPLIED. Idempotent: safe to run more than once.
-- TARGET : Supabase Postgres 17, schema public. Run as postgres (owner).
-- TX     : Single transaction. Any failure (including the self-check at the
--          bottom) rolls EVERYTHING back, so a half-applied state is impossible.
--
-- WHY THIS EXISTS (see B-notifications.md for receipts)
--   20260108120005_support_tables.sql did `DROP TABLE notifications CASCADE`
--   and recreated it booking-centric (user_role, booking_id, provider_id,
--   review_id, action_url, channel flags).  The listing-era columns
--   entity_type / entity_id / metadata were dropped, but five PL/pgSQL
--   functions still INSERT them (and omit user_role, which is NOT NULL).
--   The CASCADE also removed the table from the supabase_realtime publication.
--   Result: INSERT on inquiries / listing_inquiries / listings fails inside the
--   AFTER trigger, aborting the user's own write; booking auto-confirm silently
--   rolls back; realtime never fires.
--
-- DESIGN DECISION  (schema follows the app -> option (b), plus (a) for safety)
--   The app READS entity_type / entity_id / metadata:
--     src/hooks/useNotifications.ts:74-77 (Notification type)
--     src/components/shared/NotificationCenter.tsx:35-56 (link fallback)
--     src/app/dashboard/notifications/NotificationsPageClient.tsx:130-135
--   so the columns are re-added (nullable / defaulted, additive, no data loss).
--   The functions are ALSO rewritten because they additionally omit the
--   NOT NULL user_role and would violate CHECK notification_has_entity.
--
-- NOT TOUCHED: notifications.is_read (stale, nothing writes it; read_at is the
--   app's source of truth), expires_at (declared in a TS type, never used).
-- =============================================================================

-- BEGIN removed: the migration runner wraps each file in its own transaction.

-- Fail fast instead of waiting forever on a lock held by a busy session.
SET LOCAL lock_timeout = '5s';

-- -----------------------------------------------------------------------------
-- 1. Re-add the columns the app consumes. Additive; table has 0 rows today.
--    metadata is NOT NULL DEFAULT '{}' because the TS type is Record<string,unknown>
--    (non-nullable). A constant default is a metadata-only change on PG 11+.
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS entity_type text,
  ADD COLUMN IF NOT EXISTS entity_id   uuid,
  ADD COLUMN IF NOT EXISTS metadata    jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.notifications.entity_type IS
  'Listing-era subject kind (listing|inquiry|...). Read by NotificationCenter link fallback.';
COMMENT ON COLUMN public.notifications.entity_id IS
  'Id of the subject row named by entity_type.';
COMMENT ON COLUMN public.notifications.metadata IS
  'Free-form structured context (listing_title, old_status, ...). Never required.';

-- -----------------------------------------------------------------------------
-- 2. CHECK notification_has_entity currently demands booking_id / provider_id /
--    review_id (or a system type). Listing/inquiry notifications carry none of
--    those, so they would still be rejected after step 1. Widen it to accept
--    entity_id. Table is empty, so re-validation is free.
-- -----------------------------------------------------------------------------
ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notification_has_entity;
ALTER TABLE public.notifications ADD CONSTRAINT notification_has_entity CHECK (
     booking_id  IS NOT NULL
  OR provider_id IS NOT NULL
  OR review_id   IS NOT NULL
  OR entity_id   IS NOT NULL
  OR type = ANY (ARRAY['system_announcement'::text, 'account_update'::text])
);

-- -----------------------------------------------------------------------------
-- 3. Trigger functions that INSERT into notifications.
--    Changes vs live bodies:
--      * supply user_role (NOT NULL, no default) -- 'landlord' / 'customer'
--      * keep entity_type/entity_id/metadata (columns exist again)
--      * skip when there is no recipient (NULL user_id would violate NOT NULL)
--      * a notification failure must NEVER abort the user's own write: each
--        insert is wrapped in a sub-block that downgrades errors to WARNING.
--      * SET search_path on SECURITY DEFINER functions.
--    Trigger bindings are unchanged (CREATE OR REPLACE keeps them).
-- -----------------------------------------------------------------------------

-- 3a. inquiries -> landlord  (trigger on_inquiry_created)
CREATE OR REPLACE FUNCTION public.notify_landlord_on_inquiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_title    text;
  v_landlord uuid;
BEGIN
  SELECT l.title, l.landlord_id
    INTO v_title, v_landlord
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  v_landlord := COALESCE(v_landlord, NEW.landlord_id);
  IF v_landlord IS NULL THEN
    RETURN NEW;
  END IF;

  BEGIN
    INSERT INTO public.notifications
      (user_id, user_role, type, title, message, entity_type, entity_id, metadata)
    VALUES (
      v_landlord,
      'landlord',
      'new_inquiry',
      'New inquiry received',
      format('%s is interested in %s', NEW.name, COALESCE(v_title, 'your listing')),
      'inquiry',
      NEW.id,
      jsonb_build_object(
        'listing_id',          NEW.listing_id,
        'listing_title',       v_title,
        'inquirer_name',       NEW.name,
        'has_viewing_request', COALESCE(NEW.request_viewing, false)
      )
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING '[notify_landlord_on_inquiry] notification skipped: % (%)', SQLERRM, SQLSTATE;
  END;

  RETURN NEW;
END;
$function$;

-- 3b. listing_inquiries (legacy) -> landlord  (trigger on_legacy_inquiry_created)
CREATE OR REPLACE FUNCTION public.notify_landlord_on_legacy_inquiry()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_listing record;
BEGIN
  SELECT l.id, l.title, l.landlord_id
    INTO v_listing
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  IF v_listing.landlord_id IS NOT NULL THEN
    BEGIN
      INSERT INTO public.notifications
        (user_id, user_role, type, title, message, entity_type, entity_id, metadata)
      VALUES (
        v_listing.landlord_id,
        'landlord',
        'new_inquiry',
        'New inquiry received',
        format('%s is interested in %s', NEW.name, COALESCE(v_listing.title, 'your listing')),
        'inquiry',
        NEW.id,
        jsonb_build_object(
          'listing_id',    NEW.listing_id,
          'listing_title', v_listing.title,
          'inquirer_name', NEW.name
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[notify_landlord_on_legacy_inquiry] notification skipped: % (%)', SQLERRM, SQLSTATE;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3c. listings status change -> users who saved the listing  (on_listing_status_changed)
CREATE OR REPLACE FUNCTION public.notify_saved_users_on_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_saved          record;
  v_status_message text;
  v_type           constant text := 'listing_status_change';
BEGIN
  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  -- Only transitions into or out of 'active' are interesting.
  IF OLD.status <> 'active' AND NEW.status <> 'active' THEN
    RETURN NEW;
  END IF;

  CASE NEW.status
    WHEN 'rented'   THEN v_status_message := 'has been rented';
    WHEN 'paused'   THEN v_status_message := 'is temporarily unavailable';
    WHEN 'archived' THEN v_status_message := 'has been removed';
    WHEN 'active'   THEN v_status_message := 'is available again';
    ELSE                 v_status_message := 'status has changed';
  END CASE;

  FOR v_saved IN
    SELECT sl.user_id FROM public.saved_listings sl WHERE sl.listing_id = NEW.id
  LOOP
    BEGIN
      INSERT INTO public.notifications
        (user_id, user_role, type, title, message, entity_type, entity_id, metadata)
      VALUES (
        v_saved.user_id,
        'customer',
        v_type,
        format('%s %s', NEW.title, v_status_message),
        CASE NEW.status
          WHEN 'rented' THEN 'This property is no longer available for rent.'
          WHEN 'paused' THEN 'The landlord has temporarily paused this listing.'
          WHEN 'active' THEN 'Good news! This property is available again.'
          ELSE               'The listing status has been updated.'
        END,
        'listing',
        NEW.id,
        jsonb_build_object(
          'listing_title', NEW.title,
          'old_status',    OLD.status,
          'new_status',    NEW.status,
          'area',          NEW.area
        )
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING '[notify_saved_users_on_status_change] skipped user %: % (%)',
        v_saved.user_id, SQLERRM, SQLSTATE;
    END;
  END LOOP;

  RETURN NEW;
END;
$function$;

-- 3d. listings -> active : notify waitlist  (trigger notify_waitlist_on_active)
CREATE OR REPLACE FUNCTION public.notify_waitlist_on_listing_active()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  v_entry record;
BEGIN
  IF NEW.status = 'active' AND OLD.status <> 'active' THEN
    FOR v_entry IN
      SELECT w.id, w.user_id, w.email
        FROM public.listing_waitlist w
       WHERE w.listing_id = NEW.id AND w.is_active = true AND w.notified_at IS NULL
    LOOP
      IF v_entry.user_id IS NOT NULL THEN
        BEGIN
          INSERT INTO public.notifications
            (user_id, user_role, type, title, message, entity_type, entity_id, metadata)
          VALUES (
            v_entry.user_id,
            'customer',
            'listing_available',
            NEW.title || ' is available again!',
            'The property you were waiting for is now available.',
            'listing',
            NEW.id,
            jsonb_build_object(
              'listing_title', NEW.title,
              'area',          NEW.area,
              'rent_amount',   NEW.rent_amount
            )
          );
        EXCEPTION WHEN OTHERS THEN
          RAISE WARNING '[notify_waitlist_on_listing_active] skipped user %: % (%)',
            v_entry.user_id, SQLERRM, SQLSTATE;
        END;
      END IF;

      UPDATE public.listing_waitlist
         SET notified_at = now(), is_active = false
       WHERE id = v_entry.id;
    END LOOP;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3e. 5th offender the reports missed: auto_confirm_completed_bookings()
--     Live body inserted (user_id,type,title,message,metadata,created_at):
--     no user_role (NOT NULL) and no booking_id (CHECK) -> the INSERT failed,
--     and because it sits inside the per-row BEGIN..EXCEPTION block the failure
--     also ROLLED BACK the status UPDATE, so nothing was ever auto-confirmed.
--     Body below is the live body, with only the INSERT corrected.
CREATE OR REPLACE FUNCTION public.auto_confirm_completed_bookings()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  affected_count integer := 0;
  booking_row RECORD;
BEGIN
  FOR booking_row IN
    SELECT b.id, b.customer_id
    FROM bookings b
    INNER JOIN (
      SELECT DISTINCT ON (booking_id) booking_id, created_at
      FROM booking_status_history
      WHERE to_status = 'completed'
      ORDER BY booking_id, created_at DESC
    ) h ON h.booking_id = b.id
    WHERE b.status = 'completed'
      AND h.created_at < (NOW() - INTERVAL '72 hours')
  LOOP
    BEGIN
      PERFORM set_config('app.current_user_id', 'system', true);
      PERFORM set_config('app.current_user_role', 'system', true);

      UPDATE bookings
      SET status = 'customer_confirmed', updated_at = NOW()
      WHERE id = booking_row.id
        AND status = 'completed';

      IF FOUND THEN
        affected_count := affected_count + 1;

        INSERT INTO notifications (
          user_id, user_role, type, title, message,
          booking_id, action_url, metadata, created_at
        ) VALUES (
          booking_row.customer_id,
          'customer',
          'booking_update',
          'Booking Auto-Confirmed',
          'Your booking was automatically confirmed after 72 hours.',
          booking_row.id,
          '/dashboard/bookings/' || booking_row.id,
          jsonb_build_object('booking_id', booking_row.id, 'auto_confirmed', true),
          NOW()
        );
      END IF;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'Auto-confirm failed for booking %: %', booking_row.id, SQLERRM;
    END;
  END LOOP;

  RETURN affected_count;
END;
$function$;

-- -----------------------------------------------------------------------------
-- 4. Realtime. The table is absent from supabase_realtime (CASCADE drop of the
--    old table removed it). Without membership, useNotifications' INSERT /
--    UPDATE / DELETE postgres_changes subscriptions never receive an event.
--    RLS (notifications_own_read) still scopes what each subscriber receives.
-- -----------------------------------------------------------------------------
DO $rt$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
     WHERE pubname = 'supabase_realtime'
       AND schemaname = 'public' AND tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END
$rt$;

-- -----------------------------------------------------------------------------
-- 5. RLS: the app deletes with the USER's JWT (useNotifications.ts:222-,
--    api/notifications/route.ts DELETE) but only SELECT and UPDATE policies
--    exist, so deletes silently affect 0 rows (no error!). Add own-row DELETE.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS notifications_own_delete ON public.notifications;
CREATE POLICY notifications_own_delete ON public.notifications
  FOR DELETE TO authenticated
  USING (user_id = (SELECT auth.uid()));

-- -----------------------------------------------------------------------------
-- 6. Helper RPCs.  Schema-wise they are CORRECT (read_at is the app's truth).
--    Hardening only:
--      * cleanup_old_notifications(): SECURITY DEFINER + EXECUTE for PUBLIC/anon
--        means ANY anonymous caller can purge every user's old read rows.
--        Restrict to service_role.
--      * get_unread_notification_count(p_user_id): SECURITY DEFINER with a
--        caller-supplied id lets anyone count anyone's unread rows. Make it
--        SECURITY INVOKER so notifications_own_read RLS applies
--        (service_role bypasses RLS, so server use still works).
--      * pin search_path on the mark_* DEFINER functions; drop anon EXECUTE.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_unread_notification_count(p_user_id uuid)
 RETURNS integer
 LANGUAGE sql
 STABLE
 SECURITY INVOKER
 SET search_path = public, pg_temp
AS $function$
  SELECT COUNT(*)::integer
    FROM public.notifications
   WHERE user_id = p_user_id AND read_at IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.mark_notification_read(p_notification_id uuid)
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  UPDATE public.notifications
     SET read_at = now()
   WHERE id = p_notification_id AND user_id = auth.uid();
$function$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
 RETURNS void
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
  UPDATE public.notifications
     SET read_at = now()
   WHERE user_id = auth.uid() AND read_at IS NULL;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_old_notifications()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public, pg_temp
AS $function$
DECLARE
  deleted_count integer;
BEGIN
  DELETE FROM public.notifications
   WHERE created_at < now() - INTERVAL '30 days'
     AND read_at IS NOT NULL;
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$function$;

REVOKE ALL ON FUNCTION public.cleanup_old_notifications()            FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.cleanup_old_notifications()        TO service_role;

REVOKE ALL ON FUNCTION public.get_unread_notification_count(uuid)    FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.get_unread_notification_count(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mark_notification_read(uuid)           FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_notification_read(uuid)       TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.mark_all_notifications_read()          FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.mark_all_notifications_read()      TO authenticated, service_role;

-- -----------------------------------------------------------------------------
-- 7. SELF-CHECK. RAISES (=> whole transaction rolls back) if any fix is absent.
-- -----------------------------------------------------------------------------
DO $check$
DECLARE
  v_missing text;
  v_def     text;
  v_fn      text;
BEGIN
  -- 7a. columns exist with expected types
  SELECT string_agg(c, ', ') INTO v_missing
    FROM unnest(ARRAY['entity_type:text','entity_id:uuid','metadata:jsonb']) AS c
   WHERE NOT EXISTS (
     SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name='notifications'
        AND column_name = split_part(c, ':', 1)
        AND udt_name    = split_part(c, ':', 2));
  IF v_missing IS NOT NULL THEN
    RAISE EXCEPTION 'SELF-CHECK FAILED: missing/mistyped columns: %', v_missing;
  END IF;

  -- 7b. CHECK constraint widened
  SELECT pg_get_constraintdef(oid) INTO v_def FROM pg_constraint
   WHERE conrelid='public.notifications'::regclass AND conname='notification_has_entity';
  IF v_def IS NULL OR v_def NOT LIKE '%entity_id IS NOT NULL%' THEN
    RAISE EXCEPTION 'SELF-CHECK FAILED: notification_has_entity not widened (%)', v_def;
  END IF;

  -- 7c. every writer function now supplies user_role
  FOREACH v_fn IN ARRAY ARRAY[
    'notify_landlord_on_inquiry','notify_landlord_on_legacy_inquiry',
    'notify_saved_users_on_status_change','notify_waitlist_on_listing_active',
    'auto_confirm_completed_bookings'] LOOP
    SELECT pg_get_functiondef(p.oid) INTO v_def
      FROM pg_proc p WHERE p.proname = v_fn AND p.pronamespace = 'public'::regnamespace;
    IF v_def IS NULL OR v_def !~* 'user_role' THEN
      RAISE EXCEPTION 'SELF-CHECK FAILED: % does not supply user_role', v_fn;
    END IF;
  END LOOP;

  -- 7d. realtime publication membership
  IF NOT EXISTS (SELECT 1 FROM pg_publication_tables
                  WHERE pubname='supabase_realtime' AND schemaname='public'
                    AND tablename='notifications') THEN
    RAISE EXCEPTION 'SELF-CHECK FAILED: notifications not in supabase_realtime';
  END IF;

  -- 7e. DELETE policy
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public'
                  AND tablename='notifications' AND cmd='DELETE') THEN
    RAISE EXCEPTION 'SELF-CHECK FAILED: no DELETE policy on notifications';
  END IF;

  -- 7f. cleanup no longer callable by anon/authenticated
  IF has_function_privilege('anon', 'public.cleanup_old_notifications()', 'EXECUTE')
     OR has_function_privilege('authenticated', 'public.cleanup_old_notifications()', 'EXECUTE') THEN
    RAISE EXCEPTION 'SELF-CHECK FAILED: cleanup_old_notifications still executable by anon/authenticated';
  END IF;

  -- 7g. behavioural: the exact column set the triggers use must be insertable
  --     and satisfy every constraint. Inserted inside a sub-block that is
  --     force-rolled-back with a sentinel exception, so no row persists.
  BEGIN
    INSERT INTO public.notifications
      (user_id, user_role, type, title, message, entity_type, entity_id, metadata)
    VALUES (gen_random_uuid(), 'landlord', 'new_inquiry', 'selfcheck', 'selfcheck',
            'inquiry', gen_random_uuid(), '{"k":1}'::jsonb);
    RAISE EXCEPTION USING ERRCODE = 'P0001', MESSAGE = '__selfcheck_rollback__';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM <> '__selfcheck_rollback__' THEN
      RAISE EXCEPTION 'SELF-CHECK FAILED: probe insert rejected: % (%)', SQLERRM, SQLSTATE;
    END IF;
  END;

  RAISE NOTICE 'B-notifications self-check: ALL OK';
END
$check$;

-- COMMIT removed: see note above.

-- =============================================================================
-- ROLLBACK (manual; see .md for caveats). Not executed.
--   ALTER PUBLICATION supabase_realtime DROP TABLE public.notifications;
--   DROP POLICY IF EXISTS notifications_own_delete ON public.notifications;
--   ALTER TABLE public.notifications DROP CONSTRAINT notification_has_entity;
--   ALTER TABLE public.notifications ADD CONSTRAINT notification_has_entity CHECK (
--     booking_id IS NOT NULL OR provider_id IS NOT NULL OR review_id IS NOT NULL
--     OR type = ANY (ARRAY['system_announcement','account_update']));
--   ALTER TABLE public.notifications DROP COLUMN entity_type, DROP COLUMN entity_id, DROP COLUMN metadata;
--   -- functions: restore from the pre-change pg_get_functiondef dump (see .md).
-- =============================================================================
