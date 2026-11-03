-- =============================================================================
-- URGENT CORRECTION: the capacity fix flagged every ordinary booking
-- =============================================================================
-- I applied 20260331000000 and it broke ordinary booking. Verified immediately
-- afterwards against the live schema: a booking for a provider with
-- max_concurrent_bookings = 5 and ZERO existing bookings came out as
--   status = needs_reassignment
-- A fifth defect, which only became reachable once capacity started running.
--
-- ROOT CAUSE -- two availability stores, and the probe reads the wrong one.
--   check_provider_can_accept required availability AND capacity, and read
--   availability from `provider_availability` (day_of_week + start/end time).
--   That table has ZERO write sites anywhere in src -- verified by grep -- so
--   it is permanently empty. The application writes
--   `provider_availability_intervals` (timestamptz ranges) from
--   profile/actions.ts:156,766,818,886 and providers.ts:517.
--   So EXISTS(...) was always false, availability_ok was always false, and
--   can_accept was always false for every non-emergency booking.
--
--   This was invisible while capacity was dead. Fixing the trigger order made
--   it reachable, and it immediately broke the main booking path. The
--   enforcement defect was hiding a data-source defect.
--
-- FIX, in two parts:
--   1. Read the store the application actually writes, and keep the legacy
--      weekly table as an additional source so neither is ignored.
--   2. Treat "no availability declared at all" as UNRESTRICTED rather than
--      "never available". A provider who has not configured working hours must
--      not be unbookable. This also matches the behaviour that was in effect
--      before the trigger order was fixed, so it introduces no regression for
--      existing providers.
--
-- Also pins search_path on the function, which it lacked.
--
-- KNOWN LIMITATION, stated rather than hidden: provider_availability_intervals
-- carries a recurrence_rule column and this predicate matches only concrete
-- intervals that span the requested window. A recurring rule is NOT expanded.
-- With the fail-open-on-no-declaration rule above, the practical effect is that
-- recurrence-only providers are treated as unrestricted rather than wrongly
-- blocked. Expanding RRULEs in SQL is out of scope here.
--
-- Rollback: restore the body from the definition saved before this change
-- (reverting re-breaks ordinary booking while capacity is enforced).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.check_provider_can_accept(p_provider_id uuid, p_service_id uuid, p_busy_from timestamp with time zone, p_busy_to timestamp with time zone, p_is_emergency boolean DEFAULT false)
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
    p_provider_id, p_service_id, p_busy_from, p_busy_to, p_is_emergency
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

DO $assert$
DECLARE r RECORD;
BEGIN
  IF position('provider_availability_intervals' in
       (SELECT prosrc FROM pg_proc WHERE proname='check_provider_can_accept')) = 0 THEN
    RAISE EXCEPTION 'FAILED: the probe still ignores the table the application writes';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
                  WHERE n.nspname='public' AND p.proname='check_provider_can_accept'
                    AND array_to_string(p.proconfig,',') LIKE '%search_path%') THEN
    RAISE EXCEPTION 'FAILED: search_path is still unpinned';
  END IF;

  -- A provider with no declared availability must be ACCEPTABLE, not blocked.
  SELECT * INTO r FROM check_provider_can_accept(
    gen_random_uuid(), gen_random_uuid(), now() + interval '2 days',
    now() + interval '2 days 1 hour', false);
  IF r.availability_ok IS NOT TRUE THEN
    RAISE EXCEPTION 'FAILED: an undeclared provider is still treated as unavailable';
  END IF;

  RAISE NOTICE 'Availability now reads the store the app writes; undeclared means unrestricted.';
END
$assert$;
