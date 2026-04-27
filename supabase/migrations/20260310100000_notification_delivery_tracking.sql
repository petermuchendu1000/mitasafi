-- =============================================================================
-- M-C: NOTIFICATION DELIVERY TRACKING
-- =============================================================================
-- Adds delivery failure timestamps to the notifications table so we can
-- distinguish between "never attempted" and "attempted but failed" for both
-- email and SMS channels.
--
-- Before this migration:
--   email_sent = false  →  could mean "not attempted" or "attempted and failed"
--
-- After this migration:
--   email_sent = false, email_failed_at IS NULL  →  never attempted
--   email_sent = false, email_failed_at IS NOT NULL  →  attempted and failed
--   email_sent = true,  email_sent_at IS NOT NULL  →  delivered successfully
--
-- Same logic applies to SMS columns.
-- =============================================================================

-- ─── Add failure tracking columns ───────────────────────────────────────────

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS email_failed_at timestamptz DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sms_failed_at timestamptz DEFAULT NULL;

-- ─── Comment the columns for schema documentation ───────────────────────────

COMMENT ON COLUMN notifications.email_failed_at IS
  'When an email dispatch was attempted and failed. NULL = never attempted or succeeded.';

COMMENT ON COLUMN notifications.sms_failed_at IS
  'When an SMS dispatch was attempted and failed. NULL = never attempted or succeeded.';

-- ─── Index for operational monitoring (find failed deliveries) ───────────────

CREATE INDEX IF NOT EXISTS idx_notifications_email_failed
  ON notifications (created_at DESC)
  WHERE email_failed_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_sms_failed
  ON notifications (created_at DESC)
  WHERE sms_failed_at IS NOT NULL;
