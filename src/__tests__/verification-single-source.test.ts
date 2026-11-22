/**
 * profiles.is_verified has exactly one source: verification_level.
 *
 * THE DEFECT
 *
 * Three boolean flags and one ladder coexisted with no declared relationship:
 *
 *   profiles.verification_level   'none' | 'phone' | 'id' | 'full'
 *   profiles.is_verified          written BY HAND alongside it, at four sites
 *   user_roles.is_verified        role approval -- a different concept
 *   service_providers.is_verified business verification -- a third concept
 *
 * verification_level was referenced by 0 of 182 RLS policies and 0 of 277
 * functions, so nothing server-side consulted the ladder, while is_verified was
 * the flag actually read -- including by profiles_public, which publishes it to
 * anonymous visitors. Two columns for one concept, maintained in pairs by hand.
 * Nothing stopped them disagreeing, and a profile whose level said 'full' while
 * its flag said false would have shown as unverified forever.
 *
 * 20260344000000 makes is_verified a STORED generated column,
 * (verification_level = 'full'), so disagreement is no longer representable.
 *
 * WHY 'full' AND NOT <> 'none'
 *
 * Measured from the four writers, not chosen. Every one of them paired level
 * 'id' with is_verified false and level 'full' with true, and the comment at
 * verify-provider/actions.ts says it outright: "full is only set when admin
 * approves". Level 'id' means documents submitted, awaiting review. Deriving
 * from <> 'none' would have turned the public verified badge on for anyone who
 * uploaded a document, and for anyone who verified only a phone number.
 *
 * WHAT THIS GUARDS
 *
 *   1. no application code writes profiles.is_verified -- a generated column
 *      rejects the write (SQLSTATE 428C9), so a reintroduced write is a runtime
 *      failure on the admin approval path, which is exactly where it must not
 *      fail
 *   2. the migration derives from 'full', not from <> 'none'
 *   3. the other two is_verified columns are untouched -- they are different
 *      concepts and their writers must keep working
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

/** Strip comments, so prose ABOUT the defect does not read as the defect. */
function stripTsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

/**
 * Writes to `table` in `source`, as {head, chain} pairs.
 *
 * Deliberately a local copy rather than a shared import. jest's testMatch here
 * is `**\/__tests__\/**\/*.[jt]s?(x)`, so any .ts file placed beside these
 * suites is collected AS a suite and fails for containing no tests; and the
 * alternative, a shipped src/test-utils, puts test tooling in the bundle. The
 * repo already carries this duplication -- provider-activation-privilege.test.ts
 * has updateChains(), identity-provider-profile.test.ts has writeSites().
 *
 * Chains are found by line, not by splitting on ';': several files in this repo
 * rely on ASI (callback/route.ts carried 2 semicolons across 281 lines before
 * prettier reached it), and a semicolon-split returns whole files as single
 * statements.
 */
function writeChains(source: string, table: string): string[] {
  const lines = stripTsComments(source).split("\n");
  const needles = [`.from("${table}")`, `.from('${table}')`];
  const chains: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (!needles.some((n) => lines[i].includes(n))) continue;

    // The fluent chain, plus the object literal that precedes it when the
    // payload is built as a named const.
    let chain = lines[i].trim();
    let k = i + 1;
    while (
      k < lines.length &&
      /^[.)\s}{]|^\w+:/.test(lines[k].trim()) &&
      k - i < 25
    ) {
      chain += " " + lines[k].trim();
      if (
        /\.(eq|neq|in|single|maybeSingle|select)\(/.test(lines[k]) &&
        k > i + 1
      )
        break;
      k++;
    }
    if (!/\.(insert|update|upsert)\(/.test(chain)) continue;
    chains.push(chain);
  }
  return chains;
}

const PROFILE_WRITERS = [
  "src/lib/services/admin-verification.ts",
  "src/app/dashboard/verify-provider/actions.ts",
  "src/app/dashboard/verify-provider/page.tsx",
  "src/app/(auth)/signup/page.tsx",
  "src/app/auth/callback/route.ts",
];

const MIGRATION =
  "supabase/migrations/20260344000000_verification_single_source.sql";

// ===========================================================================
// 1. Nothing writes the generated column
// ===========================================================================

describe("profiles.is_verified is never written by application code", () => {
  it.each(PROFILE_WRITERS)("%s writes no is_verified to profiles", (file) => {
    const offenders = writeChains(read(file), "profiles").filter((c) =>
      /\bis_verified\s*:/.test(c),
    );
    expect(offenders).toEqual([]);
  });

  it("no file anywhere writes is_verified to profiles", () => {
    const offenders: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(path.join(root, dir), {
        withFileTypes: true,
      })) {
        const rel = `${dir}/${entry.name}`;
        if (entry.isDirectory()) {
          if (entry.name === "__tests__") continue;
          walk(rel);
        } else if (/\.(ts|tsx)$/.test(entry.name)) {
          for (const chain of writeChains(read(rel), "profiles")) {
            if (/\bis_verified\s*:/.test(chain)) offenders.push(rel);
          }
        }
      }
    };
    walk("src");
    expect(offenders).toEqual([]);
  });

  it("the four sites still write verification_level — the derivation's input", () => {
    // Without this, the suite above could be satisfied by deleting the
    // verification logic entirely rather than by deriving the flag.
    const levelWriters = PROFILE_WRITERS.filter((f) =>
      writeChains(read(f), "profiles").some((c) =>
        /\bverification_level\s*:/.test(c),
      ),
    );
    expect(levelWriters.length).toBeGreaterThanOrEqual(3);
  });
});

// ===========================================================================
// 2. The migration derives from the right threshold
// ===========================================================================

describe("the derivation threshold is 'full', not 'none'", () => {
  const sql = () => read(MIGRATION);

  it("declares a STORED generated column", () => {
    expect(sql()).toMatch(/GENERATED\s+ALWAYS\s+AS\s*\([\s\S]*?\)\s*STORED/i);
  });

  it("derives from equality with 'full'", () => {
    const m = /GENERATED\s+ALWAYS\s+AS\s*\(([\s\S]*?)\)\s*STORED/i.exec(sql());
    expect(m).not.toBeNull();
    const expr = (m as RegExpExecArray)[1];
    expect(expr).toContain("'full'");
    expect(expr).toContain("verification_level");
  });

  it("does NOT derive from <> 'none' — that would badge submitted documents", () => {
    const m = /GENERATED\s+ALWAYS\s+AS\s*\(([\s\S]*?)\)\s*STORED/i.exec(sql());
    const expr = (m as RegExpExecArray)[1];
    expect(expr).not.toMatch(/<>\s*'none'/);
    expect(expr).not.toMatch(/!=\s*'none'/);
  });

  it("COALESCEs, because verification_level is nullable", () => {
    // NULL = 'full' is NULL, not false, and the listing and dashboard code read
    // is_verified as a boolean.
    const m = /GENERATED\s+ALWAYS\s+AS\s*\(([\s\S]*?)\)\s*STORED/i.exec(sql());
    expect((m as RegExpExecArray)[1]).toMatch(/COALESCE/i);
  });

  it("recreates profiles_public with the same four columns", () => {
    // ALTER TABLE ... DROP COLUMN is refused while the view selects the column,
    // so the view must be dropped and rebuilt. Shrinking or widening its
    // projection here would change what is published to anonymous visitors.
    const s = sql();
    expect(s).toMatch(/DROP\s+VIEW\s+IF\s+EXISTS\s+public\.profiles_public/i);
    expect(s).toMatch(
      /CREATE\s+OR\s+REPLACE\s+VIEW\s+public\.profiles_public/i,
    );
    expect(s).toMatch(/security_invoker\s*=\s*false/i);
    for (const col of ["id", "full_name", "avatar_url", "is_verified"]) {
      expect(s).toContain(`p.${col}`);
    }
    // The columns the original read-scope defect exposed must not reappear.
    const body = s.slice(s.search(/CREATE\s+OR\s+REPLACE\s+VIEW/i));
    const projection = body.slice(0, body.search(/FROM\s+public\.profiles/i));
    for (const forbidden of [
      "email",
      "phone",
      "metadata",
      "verification_level",
    ]) {
      expect(projection).not.toContain(forbidden);
    }
  });
});

// ===========================================================================
// 3. The sibling columns are different concepts and stay untouched
// ===========================================================================

describe("the other is_verified columns are not conflated", () => {
  it("the migration touches only profiles", () => {
    const s = read(MIGRATION);
    expect(s).not.toMatch(/ALTER\s+TABLE\s+public\.user_roles/i);
    expect(s).not.toMatch(/ALTER\s+TABLE\s+public\.service_providers/i);
  });

  it("user_roles.is_verified is still written — it is role approval", () => {
    // onboarding upserts it; if that write disappeared, role approval would
    // have been silently folded into identity verification.
    const onboarding = read(
      "src/app/(auth)/onboarding/provider-type/actions.ts",
    );
    expect(writeChains(onboarding, "user_roles").join(" ")).toMatch(
      /is_verified/,
    );
  });

  it("service_providers.is_verified is still written — it is the business", () => {
    const admin = read("src/lib/services/admin-verification.ts");
    expect(writeChains(admin, "service_providers").join(" ")).toMatch(
      /is_verified/,
    );
  });
});

// ===========================================================================
// The guard on the guard
// ===========================================================================

describe("this suite can fail", () => {
  it("detects an is_verified write to profiles", () => {
    const poisoned = `const { error } = await admin.from("profiles").update({ verification_level: "full", is_verified: true })`;
    const chains = writeChains(poisoned, "profiles");
    expect(chains.length).toBe(1);
    expect(chains.some((c) => /\bis_verified\s*:/.test(c))).toBe(true);
  });

  it("does not fire on a comment mentioning is_verified", () => {
    const commented = `// is_verified: true\nconst { error } = await admin.from("profiles").update({ verification_level: "full" })`;
    const chains = writeChains(commented, "profiles");
    expect(chains.some((c) => /\bis_verified\s*:/.test(c))).toBe(false);
  });

  it("rejects a <> 'none' derivation", () => {
    const wrong = "GENERATED ALWAYS AS (verification_level <> 'none') STORED";
    const m = /GENERATED\s+ALWAYS\s+AS\s*\(([\s\S]*?)\)\s*STORED/i.exec(wrong);
    expect((m as RegExpExecArray)[1]).toMatch(/<>\s*'none'/);
  });

  it("reads real files", () => {
    expect(read(MIGRATION)).toContain("GENERATED ALWAYS AS");
    expect(() => read("supabase/migrations/nope.sql")).toThrow();
  });
});
