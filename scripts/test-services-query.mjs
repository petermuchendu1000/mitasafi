import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
  // First, get one category ID
  const { data: categories } = await supabase
    .from('service_categories')
    .select('id, name')
    .limit(3);

  console.log('\n📦 Categories:', categories);

  if (!categories || categories.length === 0) {
    console.log('No categories found!');
    return;
  }

  const categoryIds = categories.map(c => c.id);
  console.log('\n🔍 Testing query with category IDs:', categoryIds);

  // Test the same query as Step2Services
  const { data, error } = await supabase
    .from("services")
    .select(`
      id,
      name,
      description,
      base_price,
      price_unit,
      subcategory_id,
      subcategory:service_subcategories!inner (
        id,
        name,
        category_id,
        category:service_categories!inner (
          id,
          name
        )
      )
    `)
    .in("subcategory.category_id", categoryIds)
    .limit(5);

  if (error) {
    console.error('\n❌ Query error:', error);
  } else {
    console.log(`\n✅ Found ${data?.length || 0} services:`);
    console.table(data?.map(s => ({
      service: s.name,
      subcategory: s.subcategory?.name,
      category: s.subcategory?.category?.name,
      price: s.base_price
    })));
  }
}

testQuery();
