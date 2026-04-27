import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mdfbdmkgjoxazqiqgnne.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZmJkbWtnam94YXpxaXFnbm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzMzEyNzEsImV4cCI6MjA1MTkwNzI3MX0.BoFI9YYPpIRPDSMJ3IKKB84q3S94yWdSU7awhCNqahs'
);

// Check provider_services table structure
const { data, error } = await supabase.rpc('exec_sql', {
  sql: `SELECT column_name, data_type 
        FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'provider_services' 
        ORDER BY ordinal_position`
});

if (error) {
  console.error('Error:', error);
} else {
  console.log('\nprovider_services columns:');
  console.log(data);
}
