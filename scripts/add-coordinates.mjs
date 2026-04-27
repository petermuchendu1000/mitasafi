/**
 * Script to add coordinates to listings
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';

// Read .env.local manually
const envFile = readFileSync('.env.local', 'utf-8');
const env = {};
envFile.split('\n').forEach(line => {
  const [key, ...valueParts] = line.split('=');
  if (key && valueParts.length) {
    env[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function addCoordinates() {
  // Ruiru coordinates (approximate center of Ruiru town)
  const ruiruCoords = { latitude: -1.1456, longitude: 36.9642 };
  
  // First get all listings
  const { data: listings, error: fetchError } = await supabase
    .from('listings')
    .select('id, title, area');

  if (fetchError) {
    console.error('Error fetching listings:', fetchError);
    return;
  }

  console.log('Found listings:', listings);

  // Update all listings with coordinates (for testing)
  if (listings && listings.length > 0) {
    const { data, error } = await supabase
      .from('listings')
      .update(ruiruCoords)
      .eq('id', listings[0].id)
      .select('id, title, latitude, longitude');

    if (error) {
      console.error('Error updating listings:', error);
      return;
    }

    console.log('Updated listing:', data);
  }
}

addCoordinates();
