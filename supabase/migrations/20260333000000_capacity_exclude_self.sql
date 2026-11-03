-- =============================================================================
-- Capacity counted a booking against its own provider's limit
-- =============================================================================
-- A SIXTH defect in this chain, invisible until capacity started running.
--
-- check_provider_capacity_locked counts overlapping bookings for the provider
-- with NO exclusion of the row being written, so on any UPDATE a booking is
-- counted against the very limit it is being checked against.
--
-- Observed while testing the capacity fix: a provider with
-- max_concurrent_bookings = 1 and exactly ONE booking -- its first -- had that
-- booking flagged needs_reassignment the moment its status moved to
-- 'confirmed', because the probe counted the row it was validating. The test
-- then died on "Illegal transition: needs_reassignment -> scheduled", which is
-- how the off-by-one surfaced. Generally: the Nth concurrent booking can never
-- change status, for any N.
--
-- FIX: an optional p_exclude_booking_id threaded from the trigger through
-- check_provider_can_accept into check_provider_capacity_locked and applied to
-- BOTH count branches (service-scoped and provider-wide). It defaults to NULL,
-- so enforce_serializable_for_capacity, create_booking_with_capacity_check and
-- check_provider_capacity_with_units are unchanged and unaffected.
--
-- Rollback: restore both bodies without the parameter (restores the off-by-one).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_provider_capacity_locked(p_provider_id uuid, p_service_id uuid, p_busy_from timestamp with time zone, p_busy_to timestamp with time zone, p_is_emergency boolean DEFAULT false, p_exclude_booking_id uuid DEFAULT NULL)
 RETURNS TABLE(capacity_available boolean, current_bookings integer, max_bookings integer, available_slots integer, reason text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_provider_global_max INTEGER;
  v_emergency_reserved  INTEGER;
  v_service_max         INTEGER;
  v_concurrent_units    INTEGER;
  v_capacity_scope      capacity_scope_type;
  v_current_count       INTEGER;
  v_effective_max       INTEGER;
  v_probe               tstzrange;
BEGIN
  -- Guard: without a provider or a start instant there is no capacity subject.
  IF p_provider_id IS NULL OR p_busy_from IS NULL THEN
    RETURN QUERY SELECT TRUE, 0, 0, 0, 'No capacity subject (provider or interval missing)'::TEXT;
    RETURN;
  END IF;

  -- Normalise the probe interval. '[]' matches the semantics used by
  -- idx_bookings_busy_interval and by check_capacity_availability().
  v_probe := tstzrange(p_busy_from, COALESCE(p_busy_to, p_busy_from + INTERVAL '24 hours'), '[]');

  -- ── CONCURRENCY CONTROL ───────────────────────────────────────────────────
  -- Transaction-scoped advisory lock. Serialises the read-count-then-write
  -- sequence for THIS capacity subject only; bookings for other providers (or
  -- other services, when scope is per-service) proceed in parallel.
  -- Released automatically at COMMIT/ROLLBACK — no unlock, no 40001 retries.
  --
  -- hashtextextended (not hashtext) for a 64-bit key: pg_advisory_xact_lock's
  -- single-argument form takes bigint, and a 32-bit hashtext widened to bigint
  -- collides far more often.
  --
  -- Read capacity_scope FIRST so the lock key matches the scope we will count
  -- at. Mismatched key granularity would leave a race open.
  SELECT ps.capacity_scope, ps.concurrent_units, ps.max_concurrent_bookings
    INTO v_capacity_scope, v_concurrent_units, v_service_max
  FROM provider_services ps
  WHERE ps.provider_id = p_provider_id
    AND ps.service_id  = p_service_id
    AND ps.is_active
  LIMIT 1;

  IF v_capacity_scope = 'provider_wide' THEN
    -- One lock per provider: all services contend.
    PERFORM pg_advisory_xact_lock(hashtextextended(p_provider_id::text, 0));
  ELSE
    -- One lock per (provider, service).
    PERFORM pg_advisory_xact_lock(
      hashtextextended(p_provider_id::text || '_' || COALESCE(p_service_id::text, ''), 0)
    );
  END IF;

  -- Provider-level ceiling and emergency reservation.
  SELECT sp.max_concurrent_bookings, sp.emergency_capacity_reserved
    INTO v_provider_global_max, v_emergency_reserved
  FROM service_providers sp
  WHERE sp.id = p_provider_id;

  -- Effective ceiling: the most specific configured value wins.
  v_effective_max := COALESCE(v_concurrent_units, v_service_max, v_provider_global_max, 1);

  -- Emergency bookings may dip into the reserved headroom.
  IF p_is_emergency THEN
    v_effective_max := v_effective_max + COALESCE(v_emergency_reserved, 0);
  END IF;

  -- ── OVERLAP COUNT ─────────────────────────────────────────────────────────
  -- NOTE: estimated_busy_from / estimated_busy_to — the post-rename columns.
  -- Uses idx_bookings_busy_interval (GiST) for the && probe.
  IF v_capacity_scope = 'provider_wide' THEN
    SELECT COUNT(*) INTO v_current_count
    FROM bookings b
    WHERE b.provider_id = p_provider_id
      AND b.status IN ('submitted','provider_viewed','confirmed','scheduled','in_progress')
      -- Do NOT count the booking currently being written against its own
      -- provider's limit. Without this a booking counts ITSELF on every
      -- UPDATE, so the Nth concurrent booking can never change status.
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND b.estimated_busy_from IS NOT NULL
      AND b.estimated_busy_to   IS NOT NULL
      AND tstzrange(b.estimated_busy_from, b.estimated_busy_to, '[]') && v_probe;
  ELSE
    SELECT COUNT(*) INTO v_current_count
    FROM bookings b
    WHERE b.provider_id = p_provider_id
      AND b.service_id  = p_service_id
      AND b.status IN ('submitted','provider_viewed','confirmed','scheduled','in_progress')
      -- Do NOT count the booking currently being written against its own
      -- provider's limit. Without this a booking counts ITSELF on every
      -- UPDATE, so the Nth concurrent booking can never change status.
      AND (p_exclude_booking_id IS NULL OR b.id <> p_exclude_booking_id)
      AND b.estimated_busy_from IS NOT NULL
      AND b.estimated_busy_to   IS NOT NULL
      AND tstzrange(b.estimated_busy_from, b.estimated_busy_to, '[]') && v_probe;
  END IF;

  IF v_current_count < v_effective_max THEN
    RETURN QUERY SELECT
      TRUE,
      v_current_count,
      v_effective_max,
      v_effective_max - v_current_count,
      FORMAT('%s/%s concurrent units available',
             v_effective_max - v_current_count, v_effective_max)::TEXT;
  ELSE
    RETURN QUERY SELECT
      FALSE,
      v_current_count,
      v_effective_max,
      0,
      FORMAT('All %s concurrent units occupied (%s overlapping bookings)',
             v_effective_max, v_current_count)::TEXT;
  END IF;
END;
$function$;

CREATE OR REPLACE FUNCTION public.check_provider_can_accept(p_provider_id uuid, p_service_id uuid, p_busy_from timestamp with time zone, p_busy_to timestamp with time zone, p_is_emergency boolean DEFAULT false, p_exclude_booking_id uuid DEFAULT NULL)
 RETURNS TABLE(can_accept boolean, reason text, availability_ok boolean, capacity_ok boolean)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'pg_temp'
AS $function$
DECLARE
  v_availability_ok BOOLEAN;
  v_has_declared_availability BOOLEAN;
  v_capacity_result RECORD;
BEGIN
  -- Check availability
  IF p_is_emergency THEN
    v_availability_ok := TRUE; -- Emergencies bypass availability
  ELSE
    -- Has this provider declared availability AT ALL, in either store?
    SELECT
      EXISTS (SELECT 1 FROM provider_availability_intervals
               WHERE provider_id = p_provider_id AND is_active = TRUE)
      OR
      EXISTS (SELECT 1 FROM provider_availability
               WHERE provider_id = p_provider_id AND is_active = TRUE)
    INTO v_has_declared_availability;

    IF NOT v_has_declared_availability THEN
      -- NOT CONFIGURED IS NOT THE SAME AS NEVER AVAILABLE. A provider who has
      -- not set working hours must not become unbookable; treating silence as
      -- "unavailable" flags every one of their bookings for reassignment.
      v_availability_ok := TRUE;
    ELSE
      -- Declared, so respect it. Check BOTH stores: the application writes
      -- provider_availability_intervals (profile/actions.ts:156,766,818,886 and
      -- providers.ts:517), while this function previously read only
      -- provider_availability, which has ZERO write sites anywhere in src.
      SELECT
        EXISTS (
          SELECT 1 FROM provider_availability_intervals
          WHERE provider_id = p_provider_id
            AND is_active = TRUE
            AND available_from <= p_busy_from
            AND available_to   >= p_busy_to
        )
        OR
        EXISTS (
          SELECT 1 FROM provider_availability
          WHERE provider_id = p_provider_id
            AND is_active = TRUE
            AND day_of_week = EXTRACT(DOW FROM p_busy_from)
            AND start_time <= p_busy_from::TIME
            AND end_time   >= p_busy_to::TIME
        )
      INTO v_availability_ok;
    END IF;
  END IF;

  -- Check capacity
  SELECT * INTO v_capacity_result
  FROM check_provider_capacity_locked(
    p_provider_id, p_service_id, p_busy_from, p_busy_to, p_is_emergency,
    p_exclude_booking_id
  );

  -- Both must pass
  IF v_availability_ok AND v_capacity_result.capacity_available THEN
    RETURN QUERY SELECT TRUE, 'Available'::TEXT, TRUE, TRUE;
  ELSIF NOT v_availability_ok THEN
    RETURN QUERY SELECT FALSE, 
      FORMAT('Not available %s-%s', p_busy_from::TIME, p_busy_to::TIME)::TEXT,
      FALSE, v_capacity_result.capacity_available;
  ELSE
    RETURN QUERY SELECT FALSE, v_capacity_result.reason, TRUE, FALSE;
  END IF;
END;
$function$;

-- The trigger must pass the row's own id, or the fix is inert.
CREATE OR REPLACE FUNCTION public.enforce_provider_capacity_v2()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public', 'pg_temp'
AS $fn$
DECLARE
  v_check_result RECORD;
  v_is_emergency BOOLEAN;
  v_user_id      UUID;
BEGIN
  IF NEW.provider_id IS NULL OR NEW.estimated_busy_from IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.status IN ('completed','customer_confirmed','cancelled_customer','cancelled_provider') THEN
    RETURN NEW;
  END IF;

  v_is_emergency := NEW.booking_flow_type = 'emergency';

  SELECT * INTO v_check_result
  FROM check_provider_can_accept(
    NEW.provider_id,
    NEW.service_id,
    NEW.estimated_busy_from,
    COALESCE(NEW.estimated_busy_to, NEW.estimated_busy_from + INTERVAL '24 hours'),
    v_is_emergency,
    NEW.id   -- exclude THIS booking from the count of what occupies the slot
  );

  IF v_check_result IS NULL OR v_check_result.can_accept IS NOT FALSE THEN
    RETURN NEW;
  END IF;

  NEW.status := 'needs_reassignment';
  NEW.provider_notes := COALESCE(NEW.provider_notes || ' | ', '')
                        || 'CAPACITY: ' || COALESCE(v_check_result.reason, 'capacity unavailable');

  SELECT sp.user_id INTO v_user_id
  FROM service_providers sp WHERE sp.id = NEW.provider_id;

  IF v_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (id, user_id, user_role, type, title, message, booking_id, created_at)
      VALUES (
        gen_random_uuid(), v_user_id, 'provider', 'capacity_overflow',
        'Booking Flagged - Capacity Full',
        FORMAT('Capacity full. Booking #%s flagged for reassignment. Reason: %s',
               LEFT(NEW.id::TEXT, 8), COALESCE(v_check_result.reason, 'capacity unavailable')),
        NEW.id, NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'enforce_provider_capacity_v2: notification insert failed for booking %: %',
        NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$fn$;


-- -----------------------------------------------------------------------------
-- Drop the OLD 5-argument overloads
-- -----------------------------------------------------------------------------
-- Adding a parameter with a DEFAULT creates a NEW function rather than
-- replacing the old one, so without this both signatures exist and any caller
-- passing five arguments binds to the EXACT 5-arg match -- the one that still
-- counts a booking against its own limit. The fix would be silently inert for
-- every existing caller.
--
-- Dropping them is safe: the 6-arg versions accept five arguments via the
-- default, so enforce_serializable_for_capacity,
-- create_booking_with_capacity_check and check_provider_capacity_with_units
-- continue to resolve, now to the corrected implementation.
DROP FUNCTION IF EXISTS public.check_provider_can_accept(uuid, uuid, timestamptz, timestamptz, boolean);
DROP FUNCTION IF EXISTS public.check_provider_capacity_locked(uuid, uuid, timestamptz, timestamptz, boolean);

DO $assert$
BEGIN
  IF position('p_exclude_booking_id' in
       (SELECT prosrc FROM pg_proc WHERE oid = 'public.check_provider_capacity_locked(uuid,uuid,timestamptz,timestamptz,boolean,uuid)'::regprocedure)) = 0 THEN
    RAISE EXCEPTION 'FAILED: the exclusion is not in check_provider_capacity_locked';
  END IF;

  IF (SELECT count(*) FROM regexp_matches(
        (SELECT prosrc FROM pg_proc WHERE oid = 'public.check_provider_capacity_locked(uuid,uuid,timestamptz,timestamptz,boolean,uuid)'::regprocedure),
        'p_exclude_booking_id IS NULL OR', 'g')) < 2 THEN
    RAISE EXCEPTION 'FAILED: the exclusion is applied to fewer than both count branches';
  END IF;

  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
       WHERE n.nspname='public' AND p.proname IN ('check_provider_can_accept','check_provider_capacity_locked')) <> 2 THEN
    RAISE EXCEPTION 'FAILED: expected exactly one signature each, found % (old overloads survived)',
      (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
        WHERE n.nspname='public' AND p.proname IN ('check_provider_can_accept','check_provider_capacity_locked'));
  END IF;

  IF position('NEW.id' in (SELECT prosrc FROM pg_proc WHERE proname='enforce_provider_capacity_v2')) = 0 THEN
    RAISE EXCEPTION 'FAILED: the trigger does not pass its own id, so the fix is inert';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                  WHERE n.nspname='public' AND p.proname='enforce_provider_capacity_v2'
                    AND array_to_string(p.proconfig,',') LIKE '%search_path%') THEN
    RAISE EXCEPTION 'FAILED: enforce_provider_capacity_v2 lost its pinned search_path';
  END IF;

  RAISE NOTICE 'Capacity no longer counts a booking against its own limit.';
END
$assert$;
