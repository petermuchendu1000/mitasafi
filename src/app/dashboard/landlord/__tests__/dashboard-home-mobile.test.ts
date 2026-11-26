/**
 * The landlord dashboard home, on a phone.
 *
 * WHY A SOURCE SCAN
 *   The page is an async server component that opens seven Supabase queries
 *   before it returns any JSX. Rendering it in jsdom would mean mocking the
 *   whole client, and what is being guarded here is not a value: it is the
 *   ORDER of two blocks, the number of grid columns, and the absence of
 *   wording. None of those have an output to assert on. The shape of the
 *   source is what carries them.
 *
 *   The measurements behind each rule were taken in Chromium at 320 and
 *   360px; they are recorded in the evidence ledger, not re-taken here.
 */

import fs from "fs";
import path from "path";

const FILE = path.join(process.cwd(), "src/app/dashboard/landlord/page.tsx");
const SOURCE = fs.readFileSync(FILE, "utf8");

/**
 * The file with every comment removed.
 *
 * Needed because the comments in this page explain what was changed and
 * quote the old wording verbatim, so a scan over the raw text would find
 * "View details" in a comment that exists only to say it is gone.
 */
const CODE = SOURCE.replace(/\/\*[\s\S]*?\*\//g, "").replace(
  /^\s*\/\/.*$/gm,
  "",
);

describe("landlord dashboard home, mobile rules", () => {
  it("is reading the file it thinks it is", () => {
    // Guards against a rename quietly turning every check below green.
    expect(SOURCE).toMatch(
      /export default async function LandlordDashboardPage/,
    );
    expect(CODE.length).toBeGreaterThan(4000);
  });

  it("puts what needs the landlord above the activity feed", () => {
    // It used to sit last, under eight activity rows and six quick actions:
    // about 1,900px below the fold at 360px.
    const needs = CODE.indexOf("Needs you");
    const activity = CODE.indexOf("Recent activity");
    expect(needs).toBeGreaterThan(0);
    expect(activity).toBeGreaterThan(0);
    expect(needs).toBeLessThan(activity);
  });

  it("stacks the stat cards two to a row on a phone", () => {
    // grid-cols-1 here meant four full-width cards: ~500px of scroll for
    // four numbers.
    expect(CODE).toMatch(/grid grid-cols-2 lg:grid-cols-4/);
    expect(CODE).not.toMatch(/grid-cols-1 sm:grid-cols-2 lg:grid-cols-4/);
  });

  it("makes each attention tile one target instead of a 20px text link", () => {
    expect(CODE).not.toContain("View details");
    expect(CODE).not.toContain("Review →");
  });

  it("uses no em dash in anything a landlord reads", () => {
    // The standing rule for this codebase. Comments are stripped above, so
    // this is copy only.
    expect(CODE).not.toContain("—");
  });

  it("keeps the two grid children able to shrink", () => {
    // A grid item defaults to min-width: auto, so without min-w-0 the single
    // column on a phone sized to its widest content: the track measured
    // 526px in a 360px viewport and pushed the page sideways.
    const grid = CODE.indexOf('<div className="grid lg:grid-cols-3 gap-6">');
    expect(grid).toBeGreaterThan(0);
    const after = CODE.slice(grid, grid + 2500);
    expect(after).toMatch(/min-w-0 lg:col-span-2/);
    expect(after.match(/min-w-0/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("drops the timestamp out of its own column below sm", () => {
    // The timestamp held a column at every width, leaving the description
    // 120px at 320px wide. Measured 210px after the change.
    expect(CODE).toMatch(/sm:hidden text-xs text-gray-400/);
    expect(CODE).toMatch(/hidden sm:block text-xs text-gray-400/);
  });

  it("does not carry the filler line back", () => {
    expect(CODE).not.toContain("what's happening with your properties");
  });
});
