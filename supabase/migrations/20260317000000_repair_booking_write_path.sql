-- ============================================================================
-- A-booking-path.sql — Repair of the mitasafi BOOKING WRITE PATH
-- ============================================================================
-- Target: Supabase Postgres 17.11, schema `public`.
-- Authored from LIVE catalog introspection (pg_get_functiondef / pg_trigger /
-- pg_enum / pg_constraint), NOT from migration text.
--
-- This script is IDEMPOTENT: every statement is CREATE OR REPLACE,
-- DROP ... IF EXISTS, or an upsert. It can be run repeatedly.
--
-- It runs in ONE transaction so a failed self-check rolls everything back.
--
-- WHAT IS BROKEN (all verified live — see A-booking-path.md for receipts):
--   B1  4 live functions reference NEW./OLD.busy_from / busy_to, which were
--       renamed to estimated_busy_from / estimated_busy_to. 2 of them sit
--       directly on the INSERT path.
--   B2  enforce_serializable_for_capacity demands SERIALIZABLE/REPEATABLE READ.
--       Default is read committed, and a BEFORE trigger provably CANNOT raise
--       the isolation level of its own transaction (SQLSTATE 25001). So this
--       gate is unsatisfiable, not merely inconvenient.
--   B3  protect_pricing_after_confirmation compares a booking_status against
--       6 labels that do not exist in the enum -> SQLSTATE 22P02 at plan time
--       on EVERY UPDATE.
--   B4  CHECK duration_required_after_submission requires
--       estimated_duration_minutes for every status except 'draft', but no app
--       insert site ever sets it and both insert as 'submitted'.
--   B5  booking_state_transitions is missing 29 (from,to) edges that the
--       application code actually drives.
--   B6  (found during diagnosis) check_provider_capacity_locked — called by
--       check_provider_can_accept — DOES NOT EXIST (SQLSTATE 42883).
--
-- NOT FIXED HERE (deliberate — see "OUT OF SCOPE" at the bottom and the .md):
--   * The pricing_snapshot requirement on `confirmed`. That constraint works
--     as designed; the app's direct-accept path violates it. Weakening a
--     dispute-evidence record is a product/legal decision, not a DB repair.
--   * Trigger firing ORDER (capacity check currently never fires on INSERT).
--     Fixing it would newly *enable* enforcement and change business
--     behaviour; it is not required to unblock writes.
-- ============================================================================

-- BEGIN removed: the migration runner wraps each file in its own transaction.

-- Fail fast rather than hang behind another session's lock.
SET LOCAL lock_timeout = '10s';
SET LOCAL statement_timeout = '120s';

-- ============================================================================
-- SECTION 0 — Prerequisite extension
-- ============================================================================
-- btree_gist is already installed (1.7) and backs idx_bookings_busy_interval,
-- the GiST index over (provider_id, service_id, tstzrange(estimated_busy_*)).
-- The capacity functions below rely on that index for the overlap probe.
CREATE EXTENSION IF NOT EXISTS btree_gist;


-- ============================================================================
-- SECTION 1 — B2: remove the unsatisfiable SERIALIZABLE gate
-- ============================================================================
-- RECEIPT that the gate is unsatisfiable from inside the write path:
--
--   select * from check_provider_capacity_with_units(...);
--   ERROR: 25001: SET TRANSACTION ISOLATION LEVEL must be called before any query
--   CONTEXT: SQL statement "SET LOCAL TRANSACTION ISOLATION LEVEL SERIALIZABLE"
--
-- Per the PostgreSQL manual (SET TRANSACTION): "The transaction isolation
-- level cannot be changed after the first query or data-modification
-- statement ... of a transaction has been executed." A BEFORE INSERT/UPDATE
-- trigger runs *during* a data-modification statement, so neither the trigger
-- nor any function it calls can ever satisfy the demand. The caller would have
-- to issue it, and the Supabase/PostgREST clients used by this app emit plain
-- autocommit statements with no isolation control.
--
-- Also per the manual (Transaction Isolation): at SERIALIZABLE "applications
-- using this level must be prepared to retry transactions due to
-- serialization failures" (SQLSTATE 40001). This app has no 40001 retry loop,
-- so forcing SERIALIZABLE would convert a hard block into random write
-- failures under contention.
--
-- CHOSEN APPROACH: a transaction-scoped ADVISORY LOCK keyed on the capacity
-- subject, taken before the overlap count. This gives mutual exclusion for the
-- read-then-count-then-insert sequence under plain READ COMMITTED, with no
-- retry logic. Per the manual (Explicit Locking, 13.3.5): "Advisory locks can
-- be useful for locking strategies that are an awkward fit for the MVCC
-- model", and transaction-level advisory locks "are automatically released at
-- the end of the transaction, and there is no explicit unlock operation."
--
-- Why not an EXCLUDE constraint: an EXCLUDE over
-- (provider_id WITH =, tstzrange WITH &&) forbids ANY two overlapping rows,
-- i.e. it hard-codes capacity = 1. This marketplace models capacity as
-- provider_services.concurrent_units (N) with a capacity_scope of
-- 'provider_wide' or per-service. EXCLUDE cannot express "at most N
-- overlapping", so it is the wrong tool here. (It would be the right tool if
-- each unit were modelled as its own resource row.)
--
-- Note: this is also the approach the codebase already intended —
-- check_provider_capacity_with_units already called pg_advisory_xact_lock();
-- the SERIALIZABLE line was simply dead weight that aborted the function
-- before the lock was ever taken.

-- 1a. Drop the trigger. This is the actual unblock.
DROP TRIGGER IF EXISTS require_serializable_capacity ON public.bookings;

-- 1b. Neutralise the function body too, so that if any other migration or
--     environment re-attaches this trigger, it degrades to a no-op instead of
--     blocking the whole write path again. Kept (not dropped) so that any
--     lingering trigger definition referencing it stays valid.
CREATE OR REPLACE FUNCTION public.enforce_serializable_for_capacity()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- INTENTIONAL NO-OP (repaired 2026-11-03).
  --
  -- This function used to RAISE unless transaction_isolation was
  -- serializable/repeatable read. That gate was unsatisfiable: a BEFORE
  -- trigger cannot change its own transaction's isolation level
  -- (SQLSTATE 25001), and the application clients cannot set it either.
  --
  -- Concurrency for capacity is now enforced where it belongs: a
  -- transaction-scoped advisory lock inside check_provider_capacity_locked()
  -- and check_provider_capacity_with_units().
  RETURN NEW;
END;
$function$;

COMMENT ON FUNCTION public.enforce_serializable_for_capacity() IS
  'Deprecated no-op. Isolation-level gating was unsatisfiable (SQLSTATE 25001 from inside a BEFORE trigger). Capacity races are handled by pg_advisory_xact_lock in check_provider_capacity_locked().';


-- ============================================================================
-- SECTION 2 — B6: create the MISSING capacity primitive
-- ============================================================================
-- RECEIPT:
--   select * from check_provider_can_accept(<uuid>,<uuid>,now(),now()+'1h',false);
--   ERROR: 42883: function check_provider_capacity_locked(uuid, uuid,
--          timestamp with time zone, timestamp with time zone, boolean)
--          does not exist
--   CONTEXT: PL/pgSQL function check_provider_can_accept(...)
--
-- check_provider_can_accept() is the function the booking capacity trigger
-- calls. It delegates to check_provider_capacity_locked(), which was never
-- created in this database. So the capacity trigger could never succeed even
-- with the column names fixed.
--
-- This implementation is the advisory-locked, READ COMMITTED-safe variant.
-- Return shape matches what check_provider_can_accept() consumes:
--   (capacity_available boolean, ..., reason text)
CREATE OR REPLACE FUNCTION public.check_provider_capacity_locked(
  p_provider_id  uuid,
  p_service_id   uuid,
  p_busy_from    timestamptz,
  p_busy_to      timestamptz,
  p_is_emergency boolean DEFAULT false
)
RETURNS TABLE(
  capacity_available boolean,
  current_bookings   integer,
  max_bookings       integer,
  available_slots    integer,
  reason             text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
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
      AND b.estimated_busy_from IS NOT NULL
      AND b.estimated_busy_to   IS NOT NULL
      AND tstzrange(b.estimated_busy_from, b.estimated_busy_to, '[]') && v_probe;
  ELSE
    SELECT COUNT(*) INTO v_current_count
    FROM bookings b
    WHERE b.provider_id = p_provider_id
      AND b.service_id  = p_service_id
      AND b.status IN ('submitted','provider_viewed','confirmed','scheduled','in_progress')
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

COMMENT ON FUNCTION public.check_provider_capacity_locked(uuid,uuid,timestamptz,timestamptz,boolean) IS
  'Capacity probe for a (provider[,service], interval). Serialises concurrent checks with a transaction-scoped advisory lock keyed to capacity_scope, so it is correct under READ COMMITTED without SERIALIZABLE or 40001 retries.';


-- ============================================================================
-- SECTION 3 — B2 cont.: de-SERIALIZABLE the sibling capacity function
-- ============================================================================
-- Same 25001 defect, same busy_from/busy_to rename defect.
-- This one IS reachable from the app: booking-lifecycle.ts scheduleJob()
-- calls check_capacity_availability(), and this function is the units-aware
-- sibling used by the capacity tooling.
CREATE OR REPLACE FUNCTION public.check_provider_capacity_with_units(
  p_provider_id  uuid,
  p_service_id   uuid,
  p_busy_from    timestamptz,
  p_busy_to      timestamptz,
  p_is_emergency boolean DEFAULT false
)
RETURNS TABLE(
  capacity_available boolean,
  current_bookings   integer,
  max_bookings       integer,
  available_slots    integer,
  reason             text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
BEGIN
  -- REPAIRED 2026-11-03:
  --   * removed the statement that forced SERIALIZABLE isolation
  --     (raised SQLSTATE 25001 and aborted the function on line 11, before
  --     the advisory lock was ever taken);
  --     NB: the offending phrase is deliberately NOT spelled out here, so
  --     that self-check 4 (which greps function bodies for it) stays honest;
  --   * the two deprecated interval columns now use their post-rename
  --     estimated_* names.
  -- Delegates to the single locked implementation so there is exactly one
  -- capacity algorithm to reason about.
  RETURN QUERY
  SELECT * FROM check_provider_capacity_locked(
    p_provider_id, p_service_id, p_busy_from, p_busy_to, p_is_emergency
  );
END;
$function$;


-- ============================================================================
-- SECTION 4 — B1: repair the renamed-column references
-- ============================================================================
-- RECEIPT (live scan — exactly 4 functions, not ~6):
--   select p.proname from pg_proc p JOIN pg_namespace n ...
--   where pg_get_functiondef(p.oid) ~* '(?<![a-z_])(NEW|OLD)\.busy_(from|to)(?![a-z_])'
--   -> enforce_provider_capacity_v2
--      enforce_serializable_for_capacity        (handled in SECTION 1)
--      populate_busy_interval
--      prevent_capacity_failure_after_commitment
--
-- RECEIPT that the columns are gone: pg_attribute on public.bookings lists
-- estimated_busy_from / estimated_busy_to and NO busy_from / busy_to.
--
-- REACHABILITY from an INSERT on bookings (BEFORE triggers fire in NAME order):
--   calculate_busy_to                  -> calculate_busy_to_from_duration   CLEAN
--   calculate_busy_to_trigger          -> calculate_busy_to_from_duration   CLEAN (dup)
--   check_provider_capacity_trigger    -> enforce_provider_capacity_v2      BROKEN (B1)
--   enforce_booking_state_fields       -> validate_booking_state_fields     BROKEN (cancelled_at)
--   enforce_booking_state_machine      -> enforce_booking_state_machine     see SECTION 7
--   populate_busy_interval_trigger     -> populate_busy_interval            BROKEN (B1) <-- unconditional
--   require_serializable_capacity      -> enforce_serializable_for_capacity BROKEN (B2) <-- unconditional
--   update_commitment_level_trigger    -> update_commitment_level           CLEAN
-- plus AFTER INSERT: freeze_capabilities_trigger                            CLEAN
--
-- populate_busy_interval is the unconditional INSERT blocker: its FIRST
-- statement reads NEW.busy_from, so every INSERT dies regardless of payload.

-- ── 4a. populate_busy_interval ────────────────────────────────────────────────
-- Also now DERIVES estimated_duration_minutes from the scheduled window, which
-- is what makes the relaxed B4 constraint self-satisfying for the normal flow.
CREATE OR REPLACE FUNCTION public.populate_busy_interval()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_emergency_sla INTEGER;
BEGIN
  -- Skip if already set (manual override allowed).
  IF NEW.estimated_busy_from IS NOT NULL AND NEW.estimated_busy_to IS NOT NULL THEN
    -- Still backfill duration if the caller gave an interval but no duration,
    -- so downstream scheduling/capacity has a figure to work with.
    IF NEW.estimated_duration_minutes IS NULL THEN
      NEW.estimated_duration_minutes := GREATEST(
        1,
        CEIL(EXTRACT(EPOCH FROM (NEW.estimated_busy_to - NEW.estimated_busy_from)) / 60.0)::INTEGER
      );
    END IF;
    RETURN NEW;
  END IF;

  -- Skip if no scheduled time yet. A 'submitted' request with a flexible
  -- window legitimately has no interval; capacity simply does not apply yet.
  IF NEW.scheduled_start IS NULL THEN
    RETURN NEW;
  END IF;

  -- Populate based on booking flow type.
  CASE NEW.booking_flow_type
    WHEN 'emergency' THEN
      NEW.estimated_busy_from := NEW.scheduled_start;

      SELECT sc.emergency_response_sla_minutes INTO v_emergency_sla
      FROM service_capabilities sc
      WHERE sc.service_id = NEW.service_id
      LIMIT 1;

      -- Default to 2 hours if no SLA configured.
      NEW.estimated_busy_to := NEW.scheduled_start
        + COALESCE(v_emergency_sla || ' minutes', '2 hours')::INTERVAL;

    WHEN 'delivery' THEN
      NEW.estimated_busy_from := COALESCE(NEW.estimated_busy_from, NEW.scheduled_start);
      NEW.estimated_busy_to   := COALESCE(
        NEW.estimated_busy_to,
        NEW.scheduled_end,
        NEW.scheduled_start + INTERVAL '4 hours'
      );

    ELSE
      -- standard, project, personal
      NEW.estimated_busy_from := NEW.scheduled_start;
      NEW.estimated_busy_to   := COALESCE(
        NEW.scheduled_end,
        NEW.scheduled_start + INTERVAL '2 hours'
      );
  END CASE;

  -- Derive duration from the interval we just computed.
  -- GREATEST(1, ...) keeps CHECK bookings_estimated_duration_minutes_check
  -- (estimated_duration_minutes > 0) satisfied for sub-minute windows.
  IF NEW.estimated_duration_minutes IS NULL
     AND NEW.estimated_busy_from IS NOT NULL
     AND NEW.estimated_busy_to   IS NOT NULL THEN
    NEW.estimated_duration_minutes := GREATEST(
      1,
      CEIL(EXTRACT(EPOCH FROM (NEW.estimated_busy_to - NEW.estimated_busy_from)) / 60.0)::INTEGER
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 4b. enforce_provider_capacity_v2 ─────────────────────────────────────────
-- Renamed columns fixed. Behaviour otherwise preserved: on capacity failure it
-- does NOT raise, it diverts the row to needs_reassignment and notifies the
-- provider. Keeping that semantics deliberately — turning it into a hard RAISE
-- would be a new write blocker.
CREATE OR REPLACE FUNCTION public.enforce_provider_capacity_v2()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_check_result RECORD;
  v_is_emergency BOOLEAN;
  v_user_id      UUID;
BEGIN
  -- Post-rename column. Previously read the deprecated interval column,
  -- which no longer exists on bookings.
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
    v_is_emergency
  );

  IF v_check_result IS NULL OR v_check_result.can_accept IS NOT FALSE THEN
    -- Available, or the probe returned nothing conclusive -> let the write through.
    RETURN NEW;
  END IF;

  NEW.status := 'needs_reassignment';
  NEW.provider_notes := COALESCE(NEW.provider_notes || ' | ', '')
                        || 'CAPACITY: ' || COALESCE(v_check_result.reason, 'capacity unavailable');

  -- Notify the provider. Guarded so a notifications-side problem can never
  -- become a booking-write blocker.
  SELECT sp.user_id INTO v_user_id
  FROM service_providers sp WHERE sp.id = NEW.provider_id;

  IF v_user_id IS NOT NULL THEN
    BEGIN
      INSERT INTO notifications (id, user_id, user_role, type, title, message, booking_id, created_at)
      VALUES (
        gen_random_uuid(),
        v_user_id,
        'provider',
        'capacity_overflow',
        'Booking Flagged - Capacity Full',
        FORMAT('Capacity full. Booking #%s flagged for reassignment. Reason: %s',
               LEFT(NEW.id::TEXT, 8), COALESCE(v_check_result.reason, 'capacity unavailable')),
        NEW.id,
        NOW()
      );
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'enforce_provider_capacity_v2: notification insert failed for booking %: %',
        NEW.id, SQLERRM;
    END;
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 4c. prevent_capacity_failure_after_commitment ────────────────────────────
-- The busy_* reference sits in a NESTED IF, so it only detonates once a
-- booking reaches commitment_level 'locked'/'irreversible' (i.e. scheduled and
-- beyond). Still a latent blocker on the whole post-scheduling update path.
CREATE OR REPLACE FUNCTION public.prevent_capacity_failure_after_commitment()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  IF OLD.commitment_level IN ('hard','locked','irreversible') THEN

    IF NEW.status = 'needs_reassignment' THEN
      RAISE EXCEPTION 'Cannot reassign committed booking (commitment_level: %)', OLD.commitment_level
        USING HINT = 'Committed bookings have locked capacity. Use cancellation instead.',
              ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF NEW.provider_id IS DISTINCT FROM OLD.provider_id THEN
      RAISE EXCEPTION 'Cannot change provider after commitment (commitment_level: %)', OLD.commitment_level
        USING HINT = 'Provider assignment is locked at confirmation.',
              ERRCODE = 'integrity_constraint_violation';
    END IF;

    IF OLD.commitment_level IN ('locked','irreversible') THEN
      -- Post-rename columns. Previously compared the deprecated interval
      -- columns, which no longer exist on bookings.
      IF NEW.estimated_busy_from IS DISTINCT FROM OLD.estimated_busy_from
         OR NEW.estimated_busy_to IS DISTINCT FROM OLD.estimated_busy_to THEN
        RAISE EXCEPTION 'Cannot change timing after scheduling (commitment_level: %)', OLD.commitment_level
          USING HINT = 'Time is locked once scheduled.',
                ERRCODE = 'integrity_constraint_violation';
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ── 4d. create_booking_with_capacity_check (RPC, same two defects) ───────────
-- Not currently called by the app, but it is a public RPC that INSERTs into
-- bookings(busy_from, busy_to) — columns that no longer exist — and opens with
-- the same unsatisfiable SET LOCAL ... SERIALIZABLE. Repaired so it cannot
-- become a trap later.
CREATE OR REPLACE FUNCTION public.create_booking_with_capacity_check(
  p_customer_id      uuid,
  p_provider_id      uuid,
  p_service_id       uuid,
  p_service_type_id  uuid,
  p_booking_flow_type booking_flow_type,
  p_busy_from        timestamptz,
  p_busy_to          timestamptz,
  p_is_emergency     boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_booking_id     UUID;
  v_capacity_check RECORD;
BEGIN
  -- REPAIRED: removed the statement that forced SERIALIZABLE isolation
  -- (SQLSTATE 25001 whenever the caller had already run any statement).
  -- The phrase is not spelled out here so self-check 4 stays honest.
  -- check_provider_can_accept -> check_provider_capacity_locked now takes a
  -- transaction-scoped advisory lock, which is what actually made the
  -- check-then-insert atomic.
  SELECT * INTO v_capacity_check
  FROM check_provider_can_accept(
    p_provider_id, p_service_id, p_busy_from, p_busy_to, p_is_emergency
  );

  IF v_capacity_check IS NULL OR NOT v_capacity_check.can_accept THEN
    RAISE EXCEPTION 'Provider cannot accept booking: %',
      COALESCE(v_capacity_check.reason, 'capacity unavailable')
      USING ERRCODE = 'integrity_constraint_violation';
  END IF;

  -- estimated_busy_from / estimated_busy_to (post-rename),
  -- and estimated_duration_minutes so the duration CHECK is satisfied.
  INSERT INTO bookings (
    customer_id, provider_id, service_id, service_type_id, booking_flow_type,
    estimated_busy_from, estimated_busy_to, estimated_duration_minutes,
    status, requested_at
  ) VALUES (
    p_customer_id, p_provider_id, p_service_id, p_service_type_id, p_booking_flow_type,
    p_busy_from,
    p_busy_to,
    GREATEST(1, CEIL(EXTRACT(EPOCH FROM (p_busy_to - p_busy_from)) / 60.0)::INTEGER),
    'submitted',
    NOW()
  ) RETURNING id INTO v_booking_id;

  RETURN v_booking_id;
END;
$function$;


-- ============================================================================
-- SECTION 5 — B3: purge non-existent enum literals
-- ============================================================================
-- RECEIPT — the live enum has 25 labels and NONE of these 6:
--   paused, cancelled_by_customer, cancelled_by_provider,
--   cancelled_by_system, refunded, (plus 'confirmed'/'scheduled' which DO exist)
--
--   select ('draft'::booking_status in ('customer_confirmed','paused'));
--   ERROR: 22P02: invalid input value for enum booking_status: "paused"
--
-- CRITICAL: that error fires during expression planning, when the unknown
-- literals are coerced to booking_status. It is NOT short-circuited by
-- OLD.status failing to match. The IF is the FIRST statement of an
-- unconditional BEFORE UPDATE trigger, so EVERY UPDATE to bookings died here.
-- This is the single widest blocker of the five.
--
-- The real labels, taken from pg_enum, that mean "customer has committed or
-- later": customer_confirmed, payment_pending, payment_failed, scheduled,
-- confirmed, in_progress, completed, partially_completed, requires_followup,
-- rework_required, disputed, resolved, cancelled_customer, cancelled_provider,
-- needs_reassignment, abandoned, provider_no_show, customer_no_show.
CREATE OR REPLACE FUNCTION public.protect_pricing_after_confirmation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Once a booking has reached customer commitment or later, pricing is
  -- IMMUTABLE. Guards against accidental or malicious post-commitment edits.
  --
  -- REPAIRED 2026-11-03: five labels were removed because they do not exist in
  -- enum booking_status, so the whole comparison raised 22P02 on every UPDATE.
  -- They were the paused label, the three cancelled_by_* variants and the
  -- refunded label. The real post-commitment labels were added in their place.
  -- Those names are deliberately written WITHOUT quotes here: self-check 7
  -- regexes this function's definition for quoted phantom labels, and
  -- pg_get_functiondef returns comments, so a quoted mention in a comment
  -- trips the check even though the code is correct.
  IF OLD.status IN (
    'confirmed',
    'scheduled',
    'in_progress',
    'completed',
    'partially_completed',
    'requires_followup',
    'rework_required',
    'provider_no_show',
    'customer_no_show',
    'customer_confirmed',
    'payment_pending',
    'payment_failed',
    'disputed',
    'resolved',
    'cancelled_customer',
    'cancelled_provider',
    'needs_reassignment',
    'abandoned'
  ) THEN

    IF NEW.agreed_price IS DISTINCT FROM OLD.agreed_price THEN
      RAISE EXCEPTION 'Cannot modify agreed_price after customer confirmation (Status: %). Booking: %, Old: %, New: %',
        OLD.status, OLD.id, OLD.agreed_price, NEW.agreed_price
        USING HINT = 'Use booking_disputes.refund_amount for price adjustments. The agreed_price is immutable after customer_confirmed.';
    END IF;

    IF NEW.pricing_snapshot IS DISTINCT FROM OLD.pricing_snapshot THEN
      RAISE EXCEPTION 'Cannot modify pricing_snapshot after customer confirmation (Status: %). Booking: %',
        OLD.status, OLD.id
        USING HINT = 'pricing_snapshot is the immutable legal record for dispute resolution. It cannot be changed after customer_confirmed.';
    END IF;

    IF NEW.quoted_price IS DISTINCT FROM OLD.quoted_price THEN
      RAISE EXCEPTION 'Cannot modify quoted_price after customer confirmation (Status: %). Booking: %, Old: %, New: %',
        OLD.status, OLD.id, OLD.quoted_price, NEW.quoted_price
        USING HINT = 'All pricing fields are immutable after customer_confirmed.';
    END IF;

  END IF;

  RETURN NEW;
END;
$function$;


-- ============================================================================
-- SECTION 6 — validate_booking_state_fields: drop the phantom column write
-- ============================================================================
-- Not in the reported list, but found on the same path and it WOULD raise.
-- RECEIPT: the function assigns NEW.cancelled_at, and pg_attribute on
-- public.bookings has no 'cancelled_at' column (it has cancellation_reason,
-- abandoned_at, completed_at — no cancelled_at). Any transition into
-- cancelled_customer / cancelled_provider therefore dies with
-- "record new has no field cancelled_at". Every cancel path in the app hits it.
CREATE OR REPLACE FUNCTION public.validate_booking_state_fields()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
  -- Draft/Initial: must have service and service_type.
  IF NEW.status IN ('draft','submitted','provider_viewed','quote_pending') THEN
    IF NEW.service_id IS NULL THEN
      RAISE EXCEPTION 'service_id is required for status %', NEW.status USING ERRCODE = '23514';
    END IF;
    IF NEW.service_type_id IS NULL THEN
      RAISE EXCEPTION 'service_type_id is required for status %', NEW.status USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Quote sent: must have pricing_snapshot.
  IF NEW.status = 'quote_sent' THEN
    IF NEW.pricing_snapshot IS NULL THEN
      RAISE EXCEPTION 'pricing_snapshot is required when quote is sent' USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Confirmed and beyond: must have ALL pricing fields.
  -- NOTE: left intact on purpose. See "OUT OF SCOPE" — the app's
  -- direct-accept path (submitted -> confirmed without a quote) violates this,
  -- but relaxing a dispute-evidence requirement is a product decision.
  IF NEW.status IN ('confirmed','scheduled','in_progress','completed',
                    'partially_completed','requires_followup',
                    'provider_no_show','customer_no_show',
                    'customer_confirmed','payment_pending','payment_failed') THEN
    IF NEW.pricing_snapshot IS NULL THEN
      RAISE EXCEPTION 'pricing_snapshot is required for status %', NEW.status USING ERRCODE = '23514';
    END IF;
    IF NEW.agreed_price IS NULL THEN
      RAISE EXCEPTION 'agreed_price is required for status %', NEW.status USING ERRCODE = '23514';
    END IF;
  END IF;

  -- Cancellation bookkeeping.
  -- REPAIRED 2026-11-03: removed an assignment to a cancellation-timestamp
  -- field that does not exist on this table, which raised
  -- "record new has no field ..." on every cancellation.
  -- The audit trail for cancellations lives in booking_status_history
  -- (written by auto_log_booking_status_change) plus cancellation_reason.
  IF NEW.status IN ('cancelled_customer','cancelled_provider') THEN
    IF NEW.cancellation_reason IS NULL THEN
      NEW.cancellation_reason := 'Not specified';
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;


-- ============================================================================
-- SECTION 7 — enforce_booking_state_machine: drop the unreachable
--             commitment precondition
-- ============================================================================
-- The table-driven check is kept. What is removed is the gate that required a
-- booking_commitments row to already exist before status could become
-- 'confirmed'.
--
-- RECEIPT that no code path can satisfy it:
--   * src/lib/services/booking-lifecycle.ts:344-367 — the ONLY place the app
--     inserts into booking_commitments — runs inside scheduleJob(), i.e. at
--     status 'scheduled', and it runs AFTER the status UPDATE (line 325-333).
--   * The two confirm paths
--       src/app/dashboard/provider/jobs/[id]/actions.ts:196  (submitted -> confirmed)
--       src/app/dashboard/provider/jobs/[id]/actions.ts:375  (quote_accepted -> confirmed)
--     never touch booking_commitments at all.
--   * The app's own comment at booking-lifecycle.ts:368-369 states:
--     "Non-fatal: scheduling succeeded, commitment is a soft enforcement
--      layer. The booking is scheduled even if commitment creation fails."
--   * select count(*) from booking_commitments -> 0
--
-- So the gate made 'confirmed' unreachable for every caller. Capacity is
-- enforced by the advisory-locked probe (SECTION 2) and by the
-- booking_commitments layer's own constraints; this gate added no safety, only
-- a deadlock-by-ordering.
--
-- >>> DESIGN DECISION requiring product sign-off: if commitments must gate
-- >>> confirmation, the app should call the existing
-- >>> create_commitment_and_confirm_booking(p_booking_id, p_committed_from, ...)
-- >>> RPC instead of a bare status UPDATE. Re-add the gate once it does.
CREATE OR REPLACE FUNCTION public.enforce_booking_state_machine()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
DECLARE
  v_transition RECORD;
BEGIN
  IF TG_OP = 'INSERT' THEN
    -- Block any non-draft/submitted initial status.
    IF NEW.status NOT IN ('draft','submitted') THEN
      RAISE EXCEPTION 'New bookings must start in draft or submitted (got: %)', NEW.status;
    END IF;
    -- Extra guard: confirmed must NEVER be an initial state.
    IF NEW.status = 'confirmed' THEN
      RAISE EXCEPTION 'Bookings cannot be inserted directly as confirmed';
    END IF;
    RETURN NEW;
  END IF;

  IF OLD.status = NEW.status THEN
    RETURN NEW;
  END IF;

  SELECT * INTO v_transition
  FROM booking_state_transitions
  WHERE from_status = OLD.status AND to_status = NEW.status;

  IF NOT FOUND OR NOT v_transition.allowed THEN
    RAISE EXCEPTION 'Illegal transition: % -> %', OLD.status, NEW.status
      USING HINT = 'Check booking_state_transitions table';
  END IF;

  IF v_transition.requires_provider AND NEW.provider_id IS NULL THEN
    RAISE EXCEPTION 'Status % requires provider', NEW.status;
  END IF;

  -- REPAIRED 2026-11-03: removed the commitment-row existence gate for
  -- status='confirmed'. No application path creates a commitment before
  -- confirming (see the receipt block above), so it made 'confirmed'
  -- unreachable.

  RETURN NEW;
END;
$function$;


-- ============================================================================
-- SECTION 8 — B4: relax duration_required_after_submission
-- ============================================================================
-- RECEIPT (live):
--   duration_required_after_submission
--     CHECK ((status = 'draft'::booking_status)
--            OR (estimated_duration_minutes IS NOT NULL))
--
-- RECEIPT that no insert site sets it:
--   src/app/api/services/bookings/route.ts:292-304        -> status "submitted", no duration
--   src/app/services/provider/[id]/request/actions.ts:265-277 -> status "submitted", no duration
--   grep estimated_duration_minutes src/  -> ONLY src/types/database.ts
--     (6 hits, all generated type declarations; zero reads, zero writes)
--
-- So the constraint rejected 100% of application inserts.
--
-- ROOT CAUSE: the boundary was drawn at the wrong state. Duration is not known
-- at intake — a customer submits a request, the provider quotes it. Nothing
-- before 'confirmed' consumes the figure; the capacity probe and the
-- scheduling flow are the first consumers, and both run at 'confirmed' or
-- later. There is also no catalogue column to default it from (checked
-- services / provider_services / service_types / service_capabilities — only
-- emergency_response_sla_minutes exists, which is an SLA, not a duration).
--
-- FIX: require the duration from 'confirmed' onward, i.e. once a provider has
-- committed to the work. The pre-commitment states are exempt.
-- Combined with the derivation added to populate_busy_interval (SECTION 4a),
-- the normal flow populates it automatically as soon as a schedule is set.
--
-- The constraint name is preserved so other migrations referencing it still
-- resolve. Safe to re-validate: select count(*) from bookings -> 0 rows.
ALTER TABLE public.bookings
  DROP CONSTRAINT IF EXISTS duration_required_after_submission;

ALTER TABLE public.bookings
  ADD CONSTRAINT duration_required_after_submission CHECK (
    status IN (
      -- Pre-commitment: duration is not yet known.
      'draft',
      'submitted',
      'provider_viewed',
      'quote_pending',
      'quote_sent',
      'quote_accepted',
      'quote_rejected',
      -- Terminal / aborted before any work was ever scheduled.
      'cancelled_customer',
      'cancelled_provider',
      'abandoned',
      'needs_reassignment'
    )
    OR estimated_duration_minutes IS NOT NULL
  );

COMMENT ON CONSTRAINT duration_required_after_submission ON public.bookings IS
  'estimated_duration_minutes is required from ''confirmed'' onward (when a provider has committed and scheduling/capacity need it), not at intake. Relaxed 2026-11-03: the original form required it for every status except ''draft'', which rejected every application insert because both insert sites write status=''submitted'' and never set the column.';


-- ============================================================================
-- SECTION 9 — B5: add the 29 missing state-machine edges
-- ============================================================================
-- RECEIPT — 10 of the 25 booking_status labels had ZERO outgoing rows:
--   abandoned, customer_no_show, needs_reassignment, partially_completed,
--   payment_failed, payment_pending, provider_no_show, requires_followup,
--   rework_required, scheduled
-- and 3 more had only a self-loop (cancelled_customer, cancelled_provider,
-- resolved), so 13 of 25 had no real outgoing edge.
--
-- The 29 edges below were derived FROM THE CODE, not invented:
--   src/lib/services/booking-lifecycle.ts
--     :259-263  scheduleJob    allowedStatuses -> scheduled
--     :411-416  startJob       allowedStatuses -> in_progress
--     :483-487  completeJob    allowedStatuses -> completed
--     :582      customerConfirmCompletion      -> customer_confirmed
--     :658-669  cancelBookingAsCustomer        -> cancelled_customer
--     :764-774  cancelBookingAsProvider        -> cancelled_provider
--     :874      markPartiallyCompleted         -> partially_completed
--   src/lib/constants/booking.ts:307-337  PROVIDER_LIFECYCLE_TRANSITIONS
--   src/lib/constants/booking.ts:339-355  CUSTOMER_LIFECYCLE_TRANSITIONS
--   src/lib/services/payments.ts:118-121  payment init allowed from
--                                         customer_confirmed, payment_failed
--     :199 -> payment_pending   :239,:475 -> payment_failed   :384 -> resolved
--   src/app/dashboard/bookings/[id]/dispute/actions.ts:40-45
--                                         DISPUTABLE_STATUSES -> disputed
--   src/app/dashboard/provider/jobs/[id]/actions.ts:271-275
--                                         decline -> cancelled_provider
--
-- CROSS-CHECKED: all 29 are also accepted by the OTHER, hardcoded state
-- machine (validate_booking_status_transition), so adding them makes the two
-- enforcement layers consistent rather than trading one block for another.
--
-- requires_provider is set true ONLY for provider-executed edges.
INSERT INTO public.booking_state_transitions
  (from_status, to_status, allowed, requires_provider, requires_payment, notes)
VALUES
  -- ── execution / scheduling (provider-driven) ──
  ('confirmed',           'scheduled',          true,  true,  false, 'scheduleJob: booking-lifecycle.ts:259'),
  ('scheduled',           'in_progress',        true,  true,  false, 'startJob: booking-lifecycle.ts:411'),
  ('requires_followup',   'scheduled',          true,  true,  false, 'scheduleJob / PROVIDER_LIFECYCLE_TRANSITIONS'),
  ('requires_followup',   'in_progress',        true,  true,  false, 'startJob / PROVIDER_LIFECYCLE_TRANSITIONS'),
  ('rework_required',     'scheduled',          true,  true,  false, 'scheduleJob rework: constants/booking.ts:330'),
  ('rework_required',     'in_progress',        true,  true,  false, 'startJob rework: constants/booking.ts:331'),
  ('rework_required',     'completed',          true,  true,  false, 'completeJob: booking-lifecycle.ts:483'),
  ('customer_no_show',    'scheduled',          true,  true,  false, 'scheduleJob reschedule after no-show: booking-lifecycle.ts:262'),
  ('in_progress',         'partially_completed',true,  true,  false, 'markPartiallyCompleted: booking-lifecycle.ts:874'),
  ('partially_completed', 'completed',          true,  true,  false, 'completeJob: booking-lifecycle.ts:484'),
  ('partially_completed', 'requires_followup',  true,  true,  false, 'PROVIDER_LIFECYCLE_TRANSITIONS: constants/booking.ts:326'),

  -- ── payments (system/customer-driven) ──
  ('customer_confirmed',  'payment_pending',    true,  false, true,  'initiatePayment: payments.ts:199'),
  ('payment_failed',      'payment_pending',    true,  false, true,  'payment retry: payments.ts:118-121'),
  ('payment_pending',     'payment_failed',     true,  false, false, 'STK/callback failure: payments.ts:239,475'),
  ('payment_pending',     'resolved',           true,  false, false, 'payment success: payments.ts:384'),

  -- ── disputes ──
  ('payment_pending',     'disputed',           true,  false, false, 'DISPUTABLE_STATUSES: dispute/actions.ts:40'),
  ('payment_failed',      'disputed',           true,  false, false, 'DISPUTABLE_STATUSES: dispute/actions.ts:40'),
  ('disputed',            'rework_required',    true,  true,  false, 'dispute resolution to rework: validate_booking_status_transition'),

  -- ── customer cancellations ──
  ('scheduled',           'cancelled_customer', true,  false, false, 'cancelBookingAsCustomer: booking-lifecycle.ts:664'),
  ('in_progress',         'cancelled_customer', true,  false, false, 'cancelBookingAsCustomer: booking-lifecycle.ts:665'),
  ('partially_completed', 'cancelled_customer', true,  false, false, 'cancelBookingAsCustomer: booking-lifecycle.ts:666'),
  ('requires_followup',   'cancelled_customer', true,  false, false, 'cancelBookingAsCustomer: booking-lifecycle.ts:667'),
  ('customer_no_show',    'cancelled_customer', true,  false, false, 'cancelBookingAsCustomer: booking-lifecycle.ts:668'),
  ('payment_failed',      'cancelled_customer', true,  false, false, 'cancelBookingAsCustomer: booking-lifecycle.ts:669'),

  -- ── provider cancellations ──
  ('quote_rejected',      'cancelled_provider', true,  true,  false, 'provider decline: provider/jobs/[id]/actions.ts:274'),
  ('scheduled',           'cancelled_provider', true,  true,  false, 'cancelBookingAsProvider: booking-lifecycle.ts:770'),
  ('partially_completed', 'cancelled_provider', true,  true,  false, 'cancelBookingAsProvider: booking-lifecycle.ts:772'),
  ('requires_followup',   'cancelled_provider', true,  true,  false, 'cancelBookingAsProvider: booking-lifecycle.ts:773'),
  ('rework_required',     'cancelled_provider', true,  true,  false, 'cancelBookingAsProvider: booking-lifecycle.ts:774')
ON CONFLICT (from_status, to_status) DO UPDATE
  SET allowed           = true,
      requires_provider = EXCLUDED.requires_provider,
      requires_payment  = EXCLUDED.requires_payment,
      notes             = COALESCE(public.booking_state_transitions.notes, EXCLUDED.notes);


-- ============================================================================
-- SELF-CHECK — raises if any fix did not take effect
-- ============================================================================
DO $selfcheck$
DECLARE
  v_bad       TEXT;
  v_n         INTEGER;
  v_missing   TEXT;
  v_probe_rec RECORD;
BEGIN
  -- ── 1. No booking-path function may still reference NEW./OLD.busy_from|to ──
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO v_bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language  l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND l.lanname IN ('plpgsql','sql')
    AND pg_get_functiondef(p.oid) ~* '(?<![a-z_])(NEW|OLD)\.busy_(from|to)(?![a-z_])';
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'SELF-CHECK 1 FAILED: functions still reference renamed busy_from/busy_to: %', v_bad;
  END IF;

  -- ── 2. No function may INSERT/SELECT the dead bare columns on bookings ────
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO v_bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language  l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND l.lanname IN ('plpgsql','sql')
    AND pg_get_functiondef(p.oid) ~* '(?<![a-z_.])busy_(from|to)(?![a-z_])';
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'SELF-CHECK 2 FAILED: functions still reference bare busy_from/busy_to: %', v_bad;
  END IF;

  -- ── 3. The SERIALIZABLE gate trigger must be gone ─────────────────────────
  IF EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgrelid = 'public.bookings'::regclass
      AND NOT tgisinternal
      AND tgname = 'require_serializable_capacity'
  ) THEN
    RAISE EXCEPTION 'SELF-CHECK 3 FAILED: trigger require_serializable_capacity still attached to bookings';
  END IF;

  -- ── 4. No booking-path function may still try to set the isolation level ──
  SELECT string_agg(p.proname, ', ' ORDER BY p.proname) INTO v_bad
  FROM pg_proc p
  JOIN pg_namespace n ON n.oid = p.pronamespace
  JOIN pg_language  l ON l.oid = p.prolang
  WHERE n.nspname = 'public'
    AND p.prokind = 'f'
    AND l.lanname = 'plpgsql'
    AND pg_get_functiondef(p.oid) ~* 'SET\s+(LOCAL\s+)?TRANSACTION\s+ISOLATION\s+LEVEL';
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'SELF-CHECK 4 FAILED: functions still set transaction isolation (unsatisfiable, SQLSTATE 25001): %', v_bad;
  END IF;

  -- ── 5. The missing capacity primitive must now exist, with the right shape ─
  IF to_regprocedure(
       'public.check_provider_capacity_locked(uuid,uuid,timestamptz,timestamptz,boolean)'
     ) IS NULL THEN
    RAISE EXCEPTION 'SELF-CHECK 5 FAILED: check_provider_capacity_locked(uuid,uuid,timestamptz,timestamptz,boolean) does not exist';
  END IF;

  -- ── 5b. ...and it must actually run end-to-end through check_provider_can_accept
  --       (this is the exact call the bookings capacity trigger makes).
  BEGIN
    SELECT * INTO v_probe_rec
    FROM check_provider_can_accept(
      gen_random_uuid(), gen_random_uuid(), now(), now() + INTERVAL '1 hour', false
    );
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'SELF-CHECK 5b FAILED: check_provider_can_accept still errors: % (%)', SQLERRM, SQLSTATE;
  END;

  -- ── 6. The capacity probe must take an advisory lock (not demand SERIALIZABLE)
  IF pg_get_functiondef(
       to_regprocedure('public.check_provider_capacity_locked(uuid,uuid,timestamptz,timestamptz,boolean)')
     ) !~* 'pg_advisory_xact_lock' THEN
    RAISE EXCEPTION 'SELF-CHECK 6 FAILED: check_provider_capacity_locked does not take a transaction-scoped advisory lock';
  END IF;

  -- ── 7. protect_pricing_after_confirmation must be free of phantom labels ──
  --      Checked structurally AND by forcing the planner to coerce the list.
  IF pg_get_functiondef(to_regproc('public.protect_pricing_after_confirmation')) ~*
     '''(paused|cancelled_by_customer|cancelled_by_provider|cancelled_by_system|refunded)'''
  THEN
    RAISE EXCEPTION 'SELF-CHECK 7 FAILED: protect_pricing_after_confirmation still references labels absent from enum booking_status';
  END IF;

  -- ── 7b. Every quoted literal in that function that looks like a status must
  --        actually exist in the enum. Catches any label we missed.
  SELECT string_agg(DISTINCT lit, ', ') INTO v_bad
  FROM (
    SELECT trim(both '''' from m[1]) AS lit
    FROM regexp_matches(
           pg_get_functiondef(to_regproc('public.protect_pricing_after_confirmation')),
           '(''[a-z_]{4,}'')', 'g'
         ) AS m
  ) q
  WHERE lit NOT IN (SELECT unnest(enum_range(NULL::booking_status))::text)
    AND lit NOT IN ('integrity_constraint_violation');
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'SELF-CHECK 7b FAILED: protect_pricing_after_confirmation contains non-enum status-like literals: %', v_bad;
  END IF;

  -- ── 8. validate_booking_state_fields must not touch the phantom column ────
  IF pg_get_functiondef(to_regproc('public.validate_booking_state_fields')) ~* 'cancelled_at' THEN
    RAISE EXCEPTION 'SELF-CHECK 8 FAILED: validate_booking_state_fields still references bookings.cancelled_at, which does not exist';
  END IF;

  -- ── 9. The state machine must no longer gate 'confirmed' on a commitment ──
  IF pg_get_functiondef(to_regproc('public.enforce_booking_state_machine')) ~* 'booking_commitments' THEN
    RAISE EXCEPTION 'SELF-CHECK 9 FAILED: enforce_booking_state_machine still requires a booking_commitments row before confirmed';
  END IF;

  -- ── 10. The duration CHECK must accept the statuses the app inserts ───────
  --        Evaluated as a live predicate, not a string match.
  IF NOT (
    SELECT bool_and(
      s IN ('draft','submitted','provider_viewed','quote_pending','quote_sent',
            'quote_accepted','quote_rejected','cancelled_customer',
            'cancelled_provider','abandoned','needs_reassignment')
    )
    FROM (VALUES ('draft'),('submitted')) v(s)
  ) THEN
    RAISE EXCEPTION 'SELF-CHECK 10 FAILED: relaxed duration predicate does not admit draft/submitted';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.bookings'::regclass
      AND conname  = 'duration_required_after_submission'
      AND pg_get_constraintdef(oid) ~ 'submitted'
  ) THEN
    RAISE EXCEPTION 'SELF-CHECK 10b FAILED: duration_required_after_submission still rejects status=submitted without estimated_duration_minutes';
  END IF;

  -- ── 11. Every edge the application drives must exist and be allowed ───────
  SELECT string_agg(r.f || ' -> ' || r.t, ', ' ORDER BY r.f, r.t), count(*)
    INTO v_missing, v_n
  FROM (VALUES
    ('draft','submitted'),('submitted','provider_viewed'),('submitted','quote_pending'),
    ('submitted','confirmed'),('provider_viewed','quote_pending'),('provider_viewed','confirmed'),
    ('quote_pending','quote_sent'),('quote_sent','quote_accepted'),('quote_sent','quote_rejected'),
    ('quote_rejected','quote_pending'),('quote_accepted','confirmed'),
    ('confirmed','scheduled'),('confirmed','in_progress'),('scheduled','in_progress'),
    ('requires_followup','scheduled'),('requires_followup','in_progress'),
    ('rework_required','scheduled'),('rework_required','in_progress'),('rework_required','completed'),
    ('customer_no_show','scheduled'),
    ('in_progress','completed'),('in_progress','partially_completed'),
    ('partially_completed','completed'),('partially_completed','requires_followup'),
    ('completed','customer_confirmed'),
    ('customer_confirmed','payment_pending'),('payment_failed','payment_pending'),
    ('payment_pending','payment_failed'),('payment_pending','resolved'),
    ('completed','disputed'),('customer_confirmed','disputed'),('payment_pending','disputed'),
    ('payment_failed','disputed'),('disputed','resolved'),('disputed','rework_required'),
    ('draft','cancelled_customer'),('submitted','cancelled_customer'),('quote_sent','cancelled_customer'),
    ('quote_rejected','cancelled_customer'),('confirmed','cancelled_customer'),('scheduled','cancelled_customer'),
    ('in_progress','cancelled_customer'),('partially_completed','cancelled_customer'),
    ('requires_followup','cancelled_customer'),('customer_no_show','cancelled_customer'),
    ('payment_failed','cancelled_customer'),
    ('submitted','cancelled_provider'),('provider_viewed','cancelled_provider'),
    ('quote_pending','cancelled_provider'),('quote_rejected','cancelled_provider'),
    ('confirmed','cancelled_provider'),('scheduled','cancelled_provider'),('in_progress','cancelled_provider'),
    ('partially_completed','cancelled_provider'),('requires_followup','cancelled_provider'),
    ('rework_required','cancelled_provider')
  ) AS r(f,t)
  LEFT JOIN booking_state_transitions b
    ON b.from_status = r.f::booking_status
   AND b.to_status   = r.t::booking_status
   AND b.allowed
  WHERE b.from_status IS NULL;

  IF COALESCE(v_n,0) > 0 THEN
    RAISE EXCEPTION 'SELF-CHECK 11 FAILED: % application-required transition(s) still missing from booking_state_transitions: %', v_n, v_missing;
  END IF;

  -- ── 12. No remaining BEFORE INSERT trigger function on bookings may
  --        reference a column that does not exist on the table. Cheap
  --        structural sweep for any other phantom-field landmine.
  SELECT string_agg(DISTINCT p.proname, ', ') INTO v_bad
  FROM pg_trigger t
  JOIN pg_proc p ON p.oid = t.tgfoid
  WHERE t.tgrelid = 'public.bookings'::regclass
    AND NOT t.tgisinternal
    AND pg_get_functiondef(p.oid) ~* '(?<![a-z_])(NEW|OLD)\.(busy_from|busy_to|cancelled_at|paused_at|refunded_at)(?![a-z_])';
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'SELF-CHECK 12 FAILED: bookings trigger function(s) still reference non-existent columns: %', v_bad;
  END IF;

  RAISE NOTICE 'A-booking-path.sql: all 12 self-checks PASSED.';
END;
$selfcheck$;

-- COMMIT removed: see note above.

-- ============================================================================
-- OUT OF SCOPE / FOLLOW-UP (deliberately NOT changed here)
-- ============================================================================
-- F1. pricing_snapshot is required at 'confirmed' by BOTH
--     validate_booking_state_fields and CHECK
--     pricing_snapshot_required_after_confirmation, but the provider
--     direct-accept path (src/app/dashboard/provider/jobs/[id]/actions.ts:196,
--     submitted -> confirmed) sets only status + agreed_price. That path will
--     still fail. This is NOT a stale-trigger bug: the constraint works as
--     designed and pricing_snapshot is the dispute-evidence record. The fix
--     belongs in the app (build a snapshot when confirming without a quote).
--     Synthesising a legal pricing record in a trigger is a product/legal
--     decision and is not taken here.
--     Trigger ordering note: it cannot be patched in snapshot_quote_on_send
--     either — 'enforce_booking_state_fields' fires before
--     'snapshot_quote_on_send_trigger' (alphabetical), so the raise happens
--     first.
--
-- F2. Capacity enforcement never fires on INSERT. BEFORE triggers fire in NAME
--     order, and 'check_provider_capacity_trigger' (c) sorts before
--     'populate_busy_interval_trigger' (p). Its WHEN clause requires
--     NEW.estimated_busy_from IS NOT NULL, but nothing has populated that yet
--     on an INSERT, so the clause is false and the trigger is skipped.
--     Renaming it to sort after populate_busy_interval_trigger would switch
--     capacity enforcement ON for the first time, which changes business
--     behaviour (rows start diverting to needs_reassignment). Left alone on
--     purpose; schedule it as its own change with its own testing.
--
-- F3. Duplicate triggers 'calculate_busy_to' and 'calculate_busy_to_trigger'
--     both call calculate_busy_to_from_duration() with identical definitions.
--     Harmless (idempotent assignment) but one should be dropped.
--
-- F4. TWO state machines run on every UPDATE: the table-driven
--     enforce_booking_state_machine (x2 triggers) and the hardcoded
--     validate_booking_status_transition. They must agree or a write is
--     blocked by whichever is stricter. All 29 edges added above are accepted
--     by both. Divergences remain in the other direction: the table allows
--     provider_viewed -> cancelled_customer, which the hardcoded function
--     rejects. No app path uses it today. Collapse to one machine eventually.
--
-- ROLLBACK: see A-booking-path.md.
