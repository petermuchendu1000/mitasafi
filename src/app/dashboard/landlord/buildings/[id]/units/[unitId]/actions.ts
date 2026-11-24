"use server";

/**
 * Starting a tenancy, and recording rent against it.
 *
 * WHAT THIS REPLACES
 *   add-tenant/page.tsx ended with a 1500ms setTimeout, a console.log and a
 *   redirect back to the unit — which still had no tenant. The unit detail
 *   page's "Record Payment" button opened a modal reading "Payment recording
 *   form coming soon..." with a Save button that closed it and did nothing.
 *
 * ONE WRITE, IN ONE TRANSACTION
 *   A tenancy is a tenants row, a leases row pointing at it and the unit, and
 *   units.status = 'occupied'. This used to run them as three PostgREST calls
 *   with hand-rolled compensating DELETEs, which is not atomicity. It could
 *   not survive the process dying between two of them, a compensating DELETE
 *   that itself failed, or two requests both passing the live-lease check and
 *   leaving one unit with two live leases.
 *
 *   20260354000000_tenancy_integrity.sql added create_tenancy(), which does
 *   all three inside one transaction and locks the unit row BEFORE checking
 *   for a live lease, so that last race cannot happen. This calls it.
 *
 *   The function is SECURITY INVOKER: it runs with exactly the permissions
 *   this session already had. It adds no privilege, it only makes the writes
 *   that were already happening into a single transaction.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { Json } from "@/types/database";
import {
  buildTenancy,
  type TenancyFormValues,
  type TenancyErrors,
} from "@/lib/landlord/tenancy-form";
import {
  buildPayment,
  type PaymentFormValues,
  type PaymentErrors,
} from "@/lib/landlord/payment-form";
import { nairobiToday } from "@/lib/landlord/rent-status";

export interface TenancyActionResult {
  ok: boolean;
  errors?: TenancyErrors;
  message?: string;
}

export async function createTenancy(
  unitId: string,
  form: TenancyFormValues,
): Promise<TenancyActionResult> {
  const { errors, tenant, lease } = buildTenancy(form, nairobiToday());
  if (!tenant || !lease) return { ok: false, errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Your session has expired. Sign in again." };
  }

  const { data: unit } = await supabase
    .from("units")
    .select("id, building_id, unit_number")
    .eq("id", unitId)
    .eq("landlord_id", user.id)
    .maybeSingle();

  if (!unit) {
    return {
      ok: false,
      message: "That unit could not be found on your account.",
    };
  }

  // One call, one transaction. The live-lease check, both inserts and the unit
  // status all happen inside it, after the unit row is locked.
  //
  // The payloads go through untouched: buildTenancy() returns no ownership
  // columns at all, and the function sets created_by / landlord_id / unit_id /
  // tenant_id from the session rather than trusting anything sent to it.
  const { error } = await supabase.rpc("create_tenancy", {
    p_unit_id: unitId,
    p_tenant: tenant as unknown as Json,
    p_lease: lease as unknown as Json,
  });

  if (error) {
    console.error(
      "[createTenancy] create_tenancy failed:",
      error.code,
      error.message,
    );

    // The function raises a distinct SQLSTATE per refusal, so the landlord is
    // told which thing went wrong instead of "something went wrong".
    if (error.code === "28000") {
      return { ok: false, message: "Your session has expired. Sign in again." };
    }
    if (error.code === "P0002") {
      return {
        ok: false,
        message: "That unit could not be found on your account.",
      };
    }
    if (error.code === "23505" && /live lease/i.test(error.message)) {
      return {
        ok: false,
        message: `Unit ${unit.unit_number} already has a live lease. End it before starting a new one.`,
      };
    }
    // 23505 from the new unique index, or anything else: nothing was written,
    // because the whole function is one transaction.
    return {
      ok: false,
      message: "Could not start the tenancy. Nothing was created.",
    };
  }

  if (unit.building_id) {
    revalidatePath(`/dashboard/landlord/buildings/${unit.building_id}`);
    revalidatePath(
      `/dashboard/landlord/buildings/${unit.building_id}/units/${unitId}`,
    );
  }
  revalidatePath("/dashboard/landlord/buildings");
  revalidatePath("/dashboard/landlord/tenants");
  revalidatePath("/dashboard/landlord/rent");
  revalidatePath("/dashboard/landlord");
  return { ok: true };
}

export interface PaymentActionResult {
  ok: boolean;
  errors?: PaymentErrors;
  message?: string;
}

/**
 * Record a payment against a lease.
 *
 * The lease is re-read with `landlord_id = auth.uid()` first: payments has no
 * landlord column of its own, so its RLS policy walks the lease, and without
 * this check the only thing standing between a caller and someone else's lease
 * would be that policy.
 */
export async function recordPayment(
  leaseId: string,
  form: PaymentFormValues,
): Promise<PaymentActionResult> {
  const { errors, payment } = buildPayment(form, nairobiToday());
  if (!payment) return { ok: false, errors };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "Your session has expired. Sign in again." };
  }

  const { data: lease } = await supabase
    .from("leases")
    .select("id, unit_id, units ( building_id )")
    .eq("id", leaseId)
    .eq("landlord_id", user.id)
    .maybeSingle();

  if (!lease) {
    return {
      ok: false,
      message: "That lease could not be found on your account.",
    };
  }

  const { error } = await supabase
    .from("payments")
    .insert({ ...payment, lease_id: leaseId, confirmed_by: user.id });

  if (error) {
    console.error("[recordPayment] failed:", error.code, error.message);
    if (error.code === "23514") {
      return {
        ok: false,
        message:
          "One of those values is not allowed for its field. Nothing was saved.",
      };
    }
    return {
      ok: false,
      message: "Could not record the payment. Nothing was saved.",
    };
  }

  const buildingId = (lease.units as { building_id: string | null } | null)
    ?.building_id;
  if (buildingId) {
    revalidatePath(`/dashboard/landlord/buildings/${buildingId}`);
    revalidatePath(
      `/dashboard/landlord/buildings/${buildingId}/units/${lease.unit_id}`,
    );
  }
  revalidatePath("/dashboard/landlord/rent");
  revalidatePath("/dashboard/landlord");
  return { ok: true };
}
