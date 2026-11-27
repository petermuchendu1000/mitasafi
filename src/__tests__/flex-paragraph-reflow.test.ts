/**
 * A sentence inside a flex container is not a sentence any more.
 *
 * Found on production, signed in, at 360px. The landlord tenant page header
 * read
 *     ID            National
 *     verified  ·   ID
 *                   24110001
 * instead of one line. The markup was
 *     <p className="text-sm ... flex items-center gap-1.5">
 *       <ShieldCheck />
 *       {verificationLabel}
 *       <span>·</span>
 *       {idType} {idNumber}
 *     </p>
 * `flex` makes every text run its own flex item. In a narrow column each item
 * is shrunk and wraps INSIDE ITSELF, so the line breaks mid-phrase and the
 * phrases sit side by side as columns. Ordinary text flow breaks at spaces
 * and reads as one sentence, which is what a <p> is for.
 *
 * An inline icon gives the same visual result without the flex container.
 *
 * THE SIGNATURE. A <p> laid out with `flex` that also contains a separator
 * character is a sentence that has been split into runs. That is precise:
 * across 358 components and 1381 <p> tags, 34 paragraphs use flex and only
 * the four defects carried a separator. The other 30 are an icon beside ONE
 * run of prose, which wraps correctly because there is nothing to sit beside.
 *
 * THIS RULE IS A SIGNATURE, NOT A PROOF. A flex <p> holding two runs with no
 * separator between them would slip past it. It is kept because it has no
 * false positives on this codebase, and a rule nobody has to argue with is
 * one that survives.
 */
import fs from "fs";
import path from "path";

const ROOTS = ["src/app", "src/components"];
/** Characters used in this codebase to join phrases that must read as one line. */
const SEPARATORS = ["·", "→", "–"]; // · → –

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!/^(__tests__|node_modules)$/.test(entry.name)) walk(p, out);
    } else if (entry.name.endsWith(".tsx")) {
      out.push(p);
    }
  }
  return out;
}

export interface FlexParagraph {
  file: string;
  line: number;
  separators: string[];
}

export function flexParagraphs(source: string, file = ""): FlexParagraph[] {
  const found: FlexParagraph[] = [];
  const open = /<p\b([^>]*)>/g;
  let m: RegExpExecArray | null;
  while ((m = open.exec(source))) {
    if (!/className="[^"]*\bflex\b/.test(m[1])) continue;
    const end = source.indexOf("</p>", m.index);
    const body =
      end === -1
        ? source.slice(m.index, m.index + 600)
        : source.slice(m.index, end);
    found.push({
      file,
      line: source.slice(0, m.index).split("\n").length,
      separators: SEPARATORS.filter((s) => body.includes(s)),
    });
  }
  return found;
}

const FILES = ROOTS.flatMap((r) => walk(r));
const FLEX_PARAGRAPHS = FILES.flatMap((f) =>
  flexParagraphs(fs.readFileSync(f, "utf8"), f),
);

describe("the rule itself can fail", () => {
  it("flags a flex paragraph whose phrases are joined by a separator", () => {
    const bad = `<p className="text-sm flex items-center gap-1.5">
      <ShieldCheck />
      {label}
      <span>·</span>
      {idType} {idNumber}
    </p>`;
    expect(flexParagraphs(bad)[0].separators).toEqual(["·"]);
  });

  it("flags an arrow too, which is how date ranges were joined", () => {
    const bad = `<p className="text-xs flex items-center gap-1.5">
      <Calendar />
      {start} → {end}
    </p>`;
    expect(flexParagraphs(bad)[0].separators).toEqual(["→"]);
  });

  it("does not flag an icon beside one run of prose", () => {
    const ok = `<p className="mt-2 flex gap-2 text-xs text-gray-500">
      <Info aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      Your paybill can send these automatically, but only you can register it.
    </p>`;
    expect(flexParagraphs(ok)[0].separators).toEqual([]);
  });

  it("does not flag a separator in a paragraph that is not flex", () => {
    const ok = `<p className="text-sm text-gray-500 mt-0.5">
      <ShieldCheck className="inline-block" />
      {label} <span>·</span> {idNumber}
    </p>`;
    expect(flexParagraphs(ok)).toEqual([]);
  });
});

describe("no paragraph splits a sentence across flex items", () => {
  it("scanned enough to be meaningful", () => {
    // Measured when written: 358 components, 34 flex paragraphs. Floors sit
    // below those so a walk that silently stops finding files is a failure.
    expect(FILES.length).toBeGreaterThanOrEqual(300);
    expect(FLEX_PARAGRAPHS.length).toBeGreaterThanOrEqual(25);
  });

  it("has no offenders", () => {
    const bad = FLEX_PARAGRAPHS.filter((p) => p.separators.length).map(
      (p) => `${p.file}:${p.line} joined by ${p.separators.join("")}`,
    );
    expect(bad).toEqual([]);
  });
});

describe("the tenant page header gives the name the whole width", () => {
  const SRC = fs.readFileSync(
    "src/app/dashboard/landlord/tenants/[id]/TenantProfile.tsx",
    "utf8",
  );

  it("wraps the actions onto their own row below sm", () => {
    // Three icon-only actions are about 136px together, which left the
    // identity column roughly 76px and broke the name across two lines.
    expect(SRC).toContain(
      "flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
    );
    expect(SRC).toContain(
      "flex items-start gap-3 min-w-0 basis-full sm:basis-auto",
    );
  });

  it("keeps the desktop row, so this is mobile-only", () => {
    expect(SRC).toContain("sm:basis-auto");
    expect(SRC).not.toContain("basis-full sm:basis-full");
  });

  it("uses inline icons on the two identity lines", () => {
    expect(SRC).toContain(
      'ShieldCheck className="w-3.5 h-3.5 mr-1.5 inline-block align-[-2px]"',
    );
    expect(SRC).toContain(
      'Briefcase className="w-3 h-3 mr-1.5 inline-block align-[-1px]"',
    );
  });
});
