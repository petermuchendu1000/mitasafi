-- =====================================================================================
-- Migration: 20260109120010_enhance_service_type_immutability
-- Purpose: Fix DISTINCT FROM operator and add verification state protection
-- Author: System
-- Date: 2026-01-09
--
-- CRITICAL ENHANCEMENT: Strengthen service_type_id immutability
--
-- Fixes:
-- 1. Replace != with IS DISTINCT FROM (safer NULL handling)
-- 2. Add verification state check (prevent bait-and-switch during verification)
-- 3. Add explicit policy documentation
--
-- Policy:
-- - service_type_id is ALWAYS immutable after bookings exist (unchanged)
-- - service_type_id becomes immutable once service is verified (NEW)
-- - Only draft/unverified services without bookings can change type (explicit)
-- =====================================================================================

-- Drop existing function to recreate with enhancements
DROP FUNCTION IF EXISTS prevent_service_type_change() CASCADE;

CREATE OR REPLACE FUNCTION prevent_service_type_change()
RETURNS TRIGGER AS $$
DECLARE
  booking_count int;
  service_verification_status text;
BEGIN
  -- Only check if service_type_id is actually changing
  -- Use IS DISTINCT FROM for safer NULL handling (though NOT NULL constraint exists)
  IF OLD.service_type_id IS DISTINCT FROM NEW.service_type_id THEN
    
    -- ===================================================================
    -- RULE 1: Immutable after ANY booking exists (CRITICAL)
    -- ===================================================================
    SELECT COUNT(*) INTO booking_count
    FROM bookings
    WHERE service_id = OLD.id
    LIMIT 1;
    
    IF booking_count > 0 THEN
      RAISE EXCEPTION 'Cannot change service_type_id for service % - % booking(s) exist', 
        OLD.id, booking_count
        USING HINT = 'service_type_id is immutable after first booking. Create a new service listing for different service type.',
              ERRCODE = '23514';  -- check_violation
    END IF;
    
    -- ===================================================================
    -- RULE 2: Immutable after verification (prevents bait-and-switch)
    -- ===================================================================
    -- Check if verification system exists (backward compatible)
    IF EXISTS (SELECT 1 FROM pg_class WHERE relname = 'service_provider_verifications') THEN
      
      -- Get verification status for the provider offering this service
      SELECT spv.verification_status INTO service_verification_status
      FROM services s
      INNER JOIN service_providers sp ON s.provider_id = sp.id
      LEFT JOIN service_provider_verifications spv ON sp.id = spv.provider_id
      WHERE s.id = OLD.id;
      
      -- Block if provider is verified or pending verification
      IF service_verification_status IN ('verified', 'pending') THEN
        RAISE EXCEPTION 'Cannot change service_type_id for service % - provider is % (verification status)', 
          OLD.id, service_verification_status
          USING HINT = 'service_type_id is immutable once provider verification begins. Create a new service listing.',
                ERRCODE = '23514';
      END IF;
    END IF;
    
    -- ===================================================================
    -- RULE 3: Log the change for audit trail (if allowed)
    -- ===================================================================
    RAISE NOTICE 'service_type_id changed for service %: % → %', 
      OLD.id, OLD.service_type_id, NEW.service_type_id;
    RAISE NOTICE 'This is allowed because: no bookings exist and provider is not verified';
    
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION prevent_service_type_change IS 
'CRITICAL: Enforces service_type_id immutability. Blocks changes if: (1) ANY booking exists, OR (2) provider is verified/pending verification. Uses IS DISTINCT FROM for safe NULL handling.';

-- Recreate trigger
CREATE TRIGGER prevent_service_type_change_trigger
  BEFORE UPDATE ON services
  FOR EACH ROW
  EXECUTE FUNCTION prevent_service_type_change();

COMMENT ON TRIGGER prevent_service_type_change_trigger ON services IS
'Prevents service_type_id changes after bookings exist or verification begins. One service = one service type.';

-- =====================================================================================
-- Add complementary check constraint (belt AND suspenders)
-- =====================================================================================

-- Note: Cannot add CHECK constraint directly because it would need to query bookings table
-- But we can add a comment documenting the policy
COMMENT ON COLUMN services.service_type_id IS 
'IMMUTABLE: One service = one service type (enforced by prevent_service_type_change_trigger). 
Emergency plumbing is a DIFFERENT service than standard plumbing.
Changes blocked if: (1) bookings exist, OR (2) provider verified/pending.
Only draft services from unverified providers can change type.';

-- =====================================================================================
-- Verification
-- =====================================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SERVICE TYPE IMMUTABILITY ENHANCED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Enhancements:';
  RAISE NOTICE '  ✅ Fixed: != operator → IS DISTINCT FROM';
  RAISE NOTICE '  ✅ Added: Verification status check';
  RAISE NOTICE '  ✅ Added: Explicit error codes (23514)';
  RAISE NOTICE '  ✅ Added: Audit logging for allowed changes';
  RAISE NOTICE '';
  RAISE NOTICE 'Policy:';
  RAISE NOTICE '  🔒 IMMUTABLE if bookings exist';
  RAISE NOTICE '  🔒 IMMUTABLE if provider verified/pending';
  RAISE NOTICE '  ✏️  MUTABLE only for draft services (no bookings, unverified)';
  RAISE NOTICE '';
  RAISE NOTICE 'Protection Strength: CRITICAL';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
END $$;
