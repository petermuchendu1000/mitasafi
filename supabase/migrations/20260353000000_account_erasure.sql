-- =============================================================================
-- Account erasure: the thing the product already promises and cannot do
-- =============================================================================
-- MEASURED STATE BEFORE THIS MIGRATION
--
-- src/app/dashboard/settings/actions.ts:174 requestAccountDeletion() sets
-- metadata.deletion_requested_at on the caller's profile, and
-- CustomerSettingsClient.tsx:99 tells the user:
--
--     "Deletion requested -- our team will process your request within 48 hours"
--
-- Nothing processes it. There is no function, no script, no migration and no
-- admin route that acts on deletion_requested_at. The platform collects
-- erasure requests it has no mechanism to fulfil, and tells people a deadline.
-- Under the Data Protection Act 2019 that is the exposure -- not the deletion.
--
-- WHY ERASURE IS ANONYMISATION AND NOT DELETION
--
-- Not a preference. Four measured constraints, in order of how hard they bite:
--
-- 1. A HARD DELETE IS IMPOSSIBLE. Four inbound foreign keys on profiles are
--    ON DELETE RESTRICT:
--      booking_payments.payer_id      reviews.reviewer_id
--      booking_disputes.reported_by   booking_media.uploaded_by
--    A user who has ever paid for a booking or written a review cannot be
--    deleted. The statement fails with 23503. That is deliberate -- 20260345
--    chose RESTRICT for exactly these.
--
-- 2. IF IT WERE POSSIBLE IT WOULD DESTROY OTHER PEOPLE'S RECORDS.
--    bookings.customer_id is ON DELETE CASCADE, so deleting a customer would
--    delete the provider's record of jobs they did and were paid for.
--    listings.landlord_id is CASCADE, so deleting a landlord would delete
--    listings other users have saved and enquired about. One person's erasure
--    right does not extend to deleting a second person's business records.
--
-- 3. FINANCIAL RECORDS MUST BE RETAINED. docs/MITASAFI_SERVICE_CONSTITUTION.md
--    sets a two-year floor; docs/CANONICAL_WORK_COMMITMENT_MODEL_V1.md records
--    "FOREVER (indefinite retention)" for commitments, reason given as
--    "Compliance (financial record retention)".
--
-- 4. profiles IS THE IDENTITY ANCHOR. 20260347 repointed the auth.users
--    references onto it; 38 foreign keys target it. Removing the row is not a
--    local operation.
--
-- So the profiles row SURVIVES, emptied of personal data. Keeping it is what
-- makes the counterparty's records coherent: a review still has a reviewer, a
-- booking still has a customer, and both now resolve to a tombstone instead of
-- a name. Anonymisation-in-place gets this for free; a delete-and-null-out
-- design would leave dangling references everywhere.
--
-- THE THREE CATEGORIES, AND WHY EACH ROW IS IN ITS CATEGORY
--
-- DELETED -- rows that are only ever the user's own, with no counterparty who
--   has a claim on them: phone_verifications, saved_listings, saved_providers,
--   search_alerts, search_queries, user_preferences, notifications,
--   listing_waitlist, review_helpful_votes, analytics_events. Verified, not
--   assumed: none of these ten tables has a single inbound foreign key, so
--   nobody else loses anything.
--
-- locations -- BOTH, and this was a correction. The first version of this
--   function deleted them outright as "the user's own saved addresses". It is
--   the only erase target with inbound references, and all four are RESTRICT:
--     bookings.service_location_id
--     booking_personal_details.service_location_id
--     booking_delivery_details.pickup_location_id / .dropoff_location_id
--   A saved address that a booking points at is not private data, it is the
--   counterparty's record of WHERE THE JOB HAPPENED, and deleting it raises
--   23503 and aborts the whole erasure.
--
--   Nor can it be scrubbed: prevent_location_address_mutation() freezes every
--   address field on a booked location and raises 23514. It permits
--   access_notes, and its own comment explains that this is the field holding
--   gate codes and caretaker contacts -- the live security-sensitive part.
--
--   So: locations nothing references are DELETED; a booked location keeps its
--   address (RETAINED, as immutable dispute evidence) and loses its
--   access_notes. Both of these were found by account_erasure_test.sql against
--   a fully-populated fixture; the migration's own lighter guard saw neither,
--   and the first version of this function aborted with 23503 on any account
--   that had ever made a booking.
--
-- SCRUBBED -- rows a counterparty keeps, which carry a COPY of the user's
--   contact details: profiles itself, service_providers, inquiries,
--   listing_inquiries. The landlord keeps the fact of the enquiry; the phone
--   number in it goes.
--
-- RETAINED, PII AND ALL -- booking_payments, payments, provider_payouts. These
--   hold mpesa_phone, mpesa_name, mpesa_receipt_number and bank_account. They
--   are financial records and the identifying fields are part of the record,
--   not decoration: an M-Pesa receipt without the payer's number cannot be
--   reconciled against a statement. This is a lawful-basis retention and it is
--   named here so that it is a decision on the record rather than an omission
--   someone discovers later. erase_account REPORTS the retained row counts in
--   its return value for exactly that reason.
--
-- WHAT THIS DELIBERATELY DOES NOT TOUCH, AND WHY
--
--   tenants -- full_name, phone, id_number of a THIRD PARTY, entered by a
--     landlord. Erasing the landlord does not give anyone the right to erase
--     the tenant's data, and it equally should not sit under a landlord who no
--     longer exists. That is a product and legal decision about someone who did
--     not make the request, so this function leaves it alone and reports the
--     count. Guessing would be worse than flagging.
--
--   reviews -- kept entirely, text included. The review is about the provider
--     and their rating is computed from it; the authorship becomes anonymous
--     automatically because the profile it points at is now a tombstone.
--
--   inquiries.message / listing_inquiries.message -- the counterparty's record
--     of a conversation. Contact fields are scrubbed around it. If a message
--     body itself contains a phone number this does not remove it; flagged
--     rather than solved, because scrubbing free text is a different problem.
--
-- ROWS AFFECTED BY THIS MIGRATION: 0. It creates a function and erases nothing.
-- =============================================================================

CREATE OR REPLACE FUNCTION public.erase_account(
  p_user_id uuid,
  p_reason  text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $function$
DECLARE
  v_tombstone_email text;
  v_requested_at    text;
  v_already         timestamptz;
  v_meta            jsonb;
  v_deleted         jsonb := '{}'::jsonb;
  v_retained        jsonb := '{}'::jsonb;
  v_flagged         jsonb := '{}'::jsonb;
  n                 bigint;
  v_sql             text;
  v_cols            text[];
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'erase_account: p_user_id is required'
      USING ERRCODE = 'null_value_not_allowed';
  END IF;
  IF p_reason IS NULL OR btrim(p_reason) = '' THEN
    RAISE EXCEPTION 'erase_account: p_reason is required and must not be blank'
      USING ERRCODE = 'null_value_not_allowed';
  END IF;

  SELECT metadata INTO v_meta FROM public.profiles WHERE id = p_user_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'erase_account: no profile for %', p_user_id
      USING ERRCODE = 'no_data_found';
  END IF;

  v_meta := coalesce(v_meta, '{}'::jsonb);
  v_already      := (v_meta->>'erased_at')::timestamptz;
  v_requested_at := v_meta->>'deletion_requested_at';

  -- Idempotent, and it says so. Re-running must not append a second erasure
  -- record or overwrite the original erased_at with a later one -- that
  -- timestamp is the evidence of when the obligation was discharged.
  IF v_already IS NOT NULL THEN
    RETURN jsonb_build_object(
      'user_id', p_user_id, 'already_erased', true, 'erased_at', v_already);
  END IF;

  v_tombstone_email := 'erased-' || replace(p_user_id::text, '-', '') || '@erased.invalid';

  -- =========================================================================
  -- 1. DELETE: rows with no counterparty
  -- =========================================================================
  -- Counted individually rather than as a total. An erasure that silently
  -- removed nothing from a table it was supposed to clear would otherwise look
  -- identical to one that worked.
  -- locations is the one erase target other tables point at, and every such FK
  -- is RESTRICT, so a blanket DELETE raises 23503 and aborts the erasure the
  -- moment the user has ever booked anything. Delete what nothing references;
  -- scrub the rest below.
  DELETE FROM public.locations l
   WHERE l.user_id = p_user_id
     AND NOT EXISTS (SELECT 1 FROM public.bookings b WHERE b.service_location_id = l.id)
     AND NOT EXISTS (SELECT 1 FROM public.booking_personal_details d WHERE d.service_location_id = l.id)
     AND NOT EXISTS (SELECT 1 FROM public.booking_delivery_details d
                      WHERE d.pickup_location_id = l.id OR d.dropoff_location_id = l.id);
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('locations', n);

  -- The survivors can only be PARTIALLY scrubbed, and that is not a compromise
  -- this function chose -- prevent_location_address_mutation() freezes
  -- address_line1, address_line2, area, city, county, country, latitude,
  -- longitude and location_type on any location a booking references, raising
  -- 23514. The booked address is deliberately immutable evidence of where a job
  -- took place.
  --
  -- That same trigger names access_notes as mutable, and its own comment says
  -- why it changes: "Gate codes change, caretaker contact changes". So
  -- access_notes is the field that actually carries live security-sensitive
  -- detail, and it is the field erasure can and must clear.
  --
  -- The address itself therefore joins the RETAINED category below, for the
  -- same reason as the financial records: it is part of a record belonging to
  -- someone else, kept under a deliberate invariant, and reported rather than
  -- quietly skipped.
  UPDATE public.locations
     SET access_notes = NULL
   WHERE user_id = p_user_id AND access_notes IS NOT NULL;
  GET DIAGNOSTICS n = ROW_COUNT;
  v_deleted := v_deleted || jsonb_build_object('location_access_notes_cleared', n);

  DELETE FROM public.phone_verifications  WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('phone_verifications', n);
  DELETE FROM public.saved_listings       WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('saved_listings', n);
  DELETE FROM public.saved_providers      WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('saved_providers', n);
  DELETE FROM public.search_alerts        WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('search_alerts', n);
  DELETE FROM public.search_queries       WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('search_queries', n);
  DELETE FROM public.user_preferences     WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('user_preferences', n);
  DELETE FROM public.notifications        WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('notifications', n);
  DELETE FROM public.listing_waitlist     WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('listing_waitlist', n);
  DELETE FROM public.review_helpful_votes WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('review_helpful_votes', n);
  DELETE FROM public.analytics_events     WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_deleted := v_deleted || jsonb_build_object('analytics_events', n);

  -- =========================================================================
  -- 2. SCRUB: contact copies a counterparty keeps
  -- =========================================================================
  -- name and phone are NOT NULL on BOTH tables (inquiries requires
  -- listing_id, landlord_id, name, phone; listing_inquiries requires
  -- listing_id, name, phone, message), so neither can be nulled. The all-zero
  -- number is the tombstone: it is not dialable and it keeps the row valid.
  -- email is nullable on both and is therefore removed outright.
  UPDATE public.inquiries
     SET name  = 'Erased account',
         phone = '+000000000000',
         email = NULL
   WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_flagged := v_flagged || jsonb_build_object('inquiries_scrubbed', n);

  UPDATE public.listing_inquiries
     SET name  = 'Erased account',
         phone = '+000000000000',
         email = NULL
   WHERE user_id = p_user_id;
  GET DIAGNOSTICS n = ROW_COUNT; v_flagged := v_flagged || jsonb_build_object('listing_inquiries_scrubbed', n);

  -- =========================================================================
  -- 3. LEAVE THE MARKETPLACE
  -- =========================================================================
  -- is_active = false is sufficient and is checked rather than assumed: the
  -- public read policies on service_providers and, since 20260349, on
  -- provider_portfolio and provider_service_areas all require
  -- is_active = true AND account_status = 'active'. account_status is
  -- deliberately NOT changed -- it carries no CHECK constraint, so inventing a
  -- value like 'erased' would put a string into a column other code compares
  -- against without anything to catch a mismatch.
  UPDATE public.service_providers
     SET is_active            = false,
         business_name        = 'Erased account',
         email                = NULL,
         phone                = '+000000000000',
         whatsapp             = NULL,
         bio                  = NULL,
         headline             = NULL,
         tagline              = NULL,
         profile_photo_url    = NULL,
         cover_photo_url      = NULL,
         business_photos      = NULL,
         portfolio_images     = NULL,
         social_links         = NULL,
         tax_id               = NULL,
         registration_number  = NULL,
         primary_location     = NULL
   WHERE user_id = p_user_id;
  -- phone is NOT NULL with a format CHECK (^\+?[0-9]{10,15}$), so it cannot be
  -- nulled or blanked; the all-zero number satisfies the constraint and is not
  -- dialable. Confirmed against the live schema, not assumed -- see
  -- src/lib/identity/provider-profile.ts for the same constraint.

  -- Every role deactivated. get_user_roles, user_has_role and
  -- current_user_has_role all filter on is_active, so this removes every
  -- capability without deleting the history of what was held. The user_roles
  -- trigger from 20260352 then resets profiles.primary_role to NULL by itself.
  UPDATE public.user_roles SET is_active = false
   WHERE user_id = p_user_id AND is_active;

  -- A landlord's listings must stop being published. 'archived' is a value
  -- listings_status_check permits; it is not a new vocabulary.
  UPDATE public.listings SET status = 'archived'
   WHERE landlord_id = p_user_id AND status <> 'archived';
  GET DIAGNOSTICS n = ROW_COUNT; v_flagged := v_flagged || jsonb_build_object('listings_archived', n);

  -- =========================================================================
  -- 4. THE PROFILE ITSELF
  -- =========================================================================
  -- is_verified is GENERATED from verification_level (20260344), so it is not
  -- assigned here; setting verification_level is what moves it.
  UPDATE public.profiles
     SET email              = v_tombstone_email,
         full_name          = 'Erased account',
         phone              = NULL,
         avatar_url         = NULL,
         verification_level = 'none',
         metadata           = jsonb_build_object(
           'erased_at',                   now(),
           'erasure_reason',              btrim(p_reason),
           'deletion_requested_at',       v_requested_at
         )
   WHERE id = p_user_id;
  -- metadata is REPLACED, not merged. Merging would preserve whatever the
  -- client had put in a column it can write freely, which is the opposite of
  -- erasure. deletion_requested_at is carried across on purpose: it is the
  -- record that the person asked.

  -- =========================================================================
  -- 5. auth.users -- the login credential and the email live here
  -- =========================================================================
  -- Without this step the account is not erased in any sense a person would
  -- recognise: they could still sign in, and their address is still stored.
  --
  -- Built as dynamic SQL from the columns that actually exist because this
  -- schema is Supabase's, not ours: the CI bootstrap's auth.users has only
  -- (id, email, created_at), and a static statement naming banned_until would
  -- make this migration unappliable from scratch. It also means a future
  -- Supabase change removing a column degrades instead of breaking.
  SELECT array_agg(a.attname) INTO v_cols
    FROM pg_attribute a JOIN pg_class c ON c.oid = a.attrelid
    JOIN pg_namespace ns ON ns.oid = c.relnamespace AND ns.nspname = 'auth'
   WHERE c.relname = 'users' AND a.attnum > 0 AND NOT a.attisdropped;

  v_sql := 'UPDATE auth.users SET email = $2';
  IF 'phone'              = ANY (v_cols) THEN v_sql := v_sql || ', phone = NULL'; END IF;
  IF 'encrypted_password' = ANY (v_cols) THEN v_sql := v_sql || ', encrypted_password = NULL'; END IF;
  IF 'raw_user_meta_data' = ANY (v_cols) THEN v_sql := v_sql || ', raw_user_meta_data = ''{}''::jsonb'; END IF;
  IF 'email_change'       = ANY (v_cols) THEN v_sql := v_sql || ', email_change = NULL'; END IF;
  IF 'phone_change'       = ANY (v_cols) THEN v_sql := v_sql || ', phone_change = NULL'; END IF;
  -- banned_until stops any session or magic link from working again. Far
  -- future rather than a flag because it is the mechanism GoTrue already
  -- honours; a column we invented would be ignored by it.
  IF 'banned_until'       = ANY (v_cols) THEN v_sql := v_sql || ', banned_until = ''2400-01-01''::timestamptz'; END IF;
  v_sql := v_sql || ' WHERE id = $1';
  EXECUTE v_sql USING p_user_id, v_tombstone_email;

  -- =========================================================================
  -- 6. REPORT WHAT WAS KEPT
  -- =========================================================================
  -- The point of reporting these is that erasure is PARTIAL by design, and a
  -- caller who cannot see what remains cannot answer a data-subject request
  -- about it.
  SELECT count(*) INTO n FROM public.booking_payments WHERE payer_id = p_user_id;
  v_retained := v_retained || jsonb_build_object('booking_payments', n);
  SELECT count(*) INTO n FROM public.payments WHERE confirmed_by = p_user_id;
  v_retained := v_retained || jsonb_build_object('payments_confirmed_by', n);
  SELECT count(*) INTO n FROM public.provider_payouts WHERE approved_by = p_user_id;
  v_retained := v_retained || jsonb_build_object('provider_payouts_approved_by', n);
  SELECT count(*) INTO n FROM public.reviews WHERE reviewer_id = p_user_id;
  v_retained := v_retained || jsonb_build_object('reviews', n);
  -- payments.confirmed_by and provider_payouts.approved_by are ACTOR columns:
  -- they record that this person approved someone else's money movement, not
  -- that it was theirs. They are reported because they are references to this
  -- person that survive erasure, which is what a data-subject request asks
  -- about -- but they are not this person's transactions.
  SELECT count(*) INTO n FROM public.bookings WHERE customer_id = p_user_id;
  v_retained := v_retained || jsonb_build_object('bookings', n);
  SELECT count(*) INTO n FROM public.booking_disputes WHERE reported_by = p_user_id;
  v_retained := v_retained || jsonb_build_object('booking_disputes', n);
  SELECT count(*) INTO n FROM public.booking_media WHERE uploaded_by = p_user_id;
  v_retained := v_retained || jsonb_build_object('booking_media', n);
  -- Addresses that cannot be erased because a booking froze them. Counted into
  -- `retained` rather than `flagged` because that is what they are: data about
  -- this person that the platform is keeping, deliberately, with a reason.
  SELECT count(*) INTO n FROM public.locations l
   WHERE l.user_id = p_user_id
     AND EXISTS (SELECT 1 FROM public.bookings b WHERE b.service_location_id = l.id);
  v_retained := v_retained || jsonb_build_object('booked_addresses_frozen', n);

  -- Third-party data this function deliberately does not decide about.
  SELECT count(*) INTO n FROM public.tenants WHERE created_by = p_user_id;
  v_flagged := v_flagged || jsonb_build_object('tenants_records_left_untouched', n);

  INSERT INTO public.audit_log
    (user_id, user_role, action, entity_type, entity_id, details)
  VALUES
    (NULL, 'system', 'account_erased', 'profiles', p_user_id,
     jsonb_build_object(
       'reason',                btrim(p_reason),
       'db_role',               current_user,
       'deletion_requested_at', v_requested_at,
       'deleted',               v_deleted,
       'retained',              v_retained,
       'flagged',               v_flagged
     ));
  -- user_id is NULL: the actor holds the service-role key and is not a user.
  -- entity_id is the erased profile, so the trail is searchable by subject --
  -- which is what a data-subject request needs. The audit row deliberately
  -- records NO personal data: not the old email, not the old name. An audit
  -- trail that preserved what was erased would defeat the erasure.

  RETURN jsonb_build_object(
    'user_id',        p_user_id,
    'already_erased', false,
    'erased_at',      now(),
    'deleted',        v_deleted,
    'retained',       v_retained,
    'flagged',        v_flagged
  );
END
$function$;

COMMENT ON FUNCTION public.erase_account(uuid, text) IS
  'Anonymises an account in place: deletes rows with no counterparty, scrubs '
  'contact copies, deactivates roles/provider/listings, tombstones profiles and '
  'auth.users. RETAINS financial records including their mpesa/bank fields, and '
  'reports what it kept. service_role EXECUTE only. Idempotent.';

REVOKE ALL ON FUNCTION public.erase_account(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.erase_account(uuid, text) TO service_role;
-- Named explicitly: ALTER DEFAULT PRIVILEGES on schema public grants EXECUTE to
-- anon and authenticated DIRECTLY on every new function, so REVOKE FROM PUBLIC
-- does not reach it. A self-service erase_account would let anyone erase anyone.


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  bad  text;
  v_ok boolean := true;
  v_m  text    := '';
  u    uuid    := '00000000-0000-4000-8000-00000000e2a5';
  r    jsonb;
  got  record;
BEGIN
  -- ---- shape ---------------------------------------------------------------
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname='public' AND p.proname='erase_account' AND p.prosecdef
  ) THEN RAISE EXCEPTION 'erase_account is missing or not SECURITY DEFINER'; END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace,
         unnest(coalesce(p.proconfig, ARRAY[]::text[])) c
     WHERE n.nspname='public' AND p.proname='erase_account' AND c LIKE 'search_path=%'
  ) THEN RAISE EXCEPTION 'erase_account is SECURITY DEFINER without a pinned search_path'; END IF;

  -- ---- THE ONE THAT MATTERS ----------------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='erase_account'
       AND (has_function_privilege('anon', p.oid, 'EXECUTE')
            OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))
  ) THEN
    RAISE EXCEPTION 'erase_account is executable by a client role -- any signed-in '
      'user could erase any account';
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
     WHERE n.nspname='public' AND p.proname='erase_account'
       AND has_function_privilege('service_role', p.oid, 'EXECUTE')
  ) THEN RAISE EXCEPTION 'erase_account is not executable by service_role'; END IF;

  -- ---- the relock invariant, restated -------------------------------------
  SELECT string_agg(p.oid::regprocedure::text, ', ') INTO bad
    FROM pg_proc p JOIN pg_namespace ns ON ns.oid = p.pronamespace
   WHERE ns.nspname='public' AND p.prosecdef
     AND pg_get_function_result(p.oid) <> 'trigger'
     AND p.proname <> 'increment_listing_views'
     AND (has_function_privilege('anon', p.oid, 'EXECUTE')
          OR has_function_privilege('authenticated', p.oid, 'EXECUTE'));
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'definer surface is client-executable: %', bad;
  END IF;

  -- ---- the RESTRICT constraints this design exists because of -------------
  -- If these ever became CASCADE, a hard delete would start succeeding and
  -- would take the counterparty's records with it. The premise of this whole
  -- migration would be false and the comment above would be a lie.
  SELECT string_agg(c.conname, ', ') INTO bad
    FROM (VALUES ('booking_payments_payer_id_fkey'),
                 ('reviews_reviewer_id_fkey'),
                 ('booking_disputes_reported_by_fkey'),
                 ('booking_media_uploaded_by_fkey')) AS want(nm)
    JOIN pg_constraint c ON c.conname = want.nm
   WHERE c.confrelid = 'public.profiles'::regclass AND c.confdeltype <> 'r';
  IF bad IS NOT NULL THEN
    RAISE EXCEPTION 'these are no longer ON DELETE RESTRICT, so a hard profile '
      'delete can now destroy counterparty records: %', bad;
  END IF;

  -- ---- AND IT ACTUALLY WORKS ---------------------------------------------
  -- Structural checks cannot tell a working erasure from a no-op. Fixtures,
  -- rolled back by a sentinel exception; PL/pgSQL variables survive it, so the
  -- verdict does.
  BEGIN
    INSERT INTO auth.users (id, email) VALUES (u, 'erase-guard@test.invalid');
    INSERT INTO public.profiles (id, email, full_name, phone, metadata)
    VALUES (u, 'erase-guard@test.invalid', 'Real Name', '+254711111111',
            jsonb_build_object('deletion_requested_at','2026-01-01','junk','keep me out'));
    INSERT INTO public.user_roles (user_id, role, is_active) VALUES (u,'landlord',true);
    INSERT INTO public.locations (user_id, address_line1) VALUES (u,'12 Real Street');

    r := public.erase_account(u, 'guard: verify the function does something');

    SELECT email, full_name, phone, metadata INTO got
      FROM public.profiles WHERE id = u;
    IF got.full_name <> 'Erased account' OR got.phone IS NOT NULL THEN
      v_ok := false; v_m := v_m || 'profile not tombstoned; ';
    END IF;
    IF got.email = 'erase-guard@test.invalid' THEN
      v_ok := false; v_m := v_m || 'email not replaced; ';
    END IF;
    IF got.metadata ? 'junk' THEN
      v_ok := false; v_m := v_m || 'metadata was merged instead of replaced; ';
    END IF;
    IF got.metadata->>'deletion_requested_at' IS DISTINCT FROM '2026-01-01' THEN
      v_ok := false; v_m := v_m || 'the original request date was lost; ';
    END IF;
    IF EXISTS (SELECT 1 FROM public.locations WHERE user_id = u) THEN
      v_ok := false; v_m := v_m || 'locations survived; ';
    END IF;
    IF EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = u AND is_active) THEN
      v_ok := false; v_m := v_m || 'a role is still active; ';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = u) THEN
      v_ok := false; v_m := v_m || 'the profile row was deleted, not anonymised; ';
    END IF;
    IF (SELECT email FROM auth.users WHERE id = u) = 'erase-guard@test.invalid' THEN
      v_ok := false; v_m := v_m || 'auth.users.email not scrubbed; ';
    END IF;
    IF (r->>'already_erased')::boolean IS NOT FALSE THEN
      v_ok := false; v_m := v_m || 'first erasure reported already_erased; ';
    END IF;

    r := public.erase_account(u, 'guard: second call');
    IF (r->>'already_erased')::boolean IS NOT TRUE THEN
      v_ok := false; v_m := v_m || 'second erasure is not idempotent; ';
    END IF;

    RAISE EXCEPTION 'ERASE_GUARD_ROLLBACK';
  EXCEPTION
    WHEN raise_exception THEN
      IF SQLERRM <> 'ERASE_GUARD_ROLLBACK' THEN RAISE; END IF;
  END;

  IF NOT v_ok THEN
    RAISE EXCEPTION 'erase_account does not work: %', v_m;
  END IF;

  RAISE NOTICE 'account_erasure: erase_account installed, service_role only, behaviour verified';
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
-- DROP FUNCTION IF EXISTS public.erase_account(uuid, text);
--
-- Dropping it un-erases nobody; it removes the only mechanism for honouring a
-- request the settings page still accepts.
-- =============================================================================
