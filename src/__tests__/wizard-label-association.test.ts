/**
 * Every wizard <label> must point at a control.
 *
 * WHY
 *   A <label> with no `for` is decoration. It is not announced as the field's
 *   name, and clicking it does not focus the field. Measured in a real browser
 *   across the five Add Building steps BEFORE this was fixed:
 *     0 of 33 labels resolved to a control
 *     15 of 27 controls had an accessible name, and every one of those names
 *       was the PLACEHOLDER, not the label — "e.g. 2020" for Year Built,
 *       "e.g. 24" for Total Units, "0" for a money field. That is worse than
 *       unnamed: it is misnamed, and a placeholder-derived name disappears the
 *       moment the user types.
 *   After: 26/26 labels resolve, 26/27 controls named with their real labels.
 *   (The 27th is Step 4's file input, which is display:none and deliberately
 *   not exposed; its trigger is a real <button>.)
 *
 * THE BUDGET
 *   The Add Building wizard is at zero and must stay there. The LISTINGS wizard
 *   still has 53 unassociated labels — a separate and larger job. Rather than
 *   scope this test to one directory and leave that invisible, every file is
 *   checked against a recorded count.
 *
 *   This fails in BOTH directions. A file that gets worse fails. A file that
 *   gets BETTER also fails, so the budget cannot quietly drift out of date and
 *   must be lowered deliberately as the listings wizard is fixed.
 *
 *   Labels inside comments do not count — the comments explaining this defect
 *   contain the characters "<label>", and an earlier guard in this repo was
 *   caught matching exactly that kind of prose.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();

/** Recorded count of <label> elements with no htmlFor, per file. */
const BUDGET: Record<string, number> = {
  // Add Building — fixed, must stay at zero.
  "src/app/dashboard/landlord/buildings/new/steps/Step1Basics.tsx": 0,
  "src/app/dashboard/landlord/buildings/new/steps/Step2Amenities.tsx": 0,
  "src/app/dashboard/landlord/buildings/new/steps/Step3Policies.tsx": 0,
  "src/app/dashboard/landlord/buildings/new/steps/Step4Photos.tsx": 0,
  "src/app/dashboard/landlord/buildings/new/steps/Step5Financials.tsx": 0,

  // Listings wizard — not yet done. Locked so it cannot get worse.
  "src/app/dashboard/landlord/listings/new/steps/Step2Location.tsx": 1,
  "src/app/dashboard/landlord/listings/new/steps/Step3Details.tsx": 7,
  "src/app/dashboard/landlord/listings/new/steps/Step4Amenities.tsx": 10,
  "src/app/dashboard/landlord/listings/new/steps/Step4CommercialAmenities.tsx": 2,
  "src/app/dashboard/landlord/listings/new/steps/Step5CommercialPhotos.tsx": 2,
  "src/app/dashboard/landlord/listings/new/steps/Step5Photos.tsx": 3,
  "src/app/dashboard/landlord/listings/new/steps/Step6CommercialPricing.tsx": 16,
  "src/app/dashboard/landlord/listings/new/steps/Step6Pricing.tsx": 8,
  "src/app/dashboard/landlord/listings/new/steps/Step7CommercialReview.tsx": 2,
  "src/app/dashboard/landlord/listings/new/steps/Step7Review.tsx": 2,
};

const WIZARD_DIRS = [
  "src/app/dashboard/landlord/buildings/new/steps",
  "src/app/dashboard/landlord/listings/new/steps",
];

/** Comments are not markup — see the note above. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

/** Opening <label ...> tags that carry no htmlFor. */
function unassociatedLabels(src: string): number {
  const tags = stripComments(src).match(/<label\b[^>]*>/g) ?? [];
  return tags.filter((t) => !/\bhtmlFor\b/.test(t)).length;
}

function tsxFiles(dir: string): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return [];
  return fs
    .readdirSync(abs)
    .filter((f) => f.endsWith(".tsx"))
    .map((f) => path.join(dir, f));
}

describe("wizard labels are associated with their controls", () => {
  const files = WIZARD_DIRS.flatMap(tsxFiles).sort();

  it("finds the wizard step files (so a rename cannot silently pass)", () => {
    expect(files.length).toBeGreaterThanOrEqual(Object.keys(BUDGET).length);
  });

  it("matches the recorded count exactly, in both directions", () => {
    const actual: Record<string, number> = {};
    for (const rel of files) {
      const n = unassociatedLabels(
        fs.readFileSync(path.join(root, rel), "utf8"),
      );
      // Only record files that have labels at all, to keep the diff readable.
      if (n > 0 || rel in BUDGET) actual[rel] = n;
    }

    const expected: Record<string, number> = {};
    for (const rel of Object.keys(actual)) expected[rel] = BUDGET[rel] ?? 0;

    // A mismatch names the file and both numbers. If a count went DOWN, lower
    // the budget in this file — do not widen it.
    expect(actual).toEqual(expected);
  });

  it("the Add Building wizard is at zero", () => {
    const offenders = tsxFiles(WIZARD_DIRS[0]).filter(
      (rel) =>
        unassociatedLabels(fs.readFileSync(path.join(root, rel), "utf8")) > 0,
    );
    expect(offenders).toEqual([]);
  });
});
