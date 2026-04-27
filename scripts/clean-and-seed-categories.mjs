#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// FINAL LOCKED ORDER - Categories based on correct specification
const categories = [
  // MAIN CATEGORIES (12) - is_primary = true
  // ⚡ URGENT (4)
  { name: 'Plumbing', slug: 'plumbing', display_order: 1, is_primary: true, icon: 'wrench', is_active: true },
  { name: 'Electrical', slug: 'electrical', display_order: 2, is_primary: true, icon: 'zap', is_active: true },
  { name: 'Water & Gas Delivery', slug: 'water-gas-delivery', display_order: 3, is_primary: true, icon: 'droplet', is_active: true },
  { name: 'Cleaning', slug: 'cleaning', display_order: 4, is_primary: true, icon: 'sparkles', is_active: true },
  
  // 🔄 FREQUENT (4)
  { name: 'Laundry', slug: 'laundry', display_order: 5, is_primary: true, icon: 'shirt', is_active: true },
  { name: 'Pest Control', slug: 'pest-control', display_order: 6, is_primary: true, icon: 'bug', is_active: true },
  { name: 'Carpentry', slug: 'carpentry', display_order: 7, is_primary: true, icon: 'hammer', is_active: true },
  { name: 'Painting', slug: 'painting', display_order: 8, is_primary: true, icon: 'paintbrush', is_active: true },
  
  // 📅 PLANNED (2)
  { name: 'Moving & Relocation', slug: 'moving-relocation', display_order: 9, is_primary: true, icon: 'truck', is_active: true },
  { name: 'Internet & Networking', slug: 'internet-networking', display_order: 10, is_primary: true, icon: 'wifi', is_active: true },
  
  // 🎯 CONVENIENCE (2)
  { name: 'Taxi & Rides', slug: 'taxi-rides', display_order: 11, is_primary: true, icon: 'car', is_active: true },
  { name: 'Shopping Assistance', slug: 'shopping-assistance', display_order: 12, is_primary: true, icon: 'shopping-bag', is_active: true },
  
  // + MORE SERVICES (8) - is_primary = false
  { name: 'Garbage & Junk Removal', slug: 'garbage-junk-removal', display_order: 13, is_primary: false, icon: 'trash-2', is_active: true },
  { name: 'Gardening & Landscaping', slug: 'gardening-landscaping', display_order: 14, is_primary: false, icon: 'flower-2', is_active: true },
  { name: 'IT & Tech Support', slug: 'it-tech-support', display_order: 15, is_primary: false, icon: 'laptop', is_active: true },
  { name: 'Welding & Metal Works', slug: 'welding-metal-works', display_order: 16, is_primary: false, icon: 'flame', is_active: true },
  { name: 'Glass & Aluminium Works', slug: 'glass-aluminium-works', display_order: 17, is_primary: false, icon: 'grid', is_active: true },
  { name: 'Beauty (Home Services)', slug: 'beauty-home-services', display_order: 18, is_primary: false, icon: 'sparkle', is_active: true },
  { name: 'Events & Planning', slug: 'events-planning', display_order: 19, is_primary: false, icon: 'calendar', is_active: true },
  { name: 'Childcare & Home Care', slug: 'childcare-home-care', display_order: 20, is_primary: false, icon: 'heart', is_active: true },
];

async function cleanAndSeedCategories() {
  console.log('🧹 Starting clean and seed process...\n');
  
  // Step 1: Get all existing categories
  const { data: existing, error: fetchError } = await supabase
    .from('service_categories')
    .select('id, slug, name');
  
  if (fetchError) {
    console.error('❌ Error fetching existing categories:', fetchError);
    process.exit(1);
  }
  
  console.log(`📊 Found ${existing?.length || 0} existing categories\n`);
  
  // Step 2: Identify correct slugs
  const correctSlugs = new Set(categories.map(c => c.slug));
  
  // Step 3: Delete old/incorrect categories
  const toDelete = existing?.filter(c => !correctSlugs.has(c.slug)) || [];
  if (toDelete.length > 0) {
    console.log(`🗑️  Deleting ${toDelete.length} old categories:\n`);
    for (const cat of toDelete) {
      const { error } = await supabase
        .from('service_categories')
        .delete()
        .eq('id', cat.id);
      
      if (error) {
        console.error(`❌ Error deleting ${cat.name}:`, error.message);
      } else {
        console.log(`   ✅ Deleted: ${cat.name} (${cat.slug})`);
      }
    }
    console.log('');
  }
  
  // Step 4: Upsert correct categories
  console.log('📝 Upserting correct categories:\n');
  let inserted = 0;
  let updated = 0;
  let errors = 0;
  
  const existingSlugs = new Set(existing?.map(c => c.slug) || []);
  
  for (const category of categories) {
    if (existingSlugs.has(category.slug)) {
      // Update existing
      const { error } = await supabase
        .from('service_categories')
        .update({
          name: category.name,
          display_order: category.display_order,
          is_primary: category.is_primary,
          icon: category.icon,
          is_active: category.is_active,
        })
        .eq('slug', category.slug);
      
      if (error) {
        console.error(`❌ Error updating ${category.name}:`, error.message);
        errors++;
      } else {
        console.log(`✅ Updated: ${category.display_order}. ${category.name} (${category.is_primary ? 'Main' : 'More'})`);
        updated++;
      }
    } else {
      // Insert new
      const { error } = await supabase
        .from('service_categories')
        .insert([category]);
      
      if (error) {
        console.error(`❌ Error inserting ${category.name}:`, error.message);
        errors++;
      } else {
        console.log(`✨ Inserted: ${category.display_order}. ${category.name} (${category.is_primary ? 'Main' : 'More'})`);
        inserted++;
      }
    }
  }
  
  console.log(`\n📋 Summary:`);
  console.log(`   🗑️  Deleted: ${toDelete.length}`);
  console.log(`   ✨ Inserted: ${inserted}`);
  console.log(`   ✅ Updated: ${updated}`);
  console.log(`   ❌ Errors: ${errors}`);
  console.log(`   📊 Expected Total: ${categories.length} categories\n`);
  
  // Step 5: Verify final state
  const { data: final, error: verifyError } = await supabase
    .from('service_categories')
    .select('id, name, display_order, is_primary')
    .order('display_order');
  
  if (!verifyError && final) {
    console.log(`✅ Database verification: ${final.length} categories\n`);
    
    if (final.length === 20) {
      console.log('✅ CORRECT: Database has exactly 20 categories\n');
      
      console.log('🎯 Main Categories (12):');
      final.filter(c => c.is_primary).forEach(c => 
        console.log(`   ${c.display_order}. ${c.name}`)
      );
      
      console.log('\n➕ More Services (8):');
      final.filter(c => !c.is_primary).forEach(c => 
        console.log(`   ${c.display_order}. ${c.name}`)
      );
    } else {
      console.error(`❌ ERROR: Expected 20 categories, found ${final.length}`);
      process.exit(1);
    }
  }
  
  process.exit(errors > 0 ? 1 : 0);
}

cleanAndSeedCategories();
