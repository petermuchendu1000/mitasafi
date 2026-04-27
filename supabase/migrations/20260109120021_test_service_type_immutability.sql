-- =====================================================================================
-- Functional Test: Service Type Immutability Enforcement
-- Purpose: Prove that service_type_id cannot be changed in protected scenarios
-- =====================================================================================

DO $$
DECLARE
  test_category_id uuid := '20000000-0000-0000-0000-000000000001'::uuid;
  test_type_standard uuid := '20000000-0000-0000-0000-000000000002'::uuid;
  test_type_emergency uuid := '20000000-0000-0000-0000-000000000003'::uuid;
  test_provider_id uuid := '20000000-0000-0000-0000-000000000004'::uuid;
  test_customer_id uuid := '20000000-0000-0000-0000-000000000005'::uuid;
  test_service_id uuid;
  test_booking_id uuid;
  error_caught boolean;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SERVICE TYPE IMMUTABILITY FUNCTIONAL TEST';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ===================================================================
  -- SETUP: Create test data
  -- ===================================================================
  RAISE NOTICE '=== SETUP: Creating test data ===';
  
  -- Create category
  INSERT INTO service_categories (id, name, slug, description, display_order)
  VALUES (test_category_id, 'Test Category', 'test-cat', 'Test only', 999)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create service types
  INSERT INTO service_types (id, code, name, booking_flow, description)
  VALUES 
    (test_type_standard, 'test-standard', 'Test Standard', 'standard', 'Test'),
    (test_type_emergency, 'test-emergency', 'Test Emergency', 'emergency', 'Test')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create provider
  INSERT INTO service_providers (id, user_id, business_name, email, phone, is_active)
  VALUES (test_provider_id, test_customer_id, 'Test Provider', 'test@test.com', '+254700000000', true)
  ON CONFLICT (id) DO NOTHING;
  
  RAISE NOTICE '✅ Test data created';
  RAISE NOTICE '';
  
  -- ===================================================================
  -- TEST 1: Allow change for new service (no bookings)
  -- ===================================================================
  RAISE NOTICE '=== TEST 1: Allow Type Change (No Bookings) ===';
  
  test_service_id := gen_random_uuid();
  
  INSERT INTO services (id, category_id, service_type_id, name, slug, is_active)
  VALUES (test_service_id, test_category_id, test_type_standard, 'Test Service 1', 'test-svc-1', true);
  
  BEGIN
    -- This SHOULD succeed (no bookings, no verification)
    UPDATE services SET service_type_id = test_type_emergency WHERE id = test_service_id;
    RAISE NOTICE '✅ TEST 1 PASSED: Type change allowed for service with no bookings';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 1 FAILED: Change blocked when it should be allowed - %', SQLERRM;
  END;
  
  DELETE FROM services WHERE id = test_service_id;
  RAISE NOTICE '';
  
  -- ===================================================================
  -- TEST 2: Block change when bookings exist
  -- ===================================================================
  RAISE NOTICE '=== TEST 2: Block Type Change (Bookings Exist) ===';
  
  test_service_id := gen_random_uuid();
  test_booking_id := gen_random_uuid();
  
  INSERT INTO services (id, category_id, service_type_id, name, slug, is_active)
  VALUES (test_service_id, test_category_id, test_type_standard, 'Test Service 2', 'test-svc-2', true);
  
  -- Create a booking
  INSERT INTO bookings (id, customer_id, provider_id, service_id, service_type_id, booking_flow_type, status)
  VALUES (test_booking_id, test_customer_id, test_provider_id, test_service_id, test_type_standard, 'standard', 'draft');
  
  error_caught := false;
  BEGIN
    -- This SHOULD fail (booking exists)
    UPDATE services SET service_type_id = test_type_emergency WHERE id = test_service_id;
    RAISE EXCEPTION '❌ TEST 2 FAILED: Type change was NOT blocked despite booking existing';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM LIKE '%booking(s) exist%' THEN
        RAISE NOTICE '✅ TEST 2 PASSED: Type change blocked when bookings exist';
        RAISE NOTICE '   Error message: %', SQLERRM;
        error_caught := true;
      ELSE
        RAISE EXCEPTION '❌ TEST 2 FAILED: Wrong error - %', SQLERRM;
      END IF;
    WHEN OTHERS THEN
      IF SQLERRM LIKE '%booking(s) exist%' THEN
        RAISE NOTICE '✅ TEST 2 PASSED: Type change blocked when bookings exist';
        RAISE NOTICE '   Error message: %', SQLERRM;
        error_caught := true;
      ELSE
        RAISE EXCEPTION '❌ TEST 2 FAILED: Wrong error - %', SQLERRM;
      END IF;
  END;
  
  IF NOT error_caught THEN
    RAISE EXCEPTION '❌ TEST 2 FAILED: No error was raised';
  END IF;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  DELETE FROM services WHERE id = test_service_id;
  RAISE NOTICE '';
  
  -- ===================================================================
  -- TEST 3: Block NULL assignment (NOT NULL constraint)
  -- ===================================================================
  RAISE NOTICE '=== TEST 3: Block NULL Assignment ===';
  
  test_service_id := gen_random_uuid();
  
  INSERT INTO services (id, category_id, service_type_id, name, slug, is_active)
  VALUES (test_service_id, test_category_id, test_type_standard, 'Test Service 3', 'test-svc-3', true);
  
  error_caught := false;
  BEGIN
    -- This SHOULD fail (NOT NULL constraint)
    UPDATE services SET service_type_id = NULL WHERE id = test_service_id;
    RAISE EXCEPTION '❌ TEST 3 FAILED: NULL assignment was NOT blocked';
  EXCEPTION
    WHEN not_null_violation THEN
      RAISE NOTICE '✅ TEST 3 PASSED: NULL assignment blocked by NOT NULL constraint';
      RAISE NOTICE '   Error message: %', SQLERRM;
      error_caught := true;
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 3 FAILED: Wrong error - %', SQLERRM;
  END;
  
  IF NOT error_caught THEN
    RAISE EXCEPTION '❌ TEST 3 FAILED: No error was raised';
  END IF;
  
  DELETE FROM services WHERE id = test_service_id;
  RAISE NOTICE '';
  
  -- ===================================================================
  -- TEST 4: Block DELETE when bookings exist
  -- ===================================================================
  RAISE NOTICE '=== TEST 4: Block Service DELETE (Bookings Exist) ===';
  
  test_service_id := gen_random_uuid();
  test_booking_id := gen_random_uuid();
  
  INSERT INTO services (id, category_id, service_type_id, name, slug, is_active)
  VALUES (test_service_id, test_category_id, test_type_standard, 'Test Service 4', 'test-svc-4', true);
  
  INSERT INTO bookings (id, customer_id, provider_id, service_id, service_type_id, booking_flow_type, status)
  VALUES (test_booking_id, test_customer_id, test_provider_id, test_service_id, test_type_standard, 'standard', 'draft');
  
  error_caught := false;
  BEGIN
    -- This SHOULD fail (booking references service)
    DELETE FROM services WHERE id = test_service_id;
    RAISE EXCEPTION '❌ TEST 4 FAILED: Service DELETE was NOT blocked despite booking';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE '✅ TEST 4 PASSED: Service DELETE blocked by foreign key (bookings reference)';
      RAISE NOTICE '   Error message: %', SQLERRM;
      error_caught := true;
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 4 FAILED: Wrong error - %', SQLERRM;
  END;
  
  IF NOT error_caught THEN
    RAISE EXCEPTION '❌ TEST 4 FAILED: No error was raised';
  END IF;
  
  DELETE FROM bookings WHERE id = test_booking_id;
  DELETE FROM services WHERE id = test_service_id;
  RAISE NOTICE '';
  
  -- ===================================================================
  -- TEST 5: Block service_type DELETE when services exist
  -- ===================================================================
  RAISE NOTICE '=== TEST 5: Block Service Type DELETE (Services Exist) ===';
  
  test_service_id := gen_random_uuid();
  
  INSERT INTO services (id, category_id, service_type_id, name, slug, is_active)
  VALUES (test_service_id, test_category_id, test_type_standard, 'Test Service 5', 'test-svc-5', true);
  
  error_caught := false;
  BEGIN
    -- This SHOULD fail (service references service_type)
    DELETE FROM service_types WHERE id = test_type_standard;
    RAISE EXCEPTION '❌ TEST 5 FAILED: Service type DELETE was NOT blocked';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE '✅ TEST 5 PASSED: Service type DELETE blocked by foreign key';
      RAISE NOTICE '   Error message: %', SQLERRM;
      error_caught := true;
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 5 FAILED: Wrong error - %', SQLERRM;
  END;
  
  IF NOT error_caught THEN
    RAISE EXCEPTION '❌ TEST 5 FAILED: No error was raised';
  END IF;
  
  DELETE FROM services WHERE id = test_service_id;
  RAISE NOTICE '';
  
  -- ===================================================================
  -- CLEANUP
  -- ===================================================================
  RAISE NOTICE '=== CLEANUP: Removing test data ===';
  
  DELETE FROM service_types WHERE id IN (test_type_standard, test_type_emergency);
  DELETE FROM service_providers WHERE id = test_provider_id;
  DELETE FROM service_categories WHERE id = test_category_id;
  
  RAISE NOTICE '✅ Test data cleaned up';
  RAISE NOTICE '';
  
  -- ===================================================================
  -- SUMMARY
  -- ===================================================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL TESTS PASSED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Verified:';
  RAISE NOTICE '  ✅ Type change allowed (no bookings, draft)';
  RAISE NOTICE '  ✅ Type change blocked (bookings exist)';
  RAISE NOTICE '  ✅ NULL assignment blocked (NOT NULL)';
  RAISE NOTICE '  ✅ Service DELETE blocked (bookings reference)';
  RAISE NOTICE '  ✅ Service type DELETE blocked (services reference)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 SERVICE TYPE IMMUTABILITY: FULLY ENFORCED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Cleanup on failure
    DELETE FROM bookings WHERE customer_id = test_customer_id;
    DELETE FROM services WHERE category_id = test_category_id;
    DELETE FROM service_types WHERE id IN (test_type_standard, test_type_emergency);
    DELETE FROM service_providers WHERE id = test_provider_id;
    DELETE FROM service_categories WHERE id = test_category_id;
    
    RAISE EXCEPTION 'SERVICE TYPE IMMUTABILITY TEST FAILED: %', SQLERRM;
END $$;
