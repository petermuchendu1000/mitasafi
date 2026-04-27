import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env.local
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkData() {
  // Check subcategories
  const { data: subcats, error: subcatError } = await supabase
    .from('service_subcategories')
    .select('id, name, category_id')
    .order('category_id, display_order');

  if (subcatError) {
    console.error('Error fetching subcategories:', subcatError);
  } else {
    console.log(`\n✅ Found ${subcats.length} subcategories:`);
    console.table(subcats);
  }

  // Check services
  const { data: services, error: servicesError } = await supabase
    .from('services')
    .select('id, name, subcategory_id')
    .limit(10);

  if (servicesError) {
    console.error('\n❌ Error fetching services:', servicesError);
  } else {
    console.log(`\n✅ Found ${services.length} services (showing first 10):`);
    console.table(services);
  }
}

checkData();
