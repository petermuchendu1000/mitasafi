/**
 * The erasure queue watchdog.
 *
 * Two things here can be wrong in a way nobody notices until a deadline has
 * already passed, and they are the reason this file exists:
 *
 *   1. the age thresholds. An off-by-one at 48h means reporting a broken
 *      promise an hour after it broke.
 *   2. the alert's contents. These are people who asked to be forgotten; an
 *      alert that mails their name around is the wrong shape, and nothing at
 *      runtime would ever complain about it.
 *
 * bucketQueue takes `now` as a parameter precisely so the boundaries are
 * testable; a function that read the clock itself could not be.
 */

import fs from "fs";
import path from "path";
import {
  bucketQueue,
  needsAlert,
  formatAlert,
  ERASURE_SLA_HOURS,
  ERASURE_WARN_HOURS,
  type ErasureQueueRow,
} from "@/lib/erasure/queue";

const NOW = new Date("2026-11-18T12:00:00.000Z");
const hoursAgo = (h: number) =>
  new Date(NOW.getTime() - h * 3_600_000).toISOString();

const row = (
  id: string,
  h: number | null,
  erased?: string,
): ErasureQueueRow => ({
  id,
  requestedAt: h === null ? null : hoursAgo(h),
  erasedAt: erased ?? null,
});

describe("the thresholds", () => {
  it("matches the promise the settings page makes", () => {
    // CustomerSettingsClient.tsx tells the user "within 48 hours". If that
    // number ever changes, this is the test that should stop the build.
    expect(ERASURE_SLA_HOURS).toBe(48);
    // and the warning must come BEFORE the promise, or it reports breaches
    // instead of preventing them
    expect(ERASURE_WARN_HOURS).toBeLessThan(ERASURE_SLA_HOURS);
  });

  it("is exact at the boundaries", () => {
    const b = bucketQueue(
      [row("a", 47), row("b", 48), row("c", 49), row("d", 23), row("e", 24)],
      NOW,
    );
    // 48 is spent, not nearly spent
    expect(b.breached.map((x) => x.id)).toEqual(["c", "b"]);
    expect(b.warning.map((x) => x.id)).toEqual(["a", "e"]);
    expect(b.fresh.map((x) => x.id)).toEqual(["d"]);
  });

  it("sorts worst-first, so triage reads top-down", () => {
    const b = bucketQueue(
      [row("young", 50), row("old", 200), row("mid", 72)],
      NOW,
    );
    expect(b.breached.map((x) => x.id)).toEqual(["old", "mid", "young"]);
  });
});

describe("what is and is not in the queue", () => {
  it("drops rows already erased, so a worked queue goes quiet", () => {
    const b = bucketQueue(
      [row("done", 200, "2026-11-17T00:00:00Z"), row("open", 200)],
      NOW,
    );
    expect(b.breached.map((x) => x.id)).toEqual(["open"]);
    expect(needsAlert(b)).toBe(true);
  });

  it("ignores accounts that never asked", () => {
    const b = bucketQueue([row("never", null)], NOW);
    expect(b.breached).toEqual([]);
    expect(b.warning).toEqual([]);
    expect(b.fresh).toEqual([]);
    expect(needsAlert(b)).toBe(false);
  });

  it("surfaces an unreadable date instead of silently dropping it", () => {
    // metadata is client-writable, so deletion_requested_at is whatever was
    // stored. A request with a broken timestamp is still a request; binning it
    // is how one gets missed forever.
    const b = bucketQueue([{ id: "bad", requestedAt: "not-a-date" }], NOW);
    expect(b.unparseable).toEqual(["bad"]);
    expect(needsAlert(b)).toBe(true);
  });

  it("stays quiet when everything is inside the window", () => {
    const b = bucketQueue([row("a", 1), row("b", 10)], NOW);
    expect(needsAlert(b)).toBe(false);
    expect(b.fresh).toHaveLength(2);
  });

  it("stays quiet on an empty queue", () => {
    expect(needsAlert(bucketQueue([], NOW))).toBe(false);
  });
});

describe("the alert carries no personal data", () => {
  const buckets = bucketQueue(
    [row("11111111-1111-4111-8111-111111111111", 100)],
    NOW,
  );

  it("contains the id and the age, and nothing identifying", () => {
    const m = formatAlert(buckets);
    expect(m.text).toContain("11111111-1111-4111-8111-111111111111");
    expect(m.text).toContain("100h");
  });

  it("cannot contain a name or an address, because it is never given one", () => {
    // Structural, not a string search: ErasureQueueRow has no field for either,
    // so formatAlert has nothing to leak. This asserts the shape stays that
    // way — adding `email` to the row type would make this fail to compile the
    // intent, and the route-level test below keeps the query narrow too.
    const src = fs.readFileSync(
      path.join(process.cwd(), "src/lib/erasure/queue.ts"),
      "utf8",
    );
    const iface = /export interface ErasureQueueRow \{([\s\S]*?)\n\}/.exec(src);
    expect(iface).not.toBeNull();
    expect(iface![1]).not.toMatch(/\b(email|name|full_name|phone)\b/);
  });

  it("the route never selects a name or an email from profiles", () => {
    // The cheapest way to be sure the alert has no PII is for the handler
    // never to load any. If this select ever widens, that guarantee is gone.
    const route = fs.readFileSync(
      path.join(process.cwd(), "src/app/api/cron/erasure-queue/route.ts"),
      "utf8",
    );
    const sel = /\.select\(\s*"([^"]+)"\s*\)/.exec(route);
    expect(sel).not.toBeNull();
    expect(sel![1]).toBe("id, metadata");
  });

  it("says why it is terse, so nobody 'fixes' it by adding emails", () => {
    const m = formatAlert(buckets);
    expect(m.text).toMatch(/asked to be forgotten/i);
  });
});

describe("the alert is triageable from the subject line", () => {
  it("leads with a breach when there is one", () => {
    const m = formatAlert(bucketQueue([row("a", 100), row("b", 30)], NOW));
    expect(m.subject).toMatch(/1 erasure request PAST the 48h promise/);
  });

  it("pluralises", () => {
    const m = formatAlert(bucketQueue([row("a", 100), row("b", 90)], NOW));
    expect(m.subject).toMatch(/2 erasure requests PAST/);
  });

  it("reports approaching requests when nothing has breached yet", () => {
    const m = formatAlert(bucketQueue([row("a", 30)], NOW));
    expect(m.subject).toMatch(/approaching the 48h promise/);
    expect(m.subject).not.toMatch(/PAST/);
  });

  it("names the unreadable-date case rather than calling it 'approaching'", () => {
    const m = formatAlert(
      bucketQueue([{ id: "bad", requestedAt: "nope" }], NOW),
    );
    expect(m.subject).toMatch(/unreadable date/);
  });

  it("tells the operator the exact command to run", () => {
    const m = formatAlert(bucketQueue([row("a", 100)], NOW));
    expect(m.text).toContain("scripts/ops/erase-account.mjs --user-id");
    expect(m.text).toContain("--execute");
  });

  it("escapes the html body", () => {
    const m = formatAlert(bucketQueue([row("<script>", 100)], NOW));
    expect(m.html).not.toContain("<script>");
    expect(m.html).toContain("&lt;script&gt;");
  });
});

describe("the watchdog fails closed and fails loudly", () => {
  const route = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/cron/erasure-queue/route.ts"),
    "utf8",
  );
  const workflow = fs.readFileSync(
    path.join(process.cwd(), ".github/workflows/erasure-queue-alert.yml"),
    "utf8",
  );

  it("reuses the shared cron guard rather than re-implementing it", () => {
    // src/__tests__/cron-auth.test.ts exists because a cron route once failed
    // OPEN with CRON_SECRET unset. A second copy of that predicate is a second
    // chance to get it wrong.
    expect(route).toMatch(
      /import \{ authorizeCronRequest \} from "@\/lib\/security\/cron-auth"/,
    );
    expect(route).toMatch(/if \(!auth\.authorized\)/);
    expect(route).toMatch(/status: 401/);
  });

  it("returns 500 when the alert could not be sent", () => {
    // A watchdog that cannot deliver is not working, and a 200 would hide that
    // behind a green workflow run.
    expect(route).toMatch(/if \(!sent\.success\)/);
    expect(route).toMatch(/sendError/);
  });

  it("is scheduled by GitHub Actions, not by vercel.json", () => {
    // vercel.json's crons do not run: this app deploys to Fly and Fly does not
    // read vercel.json. Declaring the watchdog there would have produced one
    // that never barks.
    expect(workflow).toMatch(/cron: "17 \* \* \* \*"/);
    const vercel = fs.readFileSync(
      path.join(process.cwd(), "vercel.json"),
      "utf8",
    );
    expect(vercel).not.toMatch(/erasure-queue/);
  });

  it("the workflow fails when its secrets are missing", () => {
    expect(workflow).toMatch(/SITE_URL secret is not set/);
    expect(workflow).toMatch(/CRON_SECRET secret is not set/);
    expect(workflow).toMatch(/exit 1/);
  });

  it("the workflow fails on a non-200, so a dead endpoint is visible", () => {
    expect(workflow).toMatch(/Watchdog endpoint returned HTTP/);
  });
});

describe("this suite can fail", () => {
  it("the boundary test would notice a > instead of a >=", () => {
    // Reproduce the off-by-one and prove the assertion above catches it.
    const strictly = bucketQueue([row("b", 48)], NOW, { slaHours: 49 });
    expect(strictly.breached).toHaveLength(0);
    expect(bucketQueue([row("b", 48)], NOW).breached).toHaveLength(1);
  });

  it("the PII check would notice an email field", () => {
    const fake =
      "export interface ErasureQueueRow {\n  id: string;\n  email: string;\n}";
    const iface = /export interface ErasureQueueRow \{([\s\S]*?)\n\}/.exec(
      fake,
    );
    expect(iface![1]).toMatch(/\bemail\b/);
  });
});
