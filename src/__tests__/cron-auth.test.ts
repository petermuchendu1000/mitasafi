/**
 * Regression tests for cron request authorization.
 *
 * Guards a verified production exposure: GET /api/cron/search-alerts was
 * callable by anyone on the internet. The guard failed OPEN when CRON_SECRET
 * was unset -- `if (!cronSecret) return true` -- and CRON_SECRET was unset on
 * the production Fly app. An unauthenticated request returned HTTP 200.
 *
 * Past that guard the handler sends email via sendSearchAlertNotification and
 * UPDATES search_alerts through the service-role client, which bypasses RLS.
 *
 * Which of the two allow-branches served it was established, not assumed:
 * production emits Strict-Transport-Security, which src/proxy.ts:48-50 sets
 * only when NODE_ENV === "production", so the development bypass was not the
 * one in play -- the missing-secret branch was.
 *
 * These import the REAL implementation from @/lib/security/cron-auth, which
 * the route also uses. Re-implementing the predicate here would make every
 * assertion tautological; see src/__tests__/route-protection.test.ts for the
 * time that actually happened in this repo.
 *
 * The central property, which no configuration may weaken:
 *   authorizeCronRequest() MUST NOT return authorized:true without having
 *   compared a configured secret against the presented bearer token.
 */
import {
  authorizeCronRequest,
  type HeaderReader,
} from "@/lib/security/cron-auth";

/** A Headers-like stub. Real Headers.get is case-insensitive, so this is too. */
function headers(map: Record<string, string> = {}): HeaderReader {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(map)) lower[k.toLowerCase()] = v;
  return { get: (name: string) => lower[name.toLowerCase()] ?? null };
}

const SECRET = "test-cron-secret-0123456789abcdef";

describe("authorizeCronRequest — fails closed", () => {
  it("DENIES the exact reported failure: no credential, no secret configured", () => {
    // This is EV-030 reproduced as a unit: production had no CRON_SECRET and an
    // unauthenticated GET returned 200.
    const r = authorizeCronRequest(headers(), { NODE_ENV: "production" });
    expect(r.authorized).toBe(false);
  });

  it("DENIES when no secret is configured even with a bearer token presented", () => {
    const r = authorizeCronRequest(
      headers({ authorization: `Bearer ${SECRET}` }),
      { NODE_ENV: "production" },
    );
    expect(r.authorized).toBe(false);
  });

  it("DENIES when CRON_SECRET is the empty string", () => {
    const r = authorizeCronRequest(headers(), {
      NODE_ENV: "production",
      CRON_SECRET: "",
    });
    expect(r.authorized).toBe(false);
  });

  it("DENIES an empty-string secret against a bare 'Bearer ' header", () => {
    // Boundary: `Bearer ${""}` === "Bearer ", so an empty secret plus this
    // header would string-match. An empty secret must never authorize.
    const r = authorizeCronRequest(headers({ authorization: "Bearer " }), {
      NODE_ENV: "production",
      CRON_SECRET: "",
    });
    expect(r.authorized).toBe(false);
  });

  it("DENIES when NODE_ENV is development and no secret is configured", () => {
    // The development bypass was not what served the production 200, but it is
    // the same defect class: authorized:true without comparing a secret. A
    // staging or preview deploy with NODE_ENV unset or "development" would
    // reopen the hole. The repo has been burned by exactly this shape before --
    // see mpesa-config.ts:255-274, where a merely-defaulted env value could
    // weaken an IP check.
    const r = authorizeCronRequest(headers(), { NODE_ENV: "development" });
    expect(r.authorized).toBe(false);
  });

  it("DENIES when NODE_ENV is absent entirely and no secret is configured", () => {
    const r = authorizeCronRequest(headers(), {});
    expect(r.authorized).toBe(false);
  });

  it("never returns authorized:true for ANY env shape lacking a secret", () => {
    const envs: Record<string, string | undefined>[] = [
      {},
      { NODE_ENV: "development" },
      { NODE_ENV: "production" },
      { NODE_ENV: "test" },
      { CRON_SECRET: "" },
      { NODE_ENV: "development", CRON_SECRET: "" },
      { NODE_ENV: undefined, CRON_SECRET: undefined },
    ];
    for (const env of envs) {
      for (const h of [
        headers(),
        headers({ authorization: "Bearer anything" }),
      ]) {
        expect(authorizeCronRequest(h, env).authorized).toBe(false);
      }
    }
  });
});

describe("authorizeCronRequest — authorizes only an exact bearer match", () => {
  const env = { NODE_ENV: "production", CRON_SECRET: SECRET };

  it("ALLOWS the correct bearer token (happy path)", () => {
    const r = authorizeCronRequest(
      headers({ authorization: `Bearer ${SECRET}` }),
      env,
    );
    expect(r.authorized).toBe(true);
  });

  it("ALLOWS the correct bearer token in development too", () => {
    // Local development still works -- it just needs CRON_SECRET in .env.local,
    // rather than being waved through.
    const r = authorizeCronRequest(
      headers({ authorization: `Bearer ${SECRET}` }),
      {
        NODE_ENV: "development",
        CRON_SECRET: SECRET,
      },
    );
    expect(r.authorized).toBe(true);
  });

  it("DENIES a wrong token", () => {
    expect(
      authorizeCronRequest(
        headers({ authorization: "Bearer wrong-token" }),
        env,
      ).authorized,
    ).toBe(false);
  });

  it("DENIES a missing Authorization header", () => {
    expect(authorizeCronRequest(headers(), env).authorized).toBe(false);
  });

  it("DENIES the raw secret without the Bearer scheme", () => {
    expect(
      authorizeCronRequest(headers({ authorization: SECRET }), env).authorized,
    ).toBe(false);
  });

  it("DENIES a lowercase 'bearer' scheme", () => {
    expect(
      authorizeCronRequest(headers({ authorization: `bearer ${SECRET}` }), env)
        .authorized,
    ).toBe(false);
  });

  it("DENIES a token that merely starts with the secret", () => {
    expect(
      authorizeCronRequest(
        headers({ authorization: `Bearer ${SECRET}extra` }),
        env,
      ).authorized,
    ).toBe(false);
  });

  it("DENIES a token that is a prefix of the secret", () => {
    expect(
      authorizeCronRequest(
        headers({ authorization: `Bearer ${SECRET.slice(0, -1)}` }),
        env,
      ).authorized,
    ).toBe(false);
  });

  it("is case-insensitive about the HEADER NAME, as real Headers are", () => {
    expect(
      authorizeCronRequest(headers({ Authorization: `Bearer ${SECRET}` }), env)
        .authorized,
    ).toBe(true);
  });

  it("reports a machine-readable reason in every case", () => {
    expect(authorizeCronRequest(headers(), {}).reason).toEqual(
      expect.any(String),
    );
    expect(
      authorizeCronRequest(headers({ authorization: `Bearer ${SECRET}` }), env)
        .reason,
    ).toEqual(expect.any(String));
  });
});
