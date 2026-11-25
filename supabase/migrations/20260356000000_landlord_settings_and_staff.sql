-- =============================================================================
-- Landlord settings, and the caretakers a landlord actually employs
-- =============================================================================
-- WHAT WAS WRONG
--   The settings page could change a name, a phone and three notification
--   switches, because that was all the storage there was. Everything a
--   landlord actually configures — whether tenants may raise maintenance,
--   whether partial payments are accepted, the late-fee policy, who pays the
--   transaction fee, which of twenty events emails them — had nowhere to live.
--
--   And there was no answer at all to the first question anyone asks about a
--   Kenyan rental portfolio: who is the caretaker, which blocks do they look
--   after, and what may they do? `user_roles` has no landlord scoping; no
--   staff, manager, agent, caretaker or invitation table exists anywhere.
--
-- WHY late_fee LIVES IN BOTH PLACES
--   leases already carries late_fee_type/amount/percentage/grace_period_days,
--   and that stays authoritative for an existing lease — changing a policy
--   must not silently rewrite agreements already signed. What is added here is
--   the landlord's DEFAULT, applied when a lease is created.
--
-- THE CARETAKER ACCESS MODEL, AND ITS DELIBERATE LIMITS
--   A caretaker is given sight of the buildings they are assigned to, the
--   units in them, and the maintenance on them. That is the job.
--
--   They are NOT given tenants, leases, payments or applications. A caretaker
--   does not need a rent ledger to fix a tap, and the people in those rows did
--   not agree to be visible to a landlord's staff. Widening that is a separate
--   decision for a human to take deliberately, not a default.
--
--   Scope is held in property_staff.building_ids, an array, rather than a join
--   table. That is not laziness: policies on buildings/units/maintenance must
--   reference the staff table, and every extra RLS-protected table in that
--   path is another chance to build a recursive policy. One array, one lookup,
--   and a trigger that refuses any building the landlord does not own.
--
--   NO SECURITY DEFINER FUNCTION IS ADDED. identity_role_authority I7 fails
--   the build if any non-trigger definer becomes client-executable, and the
--   obvious "is_staff_for_building()" helper would be exactly that. The
--   policies below inline the lookup instead. property_staff's own policies
--   reference only auth.uid(), never buildings, so there is no cycle.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. landlord_settings — one row per landlord
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.landlord_settings (
  landlord_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,

  -- ---- general ------------------------------------------------------------
  tenant_maintenance_access  boolean NOT NULL DEFAULT true,
  application_screening      boolean NOT NULL DEFAULT true,
  accept_partial_payment     boolean NOT NULL DEFAULT true,
  accept_future_payments     boolean NOT NULL DEFAULT true,
  enable_chat                boolean NOT NULL DEFAULT true,
  require_renters_insurance  boolean NOT NULL DEFAULT false,
  enable_staff_access        boolean NOT NULL DEFAULT false,

  -- ---- late fee DEFAULT for new leases ------------------------------------
  late_fee_enabled     boolean NOT NULL DEFAULT false,
  late_fee_type        text    NOT NULL DEFAULT 'percentage',
  late_fee_amount      numeric(12,2),
  late_fee_percentage  numeric(5,2) DEFAULT 10,
  grace_period_days    integer NOT NULL DEFAULT 5,
  late_fee_applies_to  text    NOT NULL DEFAULT 'all_line_items',

  -- ---- who carries the transaction fee ------------------------------------
  mpesa_fee_payer  text NOT NULL DEFAULT 'tenant',
  card_fee_payer   text NOT NULL DEFAULT 'tenant',

  -- ---- notifications to the landlord: lease -------------------------------
  notify_all_tenants_signed  boolean NOT NULL DEFAULT true,
  notify_any_tenant_signs    boolean NOT NULL DEFAULT false,
  notify_lease_expiring      boolean NOT NULL DEFAULT true,
  lease_expiry_notice_days   integer NOT NULL DEFAULT 90,

  -- ---- notifications: money -----------------------------------------------
  notify_payment_made         boolean NOT NULL DEFAULT true,
  notify_payment_failed       boolean NOT NULL DEFAULT true,
  notify_payment_resubmitted  boolean NOT NULL DEFAULT true,
  notify_overdue_summary      boolean NOT NULL DEFAULT true,
  overdue_summary_day_1       integer NOT NULL DEFAULT 5,
  overdue_summary_day_2       integer NOT NULL DEFAULT 10,
  notify_refund_debited       boolean NOT NULL DEFAULT true,
  notify_refund_received      boolean NOT NULL DEFAULT true,
  notify_funds_disbursed      boolean NOT NULL DEFAULT true,

  -- ---- notifications: maintenance -----------------------------------------
  notify_maintenance_submitted boolean NOT NULL DEFAULT true,
  notify_maintenance_resolved  boolean NOT NULL DEFAULT true,
  notify_maintenance_reopened  boolean NOT NULL DEFAULT true,
  notify_maintenance_updated   boolean NOT NULL DEFAULT false,
  notify_maintenance_comment   boolean NOT NULL DEFAULT false,

  -- ---- notifications: applications and insurance --------------------------
  notify_application_submitted         boolean NOT NULL DEFAULT true,
  notify_insurance_provided_requested  boolean NOT NULL DEFAULT true,
  notify_insurance_provided_unrequested boolean NOT NULL DEFAULT false,

  -- ---- marketing: opt-IN, never defaulted on ------------------------------
  marketing_sms_opt_in boolean NOT NULL DEFAULT false,

  -- ---- notifications the landlord sends to tenants ------------------------
  tenant_notify_invoice_due_day   boolean NOT NULL DEFAULT true,
  tenant_notify_invoice_late      boolean NOT NULL DEFAULT true,
  tenant_notify_invoice_due_soon  boolean NOT NULL DEFAULT true,
  tenant_invoice_due_notice_days  integer NOT NULL DEFAULT 5,
  tenant_notify_lease_expiring    boolean NOT NULL DEFAULT true,
  tenant_lease_expiry_notice_days integer NOT NULL DEFAULT 90,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT landlord_settings_late_fee_type_check
    CHECK (late_fee_type IN ('none','fixed','percentage','daily')),
  CONSTRAINT landlord_settings_applies_to_check
    CHECK (late_fee_applies_to IN ('all_line_items','rent_only')),
  CONSTRAINT landlord_settings_mpesa_payer_check
    CHECK (mpesa_fee_payer IN ('landlord','tenant')),
  CONSTRAINT landlord_settings_card_payer_check
    CHECK (card_fee_payer IN ('landlord','tenant')),
  -- A grace period of a year is a typo, not a policy.
  CONSTRAINT landlord_settings_grace_check
    CHECK (grace_period_days BETWEEN 0 AND 60),
  CONSTRAINT landlord_settings_pct_check
    CHECK (late_fee_percentage IS NULL OR (late_fee_percentage >= 0 AND late_fee_percentage <= 100)),
  CONSTRAINT landlord_settings_amount_check
    CHECK (late_fee_amount IS NULL OR late_fee_amount >= 0),
  CONSTRAINT landlord_settings_expiry_days_check
    CHECK (lease_expiry_notice_days BETWEEN 1 AND 365),
  CONSTRAINT landlord_settings_tenant_expiry_days_check
    CHECK (tenant_lease_expiry_notice_days BETWEEN 1 AND 365),
  CONSTRAINT landlord_settings_due_soon_check
    CHECK (tenant_invoice_due_notice_days BETWEEN 1 AND 30),
  CONSTRAINT landlord_settings_summary_days_check
    CHECK (overdue_summary_day_1 BETWEEN 1 AND 28
           AND overdue_summary_day_2 BETWEEN 1 AND 28),
  -- A fixed fee with no amount, or a percentage fee with no percentage, is a
  -- policy that cannot be applied. Refuse it at the row.
  CONSTRAINT landlord_settings_fee_is_applicable CHECK (
    NOT late_fee_enabled
    OR (late_fee_type = 'percentage' AND late_fee_percentage IS NOT NULL)
    OR (late_fee_type IN ('fixed','daily') AND late_fee_amount IS NOT NULL)
    OR late_fee_type = 'none'
  )
);

-- -----------------------------------------------------------------------------
-- 2. property_staff — caretakers, managers, bookkeepers
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.property_staff (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  landlord_id  uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  -- Filled when the person already has a MitaSafi account, left NULL until
  -- they do. A caretaker with no account is still a caretaker on the books.
  user_id      uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  full_name    text NOT NULL,
  phone        text NOT NULL,
  email        text,
  staff_role   text NOT NULL DEFAULT 'caretaker',
  status       text NOT NULL DEFAULT 'invited',

  -- Which blocks. Empty array means none, never "all" — a caretaker with no
  -- assignment should see nothing, not everything.
  building_ids uuid[] NOT NULL DEFAULT '{}',

  can_view_tenants      boolean NOT NULL DEFAULT false,
  can_manage_maintenance boolean NOT NULL DEFAULT true,
  can_record_payments   boolean NOT NULL DEFAULT false,

  notes        text,
  invited_at   timestamptz NOT NULL DEFAULT now(),
  accepted_at  timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT property_staff_role_check
    CHECK (staff_role IN ('caretaker','manager','accountant')),
  CONSTRAINT property_staff_status_check
    CHECK (status IN ('invited','active','suspended')),
  -- A landlord is not their own caretaker.
  CONSTRAINT property_staff_not_self CHECK (user_id IS NULL OR user_id <> landlord_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS property_staff_one_per_phone
  ON public.property_staff (landlord_id, phone)
  WHERE status <> 'suspended';

CREATE INDEX IF NOT EXISTS idx_property_staff_landlord
  ON public.property_staff (landlord_id, status);
-- The lookup every caretaker policy performs.
CREATE INDEX IF NOT EXISTS idx_property_staff_user
  ON public.property_staff (user_id) WHERE user_id IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. Staff integrity: the landlord may only assign buildings they own
-- -----------------------------------------------------------------------------
-- SECURITY DEFINER, deliberately, and here is the whole argument.
--
-- With invoker rights this function CANNOT WORK. `profiles` is readable only
-- by its owner (`auth.uid() = id`), so a landlord looking up their caretaker's
-- account finds nothing and every caretaker is stranded as a dead invite. The
-- first version of this migration was invoker-rights and four tests failed for
-- exactly that reason.
--
-- identity_role_authority I7 permits this: its predicate excludes functions
-- returning `trigger`, because a trigger function is not callable by a client
-- — it runs only on a write to this table, which RLS already governs.
--
-- WHAT IT DISCLOSES, STATED PLAINLY: a landlord who adds a caretaker by phone
-- can tell from the resulting status whether that number already has a
-- MitaSafi account. That is inherent to inviting someone by phone number, it
-- concerns a person the landlord already employs and whose number they already
-- had, and it reveals nothing further — not a name, not an id, not an email.
-- The function returns no profile data to the caller; it only sets user_id.
CREATE OR REPLACE FUNCTION public.property_staff_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_bad   uuid;
  v_match uuid;
BEGIN
  NEW.landlord_id := COALESCE(NEW.landlord_id, auth.uid());

  -- Every assigned building must belong to this landlord. Without this a
  -- landlord could name someone else's block and hand their caretaker sight
  -- of it, since the policies below trust building_ids.
  SELECT b INTO v_bad
    FROM unnest(NEW.building_ids) AS b
   WHERE NOT EXISTS (
     SELECT 1 FROM public.buildings bl
      WHERE bl.id = b AND bl.landlord_id = NEW.landlord_id
   )
   LIMIT 1;

  IF v_bad IS NOT NULL THEN
    RAISE EXCEPTION 'building % is not yours to assign', v_bad
      USING ERRCODE = '28000';
  END IF;

  -- Link an existing MitaSafi account by phone, so a caretaker who already
  -- uses the app is active immediately instead of sitting as a dead invite.
  IF NEW.user_id IS NULL AND NEW.phone IS NOT NULL THEN
    SELECT p.id INTO v_match
      FROM public.profiles p
     WHERE p.phone = NEW.phone AND p.id <> NEW.landlord_id
     LIMIT 1;
    IF v_match IS NOT NULL THEN
      NEW.user_id := v_match;
      IF NEW.status = 'invited' THEN
        NEW.status := 'active';
        NEW.accepted_at := COALESCE(NEW.accepted_at, now());
      END IF;
    END IF;
  END IF;

  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS property_staff_biu ON public.property_staff;
CREATE TRIGGER property_staff_biu
  BEFORE INSERT OR UPDATE ON public.property_staff
  FOR EACH ROW EXECUTE FUNCTION public.property_staff_before_write();

CREATE OR REPLACE FUNCTION public.landlord_settings_touch()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, pg_temp
AS $$ BEGIN NEW.updated_at := now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS landlord_settings_bu ON public.landlord_settings;
CREATE TRIGGER landlord_settings_bu
  BEFORE UPDATE ON public.landlord_settings
  FOR EACH ROW EXECUTE FUNCTION public.landlord_settings_touch();

-- -----------------------------------------------------------------------------
-- 4. Privileges
-- -----------------------------------------------------------------------------
-- Postgres grants EXECUTE on every new function to PUBLIC, which is why
-- 20260329000000 had to revoke a list of them by name. Trigger functions are
-- outside I7's predicate and cannot usefully be called directly, but the grant
-- is pointless either way: a trigger fires without the writer holding EXECUTE.
REVOKE ALL ON FUNCTION public.property_staff_before_write() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.landlord_settings_touch()     FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.landlord_settings FROM anon, authenticated;
REVOKE ALL ON public.property_staff    FROM anon, authenticated;

GRANT SELECT, INSERT ON public.landlord_settings TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.property_staff TO authenticated;

-- UPDATE on every settings column EXCEPT the identity and the audit stamps.
-- Built from the catalogue rather than typed out, so a column added later is
-- covered and cannot be forgotten.
DO $grant$
DECLARE cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ')
    INTO cols
    FROM information_schema.columns
   WHERE table_schema='public' AND table_name='landlord_settings'
     AND column_name NOT IN ('landlord_id','created_at','updated_at');
  EXECUTE format('GRANT UPDATE (%s) ON public.landlord_settings TO authenticated', cols);
END
$grant$;

-- -----------------------------------------------------------------------------
-- 5. Row-level security
-- -----------------------------------------------------------------------------
ALTER TABLE public.landlord_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.property_staff    ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landlord_settings_own ON public.landlord_settings;
CREATE POLICY landlord_settings_own ON public.landlord_settings
  FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- The landlord manages their staff.
DROP POLICY IF EXISTS property_staff_landlord_all ON public.property_staff;
CREATE POLICY property_staff_landlord_all ON public.property_staff
  FOR ALL TO authenticated
  USING (landlord_id = auth.uid())
  WITH CHECK (landlord_id = auth.uid());

-- A staff member may read their own record, and nothing else about the
-- landlord's other staff. No write: they cannot widen their own permissions.
DROP POLICY IF EXISTS property_staff_self_read ON public.property_staff;
CREATE POLICY property_staff_self_read ON public.property_staff
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- -----------------------------------------------------------------------------
-- 6. What a caretaker can see. Added as SEPARATE policies; nothing existing is
--    altered, so no landlord loses access if these are ever dropped.
-- -----------------------------------------------------------------------------
DROP POLICY IF EXISTS buildings_staff_read ON public.buildings;
CREATE POLICY buildings_staff_read ON public.buildings
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid()
       AND s.status = 'active'
       AND buildings.id = ANY (s.building_ids)
  ));

DROP POLICY IF EXISTS units_staff_read ON public.units;
CREATE POLICY units_staff_read ON public.units
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     WHERE s.user_id = auth.uid()
       AND s.status = 'active'
       AND units.building_id = ANY (s.building_ids)
  ));

DROP POLICY IF EXISTS maintenance_staff_read ON public.maintenance_requests;
CREATE POLICY maintenance_staff_read ON public.maintenance_requests
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.units u ON u.id = maintenance_requests.unit_id
     WHERE s.user_id = auth.uid()
       AND s.status = 'active'
       AND s.can_manage_maintenance
       AND u.building_id = ANY (s.building_ids)
  ));

DROP POLICY IF EXISTS maintenance_staff_update ON public.maintenance_requests;
CREATE POLICY maintenance_staff_update ON public.maintenance_requests
  FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.property_staff s
     JOIN public.units u ON u.id = maintenance_requests.unit_id
     WHERE s.user_id = auth.uid()
       AND s.status = 'active'
       AND s.can_manage_maintenance
       AND u.building_id = ANY (s.building_ids)
  ));

-- -----------------------------------------------------------------------------
-- 7. Make `application_screening` actually mean something
-- -----------------------------------------------------------------------------
-- A toggle nothing reads is a control that does nothing. This one is enforced
-- where it cannot be bypassed — in the insert trigger — rather than in the
-- server action, because the client holds INSERT on rental_applications and
-- could reach PostgREST directly.
--
-- WHY THIS FUNCTION BECOMES SECURITY DEFINER, AND WHAT IS DONE ABOUT IT
--   landlord_settings is readable only by its owner, so an applicant's own
--   rights cannot see whether the landlord accepts applications. Definer
--   rights are required. But definer rights also mean the function stops
--   inheriting the applicant's view of `listings` — and 20260355000000 relied
--   on exactly that to make a draft listing report "not found" instead of
--   "not accepting applications", which is the answer that does not confirm
--   the listing exists.
--
--   So the visibility rule is now written out explicitly, mirroring
--   listings_public_read, instead of being inherited by accident. The
--   behaviour is identical and now deliberate. A4 in the applications suite
--   still expects P0002 for a draft listing and still gets it.
CREATE OR REPLACE FUNCTION public.rental_application_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_landlord  uuid;
  v_status    text;
  v_screening boolean;
  v_uid       uuid := auth.uid();
BEGIN
  SELECT l.landlord_id, l.status
    INTO v_landlord, v_status
    FROM public.listings l
   WHERE l.id = NEW.listing_id;

  -- Mirrors listings_public_read: anything not publicly visible, and not the
  -- caller's own, is reported as absent rather than as closed.
  IF v_landlord IS NULL
     OR (v_status NOT IN ('active','paused','rented') AND v_landlord <> v_uid) THEN
    RAISE EXCEPTION 'listing not found' USING ERRCODE = 'P0002';
  END IF;

  IF v_status <> 'active' THEN
    RAISE EXCEPTION 'this listing is not accepting applications'
      USING ERRCODE = 'P0001';
  END IF;

  -- No settings row means the default, which is on.
  SELECT ls.application_screening INTO v_screening
    FROM public.landlord_settings ls
   WHERE ls.landlord_id = v_landlord;

  IF v_screening IS NOT NULL AND v_screening = false THEN
    RAISE EXCEPTION 'this landlord is not accepting applications'
      USING ERRCODE = 'P0001';
  END IF;

  NEW.applicant_id   := v_uid;
  NEW.landlord_id    := v_landlord;
  NEW.status         := 'new';
  NEW.landlord_notes := NULL;
  NEW.decided_at     := NULL;
  NEW.created_at     := now();
  NEW.updated_at     := now();

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.rental_application_before_insert() FROM PUBLIC, anon, authenticated;

-- =============================================================================
-- 8. Assertions. Each is capable of failing.
-- =============================================================================
DO $assert$
DECLARE n int;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public'
                  AND tablename='landlord_settings' AND rowsecurity) THEN
    RAISE EXCEPTION 'FAILED: RLS off on landlord_settings';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE schemaname='public'
                  AND tablename='property_staff' AND rowsecurity) THEN
    RAISE EXCEPTION 'FAILED: RLS off on property_staff';
  END IF;

  -- anon reaches neither table.
  IF has_table_privilege('anon','public.landlord_settings','SELECT')
     OR has_table_privilege('anon','public.property_staff','SELECT') THEN
    RAISE EXCEPTION 'FAILED: anon can read settings or staff';
  END IF;

  -- The identity columns are not client-writable.
  IF has_column_privilege('authenticated','public.landlord_settings','landlord_id','UPDATE') THEN
    RAISE EXCEPTION 'FAILED: a client can move settings to another landlord';
  END IF;
  -- ...but the settings themselves must be, or the page does nothing.
  IF NOT has_column_privilege('authenticated','public.landlord_settings','late_fee_enabled','UPDATE')
     OR NOT has_column_privilege('authenticated','public.landlord_settings','notify_payment_made','UPDATE') THEN
    RAISE EXCEPTION 'OVERREACH: the settings page cannot write settings';
  END IF;

  -- I7: both new functions must return `trigger`, which is what keeps them
  -- outside the client-executable definer surface. If either is ever changed
  -- to return something callable, this fails before I7 has to.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
              WHERE ns.nspname='public'
                AND p.proname IN ('property_staff_before_write','landlord_settings_touch')
                AND pg_get_function_result(p.oid) <> 'trigger') THEN
    RAISE EXCEPTION 'FAILED: a staff function is callable, not a trigger';
  END IF;
  -- ...and neither may be granted to a client role regardless.
  IF EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace ns ON ns.oid=p.pronamespace
              WHERE ns.nspname='public'
                AND p.proname IN ('property_staff_before_write','landlord_settings_touch')
                AND (has_function_privilege('anon', p.oid,'EXECUTE')
                     OR has_function_privilege('authenticated', p.oid,'EXECUTE'))) THEN
    RAISE EXCEPTION 'FAILED: a staff trigger function is client-executable';
  END IF;

  -- The caretaker policies exist, and the ones that must NOT exist do not.
  SELECT count(*) INTO n FROM pg_policy
   WHERE polname IN ('buildings_staff_read','units_staff_read',
                     'maintenance_staff_read','maintenance_staff_update');
  IF n <> 4 THEN
    RAISE EXCEPTION 'FAILED: expected 4 staff policies, found %', n;
  END IF;

  -- Staff must have NO route to tenants, leases or payments.
  IF EXISTS (
    SELECT 1 FROM pg_policy p JOIN pg_class c ON c.oid = p.polrelid
     WHERE c.relname IN ('tenants','leases','payments')
       AND pg_get_expr(p.polqual, p.polrelid) ILIKE '%property_staff%'
  ) THEN
    RAISE EXCEPTION 'FAILED: staff were given a path to tenants, leases or payments';
  END IF;

  RAISE NOTICE 'landlord_settings and property_staff installed; staff scoped to assigned buildings only.';
END
$assert$;

-- =============================================================================
-- ROLLBACK:
--   DROP POLICY buildings_staff_read ON public.buildings;
--   DROP POLICY units_staff_read ON public.units;
--   DROP POLICY maintenance_staff_read ON public.maintenance_requests;
--   DROP POLICY maintenance_staff_update ON public.maintenance_requests;
--   DROP TABLE public.property_staff, public.landlord_settings CASCADE;
--   DROP FUNCTION IF EXISTS public.property_staff_before_write();
--   DROP FUNCTION IF EXISTS public.landlord_settings_touch();
-- =============================================================================
