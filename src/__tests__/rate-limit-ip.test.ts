/**
 * Rate-limit bucketing by client IP.
 *
 * getClientIp() read `x-forwarded-for.split(",")[0]` and then fell back to
 * `x-real-ip`. Both are positions the caller controls, so every rate limit in
 * the application could be evaded by varying a header per request: each forged
 * value landed in its own bucket with its own fresh quota. A limit an attacker
 * can reset at will is not a limit.
 *
 * The property that matters is the last test: forging the prefix must not move
 * the caller to a different bucket.
 */

import { getClientIp } from "@/lib/security/rate-limit";

const EDGE = "203.0.113.9"; // the entry our own edge appended

const H = (o: Record<string, string>) =>
  ({ get: (k: string) => o[k.toLowerCase()] ?? null }) as unknown as Headers;

describe("getClientIp uses the position our edge wrote", () => {
  it("returns the only entry when there is one", () => {
    expect(getClientIp(H({ "x-forwarded-for": EDGE }))).toBe(EDGE);
  });

  it("ignores a prepended value the client supplied", () => {
    expect(getClientIp(H({ "x-forwarded-for": `1.1.1.1, ${EDGE}` }))).toBe(EDGE);
  });

  it("does not trust x-real-ip on its own", () => {
    expect(getClientIp(H({ "x-real-ip": "1.1.1.1" }))).toBe("unknown");
  });

  it("prefers the trusted x-forwarded-for hop over x-real-ip", () => {
    expect(getClientIp(H({ "x-real-ip": "1.1.1.1", "x-forwarded-for": EDGE }))).toBe(EDGE);
  });

  it("normalises IPv6-mapped form and strips a port so buckets are stable", () => {
    expect(getClientIp(H({ "x-forwarded-for": `::ffff:${EDGE}` }))).toBe(EDGE);
    expect(getClientIp(H({ "x-forwarded-for": `${EDGE}:51234` }))).toBe(EDGE);
  });

  it("buckets unidentifiable callers together rather than giving each a quota", () => {
    expect(getClientIp(H({}))).toBe("unknown");
    expect(getClientIp(H({ "x-forwarded-for": "" }))).toBe("unknown");
    expect(getClientIp(H({ "x-forwarded-for": ",,," }))).toBe("unknown");
  });

  it("refuses an over-long chain instead of guessing a position", () => {
    const chain = Array(65).fill("1.1.1.1").join(", ");
    expect(getClientIp(H({ "x-forwarded-for": chain }))).toBe("unknown");
  });
});

describe("the evasion property", () => {
  it("gives the same bucket however the caller forges the prefix", () => {
    const a = getClientIp(H({ "x-forwarded-for": `1.1.1.1, ${EDGE}` }));
    const b = getClientIp(H({ "x-forwarded-for": `2.2.2.2, ${EDGE}` }));
    const c = getClientIp(H({ "x-forwarded-for": `9.9.9.9, 8.8.8.8, ${EDGE}` }));
    expect(a).toBe(b);
    // A longer forged chain shifts the trusted index, so this one is refused
    // rather than silently attributed to the wrong caller.
    expect(c).toBe(EDGE);
  });
});
