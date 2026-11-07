/**
 * Every transactional email must be replyable.
 *
 * WHAT WENT WRONG
 *   All four `emails.send()` calls set `from` to notifications@, alerts@ or
 *   noreply@ and set no Reply-To at all. None of those three mailboxes has a
 *   Cloudflare Email Routing rule, so a user who pressed Reply on a booking
 *   notification or a search alert received a hard bounce.
 *
 *   Established 2026-11-06 by three independent methods:
 *     1. Source search: no `replyTo` or `reply_to` in src/lib/email/ or
 *        src/lib/notifications/.
 *     2. Live SMTP probe: mail to an address with no routing rule bounced with
 *        `smtp; 550 5.1.1 Address does not exist`, while hello@ and support@
 *        both reached the destination.
 *     3. Resend's own record of a delivered message from this app's exact
 *        from-address reported `reply_to: null`, proving Resend adds no
 *        default of its own.
 *
 * WHY THIS TEST IS STRUCTURAL
 *   Fixing the four call sites fixes today's bug. The bug that matters is the
 *   NEXT send site someone adds without a Reply-To, which no type-checker can
 *   catch because `replyTo` is optional in the Resend SDK
 *   (CreateEmailBaseOptions, node_modules/resend/dist/index.d.cts:282). So
 *   this test finds every send call in the tree and requires each one to carry
 *   a Reply-To aimed at a mailbox that actually receives.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();

/**
 * Mailboxes with a Cloudflare Email Routing rule, i.e. ones that can receive.
 *
 * Verified 2026-11-06 by sending real mail to each and observing Resend report
 * `delivered`, against a control address with no rule which reported
 * `bounced` / 550. If a mailbox is added to this list without a routing rule,
 * replies to it will bounce and this test will not notice — the list is the
 * one fact here that source code cannot prove.
 */
const ROUTABLE_MAILBOXES = ["SUPPORT_EMAIL", "CONTACT_EMAIL"];

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      sourceFiles(rel, acc);
    } else if (/\.(ts|tsx)$/.test(e.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

/**
 * Extract the argument object of every `emails.send({ ... })`.
 *
 * This walks the source character by character and skips over string
 * literals, template literals (including nested `${}` expressions) and
 * comments before counting braces. The first version counted braces naively
 * and its own self-test below caught it: a `}` inside a string literal
 * decremented the depth and truncated the payload early, which would report a
 * send site as missing its Reply-To when it has one.
 *
 * A regex cannot do this either — `html` and `text` payloads contain braces
 * of their own, so a non-greedy match stops inside the HTML.
 */
function sendPayloads(src: string): string[] {
  const out: string[] = [];
  const marker = "emails" + ".send(";
  let i = src.indexOf(marker);
  while (i !== -1) {
    const open = src.indexOf("{", i);
    if (open === -1) break;
    const end = matchBrace(src, open);
    if (end === -1) break;
    out.push(src.slice(open, end + 1));
    i = src.indexOf(marker, end);
  }
  return out;
}

/** Index of the `}` closing the `{` at `open`, or -1. String/comment aware. */
function matchBrace(src: string, open: number): number {
  let depth = 0;
  // Stack of template-literal depths, so `${ { } }` nests correctly.
  const tpl: number[] = [];
  for (let k = open; k < src.length; k++) {
    const c = src[k];
    const next = src[k + 1];

    if (c === "/" && next === "/") {
      k = src.indexOf("\n", k);
      if (k === -1) return -1;
      continue;
    }
    if (c === "/" && next === "*") {
      k = src.indexOf("*/", k + 2);
      if (k === -1) return -1;
      k += 1;
      continue;
    }
    if (c === '"' || c === "'") {
      k = skipQuoted(src, k, c);
      if (k === -1) return -1;
      continue;
    }
    if (c === "`") {
      tpl.push(depth);
      k = skipTemplate(src, k, tpl, () => depth);
      if (k === -1) return -1;
      tpl.pop();
      continue;
    }
    if (c === "{") depth++;
    else if (c === "}") {
      depth--;
      if (depth === 0) return k;
    }
  }
  return -1;
}

/** Index of the closing quote of a '...' or "..." starting at `start`. */
function skipQuoted(src: string, start: number, quote: string): number {
  for (let k = start + 1; k < src.length; k++) {
    if (src[k] === "\\") {
      k++;
      continue;
    }
    if (src[k] === quote) return k;
    if (src[k] === "\n") return -1;
  }
  return -1;
}

/**
 * Index of the backtick closing a template literal starting at `start`,
 * recursing through `${ ... }` substitutions so braces inside them are
 * balanced rather than counted against the outer object.
 */
function skipTemplate(
  src: string,
  start: number,
  _tpl: number[],
  _depth: () => number,
): number {
  for (let k = start + 1; k < src.length; k++) {
    if (src[k] === "\\") {
      k++;
      continue;
    }
    if (src[k] === "`") return k;
    if (src[k] === "$" && src[k + 1] === "{") {
      const close = matchBrace(src, k + 1);
      if (close === -1) return -1;
      k = close;
    }
  }
  return -1;
}

describe("transactional email is replyable", () => {
  // This file is excluded: it contains the marker string and a synthetic
  // payload in its own source, which are not real send sites.
  const SELF = "src/__tests__/email-reply-to.test.ts";
  const files = sourceFiles("src").filter((f) => f !== SELF);
  const sites: { file: string; payload: string }[] = [];
  for (const f of files) {
    const src = fs.readFileSync(path.join(root, f), "utf8");
    for (const payload of sendPayloads(src)) sites.push({ file: f, payload });
  }

  /**
   * The exact census of send sites, as (file, from-expression) pairs.
   *
   * This was originally `expect(sites.length).toBeGreaterThanOrEqual(4)`.
   * Deleting the dead sendVerificationEmail took the count to 3 and the
   * assertion failed — correctly. But a threshold that gets relaxed whenever
   * it fails is not a check, so it was replaced with the full set: adding a
   * send site, removing one, or changing which mailbox one sends as all fail
   * here and have to be acknowledged deliberately.
   */
  const EXPECTED_SITES = [
    ["src/lib/email/booking-emails.ts", "FROM_ADDRESS"],
    ["src/lib/email/index.ts", "MAIL_FROM.alerts"],
    ["src/lib/email/index.ts", "MAIL_FROM.notifications"],
  ];

  it("the set of send sites is exactly the expected one", () => {
    const actual = sites
      .map((s) => {
        const m = s.payload.match(/\bfrom\s*:\s*([A-Za-z_$][\w$.]*)/);
        return [s.file, m ? m[1] : "<unresolved>"];
      })
      .sort((a, b) => a.join().localeCompare(b.join()));
    expect(actual).toEqual(EXPECTED_SITES);
  });

  it("every send site sets a Reply-To", () => {
    const missing = sites
      .filter((s) => !/\breplyTo\s*:/.test(s.payload))
      .map((s) => `${s.file}: ${s.payload.slice(0, 60).replace(/\s+/g, " ")}…`);
    expect(missing).toEqual([]);
  });

  it("every Reply-To points at a mailbox that receives", () => {
    const bad: string[] = [];
    for (const s of sites) {
      const m = s.payload.match(/\breplyTo\s*:\s*([A-Za-z_$][\w$.]*)/);
      if (!m) continue; // absence is the previous test's business
      if (!ROUTABLE_MAILBOXES.includes(m[1])) bad.push(`${s.file}: ${m[1]}`);
    }
    expect(bad).toEqual([]);
  });

  it("no send site hardcodes a Reply-To string instead of a constant", () => {
    // A literal would drift from urls.ts the moment the domain changes.
    const literal = sites
      .filter((s) => /\breplyTo\s*:\s*["'`]/.test(s.payload))
      .map((s) => s.file);
    expect(literal).toEqual([]);
  });

  it("the brace-counting extractor survives braces inside the payload", () => {
    // Guards the parser itself: a regex-based version truncated here.
    const fake = `
      await resend.emails.send({
        from: X,
        replyTo: SUPPORT_EMAIL,
        html: \`<div style="\${a ? "{" : "}"}">body</div>\`,
        text: "a } brace",
      });
    `;
    const [p] = sendPayloads(fake);
    expect(p).toContain("replyTo");
    expect(p.trimEnd().endsWith("}")).toBe(true);
    expect(p).toContain('text: "a } brace"');
  });
});

describe("the reply-to constant resolves to a real mailbox", () => {
  it("SUPPORT_EMAIL is on the Resend-verified mail domain", () => {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { SUPPORT_EMAIL, MAIL_DOMAIN } =
      require("@/lib/site/urls") as typeof import("@/lib/site/urls");
    // The literal value of MAIL_DOMAIN is pinned in site-domain.test.ts, which
    // owns that fact; asserting it again here would hardcode the domain in a
    // second place, which is the very thing that test forbids.
    expect(SUPPORT_EMAIL).toBe(`support@${MAIL_DOMAIN}`);
  });
});
