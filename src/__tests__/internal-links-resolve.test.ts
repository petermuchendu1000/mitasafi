/**
 * Every internal link must point at a route that exists.
 *
 * /terms, /privacy and /guides/tenants were linked from the footer of every
 * page on the site and none of them existed. Nothing caught it: the build was
 * clean, tsc was clean, 589 tests passed, and a dead <Link> is not a type
 * error. It surfaced only because a browser prefetched them and logged 404s.
 *
 * Twenty-nine internal links were broken, not three.
 *
 * THE SHAPE THIS IS BUILT AROUND
 *   My own first sweep found ten, because it matched only the JSX attribute
 *   form `href="/x"`. The footer and the nav build their links from data
 *   arrays using the object-property form `href: "/x"`, and that is where
 *   most of the broken ones lived. This scans BOTH, because missing one form
 *   is the mistake that made the audit wrong the first time.
 *
 * KNOWN_MISSING is a budget, not a suppression list. It fails in both
 * directions: a new broken link fails the build, and a link that has since
 * been fixed but is still listed also fails, so the list cannot rot.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const APP = "src/app";

/**
 * Routes still linked but not yet built, as of the commit that added this
 * test. Remove an entry when you add the page. Do not add to this list to
 * silence a failure — build the page, or remove the link.
 */
const KNOWN_MISSING: ReadonlyArray<string> = [
  "/about",
  "/admin/reviews",
  "/app",
  "/auth/reset-password",
  "/blog",
  "/careers",
  "/cookies",
  "/dashboard/landlord/activity",
  "/dashboard/landlord/applications",
  "/dashboard/landlord/buildings",
  "/dashboard/landlord/buildings/new",
  "/dashboard/landlord/expenses",
  "/dashboard/landlord/help",
  "/dashboard/landlord/income",
  "/dashboard/landlord/leases",
  "/dashboard/landlord/maintenance",
  "/dashboard/landlord/rent",
  "/dashboard/landlord/reports",
  "/dashboard/landlord/settings",
  "/developers",
  "/guides/landlords",
  "/help",
  "/help/listing-tips",
  "/press",
  "/safety",
  "/tenant-rights",
];

/** Every route the app serves: pages and route handlers alike. */
function existingRoutes(dir = APP, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) existingRoutes(rel, acc);
    else if (e.name === "page.tsx" || e.name === "route.ts") {
      const url =
        rel
          .replace(new RegExp(`^${APP}`), "")
          .replace(/\/(page\.tsx|route\.ts)$/, "")
          // (marketing) and similar route groups are not path segments
          .replace(/\/\([^)]*\)/g, "") || "/";
      acc.push(url || "/");
    }
  }
  return acc;
}

function routeMatcher(routes: string[]): (href: string) => boolean {
  const pats = routes.map(
    (r) =>
      new RegExp(
        "^" +
          r
            .split("/")
            .map((seg) =>
              /^\[\.\.\..+\]$/.test(seg)
                ? ".*"
                : /^\[.+\]$/.test(seg)
                  ? "[^/]+"
                  : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"),
            )
            .join("/") +
          "$",
      ),
  );
  return (href) => pats.some((p) => p.test(href));
}

/** Both link forms, because only scanning one is how this was missed before. */
function internalLinks(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  const walk = (dir: string) => {
    for (const e of fs.readdirSync(path.join(root, dir), {
      withFileTypes: true,
    })) {
      const rel = `${dir}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name === "node_modules" || e.name === "__tests__") continue;
        walk(rel);
      } else if (/\.(ts|tsx)$/.test(e.name) && !/\.test\.tsx?$/.test(e.name)) {
        const src = fs.readFileSync(path.join(root, rel), "utf8");
        for (const re of [/href="(\/[^"]*)"/g, /href:\s*"(\/[^"]*)"/g]) {
          for (const m of src.matchAll(re)) {
            const href = m[1].split(/[#?]/)[0];
            if (!href || href.includes("${")) continue;
            found.set(href, [...(found.get(href) ?? []), rel]);
          }
        }
      }
    }
  };
  walk("src");
  return found;
}

describe("internal links resolve to real routes", () => {
  const routes = existingRoutes();
  const matches = routeMatcher(routes);
  const links = internalLinks();

  it("finds routes and links to compare", () => {
    expect(routes.length).toBeGreaterThan(50);
    expect(links.size).toBeGreaterThan(40);
  });

  it("scans the object-property href form, not just the JSX attribute", () => {
    // The footer builds its links as `{ label, href }` objects. If this
    // assertion fails the scanner has regressed to the blind version.
    const footer = fs.readFileSync(
      path.join(root, "src/components/landing/Footer.tsx"),
      "utf8",
    );
    expect(footer).toMatch(/href:\s*"\/privacy"/);
    expect(links.has("/privacy")).toBe(true);
  });

  it("the three pages this test was written for now exist", () => {
    for (const r of ["/terms", "/privacy", "/guides/tenants"]) {
      expect({ route: r, exists: matches(r) }).toEqual({
        route: r,
        exists: true,
      });
    }
  });

  it("no internal link is broken outside the known-missing budget", () => {
    const known = new Set(KNOWN_MISSING);
    const unexpected: string[] = [];
    for (const [href, files] of links) {
      if (matches(href) || known.has(href)) continue;
      unexpected.push(`${href}  <- ${[...new Set(files)].join(", ")}`);
    }
    expect(unexpected).toEqual([]);
  });

  it("the known-missing list has no stale entries", () => {
    // A route that now exists must be removed from the budget, or the list
    // stops being evidence of anything.
    const stale = KNOWN_MISSING.filter((r) => matches(r));
    expect(stale).toEqual([]);
  });

  it("every known-missing entry is actually still linked somewhere", () => {
    // If nothing links to it any more, the entry is dead weight.
    const orphaned = KNOWN_MISSING.filter((r) => !links.has(r));
    expect(orphaned).toEqual([]);
  });
});
