-- =============================================================================
-- service_providers: apply the column allowlist to INSERT, not only to UPDATE
-- =============================================================================
-- 20260329000000_lock_client_write_surface.sql withheld eight columns from
-- `authenticated` on this table -- the trust signals, the money, and the
-- derived statistics:
--
--   account_status  average_rating  is_verified  total_earnings
--   total_jobs_completed  total_reviews  verification_badge  wallet_balance
--
-- It did that by dropping table-level UPDATE and re-granting 42 of the 50
-- columns by name. That half is correct and provider-activation-privilege.test.ts
-- documents it.
--
-- It was never done for INSERT. Measured on the live project:
--
--   table_level_update = false,  update_granted = 42 of 50   <- a real allowlist
--   table_level_insert = TRUE,   insert_granted = 50 of 50   <- no allowlist
--
-- A column REVOKE is inert while the table privilege is held, so all 50 columns
-- were insertable. The eight columns a provider must never write were writable
-- exactly once -- at creation.
--
-- WHY THAT IS A MONEY DEFECT, NOT ONLY UNTIDY
--
-- RLS policy providers_own_insert is `WITH CHECK (user_id = auth.uid())` and
-- constrains nothing else, and service_providers.user_id is UNIQUE, so a
-- signed-in user with no provider row could POST one for themselves carrying
-- any wallet_balance and is_verified = true.
--
-- request_provider_payout then reads that balance:
--     SELECT wallet_balance INTO v_balance FROM service_providers
--       WHERE id = p_provider_id FOR UPDATE;
--     IF v_balance < p_amount THEN RETURN 'insufficient_balance' ...
-- It validates the payout AMOUNT against the balance. It cannot validate how
-- the balance arose. requestPayout() in src/lib/services/payments.ts resolves
-- the caller's OWN provider id and calls it with the service-role client, so
-- the payout path's ownership scoping is correct -- the defect is entirely that
-- the balance could be self-asserted at insert time.
--
-- A self-inserted balance also leaves provider_wallet_ledger empty, so
-- wallet_balance and the ledger disagree from the first moment. That
-- disagreement is the detection signature, and it is worth a reconciliation
-- check in its own right; this migration closes the door rather than watching
-- it.
--
-- The same gap let a client insert is_verified = true and verification_badge,
-- i.e. publish a fake verified provider, and set account_status.
--
-- EXPOSURE AT THE TIME OF THIS MIGRATION: service_providers = 0 rows,
-- auth.users = 0 rows. Nothing happened; no money exists. This is latent.
--
-- WRITTEN AS A SWEEP, NOT A HAND-KEPT LIST
--
-- The INSERT allowlist is DERIVED from the UPDATE allowlist at apply time
-- rather than retyped. 20260336000000_relock_definer_surface.sql makes the
-- argument for this directly: "This is written as a SWEEP rather than another
-- hand-kept list, because a hand-kept list is what failed." Two hand-kept
-- copies of the same 42 names is how the two sides drifted apart in the first
-- place. Deriving one from the other makes them unable to disagree, and
-- re-running this migration after someone changes the UPDATE allowlist
-- re-synchronises INSERT instead of going stale.
--
-- `anon` is granted nothing. providers_own_insert is {authenticated}, so anon
-- has no INSERT policy and its table grant was unreachable surface.
-- =============================================================================

-- Dropping the table privilege is what makes the column grants bite. Without
-- this line the GRANT below is decorative.
REVOKE INSERT ON public.service_providers FROM anon, authenticated;

DO $$
DECLARE
  cols        text;
  n_cols      int;
  leaked      text;
  missing     text;
BEGIN
  -- Derive the list from the UPDATE allowlist, which this migration does not
  -- touch. quote_ident on every name: these go into EXECUTE.
  SELECT string_agg(quote_ident(attname), ', ' ORDER BY attname), count(*)
    INTO cols, n_cols
    FROM pg_attribute
   WHERE attrelid = 'public.service_providers'::regclass
     AND attnum > 0
     AND NOT attisdropped
     AND has_column_privilege('authenticated', 'public.service_providers',
                              attname, 'UPDATE');

  -- A derived list is only safe if the thing it derives from is sane. If the
  -- UPDATE allowlist were ever empty or near-empty, this migration would
  -- silently revoke the ability to create a provider at all.
  IF n_cols IS NULL OR n_cols < 20 THEN
    RAISE EXCEPTION
      'refusing to derive an INSERT allowlist from % UPDATE-granted column(s); '
      'the UPDATE allowlist looks wrong, fix that first', coalesce(n_cols, 0);
  END IF;

  EXECUTE format(
    'GRANT INSERT (%s) ON public.service_providers TO authenticated', cols);

  RAISE NOTICE 'granted INSERT on % service_providers column(s) to authenticated', n_cols;

  -- ---- the eight must NOT have come along ---------------------------------
  SELECT string_agg(c, ', ' ORDER BY c) INTO leaked
    FROM unnest(ARRAY['account_status','average_rating','is_verified',
                      'total_earnings','total_jobs_completed','total_reviews',
                      'verification_badge','wallet_balance']) AS c
   WHERE has_column_privilege('authenticated','public.service_providers',c,'INSERT')
      OR has_column_privilege('anon','public.service_providers',c,'INSERT');
  IF leaked IS NOT NULL THEN
    RAISE EXCEPTION 'trust/money columns are still client-insertable: %', leaked;
  END IF;

  -- ---- table-level INSERT must stay dropped -------------------------------
  -- Otherwise the column grants are moot, which is the exact mistake this
  -- migration exists to correct.
  IF has_table_privilege('authenticated','public.service_providers','INSERT')
     OR has_table_privilege('anon','public.service_providers','INSERT') THEN
    RAISE EXCEPTION 'table-level INSERT on service_providers is still held; '
      'the column grants are decorative';
  END IF;

  -- ---- and the application must still be able to create a provider --------
  -- Derived from the payload buildProviderProfile() emits, not from the grant.
  SELECT string_agg(c, ', ' ORDER BY c) INTO missing
    FROM unnest(ARRAY['user_id','business_name','phone','business_type']) AS c
   WHERE NOT has_column_privilege('authenticated','public.service_providers',c,'INSERT');
  IF missing IS NOT NULL THEN
    RAISE EXCEPTION 'this migration broke provider creation -- not insertable: %', missing;
  END IF;

  -- ---- anon holds no INSERT at all ----------------------------------------
  IF EXISTS (
    SELECT 1 FROM pg_attribute
     WHERE attrelid = 'public.service_providers'::regclass
       AND attnum > 0 AND NOT attisdropped
       AND has_column_privilege('anon','public.service_providers',attname,'INSERT')
  ) THEN
    RAISE EXCEPTION 'anon can still insert into service_providers';
  END IF;

  RAISE NOTICE 'service_providers_insert_allowlist: all guards passed';
END
$$;


-- =============================================================================
-- DOWN -- restores the defect, so only for an emergency rollback.
-- =============================================================================
--
-- GRANT INSERT ON public.service_providers TO anon, authenticated;
--
-- Note that restoring the table privilege re-admits all 50 columns, including
-- wallet_balance and is_verified, because a table-level grant supersedes the
-- column list. There is no partial rollback: either the allowlist is in force
-- or it is not.
-- =============================================================================
