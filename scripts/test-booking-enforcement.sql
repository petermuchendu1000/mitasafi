-- Test Script: Validate Booking Status Enforcement
-- Purpose: Verify state transition and field validation triggers work correctly
-- Run this AFTER deploying enforcement migrations

-- ============================================================================
-- TEST 1: Valid Transition (Should succeed)
-- ============================================================================

DO $$
DECLARE
  test_booking_id uuid;
BEGIN
  RAISE NOTICE '=== TEST 1: Valid Transition (draft → submitted) ===';
  
  -- Create test booking
  INSERT INTO bookings (
    id, customer_id, service_id, service_type_id, booking_flow_type, status
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'standard', 'draft'
  ) RETURNING id INTO test_booking_id;
  
  RAISE NOTICE 'Created test booking: %', test_booking_id;
  
  -- Valid transition: draft → submitted
  UPDATE bookings SET status = 'submitted' WHERE id = test_booking_id;
  
  RAISE NOTICE '✅ TEST 1 PASSED: draft → submitted allowed';
  
  -- Cleanup
  DELETE FROM bookings WHERE id = test_booking_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 1 FAILED: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 2: Invalid Transition - Skip Ahead (Should fail)
-- ============================================================================

DO $$
DECLARE
  test_booking_id uuid;
BEGIN
  RAISE NOTICE '=== TEST 2: Invalid Transition (draft → completed) ===';
  
  -- Create test booking
  INSERT INTO bookings (
    id, customer_id, service_id, service_type_id, booking_flow_type, status
  ) VALUES (
    gen_random_uuid(), '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'standard', 'draft'
  ) RETURNING id INTO test_booking_id;
  
  -- Invalid transition: draft → completed (skipping execution)
  UPDATE bookings SET status = 'completed' WHERE id = test_booking_id;
  
  RAISE NOTICE '❌ TEST 2 FAILED: draft → completed should be blocked';
  
  -- Cleanup
  DELETE FROM bookings WHERE id = test_booking_id;
  
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Invalid transition from draft to completed%' THEN
      RAISE NOTICE '✅ TEST 2 PASSED: Invalid transition blocked correctly';
    ELSE
      RAISE NOTICE '❌ TEST 2 FAILED: Wrong error: %', SQLERRM;
    END IF;
END $$;

-- ============================================================================
-- TEST 3: Terminal State Protection (Should fail)
-- ============================================================================

DO $$
DECLARE
  test_booking_id uuid;
BEGIN
  RAISE NOTICE '=== TEST 3: Terminal State Protection (resolved → submitted) ===';
  
  -- Create test booking in terminal state
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status, agreed_price,
    actual_start, actual_end
  ) VALUES (
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'standard', 'resolved', 1000.00,
    now() - interval '2 hours', now() - interval '1 hour'
  ) RETURNING id INTO test_booking_id;
  
  -- Try to modify terminal state
  UPDATE bookings SET status = 'submitted' WHERE id = test_booking_id;
  
  RAISE NOTICE '❌ TEST 3 FAILED: resolved → submitted should be blocked';
  
  -- Cleanup
  DELETE FROM bookings WHERE id = test_booking_id;
  
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%Cannot modify booking in terminal state: resolved%' THEN
      RAISE NOTICE '✅ TEST 3 PASSED: Terminal state protection working';
    ELSE
      RAISE NOTICE '❌ TEST 3 FAILED: Wrong error: %', SQLERRM;
    END IF;
END $$;

-- ============================================================================
-- TEST 4: State-Dependent Fields - Missing provider_id (Should fail)
-- ============================================================================

DO $$
DECLARE
  test_booking_id uuid;
BEGIN
  RAISE NOTICE '=== TEST 4: Missing Required Field (confirmed without provider_id) ===';
  
  -- Create test booking
  INSERT INTO bookings (
    id, customer_id, service_id, service_type_id, booking_flow_type, status
  ) VALUES (
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'standard', 'submitted'
  ) RETURNING id INTO test_booking_id;
  
  -- Try to move to confirmed without provider_id
  UPDATE bookings SET status = 'confirmed' WHERE id = test_booking_id;
  
  RAISE NOTICE '❌ TEST 4 FAILED: confirmed without provider_id should be blocked';
  
  -- Cleanup
  DELETE FROM bookings WHERE id = test_booking_id;
  
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%requires provider_id to be set%' THEN
      RAISE NOTICE '✅ TEST 4 PASSED: Missing required field caught';
    ELSE
      RAISE NOTICE '❌ TEST 4 FAILED: Wrong error: %', SQLERRM;
    END IF;
END $$;

-- ============================================================================
-- TEST 5: Auto-timestamp Population (Should succeed)
-- ============================================================================

DO $$
DECLARE
  test_booking_id uuid;
  start_time timestamptz;
BEGIN
  RAISE NOTICE '=== TEST 5: Auto-timestamp Population (in_progress without actual_start) ===';
  
  -- Create test booking with provider
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status
  ) VALUES (
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'standard', 'confirmed'
  ) RETURNING id INTO test_booking_id;
  
  -- Move to in_progress without setting actual_start (should auto-set)
  UPDATE bookings SET status = 'in_progress' WHERE id = test_booking_id
  RETURNING actual_start INTO start_time;
  
  IF start_time IS NOT NULL THEN
    RAISE NOTICE '✅ TEST 5 PASSED: actual_start auto-populated to %', start_time;
  ELSE
    RAISE NOTICE '❌ TEST 5 FAILED: actual_start was not auto-populated';
  END IF;
  
  -- Cleanup
  DELETE FROM bookings WHERE id = test_booking_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 5 FAILED: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 6: Reschedule Counter (Should increment)
-- ============================================================================

DO $$
DECLARE
  test_booking_id uuid;
  reschedule_count int;
BEGIN
  RAISE NOTICE '=== TEST 6: Reschedule Counter ===';
  
  -- Create test booking with schedule
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status, scheduled_start
  ) VALUES (
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'standard', 'scheduled', now() + interval '1 day'
  ) RETURNING id INTO test_booking_id;
  
  -- Reschedule once
  UPDATE bookings 
  SET scheduled_start = now() + interval '2 days'
  WHERE id = test_booking_id
  RETURNING reschedule_count INTO reschedule_count;
  
  IF reschedule_count = 1 THEN
    RAISE NOTICE '✅ TEST 6 PASSED: reschedule_count = 1 after first reschedule';
  ELSE
    RAISE NOTICE '❌ TEST 6 FAILED: reschedule_count = %, expected 1', reschedule_count;
  END IF;
  
  -- Cleanup
  DELETE FROM bookings WHERE id = test_booking_id;
  
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '❌ TEST 6 FAILED: %', SQLERRM;
END $$;

-- ============================================================================
-- TEST 7: Abandoned Status Validation (Should fail without reason)
-- ============================================================================

DO $$
DECLARE
  test_booking_id uuid;
BEGIN
  RAISE NOTICE '=== TEST 7: Abandoned Status (missing abandonment_reason) ===';
  
  -- Create test booking
  INSERT INTO bookings (
    id, customer_id, service_id, service_type_id, booking_flow_type, status
  ) VALUES (
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'standard', 'draft'
  ) RETURNING id INTO test_booking_id;
  
  -- Try to abandon without reason
  UPDATE bookings SET status = 'abandoned' WHERE id = test_booking_id;
  
  RAISE NOTICE '❌ TEST 7 FAILED: abandoned without reason should be blocked';
  
  -- Cleanup
  DELETE FROM bookings WHERE id = test_booking_id;
  
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%requires abandonment_reason%' THEN
      RAISE NOTICE '✅ TEST 7 PASSED: abandonment_reason requirement enforced';
    ELSE
      RAISE NOTICE '❌ TEST 7 FAILED: Wrong error: %', SQLERRM;
    END IF;
END $$;

-- ============================================================================
-- TEST 8: Partially Completed Validation (Should fail without percentage)
-- ============================================================================

DO $$
DECLARE
  test_booking_id uuid;
BEGIN
  RAISE NOTICE '=== TEST 8: Partially Completed (missing completion_percentage) ===';
  
  -- Create test booking in progress
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status, actual_start
  ) VALUES (
    gen_random_uuid(), 
    '00000000-0000-0000-0000-000000000001'::uuid,
    '00000000-0000-0000-0000-000000000004'::uuid,
    '00000000-0000-0000-0000-000000000002'::uuid,
    '00000000-0000-0000-0000-000000000003'::uuid,
    'standard', 'in_progress', now() - interval '1 hour'
  ) RETURNING id INTO test_booking_id;
  
  -- Try to mark partially_completed without percentage
  UPDATE bookings SET status = 'partially_completed' WHERE id = test_booking_id;
  
  RAISE NOTICE '❌ TEST 8 FAILED: partially_completed without percentage should be blocked';
  
  -- Cleanup
  DELETE FROM bookings WHERE id = test_booking_id;
  
EXCEPTION
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%requires completion_percentage%' THEN
      RAISE NOTICE '✅ TEST 8 PASSED: completion_percentage requirement enforced';
    ELSE
      RAISE NOTICE '❌ TEST 8 FAILED: Wrong error: %', SQLERRM;
    END IF;
END $$;

-- ============================================================================
-- TEST SUMMARY
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '==========================================================';
  RAISE NOTICE 'ENFORCEMENT TEST SUITE COMPLETE';
  RAISE NOTICE 'Check the NOTICE messages above for test results';
  RAISE NOTICE 'All tests with ✅ PASSED are working correctly';
  RAISE NOTICE 'Any tests with ❌ FAILED indicate enforcement issues';
  RAISE NOTICE '==========================================================';
END $$;
