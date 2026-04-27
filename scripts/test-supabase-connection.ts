/**
 * Supabase Connection Test Script
 * 
 * Run this script to verify your Supabase connection is working.
 * Usage: npx ts-node scripts/test-supabase-connection.ts
 * 
 * Or use it in the browser console for quick testing.
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://syoolvgoaqnckgmngvse.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ySPquAXVSFVxiRcrc-NDhw_AkoNZNml'

async function testConnection() {
  console.log('🔗 Testing Supabase Connection...\n')
  
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  
  // Test 1: Basic Connection
  console.log('1️⃣ Testing basic connection...')
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) {
      console.log('   ⚠️  Auth check returned error (expected if no session):', error.message)
    } else {
      console.log('   ✅ Connection successful!')
      console.log('   📊 Session status:', data.session ? 'Active session found' : 'No active session')
    }
  } catch (err) {
    console.log('   ❌ Connection failed:', err)
    return
  }
  
  // Test 2: Database Access
  console.log('\n2️⃣ Testing database access...')
  try {
    // Try to query (will fail if tables don't exist yet - that's expected)
    const { data, error } = await supabase
      .from('profiles')
      .select('count')
      .limit(1)
    
    if (error) {
      if (error.code === '42P01') {
        console.log('   ⚠️  Table "profiles" does not exist yet (expected - run migrations first)')
      } else {
        console.log('   ⚠️  Database query error:', error.message)
      }
    } else {
      console.log('   ✅ Database query successful!')
      console.log('   📊 Result:', data)
    }
  } catch (err) {
    console.log('   ❌ Database test failed:', err)
  }
  
  // Test 3: Storage Access
  console.log('\n3️⃣ Testing storage access...')
  try {
    const { data, error } = await supabase.storage.listBuckets()
    
    if (error) {
      console.log('   ⚠️  Storage access error:', error.message)
    } else {
      console.log('   ✅ Storage connection successful!')
      console.log('   📦 Buckets found:', data.length > 0 ? data.map(b => b.name).join(', ') : 'None (create buckets in dashboard)')
    }
  } catch (err) {
    console.log('   ❌ Storage test failed:', err)
  }
  
  // Test 4: Realtime (just check if enabled)
  console.log('\n4️⃣ Testing realtime connection...')
  try {
    const channel = supabase.channel('test-channel')
    
    channel
      .on('broadcast', { event: 'test' }, (payload) => {
        console.log('   📨 Received:', payload)
      })
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          console.log('   ✅ Realtime connection successful!')
          // Clean up
          supabase.removeChannel(channel)
        } else if (status === 'CHANNEL_ERROR') {
          console.log('   ⚠️  Realtime connection error')
        }
      })
    
    // Give it a moment to connect
    await new Promise(resolve => setTimeout(resolve, 2000))
    supabase.removeChannel(channel)
  } catch (err) {
    console.log('   ❌ Realtime test failed:', err)
  }
  
  console.log('\n' + '='.repeat(50))
  console.log('🏁 Connection test complete!')
  console.log('='.repeat(50))
  console.log('\n📝 Next Steps:')
  console.log('   1. Configure Google OAuth in Supabase Dashboard')
  console.log('   2. Run database migrations to create tables')
  console.log('   3. Create storage buckets for images')
  console.log('   4. Set up Row Level Security (RLS) policies')
}

// Run if executed directly
testConnection().catch(console.error)

export { testConnection }
