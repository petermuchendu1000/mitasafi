-- Migration: Functional Enforcement Tests
-- Purpose: Verify triggers actually block invalid operations (not just exist)
-- Creates test data, attempts invalid operations, verifies blocks, cleans up

-- ============================================================================
-- SETUP: Create minimal test data
-- ============================================================================

DO $$
DECLARE
  test_customer_id uuid := '10000000-0000-0000-0000-000000000001'::uuid;
  test_provider_id uuid := '10000000-0000-0000-0000-000000000002'::uuid;
  test_category_id uuid := '10000000-0000-0000-0000-000000000003'::uuid;
  test_service_type_id uuid := '10000000-0000-0000-0000-000000000004'::uuid;
  test_service_id uuid := '10000000-0000-0000-0000-000000000005'::uuid;
  test_booking_id uuid;
BEGIN
  RAISE NOTICE '=== SETUP: Creating test data ===';
  
  -- Create test category
  INSERT INTO service_categories (id, name, slug, description, display_order)
  VALUES (test_category_id, 'Test Category', 'test-category', 'For testing only', 999)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create test service type
  INSERT INTO service_types (id, code, name, booking_flow, description)
  VALUES (test_service_type_id, 'test-type', 'Test Service Type', 'standard', 'For testing only')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create test provider
  INSERT INTO service_providers (id, user_id, business_name, email, phone, is_active)
  VALUES (test_provider_id, test_customer_id, 'Test Provider', 'test@test.com', '+254700000000', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create test service
  INSERT INTO services (id, category_id, provider_id, service_type_id, title, slug, is_active)
  VALUES (test_service_id, test_category_id, test_provider_id, test_service_type_id, 'Test Service', 'test-service', true)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Test data created';
  
  -- ========================================================================
  -- TEST 1: Invalid transition (draft → completed should fail)
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 1: Invalid Transition (draft → completed) ===';
  
  test_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (id, customer_id, service_id, service_type_id, booking_flow_type, status)
  VALUES (test_booking_id, test_customer_id, test_service_id, test_service_type_id, 'standard', 'draft');
  
  BEGIN
    UPDATE bookings SET status = 'completed' WHERE id = test_booking_id;
    RAISE EXCEPTION '❌ TEST 1 FAILED: Invalid transition (draft → completed) was NOT blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Invalid transition from draft to%' THEN
        RAISE NOTICE '✅ TEST 1 PASSED: Invalid transition correctly blocked';
        RAISE NOTICE '   Error message: %', SQLERRM;
      ELSE
        RAISE EXCEPTION '❌ TEST 1 FAILED: Wrong error - %', SQLERRM;
      END IF;
  END;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  
  -- ========================================================================
  -- TEST 2: Terminal state protection (resolved → submitted should fail)
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 2: Terminal State Protection (resolved → ANY) ===';
  
  test_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status, agreed_price, actual_start, actual_end
  ) VALUES (
    test_booking_id, test_customer_id, test_provider_id, test_service_id, test_service_type_id,
    'standard', 'resolved', 1000.00, now() - interval '2 hours', now() - interval '1 hour'
  );
  
  BEGIN
    UPDATE bookings SET status = 'submitted' WHERE id = test_booking_id;
    RAISE EXCEPTION '❌ TEST 2 FAILED: Terminal state modification was NOT blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Cannot modify booking in terminal state%' THEN
        RAISE NOTICE '✅ TEST 2 PASSED: Terminal state correctly protected';
        RAISE NOTICE '   Error message: %', SQLERRM;
      ELSE
        RAISE EXCEPTION '❌ TEST 2 FAILED: Wrong error - %', SQLERRM;
      END IF;
  END;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  
  -- ========================================================================
  -- TEST 3: Missing required field (confirmed without provider_id)
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 3: Missing Required Field (confirmed without provider) ===';
  
  test_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (id, customer_id, service_id, service_type_id, booking_flow_type, status)
  VALUES (test_booking_id, test_customer_id, test_service_id, test_service_type_id, 'standard', 'submitted');
  
  BEGIN
    UPDATE bookings SET status = 'confirmed' WHERE id = test_booking_id;
    RAISE EXCEPTION '❌ TEST 3 FAILED: Missing provider_id was NOT blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%requires provider_id to be set%' THEN
        RAISE NOTICE '✅ TEST 3 PASSED: Required field validation working';
        RAISE NOTICE '   Error message: %', SQLERRM;
      ELSE
        RAISE EXCEPTION '❌ TEST 3 FAILED: Wrong error - %', SQLERRM;
      END IF;
  END;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  
  -- ========================================================================
  -- TEST 4: Valid transition with auto-timestamp (should succeed)
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 4: Valid Transition + Auto-Timestamp ===';
  
  test_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (id, customer_id, provider_id, service_id, service_type_id, booking_flow_type, status)
  VALUES (test_booking_id, test_customer_id, test_provider_id, test_service_id, test_service_type_id, 'standard', 'confirmed');
  
  BEGIN
    -- Move to in_progress without setting actual_start (should auto-populate)
    UPDATE bookings SET status = 'in_progress' WHERE id = test_booking_id;
    
    -- Verify actual_start was auto-set
    IF EXISTS (SELECT 1 FROM bookings WHERE id = test_booking_id AND actual_start IS NOT NULL) THEN
      RAISE NOTICE '✅ TEST 4 PASSED: Valid transition allowed AND actual_start auto-populated';
    ELSE
      RAISE EXCEPTION '❌ TEST 4 FAILED: actual_start was NOT auto-populated';
    END IF;
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 4 FAILED: Valid transition was blocked - %', SQLERRM;
  END;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  
  -- ========================================================================
  -- TEST 5: Backward transition prevention (completed → in_progress)
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 5: Backward Time Travel Prevention ===';
  
  test_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status, actual_start, actual_end
  ) VALUES (
    test_booking_id, test_customer_id, test_provider_id, test_service_id, test_service_type_id,
    'standard', 'completed', now() - interval '2 hours', now() - interval '1 hour'
  );
  
  BEGIN
    UPDATE bookings SET status = 'in_progress' WHERE id = test_booking_id;
    RAISE EXCEPTION '❌ TEST 5 FAILED: Backward transition (completed → in_progress) was NOT blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%Invalid transition from completed to in_progress%' THEN
        RAISE NOTICE '✅ TEST 5 PASSED: Backward transition correctly blocked';
        RAISE NOTICE '   Error message: %', SQLERRM;
      ELSE
        RAISE EXCEPTION '❌ TEST 5 FAILED: Wrong error - %', SQLERRM;
      END IF;
  END;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  
  -- ========================================================================
  -- TEST 6: Partial completion validation (missing percentage)
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 6: Partial Completion Validation ===';
  
  test_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status, actual_start
  ) VALUES (
    test_booking_id, test_customer_id, test_provider_id, test_service_id, test_service_type_id,
    'standard', 'in_progress', now() - interval '1 hour'
  );
  
  BEGIN
    UPDATE bookings SET status = 'partially_completed' WHERE id = test_booking_id;
    RAISE EXCEPTION '❌ TEST 6 FAILED: Missing completion_percentage was NOT blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%requires completion_percentage%' THEN
        RAISE NOTICE '✅ TEST 6 PASSED: completion_percentage requirement enforced';
        RAISE NOTICE '   Error message: %', SQLERRM;
      ELSE
        RAISE EXCEPTION '❌ TEST 6 FAILED: Wrong error - %', SQLERRM;
      END IF;
  END;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  
  -- ========================================================================
  -- TEST 7: Abandoned status validation (missing reason)
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 7: Abandoned Status Validation ===';
  
  test_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (id, customer_id, service_id, service_type_id, booking_flow_type, status)
  VALUES (test_booking_id, test_customer_id, test_service_id, test_service_type_id, 'standard', 'draft');
  
  BEGIN
    UPDATE bookings SET status = 'abandoned' WHERE id = test_booking_id;
    RAISE EXCEPTION '❌ TEST 7 FAILED: Missing abandonment_reason was NOT blocked';
  EXCEPTION
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%requires abandonment_reason%' THEN
        RAISE NOTICE '✅ TEST 7 PASSED: abandonment_reason requirement enforced';
        RAISE NOTICE '   Error message: %', SQLERRM;
      ELSE
        RAISE EXCEPTION '❌ TEST 7 FAILED: Wrong error - %', SQLERRM;
      END IF;
  END;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  
  -- ========================================================================
  -- TEST 8: Reschedule counter increment
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== TEST 8: Reschedule Counter Tracking ===';
  
  test_booking_id := gen_random_uuid();
  
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status, scheduled_start
  ) VALUES (
    test_booking_id, test_customer_id, test_provider_id, test_service_id, test_service_type_id,
    'standard', 'scheduled', now() + interval '1 day'
  );
  
  -- Reschedule once
  UPDATE bookings SET scheduled_start = now() + interval '2 days' WHERE id = test_booking_id;
  
  -- Verify counter incremented
  IF EXISTS (SELECT 1 FROM bookings WHERE id = test_booking_id AND reschedule_count = 1) THEN
    RAISE NOTICE '✅ TEST 8 PASSED: reschedule_count incremented to 1';
  ELSE
    RAISE EXCEPTION '❌ TEST 8 FAILED: reschedule_count was NOT incremented';
  END IF;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  
  -- ========================================================================
  -- CLEANUP: Remove test data
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '=== CLEANUP: Removing test data ===';
  
  DELETE FROM services WHERE id = test_service_id;
  DELETE FROM service_providers WHERE id = test_provider_id;
  DELETE FROM service_types WHERE id = test_service_type_id;
  DELETE FROM service_categories WHERE id = test_category_id;
  
  RAISE NOTICE '✅ Test data cleaned up';
  
  -- ========================================================================
  -- SUMMARY
  -- ========================================================================
  
  RAISE NOTICE '';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'ALL FUNCTIONAL ENFORCEMENT TESTS PASSED';
  RAISE NOTICE '==============================================================';
  RAISE NOTICE 'Verified:';
  RAISE NOTICE '  ✅ Invalid transitions blocked (draft → completed)';
  RAISE NOTICE '  ✅ Terminal states protected (resolved immutable)';
  RAISE NOTICE '  ✅ Required fields enforced (provider_id for confirmed)';
  RAISE NOTICE '  ✅ Auto-timestamps working (actual_start populated)';
  RAISE NOTICE '  ✅ Backward transitions blocked (completed → in_progress)';
  RAISE NOTICE '  ✅ Partial completion validated (completion_percentage)';
  RAISE NOTICE '  ✅ Abandonment validated (abandonment_reason)';
  RAISE NOTICE '  ✅ Reschedule tracking working (counter incremented)';
  RAISE NOTICE '';
  RAISE NOTICE 'State machine enforcement is FULLY FUNCTIONAL';
  RAISE NOTICE '==============================================================';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Cleanup on any failure
    DELETE FROM services WHERE id = test_service_id;
    DELETE FROM service_providers WHERE id = test_provider_id;
    DELETE FROM service_types WHERE id = test_service_type_id;
    DELETE FROM service_categories WHERE id = test_category_id;
    
    RAISE EXCEPTION 'ENFORCEMENT TEST SUITE FAILED: %', SQLERRM;
END $$;
