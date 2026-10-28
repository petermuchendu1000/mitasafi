/**
 * @jest-environment node
 *
 * Signup failures must be visible, and must not strand a user.
 *
 * The bug these pin: /auth/callback destructured only `{ data: profileData }`
 * from the profile SELECT. Any read error other than "no rows" left
 * profileData null, so an EXISTING user took the new-user branch, the INSERT
 * hit profiles_pkey, that error was written to console.error and discarded,
 * and the route redirected to a dashboard for a user with no profile row.
 *
 * Two invariants are asserted here:
 *   1. A user who cannot be given a profile row ends on /login with a reason
 *      in the URL - never on a dashboard.
 *   2. The pendingRole / pendingRedirect cookies survive a failure, so the
 *      retry resumes with the same role and destination.
 *
 * Errors that mean "the row is already there" (23505 unique_violation) are NOT
 * failures: they are what the insert wanted.
 */

type Result = { data?: unknown; error?: unknown };

type TableFixture = {
  select?: Result;
  insert?: Result;
  update?: Result;
};

type Fixtures = Record<string, TableFixture>;

type Recorded = { table: string; op: "select" | "insert" | "update" };

const USER_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

let fixtures: Fixtures = {};
let recorded: Recorded[] = [];
let cookieJar: Record<string, string> = {};
let authResult: Result = {};

function builder(table: string) {
  let op: Recorded["op"] = "select";
  const fx = () => fixtures[table] ?? {};
  const result = (): Result => {
    const f = fx();
    const r = op === "insert" ? f.insert : op === "update" ? f.update : f.select;
    return r ?? { data: null, error: null };
  };

  const chain: Record<string, unknown> = {
    select() {
      op = "select";
      recorded.push({ table, op });
      return chain;
    },
    insert() {
      op = "insert";
      recorded.push({ table, op });
      return chain;
    },
    update() {
      op = "update";
      recorded.push({ table, op });
      return chain;
    },
    eq() {
      return chain;
    },
    single: async () => result(),
    maybeSingle: async () => result(),
    then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
      Promise.resolve(result()).then(res, rej),
  };
  return chain;
}

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => ({
    auth: {
      exchangeCodeForSession: jest.fn(async () => authResult),
    },
    from: (table: string) => builder(table),
  })),
}));

jest.mock("next/headers", () => ({
  cookies: jest.fn(async () => ({
    get: (name: string) =>
      cookieJar[name] === undefined ? undefined : { name, value: cookieJar[name] },
  })),
}));

import { GET } from "../route";

const ORIGIN = "https://mitasafi.test";

function call(query = "code=abc123") {
  return GET(new Request(`${ORIGIN}/auth/callback?${query}`));
}

/** Names of cookies this response asks the browser to clear. */
function clearedCookies(res: Response): string[] {
  const raw = res.headers.getSetCookie?.() ?? [];
  return raw
    .filter((c) => /Max-Age=0|Expires=Thu, 01 Jan 1970/i.test(c))
    .map((c) => c.split("=")[0].trim());
}

function location(res: Response): string {
  return res.headers.get("location") ?? "";
}

beforeEach(() => {
  recorded = [];
  cookieJar = { pendingRole: "landlord", pendingRedirect: "%2Fdashboard" };
  authResult = { data: { user: { id: USER_ID, email: "a@b.test", user_metadata: {} } }, error: null };
  fixtures = {
    // Default: the user is new. PGRST116 is PostgREST's "no rows".
    profiles: { select: { data: null, error: { code: "PGRST116" } }, insert: { error: null } },
    user_roles: { select: { data: [], error: null }, insert: { error: null } },
    service_providers: { select: { data: null, error: null }, insert: { error: null } },
  };
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe("profile lookup failure", () => {
  const READ_DENIED = { code: "42501", message: "permission denied for table profiles" };

  it("redirects to login with a reason instead of guessing the user is new", async () => {
    fixtures.profiles = { select: { data: null, error: READ_DENIED }, insert: { error: null } };

    const res = await call();

    expect(location(res)).toBe(`${ORIGIN}/login?error=profile_lookup_failed`);
  });

  it("does not attempt the insert that used to raise a duplicate key", async () => {
    fixtures.profiles = { select: { data: null, error: READ_DENIED }, insert: { error: null } };

    await call();

    expect(recorded).not.toContainEqual({ table: "profiles", op: "insert" });
  });

  it("keeps pendingRole and pendingRedirect so a retry resumes the signup", async () => {
    fixtures.profiles = { select: { data: null, error: READ_DENIED }, insert: { error: null } };

    const res = await call();

    expect(clearedCookies(res)).not.toContain("pendingRole");
    expect(clearedCookies(res)).not.toContain("pendingRedirect");
  });

  it("treats PGRST116 as a genuinely new user and still creates the profile", async () => {
    const res = await call();

    expect(recorded).toContainEqual({ table: "profiles", op: "insert" });
    expect(location(res)).not.toContain("/login");
  });
});

describe("profile insert failure", () => {
  it("surfaces a real write failure rather than redirecting to a dashboard", async () => {
    fixtures.profiles = {
      select: { data: null, error: { code: "PGRST116" } },
      insert: { error: { code: "42501", message: "new row violates row-level security policy" } },
    };

    const res = await call();

    expect(location(res)).toBe(`${ORIGIN}/login?error=profile_create_failed`);
    expect(clearedCookies(res)).not.toContain("pendingRole");
  });

  it("treats 23505 as success, because the row the insert wanted now exists", async () => {
    fixtures.profiles = {
      select: { data: null, error: { code: "PGRST116" } },
      insert: { error: { code: "23505", message: 'duplicate key value violates unique constraint "profiles_pkey"' } },
    };

    const res = await call();

    expect(location(res)).not.toContain("/login");
    expect(location(res)).toContain("/dashboard/landlord");
  });
});

describe("role insert failure", () => {
  it("surfaces a real failure instead of landing the user in a role-less dashboard", async () => {
    fixtures.user_roles = {
      select: { data: [], error: null },
      insert: { error: { code: "42501", message: "new row violates row-level security policy" } },
    };

    const res = await call();

    expect(location(res)).toBe(`${ORIGIN}/login?error=role_create_failed`);
    expect(clearedCookies(res)).not.toContain("pendingRole");
  });

  it("treats 23505 as success, because UNIQUE(user_id, role) already holds the row", async () => {
    fixtures.user_roles = {
      select: { data: [], error: null },
      insert: { error: { code: "23505", message: "duplicate key value violates unique constraint" } },
    };

    const res = await call();

    expect(location(res)).not.toContain("/login");
  });
});

describe("the untouched happy path", () => {
  it("still routes a new landlord by intent and clears the signup cookies", async () => {
    const res = await call("code=abc123&intent=list");

    expect(location(res)).toBe(`${ORIGIN}/dashboard/landlord/listings/new`);
    expect(clearedCookies(res)).toEqual(
      expect.arrayContaining(["pendingRole", "pendingRedirect"])
    );
  });

  it("still sends an existing user with no pending role to their destination", async () => {
    cookieJar = {};
    fixtures.profiles = {
      select: { data: { id: USER_ID, primary_role: "tenant", full_name: "Mama Njeri" }, error: null },
      insert: { error: null },
    };
    fixtures.user_roles = { select: { data: [{ role: "tenant" }], error: null }, insert: { error: null } };

    const res = await call();

    expect(location(res)).toBe(`${ORIGIN}/dashboard`);
    expect(recorded).not.toContainEqual({ table: "profiles", op: "insert" });
  });

  it("still rejects a failed code exchange", async () => {
    authResult = { data: { user: null }, error: { message: "invalid grant" } };

    const res = await call();

    expect(location(res)).toBe(`${ORIGIN}/login?error=auth_failed`);
  });
});
