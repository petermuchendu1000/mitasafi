// Quick script to check existing listings
import { createClient } from '@supabase/supabase-js';

// Load env from .env.local manually
import { readFileSync } from 'fs';
const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const { data, error } = await supabase
  .from('listings')
  .select('id, title, status')
  .limit(5);

console.log('Listings:', data);
if (error) console.error('Error:', error);
