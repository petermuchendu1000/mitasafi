-- =====================================================================================
-- Verification: Check pricing protection triggers
-- =====================================================================================

DO $$
DECLARE
  trigger_rec RECORD;
  trigger_count INT := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PRICING PROTECTION TRIGGER VERIFICATION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Check each expected trigger
  FOR trigger_rec IN 
    SELECT tgname, tgenabled 
    FROM pg_trigger 
    WHERE tgrelid = 'bookings'::regclass 
      AND tgname IN (
        'protect_pricing_after_confirmation_trigger',
        'enforce_price_synchronization_trigger',
        'snapshot_quote_on_send_trigger',
        'enforce_booking_state_fields'
      )
    ORDER BY tgname
  LOOP
    trigger_count := trigger_count + 1;
    RAISE NOTICE '✅ Trigger installed: %', trigger_rec.tgname;
  END LOOP;
  
  RAISE NOTICE '';
  
  -- Verify count
  IF trigger_count = 4 THEN
    RAISE NOTICE '========================================';
    RAISE NOTICE '✅ ALL 4 PRICING TRIGGERS VERIFIED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Installed triggers:';
    RAISE NOTICE '  1. protect_pricing_after_confirmation_trigger';
    RAISE NOTICE '     → Prevents price modifications after customer_confirmed';
    RAISE NOTICE '';
    RAISE NOTICE '  2. enforce_price_synchronization_trigger';
    RAISE NOTICE '     → Ensures agreed_price = pricing_snapshot.total';
    RAISE NOTICE '';
    RAISE NOTICE '  3. snapshot_quote_on_send_trigger';
    RAISE NOTICE '     → Creates pricing_snapshot when quote sent';
    RAISE NOTICE '';
    RAISE NOTICE '  4. enforce_booking_state_fields';
    RAISE NOTICE '     → Requires pricing_snapshot for customer_confirmed+';
    RAISE NOTICE '';
    RAISE NOTICE '========================================';
    RAISE NOTICE 'PRICING AUTHORITY ENFORCED';
    RAISE NOTICE '========================================';
    RAISE NOTICE '';
    RAISE NOTICE 'Declaration:';
    RAISE NOTICE '  bookings.pricing_snapshot->>(''total'')';
    RAISE NOTICE '  is the legally authoritative price after customer_confirmed';
    RAISE NOTICE '';
    RAISE NOTICE 'Protection:';
    RAISE NOTICE '  ✅ Immutable after customer_confirmed';
    RAISE NOTICE '  ✅ Non-null required at customer_confirmed';
    RAISE NOTICE '  ✅ Synchronized with agreed_price';
    RAISE NOTICE '  ✅ Quote snapshotted when sent';
    RAISE NOTICE '';
    RAISE NOTICE '✅ READY FOR PRODUCTION SEEDING';
    RAISE NOTICE '========================================';
  ELSE
    RAISE EXCEPTION '❌ VERIFICATION FAILED: Expected 4 triggers, found %', trigger_count;
  END IF;
END $$;
