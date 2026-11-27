-- A tenant may read their own record without reading their landlord's notes.
--
-- THE DEFECT THIS CLOSES
--   `authenticated` holds SELECT on all 23 columns of public.tenants, and RLS
--   restricts ROWS, never COLUMNS. The policy
--     tenants."Users can view own tenant record" USING (auth.uid() = user_id)
--   therefore returns the WHOLE ROW. The moment tenants.user_id is populated,
--   that tenant can run
--     select notes, blacklist_reason from tenants
--   and read their landlord's private assessment of them, and the stated reason
--   they were blacklisted.
--
--   It is dormant today only because nothing in the product ever sets user_id.
--   The work that makes a tenant reachable is the work that fires this, so it
--   is closed first, before anything can be linked.
--
-- THREE DESIGNS WERE TRIED. THE FIRST TWO ARE RECORDED BECAUSE THEY LOOK
-- RIGHT AND ARE NOT.
--
--   (1) "Give the tenant a narrow view." Insufficient on its own: a view does
--       not stop anyone querying the base table, and the tenant still holds a
--       self-read policy on it.
--
--   (2) "So also drop that policy, and resolve the tenant in the six dependent
--       policies through a SECURITY DEFINER helper." Measured on a local
--       database: RLS on a table IS applied when that table is referenced
--       inside another table's policy expression.
--           parent policy present -> child rows visible = 1
--           parent policy dropped -> child rows visible = 0
--       So dropping the self-read policy without the helper would have taken
--       leases, units, buildings, payments, maintenance_requests and the
--       payout method with it. With the helper it works, but the helper is a
--       client-executable SECURITY DEFINER function in schema public, and this
--       project forbids those system-wide: identity_role_authority_test.sql
--       asserts that no such function exists outside trigger functions and
--       increment_listing_views. The suite rejected it, correctly.
--
--   (3) WHAT THIS FILE DOES. Leave every policy alone. Take the private
--       columns out of the client's reach with privileges rather than
--       policies, and give the landlord a view for the ones they still need.
--
-- WHY PRIVILEGES WORK HERE WHEN THEY USUALLY DO NOT
--   A column GRANT cannot separate a landlord from a tenant: both are the
--   `authenticated` role. That is true for the TENANT's access, which is why
--   policies do that job. But it is the right tool for a column nobody on the
--   client should read AT ALL. notes, blacklist_reason and metadata become
--   unreadable by any client role, and the landlord reaches the two they need
--   through a view that is scoped to their own tenants.
--
--   A column-level GRANT is inert while a table-level grant is held, so the
--   table-level SELECT must be revoked first and the wanted columns granted
--   back by name.
--
-- THE SAFE DEFAULT THIS BUYS
--   A column added to public.tenants in future is NOT granted, so it is
--   invisible to every client until somebody grants it deliberately. The
--   alternative design, moving the private columns to a side table, has the
--   opposite default: a new column lands where the tenant can read it.

-- ── 1. no client role reads the private columns ─────────────────────────────

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

-- ── 2. the landlord still reads the notes they wrote ────────────────────────
--
-- security_invoker = false: the view runs as its owner, so the privileges
--   revoked above do not block it. Its WHERE clause is the boundary.
-- security_barrier = true: with the WHERE clause as the boundary, an outer
--   predicate must not be evaluated beneath it.
--
-- The scope mirrors the two policies that already govern public.tenants for a
-- landlord: the creator, and active staff with tenant access. A tenant matches
-- neither, so a tenant selecting from this view gets nothing.

DROP VIEW IF EXISTS public.tenant_private_notes;

CREATE VIEW public.tenant_private_notes
WITH (security_invoker = false, security_barrier = true) AS
SELECT
  t.id AS tenant_id,
  t.notes,
  t.blacklist_reason
FROM public.tenants t
WHERE t.created_by = auth.uid()
   OR EXISTS (
     SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid()
       AND s.status = 'active'
       AND s.access_tenant = ANY (ARRAY['all','view'])
       AND s.all_properties
       AND t.created_by = s.landlord_id
   );

COMMENT ON VIEW public.tenant_private_notes IS
  'A landlord''s own private notes about their tenants. The columns are not '
  'readable on public.tenants by any client role; this view is the only way to '
  'reach them, and only for the landlord who wrote them.';

REVOKE ALL ON public.tenant_private_notes FROM PUBLIC;
GRANT SELECT ON public.tenant_private_notes TO authenticated;

-- ── 3. what the tenant reads ────────────────────────────────────────────────
--
-- Not strictly required once section 1 has run: the tenant's existing
-- self-read policy plus the column grants already give them a safe row. It
-- exists so the tenant surface names one object rather than selecting columns
-- it hopes are granted, and so a future column cannot be added to the tenant's
-- screens by accident.
--
-- Columns are the minimum the tenant surface uses today. Adding one later is
-- cheap; removing one is a breaking change, so it starts narrow.

DROP VIEW IF EXISTS public.tenant_self;

CREATE VIEW public.tenant_self
WITH (security_invoker = true, security_barrier = true) AS
SELECT
  t.id,
  t.full_name,
  t.phone,
  t.phone_secondary,
  t.email,
  t.created_at
FROM public.tenants t
WHERE t.user_id = auth.uid();

COMMENT ON VIEW public.tenant_self IS
  'A tenant''s own record. security_invoker so the base table''s RLS and column '
  'privileges both still apply: this view narrows, it does not widen.';

REVOKE ALL ON public.tenant_self FROM PUBLIC;
GRANT SELECT ON public.tenant_self TO authenticated;
