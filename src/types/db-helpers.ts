/**
 * Database Helper Types
 * 
 * These types provide explicit type definitions for database operations
 * to avoid TypeScript inference issues with Supabase client.
 */

import type { Database } from './database'

// Table row types
export type Profile = Database['public']['Tables']['profiles']['Row']
export type ProfileInsert = Database['public']['Tables']['profiles']['Insert']
export type ProfileUpdate = Database['public']['Tables']['profiles']['Update']

// User role types - supports multiple roles per user
// Note: 'tenant' is deprecated - tenancy is now a relationship, not a role
// Users become tenants when a landlord adds them to a unit via the leases table
// Only 'landlord' and 'service_provider' are actual signup roles
export type UserRole = 'tenant' | 'landlord' | 'service_provider'
export type SignupUserRole = 'landlord' | 'service_provider' // Roles that require signup
export type VerificationLevel = 'none' | 'phone' | 'id' | 'full'

// Legacy type alias for backward compatibility
export type UserType = UserRole | 'admin'

// User role record from user_roles table
export interface UserRoleRecord {
  id: string
  user_id: string
  role: UserRole
  is_active: boolean
  is_verified: boolean
  created_at: string
  updated_at: string
}

// Helper type for inserting user roles
export interface UserRoleInsert {
  user_id: string
  role: UserRole
  is_active?: boolean
  is_verified?: boolean
}

// Helper type for profile operations during auth flow
export interface ProfileUpsert {
  id: string
  email: string
  phone?: string | null
  full_name?: string | null
  avatar_url?: string | null
  primary_role?: UserRole
  is_verified?: boolean
  verification_level?: VerificationLevel
  metadata?: Record<string, unknown> | null
}

// Role upgrade warning configuration
export interface RoleUpgradeWarning {
  fromRole: UserRole
  toRole: UserRole
  title: string
  subtitle: string // e.g., "Welcome back! You're currently signed in as a {role}"
  message: string
  requirementsLabel: string // e.g., "VERIFICATION REQUIREMENTS"
  requirements: string[]
  confirmButton: string // e.g., "Yes, I also offer services"
  cancelButton: string // e.g., "Stay as Landlord Only"
  footer: string // e.g., "You can always add this later from Settings → Roles"
  isFriction: boolean // true = shows warning, false = seamless add
}

// Map of role upgrade warnings
// Note: Tenant is NOT a role anymore - tenancy is a relationship (user added to a unit by landlord)
// Only landlord and service_provider are actual roles that require signup
export const roleUpgradeWarnings: Record<string, RoleUpgradeWarning> = {
  'landlord_to_service_provider': {
    fromRole: 'landlord',
    toRole: 'service_provider',
    title: 'Become a Service Provider',
    subtitle: 'Welcome back! You\'re currently signed in as a Landlord.',
    message: 'To post service listings, you\'ll need to verify your business. You can explore the dashboard first.',
    requirementsLabel: 'VERIFICATION REQUIREMENTS',
    requirements: [
      'Business permit or Trade license',
      'Professional certifications (if applicable)',
    ],
    confirmButton: 'Yes, I also offer services',
    cancelButton: 'Stay as Landlord Only',
    footer: 'You can always add this later from Settings → Roles',
    isFriction: true,
  },
  'service_provider_to_landlord': {
    fromRole: 'service_provider',
    toRole: 'landlord',
    title: 'Become a Landlord',
    subtitle: 'Welcome back! You\'re currently signed in as a Service Provider.',
    message: 'Manage properties, collect rent, screen tenants — all in one place. You\'ll verify ownership when you add your first property.',
    requirementsLabel: 'WHAT YOU\'LL NEED',
    requirements: [
      'Title deed or Lease agreement',
      'Recent utility bill (proof of address)',
      'Land rates receipt',
    ],
    confirmButton: 'Become a Landlord',
    cancelButton: 'Stay as Service Provider Only',
    footer: 'You can always add this later from Settings → Roles',
    isFriction: true,
  },
}

// Helper function to get role upgrade warning key
export function getRoleUpgradeKey(fromRole: UserRole, toRole: UserRole): string | null {
  const key = `${fromRole}_to_${toRole}`
  return roleUpgradeWarnings[key] ? key : null
}

// Helper function to check if role upgrade needs friction warning
// Only applicable for landlord <-> service_provider transitions
export function needsRoleUpgradeWarning(currentRoles: UserRole[], newRole: UserRole): RoleUpgradeWarning | null {
  // No warning needed if user already has this role
  if (currentRoles.includes(newRole)) {
    return null
  }
  
  // Only landlord and service_provider roles need warnings
  // (tenant is not a role anymore, it's a relationship)
  if (newRole !== 'landlord' && newRole !== 'service_provider') {
    return null
  }
  
  // Check each current role for upgrade warnings
  for (const currentRole of currentRoles) {
    // Skip non-role-based roles (legacy tenant data)
    if (currentRole !== 'landlord' && currentRole !== 'service_provider') {
      continue
    }
    const key = getRoleUpgradeKey(currentRole, newRole)
    if (key && roleUpgradeWarnings[key]?.isFriction) {
      return roleUpgradeWarnings[key]
    }
  }
  
  return null
}

// Role hierarchy: Landlord >= Service Provider
// Returns the highest priority role from a list of roles
// Note: 'tenant' is kept for backwards compatibility but should not be used
export function getPrimaryRoleByHierarchy(roles: UserRole[]): UserRole {
  if (roles.includes('landlord')) {
    return 'landlord'
  }
  if (roles.includes('service_provider')) {
    return 'service_provider'
  }
  // Fallback - should not happen in new system, but keeps backwards compatibility
  return roles[0] || 'landlord'
}
