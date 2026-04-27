// Re-export all types
export * from './database'
export * from './property-management'

// Re-export db-helpers with explicit names to avoid conflicts with database.ts
export type { 
  Profile as ProfileHelper,
  ProfileInsert,
  ProfileUpdate,
  UserRole,
  VerificationLevel,
  UserType,
  UserRoleRecord,
  UserRoleInsert,
  ProfileUpsert,
  RoleUpgradeWarning
} from './db-helpers'
export { 
  roleUpgradeWarnings,
  getRoleUpgradeKey,
  needsRoleUpgradeWarning,
  getPrimaryRoleByHierarchy
} from './db-helpers'
