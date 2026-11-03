-- =============================================================================
-- C-missing-objects.sql
-- MitaSafi (Supabase / PostgreSQL 17.11) -- restore MISSING database objects
-- that src/ already references.
--
-- Authored:   2026-11-03
-- Idempotent: safe to run repeatedly. Uses IF NOT EXISTS / CREATE OR REPLACE /
--             DROP POLICY IF EXISTS + CREATE POLICY throughout.
-- Scope:      additive only. No existing object is dropped or altered in a
--             destructive way. The only ALTER TABLE is one ADD COLUMN IF NOT
--             EXISTS on public.services.
--
-- VERIFIED ABSENT before authoring (see C-missing-objects.md for the queries
-- and their output):
--   * table    public.phone_verifications
--   * function public.find_listing_by_id_prefix(text)
--   * function public.calculate_provider_profile_completion(uuid)
--   * function public.set_config(text, text)       (only pg_catalog's 3-arg
--                                                   variant exists, and
--                                                   PostgREST cannot reach it)
--   * column   public.services.keywords
--
-- VERIFIED ALREADY PRESENT -> intentionally NOT created:
--   * public.listings.status            (text, nullable) -- the "missing
--     status" in the audit is phone_verifications.status, created below.
--   * public.service_providers.average_rating (numeric) -- "rating_average" is
--     an application-side view-model alias, not a database column. See
--     src/app/dashboard/provider/services/actions.ts:578
--     (`rating_average: prov.average_rating ?? null`) and
--     src/lib/services/providers.ts:224. Every ORDER BY in
--     src/lib/services/providers.ts targets `average_rating`. Adding a
--     `rating_average` column would create a second, silently-stale copy of
--     the rating. NOT CREATED -- deliberately.
--
-- Transaction: everything runs in one transaction, so a failure -- including a
-- failure raised by the self-check at the end -- rolls the whole migration
-- back. CREATE INDEX CONCURRENTLY cannot run inside a transaction, so plain
-- CREATE INDEX is used. That is safe here because of where the indexes land:
-- 5 on the brand-new (empty) phone_verifications, 1 GIN on public.services (a
-- 14-column reference table), and 1 on public.listings. Only the last two take
-- a lock on a live table; see "Blast radius" in C-missing-objects.md.
-- lock_timeout is set to 10s so the migration aborts rather than queueing
-- behind a long-running transaction and blocking readers.
-- =============================================================================

-- BEGIN removed: the migration runner wraps each file in its own transaction.

SET LOCAL statement_timeout = '120s';
SET LOCAL lock_timeout = '10s';

-- pgcrypto lives in the `extensions` schema on this project (verified:
-- pg_extension JOIN pg_namespace -> pgcrypto => extensions). Every call below
-- is schema-qualified rather than relying on search_path.
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;


-- #############################################################################
-- 1. TABLE public.phone_verifications
-- #############################################################################
--
-- Contract derived from the 8 call sites in
-- src/app/dashboard/verify-provider/actions.ts (all of them use the
-- service-role admin client from src/lib/supabase/admin.ts):
--
--   L115 .select("*", {count:"exact", head:true})
--          .eq("user_id", userId).gte("created_at", windowStart)   -> user_id, created_at
--   L139 .delete().eq("user_id", userId).eq("status","pending")    -> status
--   L146 .insert({user_id, phone, code, expires_at, attempts, status})
--   L226 .select("id, code, expires_at, attempts")
--          .eq("user_id",...).eq("phone", cleanPhone)
--          .eq("status","pending").order("created_at",desc).limit(1).single()
--   L245 .update({status:"expired"}).eq("id", ...)
--   L255 .update({status:"blocked"}).eq("id", ...)
--   L266 .update({attempts: attempts + 1}).eq("id", ...)   <-- read-then-write race
--   L281 .update({status:"verified", verified_at}).eq("id", ...)
--
-- Status domain observed in code: pending | expired | blocked | verified.
-- `phone` is digit-only E.164 without '+' (cleanPhoneNumber strips non-digits;
-- the caller asserts length 12 and prefix "254"), so the CHECK mirrors that.
--
-- SECURITY CHANGES vs. what the code currently does (see the .md for sources):
--   (a) The plaintext OTP is NEVER persisted. `code` is accepted on INSERT for
--       wire compatibility with the existing insert at L146, but a BEFORE
--       trigger immediately bcrypt-hashes it into `code_hash` and nulls the
--       plaintext out. Nothing readable is left at rest.
--   (b) Verification moves into public.verify_phone_otp(), which increments the
--       attempt counter with a single atomic UPDATE (`attempts = attempts + 1`)
--       instead of the read-then-write at L226/L266.
--   (c) Single use: a successful verification is a consuming UPDATE guarded by
--       `status = 'pending'`, so a replay of the same code cannot succeed twice.
--   (d) Per-phone (not just per-user) send rate limiting lives in
--       public.request_phone_otp().
--   (e) RLS on, zero policies for anon/authenticated, explicit service_role
--       policy. The browser can never read an OTP row.
-- #############################################################################

CREATE TABLE IF NOT EXISTS public.phone_verifications (
    id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),

    -- auth.users.id. The server actions pass the Supabase auth uid and
    -- cross-check it against supabase.auth.getUser() before inserting.
    user_id       uuid        NOT NULL
                              REFERENCES auth.users (id) ON DELETE CASCADE,

    -- Digits only, no leading '+'. Kenyan MSISDN: 254 + 9 digits = 12 chars.
    phone         text        NOT NULL,

    -- Write-only shim. The BEFORE INSERT/UPDATE trigger below moves whatever is
    -- written here into code_hash and resets this to NULL, so it is always NULL
    -- at rest. It exists solely so the existing INSERT at actions.ts:146 keeps
    -- working without a code change.
    code          text        NULL,

    -- bcrypt digest of the OTP (extensions.crypt + gen_salt('bf', 10)).
    -- The ONLY durable representation of the code.
    code_hash     text        NULL,

    expires_at    timestamptz NOT NULL,

    -- Incremented atomically by verify_phone_otp(). Never computed in the app.
    attempts      integer     NOT NULL DEFAULT 0,

    max_attempts  integer     NOT NULL DEFAULT 3,

    status        text        NOT NULL DEFAULT 'pending',

    verified_at   timestamptz NULL,
    created_at    timestamptz NOT NULL DEFAULT now(),
    updated_at    timestamptz NOT NULL DEFAULT now(),

    CONSTRAINT phone_verifications_phone_digits_chk
        CHECK (phone ~ '^[0-9]{9,15}$'),

    CONSTRAINT phone_verifications_status_chk
        CHECK (status IN ('pending', 'verified', 'expired', 'blocked')),

    CONSTRAINT phone_verifications_attempts_chk
        CHECK (attempts >= 0 AND attempts <= max_attempts),

    CONSTRAINT phone_verifications_max_attempts_chk
        CHECK (max_attempts BETWEEN 1 AND 10),

    -- NIST SP 800-63B s5.1.3.2: an out-of-band secret is invalid after 10
    -- minutes. The app uses 5 (OTP_EXPIRY_MINUTES). This bounds the maximum
    -- lifetime a caller can ask for; the 2-minute slack absorbs clock skew
    -- between the Node process (which computes expires_at as a JS Date) and
    -- the database (whose created_at default is now()).
    -- Only the upper bound is enforced here: a row that arrives already
    -- expired is harmless, because verify_phone_otp() re-checks
    -- `expires_at <= now()` against the database clock on every attempt.
    CONSTRAINT phone_verifications_expiry_window_chk
        CHECK (expires_at <= created_at + interval '12 minutes'),

    -- A verified row must carry its consumption timestamp, and only a verified
    -- row may carry one. This is what makes single-use auditable.
    CONSTRAINT phone_verifications_verified_at_chk
        CHECK ((status = 'verified') = (verified_at IS NOT NULL)),

    -- Plaintext must never survive a statement. Belt to the trigger's braces:
    -- if the trigger were ever dropped, writes would start failing closed
    -- rather than silently storing plaintext again.
    CONSTRAINT phone_verifications_no_plaintext_chk
        CHECK (code IS NULL)
);

COMMENT ON TABLE  public.phone_verifications IS
  'Phone OTP challenges. Service-role only. The plaintext code is never stored: the hash_phone_verification_code trigger bcrypt-hashes it into code_hash on write. Use request_phone_otp()/verify_phone_otp() rather than reading this table.';
COMMENT ON COLUMN public.phone_verifications.code IS
  'Write-only shim for legacy inserts. Always NULL at rest (enforced by trigger + CHECK).';
COMMENT ON COLUMN public.phone_verifications.code_hash IS
  'bcrypt(OTP). Never leaves the database.';


-- Re-runs on an already-created table: add anything a previous partial run or
-- an older revision of this file may have missed.
ALTER TABLE public.phone_verifications
    ADD COLUMN IF NOT EXISTS code_hash    text    NULL,
    ADD COLUMN IF NOT EXISTS max_attempts integer NOT NULL DEFAULT 3,
    ADD COLUMN IF NOT EXISTS updated_at   timestamptz NOT NULL DEFAULT now();


-- -----------------------------------------------------------------------------
-- 1a. Indexes
-- -----------------------------------------------------------------------------

-- Serves the per-user send rate-limit count at actions.ts:115
-- (user_id = ? AND created_at >= ?) and the ORDER BY created_at DESC LIMIT 1
-- lookup at actions.ts:226.
CREATE INDEX IF NOT EXISTS idx_phone_verifications_user_created
    ON public.phone_verifications (user_id, created_at DESC);

-- Serves the per-PHONE rate limit in request_phone_otp(). The app currently
-- only throttles per user_id, which an attacker sidesteps by pointing several
-- accounts at one victim MSISDN (SMS-bombing / toll fraud).
CREATE INDEX IF NOT EXISTS idx_phone_verifications_phone_created
    ON public.phone_verifications (phone, created_at DESC);

-- Serves the pending lookup/delete paths (actions.ts:139, :226).
CREATE INDEX IF NOT EXISTS idx_phone_verifications_pending
    ON public.phone_verifications (user_id, phone, created_at DESC)
    WHERE status = 'pending';

-- At most one live challenge per (user, phone). actions.ts:139 already deletes
-- prior pending rows before inserting; this makes that invariant structural, so
-- two concurrent sendPhoneOTP calls cannot leave two valid codes outstanding
-- (the loser gets a unique violation instead).
CREATE UNIQUE INDEX IF NOT EXISTS uq_phone_verifications_one_pending
    ON public.phone_verifications (user_id, phone)
    WHERE status = 'pending';

-- Supports the expiry sweep in public.expire_phone_verifications().
CREATE INDEX IF NOT EXISTS idx_phone_verifications_expires
    ON public.phone_verifications (expires_at)
    WHERE status = 'pending';


-- -----------------------------------------------------------------------------
-- 1b. Hash-on-write trigger  (fix for "OTP stored in plaintext")
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.hash_phone_verification_code()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
    -- Any plaintext offered on `code` is hashed and discarded in the same
    -- statement, before the row is ever visible to another transaction.
    IF NEW.code IS NOT NULL AND length(NEW.code) > 0 THEN
        NEW.code_hash := extensions.crypt(NEW.code,
                                          extensions.gen_salt('bf', 10));
        NEW.code      := NULL;
    END IF;

    -- Defensive: never allow a resurrected plaintext on UPDATE either.
    NEW.code := NULL;

    IF TG_OP = 'UPDATE' THEN
        NEW.updated_at := now();
    END IF;

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.hash_phone_verification_code() IS
  'BEFORE INSERT/UPDATE on phone_verifications: bcrypt the submitted OTP into code_hash and null the plaintext. Makes plaintext storage structurally impossible.';

DROP TRIGGER IF EXISTS trg_phone_verifications_hash_code
    ON public.phone_verifications;
CREATE TRIGGER trg_phone_verifications_hash_code
    BEFORE INSERT OR UPDATE ON public.phone_verifications
    FOR EACH ROW
    EXECUTE FUNCTION public.hash_phone_verification_code();


-- -----------------------------------------------------------------------------
-- 1c. public.request_phone_otp(uuid, text, integer, integer)
--     Atomic: rate-limit check + invalidate prior pending + mint + hash + store.
--     Returns the plaintext ONCE, to the service-role caller, so the Node server
--     action can hand it to the SMS gateway. It is never written to disk and
--     must never be forwarded to the browser (see .md: remove `devOtp`).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.request_phone_otp(
    p_user_id          uuid,
    p_phone            text,
    p_expiry_minutes   integer DEFAULT 5,
    p_max_sends        integer DEFAULT 3,
    p_window_minutes   integer DEFAULT 15
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_phone        text;
    v_otp          text;
    v_bytes        bytea;
    v_window_start timestamptz;
    v_user_sends   integer;
    v_phone_sends  integer;
    v_id           uuid;
    -- PostgREST authenticates by issuing SET LOCAL ROLE <anon|authenticated|
    -- service_role>, so the `role` GUC is the dependable signal for who called
    -- us. It survives into a SECURITY DEFINER body, whereas current_user does
    -- not (it becomes the function owner). `request.jwt.claim.*` is the legacy
    -- per-claim GUC and is not populated on every PostgREST version, so it is
    -- not relied on. Verified: current_setting('role', true) = 'none' when
    -- unset, hence the nullif/session_user fallback.
    v_caller       text := coalesce(
                               nullif(current_setting('role', true), 'none'),
                               session_user::text);
BEGIN
    -- SECURITY DEFINER + no auth.uid() check => this function must only ever be
    -- reachable by service_role. EXECUTE is revoked from anon/authenticated
    -- below; this assertion is the second line of defence.
    IF v_caller IN ('anon', 'authenticated') THEN
        RAISE EXCEPTION 'request_phone_otp is not callable from the client'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    IF v_phone !~ '^254[0-9]{9}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid phone number format');
    END IF;

    IF p_expiry_minutes IS NULL OR p_expiry_minutes < 1 OR p_expiry_minutes > 10 THEN
        -- NIST SP 800-63B s5.1.3.2 caps out-of-band validity at 10 minutes.
        RAISE EXCEPTION 'p_expiry_minutes must be between 1 and 10 (NIST SP 800-63B 5.1.3.2)';
    END IF;

    v_window_start := now() - make_interval(mins => p_window_minutes);

    -- Rate limit #1: per account (what the app does today, moved server-side so
    -- it cannot be skipped by a caller that forgets the check).
    SELECT count(*) INTO v_user_sends
      FROM public.phone_verifications
     WHERE user_id = p_user_id
       AND created_at >= v_window_start;

    -- Rate limit #2: per MSISDN, across accounts. This is the one the app is
    -- missing. Without it, N accounts can each burn the per-user budget against
    -- a single victim number.
    SELECT count(*) INTO v_phone_sends
      FROM public.phone_verifications
     WHERE phone = v_phone
       AND created_at >= v_window_start;

    IF v_user_sends >= p_max_sends OR v_phone_sends >= (p_max_sends * 2) THEN
        RETURN jsonb_build_object(
            'success', false,
            'error', format('Too many attempts. Please try again in %s minutes.',
                            p_window_minutes),
            'retry_after_minutes', p_window_minutes
        );
    END IF;

    -- Invalidate (never delete -- the row is the rate-limit evidence) any live
    -- challenge for this user/phone. Replaces the DELETE at actions.ts:139,
    -- which destroyed the audit trail and the rate-limit counters with it.
    UPDATE public.phone_verifications
       SET status = 'expired'
     WHERE user_id = p_user_id
       AND phone   = v_phone
       AND status  = 'pending';

    -- 6 digits = log2(10^6) ~= 19.93 bits. NIST SP 800-63B s5.1.3.2 asks for
    -- >= 20 bits, so 6 digits sits right on the line; the same section requires
    -- rate limiting for any secret under 64 bits, which is what the two send
    -- limits above and the attempt limit in verify_phone_otp() provide.
    -- extensions.gen_random_bytes() is pgcrypto's CSPRNG. One 48-bit draw is
    -- reduced mod 10^6, so the modulo bias is 2^48 mod 10^6 / 2^48 ~= 1e-9 --
    -- far below anything exploitable against a 3-attempt, 5-minute challenge.
    v_bytes := extensions.gen_random_bytes(6);
    v_otp := lpad(
        ((  (get_byte(v_bytes, 0)::bigint << 40)
          | (get_byte(v_bytes, 1)::bigint << 32)
          | (get_byte(v_bytes, 2)::bigint << 24)
          | (get_byte(v_bytes, 3)::bigint << 16)
          | (get_byte(v_bytes, 4)::bigint <<  8)
          |  get_byte(v_bytes, 5)::bigint
         ) % 1000000::bigint)::text, 6, '0');

    -- `code` is handed to the trigger, which hashes it and nulls it. The
    -- plaintext exists only in this function's local variable.
    INSERT INTO public.phone_verifications
        (user_id, phone, code, expires_at, attempts, max_attempts, status)
    VALUES
        (p_user_id, v_phone, v_otp,
         now() + make_interval(mins => p_expiry_minutes), 0, 3, 'pending')
    RETURNING id INTO v_id;

    RETURN jsonb_build_object(
        'success',         true,
        'verification_id', v_id,
        'phone',           v_phone,
        'expires_in',      p_expiry_minutes * 60,
        -- Hand to the SMS gateway and drop. NEVER return this to a browser.
        'otp',             v_otp
    );
END;
$$;

COMMENT ON FUNCTION public.request_phone_otp(uuid, text, integer, integer, integer) IS
  'Mint a phone OTP. Service-role only. Enforces per-user AND per-phone send rate limits, invalidates any prior pending challenge, stores only a bcrypt hash, and returns the plaintext once for SMS delivery. Do not forward the plaintext to a client.';


-- -----------------------------------------------------------------------------
-- 1d. public.verify_phone_otp(uuid, text, text)
--     Atomic: expiry + attempt-limit + constant-time hash compare + single-use
--     consumption, in one transaction, with the counter incremented in-place.
--     Replaces actions.ts:226-287 (the read-then-write race).
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.verify_phone_otp(
    p_user_id uuid,
    p_phone   text,
    p_code    text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
    v_phone     text;
    v_row       public.phone_verifications;
    v_match     boolean;
    v_remaining integer;
    -- See the note in request_phone_otp() on why the `role` GUC is used.
    v_caller    text := coalesce(
                            nullif(current_setting('role', true), 'none'),
                            session_user::text);
BEGIN
    IF v_caller IN ('anon', 'authenticated') THEN
        RAISE EXCEPTION 'verify_phone_otp is not callable from the client'
            USING ERRCODE = 'insufficient_privilege';
    END IF;

    v_phone := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');

    IF p_code IS NULL OR p_code !~ '^[0-9]{6}$' THEN
        RETURN jsonb_build_object('success', false, 'error', 'Invalid verification code');
    END IF;

    -- FOR UPDATE serialises concurrent verify attempts on the same challenge.
    -- This is what closes the attempt-counter race: two parallel guesses can no
    -- longer both read attempts = 0 and both write 1.
    SELECT * INTO v_row
      FROM public.phone_verifications
     WHERE user_id = p_user_id
       AND phone   = v_phone
       AND status  = 'pending'
     ORDER BY created_at DESC
     LIMIT 1
     FOR UPDATE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false,
            'error', 'No pending verification found. Please request a new code.');
    END IF;

    -- Expiry first, so an expired code never consumes an attempt.
    IF v_row.expires_at <= now() THEN
        UPDATE public.phone_verifications
           SET status = 'expired'
         WHERE id = v_row.id;
        RETURN jsonb_build_object('success', false,
            'error', 'Verification code has expired. Please request a new one.');
    END IF;

    IF v_row.attempts >= v_row.max_attempts THEN
        UPDATE public.phone_verifications
           SET status = 'blocked'
         WHERE id = v_row.id;
        RETURN jsonb_build_object('success', false,
            'error', 'Too many incorrect attempts. Please request a new code.');
    END IF;

    -- bcrypt re-derives the digest with the stored salt and compares. crypt()
    -- returns the full modular-crypt string, so `=` is a fixed-length
    -- comparison over equal-length digests -- it does not leak the code.
    v_match := (v_row.code_hash IS NOT NULL)
               AND (extensions.crypt(p_code, v_row.code_hash) = v_row.code_hash);

    IF NOT v_match THEN
        -- ATOMIC increment: read-modify-write collapsed into one statement.
        UPDATE public.phone_verifications
           SET attempts = attempts + 1,
               status   = CASE WHEN attempts + 1 >= max_attempts
                               THEN 'blocked' ELSE 'pending' END
         WHERE id = v_row.id
        RETURNING max_attempts - attempts INTO v_remaining;

        RETURN jsonb_build_object(
            'success', false,
            'error', CASE WHEN coalesce(v_remaining, 0) <= 0
                          THEN 'Too many incorrect attempts. Please request a new code.'
                          ELSE format('Invalid code. %s attempt%s remaining.',
                                      v_remaining,
                                      CASE WHEN v_remaining = 1 THEN '' ELSE 's' END)
                     END,
            'attempts_remaining', greatest(coalesce(v_remaining, 0), 0)
        );
    END IF;

    -- SINGLE USE. The `status = 'pending'` predicate is the consumption guard:
    -- a replay of the same code finds no pending row and fails.
    UPDATE public.phone_verifications
       SET status      = 'verified',
           verified_at = now(),
           code_hash   = NULL        -- nothing left to crack after consumption
     WHERE id     = v_row.id
       AND status = 'pending';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('success', false,
            'error', 'No pending verification found. Please request a new code.');
    END IF;

    RETURN jsonb_build_object('success', true, 'phone', v_phone,
                              'message', 'Phone verified successfully!');
END;
$$;

COMMENT ON FUNCTION public.verify_phone_otp(uuid, text, text) IS
  'Verify a phone OTP. Service-role only. Single transaction: expiry check, attempt-limit check, bcrypt compare, atomic attempts++ and single-use consumption. Replaces the client-side read-then-write in verify-provider/actions.ts.';


-- -----------------------------------------------------------------------------
-- 1e. Expiry sweep (optional housekeeping; safe to call from pg_cron or a job)
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.expire_phone_verifications()
RETURNS integer
LANGUAGE sql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
    WITH swept AS (
        UPDATE public.phone_verifications
           SET status = 'expired'
         WHERE status = 'pending'
           AND expires_at <= now()
        RETURNING 1
    )
    SELECT count(*)::integer FROM swept;
$$;

COMMENT ON FUNCTION public.expire_phone_verifications() IS
  'Marks lapsed pending OTP challenges as expired. Service-role only.';


-- -----------------------------------------------------------------------------
-- 1f. RLS + grants
--
-- Every one of the 8 call sites uses `admin` = createAdminClient()
-- (src/lib/supabase/admin.ts -> SUPABASE_SERVICE_ROLE_KEY). No anon or
-- authenticated client touches this table anywhere in src/. So the narrowest
-- grant that the code demonstrably needs is: service_role only.
-- -----------------------------------------------------------------------------
ALTER TABLE public.phone_verifications ENABLE ROW LEVEL SECURITY;

-- NOTE on FORCE ROW LEVEL SECURITY: verified on this project that both
-- `postgres` (the table owner) and `service_role` carry rolbypassrls = true
-- (pg_roles), and BYPASSRLS defeats FORCE. FORCE would therefore be a no-op
-- today while silently breaking the SECURITY DEFINER functions below the
-- moment the table is reassigned to a non-bypassing owner. It is deliberately
-- NOT set. The real containment for the client roles is: RLS enabled, no
-- policy for anon/authenticated, and the REVOKEs below.

-- service_role has rolbypassrls on this project, so this policy is
-- defence-in-depth rather than the operative control: it is what keeps the
-- table reachable if BYPASSRLS is ever withdrawn, and it documents intent.
DROP POLICY IF EXISTS phone_verifications_service_role_all ON public.phone_verifications;
CREATE POLICY phone_verifications_service_role_all
    ON public.phone_verifications
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- No policy for anon/authenticated. With RLS enabled and no matching policy,
-- every client-side read returns zero rows even if a grant were restored.

-- THESE REVOKES ARE LOAD-BEARING, NOT COSMETIC.
-- Verified on this project (pg_default_acl): the public schema carries
-- ALTER DEFAULT PRIVILEGES granting anon and authenticated `arwdDxtm` on every
-- NEW TABLE and `X` (EXECUTE) on every NEW FUNCTION. So a freshly created
-- table is handed to the browser roles automatically. Without the revokes
-- below, only RLS would stand between a client and the OTP hashes.
REVOKE ALL ON public.phone_verifications FROM PUBLIC;
REVOKE ALL ON public.phone_verifications FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.phone_verifications TO service_role;

REVOKE ALL ON FUNCTION public.request_phone_otp(uuid, text, integer, integer, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.request_phone_otp(uuid, text, integer, integer, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.request_phone_otp(uuid, text, integer, integer, integer) TO service_role;

REVOKE ALL ON FUNCTION public.verify_phone_otp(uuid, text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.verify_phone_otp(uuid, text, text) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_phone_otp(uuid, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.expire_phone_verifications() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.expire_phone_verifications() FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.expire_phone_verifications() TO service_role;

REVOKE ALL ON FUNCTION public.hash_phone_verification_code() FROM PUBLIC;


-- #############################################################################
-- 2. FUNCTION public.find_listing_by_id_prefix(text)
-- #############################################################################
--
-- Single call site: src/app/listings/[slug]/page.tsx:43
--     .rpc("find_listing_by_id_prefix", { id_prefix: idPart })
--   -> argument name MUST be `id_prefix` (PostgREST binds RPC args by name).
--
-- Return shape from the MetadataListing interface at page.tsx:45-56 and the
-- fallback SELECT at page.tsx:63-67:
--     id, title, description, area, city, bedrooms, property_type,
--     rent_amount, currency, cover_photo       (status filtered to 'active')
-- The call site reads `listings?.[0]`, i.e. a SETOF/table result, not a scalar.
--
-- `idPart` is `slug.split("-").pop()`, and generateListingSlug()
-- (src/lib/listings/types.ts:309) appends `listing.id.slice(0, 8)` -- the first
-- hex group of the UUID, 8 chars, no hyphen.
--
-- EFFICIENCY: the prefix is converted into a UUID *range*, so the existing
-- primary-key btree (listings_pkey) does the work as an index range scan. This
-- deliberately avoids `id::text LIKE 'x%'`, which would need a separate
-- expression index on an I/O-based cast. No new index is required.
--
-- Caller client: createClient() from @/lib/supabase/server -> runs as anon or
-- authenticated. So this is SECURITY INVOKER (the default): RLS on
-- public.listings still applies, on top of the explicit status='active' filter
-- that mirrors the fallback query.
-- #############################################################################

CREATE OR REPLACE FUNCTION public.find_listing_by_id_prefix(id_prefix text)
RETURNS TABLE (
    id            uuid,
    title         text,
    description   text,
    area          text,
    city          text,
    bedrooms      integer,
    property_type text,
    rent_amount   numeric,
    currency      text,
    cover_photo   text
)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER          -- RLS on public.listings is respected.
PARALLEL SAFE
SET search_path = public, pg_temp
AS $$
DECLARE
    v_hex text;
    v_lo  text;
    v_hi  text;
BEGIN
    -- Normalise: keep hex digits only (drops the hyphens of a full UUID too, so
    -- a complete id works as well as an 8-char prefix).
    v_hex := lower(regexp_replace(coalesce(id_prefix, ''), '[^0-9a-fA-F]', '', 'g'));

    -- Refuse a prefix so short it would scan the whole table. 4 hex chars =
    -- 1/65536 of the keyspace, which is already selective enough. Returning
    -- zero rows makes the call site fall through to its own fallback.
    IF length(v_hex) < 4 OR length(v_hex) > 32 THEN
        RETURN;
    END IF;

    -- Lowest and highest UUID sharing this prefix, in canonical 8-4-4-4-12 form.
    v_lo := rpad(v_hex, 32, '0');
    v_hi := rpad(v_hex, 32, 'f');

    RETURN QUERY
    SELECT l.id, l.title, l.description, l.area, l.city, l.bedrooms,
           l.property_type, l.rent_amount, l.currency, l.cover_photo
      FROM public.listings l
     WHERE l.id >= (substr(v_lo, 1, 8)  || '-' || substr(v_lo, 9, 4)  || '-' ||
                    substr(v_lo, 13, 4) || '-' || substr(v_lo, 17, 4) || '-' ||
                    substr(v_lo, 21, 12))::uuid
       AND l.id <= (substr(v_hi, 1, 8)  || '-' || substr(v_hi, 9, 4)  || '-' ||
                    substr(v_hi, 13, 4) || '-' || substr(v_hi, 17, 4) || '-' ||
                    substr(v_hi, 21, 12))::uuid
       AND l.status = 'active'
     ORDER BY l.id
     LIMIT 1;
END;
$$;

COMMENT ON FUNCTION public.find_listing_by_id_prefix(text) IS
  'Resolve a listing from the short id suffix of its slug (first 8 hex chars of the uuid). Converts the prefix to a uuid range so listings_pkey serves it as an index range scan. SECURITY INVOKER: RLS applies, and only status=''active'' rows are returned.';

REVOKE ALL ON FUNCTION public.find_listing_by_id_prefix(text) FROM PUBLIC;
-- The listing detail page is public (SEO metadata), so anon needs this.
GRANT EXECUTE ON FUNCTION public.find_listing_by_id_prefix(text)
    TO anon, authenticated, service_role;

-- Composite index so the status predicate is settled from the index rather than
-- the heap when the range happens to straddle several listings.
CREATE INDEX IF NOT EXISTS idx_listings_id_status
    ON public.listings (id, status);


-- #############################################################################
-- 3. FUNCTION public.calculate_provider_profile_completion(uuid)
-- #############################################################################
--
-- Single call site: src/app/dashboard/provider/profile/actions.ts:978
--     .rpc("calculate_provider_profile_completion", { p_provider_id: provider.id })
--     ... return { percent: (data as number) || 0 }
--   -> argument name MUST be `p_provider_id`; return MUST be a bare scalar
--      number (integer), not a row or a jsonb object.
--   `provider.id` is public.service_providers.id (resolved at actions.ts:969
--   from .eq("user_id", user.id)).
--
-- Rubric (10 criteria x 10 points) derived from what the profile editor in
-- src/app/dashboard/provider/profile/actions.ts actually writes:
--     updateProfileBasics  (L269-278): headline, tagline, bio, years_experience, languages
--     updateSocialLinks    (L345): social_links
--     updateProfilePhoto   (L465): profile_photo_url
--     updateServiceAreas   (L572/612/662): provider_service_areas rows
--     updateWorkingHours   (L766/818): provider_availability_intervals rows
--   plus provider_services, and the contact pair (phone/email) that
--   verify-provider/actions.ts populates.
-- All referenced columns and all three child tables were verified to exist.
-- NOTE: `years_experience` is TEXT on this schema, not an integer.
--
-- IMPORTANT -- this function deliberately does NOT write
-- service_providers.profile_completion_percent:
--   (a) that column does not exist on this database (verified), and
--   (b) docs/FIX_TRIGGER_RECURSION.md records that the historical version's
--       UPDATE back into service_providers is exactly what caused the RLS
--       trigger recursion. A pure read-only calculation cannot recur.
-- The call site only consumes the returned number, so nothing is lost.
--
-- SECURITY DEFINER with an explicit ownership guard: the child tables carry
-- their own RLS, and reading them as the invoker is what previously tripped the
-- documented recursion. The guard keeps the blast radius to the caller's own
-- provider row.
-- #############################################################################

CREATE OR REPLACE FUNCTION public.calculate_provider_profile_completion(
    p_provider_id uuid
)
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sp      public.service_providers;
    -- See the note in request_phone_otp() on why the `role` GUC is used.
    v_role    text := coalesce(
                          nullif(current_setting('role', true), 'none'),
                          session_user::text);
    v_score   integer := 0;
BEGIN
    IF p_provider_id IS NULL THEN
        RETURN 0;
    END IF;

    SELECT * INTO v_sp
      FROM public.service_providers
     WHERE id = p_provider_id;

    IF NOT FOUND THEN
        RETURN 0;
    END IF;

    -- Ownership guard. service_role / internal callers (triggers, where the GUC
    -- is unset) pass; a logged-in user may only score their own provider row.
    IF v_role IN ('anon', 'authenticated') THEN
        IF auth.uid() IS NULL OR v_sp.user_id <> auth.uid() THEN
            RAISE EXCEPTION 'not authorised for provider %', p_provider_id
                USING ERRCODE = 'insufficient_privilege';
        END IF;
    END IF;

    -- 1. Headline
    IF coalesce(btrim(v_sp.headline), '') <> '' THEN v_score := v_score + 10; END IF;

    -- 2. Bio -- require some substance, not a single character.
    IF length(coalesce(btrim(v_sp.bio), '')) >= 50 THEN v_score := v_score + 10; END IF;

    -- 3. Years of experience (TEXT column on this schema)
    IF coalesce(btrim(v_sp.years_experience), '') <> '' THEN v_score := v_score + 10; END IF;

    -- 4. Languages (text[])
    IF v_sp.languages IS NOT NULL
       AND array_length(v_sp.languages, 1) >= 1 THEN v_score := v_score + 10; END IF;

    -- 5. Profile photo
    IF coalesce(btrim(v_sp.profile_photo_url), '') <> '' THEN v_score := v_score + 10; END IF;

    -- 6. At least one social link with a non-empty value
    IF v_sp.social_links IS NOT NULL
       AND jsonb_typeof(v_sp.social_links) = 'object'
       AND EXISTS (SELECT 1
                     FROM jsonb_each_text(v_sp.social_links) AS s(k, val)
                    WHERE coalesce(btrim(s.val), '') <> '')
    THEN v_score := v_score + 10; END IF;

    -- 7. Contact pair
    IF coalesce(btrim(v_sp.phone), '') <> ''
       AND coalesce(btrim(v_sp.email), '') <> '' THEN v_score := v_score + 10; END IF;

    -- 8. At least one active service offered
    IF EXISTS (SELECT 1 FROM public.provider_services ps
                WHERE ps.provider_id = p_provider_id
                  AND coalesce(ps.is_active, true))
    THEN v_score := v_score + 10; END IF;

    -- 9. At least one service area
    IF EXISTS (SELECT 1 FROM public.provider_service_areas psa
                WHERE psa.provider_id = p_provider_id)
    THEN v_score := v_score + 10; END IF;

    -- 10. At least one active availability interval (working hours)
    IF EXISTS (SELECT 1 FROM public.provider_availability_intervals pai
                WHERE pai.provider_id = p_provider_id
                  AND coalesce(pai.is_active, true))
    THEN v_score := v_score + 10; END IF;

    RETURN least(greatest(v_score, 0), 100);
END;
$$;

COMMENT ON FUNCTION public.calculate_provider_profile_completion(uuid) IS
  'Returns a 0-100 provider profile completion score from a 10x10 rubric. Read-only by design: it does NOT write back to service_providers, which is what caused the trigger recursion documented in docs/FIX_TRIGGER_RECURSION.md. SECURITY DEFINER with an auth.uid() ownership guard.';

REVOKE ALL ON FUNCTION public.calculate_provider_profile_completion(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.calculate_provider_profile_completion(uuid) FROM anon;
-- Call site uses createClient() (user-scoped) inside a provider-only dashboard
-- route, so `authenticated` is the role that needs it. anon never calls it.
GRANT EXECUTE ON FUNCTION public.calculate_provider_profile_completion(uuid)
    TO authenticated, service_role;

-- NO NEW INDEXES NEEDED for the three EXISTS probes. Verified against
-- pg_indexes: every child table already carries a btree on provider_id --
--   provider_services.idx_provider_services_provider_id
--   provider_service_areas.idx_provider_service_areas_provider_id
--   provider_availability_intervals.idx_provider_availability_provider
-- (plus partial and covering variants). Creating more under different names
-- would be pure write amplification, and IF NOT EXISTS would NOT have caught
-- the duplication, because the names differ.


-- #############################################################################
-- 4. FUNCTION public.set_config(text, text)  -- ALLOWLISTED GUC SETTER
-- #############################################################################
--
-- 14 call sites, all through a local helper named setAuditContext(), all on the
-- service-role admin client:
--   src/app/dashboard/provider/jobs/[id]/actions.ts:46,53
--   src/app/dashboard/provider/jobs/[id]/page.tsx:123,124
--   src/app/dashboard/provider/jobs/[id]/quote/actions.ts:46,49
--   src/app/dashboard/bookings/[id]/dispute/actions.ts:95,98
--   src/app/dashboard/bookings/[id]/quote/actions.ts:50,53
--   src/lib/services/payments.ts:57,60
--   src/lib/services/booking-lifecycle.ts:63,66
-- Shape at every site: .rpc("set_config", { setting: "...", value: "..." })
--   -> argument names MUST be `setting` and `value`; exactly two arguments.
--
-- WHAT THE APP IS TRYING TO DO: feed the audit trigger
-- public.auto_log_booking_status_change(), which reads
--     current_setting('app.current_user_id',   true)  -- falls back to the nil uuid
--     current_setting('app.current_user_role', true)  -- falls back to 'system'
-- and writes them into booking_status_history.changed_by / changed_by_role.
-- Only those two GUCs are ever read by anything in this database (verified by
-- scanning pg_get_functiondef over all public functions), and only those two
-- are ever passed by the app.
--
-- IS SECURITY DEFINER APPROPRIATE?  NO -- and this is deliberate:
--   * Setting a custom (two-part, non-reserved) GUC such as app.* needs no
--     special privilege in PostgreSQL. Any role can already do it. DEFINER buys
--     nothing.
--   * DEFINER would execute as the owner (postgres). If the allowlist were ever
--     widened or bypassed, the caller would gain the ability to set
--     superuser-only GUCs. That is a privilege-escalation primitive for no
--     benefit.
--   => SECURITY INVOKER, plus a hard allowlist, plus EXECUTE granted to
--      service_role only.
--
-- WHY is_local = true (transaction-scoped), NOT session-scoped:
--   Supabase serves PostgREST over a connection pool. A session-scoped
--   set_config would stick to the pooled backend and leak into the NEXT
--   request served by that connection -- which may belong to a different user.
--   The audit log would then attribute a status change to the wrong person.
--   Transaction-scoped is the only safe choice here.
--   CONSEQUENCE, documented in the .md: because each PostgREST request is its
--   own transaction, the value does not survive into the later UPDATE request,
--   so the trigger still records its fallbacks. The function is correct and
--   safe; the *pattern* in the app cannot work over PostgREST and needs an
--   application change. The call sites already .catch() and tolerate this.
-- #############################################################################

CREATE OR REPLACE FUNCTION public.set_config(setting text, value text)
RETURNS text
LANGUAGE plpgsql
VOLATILE
SECURITY INVOKER          -- deliberate: see the note above.
SET search_path = pg_catalog, pg_temp
AS $$
DECLARE
    -- The complete set of GUCs anything in this database reads. Extend this
    -- list (and only this list) if a new audit GUC is introduced.
    c_allowed constant text[] := ARRAY[
        'app.current_user_id',
        'app.current_user_role'
    ];
BEGIN
    IF setting IS NULL OR NOT (setting = ANY (c_allowed)) THEN
        RAISE EXCEPTION
            'set_config: setting %L is not allowlisted', setting
            USING ERRCODE = 'insufficient_privilege',
                  HINT    = 'Only app.current_user_id and app.current_user_role may be set.';
    END IF;

    -- Shape validation per setting, so the audit trigger's ::uuid cast and its
    -- role column cannot be poisoned.
    IF setting = 'app.current_user_id' THEN
        IF coalesce(value, '') <> ''
           AND value !~ '^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$'
        THEN
            RAISE EXCEPTION 'set_config: app.current_user_id must be a uuid or empty'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
    ELSIF setting = 'app.current_user_role' THEN
        IF coalesce(value, '') <> ''
           AND NOT (value = ANY (ARRAY['provider', 'customer', 'admin', 'system']))
        THEN
            RAISE EXCEPTION 'set_config: app.current_user_role must be one of provider, customer, admin, system'
                USING ERRCODE = 'invalid_parameter_value';
        END IF;
    END IF;

    -- is_local => true: transaction-scoped only. Never leaks across pooled
    -- requests. pg_catalog-qualified so this function cannot recurse into
    -- itself.
    RETURN pg_catalog.set_config(setting, coalesce(value, ''), true);
END;
$$;

COMMENT ON FUNCTION public.set_config(text, text) IS
  'Allowlisted, transaction-scoped GUC setter for the booking audit trigger. Only app.current_user_id and app.current_user_role may be set, and their values are shape-validated. SECURITY INVOKER by design: custom GUCs need no elevated privilege, and a DEFINER wrapper would be a privilege-escalation primitive. is_local=true prevents the value leaking across pooled PostgREST connections.';

REVOKE ALL ON FUNCTION public.set_config(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.set_config(text, text) FROM anon, authenticated;
-- All 14 call sites use createAdminClient(). Nothing else needs this.
GRANT EXECUTE ON FUNCTION public.set_config(text, text) TO service_role;


-- #############################################################################
-- 5. COLUMNS REPORTED MISSING
-- #############################################################################
--
-- 5a. public.services.keywords -- GENUINELY MISSING AND GENUINELY REFERENCED.
--     Call site: src/app/api/services/search/suggestions/route.ts:81
--         .from("services")
--         .or(`name.ilike.${searchPattern},keywords.cs.{${query}}`)
--     PostgREST `cs` = "contains" on an array, with `{...}` array literal
--     syntax => the column must be an array type. The adjacent column is
--     `name text`, and the values are free-text search terms, so text[].
--     Caller: createClient() from @/lib/supabase/server -> anon/authenticated.
--
-- 5b. public.listings.status -- ALREADY EXISTS (text, nullable). Not created.
--     The "missing status" in the audit report is phone_verifications.status,
--     which section 1 creates.
--
-- 5c. rating_average -- NOT a database column anywhere, by design. It is an
--     application view-model alias for service_providers.average_rating
--     (which exists, numeric). Not created. See the header note.
-- #############################################################################

ALTER TABLE public.services
    ADD COLUMN IF NOT EXISTS keywords text[] NOT NULL DEFAULT '{}'::text[];

COMMENT ON COLUMN public.services.keywords IS
  'Free-text search synonyms for this service. Queried with PostgREST ``keywords.cs.{term}`` by /api/services/search/suggestions. NOT NULL DEFAULT ''{}'' so the contains operator never has to cope with NULL.';

-- `cs` (@>) on a text[] is a GIN-indexable containment test.
CREATE INDEX IF NOT EXISTS idx_services_keywords_gin
    ON public.services USING gin (keywords);

-- public.services already has RLS enabled with services_public_read
-- (anon, authenticated, SELECT, USING true) and services_service_role_all
-- (service_role, ALL). Table-level grants already cover anon/authenticated/
-- service_role, and column-level grants are not in use, so the new column
-- inherits exactly the access the call site needs. Re-assert the policies so
-- this script is self-sufficient if they are ever dropped.
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS services_public_read ON public.services;
CREATE POLICY services_public_read
    ON public.services
    AS PERMISSIVE
    FOR SELECT
    TO anon, authenticated
    USING (true);

DROP POLICY IF EXISTS services_service_role_all ON public.services;
CREATE POLICY services_service_role_all
    ON public.services
    AS PERMISSIVE
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);


-- #############################################################################
-- 6. SELF-CHECK -- RAISES if anything this script was meant to create is
--    still missing or mis-shaped. Runs inside the same transaction, so a
--    failure rolls the whole migration back.
-- #############################################################################

DO $selfcheck$
DECLARE
    v_missing text[] := '{}';
BEGIN
    ---------------------------------------------------------------------------
    -- 1. phone_verifications: table, every derived column, constraints,
    --    indexes, trigger, RLS, policy, grants.
    ---------------------------------------------------------------------------
    IF to_regclass('public.phone_verifications') IS NULL THEN
        v_missing := array_append(v_missing, ('table public.phone_verifications')::text);
    ELSE
        -- Exact columns the 8 call sites require, plus the security columns.
        -- Names the offenders rather than just counting them.
        v_missing := v_missing || (
            SELECT coalesce(array_agg('phone_verifications column ' || req.c), '{}')
              FROM unnest(ARRAY['id','user_id','phone','code','code_hash',
                                'expires_at','attempts','max_attempts',
                                'status','verified_at','created_at',
                                'updated_at']) AS req(c)
             WHERE NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                 WHERE table_schema = 'public'
                   AND table_name   = 'phone_verifications'
                   AND column_name  = req.c));

        -- `code` must be nullable (the trigger nulls it) and `attempts`/`status`
        -- must be NOT NULL so the atomic increment can never hit a NULL.
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='phone_verifications'
                      AND column_name='attempts' AND is_nullable='YES') THEN
            v_missing := array_append(v_missing, ('phone_verifications.attempts must be NOT NULL')::text);
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='phone_verifications'
                      AND column_name='status' AND is_nullable='YES') THEN
            v_missing := array_append(v_missing, ('phone_verifications.status must be NOT NULL')::text);
        END IF;

        -- The plaintext-at-rest guard.
        IF NOT EXISTS (SELECT 1 FROM pg_constraint
                        WHERE conrelid = 'public.phone_verifications'::regclass
                          AND conname  = 'phone_verifications_no_plaintext_chk') THEN
            v_missing := array_append(v_missing, ('CHECK phone_verifications_no_plaintext_chk')::text);
        END IF;

        IF NOT EXISTS (SELECT 1 FROM pg_constraint
                        WHERE conrelid = 'public.phone_verifications'::regclass
                          AND conname  = 'phone_verifications_expiry_window_chk') THEN
            v_missing := array_append(v_missing, ('CHECK phone_verifications_expiry_window_chk')::text);
        END IF;

        -- The hash-on-write trigger.
        IF NOT EXISTS (SELECT 1 FROM pg_trigger
                        WHERE tgrelid = 'public.phone_verifications'::regclass
                          AND tgname  = 'trg_phone_verifications_hash_code'
                          AND NOT tgisinternal) THEN
            v_missing := array_append(v_missing, ('trigger trg_phone_verifications_hash_code')::text);
        END IF;

        -- RLS must be on, and only service_role/postgres may have a policy.
        IF NOT (SELECT relrowsecurity FROM pg_class
                 WHERE oid = 'public.phone_verifications'::regclass) THEN
            v_missing := array_append(v_missing, ('RLS not enabled on phone_verifications')::text);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_policies
                        WHERE schemaname='public' AND tablename='phone_verifications'
                          AND policyname='phone_verifications_service_role_all') THEN
            v_missing := array_append(v_missing, ('policy phone_verifications_service_role_all')::text);
        END IF;

        -- Hard security assertion: the browser roles must have NO privilege and
        -- NO policy on the OTP table.
        IF EXISTS (SELECT 1 FROM information_schema.role_table_grants
                    WHERE table_schema='public' AND table_name='phone_verifications'
                      AND grantee IN ('anon','authenticated','PUBLIC')) THEN
            v_missing := array_append(v_missing, ('SECURITY: anon/authenticated still hold grants on phone_verifications')::text);
        END IF;
        IF EXISTS (SELECT 1 FROM pg_policies
                    WHERE schemaname='public' AND tablename='phone_verifications'
                      AND (roles::text[] && ARRAY['anon','authenticated','public'])) THEN
            v_missing := array_append(v_missing, ('SECURITY: a client-role policy exists on phone_verifications')::text);
        END IF;

        -- Indexes.
        v_missing := v_missing || (
            SELECT coalesce(array_agg('missing index ' || req.i), '{}')
              FROM unnest(ARRAY['idx_phone_verifications_user_created',
                                'idx_phone_verifications_phone_created',
                                'idx_phone_verifications_pending',
                                'uq_phone_verifications_one_pending',
                                'idx_phone_verifications_expires']) AS req(i)
             WHERE NOT EXISTS (SELECT 1 FROM pg_indexes
                                WHERE schemaname='public' AND indexname = req.i));
    END IF;

    ---------------------------------------------------------------------------
    -- 2-4. Functions: exact identity arguments, so PostgREST's named-argument
    --      binding is guaranteed to resolve.
    ---------------------------------------------------------------------------
    IF to_regprocedure('public.request_phone_otp(uuid,text,integer,integer,integer)') IS NULL THEN
        v_missing := array_append(v_missing, ('function public.request_phone_otp(uuid,text,integer,integer,integer)')::text);
    END IF;

    IF to_regprocedure('public.verify_phone_otp(uuid,text,text)') IS NULL THEN
        v_missing := array_append(v_missing, ('function public.verify_phone_otp(uuid,text,text)')::text);
    END IF;

    IF to_regprocedure('public.expire_phone_verifications()') IS NULL THEN
        v_missing := array_append(v_missing, ('function public.expire_phone_verifications()')::text);
    END IF;

    -- The default privileges on this schema hand EXECUTE to anon on every new
    -- function, so assert the revokes actually took on the OTP surface.
    v_missing := v_missing || (
        SELECT coalesce(array_agg('SECURITY: ' || req.f ||
                                  ' still EXECUTable by a client role'), '{}')
          FROM unnest(ARRAY[
                   'public.request_phone_otp(uuid,text,integer,integer,integer)',
                   'public.verify_phone_otp(uuid,text,text)',
                   'public.expire_phone_verifications()',
                   'public.set_config(text,text)']) AS req(f)
         WHERE to_regprocedure(req.f) IS NOT NULL
           AND (has_function_privilege('anon',          req.f, 'EXECUTE')
             OR has_function_privilege('authenticated', req.f, 'EXECUTE')));

    IF to_regprocedure('public.find_listing_by_id_prefix(text)') IS NULL THEN
        v_missing := array_append(v_missing, ('function public.find_listing_by_id_prefix(text)')::text);
    ELSE
        -- Argument MUST be named id_prefix (page.tsx:43 binds by name).
        -- NOTE: pg_get_function_identity_arguments() includes the parameter
        -- NAME (e.g. 'id_prefix text'), so an earlier comparison against
        -- 'text' here could never be satisfied and fired spuriously. The
        -- proargnames check below is the correct test; the app calls
        -- .rpc("find_listing_by_id_prefix", { id_prefix: ... }), so the NAME is
        -- what actually matters to PostgREST.
        IF NOT EXISTS (
               SELECT 1 FROM pg_proc p
                WHERE p.oid = 'public.find_listing_by_id_prefix(text)'::regprocedure
                  AND p.proargnames[1] = 'id_prefix') THEN
            v_missing := array_append(v_missing, ('find_listing_by_id_prefix argument must be named id_prefix')::text);
        END IF;
        -- Must return a set of rows (call site reads listings?.[0]).
        IF NOT (SELECT proretset FROM pg_proc
                 WHERE oid = 'public.find_listing_by_id_prefix(text)'::regprocedure) THEN
            v_missing := array_append(v_missing, ('find_listing_by_id_prefix must RETURN SETOF/TABLE')::text);
        END IF;
        -- Must be SECURITY INVOKER so listings RLS still applies.
        IF (SELECT prosecdef FROM pg_proc
             WHERE oid = 'public.find_listing_by_id_prefix(text)'::regprocedure) THEN
            v_missing := array_append(v_missing, ('SECURITY: find_listing_by_id_prefix must be SECURITY INVOKER')::text);
        END IF;
    END IF;

    IF to_regprocedure('public.calculate_provider_profile_completion(uuid)') IS NULL THEN
        v_missing := array_append(v_missing, ('function public.calculate_provider_profile_completion(uuid)')::text);
    ELSE
        -- Argument MUST be named p_provider_id (actions.ts:979 binds by name).
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
             WHERE p.oid = 'public.calculate_provider_profile_completion(uuid)'::regprocedure
               AND p.proargnames[1] = 'p_provider_id') THEN
            v_missing := array_append(v_missing, ('calculate_provider_profile_completion argument must be named p_provider_id')::text);
        END IF;
        -- Must return a bare scalar integer (call site does `data as number`).
        IF (SELECT prorettype FROM pg_proc
             WHERE oid = 'public.calculate_provider_profile_completion(uuid)'::regprocedure)
            <> 'integer'::regtype
           OR (SELECT proretset FROM pg_proc
                WHERE oid = 'public.calculate_provider_profile_completion(uuid)'::regprocedure) THEN
            v_missing := array_append(v_missing, ('calculate_provider_profile_completion must RETURN integer (scalar)')::text);
        END IF;
    END IF;

    IF to_regprocedure('public.set_config(text,text)') IS NULL THEN
        v_missing := array_append(v_missing, ('function public.set_config(text,text)')::text);
    ELSE
        -- Arguments MUST be named setting, value (all 14 call sites bind by name).
        IF NOT EXISTS (
            SELECT 1 FROM pg_proc p
             WHERE p.oid = 'public.set_config(text,text)'::regprocedure
               AND p.proargnames[1] = 'setting'
               AND p.proargnames[2] = 'value') THEN
            v_missing := array_append(v_missing, ('public.set_config arguments must be named (setting, value)')::text);
        END IF;
        -- MUST NOT be SECURITY DEFINER (see section 4's rationale).
        IF (SELECT prosecdef FROM pg_proc
             WHERE oid = 'public.set_config(text,text)'::regprocedure) THEN
            v_missing := array_append(v_missing, ('SECURITY: public.set_config must NOT be SECURITY DEFINER')::text);
        END IF;
        -- The allowlist must actually reject an arbitrary GUC.
        BEGIN
            PERFORM public.set_config('log_min_duration_statement', '0');
            v_missing := array_append(v_missing, ('SECURITY: public.set_config accepted a non-allowlisted GUC')::text);
        EXCEPTION WHEN insufficient_privilege THEN
            NULL;   -- expected
        END;
        -- ...and must accept the two it is for.
        BEGIN
            PERFORM public.set_config('app.current_user_role', 'provider');
            PERFORM public.set_config('app.current_user_id',
                                      '00000000-0000-0000-0000-000000000001');
        EXCEPTION WHEN OTHERS THEN
            v_missing := array_append(v_missing, ('public.set_config rejected an allowlisted GUC: ' || SQLERRM)::text);
        END;
    END IF;

    ---------------------------------------------------------------------------
    -- 5. services.keywords
    ---------------------------------------------------------------------------
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                    WHERE table_schema='public' AND table_name='services'
                      AND column_name='keywords') THEN
        v_missing := array_append(v_missing, ('column public.services.keywords')::text);
    ELSE
        IF (SELECT udt_name FROM information_schema.columns
             WHERE table_schema='public' AND table_name='services'
               AND column_name='keywords') <> '_text' THEN
            v_missing := array_append(v_missing, ('public.services.keywords must be text[]')::text);
        END IF;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                    WHERE schemaname='public' AND indexname='idx_services_keywords_gin') THEN
        v_missing := array_append(v_missing, ('index idx_services_keywords_gin')::text);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                    WHERE schemaname='public' AND indexname='idx_listings_id_status') THEN
        v_missing := array_append(v_missing, ('index idx_listings_id_status')::text);
    END IF;

    ---------------------------------------------------------------------------
    -- Functional smoke tests (SELECT only, no rows written).
    ---------------------------------------------------------------------------
    BEGIN
        PERFORM * FROM public.find_listing_by_id_prefix('a1b2c3d4');
    EXCEPTION WHEN OTHERS THEN
        v_missing := array_append(v_missing, ('find_listing_by_id_prefix raised: ' || SQLERRM)::text);
    END;

    BEGIN
        IF public.calculate_provider_profile_completion(
               '00000000-0000-0000-0000-000000000000'::uuid) <> 0 THEN
            v_missing := array_append(v_missing, ('calculate_provider_profile_completion(unknown uuid) should be 0')::text);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_missing := array_append(v_missing, ('calculate_provider_profile_completion raised: ' || SQLERRM)::text);
    END;

    -- bcrypt must be reachable from the search_path the trigger uses.
    BEGIN
        IF extensions.crypt('123456', extensions.gen_salt('bf', 10)) IS NULL THEN
            v_missing := array_append(v_missing, ('extensions.crypt returned NULL')::text);
        END IF;
    EXCEPTION WHEN OTHERS THEN
        v_missing := array_append(v_missing, ('pgcrypto bcrypt unavailable: ' || SQLERRM)::text);
    END;

    ---------------------------------------------------------------------------
    IF array_length(v_missing, 1) IS NOT NULL THEN
        RAISE EXCEPTION E'C-missing-objects.sql SELF-CHECK FAILED (% problem(s)):\n  - %',
            array_length(v_missing, 1),
            array_to_string(v_missing, E'\n  - ');
    END IF;

    RAISE NOTICE 'C-missing-objects.sql self-check PASSED: all objects present and correctly shaped.';
END
$selfcheck$;

-- COMMIT removed: see note above.

-- =============================================================================
-- POST-APPLY APPLICATION CHANGES THAT ARE STILL REQUIRED
-- (not applied here -- this file touches the database only)
--
-- src/app/dashboard/verify-provider/actions.ts
--   1. sendPhoneOTP: replace the rate-limit count (L109-115), the DELETE
--      (L137-141) and the INSERT (L144-152) with
--          admin.rpc("request_phone_otp", { p_user_id: userId, p_phone: cleanPhone })
--      and read `otp` from the returned jsonb to pass to sendOTP().
--   2. DELETE the `devOtp` field from OTPResult (L33) and the whole
--      `if (!smsEnabled)` branch at L168-176 (`devOtp: otp` sits on L174).
--      Returning the live OTP to the browser defeats every control above; the
--      dev-mode code is already printed to the server console by @/lib/sms.
--   3. verifyPhoneOTP: replace L224-287 with
--          admin.rpc("verify_phone_otp", { p_user_id: userId,
--                                          p_phone: cleanPhone, p_code: code })
--      and branch on the returned jsonb. Until this is done, verification will
--      FAIL CLOSED (the `code` column always reads NULL), which is the correct
--      direction to fail in.
--
-- setAuditContext (7 files, 14 calls): the two-request pattern cannot work over
--   PostgREST's connection pool -- see section 4. Either fold the actor into a
--   single RPC that also performs the status change, or add explicit
--   changed_by / changed_by_role columns to the UPDATE payload.
-- =============================================================================
