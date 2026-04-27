/**
 * Supabase Admin Client
 * 
 * ⚠️ WARNING: This client bypasses Row Level Security (RLS)!
 * Only use in server-side code for admin operations like:
 * - Background jobs
 * - Webhooks
 * - Admin API routes
 * - Database migrations
 * 
 * NEVER expose this client to the browser!
 * 
 * @example
 * import { createAdminClient } from '@/lib/supabase/admin'
 * const supabase = createAdminClient()
 */

import { createClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

export function createAdminClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase admin credentials')
  }

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}

// Singleton for admin operations
let adminClient: ReturnType<typeof createAdminClient> | null = null

export function getAdminClient() {
  if (!adminClient) {
    adminClient = createAdminClient()
  }
  return adminClient
}
