/**
 * The open-redirect control had no test of any kind, in any of its three
 * implementations, until this file.
 *
 * It existed three times: canonically here, and privately again as
 * `sanitizeClientRedirectUrl` in (auth)/login/page.tsx and (auth)/signup/page.tsx,
 * byte-identical to each other. The two copies were the ones actually guarding
 * the two highest-traffic entry points, and they were already weaker than the
 * canonical: no double-encoding block, no blocked-path list, no query
 * filtering, and an allowlist two entries shorter.
 *
 * These cases are written against the CANONICAL function, which is now the only
 * implementation. Each case names what it defends.
 */
import { execSync } from "child_process";
import { readFileSync } from "fs";
import {
  sanitizeRedirectUrl,
  isValidRedirectUrl,
} from "@/lib/security/url-sanitizer";

const FALLBACK = "/dashboard";

describe("sanitizeRedirectUrl rejects", () => {
  it.each([
    ["null", null],
    ["undefined", undefined],
    ["an empty string", ""],
  ])("%s", (_label, input) => {
    expect(sanitizeRedirectUrl(input as string | null)).toBe(FALLBACK);
  });

  it.each([
    // off-site redirects: the whole point of the control
    ["a protocol-relative host", "//evil.example"],
    ["an absolute http url", "https://evil.example/path"],
    ["a javascript: payload", "javascript:alert(1)"],
    ["a data: payload", "data:text/html,<script>alert(1)</script>"],
    // traversal
    ["path traversal", "/dashboard/../../etc/passwd"],
    ["encoded traversal", "/dashboard%2F..%2Fetc"],
    // encoding games
    ["a double-encoded slash", "%252Fevil.example"],
    ["a lone percent, which throws on decode", "%"],
    // This one is the only case that actually reaches the double-encode block.
    // The two above are caught earlier -- "%252F..." decodes to "%2F..." and
    // fails startsWith("/"), and a bare "%" throws in decodeURIComponent. A
    // mutant that deleted the % check survived the suite until this was added,
    // because nothing exercised it: it needs a payload that decodes to a
    // string which starts with / AND still contains a %.
    [
      "a percent surviving one decode, on an allowed prefix",
      "/dashboard%252Fx",
    ],
    // paths that exist but must never be a redirect target
    ["an api path", "/api/payments/mpesa/health"],
    ["the auth callback", "/auth/callback"],
    ["the signout route", "/auth/signout"],
    // not on the allowlist
    ["an unknown first-party path", "/admin"],
    ["a bare slash", "/"],
  ])("%s", (_label, input) => {
    expect(sanitizeRedirectUrl(input)).toBe(FALLBACK);
  });

  it("honours a caller-supplied fallback", () => {
    expect(sanitizeRedirectUrl("//evil.example", "/properties")).toBe(
      "/properties",
    );
  });
});

describe("sanitizeRedirectUrl allows", () => {
  it.each([
    ["the dashboard", "/dashboard", "/dashboard"],
    ["a nested dashboard path", "/dashboard/landlord", "/dashboard/landlord"],
    ["properties", "/properties", "/properties"],
    ["listings", "/listings/some-slug", "/listings/some-slug"],
    ["services", "/services", "/services"],
    ["saved", "/saved", "/saved"],
    // these two are on the canonical allowlist and were NOT on the copies'
    ["service providers", "/service-providers", "/service-providers"],
    ["onboarding", "/onboarding/provider-type", "/onboarding/provider-type"],
  ])("%s", (_label, input, expected) => {
    expect(sanitizeRedirectUrl(input)).toBe(expected);
  });
});

describe("sanitizeRedirectUrl filters query parameters", () => {
  it("keeps ordinary ones", () => {
    expect(sanitizeRedirectUrl("/properties?location=juja&maxPrice=5000")).toBe(
      "/properties?location=juja&maxPrice=5000",
    );
  });

  it("drops a parameter whose value carries angle brackets, keeping the rest", () => {
    // I first expected the %-block to fire and the whole URL to fall back. It
    // does not: decodeURIComponent consumes the %, so `decoded.includes('%')`
    // is false and the param filter is what removes the payload. Asserting the
    // behaviour the code actually has, which is the safer of the two: the
    // dangerous parameter is dropped and the harmless one survives.
    expect(
      sanitizeRedirectUrl("/properties?q=%3Cscript%3E&location=juja"),
    ).toBe("/properties?location=juja");
  });

  it("drops a parameter whose name is not a plain identifier", () => {
    expect(sanitizeRedirectUrl("/properties?a-b=1&ok=2")).toBe(
      "/properties?ok=2",
    );
  });
});

describe("a documented quirk, pinned so a change to it is deliberate", () => {
  it("rejects any path CONTAINING /api/, not only one starting with it", () => {
    // BLOCKED_PATHS uses includes(), not startsWith(). A legitimate page under
    // a path segment called "api" would therefore be refused. Recording the
    // behaviour rather than silently changing it.
    expect(sanitizeRedirectUrl("/properties/api/listing")).toBe(FALLBACK);
  });
});

describe("there is only one implementation of this control", () => {
  const files = execSync('git ls-files "src/*"')
    .toString()
    .trim()
    .split("\n")
    .filter((f) => /\.(ts|tsx)$/.test(f) && !f.includes("__tests__"));

  it("scanned enough to be meaningful", () => {
    // Measured when written: 704 ts/tsx under src, ~590 excluding tests.
    expect(files.length).toBeGreaterThanOrEqual(400);
  });

  it("only the module that owns it, and one named exception, declare one", () => {
    // A local re-implementation silently stops inheriting the double-encode
    // block, the blocked-path list and the query filter. This assertion is
    // what found the fourth copy: onboarding/provider-type/page.tsx declares a
    // function called sanitizeRedirectUrl -- the SAME NAME as the canonical,
    // which is why it reads like an import and is not one.
    //
    // It is listed rather than fixed because its semantics genuinely differ:
    // fallback "/dashboard/provider" and an allowlist of "/dashboard" alone,
    // which is tighter than the canonical for a page that must land on a
    // dashboard. Collapsing it would widen it to /properties and the rest.
    // Left for a decision, visible here so a FIFTH copy still fails.
    const offenders = files.filter((f) =>
      /function\s+sanitize\w*RedirectUrl|const\s+sanitize\w*RedirectUrl\s*=/.test(
        readFileSync(f, "utf8"),
      ),
    );
    expect(offenders.sort()).toEqual([
      "src/app/(auth)/onboarding/provider-type/page.tsx",
      "src/lib/security/url-sanitizer.ts",
    ]);
  });

  it("login and signup import it rather than defining it", () => {
    for (const f of [
      "src/app/(auth)/login/page.tsx",
      "src/app/(auth)/signup/page.tsx",
    ]) {
      const src = readFileSync(f, "utf8");
      expect(src).toContain(
        'import { sanitizeRedirectUrl } from "@/lib/security/url-sanitizer"',
      );
      // no DECLARATION of the old private copy. Checking for the bare name
      // would trip on the comment that explains why it is gone.
      expect(src).not.toMatch(/function\s+sanitizeClientRedirectUrl/);
    }
  });
});

describe("isValidRedirectUrl agrees with the sanitizer", () => {
  it.each([
    ["/dashboard", true],
    ["/service-providers", true],
    ["//evil.example", false],
    ["/admin", false],
    [null, false],
  ])("%s -> %s", (input, expected) => {
    expect(isValidRedirectUrl(input as string | null)).toBe(expected);
  });
});
