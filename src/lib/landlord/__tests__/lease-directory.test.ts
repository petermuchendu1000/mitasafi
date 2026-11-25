/**
 * The lease directory's rules, each pinned to the decision it encodes.
 *
 * The ones worth having are not the happy paths. They are the three that would
 * be invisible in a screenshot and wrong in a dispute: an open-ended lease
 * reported as expiring, an ended lease still counted in the rent roll, and a
 * deposit counted as held when it was never collected.
 */

import {
  buildLeaseDirectory,
  leaseMatches,
  EXPIRING_WINDOW_DAYS,
  type LeaseRowInput,
} from "../lease-directory";

const TODAY = { year: 2026, month: 11, day: 25 };

const BASE: LeaseRowInput = {
  id: "l1",
  unit_id: "u1",
  tenant_id: "t1",
  status: "active",
  lease_type: "fixed",
  start_date: "2026-01-01",
  end_date: null,
  monthly_rent: 50000,
  deposit_amount: 50000,
  deposit_status: "held",
  rent_due_day: 5,
  lease_document_url: null,
  other_documents: null,
};

const build = (leases: Partial<LeaseRowInput>[]) =>
  buildLeaseDirectory({
    leases: leases.map((l, i) => ({ ...BASE, id: `l${i + 1}`, ...l })),
    tenants: [{ id: "t1", full_name: "Grace Wanjiru", phone: "+254712345678" }],
    units: [{ id: "u1", unit_number: "A101", building_id: "b1" }],
    buildings: [{ id: "b1", name: "Riverside Court" }],
    today: TODAY,
  });

/** days ahead of TODAY, as an ISO date */
const inDays = (n: number) =>
  new Date(Date.UTC(2026, 10, 25) + n * 86_400_000).toISOString().slice(0, 10);

describe("what counts as expiring", () => {
  it("never calls a month-to-month lease expiring, because it has no end", () => {
    // A null end_date is open-ended, not overdue for renewal. Treating it as
    // "ends today" is the obvious bug this guards.
    const r = build([{ end_date: null }]);
    expect(r.leases[0].state).toBe("live");
    expect(r.leases[0].term).toBe("Month to month");
    expect(r.stats.expiring).toBe(0);
  });

  it("flags one ending inside the window", () => {
    const r = build([{ end_date: inDays(30) }]);
    expect(r.leases[0].state).toBe("expiring");
    expect(r.leases[0].daysToEnd).toBe(30);
  });

  it("leaves one ending beyond the window alone", () => {
    const r = build([{ end_date: inDays(EXPIRING_WINDOW_DAYS + 5) }]);
    expect(r.leases[0].state).toBe("live");
    expect(r.stats.expiring).toBe(0);
  });

  it("does not call an already-finished lease expiring", () => {
    const r = build([{ status: "expired", end_date: inDays(-10) }]);
    expect(r.leases[0].state).toBe("ended");
    expect(r.leases[0].daysToEnd).toBeNull();
  });
});

describe("the rent roll", () => {
  it("counts live leases only", () => {
    // An ended lease bills nothing. Including it would overstate monthly
    // income on the one screen a landlord uses to check it.
    const r = build([
      { status: "active", monthly_rent: 50000 },
      { status: "terminated", monthly_rent: 90000 },
    ]);
    expect(r.stats.monthlyRentRoll).toBe(50000);
    expect(r.stats.live).toBe(1);
    expect(r.stats.ended).toBe(1);
  });

  it("includes an expiring lease, which is still being paid", () => {
    const r = build([{ end_date: inDays(10), monthly_rent: 70000 }]);
    expect(r.stats.expiring).toBe(1);
    expect(r.stats.monthlyRentRoll).toBe(70000);
  });
});

describe("deposits", () => {
  it("counts only the money actually held", () => {
    // Summing every deposit_amount would tell a landlord they are holding
    // money they never collected.
    const r = build([
      { deposit_status: "held", deposit_amount: 50000 },
      { deposit_status: "pending", deposit_amount: 80000 },
      { deposit_status: "refunded", deposit_amount: 20000 },
    ]);
    expect(r.stats.depositsHeld).toBe(50000);
  });

  it("treats a missing deposit as zero, not as a blank", () => {
    const r = build([{ deposit_amount: null, deposit_status: null }]);
    expect(r.leases[0].depositAmount).toBe(0);
    expect(r.leases[0].depositHeld).toBe(false);
  });
});

describe("documents", () => {
  it("counts the lease document and the extras together", () => {
    const r = build([
      { lease_document_url: "x.pdf", other_documents: ["a.pdf", "b.pdf"] },
    ]);
    expect(r.leases[0].documentCount).toBe(3);
  });

  it("reports live leases with nothing filed", () => {
    const r = build([
      { lease_document_url: null, other_documents: null },
      { lease_document_url: "x.pdf" },
      { status: "terminated", lease_document_url: null },
    ]);
    // The terminated one is not chased for paperwork.
    expect(r.stats.withoutDocument).toBe(1);
  });
});

describe("rows whose related record is missing", () => {
  it("says so instead of rendering a blank cell", () => {
    const r = buildLeaseDirectory({
      leases: [{ ...BASE, tenant_id: "ghost", unit_id: "ghost" }],
      tenants: [],
      units: [],
      buildings: [],
      today: TODAY,
    });
    expect(r.leases[0].tenantName).toMatch(/not on record/i);
    expect(r.leases[0].unitNumber).toMatch(/not on record/i);
  });
});

describe("ordering", () => {
  it("puts the soonest-ending lease first, then the rest, then the finished", () => {
    const r = build([
      { id: "a", status: "terminated" },
      { id: "b", end_date: null },
      { id: "c", end_date: inDays(45) },
      { id: "d", end_date: inDays(5) },
    ]);
    expect(r.leases.map((l) => l.state)).toEqual([
      "expiring",
      "expiring",
      "live",
      "ended",
    ]);
    expect(r.leases[0].daysToEnd).toBe(5);
    expect(r.leases[1].daysToEnd).toBe(45);
  });
});

describe("search", () => {
  it("finds a tenant stored as +254 when the landlord types 07", () => {
    const lease = build([{}]).leases[0];
    expect(leaseMatches(lease, "0712345678")).toBe(true);
  });

  it("matches the unit, the building and the status label", () => {
    const lease = build([{}]).leases[0];
    for (const q of ["a101", "riverside", "active"]) {
      expect(leaseMatches(lease, q)).toBe(true);
    }
  });

  it("does not match something absent", () => {
    expect(leaseMatches(build([{}]).leases[0], "zzzz")).toBe(false);
  });

  it("an empty query matches everything, so the list is not empty by default", () => {
    expect(leaseMatches(build([{}]).leases[0], "   ")).toBe(true);
  });
});
