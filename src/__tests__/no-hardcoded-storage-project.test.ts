/**
 * No Supabase project may be named in source.
 *
 * Every marketing image carried a literal URL pointing at project
 * `syoolvgoaqnckgmngvse` — 39 references across 11 files, including
 * next.config.ts's image allowlist and layout.tsx's OpenGraph image. That
 * project had been abandoned: its hostname does not resolve, so every
 * `/_next/image` request returned 500 and every photograph on the marketing
 * pages was broken, along with the social-preview card. Nothing referenced the
 * live project at all.
 *
 * The failure was silent in the way that matters: the code was correct, the
 * build was clean, the tests were green, and the only symptom was images that
 * did not appear. Nothing in CI looks at a rendered page.
 *
 * Image URLs now derive from NEXT_PUBLIC_SUPABASE_URL via
 * `src/lib/storage/landing-images.ts`, so they follow the configured project.
 * This test keeps it that way.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();

/**
 * Any Supabase project host, as in `<ref>.supabase.co`.
 *
 * The first version of this required EXACTLY 20 lowercase letters, because
 * that is the length of a real project ref. Mutation testing walked a 21-char
 * host straight past it. The length of the ref is not the thing worth
 * asserting — naming a project in source at all is — so this matches any host
 * label. `\b` after the TLD keeps `supabase.com` (the marketing/API domain)
 * from matching.
 */
const PROJECT_HOST = /\b([a-z0-9][a-z0-9-]*)\.supabase\.(co|in)\b/g;

/** Files that may legitimately mention a ref: the ones explaining the defect. */
const ALLOWED = new Set([
  "src/lib/storage/landing-images.ts",
  "next.config.ts",
  "src/__tests__/no-hardcoded-storage-project.test.ts",
]);

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name === "node_modules" || e.name === ".next") continue;
      sourceFiles(rel, acc);
    } else if (/\.(ts|tsx|js|jsx|mjs)$/.test(e.name)) {
      acc.push(rel);
    }
  }
  return acc;
}

/** Strip comments: the explanation above is allowed to name the dead project. */
function stripComments(src: string): string {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("no Supabase project ref is hardcoded in application source", () => {
  const files = [...sourceFiles("src"), "next.config.ts"];

  it("finds files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("no source file names a project host outside a comment", () => {
    const offenders: string[] = [];
    for (const f of files) {
      if (ALLOWED.has(f)) continue;
      const code = stripComments(fs.readFileSync(path.join(root, f), "utf8"));
      for (const m of code.matchAll(PROJECT_HOST)) {
        offenders.push(`${f}: ${m[1]}.supabase.${m[2]}`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the allowed files mention a ref only inside comments", () => {
    for (const f of ["src/lib/storage/landing-images.ts", "next.config.ts"]) {
      const code = stripComments(fs.readFileSync(path.join(root, f), "utf8"));
      expect({
        file: f,
        refsInCode: [...code.matchAll(PROJECT_HOST)].length,
      }).toEqual({
        file: f,
        refsInCode: 0,
      });
    }
  });

  it("landing images derive their base from the configured project", () => {
    const src = fs.readFileSync(
      path.join(root, "src/lib/storage/landing-images.ts"),
      "utf8",
    );
    expect(src).toContain("process.env.NEXT_PUBLIC_SUPABASE_URL");
    expect(src).toMatch(/storage\/v1\/object\/public\/landing-images/);
  });

  it("the image allowlist derives its host from the configured project", () => {
    const cfg = fs.readFileSync(path.join(root, "next.config.ts"), "utf8");
    expect(cfg).toContain("NEXT_PUBLIC_SUPABASE_URL");
    expect(cfg).toContain("supabaseHost");
  });

  it("the OpenGraph image is a raster format, not SVG", () => {
    // The landing-images bucket allows jpeg/png/webp/avif only, and no social
    // platform renders an SVG og:image — it was broken on both counts.
    const layout = fs.readFileSync(
      path.join(root, "src/app/layout.tsx"),
      "utf8",
    );
    expect(layout).not.toMatch(/og-image\.svg/);
    expect(layout).toMatch(/og-image\.png/);
  });
});
