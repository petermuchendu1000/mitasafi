/**
 * Per-alert windowing for search alerts.
 *
 * The old handler used one fixed lookback from Date.now() for everybody. Its
 * two failure modes were silent: a late run dropped the gap, and a repeated run
 * duplicated the digest. Neither shows up in a log or a complaint anyone can
 * act on — the subscriber just never hears about a house.
 *
 * So the whole content of this change is boundary arithmetic, and these tests
 * sit exactly on the boundaries. `now` is injected for that reason.
 *
 * The cases that would have shipped the bug back:
 *   W4  — strictly-greater, not greater-or-equal. `>=` re-sends the boundary
 *         listing on every run forever.
 *   W12 — the cap takes the OLDEST first. Taking the newest N and advancing to
 *         now() silently discards the remainder, which is the original defect
 *         wearing a different hat.
 *   W14 — the watermark is the newest listing SENT, never now(). Using now()
 *         consumes listings that were never in the email.
 */

import {
  alertWindowStart,
  globalFetchSince,
  selectDigest,
  FIRST_RUN_LOOKBACK_MS,
  MAX_CATCHUP_MS,
  MAX_LISTINGS_PER_DIGEST,
  type AlertFrequency,
} from "@/lib/search-alerts/window";

const NOW = new Date("2026-11-18T12:00:00.000Z");
const at = (msAgo: number) => new Date(NOW.getTime() - msAgo).toISOString();
const H = 60 * 60 * 1000;
const D = 24 * H;

const alert = (id: string, last_notified_at?: string | null) => ({
  id,
  last_notified_at: last_notified_at ?? null,
});
const listing = (id: string, published_at: string | null) => ({
  id,
  published_at,
});

describe("alertWindowStart", () => {
  it("W1 falls back to the frequency's lookback when never notified", () => {
    // Deliberately the same numbers the old fixed-window code used, so a
    // brand-new alert behaves exactly as it does today and this change alters
    // only what it is meant to alter.
    for (const f of ["instant", "daily", "weekly"] as AlertFrequency[]) {
      expect(alertWindowStart(alert("a"), f, NOW).getTime()).toBe(
        NOW.getTime() - FIRST_RUN_LOOKBACK_MS[f],
      );
    }
    expect(FIRST_RUN_LOOKBACK_MS.instant).toBe(H);
    expect(FIRST_RUN_LOOKBACK_MS.daily).toBe(24 * H);
    expect(FIRST_RUN_LOOKBACK_MS.weekly).toBe(7 * D);
  });

  it("W2 uses the alert's own watermark once it has one", () => {
    const mark = at(3 * H);
    expect(
      alertWindowStart(alert("a", mark), "instant", NOW).toISOString(),
    ).toBe(mark);
  });

  it("W3 is the whole point: a late run reaches back further, not further forward", () => {
    // The alert was last notified 5 hours ago on an HOURLY schedule — four
    // ticks were missed. The old code would have looked back 1 hour and lost
    // the other four hours of listings permanently.
    const start = alertWindowStart(alert("a", at(5 * H)), "instant", NOW);
    expect(NOW.getTime() - start.getTime()).toBe(5 * H);
    expect(start.getTime()).toBeLessThan(
      NOW.getTime() - FIRST_RUN_LOOKBACK_MS.instant,
    );
  });

  it("W4 floors a dormant alert at MAX_CATCHUP_MS", () => {
    const start = alertWindowStart(alert("a", at(365 * D)), "weekly", NOW);
    expect(start.getTime()).toBe(NOW.getTime() - MAX_CATCHUP_MS);
  });

  it("W5 treats an unparseable watermark as never-notified, erring toward sending", () => {
    // metadata-ish columns get corrupted. Erring the other way costs a
    // subscriber the listing they signed up for, which is the worse failure.
    const start = alertWindowStart(alert("a", "not-a-date"), "daily", NOW);
    expect(start.getTime()).toBe(NOW.getTime() - FIRST_RUN_LOOKBACK_MS.daily);
  });
});

describe("globalFetchSince", () => {
  it("W6 is the earliest bound across all alerts, so one query serves them all", () => {
    const since = globalFetchSince(
      [alert("a", at(2 * H)), alert("b", at(9 * H)), alert("c", at(H))],
      "instant",
      NOW,
    );
    expect(since.toISOString()).toBe(at(9 * H));
  });

  it("W7 accounts for a never-notified alert among notified ones", () => {
    const since = globalFetchSince(
      [alert("a", at(10 * 60 * 1000)), alert("fresh")],
      "instant",
      NOW,
    );
    // the never-notified alert reaches back a full hour; the other only 10m
    expect(since.getTime()).toBe(NOW.getTime() - H);
  });

  it("W8 is total on an empty list rather than throwing", () => {
    expect(() => globalFetchSince([], "daily", NOW)).not.toThrow();
  });
});

describe("selectDigest", () => {
  const since = new Date(NOW.getTime() - 6 * H);

  it("W9 takes only listings published STRICTLY after the watermark", () => {
    const boundary = since.toISOString();
    const d = selectDigest(
      [listing("on-boundary", boundary), listing("after", at(2 * H))],
      since,
    );
    // `>=` here would re-send the boundary listing on every run forever,
    // because the watermark can never move past it.
    expect(d.listings.map((l) => l.id)).toEqual(["after"]);
  });

  it("W10 excludes a listing with no published_at", () => {
    // It cannot be placed in time, so no watermark can ever pass it; including
    // it would mean re-sending it on every run for ever.
    const d = selectDigest(
      [listing("ghost", null), listing("real", at(H))],
      since,
    );
    expect(d.listings.map((l) => l.id)).toEqual(["real"]);
  });

  it("W11 presents newest first", () => {
    const d = selectDigest(
      [
        listing("old", at(5 * H)),
        listing("new", at(H)),
        listing("mid", at(3 * H)),
      ],
      since,
    );
    expect(d.listings.map((l) => l.id)).toEqual(["new", "mid", "old"]);
  });

  it("W12 the cap takes the OLDEST, so the remainder drains forward", () => {
    // Taking the newest N and advancing to now() would discard the older ones
    // silently — the original defect in a new costume.
    const many = Array.from({ length: 5 }, (_, i) =>
      listing(`l${i}`, at((5 - i) * H)),
    ); // l0 oldest .. l4 newest
    const d = selectDigest(many, since, 2);
    expect(d.listings.map((l) => l.id).sort()).toEqual(["l0", "l1"]);
    expect(d.deferred).toBe(3);
  });

  it("W13 a capped run's remainder is picked up by the next run", () => {
    const many = Array.from({ length: 5 }, (_, i) =>
      listing(`l${i}`, at((5 - i) * H)),
    );
    const first = selectDigest(many, since, 2);
    const second = selectDigest(many, new Date(first.nextWatermark!), 2);
    const third = selectDigest(many, new Date(second.nextWatermark!), 2);
    const delivered = [
      ...first.listings,
      ...second.listings,
      ...third.listings,
    ].map((l) => l.id);
    // every listing exactly once, nothing lost, nothing duplicated
    expect(delivered.sort()).toEqual(["l0", "l1", "l2", "l3", "l4"]);
    expect(new Set(delivered).size).toBe(5);
  });

  it("W14 the watermark is the newest listing SENT, never now()", () => {
    const d = selectDigest(
      [listing("a", at(4 * H)), listing("b", at(2 * H))],
      since,
    );
    expect(d.nextWatermark).toBe(at(2 * H));
    expect(d.nextWatermark).not.toBe(NOW.toISOString());
  });

  it("W15 a re-run after a successful send is a no-op", () => {
    const candidates = [listing("a", at(4 * H)), listing("b", at(2 * H))];
    const first = selectDigest(candidates, since);
    const rerun = selectDigest(candidates, new Date(first.nextWatermark!));
    expect(rerun.listings).toEqual([]);
    expect(rerun.nextWatermark).toBeNull();
  });

  it("W16 sends nothing and advances nothing when there is nothing", () => {
    const d = selectDigest([], since);
    expect(d.listings).toEqual([]);
    expect(d.nextWatermark).toBeNull();
    expect(d.deferred).toBe(0);
  });

  it("W17b the cap never splits a millisecond", () => {
    // Postgres keeps microseconds; the watermark is an ISO string and keeps
    // milliseconds. Two listings inside the same millisecond are therefore
    // indistinguishable here, so a cap falling between them would advance the
    // watermark past the second one and lose it on every later run.
    //
    // Found by running the real handler against seeded production rows and
    // reproducing it as a unit: with cap 1 the delivered set was ["a","c"].
    const T = Date.parse("2026-11-18T11:00:00.500Z");
    const L = (id: string, t: number) => ({
      id,
      published_at: new Date(t).toISOString(),
    });
    const cands = [L("a", T), L("b", T), L("c", T + 1000)];

    const first = selectDigest(cands, new Date(T - 1000), 1);
    // cap is 1, but the tie group is taken whole rather than split
    expect(first.listings.map((l) => l.id).sort()).toEqual(["a", "b"]);

    const second = selectDigest(cands, new Date(first.nextWatermark!), 1);
    const delivered = [...first.listings, ...second.listings].map((l) => l.id);
    expect(delivered.sort()).toEqual(["a", "b", "c"]);
    expect(new Set(delivered).size).toBe(3);
  });

  it("W17 the default cap is the exported constant", () => {
    const many = Array.from({ length: MAX_LISTINGS_PER_DIGEST + 7 }, (_, i) =>
      listing(`l${i}`, at(5 * H - i * 1000)),
    );
    const d = selectDigest(many, since);
    expect(d.listings).toHaveLength(MAX_LISTINGS_PER_DIGEST);
    expect(d.deferred).toBe(7);
  });
});

describe("the handler wires the watermark correctly", () => {
  const fs = require("fs") as typeof import("fs");
  const path = require("path") as typeof import("path");
  const route = fs.readFileSync(
    path.join(process.cwd(), "src/app/api/cron/search-alerts/route.ts"),
    "utf8",
  );

  it("W18 advances only on a delivered email", () => {
    // The pre-change code ran this update unconditionally. As a watermark that
    // turns a transient Resend failure into permanent silent loss.
    expect(route).toMatch(/if \(!result\.success\)[\s\S]{0,400}?continue;/);
    const failIdx = route.indexOf("if (!result.success)");
    const updIdx = route.indexOf('.from("search_alerts")\n        .update(');
    expect(failIdx).toBeGreaterThan(-1);
    expect(updIdx).toBeGreaterThan(failIdx);
  });

  it("W19 stores the digest's watermark, not now()", () => {
    expect(route).toMatch(/last_notified_at: digest\.nextWatermark/);
    expect(route).not.toMatch(/last_notified_at: now\.toISOString\(\)/);
  });

  it("W20 queries listings with gt, not gte", () => {
    expect(route).toMatch(/\.gt\("published_at", sinceDate\.toISOString\(\)\)/);
    expect(route).not.toMatch(/\.gte\("published_at"/);
  });

  it("W21 skips notify_email=false without consuming its window", () => {
    expect(route).toMatch(
      /if \(!alert\.notify_email \|\| !alert\.email\) \{\s*continue;/,
    );
  });

  it("W22 fetches alerts before listings, because alerts decide the window", () => {
    expect(route.indexOf('.from("search_alerts")')).toBeLessThan(
      route.indexOf('.from("listings")'),
    );
  });
});

describe("this suite can fail", () => {
  it("W23 the strictly-greater check would catch a >= regression", () => {
    const since = new Date(NOW.getTime() - 6 * H);
    const boundary = since.toISOString();
    // simulate the regression: a filter using >=
    const regressed = [listing("on-boundary", boundary)].filter(
      (l) => Date.parse(l.published_at!) >= since.getTime(),
    );
    expect(regressed).toHaveLength(1); // the bug would include it
    expect(
      selectDigest([listing("on-boundary", boundary)], since).listings,
    ).toHaveLength(0);
  });

  it("W24 the oldest-first check would catch a newest-first cap", () => {
    const many = Array.from({ length: 3 }, (_, i) =>
      listing(`l${i}`, at((3 - i) * H)),
    );
    const correct = selectDigest(many, new Date(NOW.getTime() - 6 * H), 1);
    expect(correct.listings.map((l) => l.id)).toEqual(["l0"]); // oldest
    expect(correct.listings.map((l) => l.id)).not.toEqual(["l2"]); // not newest
  });
});
