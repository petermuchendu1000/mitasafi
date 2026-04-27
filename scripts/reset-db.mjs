/**
 * Database Reset Script
 * Clears all tables, types, and functions from the database
 */

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://syoolvgoaqnckgmngvse.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function resetDatabase() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║         MITASAFI DATABASE RESET                       ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // Step 1: Get all tables
  console.log('1️⃣  Fetching existing tables...')
  const { data: tables, error: tablesError } = await supabase.rpc('exec_sql', {
    sql: `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`
  }).single()

  // If RPC doesn't exist, try direct query approach
  const { data: tableList, error: listError } = await supabase
    .from('pg_tables')
    .select('tablename')
    .eq('schemaname', 'public')

  if (listError) {
    // Try using the REST API to check what tables exist
    console.log('   Checking tables via API...')
    
    // Common table names to try dropping
    const commonTables = [
      'profiles',
      'properties', 
      'units',
      'tenancies',
      'payments',
      'messages',
      'conversations',
      'maintenance_requests',
      'reviews',
      'service_providers',
      'notifications',
      'audit_logs',
      'verifications',
      'applications',
      'saved_properties',
      'property_views',
      'users',
      'accounts',
      'sessions',
      'listings',
      'bookings',
      'transactions'
    ]

    console.log('\n2️⃣  Attempting to drop tables...')
    
    for (const table of commonTables) {
      try {
        const { error } = await supabase.from(table).select('count').limit(1)
        if (!error) {
          console.log(`   📋 Found table: ${table}`)
        }
      } catch (e) {
        // Table doesn't exist, skip
      }
    }
  }

  console.log('\n⚠️  Direct SQL execution requires Supabase Dashboard or CLI.')
  console.log('   The JavaScript client cannot run DDL commands (DROP TABLE).\n')
  
  console.log('📋 Please run this SQL in Supabase Dashboard → SQL Editor:\n')
  console.log('─'.repeat(60))
  
  const sql = `
-- Reset Database
SET session_replication_role = 'replica';

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        RAISE NOTICE 'Dropped: %', r.tablename;
    END LOOP;
END $$;

DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
SET session_replication_role = 'origin';
SELECT 'Done!' as status;
`
  console.log(sql)
  console.log('─'.repeat(60))
}

resetDatabase().catch(console.error)
