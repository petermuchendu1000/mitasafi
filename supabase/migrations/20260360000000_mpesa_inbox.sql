-- =============================================================================
-- An inbox for money that has arrived, and a record of what it was matched to
-- =============================================================================
-- WHY AN INBOX AND NOT JUST `payments`
--   payments.lease_id is NOT NULL. A confirmation that arrives with an
--   account number nobody recognises therefore has nowhere to live, and the
--   only options without this table are to drop it or to guess which lease it
--   belongs to. Both are worse than holding it unmatched and saying so.
--
-- WHAT RECONCILIATION ACTUALLY IS HERE
--   The tenant types their unit number into the paybill's account field. The
--   confirmation carries that text back. Matching it to a lease is the whole
--   job, and it is arithmetic on a string — which is why the matcher is a
--   pure function in TypeScript with its own tests rather than SQL buried in
--   a trigger.
--
-- HOW A CONFIRMATION REACHES MITASAFI
--   MitaSafi does not own the landlord's paybill, so Safaricom sends the C2B
--   confirmation wherever THAT landlord registered it. Two routes in:
--     1. the landlord registers MitaSafi's callback URL with their paybill;
--     2. the landlord pastes or forwards the M-Pesa message.
--   The second works today with no Daraja relationship at all, which is why
--   `source` exists and why nothing here assumes a callback.
--
-- `payments.auto_matched` has existed since the schema was written and
-- nothing has ever set it. It is set here, by the only thing that could.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.mpesa_inbox (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- ---- what Safaricom said ------------------------------------------------
  /** The M-Pesa code. Unique per landlord: the idempotency key. */
  trans_id     text NOT NULL,
  trans_amount numeric(12,2) NOT NULL,
  /** What the tenant typed in the account field. The whole basis of a match. */
  bill_ref     text,
  short_code   text,
  msisdn       text,
  payer_name   text,
  trans_time   timestamptz NOT NULL DEFAULT now(),
  raw          jsonb,

  -- ---- what we did with it ------------------------------------------------
  source  text NOT NULL DEFAULT 'pasted',
  status  text NOT NULL DEFAULT 'unmatched',
  /** Why it matched, or why it did not. Shown to the landlord verbatim. */
  match_reason      text,
  matched_lease_id  uuid REFERENCES public.leases(id) ON DELETE SET NULL,
  matched_payment_id uuid REFERENCES public.payments(id) ON DELETE SET NULL,
  matched_at        timestamptz,
  matched_by        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT mi_source_check CHECK (source IN ('c2b','pasted','manual')),
  CONSTRAINT mi_status_check CHECK (status IN ('unmatched','matched','ignored')),
  CONSTRAINT mi_amount_check CHECK (trans_amount > 0),
  CONSTRAINT mi_trans_id_shape CHECK (length(btrim(trans_id)) >= 6),
  -- A row marked matched without a lease is a lie about reconciliation.
  CONSTRAINT mi_matched_has_lease CHECK (
    status <> 'matched' OR matched_lease_id IS NOT NULL)
);

-- THE IDEMPOTENCY KEY. A paybill confirmation can be delivered more than
-- once; crediting the same money twice is the worst outcome this table has.
CREATE UNIQUE INDEX IF NOT EXISTS mpesa_inbox_landlord_trans
  ON public.mpesa_inbox (landlord_id, upper(btrim(trans_id)));

CREATE INDEX IF NOT EXISTS idx_mpesa_inbox_status
  ON public.mpesa_inbox (landlord_id, status, trans_time DESC);

-- -----------------------------------------------------------------------------
-- Integrity
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mpesa_inbox_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE v_ok boolean;
BEGIN
  NEW.landlord_id := COALESCE(NEW.landlord_id, auth.uid());
  NEW.trans_id    := upper(btrim(NEW.trans_id));
  NEW.bill_ref    := NULLIF(btrim(COALESCE(NEW.bill_ref,'')), '');

  -- A match may only point at a lease this landlord actually holds. Without
  -- this, a forged match id would attach someone else's money to any lease.
  IF NEW.matched_lease_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.leases l
                    WHERE l.id = NEW.matched_lease_id
                      AND l.landlord_id = NEW.landlord_id)
      INTO v_ok;
    IF NOT v_ok THEN
      RAISE EXCEPTION 'that lease is not yours' USING ERRCODE = '28000';
    END IF;
  END IF;

  -- The same rule for the payment it created.
  IF NEW.matched_payment_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.payments p
                    JOIN public.leases l ON l.id = p.lease_id
                   WHERE p.id = NEW.matched_payment_id
                     AND l.landlord_id = NEW.landlord_id)
      INTO v_ok;
    IF NOT v_ok THEN
      RAISE EXCEPTION 'that payment is not yours' USING ERRCODE = '28000';
    END IF;
  END IF;

  IF NEW.status = 'matched' AND NEW.matched_at IS NULL THEN
    NEW.matched_at := now();
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.mpesa_inbox_before_write()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS mpesa_inbox_biu ON public.mpesa_inbox;
CREATE TRIGGER mpesa_inbox_biu
  BEFORE INSERT OR UPDATE ON public.mpesa_inbox
  FOR EACH ROW EXECUTE FUNCTION public.mpesa_inbox_before_write();

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.mpesa_inbox FROM anon, authenticated;
GRANT SELECT, DELETE ON public.mpesa_inbox TO authenticated;

DO $g$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='mpesa_inbox'
     AND column_name NOT IN ('id','landlord_id','created_at','updated_at');
  EXECUTE format('GRANT INSERT (%s) ON public.mpesa_inbox TO authenticated', cols);
  EXECUTE format('GRANT UPDATE (%s) ON public.mpesa_inbox TO authenticated', cols);
END
$g$;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
ALTER TABLE public.mpesa_inbox ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mpesa_inbox_landlord_all ON public.mpesa_inbox;
CREATE POLICY mpesa_inbox_landlord_all ON public.mpesa_inbox
  FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- Staff who can see invoices can see the money that arrived for them. Read
-- only: reconciling is a decision about someone's rent account.
DROP POLICY IF EXISTS mpesa_inbox_staff_read ON public.mpesa_inbox;
CREATE POLICY mpesa_inbox_staff_read ON public.mpesa_inbox
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid()
       AND s.status = 'active'
       AND s.access_invoice IN ('all','view')
       AND mpesa_inbox.landlord_id = s.landlord_id));

-- =============================================================================
-- Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public'
                  AND tablename='mpesa_inbox' AND rowsecurity) THEN
    RAISE EXCEPTION 'FAILED: RLS off on mpesa_inbox';
  END IF;
  IF has_table_privilege('anon','public.mpesa_inbox','SELECT') THEN
    RAISE EXCEPTION 'FAILED: anon can read the money inbox';
  END IF;
  IF has_column_privilege('authenticated','public.mpesa_inbox','landlord_id','UPDATE') THEN
    RAISE EXCEPTION 'FAILED: a client can move an inbox row to another landlord';
  END IF;
  -- The idempotency key must exist, or the same money is credited twice.
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
                  AND indexname='mpesa_inbox_landlord_trans') THEN
    RAISE EXCEPTION 'FAILED: no unique index on (landlord_id, trans_id)';
  END IF;
  -- Staff read is gated on access_invoice, and they may not write.
  IF NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid=p.polrelid
                  WHERE c.relname='mpesa_inbox' AND p.polname='mpesa_inbox_staff_read'
                    AND p.polcmd='r'
                    AND pg_get_expr(p.polqual,p.polrelid) LIKE '%access_invoice%') THEN
    RAISE EXCEPTION 'FAILED: the staff inbox policy is missing or not read-only';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
              WHERE n.nspname='public' AND p.proname='mpesa_inbox_before_write'
                AND (pg_get_function_result(p.oid) <> 'trigger'
                     OR has_function_privilege('authenticated', p.oid,'EXECUTE'))) THEN
    RAISE EXCEPTION 'FAILED: the inbox trigger is reachable by a client';
  END IF;
  RAISE NOTICE 'mpesa_inbox installed; unmatched money has somewhere honest to sit.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DROP TABLE public.mpesa_inbox CASCADE;
--   DROP FUNCTION IF EXISTS public.mpesa_inbox_before_write();
--   (Destroys the record of what arrived and what it was matched to. The
--    payments it created survive, which is the right way round.)
-- =============================================================================
