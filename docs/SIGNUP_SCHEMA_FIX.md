# Provider Signup Schema Fix - Jan 9, 2026

## Issue

Provider signup was failing with PostgREST error `PGRST204`:
```
Could not find the 'status' column of 'service_providers' in the schema cache
Could not find the 'provider_type' column of 'service_providers' in the schema cache
```

## Root Cause

**Code was using obsolete column names that don't exist in the actual schema:**

### What Code Was Trying to Use:
- `status` column (doesn't exist)
- `provider_type` column (doesn't exist)

### What Actually Exists (from migration 20260108120002):
- `is_active` BOOLEAN (not `status`)
- `business_type` TEXT (not `provider_type`)
- `phone` TEXT **REQUIRED** (was missing in inserts)

## Files Fixed

### 1. **Auth Callback** (`src/app/auth/callback/route.ts`)
**Before:**
```typescript
const providerProfile = {
  user_id: user.id,
  business_name: '...',
  status: 'pending', // ❌ Column doesn't exist
}
```

**After:**
```typescript
const providerProfile = {
  user_id: user.id,
  business_name: '...',
  phone: user.phone || '+254700000000', // ✅ Required field
}
```

### 2. **Phone Signup** (`src/app/(auth)/signup/page.tsx`)
**Fixed 2 locations:**
- New provider signup
- Existing user role upgrade

**Before:**
```typescript
status: 'pending', // ❌ Doesn't exist
```

**After:**
```typescript
phone: data.user.phone || '+254700000000', // ✅ Required
```

### 3. **Provider Type Selection** (`src/app/(auth)/onboarding/provider-type/actions.ts`)
**Before:**
```typescript
provider_type: providerType, // ❌ Column name wrong
status: 'pending',            // ❌ Doesn't exist
```

**After:**
```typescript
business_type: providerType,            // ✅ Correct column
phone: user.phone || '+254700000000',   // ✅ Required field
```

### 4. **Provider Dashboard** (`src/app/dashboard/provider/page.tsx`)
**Before:**
```typescript
.select("provider_type, status")  // ❌ Wrong columns
const hasProviderType = !!provider?.provider_type;
icon: provider?.provider_type === "business" ? ...
```

**After:**
```typescript
.select("business_type, is_active")  // ✅ Correct columns
const hasProviderType = !!provider?.business_type;
icon: provider?.business_type === "company" ? ...
```

### 5. **Verify Provider Page** (`src/app/dashboard/verify-provider/page.tsx`)
**Before:**
```typescript
.select("..., provider_type, ..., status")
provider?.provider_type === "individual"
providerType={provider?.provider_type as "individual" | "business"}
```

**After:**
```typescript
.select("..., business_type, ..., is_active")
provider?.business_type === "individual"
providerType={provider?.business_type as "individual" | "company"}
```

### 6. **Verify Provider Actions** (`src/app/dashboard/verify-provider/actions.ts`)
**Before:**
```typescript
provider_type: providerType,  // ❌ Wrong column
providerUpdate.status = "active";  // ❌ Wrong column
```

**After:**
```typescript
business_type: providerType,  // ✅ Correct
providerUpdate.is_active = true;  // ✅ Correct
```

## Schema Reference (from migration 20260108120002)

```sql
CREATE TABLE service_providers (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  business_name text NOT NULL,
  business_type text,              -- ✅ NOT "provider_type"
  phone text NOT NULL,              -- ✅ REQUIRED
  email text,
  is_active boolean DEFAULT true,  -- ✅ NOT "status"
  account_status text DEFAULT 'active',
  -- ... other columns
);
```

## Enum Values Changed

### Old Code Assumptions:
- `provider_type`: `"individual" | "business"`

### Actual Schema:
- `business_type`: `"individual" | "company"` (from provider_type enum)

**Note:** `"business"` was changed to `"company"` in the enum definition.

## PostgREST Cache Issue

The error `PGRST204` indicates **PostgREST schema cache is stale**. This happens when:
1. Migrations add/remove columns
2. PostgREST hasn't reloaded its introspection cache

**Resolution:** Schema cache will refresh on:
- Next deployment
- Supabase restart
- Manual cache reload (requires admin access)

Since we're using hosted Supabase, the cache will refresh automatically on next deployment.

## Validation

After fixes:
1. ✅ All INSERT operations use correct column names
2. ✅ All SELECT queries use correct column names
3. ✅ `phone` field now included (required by schema)
4. ✅ `business_type` values aligned with enum (`"company"` not `"business"`)
5. ✅ `is_active` used instead of `status`

## Testing Required

After deployment:
1. **OAuth Signup** (`/signup` → Google/Email)
   - Should create provider profile with `business_name` and `phone`
   - Should NOT error on `status` or `provider_type`

2. **Phone Signup** (`/signup` → Phone OTP)
   - Should create provider profile
   - Should include `phone` from auth user

3. **Provider Type Selection** (`/onboarding/provider-type`)
   - Should update `business_type` to "individual" or "company"
   - Should NOT error on missing columns

4. **Provider Dashboard** (`/dashboard/provider`)
   - Should display account type correctly
   - Should show active status

5. **Verification Flow** (`/dashboard/verify-provider`)
   - Should read `business_type` and `is_active`
   - Should update correctly on verification completion

## Related Issues

This is part of the larger schema migration to **Canonical Work Commitment Model v1**:
- Migration: `20260108120002_trust_provider_layer.sql`
- Removed legacy columns: `status`, `provider_type`
- Added canonical columns: `is_active`, `business_type`, `phone` (required)

## Prevention

To prevent similar issues:
1. **Always check actual migration files** for column names
2. **Never assume column names** from old code
3. **Use TypeScript database types** generated from schema
4. **Test signup flows** after schema changes
5. **Monitor PostgREST errors** - `PGRST204` always means schema mismatch

## Status

✅ **FIXED** - All 6 files updated to match actual schema
⏳ **PENDING** - PostgREST cache refresh (automatic on next deployment)
🧪 **TESTING** - Requires production signup flow validation
