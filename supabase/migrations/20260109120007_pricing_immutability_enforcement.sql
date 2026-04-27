-- =====================================================================================
-- Migration: 20260109120005_pricing_immutability_enforcement
-- Purpose: Enforce single source of truth for pricing - pricing_snapshot
-- Author: System
-- Date: 2026-01-09
--
-- CRITICAL REQUIREMENT: Prevent "double-authority trap" in pricing
--
-- DECLARATION:
-- The legally authoritative price for a booking is stored in:
--   bookings.pricing_snapshot->>'total'
-- after the booking reaches status 'customer_confirmed'.
--
-- Before customer_confirmed: Prices are negotiable
-- At customer_confirmed: pricing_snapshot MUST be set and agreed_price MUST match
-- After customer_confirmed: Both fields become IMMUTABLE
--
-- This migration implements 4 protections:
-- 1. Immutability after confirmation (agreed_price + pricing_snapshot)
-- 2. Synchronization enforcement (agreed_price = pricing_snapshot.total)
-- 3. Quote snapshotting (capture quote when sent)
-- 4. Non-null validation (pricing_snapshot required at customer_confirmed)
-- =====================================================================================

-- =====================================================================================
-- PROTECTION 1: Prevent price modification after customer confirmation
-- =====================================================================================

CREATE OR REPLACE FUNCTION protect_pricing_after_confirmation()
RETURNS TRIGGER AS $$
BEGIN
  -- If booking has reached customer_confirmed or any later status, pricing is IMMUTABLE
  -- This protects against accidental or malicious price changes after customer commitment
  
  IF OLD.status IN (
    'customer_confirmed',
    'payment_pending',
    'payment_failed',
    'scheduled',
    'confirmed',
    'in_progress',
    'paused',
    'completed',
    'partially_completed',
    'requires_followup',
    'rework_required',
    'disputed',
    'resolved',
    'cancelled_by_customer',
    'cancelled_by_provider',
    'cancelled_by_system',
    'refunded',
    'needs_reassignment',
    'abandoned'
  ) THEN
    
    -- Prevent agreed_price changes
    IF NEW.agreed_price IS DISTINCT FROM OLD.agreed_price THEN
      RAISE EXCEPTION 'Cannot modify agreed_price after customer confirmation (Status: %). Booking: %, Old: %, New: %',
        OLD.status, OLD.id, OLD.agreed_price, NEW.agreed_price
        USING HINT = 'Use booking_disputes.refund_amount for price adjustments. The agreed_price is immutable after customer_confirmed.';
    END IF;
    
    -- Prevent pricing_snapshot changes (CRITICAL - this is the legal record)
    IF NEW.pricing_snapshot IS DISTINCT FROM OLD.pricing_snapshot THEN
      RAISE EXCEPTION 'Cannot modify pricing_snapshot after customer confirmation (Status: %). Booking: %',
        OLD.status, OLD.id
        USING HINT = 'pricing_snapshot is the immutable legal record for dispute resolution. It cannot be changed after customer_confirmed.';
    END IF;
    
    -- Also prevent quoted_price changes (to maintain consistency)
    IF NEW.quoted_price IS DISTINCT FROM OLD.quoted_price THEN
      RAISE EXCEPTION 'Cannot modify quoted_price after customer confirmation (Status: %). Booking: %, Old: %, New: %',
        OLD.status, OLD.id, OLD.quoted_price, NEW.quoted_price
        USING HINT = 'All pricing fields are immutable after customer_confirmed.';
    END IF;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION protect_pricing_after_confirmation IS 
'CRITICAL: Enforces immutability of pricing fields after customer_confirmed status. This prevents the "double-authority trap" where agreed_price and pricing_snapshot could diverge, creating legal ambiguity in disputes.';

-- Create trigger
DROP TRIGGER IF EXISTS protect_pricing_after_confirmation_trigger ON bookings;
CREATE TRIGGER protect_pricing_after_confirmation_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION protect_pricing_after_confirmation();

COMMENT ON TRIGGER protect_pricing_after_confirmation_trigger ON bookings IS
'Prevents modification of agreed_price, quoted_price, and pricing_snapshot after customer_confirmed. This is the PRIMARY protection for pricing authority.';

-- =====================================================================================
-- PROTECTION 2: Enforce synchronization between agreed_price and pricing_snapshot
-- =====================================================================================

CREATE OR REPLACE FUNCTION enforce_price_synchronization()
RETURNS TRIGGER AS $$
DECLARE
  snapshot_total decimal(10,2);
BEGIN
  -- When moving TO customer_confirmed status, verify pricing fields are synchronized
  -- This ensures agreed_price always matches pricing_snapshot.total at the moment of commitment
  
  IF NEW.status = 'customer_confirmed' AND (OLD.status IS NULL OR OLD.status != 'customer_confirmed') THEN
    
    -- Require pricing_snapshot to exist
    IF NEW.pricing_snapshot IS NULL THEN
      RAISE EXCEPTION 'pricing_snapshot is required when transitioning to customer_confirmed. Booking: %',
        NEW.id
        USING HINT = 'Set pricing_snapshot with full pricing breakdown including total, components, and calculated_at timestamp.';
    END IF;
    
    -- Extract total from pricing_snapshot
    BEGIN
      snapshot_total := (NEW.pricing_snapshot->>'total')::decimal(10,2);
    EXCEPTION
      WHEN OTHERS THEN
        RAISE EXCEPTION 'pricing_snapshot.total is invalid or missing. Booking: %, Error: %',
          NEW.id, SQLERRM
          USING HINT = 'pricing_snapshot must have a "total" field with a valid decimal value.';
    END;
    
    -- Verify agreed_price exists
    IF NEW.agreed_price IS NULL THEN
      RAISE EXCEPTION 'agreed_price is required when transitioning to customer_confirmed. Booking: %',
        NEW.id
        USING HINT = 'Set agreed_price to match pricing_snapshot.total';
    END IF;
    
    -- Verify agreed_price matches pricing_snapshot.total
    IF ABS(NEW.agreed_price - snapshot_total) > 0.01 THEN  -- Allow 0.01 tolerance for rounding
      RAISE EXCEPTION 'agreed_price (%) does not match pricing_snapshot.total (%). Booking: %',
        NEW.agreed_price, snapshot_total, NEW.id
        USING HINT = 'These fields must be synchronized at customer_confirmed. Set agreed_price = pricing_snapshot.total';
    END IF;
    
    -- Log synchronization for audit trail
    RAISE NOTICE 'Pricing synchronized for booking %: agreed_price = % = pricing_snapshot.total', 
      NEW.id, NEW.agreed_price;
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION enforce_price_synchronization IS
'CRITICAL: Ensures agreed_price and pricing_snapshot.total are synchronized when booking reaches customer_confirmed. This prevents the double-authority trap by enforcing a single moment of truth.';

-- Create trigger
DROP TRIGGER IF EXISTS enforce_price_synchronization_trigger ON bookings;
CREATE TRIGGER enforce_price_synchronization_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION enforce_price_synchronization();

COMMENT ON TRIGGER enforce_price_synchronization_trigger ON bookings IS
'Validates pricing field synchronization when transitioning to customer_confirmed status.';

-- =====================================================================================
-- PROTECTION 3: Snapshot quote when sent to customer
-- =====================================================================================

CREATE OR REPLACE FUNCTION snapshot_quote_on_send()
RETURNS TRIGGER AS $$
BEGIN
  -- When quote is sent, create initial pricing_snapshot if not already present
  -- This captures what was shown to the customer for audit purposes
  
  IF NEW.status = 'quote_sent' AND (OLD.status IS NULL OR OLD.status != 'quote_sent') THEN
    
    -- Only create snapshot if it doesn't already exist
    IF NEW.pricing_snapshot IS NULL THEN
      
      -- Require quoted_price to exist for quote_sent status
      IF NEW.quoted_price IS NULL THEN
        RAISE EXCEPTION 'quoted_price is required when transitioning to quote_sent. Booking: %',
          NEW.id
          USING HINT = 'Set quoted_price before sending quote to customer.';
      END IF;
      
      -- Create initial pricing snapshot from quote
      NEW.pricing_snapshot := jsonb_build_object(
        'status', 'quote_sent',
        'quoted_price', NEW.quoted_price,
        'currency', COALESCE(NEW.currency, 'KES'),
        'quoted_at', now(),
        'quote_snapshot_version', 1,
        'note', 'Initial quote snapshot - will be replaced with full breakdown at customer_confirmed'
      );
      
      RAISE NOTICE 'Quote snapshot created for booking %: %', NEW.id, NEW.quoted_price;
      
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION snapshot_quote_on_send IS
'Creates initial pricing_snapshot when quote is sent to customer. This captures the quoted amount for audit purposes, preventing quote-change attacks.';

-- Create trigger
DROP TRIGGER IF EXISTS snapshot_quote_on_send_trigger ON bookings;
CREATE TRIGGER snapshot_quote_on_send_trigger
  BEFORE UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION snapshot_quote_on_send();

COMMENT ON TRIGGER snapshot_quote_on_send_trigger ON bookings IS
'Auto-creates pricing_snapshot when quote is sent to customer, capturing the quoted amount.';

-- =====================================================================================
-- PROTECTION 4: Extend state-dependent validation for pricing_snapshot
-- =====================================================================================

-- Drop and recreate the existing function to add pricing_snapshot validation
DROP FUNCTION IF EXISTS validate_booking_state_fields() CASCADE;

CREATE OR REPLACE FUNCTION validate_booking_state_fields()
RETURNS TRIGGER AS $$
BEGIN
  -- Status-specific required field validation
  -- This ensures data integrity for each booking status
  
  -- Draft/Initial: Minimal requirements
  IF NEW.status IN ('draft', 'quote_requested') THEN
    IF NEW.service_id IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires service_id to be set. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Quote sent: Requires quoted_price
  IF NEW.status = 'quote_sent' THEN
    IF NEW.quoted_price IS NULL THEN
      RAISE EXCEPTION 'Status "quote_sent" requires quoted_price. Booking: %', NEW.id;
    END IF;
  END IF;
  
  -- Confirmed: Requires provider
  IF NEW.status IN ('confirmed', 'scheduled', 'in_progress', 'paused', 'completed', 'partially_completed') THEN
    IF NEW.provider_id IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires provider_id to be set. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Customer confirmed and beyond: Requires pricing fields (CRITICAL)
  IF NEW.status IN (
    'customer_confirmed',
    'payment_pending',
    'payment_failed',
    'scheduled',
    'confirmed',
    'in_progress',
    'paused',
    'completed',
    'partially_completed',
    'requires_followup',
    'rework_required',
    'disputed',
    'resolved'
  ) THEN
    -- Require agreed_price
    IF NEW.agreed_price IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires agreed_price to be set. Booking: %', NEW.status, NEW.id
        USING HINT = 'Set agreed_price to the final agreed amount.';
    END IF;
    
    -- Require pricing_snapshot (THE CRITICAL REQUIREMENT)
    IF NEW.pricing_snapshot IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires pricing_snapshot to be set. Booking: %', NEW.status, NEW.id
        USING HINT = 'pricing_snapshot is the immutable legal record. It must contain: service_pricing, components, subtotal, service_fee, total, currency, calculated_at.';
    END IF;
  END IF;
  
  -- In progress: Requires actual_start
  IF NEW.status IN ('in_progress', 'paused', 'completed', 'partially_completed') THEN
    IF NEW.actual_start IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires actual_start timestamp. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Completed: Requires actual_end
  IF NEW.status IN ('completed', 'partially_completed', 'resolved') THEN
    IF NEW.actual_end IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires actual_end timestamp. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Partially completed: Requires completion_percentage
  IF NEW.status = 'partially_completed' THEN
    IF NEW.completion_percentage IS NULL THEN
      RAISE EXCEPTION 'Status "partially_completed" requires completion_percentage. Booking: %', NEW.id;
    END IF;
  END IF;
  
  -- Disputed: Requires dispute to exist
  IF NEW.status = 'disputed' THEN
    -- Note: This will be validated by application logic since we can't easily join in trigger
    RAISE NOTICE 'Booking % marked as disputed - ensure booking_disputes entry exists', NEW.id;
  END IF;
  
  -- Cancelled statuses: Requires cancellation reason
  IF NEW.status IN ('cancelled_by_customer', 'cancelled_by_provider', 'cancelled_by_system') THEN
    IF NEW.cancellation_reason IS NULL THEN
      RAISE EXCEPTION 'Status "%" requires cancellation_reason. Booking: %', NEW.status, NEW.id;
    END IF;
  END IF;
  
  -- Abandoned: Requires abandonment_reason
  IF NEW.status = 'abandoned' THEN
    IF NEW.abandonment_reason IS NULL THEN
      RAISE EXCEPTION 'Status "abandoned" requires abandonment_reason. Booking: %', NEW.id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION validate_booking_state_fields IS
'Enforces required fields for each booking status. CRITICAL: Includes pricing_snapshot non-null requirement for customer_confirmed+ statuses.';

-- Recreate trigger
CREATE TRIGGER enforce_booking_state_fields
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION validate_booking_state_fields();

COMMENT ON TRIGGER enforce_booking_state_fields ON bookings IS
'Validates required fields based on booking status. Includes pricing_snapshot validation.';

-- =====================================================================================
-- DOCUMENTATION: Update schema comments
-- =====================================================================================

COMMENT ON COLUMN bookings.agreed_price IS 
'Final agreed price (scalar for query performance). MUST equal pricing_snapshot.total at customer_confirmed. IMMUTABLE after customer_confirmed.';

COMMENT ON COLUMN bookings.pricing_snapshot IS 
'LEGALLY AUTHORITATIVE: Immutable JSONB record of full pricing breakdown at booking confirmation. Required structure: {service_pricing: {...}, components: [...], subtotal: number, service_fee: number, total: number, currency: string, calculated_at: timestamp}. This is the single source of truth for dispute resolution. IMMUTABLE after customer_confirmed.';

COMMENT ON COLUMN bookings.quoted_price IS
'Provider''s initial quote (for quote_only/project services). Snapshotted at quote_sent. IMMUTABLE after customer_confirmed.';

-- =====================================================================================
-- VERIFICATION QUERIES
-- =====================================================================================

-- Verify all triggers exist
DO $$
DECLARE
  trigger_count integer;
BEGIN
  SELECT COUNT(*) INTO trigger_count
  FROM pg_trigger
  WHERE tgname IN (
    'protect_pricing_after_confirmation_trigger',
    'enforce_price_synchronization_trigger',
    'snapshot_quote_on_send_trigger',
    'enforce_booking_state_fields'
  )
  AND tgrelid = 'bookings'::regclass;
  
  IF trigger_count != 4 THEN
    RAISE WARNING 'Expected 4 pricing protection triggers, found %', trigger_count;
  ELSE
    RAISE NOTICE '✅ All 4 pricing protection triggers installed successfully';
  END IF;
END $$;

-- =====================================================================================
-- MIGRATION COMPLETE
-- =====================================================================================

-- Summary:
-- ✅ Protection 1: Immutability after confirmation (protect_pricing_after_confirmation)
-- ✅ Protection 2: Synchronization enforcement (enforce_price_synchronization)
-- ✅ Protection 3: Quote snapshotting (snapshot_quote_on_send)
-- ✅ Protection 4: Non-null validation (validate_booking_state_fields extended)
--
-- DECLARATION ENFORCED:
-- bookings.pricing_snapshot->>'total' is the legally authoritative price
-- after customer_confirmed status
--
-- IMMUTABILITY ENFORCED:
-- - agreed_price: IMMUTABLE after customer_confirmed
-- - pricing_snapshot: IMMUTABLE after customer_confirmed
-- - quoted_price: IMMUTABLE after customer_confirmed
--
-- SYNCHRONIZATION ENFORCED:
-- - agreed_price MUST equal pricing_snapshot.total at customer_confirmed
-- - Both fields MUST be non-null at customer_confirmed
--
-- Legal protection complete. Ready for production seeding.
