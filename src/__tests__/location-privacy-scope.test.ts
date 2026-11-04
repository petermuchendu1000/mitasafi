/**
 * hide_exact_address — code-layer regression guard
 *
 * 20260340000000 revoked the client SELECT privilege on
 * public.listings.address, building_name, latitude and longitude, and moved
 * the five `select("*")` reads to public.listings_public, which masks those
 * four per the flag and returns them in full to the landlord.
 *
 * The database now refuses a client that asks the table for those columns, so
 * a regression here is loud rather than silent -- PostgREST answers 42501.
 * This suite exists so it is loud in CI instead, at the moment someone writes
 * the query, and so the five migrated call sites cannot quietly drift back.
 *
 * The scan is shaped to the DEFECT, not to the fix: it looks for any
 * `.from("listings")` chain whose `.select()` names one of the four columns,
 * which is the shape the exposure would take. A guard that merely asserted
 * `from("listings_public")` appears somewhere would pass on a file that had
 * both.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

/** Strip // and block comments so prose about these columns is not a finding. */
function stripTsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const entry of fs.readdirSync(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${entry.name}`;
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "__tests__") continue;
      sourceFiles(rel, acc);
    } else if (
      /\.(ts|tsx)$/.test(entry.name) &&
      !/\.test\.tsx?$/.test(entry.name)
    ) {
      acc.push(rel);
    }
  }
  return acc;
}

/** The four columns a client role may no longer read off the table. */
const MASKED = ["address", "building_name", "latitude", "longitude"] as const;

/**
 * The five reads moved to the view. Each is listed with the reason, because a
 * future reader needs to know that three of them are OWNER reads that depend
 * on the view's landlord branch returning the real values -- they are not
 * public reads that happen to work.
 */
const MIGRATED_TO_VIEW: ReadonlyArray<[string, string]> = [
  ["src/lib/listings/get-listing.ts", "public detail page"],
  ["src/app/dashboard/landlord/listings/[id]/page.tsx", "owner"],
  ["src/app/dashboard/landlord/listings/actions.ts", "owner, duplicateListing"],
  [
    "src/app/dashboard/landlord/listings/new/listing-service.ts",
    "owner, edit + list",
  ],
];

describe("hide_exact_address is enforced below the application", () => {
  const files = sourceFiles("src");

  it("finds source files to scan", () => {
    expect(files.length).toBeGreaterThan(50);
  });

  it("no client-bound read asks the listings TABLE for a masked column", () => {
    const offenders: string[] = [];

    for (const file of files) {
      const src = stripTsComments(read(file));

      // The admin client bypasses grants entirely, so a read there is legal.
      // Resolve per chain rather than per file: a file may use both clients.
      const chain =
        /\.from\(\s*["'`]listings["'`]\s*\)([\s\S]{0,400}?)(?=\.from\(|;|\n\s*\n)/g;
      let m: RegExpExecArray | null;
      while ((m = chain.exec(src)) !== null) {
        const tail = m[1];
        const selectArg = /\.select\(\s*(`[^`]*`|"[^"]*"|'[^']*')/.exec(tail);
        if (!selectArg) continue;
        const projection = selectArg[1];

        // `select("*")` against the table now fails at runtime for every
        // client role, because four of the hundred columns are not granted.
        if (/^["'`]\s*\*\s*["'`]$/.test(projection)) {
          offenders.push(`${file}: select("*") on the listings table`);
          continue;
        }
        for (const col of MASKED) {
          if (new RegExp(`\\b${col}\\b`).test(projection)) {
            offenders.push(`${file}: selects ${col} from the listings table`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the five reads that need every column go through listings_public", () => {
    for (const [file, why] of MIGRATED_TO_VIEW) {
      const src = stripTsComments(read(file));
      expect({
        file,
        why,
        usesView: /\.from\(\s*["'`]listings_public["'`]\s*\)/.test(src),
      }).toEqual({ file, why, usesView: true });
    }
  });

  it("the migration that revokes the columns is present and names all four", () => {
    const dir = "supabase/migrations";
    const file = fs
      .readdirSync(path.join(root, dir))
      .find((f) => /enforce_hide_exact_address\.sql$/.test(f));
    expect(file).toBeDefined();

    const sql = read(`${dir}/${file}`);
    // the regrant excludes exactly these four
    const exclusion = /column_name NOT IN \(([^)]*)\)/.exec(sql);
    expect(exclusion).not.toBeNull();
    for (const col of MASKED) {
      expect(exclusion![1]).toContain(`'${col}'`);
    }
    // and the table privilege is dropped, without which the REVOKE is inert
    expect(sql).toMatch(
      /REVOKE SELECT ON public\.listings FROM anon, authenticated/,
    );
  });

  it("the view masks on the flag rather than unconditionally", () => {
    const dir = "supabase/migrations";
    const file = fs
      .readdirSync(path.join(root, dir))
      .find((f) => /enforce_hide_exact_address\.sql$/.test(f))!;
    const sql = read(`${dir}/${file}`);

    // One reveal predicate, consulting the flag AND exempting the owner. A
    // view that masked unconditionally would break every landlord's edit form;
    // one that masked never would be the original defect.
    expect(sql).toMatch(
      /NOT coalesce\(l\.hide_exact_address, false\)\) AS reveal/,
    );
    expect(sql).toMatch(/l\.landlord_id = auth\.uid\(\) OR NOT coalesce/);

    // NULL must read as "not hidden" to match ListingMap.tsx:222 `!hideExactAddress`.
    expect(sql).toContain("coalesce(l.hide_exact_address, false)");
  });
});
