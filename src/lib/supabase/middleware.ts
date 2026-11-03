/**
 * Supabase Middleware Client
 *
 * Used by src/proxy.ts (Next.js 16 renamed middleware.ts -> proxy.ts) for:
 * - Session/token refresh
 * - Server-side authentication
 *
 * SECURITY NOTE — why this does not verify JWTs locally.
 *
 * A previous implementation verified the access token itself with
 *   jwtVerify(token, process.env.SUPABASE_JWT_SECRET || NEXT_PUBLIC_SUPABASE_ANON_KEY)
 * using HS256. That was an authentication bypass: the anon key is published in
 * the browser bundle, and HS256 is symmetric, so anyone holding it could MINT a
 * token for any `sub` and be accepted as that user, including an admin.
 *
 * It also cached sessions under `session:${token.substring(0, 32)}`. The first
 * 32 characters of a Supabase JWT are the base64url-encoded header, which is
 * identical for every token, so all users collided on one cache key and the
 * first caller's identity was served to everyone else for 30 seconds.
 *
 * Supabase's documented server-side rule is to never trust an unvalidated
 * cookie and never verify with a shared secret: call auth.getUser() (or
 * auth.getClaims()), which validates against the Auth server.
 * https://supabase.com/docs/guides/auth/server-side/nextjs
 *
 * getUser() is used rather than getClaims() because it is present across the
 * pinned @supabase/supabase-js range. getClaims() is the newer call and
 * verifies locally against cached public keys once asymmetric JWT signing keys
 * are enabled for the project; migrating to it is a worthwhile follow-up.
 *
 * @example
 * import { updateSession } from '@/lib/supabase/middleware'
 * const { supabaseResponse, user, supabase } = await updateSession(request)
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { PerformanceLogger } from '@/lib/performance/logger'

/**
 * Refresh the Supabase session and resolve the authenticated user.
 *
 * @param request - the incoming request
 * @param skipRoleWork - advisory only. Token refresh ALWAYS runs, because
 *   skipping it is what silently signs users out when the access token
 *   expires. Callers may use this to skip their own downstream role lookups.
 *   It deliberately no longer short-circuits this function.
 */
export async function updateSession(request: NextRequest, skipRoleWork = false) {
  void skipRoleWork
  const perf = new PerformanceLogger('updateSession')

  perf.start('create-response')
  let supabaseResponse = NextResponse.next({ request })
  perf.end('create-response')

  perf.start('create-supabase-client')
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(
          cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]
        ) {
          // Write refreshed cookies onto the request so Server Components see
          // them, then rebuild the response and write them there too so the
          // browser receives them. Returning a response that lacks these
          // cookies signs the user out on the next request.
          cookiesToSet.forEach(({ name, value }: { name: string; value: string }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(
            ({
              name,
              value,
              options,
            }: { name: string; value: string; options?: Record<string, unknown> }) =>
              supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )
  perf.end('create-supabase-client')

  // Single source of truth. Validates the token with the Auth server and
  // refreshes it when needed, which is the reason this middleware exists.
  perf.start('get-user')
  const {
    data: { user },
  } = await supabase.auth.getUser()
  perf.end('get-user', { hasUser: !!user })

  perf.logSummary(50)

  return { supabaseResponse, user, supabase }
}
