-- Query to verify pricing protection triggers
SELECT 
  tgname AS trigger_name,
  tgrelid::regclass AS table_name,
  CASE tgenabled
    WHEN 'O' THEN 'ENABLED'
    WHEN 'D' THEN 'DISABLED'
    ELSE tgenabled::text
  END AS status,
  pg_get_triggerdef(oid) AS trigger_definition
FROM pg_trigger
WHERE tgrelid = 'bookings'::regclass
  AND (
    tgname LIKE '%pric%' 
    OR tgname LIKE '%quote%' 
    OR tgname = 'enforce_booking_state_fields'
  )
ORDER BY tgname;
