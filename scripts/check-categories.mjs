import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://mdfbdmkgjoxazqiqgnne.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1kZmJkbWtnam94YXpxaXFnbm5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzYzMzEyNzEsImV4cCI6MjA1MTkwNzI3MX0.BoFI9YYPpIRPDSMJ3IKKB84q3S94yWdSU7awhCNqahs'
);

const { data, error } = await supabase
  .from('service_categories')
  .select('id, name, description')
  .order('name');

if (error) {
  console.error('Error:', error);
} else {
  console.log(`\nTotal categories: ${data.length}\n`);
  console.log('Categories:');
  data.forEach((cat, i) => {
    console.log(`${i + 1}. ${cat.name} (${cat.id})`);
  });
}
