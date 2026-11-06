/**
 * The site's domain and mailboxes must come from one module.
 *
 * WHAT WENT WRONG
 *   Thirty-nine references across fourteen files hardcoded
 *   "mitasafi" + ".co" + ".ke" — a domain that has never been registered.
 *   Measured 2026-11-06 from two independent public resolvers (Cloudflare and
 *   Google DNS-over-HTTPS): every record type returned NXDOMAIN, and the
 *   Cloudflare account holding this project's DNS has no zone for it.
 *
 *   The outage was live and silent in both directions:
 *
 *     Sending — Resend answered HTTP 403 "domain is not verified" for each of
 *     the three from-addresses the app used (notifications@, alerts@,
 *     noreply@). Probed against the live API; the same probe on the real
 *     domain returned 200. Inquiry notifications, search alerts, verification
 *     emails and every booking email were failing in production.
 *
 *     Indexing — metadataBase, og:url and the JSON-LD "url" fields told
 *     crawlers the canonical home of the site was that unregistered domain.
 *     Confirmed by fetching the deployed HTML of /, /services, /landlords,
 *     /properties and /service-providers.
 *
 *   Neither failure could be caught by a type-checker or by any test that
 *   does not look at DNS or at a rendered page, which is why this file asserts
 *   the structural property instead: nothing names a domain or a mailbox
 *   except `src/lib/site/urls.ts`.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();

/**
 * The unregistered domain, assembled rather than written, so that this test
 * file does not itself trip the scan it performs.
 */
const DEAD_DOMAIN = ["mitasafi", "co", "ke"].join(".");

/**
 * Any mitasafi domain, under any TLD.
 *
 * Deliberately not pinned to the dead TLD. The defect worth preventing is
 * "the domain is written down in application code", not "this one typo".
 * A future move to a third domain would reintroduce exactly this bug, and a
 * regex that only knew about `.co.ke` would wave it through.
 */
const ANY_SITE_DOMAIN = /\bmitasafi\.(?:co\.ke|com|co|ke|africa|io|net|org)\b/g;

/** An email address on any mitasafi domain. */
const ANY_SITE_MAILBOX =
  /\b[a-z0-9._%+-]+@mitasafi\.(?:co\.ke|com|co|ke|africa|io|net|org)\b/g;

/**
 * The only file allowed to name the domain in executable code.
 *
 * `legal.ts` is NOT on this list: it re-exports CONTACT_EMAIL and must keep
 * doing so. If it ever hardcodes an address again, this test fails.
 */
const DOMAIN_SOURCE = "src/lib/site/urls.ts";

/** This file. It must spell out the expected literals in order to assert them. */
const SELF = "src/__tests__/site-domain.test.ts";

/**
 * Files exempt from the two "in code" scans below.
 *
 * Only two: the module that owns the domain, and this test. Exempting this
 * file does mean the scan cannot police this file — acceptable, because its
 * only domain literals are assertions, and the suite below pins each of them
 * to an exact expected value.
 */
const SCAN_EXEMPT = new Set([DOMAIN_SOURCE, SELF]);

/** Files whose prose explains the defect and may therefore name the domain. */
const COMMENTS_MAY_MENTION = new Set([
  DOMAIN_SOURCE,
  "src/lib/site/legal.ts",
  "src/__tests__/site-domain.test.ts",
]);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      sourceFiles(rel, acc);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

/** Strip comments, so the explanations above do not count as references. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("the site domain is configured in one place", () => {
  const files = sourceFiles("src");

  it("finds files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("the unregistered domain appears in no source file, comments included", () => {
    const offenders = files.filter(
      (f) =>
        !COMMENTS_MAY_MENTION.has(f) &&
        fs.readFileSync(path.join(root, f), "utf8").includes(DEAD_DOMAIN),
    );
    expect(offenders).toEqual([]);
  });

  it("no source file outside urls.ts names a mitasafi domain in code", () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (SCAN_EXEMPT.has(f)) continue;
      const code = stripComments(fs.readFileSync(path.join(root, f), "utf8"));
      for (const m of code.matchAll(ANY_SITE_DOMAIN))
        offenders.push(`${f}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it("no source file outside urls.ts names a mailbox in code", () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (SCAN_EXEMPT.has(f)) continue;
      const code = stripComments(fs.readFileSync(path.join(root, f), "utf8"));
      for (const m of code.matchAll(ANY_SITE_MAILBOX))
        offenders.push(`${f}: ${m[0]}`);
    }
    expect(offenders).toEqual([]);
  });

  it("the allowed files mention the dead domain only inside comments", () => {
    for (const f of COMMENTS_MAY_MENTION) {
      const code = stripComments(fs.readFileSync(path.join(root, f), "utf8"));
      expect({ file: f, inCode: code.includes(DEAD_DOMAIN) }).toEqual({
        file: f,
        inCode: false,
      });
    }
  });
});

describe("urls.ts", () => {
  const src = fs.readFileSync(path.join(root, DOMAIN_SOURCE), "utf8");
  const code = stripComments(src);

  it("derives the site origin from NEXT_PUBLIC_APP_URL", () => {
    expect(code).toContain("process.env.NEXT_PUBLIC_APP_URL");
  });

  it("falls back to the registered domain, never the dead one", () => {
    expect(code).not.toContain(DEAD_DOMAIN);
    expect(code).toContain("https://mitasafi.com");
  });

  it("sends mail only from the domain verified in Resend", () => {
    // Pinned to mitasafi.com because that is the domain Resend has verified.
    // Resend returns 403 for any other, so this constant is a hard dependency
    // on an external account's state, not a stylistic choice.
    expect(code).toMatch(/MAIL_DOMAIN\s*=\s*"mitasafi\.com"/);
  });

  it("derives every from-address and mailbox from MAIL_DOMAIN", () => {
    // No literal address may appear: each must interpolate MAIL_DOMAIN, so a
    // domain change cannot leave one address behind on the old domain.
    expect([...code.matchAll(ANY_SITE_MAILBOX)].map((m) => m[0])).toEqual([]);
    for (const box of [
      "notifications",
      "alerts",
      "noreply",
      "hello",
      "support",
    ]) {
      expect(code).toContain(`${box}@\${MAIL_DOMAIN}`);
    }
  });
});

describe("SITE_URL and siteUrl", () => {
  /**
   * Behavioural, not structural: the module reads process.env at import time,
   * so each case needs a fresh module registry.
   */
  function load(appUrl?: string) {
    jest.resetModules();
    const prev = process.env.NEXT_PUBLIC_APP_URL;
    if (appUrl === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = appUrl;
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("@/lib/site/urls") as typeof import("@/lib/site/urls");
    if (prev === undefined) delete process.env.NEXT_PUBLIC_APP_URL;
    else process.env.NEXT_PUBLIC_APP_URL = prev;
    return mod;
  }

  it("uses the production origin when NEXT_PUBLIC_APP_URL is unset", () => {
    expect(load(undefined).SITE_URL).toBe("https://mitasafi.com");
  });

  it("honours NEXT_PUBLIC_APP_URL when it is set", () => {
    expect(load("https://preview.example.com").SITE_URL).toBe(
      "https://preview.example.com",
    );
  });

  it("strips trailing slashes so joined paths never double up", () => {
    const m = load("https://preview.example.com///");
    expect(m.SITE_URL).toBe("https://preview.example.com");
    expect(m.siteUrl("/services")).toBe("https://preview.example.com/services");
  });

  it("joins a path with exactly one slash, given or not", () => {
    const m = load("https://mitasafi.com");
    expect(m.siteUrl("/services")).toBe("https://mitasafi.com/services");
    expect(m.siteUrl("services")).toBe("https://mitasafi.com/services");
    expect(m.siteUrl("")).toBe("https://mitasafi.com");
    expect(m.siteUrl()).toBe("https://mitasafi.com");
  });

  it("exposes the bare hostname without a scheme", () => {
    expect(load("https://mitasafi.com").SITE_DOMAIN).toBe("mitasafi.com");
    expect(load("http://localhost:3000").SITE_DOMAIN).toBe("localhost:3000");
  });

  it("keeps mail addresses on the verified domain even on a preview origin", () => {
    // The regression this blocks: deriving from-addresses from SITE_URL would
    // make a preview build send from preview.example.com, which Resend rejects.
    const m = load("https://preview.example.com");
    expect(m.MAIL_FROM.notifications).toBe(
      "MitaSafi <notifications@mitasafi.com>",
    );
    expect(m.CONTACT_EMAIL).toBe("hello@mitasafi.com");
    expect(m.SUPPORT_EMAIL).toBe("support@mitasafi.com");
  });
});
