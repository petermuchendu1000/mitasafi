-- The private columns leave the client's reach. PART B of two.
--
-- Part A (20260363000000) created the views. This file is the half that can
-- break a running deployment: any code still selecting notes or
-- blacklist_reason from public.tenants starts failing the moment it is applied.
--
-- DO NOT APPLY until the application reading tenant_private_notes is deployed.
-- At the time of writing, production serves release v14 and the code that
-- reads the view is not in it.
--
-- WHY PRIVILEGES AND NOT A POLICY
--   `authenticated` holds SELECT on all 23 columns of public.tenants, and RLS
--   restricts ROWS, never COLUMNS, so the tenant self-read policy returns the
--   whole row. A column grant cannot separate a landlord from a tenant because
--   both are the same role, which is why policies do the row work. But it is
--   exactly the right tool for a column NO client should read at all: the
--   landlord reaches the two they need through tenant_private_notes.
--
--   A column-level GRANT is inert while a table-level grant is held, so the
--   table-level SELECT is revoked first and the wanted columns granted by name.
--
-- THE SAFE DEFAULT THIS BUYS
--   A column added to public.tenants in future is NOT granted, so it is
--   invisible to every client until somebody grants it deliberately.

-- ── the revoke, and the grant back by name ──────────────────────────────────

REVOKE SELECT ON public.tenants FROM authenticated;
REVOKE SELECT ON public.tenants FROM anon;

-- Granted back by name. notes, blacklist_reason and metadata are absent on
-- purpose and are the whole point of this file.
GRANT SELECT (
  id,
  user_id,
  created_by,
  full_name,
  phone,
  phone_secondary,
  email,
  id_type,
  id_number,
  id_document_url,
  occupation,
  employer,
  employer_phone,
  verification_level,
  verified_at,
  emergency_contact,
  default_occupants,
  status,
  created_at,
  updated_at
) ON public.tenants TO authenticated;

-- anon is granted nothing. It held table SELECT before this migration and was
-- stopped only by the absence of a policy. Privileges are the stronger of the
-- two and cost nothing here.

