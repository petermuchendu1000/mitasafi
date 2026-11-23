/**
 * Exactly one file in each dashboard tree may render a <main> landmark: the shell.
 *
 * WHAT THIS CATCHES
 *   Each dashboard layout wraps every page in a shell that already supplies the
 *   page's <main>. A page that renders its own <main> therefore nests one
 *   landmark inside another. A screen reader announces two "main" regions, and
 *   "skip to main content" has two places to go — the user cannot tell which.
 *
 * MEASURED, NOT ASSUMED
 *   Before this test, three landlord pages did it:
 *     listings/[id]/edit/page.tsx   listings/new/page.tsx   buildings/BuildingsList.tsx
 *   Counted in a real browser on the create wizard and the buildings list:
 *     2 <main>, nested=1. Pages without the defect reported 1 and nested=0.
 *
 * WHY A STATIC TEST
 *   Nothing in CI renders a page, which is exactly how the first three got in —
 *   and how two of them survived an earlier sweep that fixed the sibling pages.
 *   A grep-level invariant is cheap and runs on every commit.
 *
 * THIS FAILS IN BOTH DIRECTIONS. If a shell stops rendering its <main>, the
 * page has no main landmark at all, which is its own accessibility defect. So
 * the shells are asserted to HAVE one, not merely permitted to.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();

/**
 * The one file per tree that owns the <main> landmark.
 * A tree is listed here only if a layout wraps its pages in that shell.
 */
const SHELLS: Record<string, string> = {
  "src/app/dashboard/landlord":
    "src/app/dashboard/landlord/LandlordDashboardShell.tsx",
};

/** `<main` as an opening JSX tag — not `</main>`, not the word in prose. */
const OPENING_MAIN = /<main[\s>]/;

/**
 * Comments are not markup.
 *
 * The first version of this test matched the raw file and reported SIX
 * offenders, every one of them a false positive: the pages that had the defect
 * now carry a comment EXPLAINING it, and those comments contain the characters
 * `<main>`. Three of the six had been correct for some time.
 *
 * The invariant is about rendered elements, so the prose has to go before the
 * match. Weakening the assertion to tolerate those files instead would have
 * made the test permanently blind to the three that genuinely regress.
 */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "") // block comments, JSX {/* ... */} included
    .replace(/(^|[^:])\/\/.*$/gm, "$1"); // line comments, but not the // in a URL
}

function rendersMain(relPath: string): boolean {
  const src = fs.readFileSync(path.join(root, relPath), "utf8");
  return OPENING_MAIN.test(stripComments(src));
}

function walk(dir: string, out: string[] = []): string[] {
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

describe.each(Object.entries(SHELLS))(
  "%s renders exactly one <main>, in its shell",
  (tree, shell) => {
    const treeAbs = path.join(root, tree);

    it("the shell itself renders a <main>", () => {
      expect(rendersMain(shell)).toBe(true);
    });

    it("no other file in the tree renders a <main>", () => {
      const offenders = walk(treeAbs)
        .map((abs) => path.relative(root, abs))
        .filter((rel) => rel !== shell)
        .filter(rendersMain);

      // Named, so a failure says which file to open rather than just a count.
      expect(offenders).toEqual([]);
    });
  },
);
