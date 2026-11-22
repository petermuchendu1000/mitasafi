-- =============================================================================
-- Revert one of the fifteen: booking_status_history.changed_by carries a
-- deliberate sentinel and cannot have a foreign key
-- =============================================================================
-- 20260345000000_identity_referential_integrity.sql added a foreign key on
-- booking_status_history.changed_by -> profiles(id) ON DELETE RESTRICT, on the
-- reasoning that the column is NOT NULL so the actor cannot be anonymised and
-- the delete must therefore be refused rather than destroying the audit trail.
--
-- That reasoning was right about deletes and wrong about INSERTS, because it
-- was derived from the column's nullability without reading what writes it.
--
-- WHAT WRITES IT
--
-- public.auto_log_booking_status_change(), the AFTER UPDATE trigger on
-- bookings, fires on every status change and sets:
--
--   changed_by := COALESCE(
--                   NULLIF(current_setting('app.current_user_id', true), '')::uuid,
--                   '00000000-0000-0000-0000-000000000000'::uuid)
--
-- The fallback is a SENTINEL meaning "the system did this", and it will never
-- exist in profiles. The application sets that GUC on the paths that have a
-- user — src/lib/services/booking-lifecycle.ts, src/lib/services/payments.ts,
-- and four booking actions all call set_config first — but a system-initiated
-- transition has no user to set. auto_confirm_completed_bookings() is exactly
-- that case: it runs from cron, the GUC is empty, and the sentinel is used.
--
-- So the foreign key did not constrain an identity reference. It blocked every
-- system-initiated booking status change, with SQLSTATE 23503. That is a
-- booking-path outage, introduced by a migration whose stated purpose was
-- integrity.
--
-- HOW IT WAS FOUND, which is the part worth keeping
--
-- Not by review, and not by the live project — profiles and bookings are both
-- empty there, so nothing failed and both the apply and its guards passed. It
-- was found by building a local Postgres, applying all 111 migrations from
-- scratch, and running the SQL suites, where SEVEN of them failed on this one
-- constraint. Idempotent-against-the-live-database and
-- applies-correctly-from-scratch are different properties, and only the second
-- one exercises the triggers.
--
-- WHY THIS IS A SEPARATE MIGRATION AND NOT AN EDIT TO 20260345
--
-- 20260345 is applied. Editing it would make the migration history disagree
-- with what ran. Adding a constraint and later removing it is ordinary history,
-- and the two files converge to the same end state in both directions: from
-- scratch, 20260345 adds it and this one removes it; on the live project, it
-- exists and this one removes it. Re-applying the pair in order also converges,
-- so 20260345's own guard — which asserts all fifteen columns carry a foreign
-- key — still passes during its own execution.
--
-- WHAT WOULD FIX IT PROPERLY, and is NOT done here
--
-- Make changed_by NULLABLE, change the trigger to write NULL instead of the
-- sentinel, and then an FK with ON DELETE SET NULL would be both possible and
-- correct. That means altering a NOT NULL column and a trigger on the booking
-- path, and auditing every reader that currently assumes changed_by is
-- non-null. It is a real improvement and a real change; it is not a correction
-- to a mistake, so it does not belong in the same migration as one.
--
-- The other three RESTRICT constraints from 20260345 stand. Checked, not
-- assumed: no function inserts into booking_media, booking_disputes or reviews
-- with the sentinel.
-- =============================================================================

ALTER TABLE public.booking_status_history
  DROP CONSTRAINT IF EXISTS booking_status_history_changed_by_fkey;

DO $$
DECLARE
  n int;
BEGIN
  -- ---- it is gone -------------------------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_constraint
     WHERE conrelid = 'public.booking_status_history'::regclass
       AND conname = 'booking_status_history_changed_by_fkey'
  ) THEN
    RAISE EXCEPTION 'booking_status_history_changed_by_fkey still exists; '
      'system-initiated booking status changes will fail 23503';
  END IF;

  -- ---- and the reason it had to go is still true ------------------------
  -- If a future change stops the trigger writing a sentinel, this constraint
  -- becomes possible again and this guard says so by failing, rather than
  -- leaving a stale explanation behind.
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public'
       AND p.proname = 'auto_log_booking_status_change'
       AND pg_get_functiondef(p.oid) LIKE '%00000000-0000-0000-0000-000000000000%'
  ) THEN
    RAISE EXCEPTION
      'auto_log_booking_status_change no longer writes the nil-uuid sentinel. '
      'The reason this constraint was dropped has changed -- revisit it, and '
      'consider making changed_by nullable with ON DELETE SET NULL instead.';
  END IF;

  -- ---- the OTHER three RESTRICT constraints must survive ---------------
  -- This migration reverts exactly one of the fifteen. If it took others with
  -- it, the integrity work would be quietly undone.
  SELECT count(*) INTO n
    FROM pg_constraint con
   WHERE con.contype = 'f'
     AND con.conname IN ('reviews_reviewer_id_fkey',
                         'booking_disputes_reported_by_fkey',
                         'booking_media_uploaded_by_fkey')
     AND con.confrelid = 'public.profiles'::regclass;
  IF n <> 3 THEN
    RAISE EXCEPTION 'expected the other 3 RESTRICT identity constraints to survive, found %', n;
  END IF;

  -- ---- and none of those three receives a sentinel ---------------------
  IF EXISTS (
    SELECT 1 FROM pg_proc p
      JOIN pg_namespace ns ON ns.oid = p.pronamespace
     WHERE ns.nspname = 'public' AND p.prokind = 'f'
       AND pg_get_functiondef(p.oid) LIKE '%00000000-0000-0000-0000-000000000000%'
       AND (pg_get_functiondef(p.oid) ILIKE '%insert into booking_media%'
         OR pg_get_functiondef(p.oid) ILIKE '%insert into booking_disputes%'
         OR pg_get_functiondef(p.oid) ILIKE '%insert into reviews%')
  ) THEN
    RAISE EXCEPTION 'a surviving RESTRICT constraint has a sentinel writer; it will block '
      'the same way booking_status_history did';
  END IF;

  -- ---- profiles keeps the rest of its inbound edges -------------------
  SELECT count(*) INTO n
    FROM pg_constraint con
    JOIN pg_class parent ON parent.oid = con.confrelid
    JOIN pg_namespace pn ON pn.oid = parent.relnamespace
   WHERE con.contype = 'f' AND pn.nspname = 'public' AND parent.relname = 'profiles';
  IF n < 38 THEN
    RAISE EXCEPTION 'profiles has only % inbound foreign keys; expected at least 38 (39 - 1)', n;
  END IF;

  RAISE NOTICE 'status_history_sentinel: constraint dropped, % inbound FKs remain on profiles', n;
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
-- Do NOT simply re-add it. Re-adding this constraint reintroduces a
-- booking-path outage:
--
--   ALTER TABLE public.booking_status_history
--     ADD CONSTRAINT booking_status_history_changed_by_fkey
--     FOREIGN KEY (changed_by) REFERENCES public.profiles(id) ON DELETE RESTRICT;
--
-- It is only safe once auto_log_booking_status_change stops writing the nil
-- uuid, which means making changed_by nullable first.
-- =============================================================================
