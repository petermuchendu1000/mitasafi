/**
 * Supabase Browser Client
 * 
 * This client is used for client-side operations in React components.
 * It uses the anon key and respects Row Level Security (RLS) policies.
 * 
 * @example
 * import { createClient } from '@/lib/supabase/client'
 * const supabase = createClient()
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}

// Singleton instance for reuse (optional)
let browserClient: ReturnType<typeof createClient> | null = null

export function getClient() {
  if (!browserClient) {
    browserClient = createClient()
  }
  return browserClient
}
