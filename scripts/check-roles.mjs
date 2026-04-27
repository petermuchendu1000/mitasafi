import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Parse .env.local manually
const envPath = join(__dirname, '..', '.env.local');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing env vars');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkRoles() {
  console.log('\n=== PROFILES TABLE ===');
  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (profilesError) {
    console.error('Profiles error:', profilesError);
  } else {
    console.table(profiles);
  }

  console.log('\n=== USER_ROLES TABLE ===');
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (rolesError) {
    console.error('User roles error:', rolesError);
  } else {
    console.table(roles);
  }

  console.log('\n=== JOINED VIEW ===');
  const { data: joined, error: joinedError } = await supabase
    .from('profiles')
    .select(`
      id,
      email,
      primary_role,
      user_roles (
        role,
        is_active,
        is_verified
      )
    `)
    .order('created_at', { ascending: false })
    .limit(10);
  
  if (joinedError) {
    console.error('Joined error:', joinedError);
  } else {
    console.log(JSON.stringify(joined, null, 2));
  }
}

checkRoles().catch(console.error);
