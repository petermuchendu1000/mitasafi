/**
 * Wizard labels must be associated with a control.
 *
 * WHAT "ASSOCIATED" MEANS, AND A MISTAKE THIS TEST USED TO MAKE
 *   The first version of this file counted <label> elements WITHOUT htmlFor
 *   and called the result "unassociated". That is wrong. A <label> that WRAPS
 *   its control is associated: label.control resolves, the accessible name
 *   computes, clicking it focuses the field. Ten labels in the listings wizard
 *   are of that shape, so the reported figure of "53 unassociated labels" was
 *   overstated by exactly those ten. The real number was 43.
 *
 *   So an orphan here is a <label> with NO htmlFor AND no control inside it.
 *
 * AND A BIGGER MISS
 *   The first version globbed one flat directory. The commercial branch keeps
 *   its forms in steps/Step3Commercial/ and steps/Step3Commercial/specialized/,
 *   81 more orphans that the guard never looked at. It walks recursively now.
 *
 * WHAT THIS CANNOT SEE
 *   Labels rendered by a COMPONENT rather than written as markup. The
 *   specialized commercial forms contain no literal <label> at all — they call
 *   <FieldLabel>, which used to emit a bare <label> for all 45 of its call
 *   sites while every one of these files scanned clean. That class of defect
 *   needs rendering, and is covered by
 *   listings/new/__tests__/specialized-label-association.test.tsx.
 *
 * Measured before the fixes, across both wizards:
 *   Add Building   0 of 33 labels resolved to a control
 *   Listings      43 orphans in the flat steps, 81 under Step3Commercial,
 *                 plus 45 component-rendered labels with no `for` at all
 * All are now at zero, and this keeps them there.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();

const WIZARD_ROOTS = [
  "src/app/dashboard/landlord/buildings/new/steps",
  "src/app/dashboard/landlord/listings/new/steps",
];

/** Comments are not markup: the notes explaining this defect contain "<label>". */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

const LABEL_OPEN = /<label((?:[^>"]|"[^"]*")*)>/g;
const CONTROL = /<(input|select|textarea)\b/;

/** <label> with neither htmlFor nor a control nested inside it. */
function orphanLabels(src: string): string[] {
  const s = stripComments(src);
  const out: string[] = [];
  for (const m of s.matchAll(LABEL_OPEN)) {
    const close = s.indexOf("</label>", m.index! + m[0].length);
    if (close === -1) continue;
    const inner = s.slice(m.index! + m[0].length, close);
    if (/\bhtmlFor\b/.test(m[1])) continue;
    if (CONTROL.test(inner)) continue; // wrapping label — already associated
    out.push(inner.replace(/\s+/g, " ").trim().slice(0, 40));
  }
  return out;
}

/** An htmlFor pointing at an id that no labelable element carries. */
const LABELABLE = new Set([
  "input",
  "select",
  "textarea",
  "button",
  "meter",
  "output",
  "progress",
]);

function danglingFor(src: string): string[] {
  const s = stripComments(src);
  const out: string[] = [];
  for (const m of s.matchAll(/htmlFor="([^"]+)"/g)) {
    const id = m[1];
    let found = false;
    for (const im of s.matchAll(new RegExp(`\\bid="${id}"`, "g"))) {
      const open = s.lastIndexOf("<", im.index!);
      const tag = /^<([A-Za-z][A-Za-z0-9]*)/.exec(s.slice(open));
      // An upper-case tag is a React component, which forwards the id.
      if (tag && (LABELABLE.has(tag[1]) || /^[A-Z]/.test(tag[1]))) {
        found = true;
        break;
      }
    }
    if (!found) out.push(id);
  }
  return out;
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

describe("wizard labels are associated with their controls", () => {
  const files = WIZARD_ROOTS.flatMap((d) => walk(d)).sort();

  it("walks into the nested commercial directories", () => {
    // The first version globbed one flat directory and missed 81 orphans.
    expect(files.some((f) => f.includes("Step3Commercial/specialized/"))).toBe(
      true,
    );
    expect(files.length).toBeGreaterThan(20);
  });

  it("no <label> is an orphan", () => {
    const offenders: Record<string, string[]> = {};
    for (const rel of files) {
      const bad = orphanLabels(fs.readFileSync(path.join(root, rel), "utf8"));
      if (bad.length) offenders[rel] = bad;
    }
    expect(offenders).toEqual({});
  });

  it("no htmlFor points at an id that does not exist", () => {
    const offenders: Record<string, string[]> = {};
    for (const rel of files) {
      const bad = danglingFor(fs.readFileSync(path.join(root, rel), "utf8"));
      if (bad.length) offenders[rel] = bad;
    }
    expect(offenders).toEqual({});
  });
});
