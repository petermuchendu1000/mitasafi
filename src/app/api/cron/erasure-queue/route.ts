/**
 * Erasure queue watchdog.
 *
 * The settings page promises a data subject that their deletion request is
 * processed "within 48 hours". erase_account() can discharge one and
 * scripts/ops/erase-account.mjs makes that practical, but nothing WATCHES the
 * queue — before this route, a late request surfaced only if an operator chose
 * to run `--list`. This is the thing that notices.
 *
 * SCHEDULING, AND A TRAP WORTH NAMING
 *
 * It is driven by .github/workflows/erasure-queue-alert.yml, NOT by
 * vercel.json. The three cron entries in vercel.json are dead configuration:
 * this app deploys to Fly (fly.toml, app = "mitasafi-web"), and Fly does not
 * read vercel.json. Adding a fourth entry there would have produced a watchdog
 * that never barks — the same class of failure as the 48-hour promise it
 * exists to keep. See docs/ACCOUNT_ERASURE_DESIGN.md.
 *
 * Fly's machines scale to zero here (min_machines_running = 0). That is fine:
 * the scheduled HTTPS request wakes one, at the cost of a cold start.
 *
 * SILENCE IS NOT A STATUS
 *
 * Mail is sent only when something needs attention, so a quiet inbox must not
 * be the only evidence the watchdog is alive. The route therefore always
 * returns a JSON summary and a non-2xx on failure, and the workflow fails the
 * job if the call does not succeed — so a broken watchdog shows up as a red
 * run rather than as nothing at all.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { authorizeCronRequest } from "@/lib/security/cron-auth";
import { sendOperationalAlert } from "@/lib/email";
import {
  bucketQueue,
  needsAlert,
  formatAlert,
  ERASURE_SLA_HOURS,
  ERASURE_WARN_HOURS,
  type ErasureQueueRow,
} from "@/lib/erasure/queue";

/** Never cached: the whole value is that it reflects the queue right now. */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  // Same guard as the other cron route, and the same module — it fails closed
  // when CRON_SECRET is unset, which is the production exposure that
  // src/__tests__/cron-auth.test.ts exists because of. Re-implementing the
  // predicate here would be a second place for it to fail open.
  const auth = authorizeCronRequest(request.headers);
  if (!auth.authorized) {
    console.warn(`[Cron/erasure-queue] Denied: ${auth.reason}`);
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Named `admin`, not `supabase`: this read bypasses RLS and the variable
    // should say so at every call site. src/__tests__/profile-read-scope.test.ts
    // enforces that an un-filtered read of profiles is on an admin receiver.
    const admin = createAdminClient();

    // The service-role client is required, not a convenience: profiles is
    // behind RLS and no client role can read other people's rows. Only the
    // ids and the two timestamps are selected — this handler has no reason to
    // load a name or an email, and not loading them is the cheapest way to be
    // sure neither ends up in the alert.
    const { data, error } = await admin
      .from("profiles")
      .select("id, metadata")
      .not("metadata->deletion_requested_at", "is", null);

    if (error) {
      console.error("[Cron/erasure-queue] Query failed:", error.message);
      return NextResponse.json(
        { error: "Query failed", detail: error.message },
        { status: 500 },
      );
    }

    // profiles.metadata is typed Json, which includes string and number, so it
    // cannot be indexed directly. Narrowed with typeof rather than cast: the
    // column is client-writable, so a non-object or a non-string timestamp is
    // reachable in practice, and bucketQueue already has a bucket for a value
    // it cannot parse.
    const rows: ErasureQueueRow[] = (data ?? []).map((p) => {
      const meta =
        p.metadata &&
        typeof p.metadata === "object" &&
        !Array.isArray(p.metadata)
          ? (p.metadata as Record<string, unknown>)
          : {};
      const asString = (v: unknown) => (typeof v === "string" ? v : null);
      return {
        id: p.id,
        requestedAt: asString(meta.deletion_requested_at),
        erasedAt: asString(meta.erased_at),
      };
    });

    const buckets = bucketQueue(rows, new Date());
    const summary = {
      breached: buckets.breached.length,
      warning: buckets.warning.length,
      fresh: buckets.fresh.length,
      unparseable: buckets.unparseable.length,
      slaHours: ERASURE_SLA_HOURS,
      warnHours: ERASURE_WARN_HOURS,
    };

    if (!needsAlert(buckets)) {
      console.log(
        `[Cron/erasure-queue] Nothing overdue (${buckets.fresh.length} pending inside the window)`,
      );
      return NextResponse.json({ ok: true, alerted: false, ...summary });
    }

    const message = formatAlert(buckets);
    const sent = await sendOperationalAlert(message);

    // A failed send is a FAILED RUN. If the alert cannot be delivered, the
    // watchdog is not doing its job, and returning 200 would hide that behind
    // a green workflow.
    if (!sent.success) {
      console.error("[Cron/erasure-queue] Alert send failed:", sent.error);
      return NextResponse.json(
        { ok: false, alerted: false, sendError: sent.error, ...summary },
        { status: 500 },
      );
    }

    // Ids are safe to log — the point of the no-PII rule is names and
    // addresses, and an operator reading the Fly log needs something to act on.
    console.warn(
      `[Cron/erasure-queue] ALERT breached=${summary.breached} ` +
        `warning=${summary.warning} unparseable=${summary.unparseable}`,
    );
    return NextResponse.json({ ok: true, alerted: true, ...summary });
  } catch (e) {
    const detail = e instanceof Error ? e.message : String(e);
    console.error("[Cron/erasure-queue] Unhandled:", detail);
    return NextResponse.json({ error: "Unhandled", detail }, { status: 500 });
  }
}
