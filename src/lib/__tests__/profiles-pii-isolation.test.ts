/**
 * Profile PII isolation
 *
 * Invariant under test:
 *   No cross-user read may touch public.profiles. Cross-user reads go to the
 *   public_profiles view, which does not contain email or phone.
 *
 * Background: 20260310000000_rls_security_hardening.sql:543-545 created
 *   CREATE POLICY profiles_public_read ON public.profiles
 *     FOR SELECT TO authenticated USING (true);
 * which let any authenticated user read every profile row, email and phone
 * included. 20261028000000_restrict_profiles_pii.sql drops that policy and
 * adds the view; these tests pin the application side of that change so the
 * embeds cannot be reintroduced without a failing test.
 *
 * These assert on the QUERIES ISSUED, not on returned data, because the
 * exposure was a query-shape problem.
 */

type Recorded = {
  table: string;
  select?: string;
  filters: { op: string; col: string; val: unknown }[];
};

/** Rows each table should return, keyed by table name. */
type Fixtures = Record<string, { data: unknown; error: unknown; count?: number }>;

function makeClient(fixtures: Fixtures) {
  const calls: Recorded[] = [];

  function builder(table: string) {
    const rec: Recorded = { table, filters: [] };
    calls.push(rec);

    const result = () =>
      fixtures[table] ?? { data: null, error: null, count: 0 };

    const chain: Record<string, unknown> = {
      select(cols: string) {
        rec.select = cols;
        return chain;
      },
      eq(col: string, val: unknown) {
        rec.filters.push({ op: "eq", col, val });
        return chain;
      },
      in(col: string, val: unknown) {
        rec.filters.push({ op: "in", col, val });
        return chain;
      },
      order() {
        return chain;
      },
      range() {
        return chain;
      },
      single: async () => result(),
      maybeSingle: async () => result(),
      // Awaiting the builder itself resolves the query (list queries do this).
      then: (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) =>
        Promise.resolve(result()).then(res, rej),
    };
    return chain;
  }

  return {
    calls,
    client: {
      from: (table: string) => builder(table),
      rpc: () => ({ then: (r: (v: unknown) => unknown) => Promise.resolve({}).then(r) }),
    },
  };
}

let mockClient: ReturnType<typeof makeClient>["client"];

jest.mock("@/lib/supabase/server", () => ({
  createClient: jest.fn(async () => mockClient),
}));

// Imported after the mock is registered.
import { getListingById } from "@/lib/listings/get-listing";
import { getProviderBookings } from "@/lib/services/bookings";

const LANDLORD = "11111111-1111-1111-1111-111111111111";
const CUSTOMER_A = "22222222-2222-2222-2222-222222222222";
const CUSTOMER_B = "33333333-3333-3333-3333-333333333333";

describe("getListingById — landlord info", () => {
  function setup(overrides: Fixtures = {}) {
    const h = makeClient({
      listings: {
        data: { id: "L1", landlord_id: LANDLORD, status: "active" },
        error: null,
      },
      public_profiles: {
        data: { id: LANDLORD, full_name: "Mama Njeri", avatar_url: null, is_verified: true },
        error: null,
      },
      ...overrides,
    });
    mockClient = h.client;
    return h;
  }

  it("never queries public.profiles, as a table OR as an embed", async () => {
    const h = setup();
    await getListingById("L1", { incrementViews: false });

    expect(h.calls.map((c) => c.table)).not.toContain("profiles");
    // The pre-fix code reached profiles via an embed inside the select string
    // ("profiles:landlord_id (...)"), not via .from("profiles"), so the table
    // check alone cannot see it. Strip the allowed view name, then assert.
    for (const c of h.calls) {
      expect((c.select ?? "").replace(/public_profiles/g, "")).not.toMatch(/profiles/);
    }
  });

  it("reads the landlord from public_profiles, keyed by landlord_id", async () => {
    const h = setup();
    await getListingById("L1", { incrementViews: false });

    const pp = h.calls.find((c) => c.table === "public_profiles");
    expect(pp).toBeDefined();
    expect(pp!.filters).toContainEqual({ op: "eq", col: "id", val: LANDLORD });
  });

  it("requests no PII columns anywhere", async () => {
    const h = setup();
    await getListingById("L1", { incrementViews: false });

    for (const c of h.calls) {
      expect(c.select ?? "").not.toMatch(/\bemail\b/);
      expect(c.select ?? "").not.toMatch(/\bphone\b/);
    }
  });

  it("does not embed a profiles join in the listings select", async () => {
    const h = setup();
    await getListingById("L1", { incrementViews: false });

    const listings = h.calls.find((c) => c.table === "listings");
    expect(listings!.select).toBe("*");
    expect(listings!.select).not.toMatch(/profiles/);
  });

  it("still returns the listing when the landlord lookup fails", async () => {
    setup({ public_profiles: { data: null, error: { message: "boom" } } });
    const res = await getListingById("L1", { incrementViews: false });

    expect(res.error).toBeNull();
    expect(res.listing).not.toBeNull();
    expect(res.listing!.landlord).toBeUndefined();
  });
});

describe("getProviderBookings — customer names", () => {
  function setup(rows: { id: string; customer_id: string }[], people: unknown = null) {
    const h = makeClient({
      bookings: { data: rows, error: null, count: rows.length },
      public_profiles: { data: people, error: null },
    });
    mockClient = h.client;
    return h;
  }

  it("never queries public.profiles, as a table OR as an embed", async () => {
    const h = setup([{ id: "B1", customer_id: CUSTOMER_A }], [
      { id: CUSTOMER_A, full_name: "Alice" },
    ]);
    await getProviderBookings({ providerId: "P1" });

    expect(h.calls.map((c) => c.table)).not.toContain("profiles");
    // Pre-fix this was "customer:profiles!customer_id (full_name)" inside the
    // select string — invisible to the table check above.
    for (const c of h.calls) {
      expect((c.select ?? "").replace(/public_profiles/g, "")).not.toMatch(/profiles/);
    }
  });

  it("attaches customer names from public_profiles", async () => {
    setup(
      [
        { id: "B1", customer_id: CUSTOMER_A },
        { id: "B2", customer_id: CUSTOMER_B },
      ],
      [
        { id: CUSTOMER_A, full_name: "Alice" },
        { id: CUSTOMER_B, full_name: "Bob" },
      ]
    );
    const res = await getProviderBookings({ providerId: "P1" });

    expect(res.bookings[0].customer).toEqual({ full_name: "Alice" });
    expect(res.bookings[1].customer).toEqual({ full_name: "Bob" });
  });

  it("deduplicates repeated customers into ONE batched lookup", async () => {
    const h = setup(
      [
        { id: "B1", customer_id: CUSTOMER_A },
        { id: "B2", customer_id: CUSTOMER_A },
        { id: "B3", customer_id: CUSTOMER_B },
      ],
      [
        { id: CUSTOMER_A, full_name: "Alice" },
        { id: CUSTOMER_B, full_name: "Bob" },
      ]
    );
    await getProviderBookings({ providerId: "P1" });

    const lookups = h.calls.filter((c) => c.table === "public_profiles");
    expect(lookups).toHaveLength(1);
    expect(lookups[0].filters).toContainEqual({
      op: "in",
      col: "id",
      val: [CUSTOMER_A, CUSTOMER_B],
    });
  });

  it("issues no lookup at all when there are no bookings (boundary)", async () => {
    const h = setup([]);
    const res = await getProviderBookings({ providerId: "P1" });

    expect(res.bookings).toEqual([]);
    expect(h.calls.filter((c) => c.table === "public_profiles")).toHaveLength(0);
  });

  it("still returns bookings when the name lookup fails", async () => {
    const h = makeClient({
      bookings: { data: [{ id: "B1", customer_id: CUSTOMER_A }], error: null, count: 1 },
      public_profiles: { data: null, error: { message: "denied" } },
    });
    mockClient = h.client;

    const res = await getProviderBookings({ providerId: "P1" });

    expect(res.error).toBeNull();
    expect(res.bookings).toHaveLength(1);
    expect(res.bookings[0].customer).toEqual({ full_name: null });
  });

  it("requests no PII columns anywhere", async () => {
    const h = setup([{ id: "B1", customer_id: CUSTOMER_A }], [
      { id: CUSTOMER_A, full_name: "Alice" },
    ]);
    await getProviderBookings({ providerId: "P1" });

    for (const c of h.calls) {
      expect(c.select ?? "").not.toMatch(/\bemail\b/);
      expect(c.select ?? "").not.toMatch(/\bphone\b/);
    }
  });
});
