-- =============================================================================
-- Make provider capacity enforcement actually work
-- =============================================================================
-- Four coupled defects. Each one alone makes the fix for the others useless or
-- actively harmful, so they ship as a single change.
--
-- D-1 CAPACITY ENFORCEMENT IS DEAD. Double-booking is unblocked today.
--   BEFORE triggers on bookings fire in alphabetical order by name. Measured:
--     pos  7  check_provider_capacity_trigger   enforce_provider_capacity_v2
--     pos 14  populate_busy_interval_trigger    populate_busy_interval
--   populate_busy_interval is the ONLY function that assigns
--   estimated_busy_from (verified against every BEFORE trigger function on the
--   table: calculate_busy_to_from_duration assigns busy_TO only; the others
--   assign neither). The application never supplies the column either -- all
--   six references in src are in generated types.
--
--   So the column is NULL when capacity's turn comes, and capacity is gated on
--   it TWICE: the trigger's WHEN clause requires estimated_busy_from IS NOT
--   NULL, and the function's first statement returns early on the same
--   condition. The check never runs. Not once.
--
-- D-2 FIXING D-1 ALONE BREAKS BOOKING ENTIRELY.
--   On exceeding capacity the function sets NEW.status := 'needs_reassignment'.
--   booking_state_transitions has ZERO rows with that status as to_status AND
--   zero with it as from_status (verified). So the first capacity-constrained
--   booking would be rejected by enforce_booking_state_machine, and any booking
--   that did reach the status would be a permanent dead end.
--
-- D-3 bookings.status IS NULLABLE, and NULL silently passes three gates.
--   Evaluated on the live server:
--     null::booking_status NOT IN ('draft','submitted')          -> NULL
--     (status = ANY(exempt) OR pricing_snapshot IS NOT NULL)     -> NULL
--     (status = ANY(exempt) OR estimated_duration IS NOT NULL)   -> NULL
--   A CHECK constraint PASSES on NULL, and the state machine's IF is not taken.
--   An explicit NULL status therefore walks past the state machine's insert
--   guard and both field requirements. The constraints existing was never
--   evidence that they hold.
--
-- D-4 (found while fixing the above) THE FLAG CANNOT BE WRITTEN.
--   needs_reassignment is exempt from duration_required_after_submission but
--   NOT from pricing_snapshot_required_after_confirmation. So flagging an
--   unpriced booking would violate that CHECK and fail the ENTIRE write with
--   23514 -- turning "flag this booking for reassignment" into "reject the
--   customer's booking outright". Verified: the predicate evaluates false for
--   needs_reassignment with a null snapshot.
--
-- Rollback is at the bottom. Rolling back restores unenforced capacity.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Remove the duplicate, currently-dead busy_to triggers
-- -----------------------------------------------------------------------------
-- calculate_busy_to and calculate_busy_to_trigger are a literal duplicate pair
-- running the same function twice per write. Both are dead today for exactly
-- the same reason capacity is: they only act when estimated_busy_from is
-- already set, and nothing sets it before them.
--
-- They are dropped rather than left in place because reordering (step 2) would
-- WAKE them, and waking them is harmful: they recompute
-- estimated_busy_to := estimated_busy_from + estimated_duration_minutes
-- unconditionally, which would overwrite the emergency SLA window that
-- populate_busy_interval computes from service_capabilities. An emergency
-- booking's provider would be blocked for the job's duration instead of the
-- response SLA. populate_busy_interval already sets both ends of the interval
-- and derives the duration, so it is the single authority.
DROP TRIGGER IF EXISTS calculate_busy_to ON public.bookings;
DROP TRIGGER IF EXISTS calculate_busy_to_trigger ON public.bookings;

-- -----------------------------------------------------------------------------
-- 2. Make capacity fire AFTER the interval it depends on
-- -----------------------------------------------------------------------------
-- Recreated under a name that sorts last, so it runs after
-- populate_busy_interval_trigger. The WHEN clause and the UPDATE OF column list
-- are preserved verbatim from the live definition -- only the name changes.
--
-- For a BEFORE ROW trigger PostgreSQL evaluates the WHEN condition immediately
-- before firing the function, against NEW as earlier BEFORE triggers have left
-- it. So moving the trigger later is sufficient to satisfy both gates; the
-- function body needs no change at all.
--
-- DELIBERATE CONSEQUENCE, stated plainly: capacity now runs AFTER
-- enforce_booking_state_machine, so the status it assigns is not validated by
-- the state machine. That is intentional. needs_reassignment here is a
-- system-assigned safety flag, not a caller-requested transition. Validating it
-- would mean adding an inbound transition row from every status capacity can
-- fire on (21 of them), and because booking_state_transitions governs ALL
-- transitions, that would also let any CALLER move a booking into
-- needs_reassignment directly -- a far wider change than this fix needs.
-- Execution from the flagged state remains blocked by
-- prevent_execution_if_needs_reassignment.
DROP TRIGGER IF EXISTS check_provider_capacity_trigger ON public.bookings;
DROP TRIGGER IF EXISTS zz_enforce_provider_capacity ON public.bookings;
CREATE TRIGGER zz_enforce_provider_capacity
  BEFORE INSERT OR UPDATE OF provider_id, estimated_busy_from, estimated_busy_to, status
  ON public.bookings
  FOR EACH ROW
  WHEN (
    new.provider_id IS NOT NULL
    AND new.estimated_busy_from IS NOT NULL
    AND new.status <> ALL (ARRAY['completed'::booking_status,
                                 'customer_confirmed'::booking_status,
                                 'cancelled_customer'::booking_status,
                                 'cancelled_provider'::booking_status])
  )
  EXECUTE FUNCTION public.enforce_provider_capacity_v2();

-- -----------------------------------------------------------------------------
-- 3. Let the flag be written on an unpriced booking (D-4)
-- -----------------------------------------------------------------------------
-- needs_reassignment is a system flag meaning "no provider capacity", not a
-- priced commitment, so it joins the statuses exempt from requiring a pricing
-- snapshot. Without this the capacity trigger's own write is rejected by the
-- CHECK and the customer's booking fails outright instead of being flagged.
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS pricing_snapshot_required_after_confirmation;

ALTER TABLE public.bookings
  ADD CONSTRAINT pricing_snapshot_required_after_confirmation
  CHECK (
    status = ANY (ARRAY['draft'::booking_status,
                        'submitted'::booking_status,
                        'provider_viewed'::booking_status,
                        'needs_reassignment'::booking_status,
                        'cancelled_customer'::booking_status,
                        'cancelled_provider'::booking_status])
    OR pricing_snapshot IS NOT NULL
  );

-- -----------------------------------------------------------------------------
-- 4. Give the flagged booking a way out (D-2)
-- -----------------------------------------------------------------------------
-- prevent_execution_if_needs_reassignment's own hint says the booking "must be
-- reassigned or cancelled first", so those are the edges added: back to the
-- pool, forward to a provider with capacity, or cancelled by either party.
-- Without these a flagged booking is a permanent dead end -- the same
-- dead-end shape as a terminal status with no exit.
INSERT INTO public.booking_state_transitions
  (from_status, to_status, allowed, requires_provider, requires_payment, notes)
VALUES
  ('needs_reassignment', 'submitted',          true, false, false, 'Returned to the pool for a different provider'),
  ('needs_reassignment', 'confirmed',          true, true,  false, 'Reassigned to a provider with capacity'),
  ('needs_reassignment', 'cancelled_customer', true, false, false, 'Customer gave up rather than wait for reassignment'),
  ('needs_reassignment', 'cancelled_provider', true, false, false, 'Cancelled while pending reassignment')
ON CONFLICT (from_status, to_status) DO UPDATE
  SET allowed = true, notes = excluded.notes;

-- -----------------------------------------------------------------------------
-- 5. Close the NULL-status bypass (D-3)
-- -----------------------------------------------------------------------------
-- The column already defaults to 'draft', so omitting it is unaffected; only an
-- EXPLICIT null is now rejected, which is the bypass being closed.
UPDATE public.bookings SET status = 'draft' WHERE status IS NULL;
ALTER TABLE public.bookings ALTER COLUMN status SET NOT NULL;

-- =============================================================================
-- 6. Assertions. Each can fail.
-- =============================================================================
DO $assert$
DECLARE
  v_cap_pos int;
  v_pop_pos int;
BEGIN
  -- The ordering that was the whole defect.
  SELECT pos INTO v_cap_pos FROM (
    SELECT tgname, row_number() OVER (ORDER BY tgname) pos
      FROM pg_trigger WHERE tgrelid='public.bookings'::regclass
       AND NOT tgisinternal AND (tgtype & 2) = 2
  ) t WHERE tgname = 'zz_enforce_provider_capacity';
  SELECT pos INTO v_pop_pos FROM (
    SELECT tgname, row_number() OVER (ORDER BY tgname) pos
      FROM pg_trigger WHERE tgrelid='public.bookings'::regclass
       AND NOT tgisinternal AND (tgtype & 2) = 2
  ) t WHERE tgname = 'populate_busy_interval_trigger';

  IF v_cap_pos IS NULL OR v_pop_pos IS NULL THEN
    RAISE EXCEPTION 'FAILED: a required trigger is missing (capacity=%, populate=%)', v_cap_pos, v_pop_pos;
  END IF;
  IF v_cap_pos <= v_pop_pos THEN
    RAISE EXCEPTION 'FAILED: capacity still fires at % before populate at % -- the check stays dead',
      v_cap_pos, v_pop_pos;
  END IF;

  -- The duplicate pair must be gone.
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgrelid='public.bookings'::regclass
              AND tgname IN ('calculate_busy_to','calculate_busy_to_trigger')) THEN
    RAISE EXCEPTION 'FAILED: a duplicate busy_to trigger survived and will overwrite the emergency SLA window';
  END IF;

  -- The flag must be writable on an unpriced booking.
  IF NOT ('needs_reassignment'::booking_status = ANY (ARRAY['draft','submitted','provider_viewed',
            'needs_reassignment','cancelled_customer','cancelled_provider']::booking_status[])) THEN
    RAISE EXCEPTION 'FAILED: needs_reassignment is still not exempt from the pricing snapshot requirement';
  END IF;

  -- The flag must not be a dead end.
  IF (SELECT count(*) FROM booking_state_transitions
       WHERE from_status = 'needs_reassignment' AND allowed) < 4 THEN
    RAISE EXCEPTION 'FAILED: a flagged booking has no way out';
  END IF;

  -- NULL status must be impossible.
  IF (SELECT is_nullable FROM information_schema.columns
       WHERE table_schema='public' AND table_name='bookings' AND column_name='status') <> 'NO' THEN
    RAISE EXCEPTION 'FAILED: bookings.status is still nullable';
  END IF;

  RAISE NOTICE 'Capacity enforcement live: fires after the interval it needs, flag writable and escapable, NULL status impossible.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   ALTER TABLE public.bookings ALTER COLUMN status DROP NOT NULL;
--   DELETE FROM public.booking_state_transitions WHERE from_status = 'needs_reassignment';
--   ALTER TABLE public.bookings DROP CONSTRAINT pricing_snapshot_required_after_confirmation;
--   ALTER TABLE public.bookings ADD CONSTRAINT pricing_snapshot_required_after_confirmation
--     CHECK (status = ANY (ARRAY['draft','submitted','provider_viewed',
--            'cancelled_customer','cancelled_provider']::booking_status[])
--            OR pricing_snapshot IS NOT NULL);
--   DROP TRIGGER zz_enforce_provider_capacity ON public.bookings;
--   CREATE TRIGGER check_provider_capacity_trigger BEFORE INSERT OR UPDATE OF
--     provider_id, estimated_busy_from, estimated_busy_to, status ON public.bookings
--     FOR EACH ROW WHEN (...same...) EXECUTE FUNCTION enforce_provider_capacity_v2();
--   (The duplicate calculate_busy_to triggers are deliberately NOT restored.)
-- =============================================================================
