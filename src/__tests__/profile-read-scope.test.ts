/**
 * Profile read scope.
 *
 * `profiles` carried `profiles_public_read FOR SELECT TO authenticated
 * USING (true)`. RLS is row-level: it cannot restrict columns, and SELECT was
 * granted on all 11 columns. So one throwaway signup could read
 *
 *     select email, phone, metadata from profiles
 *
 * for every user on the platform. Measured against the live project before the
 * fix: another user's email, phone and metadata blob were all readable.
 *
 * 20260335000000_scope_profile_reads.sql drops that policy and adds
 * `profiles_public`, a three-column projection (id, full_name, avatar_url)
 * scoped to rows the caller is already entitled to see.
 *
 * These tests are textual on purpose. The property being protected lives in
 * the SQL and in which relation each call site names -- it is not observable
 * by calling a function, and the behavioural half is covered by
 * supabase/tests/profile_read_scope_test.sql, which needs a database.
 *
 * What this guards:
 *   1. no migration re-creates a blanket SELECT policy on profiles
 *   2. the three cross-user reads keep naming the view, not the table
 *   3. nothing selects a column from the view that the view does not project
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

/**
 * Strip TS/JS comments. Without this, a comment EXPLAINING the defect reads as
 * the defect -- which is how the first version of this file failed: it matched
 * its own prose in bookings.ts. A check that fires on documentation is worse
 * than no check, because the fix is to delete the explanation.
 */
function stripTsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const MIGRATIONS_DIR = "supabase/migrations";

/** Strip SQL comments so prose about the defect is not mistaken for the defect. */
function stripSqlComments(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/--.*$/, ""))
    .join("\n");
}

function migrationFiles(): string[] {
  return fs
    .readdirSync(path.join(root, MIGRATIONS_DIR))
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

describe("no migration re-opens a blanket read on profiles", () => {
  it("creates no permissive SELECT policy on profiles", () => {
    const offenders: string[] = [];

    for (const file of migrationFiles()) {
      const sql = stripSqlComments(read(path.join(MIGRATIONS_DIR, file)));

      // CREATE POLICY ... ON [public.]profiles ... USING (true)
      const createPolicy =
        /create\s+policy\s+[\s\S]*?\son\s+(?:public\.)?profiles\b[\s\S]*?using\s*\(\s*true\s*\)/gi;
      if (createPolicy.test(sql)) {
        offenders.push(
          `${file}: CREATE POLICY ... ON profiles ... USING (true)`,
        );
      }

      // Re-creating the exact policy by name is also a regression, whatever
      // its predicate: the name is load-bearing in the audit trail.
      if (/create\s+policy\s+"?profiles_public_read"?/i.test(sql)) {
        const dropsItAgain = new RegExp(
          "drop\\s+policy[\\s\\S]{0,120}profiles_public_read",
          "i",
        ).test(sql);
        const createdAfterDrop =
          sql.toLowerCase().lastIndexOf("create policy profiles_public_read") >
          sql.toLowerCase().lastIndexOf("drop policy");
        if (!dropsItAgain || createdAfterDrop) {
          offenders.push(`${file}: re-creates profiles_public_read`);
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the migration that drops it is still present", () => {
    const files = migrationFiles();
    const fix = files.find((f) => f.includes("scope_profile_reads"));
    expect(fix).toBeDefined();

    const sql = stripSqlComments(
      read(path.join(MIGRATIONS_DIR, fix as string)),
    );
    expect(sql).toMatch(
      /drop\s+policy\s+if\s+exists\s+profiles_public_read\s+on\s+public\.profiles/i,
    );
    expect(sql).toMatch(
      /create\s+or\s+replace\s+view\s+public\.profiles_public/i,
    );

    // Read-only by grant. A single-table view is auto-updatable and runs with
    // owner rights, so an INSERT/UPDATE through it would bypass RLS on the
    // base table entirely.
    expect(sql).toMatch(/revoke\s+all\s+on\s+public\.profiles_public/i);
    expect(sql).toMatch(
      /grant\s+select\s+on\s+public\.profiles_public\s+to\s+anon,\s*authenticated/i,
    );
    expect(sql).not.toMatch(
      /grant\s+(all|insert|update|delete)\s+on\s+public\.profiles_public/i,
    );
  });
});

describe("cross-user profile reads go through the view", () => {
  /**
   * Every read in the app that resolves ANOTHER user's profile under RLS.
   * Each is a public or semi-public surface that needs a display name and
   * nothing else. If one of these reverts to `from("profiles")` it starts
   * depending on a blanket policy again -- and silently returns nothing once
   * that policy is gone, which is the quieter failure of the two.
   */
  const CROSS_USER_READS: { file: string; what: string }[] = [
    {
      file: "src/lib/services/reviews.ts",
      what: "review author names (public provider page)",
    },
    {
      file: "src/lib/services/providers.ts",
      what: "review author names (public provider page)",
    },
    {
      file: "src/lib/services/bookings.ts",
      what: "customer names on a provider's bookings list",
    },
  ];

  it.each(CROSS_USER_READS)(
    "$file reads profiles_public for $what",
    ({ file }) => {
      const code = stripTsComments(read(file));
      expect(code).toMatch(/\.from\(\s*["']profiles_public["']\s*\)/);

      // ...and must not reach the base table through an RLS-BOUND client.
      //
      // `.from("profiles")` on an admin / service_role client is fine: it
      // bypasses RLS by design and these files use it for server-side work such
      // as resolving the acting user's own name for a notification. What must
      // not come back is a read through the cookie-scoped `supabase` client,
      // because that is the read the blanket policy was propping up.
      const rlsBoundReads = [
        ...code.matchAll(
          /([A-Za-z_$][\w$]*)\s*\n?\s*\.from\(\s*["']profiles["']\s*\)/g,
        ),
      ].filter((m) => !/admin/i.test(m[1]));
      expect(rlsBoundReads.map((m) => m[0].trim())).toEqual([]);
    },
  );

  it("no cross-user read embeds profiles through a PostgREST join", () => {
    // `customer:profiles!customer_id (full_name)` reads the TABLE under RLS.
    // It only ever worked because of the blanket policy.
    for (const { file } of CROSS_USER_READS) {
      const code = stripTsComments(read(file));
      expect(code).not.toMatch(/:\s*profiles\s*!/);
    }
  });
});

describe("the view's column list is respected", () => {
  const PROJECTED = new Set(["id", "full_name", "avatar_url"]);

  function sourceFiles(dir: string, acc: string[] = []): string[] {
    for (const entry of fs.readdirSync(path.join(root, dir), {
      withFileTypes: true,
    })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) sourceFiles(rel, acc);
      else if (/\.(ts|tsx)$/.test(entry.name)) acc.push(rel);
    }
    return acc;
  }

  it("selects only columns profiles_public actually projects", () => {
    const offenders: string[] = [];
    // .from("profiles_public") ... .select("a, b, c")
    const pattern =
      /\.from\(\s*["']profiles_public["']\s*\)\s*\n?\s*\.select\(\s*["']([^"']+)["']/g;

    for (const file of sourceFiles("src")) {
      const source = stripTsComments(read(file));
      for (const match of source.matchAll(pattern)) {
        for (const raw of match[1].split(",")) {
          const col = raw.trim();
          if (col && !PROJECTED.has(col)) {
            offenders.push(`${file}: profiles_public has no column "${col}"`);
          }
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("the SQL view really does project exactly those three columns", () => {
    const files = migrationFiles();
    const fix = files.find((f) => f.includes("scope_profile_reads")) as string;
    const sql = stripSqlComments(read(path.join(MIGRATIONS_DIR, fix)));

    const body = sql.slice(sql.toLowerCase().indexOf("create or replace view"));
    const select = body.slice(
      body.toLowerCase().indexOf("select"),
      body.toLowerCase().indexOf("from public.profiles"),
    );
    const columns = select
      .replace(/^select/i, "")
      .split(",")
      .map((c) => c.trim().replace(/^p\./, ""))
      .filter(Boolean);

    expect(new Set(columns)).toEqual(PROJECTED);
    // The columns the defect exposed must not reappear in the projection.
    for (const forbidden of [
      "email",
      "phone",
      "metadata",
      "is_verified",
      "verification_level",
    ]) {
      expect(select.toLowerCase()).not.toContain(forbidden);
    }
  });
});
