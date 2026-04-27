-- =============================================
-- FUNCTIONAL TEST: Location Protection
-- Purpose: Prove location immutability and delete protection are enforced
-- =============================================

DO $$
DECLARE
  test_location_id uuid;
  test_booking_id uuid;
  test_customer_id uuid := '20000000-0000-0000-0000-000000000005'::uuid;
  test_provider_id uuid := '20000000-0000-0000-0000-000000000004'::uuid;
  test_service_id uuid := gen_random_uuid();
  test_service_type_id uuid := '20000000-0000-0000-0000-000000000002'::uuid;
  test_category_id uuid := '20000000-0000-0000-0000-000000000001'::uuid;
  error_caught boolean;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'LOCATION PROTECTION FUNCTIONAL TEST';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- ===========================================
  -- SETUP: Create test data
  -- ===========================================
  RAISE NOTICE '=== SETUP: Creating test data ===';
  
  -- Create category
  INSERT INTO service_categories (id, name, slug, description, display_order)
  VALUES (test_category_id, 'Test Category', 'test-cat', 'Test only', 999)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create service type
  INSERT INTO service_types (id, code, name, booking_flow, description)
  VALUES (test_service_type_id, 'test-standard', 'Test Standard', 'standard', 'Test')
  ON CONFLICT (id) DO NOTHING;
  
  -- Create provider
  INSERT INTO service_providers (id, user_id, business_name, email, phone, is_active)
  VALUES (test_provider_id, test_customer_id, 'Test Provider', 'test@test.com', '+254700000000', true)
  ON CONFLICT (id) DO NOTHING;
  
  -- Create service
  INSERT INTO services (id, category_id, service_type_id, name, slug, is_active)
  VALUES (test_service_id, test_category_id, test_service_type_id, 'Test Service', 'test-svc', true);
  
  RAISE NOTICE '✅ Test data created';
  RAISE NOTICE '';
  
  -- ===========================================
  -- TEST 1: Allow address changes (no bookings)
  -- ===========================================
  RAISE NOTICE '=== TEST 1: Allow Address Changes (No Bookings) ===';
  
  test_location_id := gen_random_uuid();
  
  INSERT INTO locations (id, address_line1, area, city)
  VALUES (test_location_id, '123 Original St', 'Westlands', 'Nairobi');
  
  BEGIN
    -- This SHOULD succeed (no bookings reference this location)
    UPDATE locations 
    SET address_line1 = '123 Updated St', area = 'Kilimani'
    WHERE id = test_location_id;
    
    RAISE NOTICE '✅ TEST 1 PASSED: Address change allowed when no bookings exist';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 1 FAILED: Address change blocked when it should be allowed - %', SQLERRM;
  END;
  
  DELETE FROM locations WHERE id = test_location_id;
  RAISE NOTICE '';
  
  -- ===========================================
  -- TEST 2: Block address changes (bookings exist)
  -- ===========================================
  RAISE NOTICE '=== TEST 2: Block Address Changes (Bookings Exist) ===';
  
  test_location_id := gen_random_uuid();
  test_booking_id := gen_random_uuid();
  
  -- Create location
  INSERT INTO locations (id, address_line1, area, city, latitude, longitude)
  VALUES (test_location_id, '456 Protected St', 'Westlands', 'Nairobi', -1.2921, 36.8219);
  
  -- Create booking referencing location
  INSERT INTO bookings (
    id, customer_id, provider_id, service_id, service_type_id, 
    booking_flow_type, status, service_location_id
  ) VALUES (
    test_booking_id, test_customer_id, test_provider_id, test_service_id, 
    test_service_type_id, 'standard', 'draft', test_location_id
  );
  
  error_caught := false;
  
  -- Test address_line1 change
  BEGIN
    UPDATE locations SET address_line1 = '456 Changed St' WHERE id = test_location_id;
    RAISE EXCEPTION '❌ TEST 2A FAILED: address_line1 change NOT blocked';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM LIKE '%referenced by % booking(s)%' THEN
        RAISE NOTICE '✅ TEST 2A PASSED: address_line1 change blocked';
        RAISE NOTICE '   Error: %', SQLERRM;
        error_caught := true;
      ELSE
        RAISE EXCEPTION '❌ TEST 2A FAILED: Wrong error - %', SQLERRM;
      END IF;
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 2A FAILED: Unexpected error - %', SQLERRM;
  END;
  
  -- Test area change
  BEGIN
    UPDATE locations SET area = 'Kilimani' WHERE id = test_location_id;
    RAISE EXCEPTION '❌ TEST 2B FAILED: area change NOT blocked';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM LIKE '%referenced by % booking(s)%' THEN
        RAISE NOTICE '✅ TEST 2B PASSED: area change blocked';
        error_caught := true;
      ELSE
        RAISE EXCEPTION '❌ TEST 2B FAILED: Wrong error - %', SQLERRM;
      END IF;
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 2B FAILED: Unexpected error - %', SQLERRM;
  END;
  
  -- Test latitude change
  BEGIN
    UPDATE locations SET latitude = -1.3000 WHERE id = test_location_id;
    RAISE EXCEPTION '❌ TEST 2C FAILED: latitude change NOT blocked';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM LIKE '%referenced by % booking(s)%' THEN
        RAISE NOTICE '✅ TEST 2C PASSED: latitude change blocked';
        error_caught := true;
      ELSE
        RAISE EXCEPTION '❌ TEST 2C FAILED: Wrong error - %', SQLERRM;
      END IF;
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 2C FAILED: Unexpected error - %', SQLERRM;
  END;
  
  -- Test location_type change
  BEGIN
    UPDATE locations SET location_type = 'provider_location' WHERE id = test_location_id;
    RAISE EXCEPTION '❌ TEST 2D FAILED: location_type change NOT blocked';
  EXCEPTION
    WHEN check_violation THEN
      IF SQLERRM LIKE '%referenced by % booking(s)%' THEN
        RAISE NOTICE '✅ TEST 2D PASSED: location_type change blocked';
        error_caught := true;
      ELSE
        RAISE EXCEPTION '❌ TEST 2D FAILED: Wrong error - %', SQLERRM;
      END IF;
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 2D FAILED: Unexpected error - %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  
  -- ===========================================
  -- TEST 3: Allow mutable field changes (bookings exist)
  -- ===========================================
  RAISE NOTICE '=== TEST 3: Allow Mutable Field Changes (Bookings Exist) ===';
  
  BEGIN
    -- access_notes should be mutable (gate codes change)
    UPDATE locations SET access_notes = 'New gate code: 1234' WHERE id = test_location_id;
    RAISE NOTICE '✅ TEST 3A PASSED: access_notes change allowed';
    
    -- label should be mutable (user preference)
    UPDATE locations SET label = 'Old Home' WHERE id = test_location_id;
    RAISE NOTICE '✅ TEST 3B PASSED: label change allowed';
    
    -- is_saved should be mutable
    UPDATE locations SET is_saved = true WHERE id = test_location_id;
    RAISE NOTICE '✅ TEST 3C PASSED: is_saved change allowed';
    
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 3 FAILED: Mutable field changes blocked - %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  
  -- ===========================================
  -- TEST 4: Block location deletion (bookings exist)
  -- ===========================================
  RAISE NOTICE '=== TEST 4: Block Location Deletion (Bookings Exist) ===';
  
  error_caught := false;
  
  BEGIN
    DELETE FROM locations WHERE id = test_location_id;
    RAISE EXCEPTION '❌ TEST 4 FAILED: Location deletion NOT blocked';
  EXCEPTION
    WHEN foreign_key_violation THEN
      RAISE NOTICE '✅ TEST 4 PASSED: Location deletion blocked by foreign key';
      RAISE NOTICE '   Error: %', SQLERRM;
      error_caught := true;
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 4 FAILED: Wrong error - %', SQLERRM;
  END;
  
  IF NOT error_caught THEN
    RAISE EXCEPTION '❌ TEST 4 FAILED: No error was raised';
  END IF;
  
  RAISE NOTICE '';
  
  -- ===========================================
  -- TEST 5: Allow location deletion (no bookings)
  -- ===========================================
  RAISE NOTICE '=== TEST 5: Allow Location Deletion (No Bookings) ===';
  
  -- Delete booking first
  DELETE FROM bookings WHERE id = test_booking_id;
  
  BEGIN
    -- Now deletion should succeed
    DELETE FROM locations WHERE id = test_location_id;
    RAISE NOTICE '✅ TEST 5 PASSED: Location deletion allowed when no bookings';
  EXCEPTION
    WHEN OTHERS THEN
      RAISE EXCEPTION '❌ TEST 5 FAILED: Location deletion blocked when it should be allowed - %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  
  -- ===========================================
  -- CLEANUP
  -- ===========================================
  RAISE NOTICE '=== CLEANUP: Removing test data ===';
  
  DELETE FROM services WHERE id = test_service_id;
  DELETE FROM service_types WHERE id = test_service_type_id;
  DELETE FROM service_providers WHERE id = test_provider_id;
  DELETE FROM service_categories WHERE id = test_category_id;
  
  RAISE NOTICE '✅ Test data cleaned up';
  RAISE NOTICE '';
  
  -- ===========================================
  -- SUMMARY
  -- ===========================================
  RAISE NOTICE '========================================';
  RAISE NOTICE 'ALL TESTS PASSED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Verified:';
  RAISE NOTICE '  ✅ Address changes allowed (no bookings)';
  RAISE NOTICE '  ✅ Address changes blocked (bookings exist)';
  RAISE NOTICE '  ✅ Coordinates changes blocked (bookings exist)';
  RAISE NOTICE '  ✅ Location type changes blocked (bookings exist)';
  RAISE NOTICE '  ✅ Mutable fields allowed (access_notes, label, is_saved)';
  RAISE NOTICE '  ✅ Location deletion blocked (bookings exist)';
  RAISE NOTICE '  ✅ Location deletion allowed (no bookings)';
  RAISE NOTICE '';
  RAISE NOTICE '🔒 LOCATION IMMUTABILITY: FULLY ENFORCED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
EXCEPTION
  WHEN OTHERS THEN
    -- Cleanup on failure
    DELETE FROM bookings WHERE customer_id = test_customer_id;
    DELETE FROM services WHERE id = test_service_id;
    DELETE FROM service_types WHERE id = test_service_type_id;
    DELETE FROM service_providers WHERE id = test_provider_id;
    DELETE FROM service_categories WHERE id = test_category_id;
    DELETE FROM locations WHERE id = test_location_id;
    
    RAISE EXCEPTION 'LOCATION PROTECTION TEST FAILED: %', SQLERRM;
END $$;
