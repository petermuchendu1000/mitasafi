/**
 * Database Reset via Supabase Management API
 * Executes SQL directly using the service role key
 */

const SUPABASE_URL = 'https://syoolvgoaqnckgmngvse.supabase.co'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

const resetSQL = `
-- Disable triggers
SET session_replication_role = 'replica';

-- Drop all tables
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;

-- Drop all custom types/enums
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t JOIN pg_namespace n ON t.typnamespace = n.oid WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Drop trigger on auth.users if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Re-enable triggers
SET session_replication_role = 'origin';
`

async function executeSQL(sql) {
  // Using the PostgREST SQL endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=representation'
    },
    body: JSON.stringify({ query: sql })
  })

  return response
}

async function checkTables() {
  // Check what tables exist by trying to query them
  const tables = [
    'profiles', 'properties', 'units', 'tenancies', 'payments',
    'messages', 'conversations', 'maintenance_requests', 'reviews',
    'service_providers', 'notifications', 'audit_logs', 'verifications',
    'applications', 'saved_properties', 'users', 'accounts', 'listings'
  ]

  console.log('📋 Checking for existing tables...\n')
  
  const existingTables = []
  
  for (const table of tables) {
    try {
      const response = await fetch(`${SUPABASE_URL}/rest/v1/${table}?select=count&limit=1`, {
        headers: {
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`
        }
      })
      
      if (response.ok) {
        existingTables.push(table)
        console.log(`   ✓ Found: ${table}`)
      }
    } catch (e) {
      // Table doesn't exist
    }
  }

  return existingTables
}

async function dropTable(tableName) {
  // Try to delete all rows first (which we CAN do via REST API)
  const response = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?`, {
    method: 'DELETE',
    headers: {
      'apikey': SUPABASE_SERVICE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'Prefer': 'return=minimal'
    }
  })
  
  return response.ok
}

async function resetDatabase() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║         MITASAFI DATABASE RESET                       ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // Check existing tables
  const existingTables = await checkTables()
  
  if (existingTables.length === 0) {
    console.log('\n✅ Database is already empty! No tables found.')
    return
  }

  console.log(`\n📊 Found ${existingTables.length} table(s)\n`)

  // Try to clear data from tables (we can do this via REST)
  console.log('🗑️  Clearing table data...\n')
  
  for (const table of existingTables) {
    const cleared = await dropTable(table)
    if (cleared) {
      console.log(`   ✓ Cleared: ${table}`)
    } else {
      console.log(`   ⚠ Could not clear: ${table} (may have RLS)`)
    }
  }

  console.log('\n' + '═'.repeat(56))
  console.log('\n⚠️  TABLE STRUCTURE REMOVAL:')
  console.log('   The REST API can clear DATA but cannot DROP TABLES.')
  console.log('   To fully remove table structures, run this SQL in')
  console.log('   Supabase Dashboard → SQL Editor:\n')
  
  console.log('─'.repeat(56))
  console.log(`
DROP TABLE IF EXISTS ${existingTables.join(', ')} CASCADE;

-- Or drop everything:
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
        EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
    END LOOP;
END $$;
`)
  console.log('─'.repeat(56))

  console.log('\n📎 Direct link to SQL Editor:')
  console.log('   https://supabase.com/dashboard/project/syoolvgoaqnckgmngvse/sql/new\n')
}

resetDatabase().catch(console.error)
