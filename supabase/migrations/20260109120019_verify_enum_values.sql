-- =============================================
-- Verify Actual Enum Values (No Guessing)
-- Purpose: Query pg_enum to find what values ACTUALLY exist
-- =============================================

DO $$
DECLARE
  enum_val text;
  all_vals text[] := ARRAY[]::text[];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'QUERYING ACTUAL booking_status ENUM VALUES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Query actual enum values from pg_enum
  FOR enum_val IN 
    SELECT enumlabel::text 
    FROM pg_enum 
    WHERE enumtypid = 'booking_status'::regtype 
    ORDER BY enumsortorder
  LOOP
    all_vals := array_append(all_vals, enum_val);
    RAISE NOTICE '  - %', enum_val;
  END LOOP;
  
  RAISE NOTICE '';
  RAISE NOTICE 'Total: % values', array_length(all_vals, 1);
  RAISE NOTICE '';
  
  -- Check specifically for cancelled_by_system
  IF 'cancelled_by_system' = ANY(all_vals) THEN
    RAISE NOTICE '✅ cancelled_by_system EXISTS in enum';
  ELSE
    RAISE NOTICE '❌ cancelled_by_system DOES NOT EXIST in enum';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
END $$;
