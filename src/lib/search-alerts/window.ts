/**
 * Which listings does a search alert still owe its subscriber?
 *
 * WHY THIS IS A SEPARATE, PURE MODULE
 *
 * /api/cron/search-alerts used to answer that with a fixed lookback from
 * Date.now() — 1h, 24h or 7d depending on frequency — and never consulted
 * search_alerts.last_notified_at, which it wrote and nothing read. That has two
 * failure modes, and both are silent:
 *
 *   - a late or skipped run drops every listing published in the gap between
 *     the previous window's end and this one's start. Nothing retries it,
 *     because the next run looks back from ITS own now().
 *   - two runs inside one window send the same listings to the same people
 *     twice. A manual dispatch next to a scheduled run does exactly that.
 *
 * Neither surfaces in a log, a test, or a user complaint that anyone can act
 * on — the subscriber simply never hears about a house. So the arithmetic is
 * extracted here, as pure functions over an explicit `now`, and tested at its
 * boundaries. A function that reads the clock itself cannot be.
 *
 * THE MODEL
 *
 * last_notified_at becomes a HIGH-WATER MARK over listings.published_at, not a
 * record of when the job last ran. Each alert is owed every active listing
 * published after its own watermark. Send, then advance the watermark to the
 * newest listing actually sent. A run that sends nothing advances nothing, so
 * the next run picks up exactly where this one stopped.
 *
 * MIGRATING THE EXISTING COLUMN: none needed. The old code stored `now` at send
 * time, which is greater than or equal to the published_at of anything that
 * send covered. Read as a watermark it is therefore safe — at worst slightly
 * conservative for one cycle. (Moot in practice: search_alerts holds 0 rows.)
 */

export type AlertFrequency = "instant" | "daily" | "weekly";

/**
 * The lookback applied to an alert that has NEVER been notified.
 *
 * These are the exact values the old fixed-window code used, kept deliberately:
 * a brand-new alert therefore behaves precisely as it does today, and the only
 * behaviour this change alters is the one it is meant to alter.
 */
export const FIRST_RUN_LOOKBACK_MS: Record<AlertFrequency, number> = {
  instant: 60 * 60 * 1000,
  daily: 24 * 60 * 60 * 1000,
  weekly: 7 * 24 * 60 * 60 * 1000,
};

/**
 * How far back any alert may ever reach, regardless of its watermark.
 *
 * A DECISION, not a derivation — there is no measured quantity in this system
 * that implies 30 days. It exists so that an alert dormant for a year cannot
 * pull the entire catalogue into one query, and so the global fetch below has a
 * floor. Change it here; it is referenced nowhere else.
 */
export const MAX_CATCHUP_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * The most listings one digest may contain.
 *
 * Also a DECISION, not a derivation. The window alone cannot bound an email: a
 * busy week inside a 7-day window is still a busy week. When more than this
 * match, the OLDEST are sent first and the watermark advances only across what
 * was actually sent, so the remainder is delivered by the following runs rather
 * than dropped. Draining oldest-first is what makes the cap lossless; taking
 * the newest N and advancing to now() would silently discard the rest.
 */
export const MAX_LISTINGS_PER_DIGEST = 50;

export interface AlertWatermark {
  id: string;
  /** search_alerts.last_notified_at — null for an alert never notified. */
  last_notified_at?: string | null;
}

export interface WindowedListing {
  id: string;
  /** listings.published_at. A listing with no published_at is not publishable news. */
  published_at?: string | null;
}

/** Parse to epoch ms, or null if absent/unparseable. */
function ms(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : null;
}

/**
 * The exclusive lower bound for one alert: it is owed listings published
 * strictly after this instant.
 *
 * - never notified  → now - FIRST_RUN_LOOKBACK[frequency]
 * - notified before → its watermark, floored at now - MAX_CATCHUP_MS
 * - unparseable     → treated as never notified, which errs toward sending
 *   rather than toward silently skipping. A corrupt timestamp must not cost a
 *   subscriber the listing they signed up for.
 */
export function alertWindowStart(
  alert: AlertWatermark,
  frequency: AlertFrequency,
  now: Date,
): Date {
  const floor = now.getTime() - MAX_CATCHUP_MS;
  const mark = ms(alert.last_notified_at);
  if (mark === null) {
    return new Date(
      Math.max(now.getTime() - FIRST_RUN_LOOKBACK_MS[frequency], floor),
    );
  }
  return new Date(Math.max(mark, floor));
}

/**
 * The single lower bound for the one listings query that serves every alert.
 *
 * The earliest of all the per-alert bounds: fetching a superset once and
 * filtering per alert in memory costs one query instead of N, and the per-alert
 * bound is still what decides what each subscriber receives.
 */
export function globalFetchSince(
  alerts: AlertWatermark[],
  frequency: AlertFrequency,
  now: Date,
): Date {
  if (alerts.length === 0) {
    // No alerts: the caller should not query at all, but returning the
    // first-run bound keeps this total rather than throwing.
    return alertWindowStart({ id: "none" }, frequency, now);
  }
  return new Date(
    Math.min(
      ...alerts.map((a) => alertWindowStart(a, frequency, now).getTime()),
    ),
  );
}

export interface DigestSelection<L> {
  /** What to send, newest first — the order a reader wants. */
  listings: L[];
  /**
   * The watermark to store IF the send succeeds: the newest published_at
   * actually included. Null when nothing is being sent, in which case the
   * caller must not advance anything.
   */
  nextWatermark: string | null;
  /** Matching listings deliberately held back by the cap, for logging. */
  deferred: number;
}

/**
 * Choose what this alert receives now, and the watermark that covers it.
 *
 * `candidates` are the listings that already passed the alert's own criteria.
 * This applies only the time window and the size cap.
 */
export function selectDigest<L extends WindowedListing>(
  candidates: L[],
  windowStart: Date,
  cap: number = MAX_LISTINGS_PER_DIGEST,
): DigestSelection<L> {
  const after = windowStart.getTime();

  const eligible = candidates
    .map((l) => ({ l, t: ms(l.published_at) }))
    // A listing with no usable published_at cannot be placed in time, so it
    // cannot be windowed and is excluded. Including it would re-send it on
    // every single run forever, because no watermark can ever pass it.
    .filter((x): x is { l: L; t: number } => x.t !== null && x.t > after)
    // Ascending: the cap takes the OLDEST first so the remainder drains
    // forward on later runs instead of being skipped.
    .sort((a, b) => a.t - b.t);

  const taken = eligible.slice(0, Math.max(0, cap));
  if (taken.length === 0) {
    return { listings: [], nextWatermark: null, deferred: 0 };
  }

  const newest = taken[taken.length - 1];
  return {
    // Presented newest-first; selected oldest-first. The two orders serve
    // different purposes and both matter.
    listings: taken.map((x) => x.l).reverse(),
    nextWatermark: new Date(newest.t).toISOString(),
    deferred: eligible.length - taken.length,
  };
}
