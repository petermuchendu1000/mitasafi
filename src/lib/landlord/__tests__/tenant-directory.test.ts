/**
 * The tenant directory.
 *
 * THE TEST THAT MATTERS MOST is "agrees with the overview". The overview tile
 * says "N active tenants", defined in portfolio.ts as distinct tenant_id over
 * live leases. If this page counted `tenants` rows instead, a landlord with a
 * moved-out tenant would see 4 on one screen and 3 on the other with no way to
 * tell which was right. That test drives the REAL rollUpPortfolio, not a copy
 * of its rule — a copy would agree with itself forever while the two screens
 * drifted apart.
 *
 * The second is the partition: housed + former + prospective === onRecord. A
 * tenant falling between the states would silently vanish from a list whose
 * entire job is to be complete.
 */

import {
  buildTenantDirectory,
  tenantMatches,
  initialOf,
  TENANT_STATUS_VALUES,
  type DirectoryInput,
  type DirectoryLeaseInput,
  type DirectoryTenantInput,
} from "../tenant-directory";
import { rollUpPortfolio } from "../portfolio";

const TODAY = { year: 2026, month: 11, day: 23 };
const NOV = { year: 2026, month: 11 };

const tenant = (
  id: string,
  over: Partial<DirectoryTenantInput> = {},
): DirectoryTenantInput => ({
  id,
  full_name: `Tenant ${id}`,
  phone: "+254712345678",
  email: null,
  id_type: null,
  id_number: null,
  occupation: null,
  employer: null,
  verification_level: "basic",
  status: "active",
  created_at: "2026-01-01T00:00:00Z",
  ...over,
});

const lease = (
  id: string,
  tenantId: string,
  over: Partial<DirectoryLeaseInput> = {},
): DirectoryLeaseInput => ({
  id,
  tenant_id: tenantId,
  unit_id: `u-${id}`,
  status: "active",
  start_date: "2026-01-01",
  end_date: "2027-01-31",
  monthly_rent: 85000,
  rent_due_day: 5,
  grace_period_days: 5,
  deposit_amount: 85000,
  deposit_status: "held",
  ...over,
});

function build(over: Partial<DirectoryInput> = {}) {
  return buildTenantDirectory({
    tenants: [],
    leases: [],
    payments: [],
    units: [],
    buildings: [],
    period: NOV,
    today: TODAY,
    ...over,
  });
}

describe("the cross-screen invariant", () => {
  const tenants = [tenant("a"), tenant("b"), tenant("c"), tenant("d")];
  const leases = [
    lease("l1", "a"),
    lease("l2", "b"),
    lease("l3", "c", { status: "terminated" }), // moved out
    // tenant d has never had a lease
  ];

  it("'housed' equals the overview's 'active tenants', from the REAL rollup", () => {
    const directory = build({ tenants, leases });
    const overview = rollUpPortfolio({
      buildingCount: 1,
      units: [],
      leases: leases.map((l) => ({
        id: l.id,
        tenant_id: l.tenant_id,
        unit_id: l.unit_id,
        status: l.status,
        start_date: l.start_date,
        end_date: l.end_date,
        monthly_rent: l.monthly_rent,
      })),
      payments: [],
      maintenance: [],
      inquiryStatuses: [],
      period: NOV,
    });
    expect(directory.stats.housed).toBe(overview.activeTenants);
    expect(directory.stats.housed).toBe(2);
  });

  it("still agrees when one person rents two units", () => {
    // Distinct PEOPLE, not leases — both screens must count 1, not 2.
    const two = [lease("l1", "a"), lease("l2", "a", { unit_id: "u-other" })];
    const directory = build({ tenants: [tenant("a")], leases: two });
    const overview = rollUpPortfolio({
      buildingCount: 1,
      units: [],
      leases: two.map((l) => ({
        id: l.id,
        tenant_id: l.tenant_id,
        unit_id: l.unit_id,
        status: l.status,
        start_date: l.start_date,
        end_date: l.end_date,
        monthly_rent: l.monthly_rent,
      })),
      payments: [],
      maintenance: [],
      inquiryStatuses: [],
      period: NOV,
    });
    expect(directory.stats.housed).toBe(1);
    expect(overview.activeTenants).toBe(1);
  });

  it("counts a lease awaiting signature as live, exactly as the overview does", () => {
    const pending = [lease("l1", "a", { status: "pending_signature" })];
    const directory = build({ tenants: [tenant("a")], leases: pending });
    expect(directory.stats.housed).toBe(1);
    expect(directory.tenants[0].state).toBe("housed");
  });
});

describe("the three states partition the directory", () => {
  it("housed + former + prospective === onRecord", () => {
    const s = build({
      tenants: [tenant("a"), tenant("b"), tenant("c"), tenant("d")],
      leases: [
        lease("l1", "a"),
        lease("l2", "b", { status: "expired" }),
        lease("l3", "c", { status: "terminated" }),
      ],
    }).stats;
    expect(s.onRecord).toBe(4);
    expect(s.housed + s.former + s.prospective).toBe(s.onRecord);
    expect([s.housed, s.former, s.prospective]).toEqual([1, 2, 1]);
  });

  it("holds for an empty directory", () => {
    const s = build().stats;
    expect(s.onRecord).toBe(0);
    expect(s.housed + s.former + s.prospective).toBe(0);
  });

  it("holds when every tenant is housed", () => {
    const s = build({
      tenants: [tenant("a"), tenant("b")],
      leases: [lease("l1", "a"), lease("l2", "b")],
    }).stats;
    expect(s.housed + s.former + s.prospective).toBe(s.onRecord);
    expect(s.housed).toBe(2);
  });

  it("a tenant with no lease is prospective, not dropped", () => {
    // The mock page could not represent this at all. A tenant recorded but
    // not yet housed must still appear, or the directory is not a directory.
    const r = build({ tenants: [tenant("a")] });
    expect(r.tenants).toHaveLength(1);
    expect(r.tenants[0].state).toBe("prospective");
    expect(r.tenants[0].places).toEqual([]);
    expect(r.tenants[0].rent).toBeNull();
    expect(r.tenants[0].since).toBeNull();
  });

  it("a tenant whose lease ended is former, and keeps their history count", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [
        lease("l1", "a", { status: "expired", start_date: "2024-01-01" }),
        lease("l2", "a", { status: "terminated", start_date: "2025-01-01" }),
      ],
    });
    expect(r.tenants[0].state).toBe("former");
    expect(r.tenants[0].leaseCount).toBe(2);
    expect(r.tenants[0].since).toBe("2024-01-01"); // the earliest, not the latest
    expect(r.tenants[0].rent).toBeNull();
  });
});

describe("where the tenant lives", () => {
  const units = [
    { id: "u-l1", unit_number: "A101", building_id: "b1" },
    { id: "u-l2", unit_number: "W1", building_id: "b2" },
  ];
  const buildings = [
    { id: "b1", name: "Riverside Court" },
    { id: "b2", name: "Westlands Heights" },
  ];

  it("resolves unit number and building name", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a")],
      units,
      buildings,
    });
    expect(r.tenants[0].places).toEqual([
      {
        unitId: "u-l1",
        unitNumber: "A101",
        buildingId: "b1",
        buildingName: "Riverside Court",
      },
    ]);
  });

  it("lists every unit when one person rents two", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a"), lease("l2", "a")],
      units,
      buildings,
    });
    expect(r.tenants[0].places.map((p) => p.unitNumber).sort()).toEqual([
      "A101",
      "W1",
    ]);
  });

  it("does not list units from leases that have ended", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a"), lease("l2", "a", { status: "terminated" })],
      units,
      buildings,
    });
    expect(r.tenants[0].places).toHaveLength(1);
  });

  it("copes with a unit or building that cannot be resolved", () => {
    const r = build({ tenants: [tenant("a")], leases: [lease("l1", "a")] });
    expect(r.tenants[0].places[0].unitNumber).toBe("—");
    expect(r.tenants[0].places[0].buildingName).toBeNull();
  });
});

describe("rent position", () => {
  const pay = (leaseId: string, amount: number, over = {}) => ({
    lease_id: leaseId,
    amount,
    payment_type: "rent",
    status: "confirmed",
    period_year: 2026,
    period_month: 11,
    ...over,
  });

  it("is paid when the month is settled", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a")],
      payments: [pay("l1", 85000)],
    });
    expect(r.tenants[0].rent).toEqual({
      status: "paid",
      due: 85000,
      paid: 85000,
      balance: 0,
      daysLate: 0,
    });
  });

  it("does NOT count a deposit as rent", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a")],
      payments: [pay("l1", 85000, { payment_type: "deposit" })],
    });
    expect(r.tenants[0].rent!.paid).toBe(0);
    expect(r.tenants[0].rent!.status).toBe("overdue");
  });

  it("does NOT count an unconfirmed payment", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a")],
      payments: [pay("l1", 85000, { status: "pending" })],
    });
    expect(r.tenants[0].rent!.paid).toBe(0);
  });

  it("does not count rent for another month", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a")],
      payments: [pay("l1", 85000, { period_month: 10 })],
    });
    expect(r.tenants[0].rent!.paid).toBe(0);
  });

  it("sums across two live leases and takes the WORST status", () => {
    // One unit paid, the other not: the landlord is owed money, so the row
    // must not read "Paid".
    const r = build({
      tenants: [tenant("a")],
      leases: [
        lease("l1", "a", { monthly_rent: 85000 }),
        lease("l2", "a", { monthly_rent: 95000 }),
      ],
      payments: [pay("l1", 85000)],
    });
    expect(r.tenants[0].rent).toEqual({
      status: "overdue",
      due: 180000,
      paid: 85000,
      balance: 95000,
      daysLate: 13,
    });
  });

  it("takes the LARGEST daysLate across leases", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [
        lease("l1", "a", { rent_due_day: 5, grace_period_days: 5 }), // late 13
        lease("l2", "a", { rent_due_day: 1, grace_period_days: 0 }), // late 22
      ],
    });
    expect(r.tenants[0].rent!.daysLate).toBe(22);
  });

  it("is null for a lease that does not cover this month", () => {
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a", { start_date: "2027-01-01", end_date: null })],
    });
    expect(r.tenants[0].rent).toBeNull();
  });

  it("is not late in the first month of a mid-month move-in", () => {
    // The defect fixed in rent-status.ts, reaching this page through the
    // shared rule rather than being re-derived here.
    const r = build({
      tenants: [tenant("a")],
      leases: [lease("l1", "a", { start_date: "2026-11-23" })],
    });
    expect(r.tenants[0].rent!.status).toBe("pending");
    expect(r.tenants[0].rent!.daysLate).toBe(0);
  });
});

describe("stats roll up what is actually owed", () => {
  it("adds the money columns across tenants", () => {
    const s = build({
      tenants: [tenant("a"), tenant("b"), tenant("c")],
      leases: [
        lease("l1", "a", { monthly_rent: 85000 }),
        lease("l2", "b", { monthly_rent: 140000 }),
        lease("l3", "c", { status: "terminated" }),
      ],
      payments: [
        {
          lease_id: "l1",
          amount: 85000,
          payment_type: "rent",
          status: "confirmed",
          period_year: 2026,
          period_month: 11,
        },
        {
          lease_id: "l2",
          amount: 70000,
          payment_type: "rent",
          status: "confirmed",
          period_year: 2026,
          period_month: 11,
        },
      ],
    }).stats;
    expect(s.rentDue).toBe(225000);
    expect(s.rentCollected).toBe(155000);
    expect(s.rentOutstanding).toBe(70000);
    expect(s.paid).toBe(1);
    expect(s.partial).toBe(1);
    // the terminated lease contributes nothing
    expect(s.overdue).toBe(0);
  });

  it("counts deposits only where they are actually held", () => {
    const s = build({
      tenants: [tenant("a"), tenant("b")],
      leases: [
        lease("l1", "a", { deposit_amount: 85000, deposit_status: "held" }),
        lease("l2", "b", { deposit_amount: 95000, deposit_status: "pending" }),
      ],
    }).stats;
    // A deposit the landlord has not collected is not money they hold.
    expect(s.depositsHeld).toBe(85000);
  });

  it("counts blacklisted tenants", () => {
    const s = build({
      tenants: [tenant("a"), tenant("b", { status: "blacklisted" })],
    }).stats;
    expect(s.blacklisted).toBe(1);
  });

  it("the status set matches the CHECK constraint", () => {
    expect([...TENANT_STATUS_VALUES].sort()).toEqual(
      ["active", "blacklisted", "inactive"].sort(),
    );
  });
});

describe("initialOf", () => {
  it("takes the first letter, uppercased", () => {
    expect(initialOf("brian kamau")).toBe("B");
  });

  it("returns ? rather than crashing on an empty name", () => {
    // The mock did `tenant.first_name[0]`, which is undefined for "" and
    // renders as nothing. full_name is NOT NULL but can be whitespace.
    expect(initialOf("")).toBe("?");
    expect(initialOf("   ")).toBe("?");
  });

  it("does not split an astral character in half", () => {
    const r = initialOf("😀 Mercy");
    expect(r).toBe("😀");
    expect(Array.from(r)).toHaveLength(1);
  });
});

describe("search", () => {
  const base = build({
    tenants: [
      tenant("a", {
        full_name: "Brian Kamau",
        phone: "+254733111222",
        email: "brian@example.test",
        id_number: "AX8812345",
        occupation: "Nurse",
        employer: "Nairobi Hospital",
      }),
    ],
    leases: [lease("l1", "a")],
    units: [{ id: "u-l1", unit_number: "A101", building_id: "b1" }],
    buildings: [{ id: "b1", name: "Riverside Court" }],
  }).tenants[0];

  it("matches name, email, id, occupation, employer, unit and building", () => {
    for (const q of [
      "brian",
      "KAMAU",
      "brian@example",
      "ax88",
      "nurse",
      "hospital",
      "a101",
      "riverside",
    ]) {
      expect(tenantMatches(base, q)).toBe(true);
    }
  });

  it("finds a +254 number when the landlord types the 07 form", () => {
    // The add form normalises to +254; nobody remembers which form they typed.
    expect(tenantMatches(base, "0733111222")).toBe(true);
    expect(tenantMatches(base, "733111222")).toBe(true);
    expect(tenantMatches(base, "+254733111222")).toBe(true);
    expect(tenantMatches(base, "0733 111 222")).toBe(true);
  });

  it("does not match an unrelated number", () => {
    expect(tenantMatches(base, "0799999999")).toBe(false);
  });

  it("ignores a one or two digit query rather than matching everyone", () => {
    // "22" appears in almost every phone number; treating it as a phone search
    // would return the whole directory.
    expect(tenantMatches(base, "22")).toBe(false);
  });

  it("an empty query matches everything", () => {
    expect(tenantMatches(base, "")).toBe(true);
    expect(tenantMatches(base, "   ")).toBe(true);
  });

  it("does not match something absent", () => {
    expect(tenantMatches(base, "zanzibar")).toBe(false);
  });
});
