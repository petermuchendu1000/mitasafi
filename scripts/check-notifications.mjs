/**
 * Check notifications system status
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log('\n=== NOTIFICATIONS SYSTEM CHECK ===\n');
  
  // 1. Check notifications table exists and has data
  console.log('1. Checking notifications table...');
  const { data: notifications, error: notifError } = await supabase
    .from('notifications')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (notifError) {
    console.log('   ❌ Error:', notifError.message);
  } else {
    console.log(`   ✅ Found ${notifications.length} notifications`);
    if (notifications.length > 0) {
      console.log('   Recent notifications:');
      notifications.forEach(n => {
        console.log(`      - [${n.type}] ${n.title} (user: ${n.user_id?.substring(0, 8)}...)`);
      });
    }
  }
  
  // 2. Check saved_listings table
  console.log('\n2. Checking saved_listings table...');
  const { data: savedListings, error: savedError } = await supabase
    .from('saved_listings')
    .select('*')
    .limit(10);
  
  if (savedError) {
    console.log('   ❌ Error:', savedError.message);
  } else {
    console.log(`   ✅ Found ${savedListings.length} saved listings`);
    if (savedListings.length > 0) {
      savedListings.forEach(s => {
        console.log(`      - User ${s.user_id?.substring(0, 8)}... saved listing ${s.listing_id?.substring(0, 8)}...`);
      });
    }
  }
  
  // 3. Check if triggers exist by querying pg_trigger
  console.log('\n3. Checking database triggers...');
  const { data: triggers, error: triggerError } = await supabase
    .rpc('check_triggers_exist')
    .single();
  
  if (triggerError) {
    // Try direct query
    const { data: triggerList } = await supabase
      .from('pg_trigger')
      .select('tgname')
      .limit(10);
    
    if (triggerList) {
      console.log('   Triggers found:', triggerList.map(t => t.tgname).join(', '));
    } else {
      console.log('   (Could not query triggers directly)');
    }
  } else {
    console.log('   Triggers:', triggers);
  }
  
  // 4. Check listings with their status
  console.log('\n4. Recent listing status changes...');
  const { data: listings, error: listingsError } = await supabase
    .from('listings')
    .select('id, title, status, updated_at')
    .order('updated_at', { ascending: false })
    .limit(5);
  
  if (listingsError) {
    console.log('   ❌ Error:', listingsError.message);
  } else {
    console.log(`   Recent listings:`);
    listings.forEach(l => {
      console.log(`      - [${l.status}] ${l.title?.substring(0, 30)}... (updated: ${l.updated_at})`);
    });
  }
  
  // 5. Check users
  console.log('\n5. Checking users...');
  const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
  
  if (usersError) {
    console.log('   ❌ Error:', usersError.message);
  } else {
    console.log(`   ✅ Found ${users.length} users`);
    users.slice(0, 5).forEach(u => {
      console.log(`      - ${u.email} (${u.id.substring(0, 8)}...)`);
    });
  }
  
  // 6. Check if trigger function exists
  console.log('\n6. Testing notification trigger manually...');
  // Get a saved listing to test with
  if (savedListings && savedListings.length > 0) {
    const testSaved = savedListings[0];
    console.log(`   Found saved listing: ${testSaved.listing_id?.substring(0, 8)}... by user ${testSaved.user_id?.substring(0, 8)}...`);
    
    // Check if listing exists
    const { data: listing } = await supabase
      .from('listings')
      .select('id, title, status, landlord_id')
      .eq('id', testSaved.listing_id)
      .single();
    
    if (listing) {
      console.log(`   Listing: "${listing.title}" - Status: ${listing.status}`);
      console.log(`   Landlord: ${listing.landlord_id?.substring(0, 8)}...`);
    }
  } else {
    console.log('   No saved listings to test with');
  }
  
  console.log('\n=== END CHECK ===\n');
}

main().catch(console.error);
