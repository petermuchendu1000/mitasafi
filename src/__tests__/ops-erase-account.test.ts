/**
 * scripts/ops/erase-account.mjs — the parts a database cannot check.
 *
 * The SQL function is covered by supabase/tests/account_erasure_test.sql (28
 * assertions against a fully-populated account). What that cannot cover is the
 * operator script wrapped around it, and the script has one real structural
 * weakness: it RESTATES the migration's classification of tables in order to
 * show a preview. If erase_account changes and the script does not, the preview
 * becomes a lie about an irreversible operation — the worst possible kind of
 * stale comment, because an operator reads it to decide whether to proceed.
 *
 * So these tests pin the two lists against the migration's actual text, and pin
 * the safety properties that make the script safe to hand to someone.
 *
 * Read as source text rather than imported: these are .mjs operator scripts
 * that open a network client at module scope, and the house style for "the code
 * says what it should" is already a source scan (see identity-roles.test.ts).
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const SCRIPT = "scripts/ops/erase-account.mjs";
const GRANT = "scripts/ops/grant-admin.mjs";
const LIB = "scripts/ops/_lib.mjs";
const MIGRATION = "supabase/migrations/20260353000000_account_erasure.sql";

const script = read(SCRIPT);
const grant = read(GRANT);
const lib = read(LIB);
const migration = read(MIGRATION);

/**
 * Remove the CONTENTS of string literals, keeping the quotes.
 *
 * Without this the leak scan below fires on
 *   console.error("... SUPABASE_SERVICE_ROLE_KEY holds the service-role key")
 * which names the variable in a help message and leaks nothing. A guard that
 * trips on its own documentation is a guard that gets deleted, so it is made
 * precise instead: only a bare `key` IDENTIFIER reaching a console call counts.
 */
const stripStrings = (s: string) =>
  s
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/`(?:[^`\\]|\\.)*`/g, "``");

/** The array literal assigned to `name` in the script, as string entries. */
function arrayLiteral(src: string, name: string): string[] {
  const m = new RegExp(`const ${name} = \\[([\\s\\S]*?)\\n\\];`).exec(src);
  if (!m) throw new Error(`${name} not found`);
  return [...m[1].matchAll(/"([a-z_]+)"/g)].map((x) => x[1]);
}

describe("the preview matches what erase_account actually does", () => {
  it("every table the script says is DELETED is deleted by the migration", () => {
    for (const t of arrayLiteral(script, "DELETED_OWN_ONLY")) {
      // The migration deletes each by user_id. If one is dropped from the
      // function, the script would keep promising to destroy it.
      expect(migration).toMatch(
        new RegExp(`DELETE FROM public\\.${t}\\s+WHERE user_id = p_user_id;`),
      );
    }
  });

  it("the script's DELETED list is not missing a table the migration deletes", () => {
    const declared = new Set(arrayLiteral(script, "DELETED_OWN_ONLY"));
    const actual = [
      ...migration.matchAll(
        /DELETE FROM public\.([a-z_]+)\s+WHERE user_id = p_user_id;/g,
      ),
    ].map((m) => m[1]);
    expect(actual.length).toBeGreaterThan(0);
    const missing = actual.filter((t) => !declared.has(t));
    // A table the function destroys but the preview never mentions is the
    // dangerous direction: the operator approves less than actually happens.
    expect(missing).toEqual([]);
  });

  it("every table the script calls RETAINED is counted as retained by the migration", () => {
    const m = /const RETAINED = \[([\s\S]*?)\n\];/.exec(script);
    expect(m).not.toBeNull();
    const pairs = [...m![1].matchAll(/\["([a-z_]+)", "([a-z_]+)"/g)];
    expect(pairs.length).toBeGreaterThanOrEqual(7);
    for (const [, table, column] of pairs) {
      expect(migration).toMatch(
        new RegExp(`FROM public\\.${table} WHERE ${column} = p_user_id`),
      );
    }
  });

  it("locations is in neither list, because it is in both categories", () => {
    // It is deleted when unreferenced and retained-but-scrubbed when a booking
    // froze it. Putting it in either flat list would make the preview wrong
    // half the time, so the script computes it from bookings instead.
    expect(arrayLiteral(script, "DELETED_OWN_ONLY")).not.toContain("locations");
    expect(script).toMatch(/\.in\("service_location_id", locIds\)/);
  });
});

describe("safe by default", () => {
  it("the RPC is only ever called behind --execute", () => {
    const call = script.indexOf('rpc("erase_account"');
    expect(call).toBeGreaterThan(-1);
    // The early return for a preview must come before the call, textually and
    // in control flow. Both the guard and its placement are asserted.
    const guard = script.indexOf("if (!args.execute) {");
    expect(guard).toBeGreaterThan(-1);
    expect(guard).toBeLessThan(call);
  });

  it("there is no --dry-run flag to forget", () => {
    // Previewing is the default. A --dry-run flag would imply the opposite
    // default and is exactly the thing an operator forgets at 2am.
    expect(script).not.toMatch(/"--dry-run"/);
  });

  it("refuses an account that never requested erasure, unless overridden", () => {
    expect(script).toMatch(/if \(!requestedAt && !args\.noRequestRequired\)/);
    expect(script).toMatch(/process\.exit\(3\)/);
    // and the override is recorded in the stored reason, not just honoured
    expect(script).toMatch(/no prior request; --no-request-required/);
  });

  it("verifies the outcome by reading back rather than trusting the return", () => {
    expect(script).toMatch(
      /const after = await resolveUser\(db, \{ userId: user\.id \}\)/,
    );
    expect(script).toMatch(/after\.full_name === "Erased account"/);
  });

  it("requires a non-blank reason", () => {
    expect(script).toMatch(/if \(!args\.reason \|\| !args\.reason\.trim\(\)\)/);
  });
});

describe("the service-role key cannot leak", () => {
  const sources: Array<[string, string]> = [
    [SCRIPT, script],
    [GRANT, grant],
    [LIB, lib],
  ];

  it("no script prints, logs or interpolates the key", () => {
    for (const [name, src] of sources) {
      // Any appearance of the key variable inside a console call, or any
      // template interpolation of it, is a leak.
      const bad = [
        ...stripStrings(src).matchAll(
          /console\.[a-z]+\([^)]*\b(key|serviceKey)\b/g,
        ),
      ];
      expect(`${name}: ${bad.map((b) => b[0]).join(" | ")}`).toBe(`${name}: `);
      expect(src).not.toMatch(/\$\{key\}/);
      // Reporting a prefix or a length narrows a key just as surely.
      expect(src).not.toMatch(/key\.slice\(|key\.substring\(|key\.length/);
    }
  });

  it("the key is never read from argv", () => {
    for (const [name, src] of sources) {
      expect(`${name}:${/--key|--service-role/.test(src)}`).toBe(
        `${name}:false`,
      );
    }
  });

  it("credential handling exists once, not once per script", () => {
    // Extracted into _lib.mjs when the second operator script needed it. Two
    // copies would be two places for one of the rules above to be dropped.
    expect(lib).toMatch(/export function credentials\(\)/);
    for (const [name, src] of [
      [SCRIPT, script],
      [GRANT, grant],
    ] as Array<[string, string]>) {
      expect(`${name}:${/function credentials\(\)/.test(src)}`).toBe(
        `${name}:false`,
      );
      expect(src).toMatch(/from "\.\/_lib\.mjs"/);
    }
  });

  it("no script depends on a dotenv package to parse the file", () => {
    // A dependency that decides to log what it parsed would leak the key, and
    // this is not a place to discover that.
    for (const [name, src] of sources) {
      expect(`${name}:${/require\(.dotenv.\)|from "dotenv"/.test(src)}`).toBe(
        `${name}:false`,
      );
    }
  });
});

describe("this suite can fail", () => {
  // The guard on the guard: these assertions are regex over source text, which
  // is exactly the kind that silently stops matching. Each checks its own
  // detector against a string that must match and one that must not.
  it("the DELETED-list extractor really extracts", () => {
    expect(arrayLiteral(script, "DELETED_OWN_ONLY")).toContain("notifications");
    expect(arrayLiteral(script, "DELETED_OWN_ONLY")).not.toContain("bookings");
  });

  it("the leak detector matches a real leak but not a mention of one", () => {
    const re = /console\.[a-z]+\([^)]*\b(key|serviceKey)\b/;
    // a genuine leak: the identifier reaches the console
    expect(re.test(stripStrings('console.log("k", key);'))).toBe(true);
    // not a leak: the words only appear inside a string
    expect(
      re.test(
        stripStrings('console.error("SUPABASE_SERVICE_ROLE_KEY is the key");'),
      ),
    ).toBe(false);
    expect(re.test(stripStrings('console.log("done");'))).toBe(false);
  });
});
