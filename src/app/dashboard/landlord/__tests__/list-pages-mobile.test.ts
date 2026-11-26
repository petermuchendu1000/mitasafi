/**
 * The six list pages, after the mobile pass.
 *
 * WHY A SOURCE SCAN FOR THIS PARTICULAR THING
 *   What is being guarded is that five pages stopped writing their own
 *   filter row and two stopped writing their own table. There is no output
 *   to assert on: a page that quietly went back to a bespoke 36px pill row
 *   would render perfectly well and look almost the same. FilterPills and
 *   DataTable have their own behaviour tests; this says who uses them.
 *
 *   The copy rules are scanned the same way, over the source with comments
 *   stripped, because the comments in these files quote the old wording.
 */

import fs from "fs";
import path from "path";

const PAGES = {
  buildings: "src/app/dashboard/landlord/buildings/BuildingsList.tsx",
  tenants: "src/app/dashboard/landlord/tenants/TenantDirectory.tsx",
  leases: "src/app/dashboard/landlord/leases/LeaseDirectory.tsx",
  maintenance: "src/app/dashboard/landlord/maintenance/MaintenanceList.tsx",
  inquiries: "src/app/dashboard/inquiries/page.tsx",
  applications: "src/app/dashboard/landlord/applications/ApplicationsQueue.tsx",
} as const;

type PageName = keyof typeof PAGES;

const SOURCE = Object.fromEntries(
  Object.entries(PAGES).map(([name, rel]) => [
    name,
    fs.readFileSync(path.join(process.cwd(), rel), "utf8"),
  ]),
) as Record<PageName, string>;

/** With comments removed, so a comment quoting old wording is not a hit. */
const CODE = Object.fromEntries(
  Object.entries(SOURCE).map(([name, text]) => [
    name,
    text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, ""),
  ]),
) as Record<PageName, string>;

/** Pages whose filters are pills. Inquiries filters with a <select>. */
const PILL_PAGES: PageName[] = [
  "buildings",
  "tenants",
  "leases",
  "maintenance",
  "applications",
];

/**
 * Vertical padding that cannot reach a 44px box.
 *
 * py-3 is 12px each side; around text-sm's 20px line box that is 44px and
 * around text-base's 24px it is 48px, which is why the browser run never
 * flagged a py-3 control. Anything below it can be short, so anything
 * below it has to say min-h-[44px] out loud. Flagging py-3 as well was
 * stricter than the measurement and would have forced a redundant class
 * onto controls that were already the right size.
 */
const TOO_SHORT = /\bpy-(0|0\.5|1|1\.5|2|2\.5)\b/;

describe("the landlord list pages", () => {
  it("is reading all six files", () => {
    // Without this a rename would turn every check below green.
    for (const name of Object.keys(PAGES) as PageName[]) {
      expect(SOURCE[name].length).toBeGreaterThan(2000);
    }
  });

  describe("filters", () => {
    it.each(PILL_PAGES)("%s uses the shared pills", (name) => {
      expect(CODE[name]).toMatch(
        /import \{ FilterPills \} from "@\/components\/dashboard\/landlord\/FilterPills"/,
      );
      expect(CODE[name]).toMatch(/<FilterPills/);
    });

    it.each(PILL_PAGES)("%s writes no pill row of its own", (name) => {
      // A hand-rolled pill row is a <button> carrying aria-pressed. The
      // shared component is the only place that should have one.
      expect(CODE[name]).not.toMatch(/aria-pressed/);
    });
  });

  describe("tables", () => {
    it.each(["tenants", "leases"] as PageName[])(
      "%s renders through DataTable, not a table of its own",
      (name) => {
        // Both were a wide table in an overflow box: 860px and 719px in a
        // 326px column. DataTable is what gives them a card list below sm:.
        expect(CODE[name]).toMatch(/<DataTable/);
        expect(CODE[name]).not.toMatch(/<table/);
        expect(CODE[name]).not.toMatch(/min-w-\[\d+px\]/);
      },
    );
  });

  describe("targets", () => {
    /**
     * A focus ring is the tell. Only something focusable gets one, so every
     * className carrying `focus:ring` is a control, and a control sized by
     * `py-` alone is one of the 30px to 38px boxes the browser run flagged
     * on all six of these pages.
     *
     * The first version of this check tried to pull out whole <input> and
     * <select> tags with /<(input|select)[\s\S]*?\/?>/ and was worthless:
     * the match stops at the first ">", which in nearly every one of these
     * is the arrow in `onChange={(e) =>`, so the className was never inside
     * the captured text. A mutant putting py-2.5 back on the maintenance
     * search box passed against it. This version caught a textarea on the
     * applications page that the browser run had also missed, because it
     * only renders once a card is expanded.
     */
    it.each(Object.keys(PAGES) as PageName[])(
      "%s sizes every focusable control it styles",
      (name) => {
        const controls = [
          ...CODE[name].matchAll(/"([^"]*focus:ring[^"]*)"/g),
        ].map((m) => m[1]);
        expect(controls.length).toBeGreaterThan(0);
        const small = controls.filter(
          (cls) => TOO_SHORT.test(cls) && !/min-h-\[44px\]/.test(cls),
        );
        expect(small).toEqual([]);
      },
    );
  });

  it("lets the tenant stat cards shrink", () => {
    // The page scrolled sideways to 407px in a 360px viewport. A grid item
    // defaults to min-width: auto, so the hint under Outstanding sized its
    // own column to its widest unbreakable run.
    const card = CODE.tenants.slice(
      CODE.tenants.indexOf("function StatCard"),
      CODE.tenants.indexOf("export function TenantDirectory"),
    );
    expect(card).toMatch(/min-w-0/);
  });

  it("gives the repair card metadata strip tappable rows", () => {
    // Building name, unit number and the contractor's phone are links made
    // of a 12px icon beside 12px text, and measured 16px tall.
    const strip = fs.readFileSync(
      path.join(
        process.cwd(),
        "src/components/dashboard/landlord/MaintenanceRequestCard.tsx",
      ),
      "utf8",
    );
    expect(strip).toMatch(/\[&>\*\]:min-h-\[44px\]/);
    expect(strip).toMatch(/\[&_a\]:min-h-\[44px\]/);
  });

  describe("copy", () => {
    it.each(Object.keys(PAGES) as PageName[])(
      "%s uses no em dash a landlord reads",
      (name) => {
        expect(CODE[name]).not.toContain("—");
      },
    );

    it.each(Object.keys(PAGES) as PageName[])(
      "%s has no trailing-ellipsis placeholder",
      (name) => {
        // "Search by unit, tenant or building…" truncated on a phone
        // anyway, and the ellipsis was never doing work.
        expect(CODE[name]).not.toMatch(/placeholder="[^"]*(…|\.\.\.)"/);
      },
    );
  });

  it("gives the icon-only buttons an accessible name", () => {
    // Buildings' add link and inquiries' refresh button both hide their
    // label below sm:, so without an aria-label a phone user heard nothing.
    expect(CODE.buildings).toMatch(/aria-label="Add building"/);
    expect(CODE.inquiries).toMatch(/aria-label="Refresh inquiries"/);
  });

  it("writes lease end dates out rather than printing the ISO string", () => {
    // The card read "to 2027-01-31". The ISO form stays in the data.
    expect(CODE.leases).toMatch(/to \{shortDate\(l\.endDate\)\}/);
    expect(CODE.leases).toMatch(/function shortDate/);
  });
});
