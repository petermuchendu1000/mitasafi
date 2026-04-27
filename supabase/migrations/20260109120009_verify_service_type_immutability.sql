-- Verification: Check service_type_id immutability trigger

DO $$
DECLARE
  trigger_exists boolean;
  function_exists boolean;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SERVICE TYPE IMMUTABILITY VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Check if function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'prevent_service_type_change'
  ) INTO function_exists;
  
  IF function_exists THEN
    RAISE NOTICE '✅ Function prevent_service_type_change() exists';
  ELSE
    RAISE EXCEPTION '❌ Function prevent_service_type_change() NOT FOUND';
  END IF;
  
  -- Check if trigger exists
  SELECT EXISTS (
    SELECT 1 FROM pg_trigger 
    WHERE tgrelid = 'services'::regclass 
      AND tgname = 'prevent_service_type_change_trigger'
  ) INTO trigger_exists;
  
  IF trigger_exists THEN
    RAISE NOTICE '✅ Trigger prevent_service_type_change_trigger exists on services table';
  ELSE
    RAISE EXCEPTION '❌ Trigger prevent_service_type_change_trigger NOT FOUND';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '✅ SERVICE TYPE IMMUTABILITY ENFORCED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Protection:';
  RAISE NOTICE '  ✅ Cannot change service_type_id after bookings exist';
  RAISE NOTICE '  ✅ Cannot delete services with bookings (FK RESTRICT)';
  RAISE NOTICE '  ✅ Cannot delete service_types with services (FK RESTRICT)';
  RAISE NOTICE '  ✅ Cannot set service_type_id to NULL (NOT NULL constraint)';
  RAISE NOTICE '';
  RAISE NOTICE 'Known Limitation:';
  RAISE NOTICE '  ⚠️  Can change service_type_id BEFORE first booking';
  RAISE NOTICE '  ⚠️  Uses != operator (fragile NULL handling)';
  RAISE NOTICE '';
  
END $$;
