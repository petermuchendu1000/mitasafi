/**
 * The erasure queue, and when it has been left too long.
 *
 * WHY THIS EXISTS
 *
 * src/app/dashboard/settings/actions.ts lets a user request deletion, and the
 * settings page tells them "our team will process your request within 48
 * hours". 20260353000000_account_erasure.sql made it possible to discharge
 * one; scripts/ops/erase-account.mjs made it practical. None of that makes
 * anyone NOTICE a request — a late one surfaces only if an operator happens to
 * run `--list`. A promise whose only alarm is someone remembering is not a
 * promise.
 *
 * This module is the alarm's logic, deliberately separated from the route that
 * runs it: bucketing by age is the part that can be wrong in a way nobody sees
 * until a deadline has already passed, so it is a pure function over data and
 * an explicit `now`, unit-tested at its boundaries. The route supplies the rows
 * and sends the mail.
 *
 * THE ALERT CARRIES NO PERSONAL DATA
 *
 * Profile IDs and ages only — never the email address or the name of the
 * person who asked to be erased. Three reasons, in order:
 *
 *   1. It would copy their identity into an inbox, and a mailbox is the one
 *      place nobody will remember to erase it from later.
 *   2. These are people who have explicitly asked to be forgotten. Mailing
 *      their name around to prompt the forgetting is the wrong shape.
 *   3. It is the same decision the audit row makes, for the same reason.
 *
 * The operator pastes the id into
 *   node scripts/ops/erase-account.mjs --user-id <id> --reason "..."
 * and sees the detail there, against the database, where it already is.
 */

/** The promise made on the settings page, in hours. Not a tunable. */
export const ERASURE_SLA_HOURS = 48;

/**
 * When to start nagging. Earlier than the promise on purpose: an alarm that
 * fires at the deadline reports a breach rather than preventing one.
 */
export const ERASURE_WARN_HOURS = 24;

export interface ErasureQueueRow {
  id: string;
  /** metadata.deletion_requested_at, as stored. May be absent or unparseable. */
  requestedAt: string | null | undefined;
  /** metadata.erased_at — present once discharged. */
  erasedAt?: string | null;
}

export interface QueueEntry {
  id: string;
  requestedAt: string;
  ageHours: number;
}

export interface QueueBuckets {
  /** Past the 48-hour promise. The promise is already broken. */
  breached: QueueEntry[];
  /** Past the warning threshold, not yet past the promise. */
  warning: QueueEntry[];
  /** Pending, still comfortably inside the window. */
  fresh: QueueEntry[];
  /**
   * Rows whose requested-at could not be parsed. Surfaced rather than dropped:
   * a request with a broken timestamp is still a request, and silently binning
   * it is how one gets missed indefinitely.
   */
  unparseable: string[];
}

/** Hours between two instants, floored. */
function hoursSince(iso: string, now: Date): number | null {
  const t = Date.parse(iso);
  if (!Number.isFinite(t)) return null;
  return Math.floor((now.getTime() - t) / 3_600_000);
}

/**
 * Split pending erasure requests by how overdue they are.
 *
 * `now` is a parameter, not `new Date()` inside: a function that reads the
 * clock itself cannot be tested at its boundaries, and the boundaries are the
 * entire content of this function.
 *
 * Already-erased rows are dropped — `erasedAt` is set by erase_account and is
 * what makes this idempotent against a queue that is being worked.
 */
export function bucketQueue(
  rows: ErasureQueueRow[],
  now: Date = new Date(),
  opts: { warnHours?: number; slaHours?: number } = {},
): QueueBuckets {
  const warnHours = opts.warnHours ?? ERASURE_WARN_HOURS;
  const slaHours = opts.slaHours ?? ERASURE_SLA_HOURS;

  const out: QueueBuckets = {
    breached: [],
    warning: [],
    fresh: [],
    unparseable: [],
  };

  for (const r of rows) {
    if (r.erasedAt) continue;
    if (!r.requestedAt) continue; // never asked; not in the queue at all

    const age = hoursSince(r.requestedAt, now);
    if (age === null) {
      out.unparseable.push(r.id);
      continue;
    }

    const entry: QueueEntry = {
      id: r.id,
      requestedAt: r.requestedAt,
      ageHours: age,
    };
    // `>=` at both thresholds: at exactly 48h the promise is spent, not
    // nearly spent. Tested at 47/48/49 precisely because an off-by-one here
    // means reporting a breach a whole hour after it happened.
    if (age >= slaHours) out.breached.push(entry);
    else if (age >= warnHours) out.warning.push(entry);
    else out.fresh.push(entry);
  }

  const byAge = (a: QueueEntry, b: QueueEntry) => b.ageHours - a.ageHours;
  out.breached.sort(byAge);
  out.warning.sort(byAge);
  out.fresh.sort(byAge);
  return out;
}

/** Is there anything worth waking a human for? */
export function needsAlert(b: QueueBuckets): boolean {
  return (
    b.breached.length > 0 || b.warning.length > 0 || b.unparseable.length > 0
  );
}

export interface AlertMessage {
  subject: string;
  text: string;
  html: string;
}

/**
 * Compose the alert. IDs and ages only — see the module header.
 *
 * The subject leads with the worst case so it is triageable from a phone
 * notification without opening anything.
 */
export function formatAlert(
  b: QueueBuckets,
  slaHours = ERASURE_SLA_HOURS,
): AlertMessage {
  const subject =
    b.breached.length > 0
      ? `[MITASAFI] ${b.breached.length} erasure request${b.breached.length === 1 ? "" : "s"} PAST the ${slaHours}h promise`
      : b.unparseable.length > 0 && b.warning.length === 0
        ? `[MITASAFI] ${b.unparseable.length} erasure request${b.unparseable.length === 1 ? "" : "s"} with an unreadable date`
        : `[MITASAFI] ${b.warning.length} erasure request${b.warning.length === 1 ? "" : "s"} approaching the ${slaHours}h promise`;

  const lines: string[] = [];
  const push = (s = "") => lines.push(s);

  push(`Account erasure queue — ${new Date().toISOString().slice(0, 16)}Z`);
  push();

  if (b.breached.length) {
    push(`PAST ${slaHours}h — the promise to these people is already broken:`);
    for (const e of b.breached) push(`  ${e.id}   ${e.ageHours}h`);
    push();
  }
  if (b.warning.length) {
    push(`Approaching ${slaHours}h:`);
    for (const e of b.warning) push(`  ${e.id}   ${e.ageHours}h`);
    push();
  }
  if (b.unparseable.length) {
    push(`Unreadable deletion_requested_at — still a request, still owed:`);
    for (const id of b.unparseable) push(`  ${id}`);
    push();
  }
  if (b.fresh.length) {
    push(`Also pending, inside the window: ${b.fresh.length}`);
    push();
  }

  push("Act on one with:");
  push('  node scripts/ops/erase-account.mjs --user-id <id> --reason "..."');
  push("  (add --execute once the preview looks right)");
  push();
  push(
    "This alert deliberately carries no names or email addresses: these are " +
      "people who asked to be forgotten. The ids resolve in the tool above.",
  );

  const text = lines.join("\n");
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const html =
    `<pre style="font:13px/1.5 ui-monospace,Menlo,monospace;color:#1f2933;` +
    `background:#f6f8fa;padding:16px;border-radius:8px;white-space:pre-wrap">` +
    `${esc(text)}</pre>`;

  return { subject, text, html };
}
