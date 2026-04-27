import { createClient } from '@supabase/supabase-js';

const c = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  // 1. Check materialized view for Arun's services
  const { data: viewData, error: viewErr } = await c
    .from('services_with_categories')
    .select('id, name, category_name, category_slug, subcategory_name')
    .in('name', ['Drinking Water Delivery', 'Bathroom Plumbing Installation', 'Tap Installation', 'Kitchen Plumbing Installation']);

  console.log('=== services_with_categories for Arun services ===');
  console.log(JSON.stringify(viewData, null, 2));
  if (viewErr) console.log('ERROR:', viewErr);

  // 2. Check raw services table for comparison
  const { data: rawData, error: rawErr } = await c
    .from('services')
    .select('id, name, category_id, subcategory_id')
    .in('name', ['Drinking Water Delivery', 'Bathroom Plumbing Installation', 'Tap Installation', 'Kitchen Plumbing Installation']);

  console.log('\n=== Raw services table ===');
  console.log(JSON.stringify(rawData, null, 2));
  if (rawErr) console.log('RAW ERROR:', rawErr);

  // 3. Check provider_services join to materialized view
  const { data: psData, error: psErr } = await c
    .from('provider_services')
    .select(`
      id, service_id, is_active,
      service:services_with_categories!service_id (
        id, name, category_name, category_slug, subcategory_name
      )
    `)
    .eq('provider_id', '98f949aa-02d9-4824-a1a9-9509afbe61c5');

  console.log('\n=== provider_services + materialized view join for Arun ===');
  console.log(JSON.stringify(psData, null, 2));
  if (psErr) console.log('PS ERROR:', psErr);

  // 4. Check all service_categories in DB
  const { data: cats } = await c.from('service_categories').select('id, name, slug');
  console.log('\n=== All service_categories ===');
  console.log(JSON.stringify(cats, null, 2));

  // 5. Count rows in materialized view vs services table
  const { count: viewCount } = await c.from('services_with_categories').select('id', { count: 'exact', head: true });
  const { count: servicesCount } = await c.from('services').select('id', { count: 'exact', head: true });
  console.log(`\n=== Row counts: services_with_categories=${viewCount}, services=${servicesCount} ===`);
}
check();
