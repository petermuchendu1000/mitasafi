-- =============================================================================
-- A record of every notification sent, so none is ever sent twice
-- =============================================================================
-- WHY THIS TABLE IS THE WHOLE FEATURE
--   "Rent is late" is a STATE, not an event. A cron that asks "who is late?"
--   and emails them finds the same people late tomorrow, and the day after,
--   and emails them again each time. Without a record of what has already
--   gone out, a scheduled notifier is a machine for harassing tenants who
--   are three days behind.
--
--   The unique index below is therefore not an optimisation. It is the only
--   thing standing between a landlord's tenants and a daily dunning email,
--   and it is enforced in the database rather than in the caller because the
--   caller can be run twice at once.
--
-- WHAT IS DELIBERATELY NOT STORED
--   The email address, the phone number, and the message body. The recipient
--   is recorded as a foreign key — profiles for a landlord, tenants for a
--   tenant — both ON DELETE CASCADE, so erasing a person erases their
--   notification history with them and this table adds NO new personal data
--   to the system. An audit of "was this person emailed" is answered by the
--   key; it does not need a copy of their address.
--
-- RETRY
--   The unique index covers status = 'sent' only. A failed attempt leaves a
--   row that does not block a retry, which is what makes a transient Resend
--   outage recoverable rather than permanently silent.
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.notification_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  /** Always the landlord whose portfolio this concerns — the RLS anchor. */
  landlord_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  recipient_kind text NOT NULL,
  /** Set when recipient_kind = 'tenant'. The address lives on that row. */
  tenant_id uuid REFERENCES public.tenants(id) ON DELETE CASCADE,

  channel text NOT NULL DEFAULT 'email',
  /** e.g. 'invoice_late', 'overdue_summary'. */
  kind text NOT NULL,

  /**
   * The idempotency key, built by the planner:
   *   <kind>:<recipient ref>:<subject id or ->:<period or ->
   * Unique per landlord among rows that were actually sent.
   */
  dedupe_key text NOT NULL,

  /** What it was about, for querying. Not part of the key by itself. */
  subject_type text,
  subject_id uuid,
  /** 'YYYY-MM' for anything tied to a rent period. */
  period text,

  status text NOT NULL DEFAULT 'sent',
  error text,
  sent_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT nl_recipient_kind_check
    CHECK (recipient_kind IN ('landlord', 'tenant')),
  CONSTRAINT nl_channel_check CHECK (channel IN ('email', 'sms')),
  CONSTRAINT nl_status_check CHECK (status IN ('sent', 'failed', 'suppressed')),
  -- A row that says it went to a tenant must say which one, or the dedupe
  -- key is the only thing that knows and nothing can be audited.
  CONSTRAINT nl_tenant_present
    CHECK (recipient_kind <> 'tenant' OR tenant_id IS NOT NULL),
  CONSTRAINT nl_dedupe_key_shape CHECK (length(btrim(dedupe_key)) > 0)
);

-- THE GUARD. Partial on 'sent' so a failure can be retried.
CREATE UNIQUE INDEX IF NOT EXISTS notification_log_once
  ON public.notification_log (landlord_id, dedupe_key)
  WHERE status = 'sent';

CREATE INDEX IF NOT EXISTS idx_notification_log_recent
  ON public.notification_log (landlord_id, sent_at DESC);

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
-- Nothing writes this from a browser. The notifier runs as the service role,
-- which bypasses RLS; `authenticated` gets read only, so a landlord can see
-- what was sent on their behalf and a client cannot forge or erase a record
-- of a message that went out.
REVOKE ALL ON public.notification_log FROM anon, authenticated;
GRANT SELECT ON public.notification_log TO authenticated;

-- -----------------------------------------------------------------------------
-- Row-level security
-- -----------------------------------------------------------------------------
ALTER TABLE public.notification_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notification_log_landlord_read ON public.notification_log;
CREATE POLICY notification_log_landlord_read ON public.notification_log
  FOR SELECT TO authenticated
  USING (landlord_id = auth.uid());

-- =============================================================================
-- Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public'
                  AND tablename='notification_log' AND rowsecurity) THEN
    RAISE EXCEPTION 'FAILED: RLS off on notification_log';
  END IF;
  IF has_table_privilege('anon','public.notification_log','SELECT') THEN
    RAISE EXCEPTION 'FAILED: anon can read who was notified';
  END IF;
  -- A client that could INSERT could forge a "sent" row and silence a real
  -- notification for ever, because the unique index would then block it.
  IF has_table_privilege('authenticated','public.notification_log','INSERT')
     OR has_table_privilege('authenticated','public.notification_log','UPDATE')
     OR has_table_privilege('authenticated','public.notification_log','DELETE') THEN
    RAISE EXCEPTION 'FAILED: a client can write the notification log';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='public'
                  AND indexname='notification_log_once') THEN
    RAISE EXCEPTION 'FAILED: no unique index — the same notice can be sent twice';
  END IF;
  -- The partial predicate is what makes a failed send retryable. Without it
  -- one Resend outage silences that notice permanently.
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public'
      AND indexname='notification_log_once'
      AND indexdef LIKE '%WHERE (status = ''sent''::text)%') THEN
    RAISE EXCEPTION 'FAILED: the unique index is not scoped to sent rows';
  END IF;
  RAISE NOTICE 'notification_log installed; a notice can now be sent exactly once.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DROP TABLE public.notification_log CASCADE;
--   (Destroys the record of what was sent. The immediate effect of dropping
--    it is that the next notifier run re-sends everything it believes is
--    outstanding, to everyone. Do not drop it on a live system without
--    disabling the schedule first.)
-- =============================================================================
