-- =============================================================================
-- C-4: make the authoritative price actually exist, and the guard actually fire
-- =============================================================================
-- Migration 20260109120007 declares, in its own words:
--
--   "bookings.pricing_snapshot->>'total' is the legally authoritative price
--    after customer_confirmed status"
--   "agreed_price MUST equal pricing_snapshot.total at customer_confirmed"
--
-- and installs enforce_price_synchronization to enforce it. No writer has ever
-- set `total`:
--   - the application's buildPricingSnapshot wrote quoted_price, currency,
--     breakdown, description, validity_days, captured_at;
--   - the database's snapshot_quote_on_send wrote status, quoted_price,
--     currency, quoted_at, quote_snapshot_version, note;
--   - the provider direct-accept path wrote no snapshot at all.
--
-- So the field the schema calls legally authoritative was permanently NULL, and
-- because `ABS(NEW.agreed_price - NULL) > 0.01` evaluates to NULL rather than
-- true, the IF was never entered and the guard passed for ANY agreed_price.
-- Verified behaviourally before this change: extracting 'total' returned NULL
-- and the comparison returned NULL. This was not an ineffective check; it was a
-- documented guarantee that did not exist.
--
-- Fixed in two halves. The writers come first (this migration plus the
-- application changes alongside it), and only then is the guard made strict --
-- in that order, because a strict guard with no writer would reject every
-- confirmation.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. The database-side snapshot writer now records `total`
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.snapshot_quote_on_send()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
BEGIN
  -- When a quote is sent, capture what the customer was shown, for audit.
  IF NEW.status = 'quote_sent' AND (OLD.status IS NULL OR OLD.status != 'quote_sent') THEN

    IF NEW.pricing_snapshot IS NULL THEN

      IF NEW.quoted_price IS NULL THEN
        RAISE EXCEPTION 'quoted_price is required when transitioning to quote_sent. Booking: %',
          NEW.id
          USING HINT = 'Set quoted_price before sending quote to customer.';
      END IF;

      NEW.pricing_snapshot := jsonb_build_object(
        -- `total` is the authoritative price the sync guard compares against.
        -- Omitting it is what made that guard dead.
        'total', NEW.quoted_price,
        'status', 'quote_sent',
        'quoted_price', NEW.quoted_price,
        'currency', COALESCE(NEW.currency, 'KES'),
        'quoted_at', now(),
        'quote_snapshot_version', 1,
        'note', 'Initial quote snapshot - total equals quoted_price until a full breakdown is captured'
      );

    END IF;
  END IF;

  RETURN NEW;
END;
$fn$;

-- -----------------------------------------------------------------------------
-- 2. Backfill `total` into any snapshot that lacks it
-- -----------------------------------------------------------------------------
-- Zero rows today, so this is a no-op now and correct if it ever is not.
UPDATE public.bookings
   SET pricing_snapshot = pricing_snapshot || jsonb_build_object(
         'total', COALESCE(
           (pricing_snapshot->>'quoted_price')::numeric,
           agreed_price,
           quoted_price
         )
       )
 WHERE pricing_snapshot IS NOT NULL
   AND pricing_snapshot->>'total' IS NULL
   AND COALESCE(
         (pricing_snapshot->>'quoted_price')::numeric,
         agreed_price,
         quoted_price
       ) IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. The guard now fails closed
-- -----------------------------------------------------------------------------
-- A missing total is now an error rather than a silent pass. The comparison is
-- also made NULL-safe so no future field rename can quietly disable it again.
CREATE OR REPLACE FUNCTION public.enforce_price_synchronization()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $fn$
DECLARE
  snapshot_total numeric(12,2);
BEGIN
  -- Only policed at the point the price becomes binding.
  IF NEW.status = 'customer_confirmed'
     AND (OLD.status IS NULL OR OLD.status <> 'customer_confirmed') THEN

    IF NEW.agreed_price IS NULL THEN
      RAISE EXCEPTION 'agreed_price is required at customer_confirmed. Booking: %', NEW.id
        USING HINT = 'The price the customer agreed to must be recorded before confirmation.';
    END IF;

    IF NEW.pricing_snapshot IS NULL THEN
      RAISE EXCEPTION 'pricing_snapshot is required at customer_confirmed. Booking: %', NEW.id
        USING HINT = 'Capture what the customer was shown before confirming.';
    END IF;

    snapshot_total := (NEW.pricing_snapshot->>'total')::numeric(12,2);

    -- FAIL CLOSED. Previously a NULL here made the comparison NULL and the
    -- check passed for any price at all.
    IF snapshot_total IS NULL THEN
      RAISE EXCEPTION 'pricing_snapshot.total is missing at customer_confirmed. Booking: %', NEW.id
        USING HINT = 'pricing_snapshot.total is the authoritative price; it must be set by whatever captured the snapshot.';
    END IF;

    IF ABS(NEW.agreed_price - snapshot_total) > 0.01 THEN
      RAISE EXCEPTION 'agreed_price (%) does not match pricing_snapshot.total (%). Booking: %',
        NEW.agreed_price, snapshot_total, NEW.id
        USING HINT = 'These must be synchronized at customer_confirmed. Set agreed_price = pricing_snapshot.total';
    END IF;
  END IF;

  RETURN NEW;
END
$fn$;

-- -----------------------------------------------------------------------------
-- 4. Validate custom_pricing.amount at the write path (C-6)
-- -----------------------------------------------------------------------------
-- The same jsonb field is a billing input: the provider direct-accept path
-- resolves agreed_price from provider_services.custom_pricing->>'amount'. It
-- had no constraint of any kind, so a non-numeric value also made the
-- min_price trigger's ::numeric cast abort the provider's own service save
-- with a raw 22P02.
DO $ctor$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'provider_services_custom_price_format_check') THEN
    ALTER TABLE public.provider_services
      ADD CONSTRAINT provider_services_custom_price_format_check
      CHECK (
        custom_pricing IS NULL
        OR custom_pricing->>'amount' IS NULL
        OR custom_pricing->>'amount' ~ '^[0-9]{1,8}(\.[0-9]{1,2})?$'
      );
  END IF;
END
$ctor$;


-- -----------------------------------------------------------------------------
-- 4b. snapshot_quote_on_send was UNREACHABLE: fix its firing order
-- -----------------------------------------------------------------------------
-- BEFORE UPDATE triggers fire in name order. Measured on this database:
--
--    6. enforce_booking_state_fields         validate_booking_state_fields()
--   15. snapshot_quote_on_send_trigger       snapshot_quote_on_send()
--
-- validate_booking_state_fields raises "pricing_snapshot is required when quote
-- is sent" NINE triggers before the trigger that would create that snapshot
-- ever runs. So snapshot_quote_on_send could never fire on the path it exists
-- for, and the application was in practice the only snapshot writer. Verified
-- behaviourally: a quote_sent transition without an app-supplied snapshot fails
-- with 23514 from validate_booking_state_fields.
--
-- Recreated with a name that sorts first, so trigger order is no longer the
-- blocker. It only acts when pricing_snapshot IS NULL, so it cannot overwrite
-- what the application set.
--
-- HONEST LIMITATION: this does NOT make the fallback reachable on a legal path,
-- and I initially claimed it did. pricing_snapshot_required_after_confirmation
-- exempts only draft, submitted, provider_viewed and the two cancelled states,
-- so a snapshot is already mandatory at quote_pending -- one state BEFORE
-- quote_sent. By the time this trigger could run, a snapshot must already
-- exist, so its IF is never entered. Verified: reaching quote_pending without a
-- snapshot fails with 23514 from that CHECK.
--
-- The application is therefore necessarily the sole snapshot writer, which is
-- why the `total` fix in buildPricingSnapshot and in the provider direct-accept
-- path is the load-bearing half of this change. The reorder is kept because it
-- is harmless and makes the fallback correct-if-ever-reachable, rather than
-- dead in two independent ways.
DROP TRIGGER IF EXISTS snapshot_quote_on_send_trigger ON public.bookings;
DROP TRIGGER IF EXISTS "00_snapshot_quote_on_send" ON public.bookings;
CREATE TRIGGER "00_snapshot_quote_on_send"
  BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_quote_on_send();

-- -----------------------------------------------------------------------------
-- 5. Assertions
-- -----------------------------------------------------------------------------
DO $assert$
DECLARE v_fires boolean;
BEGIN
  -- The writer must emit a total.
  IF position('''total'', NEW.quoted_price' in
       (SELECT prosrc FROM pg_proc WHERE proname = 'snapshot_quote_on_send')) = 0 THEN
    RAISE EXCEPTION 'FAILED: snapshot_quote_on_send does not write total';
  END IF;

  -- The guard must reject a NULL total. Checked by evaluating the condition the
  -- function uses, not by matching its text.
  SELECT ((('{"quoted_price":100}'::jsonb)->>'total')::numeric(12,2)) IS NULL INTO v_fires;
  IF NOT v_fires THEN
    RAISE EXCEPTION 'FAILED: a snapshot without total does not yield NULL, so the strict branch is unreachable';
  END IF;
  IF position('snapshot_total IS NULL' in
       (SELECT prosrc FROM pg_proc WHERE proname = 'enforce_price_synchronization')) = 0 THEN
    RAISE EXCEPTION 'FAILED: enforce_price_synchronization still passes on a NULL total';
  END IF;

  -- Both functions must keep a pinned search_path.
  IF (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
       WHERE n.nspname = 'public'
         AND p.proname IN ('snapshot_quote_on_send', 'enforce_price_synchronization')
         AND array_to_string(p.proconfig, ',') LIKE '%search_path%') <> 2 THEN
    RAISE EXCEPTION 'FAILED: a price function lost its pinned search_path';
  END IF;

  -- The custom_pricing format check must exist and must discriminate.
  IF NOT EXISTS (SELECT 1 FROM pg_constraint
                  WHERE conname = 'provider_services_custom_price_format_check') THEN
    RAISE EXCEPTION 'FAILED: custom_pricing format check missing';
  END IF;
  IF NOT ('500.00' ~ '^[0-9]{1,8}(\.[0-9]{1,2})?$')
     OR ('abc' ~ '^[0-9]{1,8}(\.[0-9]{1,2})?$')
     OR ('100.555' ~ '^[0-9]{1,8}(\.[0-9]{1,2})?$')
     OR ('-5' ~ '^[0-9]{1,8}(\.[0-9]{1,2})?$')
     OR ('1e30' ~ '^[0-9]{1,8}(\.[0-9]{1,2})?$') THEN
    RAISE EXCEPTION 'FAILED: the custom_pricing pattern does not discriminate correctly';
  END IF;

  -- No snapshot may be left without a total.
  IF EXISTS (SELECT 1 FROM bookings
              WHERE pricing_snapshot IS NOT NULL AND pricing_snapshot->>'total' IS NULL) THEN
    RAISE EXCEPTION 'FAILED: snapshots without a total remain after backfill';
  END IF;


  -- The snapshot fallback must now fire BEFORE the field validation that
  -- depends on it. Compared by name, which is what Postgres orders by.
  IF (SELECT min(tgname) FROM pg_trigger
       WHERE tgrelid = 'public.bookings'::regclass AND NOT tgisinternal
         AND tgfoid = 'public.snapshot_quote_on_send'::regproc)
     >= (SELECT min(tgname) FROM pg_trigger
          WHERE tgrelid = 'public.bookings'::regclass AND NOT tgisinternal
            AND tgfoid = 'public.validate_booking_state_fields'::regproc) THEN
    RAISE EXCEPTION 'FAILED: the snapshot trigger still sorts after the validation that requires a snapshot';
  END IF;

  RAISE NOTICE 'C-4/C-6: total is written, the sync guard fails closed, custom_pricing validated, snapshot fallback ordered first.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   ALTER TABLE public.provider_services DROP CONSTRAINT provider_services_custom_price_format_check;
--   Restore snapshot_quote_on_send and enforce_price_synchronization from
--   20260109120007 (note: that restores the dead guard).
-- =============================================================================
