/**
 * A wide fixed width that cannot shrink will overflow a phone.
 *
 * Found on production, signed in, at 360px: the "Their last 6 months" row on
 * the landlord tenant page ran 5px past the viewport and clipped the trailing
 * percentage. The row was
 *     w-20 shrink-0   month label      80px
 *     flex-1          the bar
 *     w-56 shrink-0   amount + rate   224px
 * 304px of unshrinkable width plus two gap-3 gaps is 328px, and the card's
 * padding takes the rest. The identical row on the building page was worse,
 * at w-60.
 *
 * THE RULE. Inside the dashboard, a class string must not combine `shrink-0`
 * with an UNPREFIXED width of w-40 (160px) or more. A responsive width such as
 * `sm:w-56` is fine, because below that breakpoint the element is free to
 * shrink or wrap. An element that is `hidden` by default is also fine, because
 * it is not rendered at the width that matters.
 *
 * THE THRESHOLD IS MEASURED, NOT GUESSED. Scanning the dashboard at the time
 * this was written, every legitimate `shrink-0` width was w-28 (112px) or less
 * -- icons, short labels -- and the only values at or above w-40 were the two
 * defects and one `hidden lg:block w-80`, which this rule correctly allows.
 */
import fs from "fs";
import path from "path";

const ROOTS = ["src/app/dashboard", "src/components/dashboard"];
const MIN_WIDTH = 40;

/** Widths written bare, not behind a sm:/md:/lg: prefix. */
const UNPREFIXED_WIDTH = /(?:^|[\s"'`{])w-(\d+)(?![\w./-])/g;
const HAS_SHRINK_0 = /(?:^|\s)(?:flex-)?shrink-0(?:\s|$)/;
const HIDDEN_BY_DEFAULT = /(?:^|\s)hidden(?:\s|$)/;

/** The whole rule, in one place, so the self-test exercises what the scan uses. */
export function offendingWidth(classString: string): number | null {
  if (!HAS_SHRINK_0.test(classString)) return null;
  if (HIDDEN_BY_DEFAULT.test(classString)) return null;
  let worst = 0;
  UNPREFIXED_WIDTH.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = UNPREFIXED_WIDTH.exec(classString))) {
    worst = Math.max(worst, Number.parseInt(m[1], 10));
  }
  return worst >= MIN_WIDTH ? worst : null;
}

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

const FILES = ROOTS.flatMap((r) => walk(r));
const STRINGS: { file: string; value: string }[] = [];
for (const file of FILES) {
  const src = fs.readFileSync(file, "utf8");
  for (const m of src.matchAll(/"([^"\n]*?)"/g)) {
    if (HAS_SHRINK_0.test(m[1])) STRINGS.push({ file, value: m[1] });
  }
}

describe("the rule itself can fail", () => {
  // Without this, a broken regex would report a clean codebase forever.
  it.each([
    ["w-56 shrink-0 text-xs text-gray-600 text-right tabular-nums", 56],
    ["w-60 shrink-0 text-xs", 60],
    ["shrink-0 w-40", 40],
    ["flex-shrink-0 w-96 p-2", 96],
  ])("flags %s", (cls, expected) => {
    expect(offendingWidth(cls)).toBe(expected);
  });

  it.each([
    ["w-20 shrink-0 text-xs text-gray-500"], // a short label, fits
    ["w-28 shrink-0 text-xs"], // the widest legitimate case found
    ["hidden lg:block w-80 flex-shrink-0"], // not rendered on a phone
    ["sm:w-56 sm:shrink-0 ml-auto text-xs"], // responsive, free to wrap below sm
    ["w-56 text-xs"], // wide but allowed to shrink
    ["h-56 shrink-0"], // a height, not a width
  ])("does not flag %s", (cls) => {
    expect(offendingWidth(cls)).toBeNull();
  });
});

describe("no dashboard element is both wide and unshrinkable on a phone", () => {
  it("scanned enough to be meaningful", () => {
    // Measured when written: 208 files, 206 strings. Floors well under those,
    // so this fails if the walk silently stops finding things.
    expect(FILES.length).toBeGreaterThanOrEqual(180);
    expect(STRINGS.length).toBeGreaterThanOrEqual(150);
  });

  it("has no offenders", () => {
    const bad = STRINGS.flatMap(({ file, value }) => {
      const w = offendingWidth(value);
      return w === null ? [] : [`${file}: w-${w} with shrink-0 -> "${value}"`];
    });
    expect(bad).toEqual([]);
  });
});

describe("the two rows that overflowed now wrap", () => {
  it.each([
    ["src/app/dashboard/landlord/tenants/[id]/TenantProfile.tsx", "sm:w-56"],
    ["src/app/dashboard/landlord/buildings/[id]/BuildingDetail.tsx", "sm:w-60"],
  ])("%s", (file, responsiveWidth) => {
    const src = fs.readFileSync(file, "utf8");
    // the row wraps instead of overflowing
    expect(src).toContain("flex flex-wrap items-center gap-x-3 gap-y-2");
    // the bar takes its own line below sm, and rejoins the row from sm up
    expect(src).toContain(
      "order-last h-6 w-full bg-gray-100 rounded-md overflow-hidden relative sm:order-none sm:w-auto sm:flex-1",
    );
    // the amount column is only fixed-width from sm up
    expect(src).toContain(responsiveWidth);
    expect(src).not.toContain(`${responsiveWidth.replace("sm:", "")} shrink-0`);
  });
});
