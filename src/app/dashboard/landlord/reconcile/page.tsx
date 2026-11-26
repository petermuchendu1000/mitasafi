/**
 * Reconciliation — matching money that has arrived to the lease it belongs to.
 *
 * HOW A CONFIRMATION GETS HERE
 *   MitaSafi does not own the landlord's paybill, so Safaricom's C2B
 *   confirmation goes wherever that landlord registered it. Until they point
 *   it at MitaSafi, the working route is the landlord pasting the messages —
 *   which needs no Daraja relationship and reconciles exactly as well,
 *   because the matching is done on the account reference either way.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ReconcileClient } from "./ReconcileClient";

export const metadata: Metadata = { title: "Reconcile | MitaSafi" };

const MISSING_TABLE = new Set(["42P01", "PGRST205", "PGRST106"]);

function num(v: number | string | null | undefined): number {
  if (v === null || v === undefined || v === "") return 0;
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export default async function ReconcilePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const { data: inbox, error } = await supabase
    .from("mpesa_inbox")
    .select("*")
    .eq("landlord_id", landlordId)
    .order("trans_time", { ascending: false })
    .limit(200);

  if (MISSING_TABLE.has(error?.code ?? "")) {
    return <ReconcileClient notEnabled rows={[]} leases={[]} />;
  }

  const { data: leases } = await supabase
    .from("leases")
    .select("id, unit_id, tenant_id, status")
    .eq("landlord_id", landlordId);

  const rows = leases ?? [];
  const unitIds = [...new Set(rows.map((l) => l.unit_id).filter(Boolean))];
  const tenantIds = [...new Set(rows.map((l) => l.tenant_id).filter(Boolean))];

  const [{ data: units }, { data: tenants }] = await Promise.all([
    unitIds.length
      ? supabase.from("units").select("id, unit_number").in("id", unitIds)
      : Promise.resolve({ data: [] as { id: string; unit_number: string }[] }),
    tenantIds.length
      ? supabase.from("tenants").select("id, full_name").in("id", tenantIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
  ]);

  const unitById = new Map((units ?? []).map((u) => [u.id, u.unit_number]));
  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t.full_name]));

  return (
    <ReconcileClient
      rows={(inbox ?? []).map((r) => ({
        id: r.id,
        transId: r.trans_id,
        amount: num(r.trans_amount),
        billRef: r.bill_ref,
        payerName: r.payer_name,
        msisdn: r.msisdn,
        transTime: r.trans_time,
        status: r.status,
        reason: r.match_reason,
        matchedLeaseId: r.matched_lease_id,
      }))}
      leases={rows
        .filter((l) => l.status !== "terminated")
        .map((l) => ({
          id: l.id,
          label: `${unitById.get(l.unit_id) ?? "unit"} — ${
            tenantById.get(l.tenant_id) ?? "tenant"
          }`,
        }))}
    />
  );
}
