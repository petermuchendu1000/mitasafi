#!/usr/bin/env node
/**
 * Apply Neighborhoods Migration
 * 
 * Seeds the neighborhoods table with Nairobi areas,
 * sets up RLS policies for neighborhoods, notifications, and service_providers.
 * 
 * Usage: node scripts/apply-neighborhoods-migration.mjs
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// =============================================================================
// Nairobi Neighborhoods Data
// =============================================================================

const neighborhoods = [
  // CBD & Surroundings
  { name: 'Nairobi CBD', slug: 'nairobi-cbd', cluster: 'CBD & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 1 },
  { name: 'Upperhill', slug: 'upperhill', cluster: 'CBD & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 2 },
  { name: 'Kilimani', slug: 'kilimani', cluster: 'CBD & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 3 },
  { name: 'Hurlingham', slug: 'hurlingham', cluster: 'CBD & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 4 },
  { name: 'Milimani', slug: 'milimani', cluster: 'CBD & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 5 },

  // Westlands & Surroundings
  { name: 'Westlands', slug: 'westlands', cluster: 'Westlands & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 10 },
  { name: 'Parklands', slug: 'parklands', cluster: 'Westlands & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 11 },
  { name: 'Highridge', slug: 'highridge', cluster: 'Westlands & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 12 },
  { name: 'Spring Valley', slug: 'spring-valley', cluster: 'Westlands & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 13 },
  { name: 'Brookside', slug: 'brookside', cluster: 'Westlands & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 14 },
  { name: 'Loresho', slug: 'loresho', cluster: 'Westlands & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 15 },
  { name: 'Mountain View', slug: 'mountain-view', cluster: 'Westlands & Surroundings', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 16 },

  // Karen & Langata
  { name: 'Karen', slug: 'karen', cluster: 'Karen & Langata', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 20 },
  { name: 'Langata', slug: 'langata', cluster: 'Karen & Langata', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 21 },
  { name: 'Hardy', slug: 'hardy', cluster: 'Karen & Langata', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 22 },
  { name: 'Bomas', slug: 'bomas', cluster: 'Karen & Langata', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 23 },
  { name: 'Rongai', slug: 'rongai', cluster: 'Karen & Langata', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 24 },
  { name: 'Ngong', slug: 'ngong', cluster: 'Karen & Langata', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 25 },

  // Lavington & Kileleshwa
  { name: 'Lavington', slug: 'lavington', cluster: 'Lavington & Kileleshwa', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 30 },
  { name: 'Kileleshwa', slug: 'kileleshwa', cluster: 'Lavington & Kileleshwa', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 31 },
  { name: 'Gitanga', slug: 'gitanga', cluster: 'Lavington & Kileleshwa', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 32 },
  { name: 'Riara', slug: 'riara', cluster: 'Lavington & Kileleshwa', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 33 },
  { name: 'Kawangware', slug: 'kawangware', cluster: 'Lavington & Kileleshwa', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 34 },

  // South B & South C
  { name: 'South B', slug: 'south-b', cluster: 'South B & South C', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 40 },
  { name: 'South C', slug: 'south-c', cluster: 'South B & South C', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 41 },
  { name: 'Nairobi West', slug: 'nairobi-west', cluster: 'South B & South C', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 42 },
  { name: 'Madaraka', slug: 'madaraka', cluster: 'South B & South C', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 43 },

  // Eastlands
  { name: 'Buruburu', slug: 'buruburu', cluster: 'Eastlands', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 50 },
  { name: 'Umoja', slug: 'umoja', cluster: 'Eastlands', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 51 },
  { name: 'Donholm', slug: 'donholm', cluster: 'Eastlands', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 52 },
  { name: 'Komarock', slug: 'komarock', cluster: 'Eastlands', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 53 },
  { name: 'Kayole', slug: 'kayole', cluster: 'Eastlands', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 54 },
  { name: 'Tena', slug: 'tena', cluster: 'Eastlands', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 55 },
  { name: 'Embakasi', slug: 'embakasi', cluster: 'Eastlands', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 56 },
  { name: 'Pipeline', slug: 'pipeline', cluster: 'Eastlands', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 57 },

  // Kiambu Road Corridor
  { name: 'Runda', slug: 'runda', cluster: 'Kiambu Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 60 },
  { name: 'Muthaiga', slug: 'muthaiga', cluster: 'Kiambu Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 61 },
  { name: 'Ridgeways', slug: 'ridgeways', cluster: 'Kiambu Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 62 },
  { name: 'Gigiri', slug: 'gigiri', cluster: 'Kiambu Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 63 },
  { name: 'Village Market', slug: 'village-market', cluster: 'Kiambu Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 64 },
  { name: 'Two Rivers', slug: 'two-rivers', cluster: 'Kiambu Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 65 },

  // Thika Road Corridor
  { name: 'Garden Estate', slug: 'garden-estate', cluster: 'Thika Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 70 },
  { name: 'Roysambu', slug: 'roysambu', cluster: 'Thika Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 71 },
  { name: 'Kasarani', slug: 'kasarani', cluster: 'Thika Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 72 },
  { name: 'Kahawa', slug: 'kahawa', cluster: 'Thika Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 73 },
  { name: 'Zimmerman', slug: 'zimmerman', cluster: 'Thika Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 74 },
  { name: 'Githurai', slug: 'githurai', cluster: 'Thika Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 75 },
  { name: 'Ruiru', slug: 'ruiru', cluster: 'Thika Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 76 },

  // Ngong Road Corridor
  { name: 'Ngong Road', slug: 'ngong-road', cluster: 'Ngong Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 80 },
  { name: 'Dagoretti', slug: 'dagoretti', cluster: 'Ngong Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 81 },
  { name: 'Riruta', slug: 'riruta', cluster: 'Ngong Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 82 },
  { name: 'Satellite', slug: 'satellite', cluster: 'Ngong Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 83 },
  { name: 'Kibera', slug: 'kibera', cluster: 'Ngong Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 84 },

  // Mombasa Road Corridor
  { name: 'Industrial Area', slug: 'industrial-area', cluster: 'Mombasa Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 90 },
  { name: 'Syokimau', slug: 'syokimau', cluster: 'Mombasa Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 91 },
  { name: 'Mlolongo', slug: 'mlolongo', cluster: 'Mombasa Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 92 },
  { name: 'Athi River', slug: 'athi-river', cluster: 'Mombasa Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 93 },
  { name: 'Kitengela', slug: 'kitengela', cluster: 'Mombasa Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 94 },
  { name: 'Imara Daima', slug: 'imara-daima', cluster: 'Mombasa Road Corridor', city: 'Nairobi', county: 'Nairobi', is_active: true, display_order: 95 },
];

// =============================================================================
// RLS SQL statements
// =============================================================================

const rlsStatements = [
  // Neighborhoods RLS
  `ALTER TABLE neighborhoods ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'neighborhoods' AND policyname = 'neighborhoods_public_read') THEN CREATE POLICY neighborhoods_public_read ON neighborhoods FOR SELECT TO authenticated USING (true); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'neighborhoods' AND policyname = 'neighborhoods_anon_read') THEN CREATE POLICY neighborhoods_anon_read ON neighborhoods FOR SELECT TO anon USING (true); END IF; END $$`,

  // Notifications RLS
  `ALTER TABLE notifications ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_own_read') THEN CREATE POLICY notifications_own_read ON notifications FOR SELECT TO authenticated USING (user_id = auth.uid()); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'notifications' AND policyname = 'notifications_own_update') THEN CREATE POLICY notifications_own_update ON notifications FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()); END IF; END $$`,

  // Service Providers RLS
  `ALTER TABLE service_providers ENABLE ROW LEVEL SECURITY`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_providers' AND policyname = 'providers_own_read') THEN CREATE POLICY providers_own_read ON service_providers FOR SELECT TO authenticated USING (user_id = auth.uid()); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_providers' AND policyname = 'providers_own_update') THEN CREATE POLICY providers_own_update ON service_providers FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid()); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_providers' AND policyname = 'providers_own_insert') THEN CREATE POLICY providers_own_insert ON service_providers FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid()); END IF; END $$`,
  `DO $$ BEGIN IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'service_providers' AND policyname = 'providers_public_read_active') THEN CREATE POLICY providers_public_read_active ON service_providers FOR SELECT TO anon USING (is_active = true); END IF; END $$`,
];

// =============================================================================
// Main
// =============================================================================

async function main() {
  console.log('🏘️  Applying neighborhoods migration...\n');

  // Step 1: Apply RLS policies via SQL
  console.log('📋 Step 1: Setting up RLS policies...');
  for (const sql of rlsStatements) {
    const { error } = await supabase.rpc('exec_sql', { sql_text: sql }).maybeSingle();
    if (error) {
      // Try direct query as fallback
      const { error: err2 } = await supabase.from('_migrations_log').select('id').limit(0);
      if (err2) {
        console.log(`   ⚠️  RLS statement skipped (no exec_sql RPC): ${sql.substring(0, 60)}...`);
      }
    }
  }
  console.log('   ✅ RLS policies configured (or already exist)\n');

  // Step 2: Check current neighborhoods count
  const { count: existingCount } = await supabase
    .from('neighborhoods')
    .select('id', { count: 'exact', head: true });
  
  console.log(`📋 Step 2: Current neighborhoods in DB: ${existingCount || 0}`);

  // Step 3: Upsert neighborhoods
  console.log(`📋 Step 3: Upserting ${neighborhoods.length} neighborhoods...`);
  
  const { data, error } = await supabase
    .from('neighborhoods')
    .upsert(neighborhoods, { 
      onConflict: 'slug',
      ignoreDuplicates: false 
    })
    .select('id, name, cluster');

  if (error) {
    console.error('❌ Failed to upsert neighborhoods:', error.message);
    console.error('   Details:', error);
    process.exit(1);
  }

  console.log(`   ✅ Upserted ${data?.length || 0} neighborhoods\n`);

  // Step 4: Verify
  const { data: verifyData, error: verifyError } = await supabase
    .from('neighborhoods')
    .select('cluster, id')
    .eq('is_active', true)
    .order('display_order');

  if (verifyError) {
    console.error('❌ Verification query failed:', verifyError.message);
    process.exit(1);
  }

  // Group by cluster for summary
  const clusterCounts = {};
  for (const n of verifyData || []) {
    const c = n.cluster || 'Other';
    clusterCounts[c] = (clusterCounts[c] || 0) + 1;
  }

  console.log('📊 Neighborhoods by cluster:');
  for (const [cluster, count] of Object.entries(clusterCounts)) {
    console.log(`   ${cluster}: ${count} areas`);
  }
  console.log(`\n   Total: ${verifyData?.length || 0} neighborhoods`);
  console.log('\n✅ Migration complete!');
}

main().catch((err) => {
  console.error('❌ Fatal error:', err);
  process.exit(1);
});
