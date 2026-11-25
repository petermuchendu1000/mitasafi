/**
 * Tenant applications for this landlord's listings.
 *
 * WHAT THIS REPLACES
 *   Nothing. "Applications" was in the sidebar and the route did not exist, so
 *   the link 404'd — while PricingSection sold "Receive applications" on both
 *   paid plans. There was no table behind it either; 20260355000000 adds one.
 *
 * IF THE MIGRATION IS NOT APPLIED YET
 *   This page is deliberately tolerant of the table being absent. The
 *   migration ships in the same change but is applied to production
 *   separately, and a 500 in the interval would be a worse answer than saying
 *   plainly that the feature is not switched on. PostgREST reports a missing
 *   relation as 42P01 or PGRST205.
 *
 * AUTHORIZATION
 *   rental_applications carries landlord_id, set by trigger from the listing,
 *   so that is the filter — and RLS enforces the same thing independently.
 */

import { createClient } from "@/lib/supabase/server";
import { buildApplicationQueue } from "@/lib/landlord/applications";
import { ApplicationsQueue } from "./ApplicationsQueue";
import { ApplicationsNotEnabled } from "./ApplicationsNotEnabled";

/** PostgREST returns numeric as a string; null must not quietly become 0. */
function num(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const MISSING_TABLE = new Set(["42P01", "PGRST205", "PGRST106"]);

export default async function ApplicationsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const { data: rows, error } = await supabase
    .from("rental_applications")
    // prettier-ignore
    .select(
      "id, listing_id, applicant_id, full_name, email, phone, occupation, employer, monthly_income, household_size, move_in_date, lease_months, message, status, landlord_notes, decided_at, created_at",
    )
    .eq("landlord_id", landlordId)
    .limit(2000);

  if (error) {
    if (MISSING_TABLE.has(error.code ?? "")) {
      return <ApplicationsNotEnabled />;
    }
    console.error("[Applications] query failed:", error.message);
  }

  const applications = rows ?? [];

  // Only the listings these applications point at.
  const listingIds = Array.from(new Set(applications.map((a) => a.listing_id)));
  const { data: listingRows } = listingIds.length
    ? await supabase
        .from("listings")
        .select("id, title, rent_amount")
        .eq("landlord_id", landlordId)
        .in("id", listingIds)
    : { data: [] };

  const { applications: queue, stats } = buildApplicationQueue({
    applications: applications.map((a) => ({
      ...a,
      monthly_income: num(a.monthly_income),
      household_size: a.household_size,
      lease_months: a.lease_months,
    })),
    listings: (listingRows ?? []).map((l) => ({
      id: l.id,
      title: l.title,
      rent_amount: num(l.rent_amount),
    })),
  });

  return <ApplicationsQueue applications={queue} stats={stats} />;
}
