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
    // Either form defines it. 20260335000000 uses DROP + CREATE because a
    // later migration adds a column, and CREATE OR REPLACE VIEW cannot shrink a
    // view on replay.
    expect(sql).toMatch(
      /create\s+(?:or\s+replace\s+)?view\s+public\.profiles_public/i,
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
   * DISCOVERY, not a hardcoded list.
   *
   * The first version of this block named three files. That is precisely how
   * the fourth shipped broken: src/lib/listings/get-listing.ts embedded
   * `profiles:landlord_id (...)` on the RLS client, the dropped policy made it
   * resolve to null, and the landlord card went blank on every listing page
   * with nothing logged. A guard that enumerates the known cases cannot find
   * the unknown one.
   *
   * So these two tests sweep all of src instead.
   */

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

  const RLS_CLIENT = /@\/lib\/supabase\/(server|client)/;
  const ADMIN_CLIENT = /@\/lib\/supabase\/admin/;

  it("no RLS-bound client reads ANOTHER user's profiles row", () => {
    // Own-row reads through the cookie-scoped client are correct and must keep
    // working -- that is what the surviving `auth.uid() = id` policy is for,
    // and login, signup and every dashboard depends on it. What must not exist
    // is an RLS-bound read filtered by someone ELSE's id, because the policy
    // that used to permit it is gone and the read now returns nothing.
    //
    // `.from("profiles")` on an admin receiver is also fine: service_role
    // bypasses RLS by design.
    //
    // The rule: within the call's filter window, the id must come from the
    // authenticated user. An id taken off another record -- reviewer_id,
    // landlord_id, customer_id -- is a cross-user read. No id filter at all
    // means the query reads every row it can see.
    const OWN_IDENTITY =
      /\b(user\??\.id|data\??\.user\??\.id|session\??\.user\??\.id|user_id|uid|userId|existingUserId|currentUserId|authUserId)\b/;
    const FOREIGN_REFERENCE =
      /\b\w*(reviewer|landlord|customer|provider|payer|sender|recipient|tenant|owner|blocked|blocker)_id\b/;

    const offenders: string[] = [];

    for (const file of sourceFiles("src")) {
      if (file.includes("__tests__")) continue;
      const code = stripTsComments(read(file));
      const lines = code.split("\n");

      for (const [i, line] of lines.entries()) {
        const m = /([A-Za-z_$][\w$]*)\s*$/.exec(
          lines
            .slice(Math.max(0, i - 1), i + 1)
            .join(" ")
            .replace(/\.from\([^)]*\)[\s\S]*$/, ""),
        );
        if (!/\.from\(\s*["']profiles["']\s*\)/.test(line)) continue;

        // resolve the receiver: this line or the one above it
        const receiverSrc = (lines[i - 1] ?? "") + " " + line;
        const recv =
          /([A-Za-z_$][\w$]*)\s*\.?\s*$|await\s+([A-Za-z_$][\w$]*)/.exec(
            receiverSrc.split(".from(")[0],
          );
        const receiver = (recv?.[1] || recv?.[2] || m?.[1] || "").trim();
        if (/admin/i.test(receiver) || /admin/i.test(receiverSrc)) continue;

        const window = lines.slice(i, i + 10).join("\n");

        // Writes are a different bug class (an ungranted column in the payload)
        // and are covered by client_write_surface_test.sql. An insert has no id
        // filter by nature, so leaving them in here only produces noise.
        if (/\.(insert|update|upsert|delete)\(/.test(window)) continue;

        const idFilter = /\.(eq|in)\(\s*["']id["']\s*,\s*([^)]+)\)/.exec(
          window,
        );

        if (!idFilter) {
          offenders.push(
            `${file}:${i + 1} RLS read of profiles with no id filter`,
          );
        } else if (
          FOREIGN_REFERENCE.test(idFilter[2]) ||
          !OWN_IDENTITY.test(idFilter[2])
        ) {
          offenders.push(
            `${file}:${i + 1} RLS read of profiles filtered by ${idFilter[2].trim()} (not the caller)`,
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });

  it("no PostgREST embed of profiles reaches an RLS-bound client", () => {
    // An embed is the dangerous shape: RLS filters it to null instead of
    // raising, so the page renders blank and nothing is logged. That is exactly
    // how the landlord card broke.
    //
    // The first version of this check matched `alias:profiles` and `profiles!`
    // but NOT `profiles:landlord_id(...)` -- the colon comes AFTER the table
    // name in that form. Restoring the real defect left the suite green, so the
    // guard was decorative. Mutation testing is the only reason that was found.
    //
    // It now scans INSIDE `.select()` arguments, which is where an embed can
    // actually live. That also stops a TypeScript field called `profiles` from
    // reading as an embed.
    const selectArg = /\.select\(\s*(`[^`]*`|"[^"]*"|'[^']*')/g;
    // profiles( | profiles!fk( | profiles:column( | alias:profiles(
    const profilesEmbed = /\bprofiles\b\s*(?:!\s*\w+)?\s*(?::\s*\w+\s*)?\(/;

    const offenders: string[] = [];

    for (const file of sourceFiles("src")) {
      if (file.includes("__tests__")) continue;
      const code = stripTsComments(read(file));

      for (const m of code.matchAll(selectArg)) {
        const arg = m[1];
        if (!profilesEmbed.test(arg)) continue;

        // Allowed only where the module's sole Supabase client is the admin
        // one, because service_role bypasses RLS and the embed resolves.
        const usesRls = /@\/lib\/supabase\/(server|client)/.test(code);
        const usesAdmin = /@\/lib\/supabase\/admin/.test(code);
        if (usesRls || !usesAdmin) {
          offenders.push(
            `${file}: embeds profiles in a .select() while importing ${
              usesRls ? "an RLS client" : "no admin client"
            }`,
          );
        }
      }
    }

    expect(offenders).toEqual([]);
  });
});

describe("the view's column list is respected", () => {
  const PROJECTED = new Set(["id", "full_name", "avatar_url", "is_verified"]);

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

  it("the SQL view projects exactly the columns the app selects", () => {
    // The LAST migration that defines the view wins, not a migration matched by
    // name. This assertion used to read 20260335000000 specifically, so it kept
    // checking the original three-column projection and could never see a
    // later redefinition -- the same enumerate-the-known-cases mistake that let
    // the landlord read ship broken.
    const defining = migrationFiles().filter((f) =>
      /create\s+(?:or\s+replace\s+)?view\s+public\.profiles_public/i.test(
        stripSqlComments(read(path.join(MIGRATIONS_DIR, f))),
      ),
    );
    expect(defining.length).toBeGreaterThan(0);
    const fix = defining[defining.length - 1];
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
      "verification_level",
    ]) {
      expect(select.toLowerCase()).not.toContain(forbidden);
    }
  });
});
