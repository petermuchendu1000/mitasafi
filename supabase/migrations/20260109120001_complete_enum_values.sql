-- Migration: Complete Enum Values (Pre-Seeding Finality)
-- Purpose: Add missing enum values identified in rigorous audit
-- Critical: These states are used in Journey 2 or required for operations
-- Created: 2026-01-09
-- Status: BLOCKER - Must deploy before seeding

-- ============================================================================
-- FIX 1: Add missing booking_status values
-- ============================================================================

-- Add 'scheduled' - Used in Journey 2 recurring bookings
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'scheduled' AFTER 'confirmed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add 'needs_reassignment' - Used in Journey 2 capacity overflow
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'needs_reassignment' AFTER 'cancelled_provider';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add 'provider_no_show' - Operational necessity for no-show tracking
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'provider_no_show' AFTER 'completed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add 'customer_no_show' - Operational necessity for delivery/personal services
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'customer_no_show' AFTER 'provider_no_show';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add 'payment_pending' - Payment lifecycle tracking
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_pending' AFTER 'customer_confirmed';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add 'payment_failed' - Payment failure tracking
DO $$ BEGIN
  ALTER TYPE booking_status ADD VALUE IF NOT EXISTS 'payment_failed' AFTER 'payment_pending';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE booking_status IS 
'Complete booking lifecycle including scheduled future bookings, no-shows, reassignment, and payment states. 
Ordered roughly by progression: draft → submitted → viewed → quote flow → confirmed → scheduled → in_progress → completed → no_shows → customer_confirmed → payment → cancelled/disputed/resolved/reassignment';

-- ============================================================================
-- FIX 2: Add missing verification_status values
-- ============================================================================

-- Add 'resubmitted' - Provider uploaded new docs after rejection
DO $$ BEGIN
  ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'resubmitted' AFTER 'rejected';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add 'under_review' - Active admin review (not just sitting in queue)
DO $$ BEGIN
  ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'under_review' AFTER 'pending';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

-- Add 'revoked' - Was verified but admin found issue later (different from expired)
DO $$ BEGIN
  ALTER TYPE verification_status ADD VALUE IF NOT EXISTS 'revoked' AFTER 'verified';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

COMMENT ON TYPE verification_status IS 
'Complete verification lifecycle: 
- draft: Service added, no docs yet
- not_started: Provider aware they need docs
- pending: Docs submitted, in queue
- under_review: Admin actively reviewing
- verified: Approved and active
- revoked: Was verified but admin found issue (fraud, complaint)
- rejected: Failed initial review
- resubmitted: Provider uploaded new docs after rejection
- expired: Certification/license expired (time-based, not quality-based)';

-- ============================================================================
-- VALIDATION: Verify all expected values exist
-- ============================================================================

DO $$
DECLARE
  booking_status_count int;
  verification_status_count int;
BEGIN
  -- Count booking_status enum values
  SELECT COUNT(*) INTO booking_status_count
  FROM pg_enum
  WHERE enumtypid = 'booking_status'::regtype;
  
  -- Should be 21 values now (original 15 + 6 new)
  IF booking_status_count < 21 THEN
    RAISE WARNING 'booking_status has % values, expected at least 21', booking_status_count;
  ELSE
    RAISE NOTICE 'booking_status validated: % values', booking_status_count;
  END IF;
  
  -- Count verification_status enum values
  SELECT COUNT(*) INTO verification_status_count
  FROM pg_enum
  WHERE enumtypid = 'verification_status'::regtype;
  
  -- Should be 9 values now (original 6 + 3 new)
  IF verification_status_count < 9 THEN
    RAISE WARNING 'verification_status has % values, expected at least 9', verification_status_count;
  ELSE
    RAISE NOTICE 'verification_status validated: % values', verification_status_count;
  END IF;
END $$;

-- ============================================================================
-- DOCUMENTATION: Complete state machines
-- ============================================================================

/*
BOOKING_STATUS STATE MACHINE (Complete):

Happy Path:
draft → submitted → provider_viewed → confirmed → scheduled → in_progress → completed → customer_confirmed → payment_pending → resolved

Quote Flow:
draft → submitted → quote_pending → quote_sent → quote_accepted → confirmed → ...

Failure Modes:
- quote_sent → quote_rejected (customer declines)
- confirmed → cancelled_customer (before work starts)
- confirmed → cancelled_provider (provider can't do it)
- scheduled → needs_reassignment (capacity issue)
- confirmed → provider_no_show (provider didn't arrive)
- in_progress → customer_no_show (customer unavailable)
- completed → disputed (quality issue)
- payment_pending → payment_failed (payment declined)

Terminal States:
- resolved (all good, payment complete)
- cancelled_customer (customer cancelled)
- cancelled_provider (provider cancelled)
- quote_rejected (customer declined quote)
- needs_reassignment (need new provider)

VERIFICATION_STATUS STATE MACHINE (Complete):

Happy Path:
draft → not_started → pending → under_review → verified

Rejection → Resubmission:
under_review → rejected → resubmitted → pending → under_review → verified

Revocation:
verified → revoked (fraud discovered, complaint upheld)

Expiration:
verified → expired (certificate/license expired) → pending (renewal) → verified

Terminal States:
- verified (active)
- rejected (failed, no resubmission)
- revoked (fraud/safety)
*/

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
