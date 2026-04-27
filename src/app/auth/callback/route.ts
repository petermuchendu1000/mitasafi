/**
 * Auth Callback Route
 * 
 * Handles OAuth redirects from providers (Google) and email confirmations.
 * 
 * Multi-Role Flow:
 * - From Signup (new user): Creates profile + role, goes to dashboard
 * - From Signup (existing user, new role): Checks roles, shows warning or adds role
 * - From Login (existing with roles): Goes to dashboard
 * - From Login (existing without roles): Goes to signup to select role
 */

import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import type { ProfileUpsert, UserRole, UserRoleInsert } from '@/types/db-helpers'
import { needsRoleUpgradeWarning, getPrimaryRoleByHierarchy } from '@/types/db-helpers'
import { sanitizeRedirectUrl } from '@/lib/security/url-sanitizer'

// Helper function to get redirect URL based on role and intent
function getIntentBasedRedirect(role: UserRole, intent: string | null, defaultRedirect: string, isNewProvider: boolean = false): string {
  // If there's a specific redirect (like a listing page), use that
  if (defaultRedirect !== '/dashboard') {
    return defaultRedirect
  }
  // Otherwise, use intent-based routing
  if (role === 'landlord') {
    if (intent === 'list') return '/dashboard/landlord/listings/new'
    if (intent === 'manage') return '/dashboard/landlord'
    return '/dashboard/landlord'
  }
  if (role === 'service_provider') {
    // NEW providers must choose their type (individual/business) first
    if (isNewProvider) {
      return '/onboarding/provider-type?redirectTo=/dashboard/provider'
    }
    // Existing providers go to dashboard
    return '/dashboard/provider'
  }
  return '/dashboard'
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  // SECURITY: Sanitize all redirect URLs to prevent open redirect attacks
  const redirectTo = sanitizeRedirectUrl(requestUrl.searchParams.get('redirectTo'), '/dashboard')
  const roleParam = requestUrl.searchParams.get('role') // Fallback role from URL param
  const intentParam = requestUrl.searchParams.get('intent') // 'list' | 'manage' | null
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    
    // Exchange the code for a session
    const { data: { user }, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Auth callback error:', error)
      return NextResponse.redirect(`${origin}/login?error=auth_failed`)
    }

    if (user) {
      // Check if user has a profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, primary_role, full_name')
        .eq('id', user.id)
        .single()

      const profile = profileData as { 
        id: string; 
        primary_role: string | null; 
        full_name: string | null 
      } | null

      // Check existing roles from user_roles table
      const { data: existingRolesData } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id)
        .eq('is_active', true)

      const currentRoles: UserRole[] = existingRolesData?.map((r: { role: string }) => r.role as UserRole) || []

      // Check for pending role from signup flow (cookie takes priority, URL param as fallback)
      const cookieStore = await cookies()
      const pendingRoleCookie = cookieStore.get('pendingRole')
      const pendingRole = pendingRoleCookie?.value || roleParam // 'tenant' | 'landlord' | 'provider'
      
      // Check for pending redirect URL from signup flow
      // SECURITY: Sanitize cookie-based redirects too - users can modify cookies
      const pendingRedirectCookie = cookieStore.get('pendingRedirect')
      const pendingRedirectRaw = pendingRedirectCookie?.value 
        ? decodeURIComponent(pendingRedirectCookie.value) 
        : null
      const pendingRedirect = sanitizeRedirectUrl(pendingRedirectRaw, '/dashboard')
      
      // Final redirect destination - prioritize pendingRedirect cookie, then URL param, then dashboard
      const finalRedirect = pendingRedirectRaw ? pendingRedirect : redirectTo

      // Map 'provider' to 'service_provider' for database
      const userRole: UserRole | undefined = pendingRole 
        ? (pendingRole === 'provider' ? 'service_provider' : pendingRole as UserRole)
        : undefined

      if (!profile) {
        // New user - create profile and add role
        const newProfile: ProfileUpsert = {
          id: user.id,
          email: user.email || '',
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          phone: user.phone || null,
          primary_role: userRole,
        }
        
        const { error: insertError } = await supabase
          .from('profiles')
          .insert(newProfile as never)

        if (insertError) {
          console.error('Error creating profile:', insertError)
        }

        // Add role to user_roles table if pendingRole was set
        if (userRole) {
          const roleInsert: UserRoleInsert = {
            user_id: user.id,
            role: userRole,
            is_active: true,
            is_verified: false,
          }
          
          const { error: roleError } = await supabase
            .from('user_roles')
            .insert(roleInsert as never)

          if (roleError) {
            console.error('Error creating user role:', roleError)
          }

          // For service providers, create the service_providers business profile
          // This is required because provider_services references service_providers.id
          // Unlike landlords where listings.landlord_id directly references profiles.id
          if (userRole === 'service_provider') {
            const providerProfile = {
              user_id: user.id,
              business_name: user.user_metadata?.full_name || user.user_metadata?.name || 'My Business',
              phone: user.phone || '+254700000000', // Required field
            }

            const { error: providerError } = await supabase
              .from('service_providers')
              .insert(providerProfile as never)

            if (providerError) {
              console.error('Error creating service provider profile:', providerError)
            }
          }
        }

        // Clear cookies and redirect based on intent
        // If no role was set, this is a basic user - redirect to properties or their original page
        // NEW: Service providers go to type selection first
        const isNewProvider = userRole === 'service_provider'
        const targetRedirect = userRole 
          ? getIntentBasedRedirect(userRole, intentParam, finalRedirect, isNewProvider)
          : (finalRedirect !== '/dashboard' ? finalRedirect : '/properties')
        const response = NextResponse.redirect(`${origin}${targetRedirect}`)
        response.cookies.delete('pendingRole')
        response.cookies.delete('pendingRedirect')
        return response
      }

      // Existing user with pending role from signup
      if (pendingRole && userRole) {
        // Check if user already has this role
        if (currentRoles.includes(userRole)) {
          // Already has this role - go to original page
          const response = NextResponse.redirect(`${origin}${finalRedirect}`)
          response.cookies.delete('pendingRole')
          response.cookies.delete('pendingRedirect')
          return response
        }

        // Check if role upgrade needs friction warning
        const warning = needsRoleUpgradeWarning(currentRoles, userRole)
        if (warning) {
          // Store role in cookie for the warning modal on signup page
          // Keep pendingRole and pendingRedirect cookies for the signup page to use
          const redirectParam = finalRedirect !== '/dashboard' ? `&redirectTo=${encodeURIComponent(finalRedirect)}` : ''
          const intentParamStr = intentParam ? `&intent=${intentParam}` : ''
          const response = NextResponse.redirect(`${origin}/signup?role=${pendingRole}&showWarning=true${redirectParam}${intentParamStr}`)
          return response
        }

        // No friction needed - add role directly
        const roleInsert: UserRoleInsert = {
          user_id: user.id,
          role: userRole,
          is_active: true,
          is_verified: false,
        }
        
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert(roleInsert as never)

        if (roleError) {
          console.error('Error adding user role:', roleError)
        }

        // Update primary_role based on hierarchy: Landlord >= Service Provider > Tenant
        const allRoles = [...currentRoles, userRole]
        const newPrimaryRole = getPrimaryRoleByHierarchy(allRoles)
        
        await supabase
          .from('profiles')
          .update({ primary_role: newPrimaryRole } as never)
          .eq('id', user.id)

        // For service providers, create the service_providers business profile
        // This is required because provider_services references service_providers.id
        if (userRole === 'service_provider') {
          // Check if provider profile already exists (shouldn't, but be safe)
          const { data: existingProvider } = await supabase
            .from('service_providers')
            .select('id')
            .eq('user_id', user.id)
            .single()

          if (!existingProvider) {
            const providerProfile = {
              user_id: user.id,
              business_name: profile?.full_name || user.user_metadata?.full_name || 'My Business',
              status: 'pending',
            }

            const { error: providerError } = await supabase
              .from('service_providers')
              .insert(providerProfile as never)

            if (providerError) {
              console.error('Error creating service provider profile:', providerError)
            }
          }
        }

        // Redirect based on intent or to dashboard with newRole param
        // NEW: Service providers go to type selection first
        const isNewProvider = userRole === 'service_provider'
        const targetUrl = getIntentBasedRedirect(userRole, intentParam, finalRedirect, isNewProvider)
        const finalUrl = targetUrl.startsWith('/dashboard') && !targetUrl.includes('?')
          ? `${targetUrl}?newRole=${userRole}`
          : targetUrl
        const response = NextResponse.redirect(`${origin}${finalUrl}`)
        response.cookies.delete('pendingRole')
        response.cookies.delete('pendingRedirect')
        return response
      }

      // No pending role - this is a login flow or basic user signup
      // Users without roles are valid - they're just browsing/saving listings
      // They can still log in and access their saved listings, inquiry history, etc.
      const response = NextResponse.redirect(
        currentRoles.length > 0 
          // User has roles - go to dashboard or original destination
          ? `${origin}${finalRedirect}`
          // User without roles - go to their original destination (e.g., /properties) or default to /properties
          : `${origin}${finalRedirect !== '/dashboard' ? finalRedirect : '/properties'}`
      )
      response.cookies.delete('pendingRole')
      response.cookies.delete('pendingRedirect')
      return response
    }
  }

  // No code present - redirect to login
  return NextResponse.redirect(`${origin}/login`)
}
