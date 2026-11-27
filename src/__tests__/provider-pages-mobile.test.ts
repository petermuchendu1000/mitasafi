/**
 * The provider dashboard, on a phone.
 *
 * WHY THIS ONE IS DIFFERENT FROM THE OTHER MOBILE SUITES
 *   It is the only page set in the product that has NEVER been measured
 *   in a browser. No provider account exists on the project: querying
 *   profiles for primary_role 'provider' returns nothing, and signing in
 *   as either test account and asking for /dashboard/provider lands on
 *   /dashboard/landlord, because the route redirects a non-provider.
 *   Creating an account would write rows to production.
 *
 *   So the rules applied here are the ones the measured passes
 *   established: py-2.5 renders 40px, py-2 renders 36px, p-2 around a
 *   20px icon renders 36px, py-3 renders 44px. Those came from Chromium
 *   on roughly thirty pages. This suite enforces them over the provider
 *   tree, which makes the pass reproducible, and it is the best that can
 *   be said until somebody can sign in as a provider.
 *
 * WHY IT PARSES INSTEAD OF GREPPING
 *   The scan in the landlord suite anchors on `focus:ring`, which is
 *   blind to any control that does not declare one, and an earlier
 *   attempt to pull out whole tags with a regex stopped at the ">" inside
 *   `onChange={(e) =>`. This walks the source tracking brace, paren and
 *   quote depth, so it sees every opening tag in full and does not care
 *   whether the element has a focus ring.
 */

import fs from "fs";
import path from "path";

const ROOT = path.join(process.cwd(), "src/app/dashboard/provider");
const TAGS = ["button", "a", "Link", "input", "select", "textarea"] as const;

/** Padding that cannot reach 44px, and sizing that says it does. */
const TOO_SHORT = /\bpy-(0|0\.5|1|1\.5|2|2\.5)\b|\bp-(1|1\.5|2|2\.5)\b/;
const SIZED = /min-h-\[44px\]|min-h-11|\bh-11\b|\bh-12\b|\bh-14\b|\bh-16\b/;

interface Tag {
  file: string;
  tag: string;
  text: string;
}

function strip(text: string): string {
  return text.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function files(dir: string): string[] {
  let out: string[] = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== "__tests__") out = out.concat(files(p));
    } else if (p.endsWith(".tsx")) out.push(p);
  }
  return out;
}

/** Every interactive opening tag, in full. */
function openingTags(file: string, src: string): Tag[] {
  const out: Tag[] = [];
  for (const tag of TAGS) {
    const re = new RegExp(`<${tag}(?=[\\s/>])`, "g");
    let m: RegExpExecArray | null;
    while ((m = re.exec(src))) {
      let i = m.index + 1 + tag.length;
      let depth = 0;
      let quote: string | null = null;
      let end = -1;
      while (i < src.length) {
        const c = src[i];
        if (quote) {
          if (c === quote && src[i - 1] !== "\\") quote = null;
          i++;
          continue;
        }
        if (c === '"' || c === "'" || c === "`") {
          quote = c;
          i++;
          continue;
        }
        if (c === "{" || c === "(") depth++;
        else if (c === "}" || c === ")") depth--;
        else if (c === ">" && depth === 0) {
          end = i;
          break;
        }
        i++;
      }
      if (end > 0) out.push({ file, tag, text: src.slice(m.index, end + 1) });
    }
  }
  return out;
}

const SOURCES = files(ROOT).map((f) => ({
  file: path.relative(process.cwd(), f),
  src: strip(fs.readFileSync(f, "utf8")),
}));

const CONTROLS = SOURCES.flatMap(({ file, src }) => openingTags(file, src));

describe("provider dashboard, mobile", () => {
  it("is reading the whole tree", () => {
    // Without this, a bad path would make every check below vacuous.
    expect(SOURCES.length).toBeGreaterThan(40);
    // 204 at the time of writing, across 51 files.
    expect(CONTROLS.length).toBeGreaterThan(180);
  });

  it("finds the tags a regex would have missed", () => {
    // The parser exists because `onChange={(e) =>` ends a naive match
    // early. At least one control here has an inline arrow before its
    // className, and the parser has to see the className anyway.
    const withArrowBeforeClass = CONTROLS.filter(
      (c) => /=>/.test(c.text) && /className/.test(c.text),
    );
    expect(withArrowBeforeClass.length).toBeGreaterThan(5);
  });

  it("gives every interactive element a 44px box", () => {
    const small = CONTROLS.filter(
      (c) => TOO_SHORT.test(c.text) && !SIZED.test(c.text),
    ).map((c) => `${c.file} :: ${c.tag}`);
    expect(small).toEqual([]);
  });

  it("makes a round icon button wide as well as tall", () => {
    // min-h alone on a rounded-full control gives a tall thin pill. Two
    // image-delete buttons came out that way from the first sweep.
    const lopsided = CONTROLS.filter(
      (c) =>
        /rounded-full/.test(c.text) &&
        /min-h-\[44px\]/.test(c.text) &&
        !/min-w-\[44px\]|\bw-1[1-9]\b|\bw-full\b|\bpx-\d/.test(c.text),
    ).map((c) => `${c.file} :: ${c.tag}`);
    expect(lopsided).toEqual([]);
  });

  it("uses no em dash in anything a provider reads", () => {
    const offenders = SOURCES.filter((s) => s.src.includes("—")).map(
      (s) => s.file,
    );
    expect(offenders).toEqual([]);
  });

  describe("the shell", () => {
    const shell = SOURCES.find((s) =>
      s.file.endsWith("ProviderDashboardShell.tsx"),
    )!;

    it("names its two icon-only menu controls", () => {
      expect(shell.src).toMatch(/aria-label="Close menu"/);
      expect(shell.src).toMatch(/aria-label="Open menu"/);
      expect(shell.src).toMatch(/aria-expanded=\{isMobileMenuOpen\}/);
    });

    it("names the logo link, which has no text of its own", () => {
      expect(shell.src).toMatch(/aria-label="MitaSafi provider dashboard"/);
    });

    it("sizes every row of the sidebar", () => {
      expect(shell.src).toMatch(
        /flex items-center justify-between px-3 min-h-\[44px\] rounded-lg/,
      );
    });
  });

  describe("the service preview", () => {
    const preview = SOURCES.find((s) =>
      s.file.endsWith("ServicePreviewClient.tsx"),
    )!;

    it("says on screen that it is a preview", () => {
      // The docblock has always claimed a preview banner. There was
      // none, so a provider saw Book Now, WhatsApp and Call rendered as
      // a customer sees them, tapped one, and nothing happened.
      expect(preview.src).toMatch(
        /Preview\. This is how customers see this service\./,
      );
    });

    it("keeps the mock controls out of the tab order", () => {
      // They stay inert, because a provider booking their own service
      // would be nonsense, but they no longer invite a keyboard or a
      // screen reader to try.
      // Counted on each attribute separately: prettier puts them on
      // their own lines, so a pattern with a space between them matches
      // nothing and would have passed by finding nothing to disagree with.
      expect(preview.src.match(/aria-disabled="true"/g)).toHaveLength(3);
      expect(preview.src.match(/tabIndex=\{-1\}/g)).toHaveLength(3);
    });
  });
});
