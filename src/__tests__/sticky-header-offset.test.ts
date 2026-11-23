/**
 * A page-level <header> must not pin itself to the top of the viewport.
 *
 * WHAT THIS CATCHES
 *   The landlord shell renders its own header as `sticky top-0 z-30 h-16`.
 *   A page <header> that is also `sticky top-0` stacks on the same 64 pixels.
 *   Measured before the fix, scrolled 600px, at 1440x800 AND 390x844:
 *     /listings/new   page header z-40 -> covered the shell header completely;
 *                     search, notifications and the sidebar toggle unreachable
 *     /buildings      page header z-10 -> scrolled up behind it instead
 *   Both overlapped by exactly 64px. After offsetting to top-16: 0px, with the
 *   page header's top at 64 on both viewports.
 *
 * THE COUPLING THIS PROTECTS
 *   `top-16` is only correct while the shell header is `h-16`. Those two numbers
 *   live in different files and nothing connects them, so this test asserts BOTH:
 *   the shell's height, and the absence of top-0 on page headers. Change the
 *   shell header's height and this fails, pointing at the offsets that must move.
 *
 * WHAT IS DELIBERATELY NOT COVERED
 *   `sticky top-0` on a non-<header> element is fine and is left alone — the
 *   record-payment modal uses it correctly, because its scroll container is the
 *   modal body, not the page. Only <header> elements are checked.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();

/** The shell's own header owns top-0. Everything else in the tree must not. */
const SHELL_HEADER =
  "src/components/dashboard/landlord/LandlordDashboardHeader.tsx";
const TREES = [
  "src/app/dashboard/landlord",
  "src/components/dashboard/landlord",
];

/**
 * Opening <header ...> tag and its attributes.
 *
 * No `s` flag: `[^>]` already matches newlines, so a tag split across lines is
 * captured anyway, and the flag needs an es2018 target this project does not
 * set — jest transpiled it happily while tsc rejected it.
 */
const HEADER_TAG = /<header\b[^>]*>/g;

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(dir: string, out: string[] = []): string[] {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "node_modules") continue;
      walk(full, out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(full);
    }
  }
  return out;
}

describe("sticky header offsets", () => {
  it("the shell header is h-16, which is what top-16 is measured against", () => {
    const src = fs.readFileSync(path.join(root, SHELL_HEADER), "utf8");
    // If this fails, the offsets in the page headers must change to match.
    expect(src).toMatch(/\bh-16\b/);
    expect(src).toMatch(/\bsticky top-0\b/);
  });

  it("no page <header> pins itself to top-0", () => {
    const offenders: string[] = [];

    for (const tree of TREES) {
      for (const abs of walk(path.join(root, tree))) {
        const rel = path.relative(root, abs);
        if (rel === SHELL_HEADER) continue;
        const src = stripComments(fs.readFileSync(abs, "utf8"));
        for (const tag of src.match(HEADER_TAG) ?? []) {
          if (/\bsticky\b/.test(tag) && /\btop-0\b/.test(tag)) {
            offenders.push(rel);
          }
        }
      }
    }

    // Named, so a failure says which file to open.
    expect(offenders).toEqual([]);
  });
});
