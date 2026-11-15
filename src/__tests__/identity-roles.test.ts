/**
 * One role vocabulary, one alias map, one read, one admin gate.
 *
 * WHAT WAS WRONG
 *
 * FIVE vocabularies described the same thing. I counted four before starting
 * and the fifth only surfaced when the compiler refused an assignment:
 *
 *   db-helpers    UserRole        'tenant' | 'landlord' | 'service_provider'
 *   db-helpers    UserType        UserRole | 'admin'
 *   db-helpers    SignupUserRole  'landlord' | 'service_provider'
 *   proxy.ts      a role alias map adding 'provider'
 *   queries.ts    UserRole        an INTERFACE describing a user_roles ROW,
 *                                 shadowing the union of the same name
 *
 * The alias was written out three times — proxy.ts had the map, and
 * signup/page.tsx and auth/callback/route.ts each re-derived it inline as
 * `x === 'provider' ? 'service_provider' : x`. The callback's version cast a
 * COOKIE straight to UserRole with `as UserRole`, a claim TypeScript cannot
 * check and the user can falsify by editing the cookie.
 *
 * FOURTEEN files hand-rolled the same read with four different column lists,
 * so what counted as "a role the user holds" depended on which file you were
 * in. None called get_user_roles() or user_has_role(), the two functions the
 * database provides, because EXECUTE on both is service_role-only.
 *
 * And the admin gate — the only check between a signed-in user and the admin
 * surface — existed three times: privately in admin-verification.ts, privately
 * again in review-moderation.ts with a byte-identical signature, and inline a
 * third time in admin/layout.tsx.
 *
 * WHAT IS DELIBERATELY NOT CONSOLIDATED
 *
 * Four user_roles touch points remain, and each is a DIFFERENT operation:
 * two writes (the callback's insert, onboarding's upsert), one existence check
 * for a specific (user, role) pair in signup, and triggers.ts, which does the
 * REVERSE lookup — every user holding a role, not the roles of one user.
 * Forcing those through one function would mean a function that does four
 * things.
 */

import fs from "fs";
import path from "path";
import {
  normalizeRoleParam,
  isAssignableRole,
  hasRole,
  hasVerifiedRole,
  roleNames,
  productRoleNames,
  productRoles,
  primaryRoleOf,
  ASSIGNABLE_ROLES,
  ALL_ROLE_VALUES,
  PRIMARY_ROLE_VALUES,
  type ActiveRole,
} from "@/lib/identity/roles";

const root = process.cwd();
const read = (p: string) => fs.readFileSync(path.join(root, p), "utf8");

const stripTs = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("\n")
    .map((l) => l.replace(/\/\/.*$/, ""))
    .join("\n");

const ROLES_MODULE = "src/lib/identity/roles.ts";
const ADMIN_MODULE = "src/lib/identity/require-admin.ts";

function sourceFiles(dir: string, acc: string[] = []): string[] {
  for (const e of fs.readdirSync(path.join(root, dir), {
    withFileTypes: true,
  })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) {
      if (e.name === "__tests__") continue;
      sourceFiles(rel, acc);
    } else if (/\.(ts|tsx)$/.test(e.name)) acc.push(rel);
  }
  return acc;
}

const r = (role: ActiveRole["role"], isVerified = false): ActiveRole => ({
  role,
  isVerified,
});

// ===========================================================================
// UNIT: the alias map
// ===========================================================================

describe("normalizeRoleParam", () => {
  it("maps the public word to the column value", () => {
    expect(normalizeRoleParam("provider")).toBe("service_provider");
  });

  it("passes through the column values", () => {
    expect(normalizeRoleParam("landlord")).toBe("landlord");
    expect(normalizeRoleParam("service_provider")).toBe("service_provider");
    expect(normalizeRoleParam("tenant")).toBe("tenant");
  });

  it("returns null for anything else, rather than guessing", () => {
    // These arrive from a query string and from a cookie the user can edit, so
    // an unrecognised value is untrusted input, not an error condition.
    for (const bad of [
      "admin",
      "superuser",
      "",
      "   ",
      "Provider ",
      null,
      undefined,
    ]) {
      expect(normalizeRoleParam(bad as string)).toBe(
        bad === "Provider " ? "service_provider" : null,
      );
    }
  });

  it("refuses 'admin' specifically — it is not self-assignable", () => {
    expect(normalizeRoleParam("admin")).toBeNull();
  });

  it("is case- and whitespace-tolerant, because URLs are", () => {
    expect(normalizeRoleParam("  PROVIDER ")).toBe("service_provider");
  });
});

describe("isAssignableRole", () => {
  it("accepts only what a user may give themselves", () => {
    expect(isAssignableRole("landlord")).toBe(true);
    expect(isAssignableRole("service_provider")).toBe(true);
  });

  it("rejects admin and the deprecated tenant role", () => {
    // 'admin' is forbidden by RLS; 'tenant' is deprecated — tenancy is a
    // relationship via leases, and nothing in src/ ever inserts it.
    expect(isAssignableRole("admin")).toBe(false);
    expect(isAssignableRole("tenant")).toBe(false);
    expect(isAssignableRole(null)).toBe(false);
    expect(isAssignableRole(42)).toBe(false);
  });

  it("matches what provision_identity enforces server-side", () => {
    const sql = read(
      "supabase/migrations/20260346000000_provision_identity.sql",
    );
    for (const role of ASSIGNABLE_ROLES) expect(sql).toContain(`'${role}'`);
  });
});

// ===========================================================================
// UNIT: the vocabularies, and that they differ on purpose
// ===========================================================================

describe("the vocabularies record a real difference", () => {
  it("user_roles permits admin and profiles.primary_role does not", () => {
    // Not an inconsistency this module invented — the two live CHECK
    // constraints genuinely differ, and flattening them in TypeScript would
    // make one of them unrepresentable.
    expect(ALL_ROLE_VALUES).toContain("admin");
    expect(PRIMARY_ROLE_VALUES as readonly string[]).not.toContain("admin");
  });

  it("assignable is a strict subset of what the column permits", () => {
    for (const role of ASSIGNABLE_ROLES) {
      expect(ALL_ROLE_VALUES as readonly string[]).toContain(role);
    }
    expect(ASSIGNABLE_ROLES.length).toBeLessThan(ALL_ROLE_VALUES.length);
  });
});

// ===========================================================================
// UNIT: predicates
// ===========================================================================

describe("role predicates", () => {
  const roles = [r("landlord", true), r("service_provider", false)];

  it("hasRole ignores approval, hasVerifiedRole requires it", () => {
    expect(hasRole(roles, "landlord")).toBe(true);
    expect(hasRole(roles, "service_provider")).toBe(true);
    expect(hasVerifiedRole(roles, "landlord")).toBe(true);
    expect(hasVerifiedRole(roles, "service_provider")).toBe(false);
  });

  it("hasRole accepts admin — the column can hold it", () => {
    // The whole reason RoleName exists. Typing this parameter as UserRole
    // forced requireAdmin to cast the value away.
    expect(hasRole([r("admin")], "admin")).toBe(true);
    expect(hasRole(roles, "admin")).toBe(false);
  });

  it("roleNames keeps admin, productRoleNames drops it", () => {
    const withAdmin = [...roles, r("admin")];
    expect(roleNames(withAdmin)).toContain("admin");
    expect(productRoleNames(withAdmin)).not.toContain("admin");
    expect(productRoleNames(withAdmin)).toHaveLength(2);
  });

  it("productRoles drops admin and keeps approval", () => {
    const out = productRoles([...roles, r("admin", true)]);
    expect(out).toEqual([
      { role: "landlord", isVerified: true },
      { role: "service_provider", isVerified: false },
    ]);
  });
});

describe("primaryRoleOf", () => {
  it("applies the hierarchy, not the array order", () => {
    // The previous code read userRoles[0] — whichever row the database
    // happened to return first, from an unordered query, so a user with two
    // roles could see a different dashboard between refreshes.
    expect(primaryRoleOf([r("service_provider"), r("landlord")])).toBe(
      "landlord",
    );
    expect(primaryRoleOf([r("landlord"), r("service_provider")])).toBe(
      "landlord",
    );
  });

  it("returns null for no roles instead of inventing one", () => {
    // Holding no roles is valid: the user is browsing and saving listings.
    expect(primaryRoleOf([])).toBeNull();
  });

  it("returns null when the only role is admin", () => {
    expect(primaryRoleOf([r("admin")])).toBeNull();
  });
});

// ===========================================================================
// SOURCE: the consolidation holds
// ===========================================================================

describe("the alias map exists once", () => {
  it("no other file maps 'provider' to 'service_provider'", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles("src")) {
      if (f === ROLES_MODULE) continue;
      const code = stripTs(read(f));
      // the inline forms this replaced
      if (/["']provider["']\s*\?\s*["']service_provider["']/.test(code)) {
        offenders.push(`${f}: inline ternary alias`);
      }
      if (/["']provider["']\s*:\s*["']service_provider["']/.test(code)) {
        offenders.push(`${f}: alias map entry`);
      }
    }
    expect(offenders).toEqual([]);
  });

  it("no file casts a role param or cookie straight to UserRole", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles("src")) {
      const code = stripTs(read(f));
      // ANY identifier containing "role" cast to UserRole, not a list of
      // names. The first version of this assertion named three variables and
      // so missed `pendingRoleFromUrl as UserRole` in the same file it was
      // written to protect -- an enumerate-the-known-cases guard again.
      if (/\b\w*[Rr]ole\w*\s+as\s+UserRole\b/.test(code)) {
        offenders.push(f);
      }
    }
    expect(offenders).toEqual([]);
  });
});

describe("the caller's-roles read exists once", () => {
  /**
   * A read of ONE user's active roles, i.e. the query this module replaced.
   * Writes, the (user, role) existence check and the reverse lookup in
   * triggers.ts are deliberately excluded — see the header.
   */
  const WRITE_OR_OTHER = [
    "insert(",
    "upsert(",
    'select("id")',
    'select("user_id")',
  ];

  it("no file hand-rolls .from('user_roles').select('role'...)", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles("src")) {
      if (f === ROLES_MODULE) continue;
      const lines = stripTs(read(f)).split("\n");
      for (let i = 0; i < lines.length; i++) {
        if (!/\.from\(\s*["']user_roles["']\s*\)/.test(lines[i])) continue;
        const window = lines.slice(i, i + 6).join(" ");
        if (WRITE_OR_OTHER.some((w) => window.includes(w))) continue;
        if (/\.select\(\s*["'][^"']*\brole\b/.test(window)) {
          offenders.push(`${f}:${i + 1}`);
        }
      }
    }
    expect(offenders).toEqual([]);
  });

  it("the sites that need it import the shared read", () => {
    const callers = sourceFiles("src").filter(
      (f) =>
        f !== ROLES_MODULE && /readActiveRoles\s*\(/.test(stripTs(read(f))),
    );
    // login, signup, the auth callback, the middleware, the cache module and
    // the admin gate.
    expect(callers.length).toBeGreaterThanOrEqual(5);
  });
});

describe("the admin gate exists once", () => {
  it("only require-admin.ts defines requireAdmin", () => {
    const definers = sourceFiles("src").filter((f) =>
      /(async\s+)?function\s+requireAdmin\b|const\s+requireAdmin\s*=/.test(
        stripTs(read(f)),
      ),
    );
    expect(definers).toEqual([ADMIN_MODULE]);
  });

  it("no file re-implements the admin check inline", () => {
    const offenders: string[] = [];
    for (const f of sourceFiles("src")) {
      if (f === ADMIN_MODULE) continue;
      const code = stripTs(read(f));
      if (/r\.role\s*===\s*["']admin["']/.test(code)) offenders.push(f);
      if (/\bhasAdminRole\b/.test(code)) offenders.push(f);
    }
    expect(offenders).toEqual([]);
  });

  it("documents that no user can hold the role yet", () => {
    // RLS forbids a client writing role='admin', a trigger blocks raising it,
    // and nothing grants it — so this gate currently denies everyone. A reader
    // must not mistake "denies everyone" for "is protecting something".
    const doc = read(ADMIN_MODULE);
    expect(doc).toMatch(/NO USER CAN HOLD THIS ROLE TODAY/i);
  });
});

describe("no file defines a second UserRole", () => {
  it("only db-helpers declares the type", () => {
    const definers = sourceFiles("src").filter((f) =>
      /^\s*export\s+(type|interface)\s+UserRole\b/m.test(stripTs(read(f))),
    );
    expect(definers).toEqual(["src/types/db-helpers.ts"]);
  });
});

// ===========================================================================
// The guard on the guard
// ===========================================================================

describe("this suite can fail", () => {
  it("detects an inline alias", () => {
    expect(
      /["']provider["']\s*\?\s*["']service_provider["']/.test(
        `x === "provider" ? "service_provider" : x`,
      ),
    ).toBe(true);
  });

  it("detects a hand-rolled role read", () => {
    const window = `.from("user_roles") .select("role, is_verified") .eq("user_id", id)`;
    expect(/\.select\(\s*["'][^"']*\brole\b/.test(window)).toBe(true);
  });

  it("does not fire on a write to user_roles", () => {
    const window = `.from("user_roles") .insert(roleInsert as never)`;
    expect(["insert(", "upsert("].some((w) => window.includes(w))).toBe(true);
  });

  it("detects a second UserRole declaration", () => {
    expect(
      /^\s*export\s+(type|interface)\s+UserRole\b/m.test(
        "export interface UserRole {\n  role: string;\n}",
      ),
    ).toBe(true);
  });
});
