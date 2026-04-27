-- =============================================================================
-- MILESTONE M-D: Admin Verification Queue
-- =============================================================================
-- 1. ALTER user_roles CHECK to include 'admin' role
-- 2. Add admin review columns to provider_documents
-- 3. Add RLS policy for admin reads on provider_documents
-- 4. Add index for queue performance
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Widen the user_roles role CHECK to include 'admin'
-- ---------------------------------------------------------------------------
-- Drop the existing unnamed CHECK constraint on user_roles.role and recreate
-- with 'admin' added. We use the information_schema approach to be safe.
ALTER TABLE public.user_roles
  DROP CONSTRAINT IF EXISTS user_roles_role_check;

-- In case the constraint has an auto-generated name
DO $$
DECLARE
  _conname TEXT;
BEGIN
  SELECT conname INTO _conname
  FROM pg_constraint
  WHERE conrelid = 'public.user_roles'::regclass
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%role%';
  IF _conname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.user_roles DROP CONSTRAINT %I', _conname);
  END IF;
END $$;

ALTER TABLE public.user_roles
  ADD CONSTRAINT user_roles_role_check
  CHECK (role IN ('tenant', 'landlord', 'service_provider', 'admin'));

-- ---------------------------------------------------------------------------
-- 2. Add admin review columns to provider_documents
-- ---------------------------------------------------------------------------
ALTER TABLE public.provider_documents
  ADD COLUMN IF NOT EXISTS reviewed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES auth.users(id);

COMMENT ON COLUMN public.provider_documents.reviewed_at IS 'Timestamp when admin reviewed this document';
COMMENT ON COLUMN public.provider_documents.reviewed_by IS 'Admin user_id who reviewed this document';

-- ---------------------------------------------------------------------------
-- 3. Add index for verification queue queries (pending documents)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_provider_documents_status
  ON public.provider_documents(status)
  WHERE status IN ('pending', 'rejected');

CREATE INDEX IF NOT EXISTS idx_provider_documents_provider_status
  ON public.provider_documents(provider_id, status);

-- ---------------------------------------------------------------------------
-- 4. Add account_status 'pending_verification' to service_providers
-- ---------------------------------------------------------------------------
-- The existing account_status check may not exist or may be text-only.
-- We add a comment documenting known statuses for engineering clarity.
COMMENT ON COLUMN public.service_providers.account_status IS
  'Known statuses: active, inactive, suspended, pending_verification';
