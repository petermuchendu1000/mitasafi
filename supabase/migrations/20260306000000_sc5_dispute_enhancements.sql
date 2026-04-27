-- =============================================================================
-- MIGRATION: SC-5 Dispute & Refund Flow Enhancements
-- Purpose: Add desired_resolution column to booking_disputes
-- =============================================================================

-- Add desired_resolution column (customer's preferred resolution)
ALTER TABLE booking_disputes
  ADD COLUMN IF NOT EXISTS desired_resolution text;

COMMENT ON COLUMN booking_disputes.desired_resolution IS 'Customer-chosen resolution preference: full_refund, partial_refund, redo_service, provider_apology, other';
