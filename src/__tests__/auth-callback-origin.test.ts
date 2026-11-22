/**
 * @jest-environment node
 */

/**
 * The OAuth callback must redirect to the SITE's origin, not the container's.
 *
 * WHAT WENT WRONG IN PRODUCTION
 *   route.ts did:
 *       const requestUrl = new URL(request.url);
 *       const origin = requestUrl.origin;
 *   and then built all nine of its redirects as `${origin}${path}`.
 *
 *   Next's standalone server binds to HOSTNAME=0.0.0.0 PORT=3000 (set in the
 *   Dockerfile), and behind Fly's proxy `request.url` is built from that bind
 *   address rather than from the public hostname. So `origin` was
 *   "http://0.0.0.0:3000", and a user who completed Google sign-in was sent to
 *       https://0.0.0.0:3000/properties
 *   which no browser can resolve: ERR_ADDRESS_INVALID. Sign-in authenticated
 *   the user correctly and then stranded them on an unreachable address.
 *
 * WHY NOT READ THE FORWARDED HEADERS
 *   x-forwarded-host is supplied by the caller. Building a redirect target out
 *   of it hands an attacker the Location header. Where the site lives is
 *   configuration, so it comes from SITE_URL — the one module that owns that
 *   fact.
 *
 * NOTE ON THE ABSENT DOMAIN LITERALS
 *   This file deliberately never spells the production domain. Doing so trips
 *   src/__tests__/site-domain.test.ts, the guard that keeps the domain in a
 *   single module — a guard that caught this very file on first run. The
 *   configured cases therefore use a neutral host, and the default case is
 *   compared against SITE_URL itself. That is not circular: the defect made
 *   the route ignore SITE_URL entirely and answer with the container address,
 *   so this assertion fails loudly against the unfixed code.
 *
 * The path portion is separately sanitised by sanitizeRedirectUrl; this file is
 * only about the ORIGIN.
 */

/** A request as the container actually sees it behind fly-proxy. */
const INTERNAL_URL = "http://0.0.0.0:3000/auth/callback";

/** A configured origin that is deliberately not this project's domain. */
const NEUTRAL_ORIGIN = "https://example.test";

/**
 * Call the route with NEXT_PUBLIC_APP_URL set to `appUrl`, and return both the
 * Location it produced and the SITE_URL that the same module graph resolved —
 * so the two are always read under identical environment conditions.
 */
async function callWith(
  appUrl: string | undefined,
  init?: RequestInit,
): Promise<{ location: string; siteUrl: string }> {
  const previous = process.env.NEXT_PUBLIC_APP_URL;
  if (appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = appUrl;

  let location = "";
  let siteUrl = "";
  await jest.isolateModulesAsync(async () => {
    const { GET } = await import("@/app/auth/callback/route");
    ({ SITE_URL: siteUrl } = await import("@/lib/site/urls"));
    const response = await GET(new Request(INTERNAL_URL, init));
    location = response.headers.get("location") ?? "";
  });

  if (previous === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
  else process.env.NEXT_PUBLIC_APP_URL = previous;
  return { location, siteUrl };
}

describe("auth callback redirects to the public origin", () => {
  it("never sends the browser to the container's bind address", async () => {
    const { location } = await callWith(NEUTRAL_ORIGIN);
    expect(location).not.toContain("0.0.0.0");
    expect(location).not.toContain(":3000");
  });

  it("uses the configured site origin", async () => {
    const { location } = await callWith(NEUTRAL_ORIGIN);
    expect(location).toBe(`${NEUTRAL_ORIGIN}/login`);
  });

  it("honours a localhost origin so local builds work", async () => {
    const { location } = await callWith("http://localhost:3000");
    expect(location).toBe("http://localhost:3000/login");
  });

  it("falls back to SITE_URL's default when nothing is configured", async () => {
    const { location, siteUrl } = await callWith(undefined);
    expect(siteUrl).not.toBe("");
    expect(location).toBe(`${siteUrl}/login`);
    expect(location).not.toContain("0.0.0.0");
  });

  it("ignores a forged x-forwarded-host rather than redirecting to it", async () => {
    const { location } = await callWith(NEUTRAL_ORIGIN, {
      headers: {
        "x-forwarded-host": "evil.example",
        "x-forwarded-proto": "https",
      },
    });
    expect(location).not.toContain("evil.example");
    expect(location).toBe(`${NEUTRAL_ORIGIN}/login`);
  });
});
