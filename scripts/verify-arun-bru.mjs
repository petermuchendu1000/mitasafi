import { createClient } from '@supabase/supabase-js';

const s = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Find Arun Bru's provider ID
const { data: providers } = await s.from('service_providers')
  .select('id, business_name, headline, tagline, bio, profile_photo_url, cover_photo_url, portfolio_images, is_verified, average_rating, total_reviews, min_price')
  .eq('business_name', 'Arun Bru')
  .single();

console.log('\n=== ARUN BRU PROVIDER ROW ===');
console.log(JSON.stringify(providers, null, 2));

if (providers) {
  const { data: services } = await s.from('provider_services')
    .select('id, service_id, custom_pricing, is_active, experience_years, service:services(name, slug, category:service_categories(name, slug), subcategory:service_subcategories(name, slug))')
    .eq('provider_id', providers.id);

  console.log('\n=== ARUN BRU SERVICES (' + (services?.length || 0) + ' total) ===');
  (services || []).forEach((ps, i) => {
    const cp = ps.custom_pricing || {};
    console.log(`\n--- Service ${i+1}: ${ps.service?.name} ---`);
    console.log(`  Category: ${ps.service?.category?.name} > ${ps.service?.subcategory?.name}`);
    console.log(`  Price: ${cp.amount} (${cp.type})`);
    console.log(`  Images: ${cp.image_urls?.length || 0}`, cp.image_urls || []);
    console.log(`  Description: ${cp.description || '(none)'}`);
    console.log(`  Active: ${ps.is_active}`);
    console.log(`  Experience: ${ps.experience_years} years`);
  });

  // Service areas
  const { data: areas } = await s.from('provider_service_areas')
    .select('area_name, area_type, is_primary_area')
    .eq('provider_id', providers.id);

  console.log('\n=== SERVICE AREAS (' + (areas?.length || 0) + ') ===');
  (areas || []).forEach(a => console.log(`  ${a.area_name} (${a.area_type})${a.is_primary_area ? ' [PRIMARY]' : ''}`));

  // Total provider count
  const { count } = await s.from('service_providers').select('id', { count: 'exact', head: true });
  console.log('\n=== TOTAL PROVIDERS IN DB:', count, '===');
}

process.exit(0);
