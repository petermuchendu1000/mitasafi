/**
 * Scheduled notifications: rent reminders, late notices, lease expiries and
 * the landlord's arrears summary.
 *
 * SCHEDULED BY .github/workflows/notifications.yml — not by vercel.json.
 * Production is served by Fly, which does not read vercel.json, and two
 * declared schedulers for one endpoint is a latent duplicate-send.
 *
 * THE SAFETY MODEL, IN ORDER
 *   1. The planner decides. It is pure, tested, and refuses to plan a late
 *      notice for a month with no recorded rent — see lib/notifications/plan.
 *   2. The log decides whether it has already gone out. A unique index on
 *      (landlord_id, dedupe_key) WHERE status = 'sent' makes the second
 *      attempt a no-op even if two runs overlap.
 *   3. The send-time re-check decides whether it is still true. A tenant who
 *      paid between planning and sending is not chased.
 *   4. The log row is written only AFTER Resend accepts. Writing it first
 *      would mean one outage silences that notice for ever.
 *
 * `?dryRun=1` plans and reports and sends nothing, writes nothing. It is how
 * this was developed and how it should be checked after any change to the
 * rules. `?landlord=<uuid>` restricts the run to one portfolio.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCronRequest } from "@/lib/security/cron-auth";
import { sendNotificationEmail } from "@/lib/email";
import { nairobiToday } from "@/lib/landlord/rent-status";
import {
  planNotices,
  stillOwing,
  type NotifyLease,
  type NotifyPayment,
  type NotifyPreferences,
  type PlannedNotice,
} from "@/lib/notifications/plan";
import { renderNotice } from "@/lib/notifications/render";

export const dynamic = "force-dynamic";

function num(v: unknown, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Rent kinds whose truth can change between planning and sending. */
const RENT_KINDS = new Set([
  "invoice_due_soon",
  "invoice_due_day",
  "invoice_late",
]);

export async function GET(request: NextRequest) {
  const auth = authorizeCronRequest(request.headers);
  if (!auth.authorized) {
    console.warn(`[Notify] Denied request: ${auth.reason}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dryRun = searchParams.get("dryRun") === "1";
  const onlyLandlord = searchParams.get("landlord");

  // Named `admin` deliberately: this client bypasses RLS, and every
  // `.from(...)` below should read as such at a glance.
  const admin = createAdminClient();
  const today = nairobiToday();

  let settingsQuery = admin
    .from("landlord_settings")
    // prettier-ignore
    .select(
      "landlord_id, notify_overdue_summary, overdue_summary_day_1, overdue_summary_day_2, notify_lease_expiring, lease_expiry_notice_days, tenant_notify_invoice_due_soon, tenant_notify_invoice_due_day, tenant_notify_invoice_late, tenant_notify_lease_expiring, tenant_invoice_due_notice_days, tenant_lease_expiry_notice_days",
    );
  if (onlyLandlord)
    settingsQuery = settingsQuery.eq("landlord_id", onlyLandlord);

  const { data: settingsRows, error: settingsError } = await settingsQuery;
  if (settingsError) {
    console.error("[Notify] settings query failed:", settingsError.message);
    return NextResponse.json(
      { error: "settings query failed" },
      { status: 500 },
    );
  }

  const summary = {
    dryRun,
    day: `${today.year}-${String(today.month).padStart(2, "0")}-${String(today.day).padStart(2, "0")}`,
    landlords: 0,
    planned: 0,
    alreadySent: 0,
    noLongerTrue: 0,
    sent: 0,
    failed: 0,
    byKind: {} as Record<string, number>,
  };

  for (const raw of settingsRows ?? []) {
    const landlordId = raw.landlord_id as string;
    summary.landlords += 1;

    const prefs: NotifyPreferences = {
      landlord_id: landlordId,
      notify_overdue_summary: raw.notify_overdue_summary !== false,
      overdue_summary_day_1: num(raw.overdue_summary_day_1, 5),
      overdue_summary_day_2: num(raw.overdue_summary_day_2, 10),
      notify_lease_expiring: raw.notify_lease_expiring !== false,
      lease_expiry_notice_days: num(raw.lease_expiry_notice_days, 90),
      tenant_notify_invoice_due_soon:
        raw.tenant_notify_invoice_due_soon !== false,
      tenant_notify_invoice_due_day:
        raw.tenant_notify_invoice_due_day !== false,
      tenant_notify_invoice_late: raw.tenant_notify_invoice_late !== false,
      tenant_notify_lease_expiring: raw.tenant_notify_lease_expiring !== false,
      tenant_invoice_due_notice_days: num(
        raw.tenant_invoice_due_notice_days,
        5,
      ),
      tenant_lease_expiry_notice_days: num(
        raw.tenant_lease_expiry_notice_days,
        90,
      ),
    };

    const [{ data: leaseRows }, { data: profileRow }] = await Promise.all([
      admin
        .from("leases")
        // prettier-ignore
        .select(
          "id, landlord_id, tenant_id, unit_id, status, start_date, end_date, monthly_rent, rent_due_day, grace_period_days",
        )
        .eq("landlord_id", landlordId)
        .limit(3000),
      admin.from("profiles").select("email").eq("id", landlordId).single(),
    ]);

    const leasesRaw = leaseRows ?? [];
    if (leasesRaw.length === 0 && !prefs.notify_overdue_summary) continue;

    const unitIds = [
      ...new Set(leasesRaw.map((l) => l.unit_id).filter(Boolean)),
    ];
    const tenantIds = [
      ...new Set(leasesRaw.map((l) => l.tenant_id).filter(Boolean)),
    ];
    const leaseIds = leasesRaw.map((l) => l.id);

    const [{ data: unitRows }, { data: tenantRows }, { data: paymentRows }] =
      await Promise.all([
        unitIds.length
          ? admin
              .from("units")
              .select("id, unit_number, building_id")
              .in("id", unitIds)
          : Promise.resolve({ data: [] as never[] }),
        tenantIds.length
          ? admin
              .from("tenants")
              .select("id, full_name, email")
              .in("id", tenantIds)
          : Promise.resolve({ data: [] as never[] }),
        leaseIds.length
          ? admin
              .from("payments")
              .select(
                "lease_id, amount, payment_type, status, period_year, period_month",
              )
              .in("lease_id", leaseIds)
              .limit(10000)
          : Promise.resolve({ data: [] as never[] }),
      ]);

    const buildingIds = [
      ...new Set((unitRows ?? []).map((u) => u.building_id).filter(Boolean)),
    ] as string[];
    const { data: buildingRows } = buildingIds.length
      ? await admin.from("buildings").select("id, name").in("id", buildingIds)
      : { data: [] as never[] };

    const unitById = new Map((unitRows ?? []).map((u) => [u.id, u]));
    const buildingById = new Map((buildingRows ?? []).map((b) => [b.id, b]));

    const leases: NotifyLease[] = leasesRaw.map((l) => {
      const unit = unitById.get(l.unit_id);
      return {
        id: l.id,
        landlord_id: l.landlord_id,
        tenant_id: l.tenant_id,
        unit_label: unit?.unit_number ?? "your unit",
        building_label: unit?.building_id
          ? (buildingById.get(unit.building_id)?.name ?? "")
          : "",
        status: l.status ?? "draft",
        start_date: l.start_date,
        end_date: l.end_date,
        monthly_rent: num(l.monthly_rent),
        rent_due_day: num(l.rent_due_day, 5) || 5,
        grace_period_days: num(l.grace_period_days, 5),
      };
    });

    const payments: NotifyPayment[] = (paymentRows ?? []).map((p) => ({
      lease_id: p.lease_id,
      amount: num(p.amount),
      payment_type: p.payment_type,
      status: p.status,
      period_year: p.period_year,
      period_month: p.period_month,
    }));

    const planned = planNotices({
      leases,
      tenants: (tenantRows ?? []).map((t) => ({
        id: t.id,
        full_name: t.full_name,
        email: t.email,
      })),
      payments,
      prefs,
      landlordEmail: profileRow?.email ?? null,
      today,
    });
    summary.planned += planned.length;

    if (planned.length === 0) continue;

    // What has already gone out. One query for the whole portfolio rather
    // than one per notice.
    const { data: already } = await admin
      .from("notification_log")
      .select("dedupe_key")
      .eq("landlord_id", landlordId)
      .eq("status", "sent")
      .in(
        "dedupe_key",
        planned.map((n) => n.dedupeKey),
      );
    const sentKeys = new Set(
      (already ?? []).map((r) => r.dedupe_key as string),
    );

    const leaseById = new Map(leases.map((l) => [l.id, l]));

    for (const notice of planned) {
      if (sentKeys.has(notice.dedupeKey)) {
        summary.alreadySent += 1;
        continue;
      }

      // Step 3: is it still true? Only rent kinds can change this fast.
      if (RENT_KINDS.has(notice.kind) && notice.subjectId) {
        const lease = leaseById.get(notice.subjectId);
        if (lease && !stillOwing(lease, payments, today)) {
          summary.noLongerTrue += 1;
          continue;
        }
      }

      summary.byKind[notice.kind] = (summary.byKind[notice.kind] ?? 0) + 1;

      if (dryRun) continue;

      const rendered = renderNotice(notice);
      const result = await sendNotificationEmail({
        to: notice.toEmail,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html,
      });

      // Step 4: the log is written after the send, and records a failure as
      // a failure so it can be retried.
      await writeLog(admin, notice, result);

      if (result.success) summary.sent += 1;
      else {
        summary.failed += 1;
        console.error(
          `[Notify] ${notice.kind} to ${notice.recipientKind} failed: ${result.error}`,
        );
      }
    }
  }

  console.log("[Notify]", JSON.stringify(summary));
  return NextResponse.json(summary);
}

async function writeLog(
  admin: ReturnType<typeof createAdminClient>,
  notice: PlannedNotice,
  result: { success: boolean; error?: string },
): Promise<void> {
  const { error } = await admin.from("notification_log").insert({
    landlord_id: notice.landlordId,
    recipient_kind: notice.recipientKind,
    tenant_id: notice.tenantId,
    channel: "email",
    kind: notice.kind,
    dedupe_key: notice.dedupeKey,
    subject_type: notice.subjectType,
    subject_id: notice.subjectId,
    period: notice.period,
    status: result.success ? "sent" : "failed",
    error: result.success ? null : (result.error ?? "unknown").slice(0, 500),
  });
  // A 23505 here means another run sent it between our check and now. That
  // is the unique index doing its job, not an error worth shouting about.
  if (error && error.code !== "23505") {
    console.error("[Notify] could not write the log:", error.message);
  }
}
