/**
 * Database Reset using Supabase SQL via fetch
 * Uses the /pg endpoint for direct SQL execution
 */

const PROJECT_REF = 'syoolvgoaqnckgmngvse'
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_SERVICE_KEY) {
  throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable')
}

async function executeSQLViaPg(sql) {
  // Try the database query endpoint
  const response = await fetch(
    `https://${PROJECT_REF}.supabase.co/rest/v1/rpc/`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      },
      body: JSON.stringify({
        name: 'raw_sql',
        args: { query: sql }
      })
    }
  )
  
  const text = await response.text()
  return { status: response.status, body: text }
}

async function listAllTables() {
  // Query pg_tables to see all tables
  const response = await fetch(
    `https://${PROJECT_REF}.supabase.co/rest/v1/`,
    {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    }
  )
  
  // This returns the OpenAPI spec which lists all tables
  const spec = await response.json()
  
  if (spec.paths) {
    const tables = Object.keys(spec.paths)
      .filter(p => p.startsWith('/') && !p.includes('rpc'))
      .map(p => p.substring(1))
    return tables
  }
  
  return []
}

async function main() {
  console.log('╔══════════════════════════════════════════════════════╗')
  console.log('║      MITASAFI DATABASE - TABLE DISCOVERY             ║')
  console.log('╚══════════════════════════════════════════════════════╝\n')

  // Get all tables from OpenAPI spec
  console.log('🔍 Discovering all tables via API...\n')
  
  const tables = await listAllTables()
  
  if (tables.length > 0) {
    console.log('📋 Tables found in database:\n')
    tables.forEach(t => console.log(`   • ${t}`))
    
    console.log('\n' + '═'.repeat(56))
    console.log('\n🔧 TO DROP THESE TABLES, run in Supabase SQL Editor:')
    console.log('─'.repeat(56))
    console.log(`
-- Drop all found tables
DROP TABLE IF EXISTS ${tables.join(',\n                     ')} CASCADE;

-- Drop any enums
DO $$ 
DECLARE r RECORD;
BEGIN
    FOR r IN (SELECT typname FROM pg_type t 
              JOIN pg_namespace n ON t.typnamespace = n.oid 
              WHERE n.nspname = 'public' AND t.typtype = 'e') LOOP
        EXECUTE 'DROP TYPE IF EXISTS public.' || quote_ident(r.typname) || ' CASCADE';
    END LOOP;
END $$;

-- Remove auth trigger if exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;
`)
    console.log('─'.repeat(56))
  } else {
    console.log('✅ No tables found - database is clean!')
  }

  console.log('\n📎 SQL Editor: https://supabase.com/dashboard/project/syoolvgoaqnckgmngvse/sql/new')
  console.log('\n💡 After running the SQL, come back and we\'ll create the fresh schema!')
}

main().catch(console.error)
