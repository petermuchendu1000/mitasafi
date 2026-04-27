/**
 * Quick Supabase Connection Test
 * Run with: node scripts/quick-test.mjs
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://syoolvgoaqnckgmngvse.supabase.co'
const SUPABASE_ANON_KEY = 'sb_publishable_ySPquAXVSFVxiRcrc-NDhw_AkoNZNml'

console.log('╔══════════════════════════════════════════════════════╗')
console.log('║       MITASAFI - SUPABASE CONNECTION TEST            ║')
console.log('╚══════════════════════════════════════════════════════╝\n')

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

async function runTests() {
  // Test 1: Auth Service
  console.log('1️⃣  Testing Auth Service...')
  try {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    console.log('   ✅ Auth service connected!')
    console.log(`   └─ Session: ${data.session ? 'Active' : 'No active session'}\n`)
  } catch (err) {
    console.log('   ❌ Auth service error:', err.message, '\n')
  }

  // Test 2: Database Service
  console.log('2️⃣  Testing Database Service...')
  try {
    const start = Date.now()
    const { error } = await supabase.from('profiles').select('count').limit(1)
    const latency = Date.now() - start
    
    if (error?.code === '42P01') {
      console.log('   ✅ Database connected! (Tables not created yet)')
      console.log(`   └─ Latency: ${latency}ms\n`)
    } else if (error) {
      throw error
    } else {
      console.log('   ✅ Database connected!')
      console.log(`   └─ Latency: ${latency}ms\n`)
    }
  } catch (err) {
    console.log('   ❌ Database error:', err.message, '\n')
  }

  // Test 3: Storage Service
  console.log('3️⃣  Testing Storage Service...')
  try {
    const { data, error } = await supabase.storage.listBuckets()
    if (error) throw error
    console.log('   ✅ Storage service connected!')
    console.log(`   └─ Buckets: ${data.length > 0 ? data.map(b => b.name).join(', ') : 'None (create in dashboard)'}\n`)
  } catch (err) {
    console.log('   ❌ Storage error:', err.message, '\n')
  }

  // Test 4: Realtime Service
  console.log('4️⃣  Testing Realtime Service...')
  try {
    const channel = supabase.channel('connection-test')
    
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        supabase.removeChannel(channel)
        reject(new Error('Connection timeout'))
      }, 5000)

      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          clearTimeout(timeout)
          console.log('   ✅ Realtime service connected!')
          console.log('   └─ WebSocket: Active\n')
          supabase.removeChannel(channel)
          resolve()
        } else if (status === 'CHANNEL_ERROR') {
          clearTimeout(timeout)
          reject(new Error('Channel error'))
        }
      })
    })
  } catch (err) {
    console.log('   ❌ Realtime error:', err.message, '\n')
  }

  // Summary
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║              CONNECTION TEST COMPLETE                 ║')
  console.log('╠══════════════════════════════════════════════════════╣')
  console.log('║  Project ID: syoolvgoaqnckgmngvse                    ║')
  console.log('║  Project:    mitasafi                                 ║')
  console.log('║  Status:     Ready for development                    ║')
  console.log('╚══════════════════════════════════════════════════════╝')
  
  console.log('\n📋 Next Steps:')
  console.log('   1. Run database migrations (create tables)')
  console.log('   2. Configure Google OAuth in Supabase Dashboard')
  console.log('   3. Create storage buckets')
  console.log('   4. Set up RLS policies\n')
}

runTests().catch(console.error)
