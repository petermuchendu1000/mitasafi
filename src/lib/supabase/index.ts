/**
 * Supabase Client Exports
 * 
 * Centralized exports for all Supabase client types.
 * Import from this file for cleaner imports.
 * 
 * @example
 * // Client-side
 * import { createBrowserClient } from '@/lib/supabase'
 * 
 * // Server-side
 * import { createServerClient } from '@/lib/supabase'
 */

// Browser client (for use in client components)
export { createClient as createBrowserClient, getClient } from './client'

// Server client (for use in server components, route handlers, server actions)
export { createClient as createServerClient } from './server'

// Middleware client (for use in Next.js middleware)
export { updateSession } from './middleware'

// Admin client (for server-side admin operations only)
export { createAdminClient, getAdminClient } from './admin'
