/**
 * What this landlord has actually been paid.
 *
 * AUTHORIZATION
 *   payments has no landlord_id; it hangs off a lease. So the leases are read
 *   for this landlord first and the payments fetched by those lease ids. A
 *   payment on someone else's lease cannot be reached, because its id is never
 *   in the list.
 *
 * WHAT IS DELIBERATELY NOT ADDED UP
 *   Deposits. They are money held against a tenancy and owed back at the end
 *   of it, so they are shown as a balance rather than folded into earnings.
 *   See the note at the top of lib/landlord/finance.ts.
 */

import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/landlord/rent-status";
import { summariseIncome } from "@/lib/landlord/finance";
import { IncomeReport } from "./IncomeReport";

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function IncomePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const { data: leaseRows } = await supabase
    .from("leases")
    .select("id")
    .eq("landlord_id", landlordId)
    .limit(2000);

  const leaseIds = (leaseRows ?? []).map((l) => l.id);

  const { data: paymentRows, error } = leaseIds.length
    ? await supabase
        .from("payments")
        .select("amount, payment_type, status, payment_date")
        .in("lease_id", leaseIds)
        .limit(5000)
    : { data: [], error: null };

  if (error) console.error("[Income] query failed:", error.message);

  const summary = summariseIncome(
    (paymentRows ?? []).map((p) => ({
      amount: num(p.amount),
      payment_type: p.payment_type,
      status: p.status,
      payment_date: p.payment_date,
    })),
    nairobiToday(),
  );

  return <IncomeReport summary={summary} />;
}
