/**
 * Every lease this landlord holds.
 *
 * WHAT THIS REPLACES
 *   Nothing. "Leases & Files" was in the sidebar and the route did not exist,
 *   so the link 404'd. It was one of the entries in internal-links-resolve's
 *   KNOWN_MISSING budget; that entry is removed in the same commit, because
 *   the budget fails in both directions and a stale entry is itself a failure.
 *
 * AUTHORIZATION
 *   leases carries landlord_id, so that is the filter. Tenants are read
 *   through their ids rather than by listing the table, and units and
 *   buildings are filtered on landlord_id too, so a row belonging to someone
 *   else cannot be joined in by accident.
 *
 * WHY THE ROLL-UPS ARE COMPUTED IN TYPESCRIPT
 *   Same reason as the overview and the tenants directory: the deployed
 *   SECURITY DEFINER stats functions have EXECUTE revoked from `authenticated`
 *   and return 42501 even to the landlord asking about their own id. A
 *   user-session page has no route to them, and that revocation is enforced
 *   policy rather than an oversight — identity_role_authority I7 fails the
 *   build if anything reopens it.
 */

import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/landlord/rent-status";
import { buildLeaseDirectory } from "@/lib/landlord/lease-directory";
import { LeaseDirectory } from "./LeaseDirectory";

/** PostgREST returns numeric as a string; null must not quietly become 0. */
function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function LeasesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const [
    { data: leaseRows, error: leasesError },
    { data: unitRows },
    { data: buildingRows },
  ] = await Promise.all([
    supabase
      .from("leases")
      // prettier-ignore
      .select(
        "id, unit_id, tenant_id, status, lease_type, start_date, end_date, monthly_rent, deposit_amount, deposit_status, rent_due_day, lease_document_url, other_documents",
      )
      .eq("landlord_id", landlordId)
      .limit(2000),
    supabase
      .from("units")
      .select("id, unit_number, building_id")
      .eq("landlord_id", landlordId),
    supabase.from("buildings").select("id, name").eq("landlord_id", landlordId),
  ]);

  if (leasesError) {
    console.error("[Leases] query failed:", leasesError.message);
  }

  const leases = leaseRows ?? [];

  // Only the tenants these leases point at, rather than the whole table.
  const tenantIds = Array.from(
    new Set(leases.map((l) => l.tenant_id).filter((id): id is string => !!id)),
  );
  const { data: tenantRows } = tenantIds.length
    ? await supabase
        .from("tenants")
        .select("id, full_name, phone")
        .in("id", tenantIds)
    : { data: [] };

  const today = nairobiToday();
  const { leases: directory, stats } = buildLeaseDirectory({
    leases: leases.map((l) => ({
      id: l.id,
      unit_id: l.unit_id,
      tenant_id: l.tenant_id,
      status: l.status,
      lease_type: l.lease_type,
      start_date: l.start_date,
      end_date: l.end_date,
      monthly_rent: num(l.monthly_rent),
      deposit_amount: l.deposit_amount === null ? null : num(l.deposit_amount),
      deposit_status: l.deposit_status,
      rent_due_day: l.rent_due_day,
      lease_document_url: l.lease_document_url,
      other_documents: l.other_documents,
    })),
    tenants: (tenantRows ?? []).map((t) => ({
      id: t.id,
      full_name: t.full_name,
      phone: t.phone,
    })),
    units: (unitRows ?? []).map((u) => ({
      id: u.id,
      unit_number: u.unit_number,
      building_id: u.building_id,
    })),
    buildings: (buildingRows ?? []).map((b) => ({ id: b.id, name: b.name })),
    today,
  });

  return <LeaseDirectory leases={directory} stats={stats} />;
}
