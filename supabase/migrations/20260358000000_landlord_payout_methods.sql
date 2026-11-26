-- =============================================================================
-- Where the rent goes: MitaSafi as a gateway, not a custodian
-- =============================================================================
-- THE MODEL, STATED PLAINLY
--   The landlord records where they collect rent. MitaSafi shows the tenant
--   exactly where to send it and records what arrived. The money moves from
--   the tenant to the landlord directly and never passes through MitaSafi,
--   which holds no float, owes no balance and cannot withhold a payout.
--
--   That is a deliberate design, not a limitation to be fixed later. Holding
--   other people's rent is a regulated activity; routing and reconciling it
--   is not.
--
-- WHY A TABLE AND NOT COLUMNS ON landlord_settings
--   A landlord collects on a paybill for one block and a different account
--   for another, and changes banks. One row per destination, each assignable
--   to all properties or named blocks, with exactly one default.
--
-- WHAT THIS MAKES REAL
--   `property_staff.access_bank` has been stored and unenforced since
--   20260357000000, labelled "recorded only" in the UI because MitaSafi had
--   no bank data to govern. It now has some, so the policy below enforces it.
--   The default stays 'none': a caretaker has no business reading an account
--   number unless the landlord says so.
--
-- SENSITIVITY
--   These rows carry a bank account number. anon gets nothing. Staff get
--   nothing unless granted. The landlord's own policy is the only write path,
--   and the identity column is not client-writable.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.landlord_payout_methods (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  label  text NOT NULL,
  method text NOT NULL,

  -- ---- M-Pesa ------------------------------------------------------------
  paybill_number text,
  till_number    text,
  mpesa_phone    text,
  /**
   * What the tenant types in the "account number" field. Deriving it from the
   * unit is what makes a payment reconcilable: a paybill with everyone typing
   * their own name is a spreadsheet nobody can match.
   */
  account_reference_mode text NOT NULL DEFAULT 'unit_number',
  account_reference      text,

  -- ---- bank ---------------------------------------------------------------
  bank_name           text,
  bank_account_name   text,
  bank_account_number text,
  bank_branch         text,

  instructions text,

  is_default     boolean NOT NULL DEFAULT false,
  all_properties boolean NOT NULL DEFAULT true,
  building_ids   uuid[]  NOT NULL DEFAULT '{}',

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT lpm_method_check CHECK (
    method IN ('mpesa_paybill','mpesa_till','mpesa_send_money','bank')),
  CONSTRAINT lpm_ref_mode_check CHECK (
    account_reference_mode IN ('unit_number','tenant_phone','custom')),

  -- A destination missing the one number a tenant needs is not a
  -- destination. Each method states what it requires.
  CONSTRAINT lpm_complete CHECK (
    (method = 'mpesa_paybill'
       AND paybill_number IS NOT NULL AND length(btrim(paybill_number)) >= 5)
    OR (method = 'mpesa_till'
       AND till_number IS NOT NULL AND length(btrim(till_number)) >= 5)
    OR (method = 'mpesa_send_money'
       AND mpesa_phone IS NOT NULL AND mpesa_phone ~ '^\+254[17][0-9]{8}$')
    OR (method = 'bank'
       AND bank_name IS NOT NULL AND length(btrim(bank_name)) > 1
       AND bank_account_name IS NOT NULL AND length(btrim(bank_account_name)) > 1
       AND bank_account_number IS NOT NULL AND length(btrim(bank_account_number)) >= 5)
  ),
  -- 'custom' is the only mode where a literal reference makes sense.
  CONSTRAINT lpm_custom_ref CHECK (
    account_reference_mode <> 'custom'
    OR (account_reference IS NOT NULL AND length(btrim(account_reference)) > 0))
);

-- Exactly one default per landlord. A tenant asking "where do I pay?" must
-- get one answer.
CREATE UNIQUE INDEX IF NOT EXISTS lpm_one_default_per_landlord
  ON public.landlord_payout_methods (landlord_id)
  WHERE is_default;

CREATE INDEX IF NOT EXISTS idx_lpm_landlord
  ON public.landlord_payout_methods (landlord_id);

-- -----------------------------------------------------------------------------
-- Integrity
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.landlord_payout_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bad uuid;
  v_n   int;
BEGIN
  NEW.landlord_id := COALESCE(NEW.landlord_id, auth.uid());

  -- You may only route a block you own.
  SELECT b INTO v_bad FROM unnest(NEW.building_ids) AS b
   WHERE NOT EXISTS (SELECT 1 FROM public.buildings bl
                      WHERE bl.id = b AND bl.landlord_id = NEW.landlord_id)
   LIMIT 1;
  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'building % is not yours to assign', v_bad
      USING ERRCODE = '28000';
  END IF;

  IF NEW.all_properties THEN
    NEW.building_ids := '{}';
  END IF;

  -- Normalise the M-Pesa number the same way the rest of the app does, so a
  -- tenant is never shown 0722… for a destination stored as +254722….
  IF NEW.mpesa_phone IS NOT NULL THEN
    NEW.mpesa_phone := regexp_replace(NEW.mpesa_phone, '[^0-9+]', '', 'g');
    IF NEW.mpesa_phone ~ '^0[17][0-9]{8}$' THEN
      NEW.mpesa_phone := '+254' || substr(NEW.mpesa_phone, 2);
    ELSIF NEW.mpesa_phone ~ '^254[17][0-9]{8}$' THEN
      NEW.mpesa_phone := '+' || NEW.mpesa_phone;
    END IF;
  END IF;

  -- Fields belonging to other methods are cleared rather than left to rot:
  -- a stale till number on a bank row is a wrong answer waiting to be shown.
  IF NEW.method <> 'mpesa_paybill'   THEN NEW.paybill_number := NULL; END IF;
  IF NEW.method <> 'mpesa_till'      THEN NEW.till_number := NULL; END IF;
  IF NEW.method <> 'mpesa_send_money' THEN NEW.mpesa_phone := NULL; END IF;
  IF NEW.method = 'bank' THEN
    NEW.account_reference_mode := 'custom';
    NEW.account_reference := COALESCE(NULLIF(btrim(NEW.account_reference),''),
                                      NEW.bank_account_number);
  ELSE
    NEW.bank_name := NULL; NEW.bank_account_name := NULL;
    NEW.bank_account_number := NULL; NEW.bank_branch := NULL;
  END IF;

  -- Setting a new default demotes the old one, rather than failing on the
  -- unique index and making the landlord undo something first.
  IF NEW.is_default THEN
    UPDATE public.landlord_payout_methods
       SET is_default = false, updated_at = now()
     WHERE landlord_id = NEW.landlord_id
       AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
       AND is_default;
  END IF;

  -- The first destination a landlord adds is the default, because a landlord
  -- with one destination and no default has an unanswerable "where do I pay?".
  --
  -- INSERT ONLY, and that is not a detail. On UPDATE this rule fires during
  -- the demotion above: setting the old default to false re-enters this
  -- function, finds it is still the only row, and promotes it straight back —
  -- so adding a second default failed on the unique index. The suite caught
  -- it; the catalogue could not have.
  IF TG_OP = 'INSERT' THEN
    SELECT count(*) INTO v_n FROM public.landlord_payout_methods
     WHERE landlord_id = NEW.landlord_id;
    IF v_n = 0 THEN NEW.is_default := true; END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.landlord_payout_before_write()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS landlord_payout_biu ON public.landlord_payout_methods;
CREATE TRIGGER landlord_payout_biu
  BEFORE INSERT OR UPDATE ON public.landlord_payout_methods
  FOR EACH ROW EXECUTE FUNCTION public.landlord_payout_before_write();

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.landlord_payout_methods FROM anon, authenticated;
GRANT SELECT, DELETE ON public.landlord_payout_methods TO authenticated;

DO $g$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='landlord_payout_methods'
     AND column_name NOT IN ('id','landlord_id','created_at','updated_at');
  EXECUTE format('GRANT INSERT (%s) ON public.landlord_payout_methods TO authenticated', cols);
  EXECUTE format('GRANT UPDATE (%s) ON public.landlord_payout_methods TO authenticated', cols);
END
$g$;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
ALTER TABLE public.landlord_payout_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS lpm_landlord_all ON public.landlord_payout_methods;
CREATE POLICY lpm_landlord_all ON public.landlord_payout_methods
  FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- access_bank stops being decorative here. Read only: staff never write a
-- destination, because changing where rent goes is the landlord's decision
-- and nobody else's.
DROP POLICY IF EXISTS lpm_staff_read ON public.landlord_payout_methods;
CREATE POLICY lpm_staff_read ON public.landlord_payout_methods
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid()
       AND s.status = 'active'
       AND s.access_bank IN ('all','view')
       AND landlord_payout_methods.landlord_id = s.landlord_id
       AND (s.all_properties
            OR landlord_payout_methods.all_properties
            OR landlord_payout_methods.building_ids && s.building_ids)));

-- =============================================================================
-- Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
DECLARE c text;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public'
                  AND tablename='landlord_payout_methods' AND rowsecurity) THEN
    RAISE EXCEPTION 'FAILED: RLS off on landlord_payout_methods';
  END IF;

  -- An account number must never be reachable without a login.
  IF has_table_privilege('anon','public.landlord_payout_methods','SELECT') THEN
    RAISE EXCEPTION 'FAILED: anon can read payout destinations';
  END IF;

  IF has_column_privilege('authenticated','public.landlord_payout_methods','landlord_id','UPDATE') THEN
    RAISE EXCEPTION 'FAILED: a client can move a destination to another landlord';
  END IF;

  FOREACH c IN ARRAY ARRAY['label','method','paybill_number','till_number',
      'mpesa_phone','account_reference_mode','account_reference','bank_name',
      'bank_account_name','bank_account_number','bank_branch','instructions',
      'is_default','all_properties','building_ids'] LOOP
    IF NOT has_column_privilege('authenticated','public.landlord_payout_methods',c,'INSERT')
       OR NOT has_column_privilege('authenticated','public.landlord_payout_methods',c,'UPDATE') THEN
      RAISE EXCEPTION 'OVERREACH: a landlord cannot set %', c;
    END IF;
  END LOOP;

  -- Staff read is gated on access_bank and nothing else grants it.
  IF NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class cl ON cl.oid=p.polrelid
                  WHERE cl.relname='landlord_payout_methods'
                    AND p.polname='lpm_staff_read'
                    AND pg_get_expr(p.polqual,p.polrelid) LIKE '%access_bank%') THEN
    RAISE EXCEPTION 'FAILED: the staff policy does not read access_bank';
  END IF;
  -- ...and staff may not WRITE one.
  IF EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class cl ON cl.oid=p.polrelid
              WHERE cl.relname='landlord_payout_methods'
                AND p.polcmd IN ('a','w','d')
                AND coalesce(pg_get_expr(p.polqual,p.polrelid),'')||coalesce(pg_get_expr(p.polwithcheck,p.polrelid),'') LIKE '%property_staff%') THEN
    RAISE EXCEPTION 'FAILED: staff can write a payout destination';
  END IF;

  -- No new client-executable definer (I7).
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public' AND p.proname='landlord_payout_before_write'
                AND (pg_get_function_result(p.oid) <> 'trigger'
                     OR has_function_privilege('authenticated', p.oid,'EXECUTE'))) THEN
    RAISE EXCEPTION 'FAILED: the payout trigger is reachable by a client';
  END IF;

  RAISE NOTICE 'landlord_payout_methods installed; MitaSafi routes rent, it does not hold it.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DROP TABLE public.landlord_payout_methods CASCADE;
--   DROP FUNCTION IF EXISTS public.landlord_payout_before_write();
--   (Destroys every recorded collection destination.)
-- =============================================================================
