/**
 * What this landlord has actually spent.
 *
 * THE LIMIT OF THIS PAGE, STATED ON THE PAGE ITSELF
 *   There is no expenses table on this project. Across all 86 deployed tables
 *   the only landlord outgoing recorded anywhere is maintenance cost, so that
 *   is what this reports. It is not a general ledger, and the page says so
 *   rather than letting a total imply completeness it does not have.
 *
 * AUTHORIZATION
 *   maintenance_requests carries landlord_id, so that is the filter.
 */

import { createClient } from "@/lib/supabase/server";
import { nairobiToday } from "@/lib/landlord/rent-status";
import { summariseExpenses } from "@/lib/landlord/finance";
import { ExpenseReport } from "./ExpenseReport";

function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

export default async function ExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const { data: jobs, error } = await supabase
    .from("maintenance_requests")
    // prettier-ignore
    .select(
      "actual_cost, estimated_cost, cost_paid_by, status, category, completed_at, reported_at",
    )
    .eq("landlord_id", landlordId)
    .limit(2000);

  if (error) console.error("[Expenses] query failed:", error.message);

  const summary = summariseExpenses(
    (jobs ?? []).map((j) => ({
      actual_cost: num(j.actual_cost),
      estimated_cost: num(j.estimated_cost),
      cost_paid_by: j.cost_paid_by,
      status: j.status,
      category: j.category,
      completed_at: j.completed_at,
      reported_at: j.reported_at,
    })),
    nairobiToday(),
  );

  return <ExpenseReport summary={summary} />;
}
