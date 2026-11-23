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
 * THREE WRITES, AND WHY THEY ARE NOT ATOMIC
 *   A tenancy is a tenants row, a leases row pointing at it and the unit, and
 *   units.status = 'occupied'. PostgREST has no multi-table transaction, so
 *   these run in order and each failure undoes what came before it. That is
 *   compensation, not atomicity: a crash between two of these calls can still
 *   leave a tenant with no lease. Making it genuinely atomic means a Postgres
 *   function, which is a schema change and is deliberately not bundled here.
 *   The order is chosen so the worst survivable outcome is the least harmful:
 *   an orphan tenant row shows up on the tenants list and can be reused, while
 *   a lease with no tenant would break every page that joins them.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
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

const LIVE_LEASE_STATUSES = ["active", "pending_signature"];

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

  // Two live leases on one unit would double-count the rent due on every page
  // that sums them, so the second one is refused rather than merged.
  const { data: existing } = await supabase
    .from("leases")
    .select("id, status")
    .eq("unit_id", unitId)
    .in("status", LIVE_LEASE_STATUSES)
    .limit(1);

  if (existing && existing.length > 0) {
    return {
      ok: false,
      message: `Unit ${unit.unit_number} already has a live lease. End it before starting a new one.`,
    };
  }

  // 1. the tenant
  const { data: tenantRow, error: tenantError } = await supabase
    .from("tenants")
    .insert({ ...tenant, created_by: user.id })
    .select("id")
    .single();

  if (tenantError || !tenantRow) {
    console.error(
      "[createTenancy] tenant insert failed:",
      tenantError?.code,
      tenantError?.message,
    );
    return {
      ok: false,
      message: "Could not save the tenant. Nothing was created.",
    };
  }

  // 2. the lease
  const { data: leaseRow, error: leaseError } = await supabase
    .from("leases")
    .insert({
      ...lease,
      unit_id: unitId,
      tenant_id: tenantRow.id,
      landlord_id: user.id,
    })
    .select("id")
    .single();

  if (leaseError || !leaseRow) {
    console.error(
      "[createTenancy] lease insert failed:",
      leaseError?.code,
      leaseError?.message,
    );
    await supabase.from("tenants").delete().eq("id", tenantRow.id);
    return {
      ok: false,
      message: "Could not save the lease, so the tenant was not kept either.",
    };
  }

  // 3. the unit is now occupied
  const { error: unitError } = await supabase
    .from("units")
    .update({ status: "occupied" })
    .eq("id", unitId)
    .eq("landlord_id", user.id);

  if (unitError) {
    console.error(
      "[createTenancy] unit status failed:",
      unitError.code,
      unitError.message,
    );
    await supabase.from("leases").delete().eq("id", leaseRow.id);
    await supabase.from("tenants").delete().eq("id", tenantRow.id);
    return {
      ok: false,
      message: "Could not mark the unit occupied, so nothing was kept.",
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
