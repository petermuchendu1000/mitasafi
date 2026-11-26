"use server";

/**
 * Taking money that has arrived and putting it against the right lease.
 *
 * A "use server" directive publishes every export as an HTTP endpoint, so
 * each one authenticates first and nothing here trusts an id it was handed:
 * every write is additionally keyed on landlord_id, and the database refuses
 * a lease or payment belonging to anyone else.
 *
 * THE ORDER MATTERS
 *   The inbox row is written BEFORE the payment. If the payment insert fails
 *   the money is still recorded as having arrived, unmatched, and the
 *   landlord can see it. The other way round would create a payment with
 *   nothing explaining where it came from.
 */

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import {
  splitMessages,
  parseMpesaMessage,
  matchPayment,
  type LeaseCandidate,
} from "@/lib/landlord/reconciliation";

export interface IngestResult {
  success: boolean;
  error?: string;
  /** Per-message outcome, in the order they were pasted. */
  report?: {
    transId: string | null;
    outcome: "matched" | "unmatched" | "duplicate" | "unreadable";
    detail: string;
  }[];
}

async function liveCandidates(
  supabase: Awaited<ReturnType<typeof createClient>>,
  landlordId: string,
): Promise<LeaseCandidate[]> {
  const { data: leases } = await supabase
    .from("leases")
    .select("id, unit_id, tenant_id, status")
    .eq("landlord_id", landlordId);

  const rows = leases ?? [];
  if (rows.length === 0) return [];

  const unitIds = [...new Set(rows.map((l) => l.unit_id).filter(Boolean))];
  const tenantIds = [...new Set(rows.map((l) => l.tenant_id).filter(Boolean))];

  const [{ data: units }, { data: tenants }] = await Promise.all([
    supabase.from("units").select("id, unit_number").in("id", unitIds),
    supabase.from("tenants").select("id, full_name, phone").in("id", tenantIds),
  ]);

  const unitById = new Map((units ?? []).map((u) => [u.id, u]));
  const tenantById = new Map((tenants ?? []).map((t) => [t.id, t]));

  return rows.map((l) => ({
    leaseId: l.id,
    unitNumber: unitById.get(l.unit_id)?.unit_number ?? null,
    tenantPhone: tenantById.get(l.tenant_id)?.phone ?? null,
    tenantName: tenantById.get(l.tenant_id)?.full_name ?? null,
    status: l.status,
  }));
}

export async function ingestPastedPayments(
  text: string,
): Promise<IngestResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const chunks = splitMessages(text ?? "");
  if (chunks.length === 0) {
    return { success: false, error: "Paste at least one M-Pesa message." };
  }

  const candidates = await liveCandidates(supabase, user.id);
  const report: NonNullable<IngestResult["report"]> = [];

  for (const chunk of chunks) {
    const parsed = parseMpesaMessage(chunk);
    if (!parsed) {
      report.push({
        transId: null,
        outcome: "unreadable",
        // Deliberately not stored: a row with a guessed amount is worse than
        // no row, so an unreadable message is reported and dropped.
        detail: `Could not read: "${chunk.slice(0, 48)}…"`,
      });
      continue;
    }

    const decision = matchPayment(parsed, candidates);

    const { data: inbox, error: inboxError } = await supabase
      .from("mpesa_inbox")
      .insert({
        // landlord_id is DELIBERATELY ABSENT. A client holds no INSERT
        // privilege on that column — that is what stops money being filed to
        // someone else — so naming it here is "permission denied for table
        // mpesa_inbox" for the whole statement, not a silently ignored field.
        // The BEFORE trigger derives it from auth.uid(), and the policy's
        // WITH CHECK confirms it. Asserted by I10 and I18 in
        // supabase/tests/mpesa_inbox_test.sql.
        trans_id: parsed.transId,
        trans_amount: parsed.amount,
        bill_ref: parsed.billRef,
        msisdn: parsed.msisdn,
        payer_name: parsed.payerName,
        trans_time: parsed.transTime,
        source: "pasted",
        status: "unmatched",
        match_reason: decision.reason,
        raw: { text: chunk },
      })
      .select("id")
      .single();

    if (inboxError) {
      // The unique index on (landlord_id, trans_id) is the idempotency key:
      // the same confirmation pasted twice must not be credited twice.
      if (inboxError.code === "23505") {
        report.push({
          transId: parsed.transId,
          outcome: "duplicate",
          detail: `${parsed.transId} was already recorded.`,
        });
        continue;
      }
      console.error("[Reconcile] inbox insert:", inboxError.message);
      report.push({
        transId: parsed.transId,
        outcome: "unreadable",
        detail: `Could not record ${parsed.transId}.`,
      });
      continue;
    }

    if (!decision.matched) {
      report.push({
        transId: parsed.transId,
        outcome: "unmatched",
        detail: decision.reason,
      });
      continue;
    }

    const linked = await attachToLease(
      supabase,
      user.id,
      inbox.id,
      decision.leaseId,
      decision.reason,
      true,
    );
    report.push({
      transId: parsed.transId,
      outcome: linked ? "matched" : "unmatched",
      detail: linked
        ? decision.reason
        : `${parsed.transId} was recorded but could not be posted to the lease.`,
    });
  }

  revalidatePath("/dashboard/landlord/reconcile");
  return { success: true, report };
}

/**
 * Creates the payment and links the inbox row to it.
 *
 * `auto` is not decoration. It is the difference between "the matcher placed
 * this" and "a person decided this", and it is the only record of which. A
 * row the landlord assigned by hand must not later tell an auditor the system
 * matched it — that is the one question `payments.auto_matched` exists to
 * answer.
 */
async function attachToLease(
  supabase: Awaited<ReturnType<typeof createClient>>,
  landlordId: string,
  inboxId: string,
  leaseId: string,
  reason: string,
  auto: boolean,
): Promise<boolean> {
  const { data: row } = await supabase
    .from("mpesa_inbox")
    .select("trans_id, trans_amount, bill_ref, msisdn, payer_name, trans_time")
    .eq("id", inboxId)
    .eq("landlord_id", landlordId)
    .single();
  if (!row) return false;

  const { data: payment, error: payError } = await supabase
    .from("payments")
    .insert({
      lease_id: leaseId,
      amount: row.trans_amount,
      payment_type: "rent",
      payment_method: "mpesa",
      // The money has arrived — Safaricom's confirmation is what "confirmed"
      // means. Recording it as pending would understate what was received.
      status: "confirmed",
      payment_date: (row.trans_time ?? new Date().toISOString()).slice(0, 10),
      mpesa_receipt: row.trans_id,
      mpesa_phone: row.msisdn,
      mpesa_name: row.payer_name,
      reference_number: row.bill_ref,
      // The column has existed since the schema was written and nothing has
      // ever set it. This is the only thing that could.
      auto_matched: auto,
      received_by: landlordId,
    })
    .select("id")
    .single();

  if (payError) {
    console.error("[Reconcile] payment insert:", payError.message);
    return false;
  }

  const { error: linkError } = await supabase
    .from("mpesa_inbox")
    .update({
      status: "matched",
      matched_lease_id: leaseId,
      matched_payment_id: payment.id,
      matched_by: landlordId,
      match_reason: reason,
    })
    .eq("id", inboxId)
    .eq("landlord_id", landlordId);

  if (linkError) {
    console.error("[Reconcile] link:", linkError.message);
    return false;
  }
  return true;
}

export async function assignInboxRow(
  inboxId: string,
  leaseId: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const ok = await attachToLease(
    supabase,
    user.id,
    inboxId,
    leaseId,
    "Assigned by you.",
    false,
  );
  revalidatePath("/dashboard/landlord/reconcile");
  return ok
    ? { success: true }
    : { success: false, error: "Could not post that to the lease." };
}

/** Not money for a lease — a deposit refund, a supplier, a mis-send. */
export async function ignoreInboxRow(
  inboxId: string,
  why: string,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { success: false, error: "You need to be signed in." };

  const { error } = await supabase
    .from("mpesa_inbox")
    .update({
      status: "ignored",
      match_reason: why.trim() || "Set aside by you.",
    })
    .eq("id", inboxId)
    .eq("landlord_id", user.id);

  if (error) {
    console.error("[Reconcile] ignore:", error.message);
    return { success: false, error: "Could not set that aside." };
  }
  revalidatePath("/dashboard/landlord/reconcile");
  return { success: true };
}
