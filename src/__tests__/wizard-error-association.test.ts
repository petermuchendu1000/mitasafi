/**
 * A validation error must be announced, not just coloured red.
 *
 * MEASURED BEFORE THIS WAS FIXED
 *   Add Building, three required fields left empty, their errors on screen:
 *     fields with an accessible description: 0 of 7
 *     fields marked invalid:                 0 of 7
 *   A screen-reader user heard "Building Name, required, edit text" and nothing
 *   about the rejection. The red paragraph existed only for sighted users.
 *   After: the three erroring fields each expose their exact error text as
 *   their description and report invalid=true, and the four valid ones expose
 *   neither — confirmed from Chrome's accessibility tree.
 *
 * WHAT THIS GUARDS, STATICALLY
 *   1. every element rendering `errors.<field>` carries an id, so there is
 *      something for a control to point at
 *   2. every aria-describedby names an id that exists in the same file
 *   3. the controls known to have an error display still carry aria-invalid
 *
 * WHAT IT CANNOT GUARD
 *   That the description actually computes — that needs a browser, and is
 *   covered by scratchpad/error-assoc.cjs rather than by CI. A static check
 *   can only show the wiring is present, never that it resolves at runtime.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();

const WIZARDS = [
  "src/app/dashboard/landlord/buildings/new",
  "src/app/dashboard/landlord/listings/new",
];

/** Files whose controls must stay wired, and how many of each attribute. */
const WIRED: Record<string, { describedby: number; invalid: number }> = {
  "src/app/dashboard/landlord/buildings/new/steps/Step1Basics.tsx": {
    describedby: 4, // name, address, area, and the building-type group
    invalid: 3, // the group has no single element to mark invalid
  },
  "src/app/dashboard/landlord/buildings/new/steps/Step5Financials.tsx": {
    describedby: 2, // the cross-field M-Pesa/bank error, from both fields
    invalid: 2,
  },
  "src/app/dashboard/landlord/listings/new/steps/Step2Location.tsx": {
    describedby: 5, // buildingName, streetAddress, city, and both area controls
    invalid: 5,
  },
};

function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function walk(dir: string, out: string[] = []): string[] {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) return out;
  for (const e of fs.readdirSync(abs, { withFileTypes: true })) {
    const rel = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name === "__tests__" || e.name === "node_modules") continue;
      walk(rel, out);
    } else if (e.name.endsWith(".tsx")) {
      out.push(rel);
    }
  }
  return out;
}

const files = WIZARDS.flatMap((d) => walk(d)).sort();

describe("wizard validation errors are announced", () => {
  it.each(Object.keys(WIRED))("%s keeps its wiring", (rel) => {
    const src = stripComments(fs.readFileSync(path.join(root, rel), "utf8"));
    const actual = {
      describedby: (src.match(/aria-describedby/g) ?? []).length,
      invalid: (src.match(/aria-invalid/g) ?? []).length,
    };
    // Exact, so removing a wire fails and adding one without recording it
    // fails too — the numbers cannot drift.
    expect(actual).toEqual(WIRED[rel]);
  });

  it("every aria-describedby names an id that exists in the same file", () => {
    const broken: Record<string, string[]> = {};
    for (const rel of files) {
      const src = stripComments(fs.readFileSync(path.join(root, rel), "utf8"));
      const bad: string[] = [];
      for (const m of src.matchAll(
        /aria-describedby=(?:"([^"]+)"|\{([\s\S]*?)\})/g,
      )) {
        if (m[1]) {
          if (!new RegExp(`\\bid="${m[1]}"`).test(src)) bad.push(m[1]);
          continue;
        }
        // An expression form such as
        //   {showError("name") ? "bld-name-error" : undefined}
        // contains the CONDITION's string too, so the first quoted value is
        // not the target. Require that at least one of them is a real id.
        const quoted = [...m[2].matchAll(/"([^"]+)"/g)].map((q) => q[1]);
        if (!quoted.length) continue;
        const resolves = quoted.some((q) => {
          // Literal: the id is written out in this file.
          if (new RegExp(`\\bid="${q}"`).test(src)) return true;
          // Derived: `fieldErrorId("x")` renders as id="x-error", and the
          // element carrying it is <FieldError field="x" />, so no literal
          // id="x" ever appears. Requiring the component is STRICTER than
          // requiring a literal id: it proves the message is actually
          // rendered, not merely named somewhere.
          return (
            new RegExp(`fieldErrorId\\(\\s*"${q}"`).test(m[2]) &&
            new RegExp(`<FieldError\\s+field="${q}"`).test(src)
          );
        });
        if (!resolves) bad.push(quoted.join("|"));
      }
      if (bad.length) broken[rel] = bad;
    }
    expect(broken).toEqual({});
  });

  it("every rendered errors.<field> message carries an id", () => {
    const bare: Record<string, string[]> = {};
    for (const rel of files) {
      const src = stripComments(fs.readFileSync(path.join(root, rel), "utf8"));
      const bad: string[] = [];
      // the opening tag of each red message node
      for (const m of src.matchAll(/<(p|div)\b([^>]*text-red-600[^>]*)>/g)) {
        const after = src.slice(
          m.index! + m[0].length,
          m.index! + m[0].length + 200,
        );
        const isError = /errors[.[]/.test(after);
        if (isError && !/\bid=/.test(m[2])) {
          bad.push(after.replace(/\s+/g, " ").trim().slice(0, 40));
        }
      }
      if (bad.length) bare[rel] = bad;
    }
    expect(bare).toEqual({});
  });
});
