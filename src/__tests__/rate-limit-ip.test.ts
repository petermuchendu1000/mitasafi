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
    expect(getClientIp(H({ "x-forwarded-for": `1.1.1.1, ${EDGE}` }))).toBe(
      EDGE,
    );
  });

  it("does not trust x-real-ip on its own", () => {
    expect(getClientIp(H({ "x-real-ip": "1.1.1.1" }))).toBe("unknown");
  });

  it("prefers the trusted x-forwarded-for hop over x-real-ip", () => {
    expect(
      getClientIp(H({ "x-real-ip": "1.1.1.1", "x-forwarded-for": EDGE })),
    ).toBe(EDGE);
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

// =============================================================================
// THE FLY DEFECT
// =============================================================================
// getClientIp() hard-coded TRUSTED_PROXY_HOPS = 1 and justified it with
// "Vercel (this repo's platform) and Fly.io each append exactly one entry".
// Production runs on Fly, and Fly appends TWO entries — measured 2026-11-21
// against mitasafi.com with hops=2 and no platform header: a probe carrying
// 0, 1 and 2 forged x-forwarded-for entries resolved this client's real
// address every time, cross-region (ord edge -> jnb machine) and same-region
// (probe issued from inside the jnb machine, fly-request-id ...-jnb). So with
// hops=1 the resolved value was 66.241.125.38 — an address assigned to the APP
// — identical for every caller on the internet. Every limiter was therefore a
// single GLOBAL bucket: bookingLimiter's 5-per-15-minutes was 5 bookings per
// 15 minutes for the entire platform, exhaustible by one actor.
//
// Not an evasion bug: an attacker cannot obtain a DIFFERENT bucket either.
// It is an availability bug, on the booking path.
// =============================================================================

const FLY_APP = "66.241.125.38"; // what hops=1 resolved for everyone, on Fly
const CLIENT = "41.90.64.10"; // a plausible Kenyan client address
const FORGED = "198.51.100.77"; // TEST-NET-2, used as the probe marker

describe("the hop count is configuration, not an assertion about the platform", () => {
  it("resolves the real client when the operator declares the measured hop count", () => {
    // Fly's chain is [client, app]; the trusted position is the SECOND from the right.
    expect(
      getClientIp(H({ "x-forwarded-for": `${CLIENT}, ${FLY_APP}` }), {
        TRUSTED_PROXY_HOPS: "2",
      }),
    ).toBe(CLIENT);
  });

  it("a forged prefix cannot shift the trusted position", () => {
    // Indexing from the right is immune to prepending while the platform's
    // contribution is constant — measured constant at 2 for 0, 1 and 2 entries.
    expect(
      getClientIp(
        H({ "x-forwarded-for": `${FORGED}, ${CLIENT}, ${FLY_APP}` }),
        {
          TRUSTED_PROXY_HOPS: "2",
        },
      ),
    ).toBe(CLIENT);
    expect(
      getClientIp(
        H({ "x-forwarded-for": `1.1.1.1, 2.2.2.2, ${CLIENT}, ${FLY_APP}` }),
        { TRUSTED_PROXY_HOPS: "2" },
      ),
    ).toBe(CLIENT);
  });

  it("distinct callers land in distinct buckets once the hop count is right", () => {
    const env = { TRUSTED_PROXY_HOPS: "2" };
    const a = getClientIp(
      H({ "x-forwarded-for": `41.90.64.10, ${FLY_APP}` }),
      env,
    );
    const b = getClientIp(
      H({ "x-forwarded-for": `197.232.1.5, ${FLY_APP}` }),
      env,
    );
    expect(a).not.toBe(b);
  });

  it("refuses rather than reading a forged position when the chain is shorter than the hop count", () => {
    // hops > entries means our edge did not write this chain. Returning the
    // prefix here would be the fail-open case; "unknown" is the safe answer.
    expect(
      getClientIp(H({ "x-forwarded-for": `${FORGED}, ${CLIENT}` }), {
        TRUSTED_PROXY_HOPS: "3",
      }),
    ).toBe("unknown");
  });

  it("falls back to the strictest hop count on nonsense configuration", () => {
    for (const raw of ["0", "-1", "abc", "2.5", "1e3", "999", ""]) {
      expect(
        getClientIp(H({ "x-forwarded-for": `${CLIENT}, ${FLY_APP}` }), {
          TRUSTED_PROXY_HOPS: raw,
        }),
      ).toBe(FLY_APP); // = default hops of 1, never a wider trust
    }
  });

  it("keeps a safe default when nothing is configured", () => {
    // Deliberately safe-but-useless rather than safe-looking: hops cannot
    // exceed what the platform appends, or the forged region becomes readable.
    expect(
      getClientIp(H({ "x-forwarded-for": `${CLIENT}, ${FLY_APP}` }), {}),
    ).toBe(FLY_APP);
  });
});

describe("a platform-written header is used only when the operator names it", () => {
  it("honours the named header over x-forwarded-for", () => {
    expect(
      getClientIp(H({ "fly-client-ip": CLIENT, "x-forwarded-for": FLY_APP }), {
        TRUSTED_CLIENT_IP_HEADER: "fly-client-ip",
      }),
    ).toBe(CLIENT);
  });

  it("ignores the very same header when it is not named", () => {
    // There is no default header: trustworthiness is a fact about the
    // deployment, not about this code. Defaulting it is how the payment path
    // was made bypassable.
    expect(
      getClientIp(H({ "fly-client-ip": CLIENT, "x-forwarded-for": FLY_APP })),
    ).toBe(FLY_APP);
  });

  it("ignores a named header carrying a list, since the platform writes one value", () => {
    expect(
      getClientIp(
        H({
          "fly-client-ip": `${FORGED}, ${CLIENT}`,
          "x-forwarded-for": `${CLIENT}, ${FLY_APP}`,
        }),
        { TRUSTED_CLIENT_IP_HEADER: "fly-client-ip", TRUSTED_PROXY_HOPS: "2" },
      ),
    ).toBe(CLIENT); // fell through to the x-forwarded-for path
  });

  it("normalises the named header the same way, so buckets stay stable", () => {
    const env = { TRUSTED_CLIENT_IP_HEADER: "fly-client-ip" };
    expect(getClientIp(H({ "fly-client-ip": `::ffff:${CLIENT}` }), env)).toBe(
      CLIENT,
    );
    expect(getClientIp(H({ "fly-client-ip": `${CLIENT}:51234` }), env)).toBe(
      CLIENT,
    );
  });

  it("falls through to x-forwarded-for when the named header is absent", () => {
    expect(
      getClientIp(H({ "x-forwarded-for": `${CLIENT}, ${FLY_APP}` }), {
        TRUSTED_CLIENT_IP_HEADER: "fly-client-ip",
        TRUSTED_PROXY_HOPS: "2",
      }),
    ).toBe(CLIENT);
  });

  it("buckets together when neither source yields anything", () => {
    expect(
      getClientIp(H({}), { TRUSTED_CLIENT_IP_HEADER: "fly-client-ip" }),
    ).toBe("unknown");
  });
});

describe("the evasion property", () => {
  it("gives the same bucket however the caller forges the prefix", () => {
    const a = getClientIp(H({ "x-forwarded-for": `1.1.1.1, ${EDGE}` }));
    const b = getClientIp(H({ "x-forwarded-for": `2.2.2.2, ${EDGE}` }));
    const c = getClientIp(
      H({ "x-forwarded-for": `9.9.9.9, 8.8.8.8, ${EDGE}` }),
    );
    expect(a).toBe(b);
    // A longer forged chain shifts the trusted index, so this one is refused
    // rather than silently attributed to the wrong caller.
    expect(c).toBe(EDGE);
  });
});
