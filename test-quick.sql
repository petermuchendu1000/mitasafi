-- Quick validation test for booking status enforcement
-- Run: npx -y supabase db execute < test-quick.sql

-- Test 1: Valid transition should work
DO $$
DECLARE test_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO bookings (id, customer_id, service_id, service_type_id, booking_flow_type, status)
  VALUES (test_id, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid, 
          '00000000-0000-0000-0000-000000000003'::uuid, 'standard', 'draft');
  UPDATE bookings SET status = 'submitted' WHERE id = test_id;
  DELETE FROM bookings WHERE id = test_id;
  RAISE NOTICE '✅ TEST 1 PASSED: Valid transition allowed';
EXCEPTION WHEN OTHERS THEN RAISE NOTICE '❌ TEST 1 FAILED: %', SQLERRM;
END $$;

-- Test 2: Invalid transition should fail
DO $$
DECLARE test_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO bookings (id, customer_id, service_id, service_type_id, booking_flow_type, status)
  VALUES (test_id, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000002'::uuid,
          '00000000-0000-0000-0000-000000000003'::uuid, 'standard', 'draft');
  UPDATE bookings SET status = 'completed' WHERE id = test_id;
  DELETE FROM bookings WHERE id = test_id;
  RAISE NOTICE '❌ TEST 2 FAILED: Invalid transition should be blocked';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%Invalid transition%' THEN
    RAISE NOTICE '✅ TEST 2 PASSED: Invalid transition blocked';
  ELSE
    RAISE NOTICE '❌ TEST 2 FAILED: Wrong error';
  END IF;
END $$;

-- Test 3: Terminal state protection
DO $$
DECLARE test_id uuid := gen_random_uuid();
BEGIN
  INSERT INTO bookings (id, customer_id, provider_id, service_id, service_type_id, booking_flow_type, status, agreed_price, actual_start, actual_end)
  VALUES (test_id, '00000000-0000-0000-0000-000000000001'::uuid, '00000000-0000-0000-0000-000000000004'::uuid,
          '00000000-0000-0000-0000-000000000002'::uuid, '00000000-0000-0000-0000-000000000003'::uuid,
          'standard', 'resolved', 1000, now() - interval '2 hours', now() - interval '1 hour');
  UPDATE bookings SET status = 'submitted' WHERE id = test_id;
  DELETE FROM bookings WHERE id = test_id;
  RAISE NOTICE '❌ TEST 3 FAILED: Terminal state modification should be blocked';
EXCEPTION WHEN OTHERS THEN
  IF SQLERRM LIKE '%terminal state%' THEN
    RAISE NOTICE '✅ TEST 3 PASSED: Terminal state protected';
  ELSE
    RAISE NOTICE '❌ TEST 3 FAILED: Wrong error';
  END IF;
END $$;

SELECT '=== ENFORCEMENT VALIDATION COMPLETE ===' as status;
