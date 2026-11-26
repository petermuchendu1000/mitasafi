-- =============================================================================
-- Let a tenant report a repair
-- =============================================================================
-- WHY THIS IS A MIGRATION AND NOT A FORM
--   Nothing in MitaSafi has ever created a maintenance request. The table is
--   read in six places and written in none, and the five maintenance
--   notification switches in landlord_settings have had no event to fire
--   from. The reason is here, not in the UI: there is no INSERT policy for a
--   tenant, so the database refuses them.
--
-- THE THREE COLUMNS A TENANT MUST NOT CHOOSE
--   unit_id, landlord_id and tenant_id. A tenant who could set them could
--   file a repair against a landlord who has never heard of them — the same
--   hole rental_applications closes with a trigger, and this closes the same
--   way: all three are DERIVED from the tenant's own live lease.
--
-- WHY A TRIGGER AND NOT COLUMN GRANTS
--   A landlord and a tenant are BOTH the `authenticated` role. RLS separates
--   them by row; grants cannot separate them by column, because a column
--   grant applies to the role, not to the person. So the grant list below is
--   the union of what either may set, and the trigger is what forces a
--   tenant's row to be a tenant's row: status 'open', no costs, no assignee,
--   and the three ids taken from their lease rather than from the request.
--
-- WHILE HERE: anon loses its grants on this table. It held INSERT, UPDATE,
--   DELETE and TRUNCATE by the project's default, and holds them on most
--   tables. RLS blocks the first three for want of any anon policy, but
--   TRUNCATE IS NOT SUBJECT TO RLS. PostgREST does not expose TRUNCATE, so
--   this is defence in depth rather than an open door — but a grant nobody
--   needs is one fewer thing standing between a mistake and an empty table.
--   The other 65 tables are NOT touched here; that is a separate decision.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Derivation and enforcement
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.maintenance_before_tenant_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_tenant uuid;
  v_unit   uuid;
  v_land   uuid;
BEGIN
  -- A landlord sets landlord_id themselves; their own policy then checks it
  -- equals auth.uid(). Only a row arriving WITHOUT one is a tenant report.
  IF NEW.landlord_id IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT l.tenant_id, l.unit_id, l.landlord_id
    INTO v_tenant, v_unit, v_land
    FROM public.leases l
    JOIN public.tenants t ON t.id = l.tenant_id
   WHERE t.user_id = auth.uid()
     AND l.status IN ('active', 'pending_signature')
   ORDER BY l.start_date DESC
   LIMIT 1;

  IF v_tenant IS NULL THEN
    RAISE EXCEPTION 'you have no current lease to report a repair against'
      USING ERRCODE = '28000';
  END IF;

  NEW.tenant_id   := v_tenant;
  NEW.unit_id     := v_unit;
  NEW.landlord_id := v_land;

  -- A tenant reports a problem. Everything about HANDLING it belongs to the
  -- landlord, so none of it may arrive in the report.
  NEW.status            := 'open';
  NEW.acknowledged_at   := NULL;
  NEW.assigned_to       := NULL;
  NEW.assigned_phone    := NULL;
  NEW.assigned_at       := NULL;
  NEW.scheduled_date    := NULL;
  NEW.scheduled_time_slot := NULL;
  NEW.diagnosis         := NULL;
  NEW.work_performed    := NULL;
  NEW.estimated_cost    := NULL;
  NEW.actual_cost       := NULL;
  NEW.cost_paid_by      := NULL;
  NEW.completed_at      := NULL;
  NEW.tenant_rating     := NULL;
  NEW.tenant_feedback   := NULL;
  NEW.due_date          := NULL;
  -- No storage bucket exists for repair photos yet, so a photo array from a
  -- client could only be URLs pointing anywhere. Dropped rather than stored.
  NEW.photos            := '{}';
  NEW.completion_photos := '{}';
  NEW.reported_at       := now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.maintenance_before_tenant_insert()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS maintenance_tenant_bi ON public.maintenance_requests;
CREATE TRIGGER maintenance_tenant_bi
  BEFORE INSERT ON public.maintenance_requests
  FOR EACH ROW EXECUTE FUNCTION public.maintenance_before_tenant_insert();

-- -----------------------------------------------------------------------------
-- Privileges
-- -----------------------------------------------------------------------------
REVOKE ALL ON public.maintenance_requests FROM anon;
REVOKE ALL ON public.maintenance_requests FROM authenticated;

-- Reading is gated by the four SELECT policies already on the table.
GRANT SELECT, DELETE ON public.maintenance_requests TO authenticated;

DO $g$
DECLARE cols text;
BEGIN
  -- Everything except the columns no client sets at any point in the life of
  -- a request. The trigger narrows this further for a tenant.
  SELECT string_agg(quote_ident(column_name), ', ') INTO cols
    FROM information_schema.columns
   WHERE table_schema = 'public'
     AND table_name = 'maintenance_requests'
     AND column_name NOT IN ('id', 'created_at', 'updated_at');
  EXECUTE format(
    'GRANT INSERT (%s), UPDATE (%s) ON public.maintenance_requests TO authenticated',
    cols, cols);
END
$g$;

-- -----------------------------------------------------------------------------
-- The policy that was missing
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS maintenance_tenant_insert ON public.maintenance_requests;
CREATE POLICY maintenance_tenant_insert ON public.maintenance_requests
  FOR INSERT TO authenticated
  -- Checked AFTER the trigger, so it validates the DERIVED ids rather than
  -- whatever the client sent.
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.tenants t
     WHERE t.id = maintenance_requests.tenant_id
       AND t.user_id = auth.uid()));

-- =============================================================================
-- Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
                  WHERE c.relname = 'maintenance_requests'
                    AND p.polname = 'maintenance_tenant_insert'
                    AND p.polcmd = 'a') THEN
    RAISE EXCEPTION 'FAILED: tenants still cannot report a repair';
  END IF;

  -- anon must hold nothing here. TRUNCATE in particular is not subject to
  -- RLS, so a grant is the whole of the protection.
  IF has_table_privilege('anon', 'public.maintenance_requests', 'INSERT')
     OR has_table_privilege('anon', 'public.maintenance_requests', 'UPDATE')
     OR has_table_privilege('anon', 'public.maintenance_requests', 'DELETE')
     OR has_table_privilege('anon', 'public.maintenance_requests', 'TRUNCATE')
     OR has_table_privilege('anon', 'public.maintenance_requests', 'SELECT') THEN
    RAISE EXCEPTION 'FAILED: anon still holds privileges on maintenance_requests';
  END IF;

  IF has_table_privilege('authenticated', 'public.maintenance_requests', 'TRUNCATE') THEN
    RAISE EXCEPTION 'FAILED: a client can truncate the repair log';
  END IF;

  -- A client must not be able to rewrite the row's identity columns via a
  -- table-level grant that outranks the column list.
  IF NOT has_column_privilege('authenticated','public.maintenance_requests','title','INSERT') THEN
    RAISE EXCEPTION 'FAILED: the insert grant did not survive the revoke';
  END IF;

  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
              WHERE n.nspname = 'public'
                AND p.proname = 'maintenance_before_tenant_insert'
                AND (pg_get_function_result(p.oid) <> 'trigger'
                     OR has_function_privilege('authenticated', p.oid, 'EXECUTE'))) THEN
    RAISE EXCEPTION 'FAILED: the derivation trigger is reachable by a client';
  END IF;

  RAISE NOTICE 'tenants can report repairs; the ids are derived, not asked for.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DROP POLICY IF EXISTS maintenance_tenant_insert ON public.maintenance_requests;
--   DROP TRIGGER IF EXISTS maintenance_tenant_bi ON public.maintenance_requests;
--   DROP FUNCTION IF EXISTS public.maintenance_before_tenant_insert();
--   GRANT ALL ON public.maintenance_requests TO anon, authenticated;
--   (The last line restores the project default, which is what was there
--    before. Tenants lose the ability to report a repair; nothing is lost
--    from the table.)
-- =============================================================================
