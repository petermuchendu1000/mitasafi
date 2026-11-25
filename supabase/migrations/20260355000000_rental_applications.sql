-- =============================================================================
-- Tenant applications: the table behind a feature the site already sells
-- =============================================================================
-- WHAT WAS ACTUALLY WRONG
--   "Applications" is in the landlord sidebar, the route 404s, and there is no
--   table behind it anywhere. Across all 78 base tables nothing matches
--   '%applic%'. listings.applications_count exists as integer DEFAULT 0, but no
--   function or trigger in the database mentions it, so nothing can ever
--   increment it; the only code that touches it resets it to 0 when a listing
--   is duplicated. It is a counter for a thing that cannot exist.
--
--   Meanwhile PricingSection lists "Receive applications" as included on both
--   paid plans, and /landlords tells prospective customers that tenants
--   "submit applications through the platform". The PRD's own Phase 1
--   checklist has "Basic tenant application flow" unticked. This migration is
--   the storage for that promise.
--
-- WHY NOT JUST USE inquiries
--   inquiries is the anonymous top-of-funnel: a name, a phone and "can I see
--   it on Saturday". An application is a different thing — it is an offer, it
--   carries what someone earns and who lives with them, and the landlord
--   decides on it. Reusing inquiries would mean one status column meaning two
--   different workflows.
--
-- THE TWO HOLES THIS DOES NOT REPEAT
--   1. inquiries has `FOR INSERT WITH CHECK (true)`, so anyone may insert an
--      inquiry naming ANY landlord_id. Here the client is not permitted to
--      supply landlord_id at all: it has no column privilege on it, and a
--      BEFORE INSERT trigger reads it from the listing.
--   2. RLS restricts ROWS, never COLUMNS — the defect 20260329000000 was
--      written to close. A row-level "landlord may update their own
--      applications" policy would also let a landlord rewrite the income the
--      applicant stated, and a row-level "applicant may update their own"
--      policy would let an applicant set their own status to 'approved'.
--      Column grants plus a BEFORE UPDATE trigger make both impossible:
--      the landlord may change only status and landlord_notes, the applicant
--      may only withdraw, and every other column is copied from OLD.
--
-- No DELETE privilege and no DELETE policy are granted to any client role. A
-- decision about someone's housing should not be erasable by either party.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.rental_applications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  listing_id      uuid NOT NULL REFERENCES public.listings(id) ON DELETE CASCADE,
  -- Derived from the listing by trigger, never from the client.
  landlord_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Always auth.uid(). An application is not anonymous; inquiries are.
  applicant_id    uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- ---- what the applicant states. Frozen after insert. --------------------
  full_name       text NOT NULL,
  email           text,
  phone           text NOT NULL,
  occupation      text,
  employer        text,
  monthly_income  numeric(12,2),
  household_size  integer,
  move_in_date    date,
  lease_months    integer,
  message         text,

  -- ---- what the landlord decides. The only columns they may write. --------
  status          text NOT NULL DEFAULT 'new',
  landlord_notes  text,
  decided_at      timestamptz,

  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT rental_applications_status_check CHECK (
    status IN ('new','reviewing','shortlisted','approved','rejected','withdrawn')
  ),
  CONSTRAINT rental_applications_income_check CHECK (
    monthly_income IS NULL OR monthly_income >= 0
  ),
  CONSTRAINT rental_applications_household_check CHECK (
    household_size IS NULL OR (household_size >= 1 AND household_size <= 20)
  ),
  CONSTRAINT rental_applications_lease_months_check CHECK (
    lease_months IS NULL OR (lease_months >= 1 AND lease_months <= 60)
  ),
  -- A landlord applying to their own listing is not a thing.
  CONSTRAINT rental_applications_not_self CHECK (applicant_id <> landlord_id)
);

-- One OPEN application per person per listing. A rejected or withdrawn one
-- does not block a fresh attempt, which is why this is partial rather than a
-- plain unique constraint.
CREATE UNIQUE INDEX IF NOT EXISTS rental_applications_one_open_per_listing
  ON public.rental_applications (listing_id, applicant_id)
  WHERE status IN ('new','reviewing','shortlisted','approved');

-- The landlord's queue: their applications, newest first, filtered by status.
CREATE INDEX IF NOT EXISTS idx_rental_applications_landlord
  ON public.rental_applications (landlord_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_applications_applicant
  ON public.rental_applications (applicant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rental_applications_listing
  ON public.rental_applications (listing_id);

-- -----------------------------------------------------------------------------
-- Insert: the server decides who the landlord is, not the caller
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rental_application_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER                      -- identity_role_authority I7
SET search_path = public, pg_temp
AS $$
DECLARE
  v_landlord uuid;
  v_status   text;
BEGIN
  SELECT l.landlord_id, l.status
    INTO v_landlord, v_status
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  IF v_landlord IS NULL THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'P0002';
  END IF;

  -- Applying to a draft, paused, rented or archived listing is not allowed.
  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'this listing is not accepting applications'
      USING ERRCODE = 'P0001';
  END IF;

  -- auth.uid() is NULL for anonymous callers; applicant_id is NOT NULL, so an
  -- anonymous application fails here rather than being silently attributed.
  NEW.applicant_id   := auth.uid();
  NEW.landlord_id    := v_landlord;
  NEW.status         := 'new';
  NEW.landlord_notes := NULL;
  NEW.decided_at     := NULL;
  NEW.created_at     := now();
  NEW.updated_at     := now();

  RETURN NEW;
END;
$$;

-- -----------------------------------------------------------------------------
-- Update: each side may change only what is theirs to change
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rental_application_before_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_uid    uuid := auth.uid();
  v_status text := NEW.status;
  v_notes  text := NEW.landlord_notes;
BEGIN
  -- No JWT means service_role or a maintenance job, not a client. RLS already
  -- bars client roles that match no policy; this trigger governs the two that do.
  IF v_uid IS NULL THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;

  IF v_uid = OLD.landlord_id THEN
    -- Everything the applicant said is restored from OLD, so the landlord
    -- cannot edit the income, the name or the message they are judging.
    NEW := OLD;

    IF v_status = 'withdrawn' AND OLD.status <> 'withdrawn' THEN
      RAISE EXCEPTION 'only the applicant can withdraw an application'
        USING ERRCODE = '28000';
    END IF;

    NEW.status         := v_status;
    NEW.landlord_notes := v_notes;

    IF v_status IS DISTINCT FROM OLD.status
       AND v_status IN ('approved','rejected') THEN
      NEW.decided_at := now();
    END IF;

  ELSIF v_uid = OLD.applicant_id THEN
    IF OLD.status IN ('withdrawn','rejected') THEN
      RAISE EXCEPTION 'this application is already closed'
        USING ERRCODE = 'P0001';
    END IF;
    IF v_status IS DISTINCT FROM 'withdrawn' THEN
      RAISE EXCEPTION 'an applicant may only withdraw their application'
        USING ERRCODE = '28000';
    END IF;

    -- Withdrawing changes one word and nothing else.
    NEW := OLD;
    NEW.status := 'withdrawn';

  ELSE
    RAISE EXCEPTION 'not your application' USING ERRCODE = '28000';
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS rental_applications_biu ON public.rental_applications;
CREATE TRIGGER rental_applications_biu
  BEFORE INSERT ON public.rental_applications
  FOR EACH ROW EXECUTE FUNCTION public.rental_application_before_insert();

DROP TRIGGER IF EXISTS rental_applications_bu ON public.rental_applications;
CREATE TRIGGER rental_applications_bu
  BEFORE UPDATE ON public.rental_applications
  FOR EACH ROW EXECUTE FUNCTION public.rental_application_before_update();

-- -----------------------------------------------------------------------------
-- Privileges. Column-level, because RLS cannot restrict columns.
-- -----------------------------------------------------------------------------
-- A column-level GRANT is inert while a table-level grant is held, so the
-- table-level write privileges are dropped first and the permitted columns are
-- granted back by name (same shape as 20260329000000 on profiles).
REVOKE INSERT, UPDATE, DELETE, TRUNCATE
  ON public.rental_applications FROM anon, authenticated;

-- anon gets nothing at all, SELECT included. This REVOKE is not redundant:
-- this project grants anon SELECT on new public tables by default, and the
-- assertion at the foot of this file failed on the first run because of it.
-- An application carries someone's income, employer and household size.
REVOKE ALL ON public.rental_applications FROM anon;

GRANT SELECT ON public.rental_applications TO authenticated;

GRANT INSERT (
  listing_id, full_name, email, phone, occupation, employer,
  monthly_income, household_size, move_in_date, lease_months, message
) ON public.rental_applications TO authenticated;

-- Note what is absent: applicant-stated columns, decided_at, created_at.
GRANT UPDATE (status, landlord_notes) ON public.rental_applications TO authenticated;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
ALTER TABLE public.rental_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS rental_applications_insert_own ON public.rental_applications;
CREATE POLICY rental_applications_insert_own ON public.rental_applications
  FOR INSERT TO authenticated
  WITH CHECK (applicant_id = auth.uid());

DROP POLICY IF EXISTS rental_applications_select_applicant ON public.rental_applications;
CREATE POLICY rental_applications_select_applicant ON public.rental_applications
  FOR SELECT TO authenticated
  USING (applicant_id = auth.uid());

DROP POLICY IF EXISTS rental_applications_select_landlord ON public.rental_applications;
CREATE POLICY rental_applications_select_landlord ON public.rental_applications
  FOR SELECT TO authenticated
  USING (landlord_id = auth.uid());

DROP POLICY IF EXISTS rental_applications_update_landlord ON public.rental_applications;
CREATE POLICY rental_applications_update_landlord ON public.rental_applications
  FOR UPDATE TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

DROP POLICY IF EXISTS rental_applications_update_applicant ON public.rental_applications;
CREATE POLICY rental_applications_update_applicant ON public.rental_applications
  FOR UPDATE TO authenticated
  USING (applicant_id = auth.uid())
  WITH CHECK (applicant_id = auth.uid());

-- No DELETE policy, and DELETE was revoked above. Deliberate.

-- =============================================================================
-- Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
DECLARE
  c text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables
                  WHERE schemaname='public' AND tablename='rental_applications'
                    AND rowsecurity) THEN
    RAISE EXCEPTION 'FAILED: RLS is not enabled on rental_applications';
  END IF;

  -- The client may not name the landlord, the applicant, or the outcome.
  FOREACH c IN ARRAY ARRAY['landlord_id','applicant_id','status',
                           'decided_at','landlord_notes','created_at'] LOOP
    IF has_column_privilege('authenticated','public.rental_applications',c,'INSERT') THEN
      RAISE EXCEPTION 'FAILED: a client can supply % on insert', c;
    END IF;
  END LOOP;

  -- The client may not rewrite what was stated.
  FOREACH c IN ARRAY ARRAY['full_name','email','phone','occupation','employer',
                           'monthly_income','household_size','move_in_date',
                           'lease_months','message','listing_id','decided_at'] LOOP
    IF has_column_privilege('authenticated','public.rental_applications',c,'UPDATE') THEN
      RAISE EXCEPTION 'FAILED: a client can rewrite % after submission', c;
    END IF;
  END LOOP;

  -- ...but the two columns a landlord works with must be writable, or the
  -- review queue is read-only and the feature does nothing.
  IF NOT has_column_privilege('authenticated','public.rental_applications','status','UPDATE')
     OR NOT has_column_privilege('authenticated','public.rental_applications','landlord_notes','UPDATE') THEN
    RAISE EXCEPTION 'OVERREACH: a landlord cannot record a decision';
  END IF;
  IF NOT has_column_privilege('authenticated','public.rental_applications','monthly_income','INSERT') THEN
    RAISE EXCEPTION 'OVERREACH: an applicant cannot state their income';
  END IF;

  -- Nobody deletes an application.
  IF has_table_privilege('authenticated','public.rental_applications','DELETE')
     OR has_table_privilege('anon','public.rental_applications','DELETE') THEN
    RAISE EXCEPTION 'FAILED: a client role can delete applications';
  END IF;

  -- anon has no reach at all.
  IF has_table_privilege('anon','public.rental_applications','SELECT')
     OR has_table_privilege('anon','public.rental_applications','INSERT') THEN
    RAISE EXCEPTION 'FAILED: anon can read or write applications';
  END IF;

  -- Both triggers are invoker-rights (identity_role_authority I7).
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public'
                AND p.proname IN ('rental_application_before_insert',
                                  'rental_application_before_update')
                AND p.prosecdef) THEN
    RAISE EXCEPTION 'FAILED: an application trigger is SECURITY DEFINER';
  END IF;

  IF NOT has_table_privilege('service_role','public.rental_applications','UPDATE') THEN
    RAISE EXCEPTION 'CATASTROPHE: service_role cannot write applications';
  END IF;

  RAISE NOTICE 'rental_applications created; client write surface is column-scoped.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DROP TABLE public.rental_applications CASCADE;
--   DROP FUNCTION IF EXISTS public.rental_application_before_insert();
--   DROP FUNCTION IF EXISTS public.rental_application_before_update();
--   (Dropping the table destroys every application and decision recorded.)
-- =============================================================================
