/**
 * Provisioning an identity is one call, and its failure is not swallowed.
 *
 * THE DEFECT
 *
 * Nothing in the database created a profile — no trigger on auth.users, no
 * function that inserted one. Provisioning was application-only and
 * non-atomic. src/app/auth/callback/route.ts ran three sequential writes, each
 * logged-and-continued:
 *
 *     profiles insert, user_roles insert, service_providers insert
 *
 * A failure on the first made the second fail by foreign key, while the third
 * succeeded anyway because service_providers.user_id had no FK at all — so a
 * half-failed signup left no profile, no role, and a provider row with a
 * dangling user_id. 20260345000000 closed that third hole; 20260346000000
 * closes the first two with provision_identity().
 *
 * Thirty-nine foreign keys now reference profiles.id. A signed-in user with no
 * profile row cannot be booked, cannot be paid, cannot hold a role and cannot
 * appear in profiles_public — and the old code redirected them into a dashboard
 * without telling anyone.
 *
 * WHAT THIS GUARDS, AND WHAT IT DOES NOT
 *
 * These are properties of the FILES: which call each site makes, and whether a
 * failure stops the flow. The function's BEHAVIOUR — atomicity, idempotency,
 * the admin refusal, the anon refusal — cannot be observed without a live
 * Postgres carrying the real policies, and is covered by
 * supabase/tests/provision_identity_test.sql, which asserts 11 properties
 * against the real authenticated role.
 */

import fs from "fs";
import path from "path";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

function stripTsComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((line) => line.replace(/\/\/.*$/, ""))
    .join("\n");
}

const CALLBACK = "src/app/auth/callback/route.ts";
const SIGNUP = "src/app/(auth)/signup/page.tsx";
const MIGRATION = "supabase/migrations/20260346000000_provision_identity.sql";
const SUITE = "supabase/tests/provision_identity_test.sql";

/** The provisioning sites: both create a profile for a brand-new user. */
const PROVISIONING_SITES = [CALLBACK, SIGNUP];

describe("provisioning goes through provision_identity", () => {
  it.each(PROVISIONING_SITES)("%s calls the RPC", (file) => {
    // Whitespace-tolerant: prettier splits `.rpc(` and its first argument onto
    // separate lines, so a contiguous substring match fails on formatted code.
    expect(stripTsComments(read(file))).toMatch(
      /\.rpc\(\s*["']provision_identity["']/,
    );
  });

  it.each(PROVISIONING_SITES)("%s inserts no profiles row directly", (file) => {
    const code = stripTsComments(read(file));
    // A direct insert here is the defect: it cannot be atomic with the role.
    const lines = code.split("\n");
    const offenders: string[] = [];
    for (let i = 0; i < lines.length; i++) {
      if (!/\.from\(\s*["']profiles["']\s*\)/.test(lines[i])) continue;
      let chain = lines[i].trim();
      let k = i + 1;
      while (k < lines.length && lines[k].trim().startsWith(".")) {
        chain += " " + lines[k].trim();
        k++;
      }
      if (/\.insert\(/.test(chain)) offenders.push(`${file}:${i + 1}`);
    }
    expect(offenders).toEqual([]);
  });

  /**
   * The body of the `if (<name>)` block that handles a failure.
   *
   * Anchored on the IF, not on the first mention of the variable: the first
   * mention is the destructure of the rpc result, and a fixed-size window from
   * there lands in the argument list rather than in the handler.
   */
  function errorBlock(code: string, name: string): string {
    const idx = code.indexOf(`if (${name})`);
    if (idx === -1) return "";
    return code.slice(idx, idx + 600);
  }

  it("the callback stops the flow when provisioning fails", () => {
    // The original logged the error and carried on to redirect the user into a
    // dashboard with no profile. The error branch must now leave the happy
    // path.
    const block = errorBlock(stripTsComments(read(CALLBACK)), "provisionError");
    expect(block).not.toBe("");
    expect(block).toMatch(/NextResponse\.redirect/);
    expect(block).toMatch(/return\s+response/);
    expect(block).toMatch(/provisioning_failed/);
  });

  it("signup stops the flow when provisioning fails", () => {
    const block = errorBlock(stripTsComments(read(SIGNUP)), "provisionError");
    expect(block).not.toBe("");
    expect(block).toMatch(/setError\(/);
    expect(block).toMatch(/return;/);
  });

  it("addRoleToUser is an upsert, so the flow is re-runnable", () => {
    // provision_identity may already have created the same row moments
    // earlier, and user_roles carries UNIQUE (user_id, role), so a plain
    // insert would fail 23505 on the happy path.
    //
    // Sliced to the whole function, not to the first "};" — that terminator
    // closes the roleInsert payload object, which sits BEFORE the write, so a
    // shorter slice never reaches the statement under test and the assertion
    // could not fail for the defect.
    const code = stripTsComments(read(SIGNUP));
    const start = code.indexOf("const addRoleToUser");
    expect(start).toBeGreaterThan(-1);
    const body = code.slice(start, start + 900);
    expect(body).toMatch(/\.upsert\(/);
    expect(body).toMatch(/onConflict/);
    expect(body).not.toMatch(/\.insert\(/);
  });
});

describe("the function is not SECURITY DEFINER", () => {
  const sql = () => read(MIGRATION);

  it("declares SECURITY INVOKER by omitting DEFINER", () => {
    // relock_definer_surface revokes client EXECUTE from every client-callable
    // SECURITY DEFINER function in public and guards that invariant, and
    // client_write_surface_test.sql asserts it. A DEFINER function here would
    // be revoked on that migration's next apply and every caller would break.
    //
    // Scoped to the CREATE FUNCTION HEADER — between the CREATE and the body
    // delimiter — rather than to the whole file. The guard inside this same
    // migration RAISEs a message containing the words "SECURITY DEFINER", and
    // that is a string literal, not a comment, so stripping comments does not
    // remove it. A whole-file match therefore fails on the migration's own
    // error message, which is the documentation-reads-as-defect trap again.
    const body = sql().replace(/--[^\n]*/g, "");
    const start = body.search(
      /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+public\.provision_identity/i,
    );
    expect(start).toBeGreaterThan(-1);
    const header = body.slice(start, body.indexOf("$function$", start));
    expect(header).not.toMatch(/SECURITY\s+DEFINER/i);
    // And the header is where the real declaration would be, so it must still
    // carry the things that matter.
    expect(header).toMatch(/SET\s+search_path\s*=/i);
    expect(header).toMatch(/RETURNS\s+jsonb/i);
  });

  it("guards against becoming DEFINER later", () => {
    expect(sql()).toMatch(/prosecdef/i);
  });

  it("revokes from anon EXPLICITLY, not just from PUBLIC", () => {
    // This project sets ALTER DEFAULT PRIVILEGES granting EXECUTE on new
    // functions to anon, authenticated and service_role DIRECTLY. Those are not
    // grants via PUBLIC, so REVOKE ... FROM PUBLIC leaves them. The first
    // version of the migration missed this and its own guard caught it on a
    // dry run.
    const body = sql().replace(/--[^\n]*/g, "");
    expect(body).toMatch(
      /REVOKE\s+ALL\s+ON\s+FUNCTION[\s\S]{0,200}FROM\s+PUBLIC,\s*anon/i,
    );
    expect(body).toMatch(
      /GRANT\s+EXECUTE\s+ON\s+FUNCTION[\s\S]{0,200}TO\s+authenticated/i,
    );
  });

  it("pins search_path", () => {
    expect(sql().replace(/--[^\n]*/g, "")).toMatch(/SET\s+search_path\s*=/i);
  });

  it("writes neither the generated nor the trust column into profiles", () => {
    const body = sql().replace(/--[^\n]*/g, "");
    const insert = /INSERT INTO public\.profiles\s*\(([^)]*)\)/i.exec(body);
    expect(insert).not.toBeNull();
    const cols = (insert as RegExpExecArray)[1];
    expect(cols).not.toContain("is_verified");
    expect(cols).not.toContain("verification_level");
  });
});

describe("the behavioural suite exists and asserts the real properties", () => {
  it("covers idempotency, the admin refusal and the anon refusal", () => {
    const s = read(SUITE);
    expect(s).toMatch(/PROVISION_RESULT pass=% fail=%/);
    expect(s).toMatch(/SET LOCAL ROLE authenticated/);
    expect(s).toMatch(/SET LOCAL ROLE anon/);
    expect(s).toMatch(/second call is a no-op/);
    expect(s).toMatch(/admin refused/);
    expect(s).toMatch(/anon refused/);
    // It must end by raising, which is what rolls the fixtures back.
    expect(s.trimEnd()).toMatch(/\$P\$;$/);
  });
});

describe("this suite can fail", () => {
  it("detects a direct profiles insert", () => {
    const poisoned = 'await supabase.from("profiles").insert(x)';
    expect(/\.from\(\s*["']profiles["']\s*\)/.test(poisoned)).toBe(true);
    expect(/\.insert\(/.test(poisoned)).toBe(true);
  });

  it("detects a SECURITY DEFINER declaration outside comments", () => {
    const poisoned =
      "CREATE FUNCTION f() RETURNS void SECURITY DEFINER AS $$ $$;";
    expect(poisoned.replace(/--[^\n]*/g, "")).toMatch(/SECURITY\s+DEFINER/i);
  });

  it("does not fire on SECURITY DEFINER inside a comment", () => {
    const commented =
      "-- this must not be SECURITY DEFINER\nCREATE FUNCTION f() ...";
    expect(commented.replace(/--[^\n]*/g, "")).not.toMatch(
      /SECURITY\s+DEFINER/i,
    );
  });

  it("reads real files", () => {
    expect(read(MIGRATION)).toContain("provision_identity");
    expect(() => read("supabase/tests/nope.sql")).toThrow();
  });
});
