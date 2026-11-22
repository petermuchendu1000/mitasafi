-- =============================================================================
-- One identity anchor: the seven FKs that bypassed profiles now reference it
-- =============================================================================
-- profiles.id IS auth.users.id -- the same value, a shared primary key, with
-- profiles.id REFERENCES auth.users(id) ON DELETE CASCADE. But the schema used
-- BOTH as a foreign-key target, inconsistently:
--
--   18 FKs referenced public.profiles
--    7 FKs referenced auth.users directly, bypassing profiles
--      (plus profiles.id itself, which is the legitimate anchor and stays)
--
-- The clearest symptom: bookings.customer_id -> profiles while
-- booking_payments.payer_id -> auth.users. The same human, in the same
-- transaction, reached through two different anchors. It joined only because
-- the ids happen to be equal. The schema never said so, and nothing guaranteed
-- a profile existed for a payer -- so a payment could reference a user that
-- profiles_public could not show, that held no role, and that 32 other foreign
-- keys could not reach.
--
-- WHY THIS SHIPS WITH provision_identity AND NOT BEFORE IT
--
-- After this migration a booking_payment REQUIRES a profile row. That is the
-- invariant being bought, and it is only safe once provisioning is guaranteed:
-- otherwise a half-failed signup produces a user who cannot be paid, and the
-- failure surfaces in the payment path rather than at signup.
-- 20260346000000_provision_identity.sql makes provisioning atomic and
-- idempotent, and the auth callback re-runs it on every login, so the
-- dependency is satisfied. Applying this migration without that one would move
-- a signup defect into the money path.
--
-- DELETE RULES ARE PRESERVED EXACTLY, NOT "TIDIED"
--
-- Each constraint below keeps the rule it already had. This migration changes
-- WHICH TABLE is referenced and nothing else, because changing a delete rule is
-- a separate decision with its own consequences:
--
--   analytics_events.user_id        SET NULL   (nullable)
--   booking_payments.payer_id       RESTRICT   (NOT NULL)
--   commission_config.created_by    SET NULL   (nullable)
--   phone_verifications.user_id     CASCADE    (NOT NULL)
--   provider_documents.reviewed_by  NO ACTION  (nullable)
--   provider_payouts.approved_by    NO ACTION  (nullable)
--   search_queries.user_id          SET NULL   (nullable)
--
-- NOTED, NOT CHANGED: the two NO ACTION rules are inconsistent with their own
-- siblings. 20260345 set provider_verification_documents.reviewed_by to
-- SET NULL, and provider_documents.reviewed_by does the same job with a
-- different rule; provider_payouts.approved_by is a financial approval whose
-- record should outlive its approver, which SET NULL gives and NO ACTION does
-- not. Aligning them is a one-line change and a real decision about financial
-- audit retention, so it is left for review rather than folded in here.
--
-- booking_payments.payer_id keeps RESTRICT deliberately. It means a user who
-- has ever had a payment cannot be hard-deleted. That is not a defect -- I
-- previously reported it as one and that was wrong. Refusing the delete
-- preserves the financial record; the alternative destroys it. What is genuinely
-- missing is an account-ERASURE path, which needs a soft-delete or
-- anonymisation design, not a cascade.
--
-- MEASURED BEFORE APPLYING: analytics_events holds 203 rows and
-- commission_config holds 3, but every user_id / created_by in all seven tables
-- is NULL (non-null count 0), so there are zero orphans and all seven validate.
-- This was counted, not assumed -- the previous migration found a table that
-- looked empty and was not.
-- =============================================================================

-- ---- SET NULL (nullable) ----------------------------------------------------

ALTER TABLE public.analytics_events
  DROP CONSTRAINT IF EXISTS analytics_events_user_id_fkey;
ALTER TABLE public.analytics_events
  ADD CONSTRAINT analytics_events_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.commission_config
  DROP CONSTRAINT IF EXISTS commission_config_created_by_fkey;
ALTER TABLE public.commission_config
  ADD CONSTRAINT commission_config_created_by_fkey
  FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.search_queries
  DROP CONSTRAINT IF EXISTS search_queries_user_id_fkey;
ALTER TABLE public.search_queries
  ADD CONSTRAINT search_queries_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ---- RESTRICT (NOT NULL, financial) ----------------------------------------

ALTER TABLE public.booking_payments
  DROP CONSTRAINT IF EXISTS booking_payments_payer_id_fkey;
ALTER TABLE public.booking_payments
  ADD CONSTRAINT booking_payments_payer_id_fkey
  FOREIGN KEY (payer_id) REFERENCES public.profiles(id) ON DELETE RESTRICT;

-- ---- CASCADE (NOT NULL) ----------------------------------------------------
-- Safe to anchor on profiles: phone_verifications is written only by
-- src/app/dashboard/verify-provider/actions.ts, which runs from a dashboard
-- page after signup, so a profile always exists by then. It is NOT part of the
-- signup OTP flow -- that uses supabase.auth.signInWithOtp and never touches
-- this table. Checked, because an FK here that fired during signup would block
-- it.

ALTER TABLE public.phone_verifications
  DROP CONSTRAINT IF EXISTS phone_verifications_user_id_fkey;
ALTER TABLE public.phone_verifications
  ADD CONSTRAINT phone_verifications_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- ---- NO ACTION (preserved; see the header) ---------------------------------

ALTER TABLE public.provider_documents
  DROP CONSTRAINT IF EXISTS provider_documents_reviewed_by_fkey;
ALTER TABLE public.provider_documents
  ADD CONSTRAINT provider_documents_reviewed_by_fkey
  FOREIGN KEY (reviewed_by) REFERENCES public.profiles(id);

ALTER TABLE public.provider_payouts
  DROP CONSTRAINT IF EXISTS provider_payouts_approved_by_fkey;
ALTER TABLE public.provider_payouts
  ADD CONSTRAINT provider_payouts_approved_by_fkey
  FOREIGN KEY (approved_by) REFERENCES public.profiles(id);


-- =============================================================================
-- Indexes on the four referencing columns that had none
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_commission_config_created_by
  ON public.commission_config (created_by);
CREATE INDEX IF NOT EXISTS idx_provider_documents_reviewed_by
  ON public.provider_documents (reviewed_by);
CREATE INDEX IF NOT EXISTS idx_provider_payouts_approved_by
  ON public.provider_payouts (approved_by);
CREATE INDEX IF NOT EXISTS idx_search_queries_user_id
  ON public.search_queries (user_id);


-- =============================================================================
-- GUARDS
-- =============================================================================

DO $$
DECLARE
  bypassing text;
  wrong     text;
  n_fk      int;
BEGIN
  -- ---- nothing in public references auth.users except profiles.id --------
  -- The whole point of the migration, asserted as a sweep rather than as a
  -- list of seven, so a future table that anchors to auth.users fails here.
  SELECT string_agg(cl.relname || '.' || a.attname, ', ' ORDER BY cl.relname, a.attname)
    INTO bypassing
    FROM pg_constraint con
    JOIN pg_class cl ON cl.oid = con.conrelid
    JOIN pg_namespace cn ON cn.oid = cl.relnamespace
    JOIN pg_class pl ON pl.oid = con.confrelid
    JOIN pg_namespace pn ON pn.oid = pl.relnamespace
    JOIN pg_attribute a ON a.attrelid = con.conrelid AND a.attnum = con.conkey[1]
   WHERE con.contype = 'f'
     AND pn.nspname = 'auth' AND pl.relname = 'users'
     AND cn.nspname = 'public'
     AND cl.relname <> 'profiles';
  IF bypassing IS NOT NULL THEN
    RAISE EXCEPTION 'these still bypass profiles and anchor to auth.users: %', bypassing;
  END IF;

  -- ---- profiles.id must STILL anchor to auth.users ----------------------
  -- If this were dropped, profiles would float free of authentication and a
  -- profile could exist for a user that cannot log in.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint con
      JOIN pg_class pl ON pl.oid = con.confrelid
      JOIN pg_namespace pn ON pn.oid = pl.relnamespace
     WHERE con.conrelid = 'public.profiles'::regclass
       AND con.contype = 'f' AND pn.nspname = 'auth' AND pl.relname = 'users'
  ) THEN
    RAISE EXCEPTION 'profiles.id no longer references auth.users; the anchor is broken';
  END IF;

  -- ---- each rule was preserved, not quietly changed ---------------------
  SELECT string_agg(x.lbl, ', ' ORDER BY x.lbl) INTO wrong
    FROM (VALUES
      ('analytics_events_user_id_fkey', 'n'),
      ('commission_config_created_by_fkey', 'n'),
      ('search_queries_user_id_fkey', 'n'),
      ('booking_payments_payer_id_fkey', 'r'),
      ('phone_verifications_user_id_fkey', 'c'),
      ('provider_documents_reviewed_by_fkey', 'a'),
      ('provider_payouts_approved_by_fkey', 'a')
    ) AS x(lbl, expected)
   WHERE NOT EXISTS (
     SELECT 1 FROM pg_constraint con
      WHERE con.conname = x.lbl
        AND con.contype = 'f'
        AND con.confdeltype = x.expected
        AND con.confrelid = 'public.profiles'::regclass
   );
  IF wrong IS NOT NULL THEN
    RAISE EXCEPTION 'repointed with the wrong target or delete rule: %', wrong;
  END IF;

  -- ---- all seven validated: no orphan slipped through -------------------
  SELECT string_agg(con.conname, ', ') INTO wrong
    FROM pg_constraint con
   WHERE con.conname IN ('analytics_events_user_id_fkey','commission_config_created_by_fkey',
     'search_queries_user_id_fkey','booking_payments_payer_id_fkey',
     'phone_verifications_user_id_fkey','provider_documents_reviewed_by_fkey',
     'provider_payouts_approved_by_fkey')
     AND NOT con.convalidated;
  IF wrong IS NOT NULL THEN
    RAISE EXCEPTION 'repointed but NOT VALID: %', wrong;
  END IF;

  -- ---- provisioning must exist, because this migration depends on it ----
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname = 'public' AND p.proname = 'provision_identity'
  ) THEN
    RAISE EXCEPTION 'provision_identity does not exist; anchoring payments on profiles '
      'without guaranteed provisioning moves a signup defect into the money path';
  END IF;

  -- ---- the four new indexes ---------------------------------------------
  SELECT string_agg(x.idx, ', ' ORDER BY x.idx) INTO wrong
    FROM (VALUES
      ('idx_commission_config_created_by'),
      ('idx_provider_documents_reviewed_by'),
      ('idx_provider_payouts_approved_by'),
      ('idx_search_queries_user_id')
    ) AS x(idx)
   WHERE NOT EXISTS (SELECT 1 FROM pg_indexes
                      WHERE schemaname = 'public' AND indexname = x.idx);
  IF wrong IS NOT NULL THEN
    RAISE EXCEPTION 'FK support indexes missing: %', wrong;
  END IF;

  SELECT count(*) INTO n_fk
    FROM pg_constraint con
    JOIN pg_class parent ON parent.oid = con.confrelid
    JOIN pg_namespace pn ON pn.oid = parent.relnamespace
   WHERE con.contype = 'f' AND pn.nspname = 'public' AND parent.relname = 'profiles';
  IF n_fk < 39 THEN
    RAISE EXCEPTION 'profiles has only % inbound foreign keys; expected at least 39 (32 + 7)', n_fk;
  END IF;

  RAISE NOTICE 'single_identity_anchor: all guards passed (% inbound FKs on profiles)', n_fk;
END
$$;


-- =============================================================================
-- DOWN
-- =============================================================================
-- Repoint each of the seven back at auth.users(id) with the same delete rule:
--
--   ALTER TABLE public.analytics_events DROP CONSTRAINT analytics_events_user_id_fkey;
--   ALTER TABLE public.analytics_events ADD CONSTRAINT analytics_events_user_id_fkey
--     FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE SET NULL;
--   ... and so on ...
--
-- Clean while the referencing columns are NULL, as they are today. Once real
-- data exists it stays clean too, because profiles.id = auth.users.id for every
-- row -- the two anchors never diverge in value, only in what the schema
-- guarantees. What the reversal gives back is the ability to insert a payment
-- for a user with no profile.
-- =============================================================================
