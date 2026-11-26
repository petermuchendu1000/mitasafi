"use server";

/**
 * Submitting a rental application.
 *
 * A "use server" directive publishes EVERY export of this module as a callable
 * HTTP endpoint, so this module has exactly one export and it authenticates
 * first. An application is not anonymous — inquiries are the anonymous channel.
 *
 * WHAT IS NOT SENT FROM HERE
 *   landlord_id, applicant_id and status. The client holds no INSERT privilege
 *   on any of them; a BEFORE INSERT trigger reads the landlord from the listing
 *   and takes the applicant from the JWT. That is what stops an application
 *   being filed against a landlord who never advertised it — the hole that is
 *   still open on `inquiries`, where the insert policy is WITH CHECK (true).
 */

import { createClient } from "@/lib/supabase/server";
import { notifyApplicationSubmitted } from "@/lib/notifications/emit";

export interface ApplicationInput {
  listingId: string;
  fullName: string;
  email: string | null;
  phone: string;
  occupation: string | null;
  employer: string | null;
  monthlyIncome: number | null;
  householdSize: number | null;
  moveInDate: string | null;
  leaseMonths: number | null;
  message: string | null;
}

export interface SubmitResult {
  success: boolean;
  error?: string;
}

const MISSING_TABLE = new Set(["42P01", "PGRST205", "PGRST106"]);

function clean(value: string | null): string | null {
  if (value === null) return null;
  const t = value.trim();
  return t === "" ? null : t;
}

export async function submitRentalApplication(
  input: ApplicationInput,
): Promise<SubmitResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      success: false,
      error:
        "Please sign in to apply. It takes a moment and keeps your details yours.",
    };
  }

  const fullName = clean(input.fullName);
  const phone = clean(input.phone);
  if (!fullName) return { success: false, error: "Please give your name." };
  if (!phone) {
    return { success: false, error: "Please give a phone number." };
  }

  const { error } = await supabase.from("rental_applications").insert({
    listing_id: input.listingId,
    full_name: fullName,
    email: clean(input.email),
    phone,
    occupation: clean(input.occupation),
    employer: clean(input.employer),
    monthly_income: input.monthlyIncome,
    household_size: input.householdSize,
    move_in_date: input.moveInDate,
    lease_months: input.leaseMonths,
    message: clean(input.message),
  });

  if (error) {
    console.error("[Apply] insert failed:", error.code, error.message);

    if (MISSING_TABLE.has(error.code ?? "")) {
      return {
        success: false,
        error: "Applications are not switched on yet. Use Contact instead.",
      };
    }
    // The partial unique index on (listing_id, applicant_id) for open statuses.
    if (error.code === "23505") {
      return {
        success: false,
        error: "You have already applied for this one.",
      };
    }
    // The trigger's own refusals: listing not visible, or not accepting.
    if (error.code === "P0002") {
      return { success: false, error: "This listing is no longer available." };
    }
    if (error.code === "P0001") {
      return {
        success: false,
        error: "This listing is not accepting applications.",
      };
    }
    if (error.code === "23514") {
      return { success: false, error: "Please check the details you entered." };
    }
    return { success: false, error: "Could not send your application." };
  }

  // The application is saved. Telling the landlord is a best-effort step
  // AFTER that fact: it is awaited so the work finishes before the server
  // action returns, but it cannot throw and cannot change what the
  // applicant is told. A landlord who misses an application loses the
  // tenant to whoever answered first, which is why it is worth doing at
  // all — and why it must never turn a successful submission into an error
  // on the applicant's screen.
  await notifyApplicationSubmitted({
    listingId: input.listingId,
    applicantUserId: user.id,
    applicantName: fullName,
  });

  return { success: true };
}
