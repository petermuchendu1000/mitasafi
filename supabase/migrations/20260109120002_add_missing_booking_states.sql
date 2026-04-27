-- Migration: Add Missing Booking States
-- Purpose: Add critical states identified in state machine audit
-- Dependencies: 20260109120001_complete_enum_values.sql
-- Critical: These states are required for project, multi-visit, and dispute flows

-- ============================================================================
-- ADD MISSING STATES TO booking_status ENUM
-- ============================================================================

-- Add 'partially_completed' - Project services with incomplete work
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'partially_completed' AFTER 'completed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE booking_status IS 'partially_completed: Work partially done, requires follow-up visit';

-- Add 'requires_followup' - Multi-visit services needing additional work
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'requires_followup' AFTER 'partially_completed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE booking_status IS 'requires_followup: Additional visit scheduled to complete work';

-- Add 'rework_required' - Disputed work that needs to be redone
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'rework_required' AFTER 'disputed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE booking_status IS 'rework_required: Quality issue resolved by redoing work';

-- Add 'abandoned' - Stale bookings with no activity (distinct from cancellation)
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'abandoned' AFTER 'needs_reassignment';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE booking_status IS 'abandoned: Booking stale with no activity (no penalty/refund)';

-- ============================================================================
-- ADD HELPER FIELDS TO bookings TABLE
-- ============================================================================

-- Add reschedule tracking
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reschedule_count integer DEFAULT 0;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN bookings.reschedule_count IS 'Number of times this booking has been rescheduled';

-- Add partial completion tracking
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completion_percentage integer;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN bookings.completion_percentage IS 'For partially_completed status: % of work done (0-100)';

DO $$ BEGIN
  ALTER TABLE bookings ADD CONSTRAINT booking_completion_percentage_range 
    CHECK (completion_percentage IS NULL OR (completion_percentage >= 0 AND completion_percentage <= 100));
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add followup visit tracking
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS followup_scheduled_at timestamptz;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN bookings.followup_scheduled_at IS 'For requires_followup status: when next visit is scheduled';

-- Add abandonment tracking
DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS abandoned_at timestamptz;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN bookings.abandoned_at IS 'Timestamp when booking was marked abandoned';

DO $$ BEGIN
  ALTER TABLE bookings ADD COLUMN IF NOT EXISTS abandonment_reason text;
EXCEPTION
  WHEN duplicate_column THEN NULL;
END $$;

COMMENT ON COLUMN bookings.abandonment_reason IS 'Reason for abandonment: auto_timeout, customer_unresponsive, etc.';

-- ============================================================================
-- VALIDATION: Verify all expected values exist
-- ============================================================================

DO $$
DECLARE
  booking_status_count int;
BEGIN
  -- Count booking_status enum values
  SELECT COUNT(*) INTO booking_status_count
  FROM pg_enum
  WHERE enumtypid = 'booking_status'::regtype;
  
  -- Should be 25 values now (21 previous + 4 new)
  IF booking_status_count < 25 THEN
    RAISE WARNING 'booking_status has % values, expected at least 25', booking_status_count;
  ELSE
    RAISE NOTICE 'booking_status validated: % values (added partially_completed, requires_followup, rework_required, abandoned)', booking_status_count;
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION
-- ============================================================================

/*
NEW STATES USAGE:

1. partially_completed
   - When: Project work is incomplete but progress made
   - Example: "Installed 60% of cabinets, need another day"
   - Next states: requires_followup, completed, disputed
   
2. requires_followup
   - When: Additional visit scheduled to finish work
   - Example: "Waiting for parts, will return next week"
   - Next states: scheduled, in_progress, cancelled_customer, cancelled_provider
   
3. rework_required
   - When: Disputed work must be redone by same provider
   - Example: "Paint job needs redoing, provider agreed"
   - Next states: scheduled, in_progress, completed
   
4. abandoned
   - When: No activity for extended period (no fault)
   - Example: "Draft not submitted in 24 hours", "Provider never responded"
   - Terminal state (no further transitions)
   - Distinct from cancellation: no penalty/refund logic

HELPER FIELDS:

- reschedule_count: Track rescheduling frequency (UX metric)
- completion_percentage: For partially_completed (reporting)
- followup_scheduled_at: For requires_followup (scheduling)
- abandoned_at: Timestamp of abandonment (analytics)
- abandonment_reason: Why abandoned (auto vs manual)
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
