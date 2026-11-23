/**
 * The portfolio rollup.
 *
 * The group that matters most is "nothing recorded yet", because that is the
 * state every new landlord is in and the state the invented numbers hid. A
 * portfolio with no leases is not collecting 0% of its rent; it has no rent. If
 * collectionRate came back 0 there, the overview would greet a brand-new
 * landlord with "Rent collection below target — 100% of expected rent is still
 * outstanding", which is false in both halves of the sentence.
 *
 * The second group is "money that must not be counted": deposits are not rent,
 * unconfirmed payments are not collection, and rent paid against a lease that
 * has ended does not belong to this month.
 */

import {
  rollUpPortfolio,
  mergeActivity,
  relativeTime,
  endsWithin,
  type ActivityItem,
  type PortfolioLease,
  type PortfolioUnit,
  type PortfolioPayment,
} from "../portfolio";

const NOV = { year: 2026, month: 11 };

const unit = (id: string, status: string): PortfolioUnit => ({
  id,
  building_id: "b1",
  status,
});

const lease = (
  id: string,
  over: Partial<PortfolioLease> = {},
): PortfolioLease => ({
  id,
  tenant_id: `t-${id}`,
  unit_id: `u-${id}`,
  status: "active",
  start_date: "2026-01-01",
  end_date: "2027-12-31",
  monthly_rent: 100000,
  ...over,
});

const pay = (over: Partial<PortfolioPayment> = {}): PortfolioPayment => ({
  lease_id: "l1",
  amount: 100000,
  payment_type: "rent",
  period_year: 2026,
  period_month: 11,
  ...over,
});

function roll(over: Partial<Parameters<typeof rollUpPortfolio>[0]> = {}) {
  return rollUpPortfolio({
    buildingCount: 1,
    units: [],
    leases: [],
    payments: [],
    maintenance: [],
    inquiryStatuses: [],
    period: NOV,
    ...over,
  });
}

describe("an empty portfolio", () => {
  it("reports zero occupancy rather than NaN", () => {
    expect(roll({ buildingCount: 0 }).occupancyRate).toBe(0);
  });

  it("reports NO collection rate, not a rate of zero", () => {
    // The whole reason collectionRate is nullable. 0 here would fire the
    // "collection below target" alert at a landlord with nothing to collect.
    const r = roll();
    expect(r.collectionRate).toBeNull();
    expect(r.rentExpected).toBe(0);
    expect(r.rentOutstanding).toBe(0);
  });

  it("has no tenants and nothing outstanding", () => {
    const r = roll();
    expect(r.activeTenants).toBe(0);
    expect(r.openMaintenance).toBe(0);
    expect(r.unansweredInquiries).toBe(0);
  });
});

describe("units", () => {
  const units = [
    unit("1", "occupied"),
    unit("2", "occupied"),
    unit("3", "vacant"),
    unit("4", "maintenance"),
    unit("5", "reserved"),
  ];

  it("counts each status, including reserved", () => {
    const r = roll({ units });
    expect(r.totalUnits).toBe(5);
    expect(r.occupiedUnits).toBe(2);
    expect(r.vacantUnits).toBe(1);
    expect(r.unavailableUnits).toBe(2);
  });

  it("rounds occupancy to a whole percent", () => {
    expect(roll({ units }).occupancyRate).toBe(40);
  });

  it("counts a unit status it has never seen without dropping it from the total", () => {
    const r = roll({ units: [...units, unit("6", "condemned")] });
    expect(r.totalUnits).toBe(6);
    expect(r.occupiedUnits).toBe(2);
  });
});

describe("tenants", () => {
  it("counts a tenant renting two units once", () => {
    const r = roll({
      leases: [
        lease("l1", { tenant_id: "same" }),
        lease("l2", { tenant_id: "same" }),
      ],
    });
    expect(r.activeTenants).toBe(1);
  });

  it("does not count a tenant whose lease is terminated", () => {
    const r = roll({
      leases: [lease("l1"), lease("l2", { status: "terminated" })],
    });
    expect(r.activeTenants).toBe(1);
  });

  it("counts a lease awaiting signature, which is a live obligation", () => {
    expect(
      roll({ leases: [lease("l1", { status: "pending_signature" })] })
        .activeTenants,
    ).toBe(1);
  });
});

describe("what is due this month", () => {
  it("sums the rent of leases in force", () => {
    const r = roll({
      leases: [
        lease("l1", { monthly_rent: 85000 }),
        lease("l2", { monthly_rent: 140000 }),
      ],
    });
    expect(r.rentExpected).toBe(225000);
  });

  it("ignores a lease that ended before this month", () => {
    const r = roll({
      leases: [
        lease("l1", { monthly_rent: 85000 }),
        lease("l2", { monthly_rent: 140000, end_date: "2026-09-30" }),
      ],
    });
    expect(r.rentExpected).toBe(85000);
  });

  it("ignores a lease that has not started", () => {
    const r = roll({
      leases: [lease("l1", { monthly_rent: 85000, start_date: "2027-01-01" })],
    });
    expect(r.rentExpected).toBe(0);
  });

  it("ignores a terminated lease even if its dates still span the month", () => {
    const r = roll({
      leases: [lease("l1", { monthly_rent: 85000, status: "terminated" })],
    });
    expect(r.rentExpected).toBe(0);
  });
});

describe("what has been collected", () => {
  const leases = [lease("l1", { monthly_rent: 100000 })];

  it("counts a confirmed rent payment for the period", () => {
    const r = roll({ leases, payments: [pay()] });
    expect(r.rentCollected).toBe(100000);
    expect(r.collectionRate).toBe(100);
    expect(r.rentOutstanding).toBe(0);
  });

  it("does NOT count a deposit as rent", () => {
    // A deposit arrives at the start of a tenancy and is refundable. Counting it
    // would show a brand-new tenancy as over-collected in its first month.
    const r = roll({
      leases,
      payments: [pay({ payment_type: "deposit", amount: 100000 })],
    });
    expect(r.rentCollected).toBe(0);
    expect(r.collectionRate).toBe(0);
  });

  it("does not count rent for a different month", () => {
    const r = roll({ leases, payments: [pay({ period_month: 10 })] });
    expect(r.rentCollected).toBe(0);
  });

  it("does not count rent for the same month a year earlier", () => {
    const r = roll({ leases, payments: [pay({ period_year: 2025 })] });
    expect(r.rentCollected).toBe(0);
  });

  it("does not count a payment with no period recorded", () => {
    const r = roll({
      leases,
      payments: [pay({ period_year: null, period_month: null })],
    });
    expect(r.rentCollected).toBe(0);
  });

  it("does not count rent against a lease that is not due this month", () => {
    // Rent settled late for a tenancy that ended in September belongs to
    // September. Letting it land in November makes the rate exceed what is owed.
    const r = roll({
      leases: [lease("l1", { monthly_rent: 100000, end_date: "2026-09-30" })],
      payments: [pay()],
    });
    expect(r.rentExpected).toBe(0);
    expect(r.rentCollected).toBe(0);
  });

  it("adds up instalments against one lease", () => {
    const r = roll({
      leases,
      payments: [pay({ amount: 60000 }), pay({ amount: 40000 })],
    });
    expect(r.rentCollected).toBe(100000);
  });

  it("reports a partial month honestly", () => {
    const r = roll({ leases, payments: [pay({ amount: 70000 })] });
    expect(r.collectionRate).toBe(70);
    expect(r.rentOutstanding).toBe(30000);
  });

  it("never reports negative outstanding on an overpayment", () => {
    const r = roll({ leases, payments: [pay({ amount: 150000 })] });
    expect(r.rentOutstanding).toBe(0);
    expect(r.collectionRate).toBe(150);
  });
});

describe("maintenance and inquiries", () => {
  it("counts only open maintenance, and urgency within it", () => {
    const r = roll({
      maintenance: [
        { status: "open", urgency: "emergency" },
        { status: "in_progress", urgency: "high" },
        { status: "assigned", urgency: "normal" },
        { status: "completed", urgency: "emergency" },
        { status: "cancelled", urgency: "high" },
      ],
    });
    expect(r.openMaintenance).toBe(3);
    expect(r.urgentMaintenance).toBe(2);
  });

  it("counts new and viewed inquiries as unanswered", () => {
    const r = roll({
      inquiryStatuses: [
        "new",
        "viewed",
        "contacted",
        "viewing_scheduled",
        "converted",
        "archived",
      ],
    });
    expect(r.unansweredInquiries).toBe(2);
  });
});

describe("mergeActivity", () => {
  const item = (id: string, at: string): ActivityItem => ({
    id,
    kind: "payment",
    title: "t",
    description: "d",
    at,
    href: null,
  });

  it("interleaves sources newest first", () => {
    const got = mergeActivity(
      [
        [item("a", "2026-11-01T00:00:00Z"), item("c", "2026-11-03T00:00:00Z")],
        [item("b", "2026-11-02T00:00:00Z")],
      ],
      10,
    );
    expect(got.map((i) => i.id)).toEqual(["c", "b", "a"]);
  });

  it("applies the limit after sorting, not before", () => {
    const got = mergeActivity(
      [
        [item("old", "2020-01-01T00:00:00Z")],
        [item("new", "2026-11-20T00:00:00Z")],
      ],
      1,
    );
    expect(got.map((i) => i.id)).toEqual(["new"]);
  });

  it("orders ties by id so the feed does not reshuffle between renders", () => {
    const at = "2026-11-10T08:00:00Z";
    const first = mergeActivity([[item("b", at), item("a", at)]], 10);
    const second = mergeActivity([[item("a", at), item("b", at)]], 10);
    expect(first.map((i) => i.id)).toEqual(["a", "b"]);
    expect(second.map((i) => i.id)).toEqual(first.map((i) => i.id));
  });

  it("drops a row with an unparseable timestamp rather than dating it now", () => {
    const got = mergeActivity(
      [[item("bad", "whenever"), item("ok", "2026-11-01T00:00:00Z")]],
      10,
    );
    expect(got.map((i) => i.id)).toEqual(["ok"]);
  });

  it("handles no sources at all", () => {
    expect(mergeActivity([], 5)).toEqual([]);
    expect(mergeActivity([[], []], 5)).toEqual([]);
  });
});

describe("relativeTime", () => {
  const now = new Date("2026-11-23T12:00:00Z");
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();

  it("says just now under a minute", () => {
    expect(relativeTime(ago(30_000), now)).toBe("just now");
  });

  it("says just now for a timestamp slightly in the future", () => {
    // Clock skew between the database and the server, not a prediction.
    expect(
      relativeTime(new Date(now.getTime() + 5_000).toISOString(), now),
    ).toBe("just now");
  });

  it("singularises one minute and one hour", () => {
    expect(relativeTime(ago(60_000), now)).toBe("1 minute ago");
    expect(relativeTime(ago(3_600_000), now)).toBe("1 hour ago");
  });

  it("pluralises the rest", () => {
    expect(relativeTime(ago(2 * 3_600_000), now)).toBe("2 hours ago");
    expect(relativeTime(ago(45 * 60_000), now)).toBe("45 minutes ago");
  });

  it("says yesterday rather than 1 day ago", () => {
    expect(relativeTime(ago(25 * 3_600_000), now)).toBe("yesterday");
  });

  it("counts days up to a month", () => {
    expect(relativeTime(ago(3 * 86_400_000), now)).toBe("3 days ago");
    expect(relativeTime(ago(29 * 86_400_000), now)).toBe("29 days ago");
  });

  it("switches to months and then years", () => {
    expect(relativeTime(ago(60 * 86_400_000), now)).toBe("2 months ago");
    expect(relativeTime(ago(400 * 86_400_000), now)).toBe("1 year ago");
  });

  it("returns empty for a timestamp it cannot read", () => {
    expect(relativeTime("not a date", now)).toBe("");
  });
});

describe("endsWithin", () => {
  const today = { year: 2026, month: 11, day: 23 };

  it("is true for a lease ending inside the window", () => {
    expect(endsWithin("2026-12-31", today, 60)).toBe(true);
  });

  it("is true on the last day of the window", () => {
    expect(endsWithin("2027-01-22", today, 60)).toBe(true);
  });

  it("is false one day past the window", () => {
    expect(endsWithin("2027-01-23", today, 60)).toBe(false);
  });

  it("is true for a lease ending today", () => {
    expect(endsWithin("2026-11-23", today, 60)).toBe(true);
  });

  it("is false for a lease that already ended", () => {
    expect(endsWithin("2026-11-22", today, 60)).toBe(false);
  });

  it("is false for an open-ended lease", () => {
    expect(endsWithin(null, today, 60)).toBe(false);
  });

  it("is false for an unreadable date", () => {
    expect(endsWithin("soon", today, 60)).toBe(false);
  });
});
