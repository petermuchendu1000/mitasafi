/**
 * The queue's two load-bearing properties: it never ranks people by money,
 * and it never divides by a rent it does not have.
 */

import {
  buildApplicationQueue,
  applicationMatches,
  type ApplicationRow,
} from "../applications";

const app = (over: Partial<ApplicationRow> = {}): ApplicationRow => ({
  id: "a1",
  listing_id: "L1",
  applicant_id: "u1",
  full_name: "Asha Wanjiru",
  email: "asha@example.test",
  phone: "+254712345678",
  occupation: "Nurse",
  employer: "Aga Khan",
  monthly_income: 90000,
  household_size: 2,
  move_in_date: "2026-12-01",
  lease_months: 12,
  message: null,
  status: "new",
  landlord_notes: null,
  decided_at: null,
  created_at: "2026-11-20T08:00:00Z",
  ...over,
});

const listings = [
  { id: "L1", title: "2br in Kilimani", rent_amount: 45000 },
  { id: "L2", title: "Studio in Karen", rent_amount: 0 },
];

describe("the queue order", () => {
  it("puts what needs attention first, newest first within a status", () => {
    const { applications } = buildApplicationQueue({
      applications: [
        app({
          id: "old-new",
          status: "new",
          created_at: "2026-11-01T00:00:00Z",
        }),
        app({ id: "approved", status: "approved" }),
        app({
          id: "new-new",
          status: "new",
          created_at: "2026-11-22T00:00:00Z",
        }),
        app({ id: "reviewing", status: "reviewing" }),
      ],
      listings,
    });
    expect(applications.map((a) => a.id)).toEqual([
      "new-new",
      "old-new",
      "reviewing",
      "approved",
    ]);
  });

  it("does not reorder by income, however large", () => {
    // Ordering a housing queue by money is a screening policy. This module
    // has no business inventing one.
    const { applications } = buildApplicationQueue({
      applications: [
        app({
          id: "poor",
          status: "new",
          monthly_income: 46000,
          created_at: "2026-11-22T00:00:00Z",
        }),
        app({
          id: "rich",
          status: "new",
          monthly_income: 900000,
          created_at: "2026-11-01T00:00:00Z",
        }),
      ],
      listings,
    });
    expect(applications.map((a) => a.id)).toEqual(["poor", "rich"]);
  });
});

describe("the income ratio", () => {
  it("is arithmetic on the asking rent", () => {
    const { applications } = buildApplicationQueue({
      applications: [app({ monthly_income: 90000 })],
      listings,
    });
    expect(applications[0].incomeToRent).toBe(2);
  });

  it("is null when the applicant stated no income", () => {
    const { applications } = buildApplicationQueue({
      applications: [app({ monthly_income: null })],
      listings,
    });
    expect(applications[0].incomeToRent).toBeNull();
  });

  it("is null rather than Infinity when the rent is zero or missing", () => {
    const { applications } = buildApplicationQueue({
      applications: [
        app({ id: "zero-rent", listing_id: "L2" }),
        app({ id: "no-listing", listing_id: "GONE" }),
      ],
      listings,
    });
    for (const a of applications) {
      expect(a.incomeToRent).toBeNull();
      expect(Number.isFinite(a.incomeToRent as number)).toBe(false);
    }
  });

  it("names a listing that no longer exists instead of rendering blank", () => {
    const { applications } = buildApplicationQueue({
      applications: [app({ listing_id: "GONE" })],
      listings,
    });
    expect(applications[0].listingTitle).toBe("Listing no longer available");
  });
});

describe("stats", () => {
  it("counts only the statuses still waiting on the landlord as open", () => {
    const { stats } = buildApplicationQueue({
      applications: [
        app({ id: "1", status: "new" }),
        app({ id: "2", status: "reviewing" }),
        app({ id: "3", status: "shortlisted" }),
        app({ id: "4", status: "approved" }),
        app({ id: "5", status: "rejected" }),
        app({ id: "6", status: "withdrawn" }),
      ],
      listings,
    });
    expect(stats.total).toBe(6);
    expect(stats.open).toBe(3);
    expect(stats.byStatus.approved).toBe(1);
  });
});

describe("search", () => {
  const { applications } = buildApplicationQueue({
    applications: [app()],
    listings,
  });
  const only = applications[0];

  it("matches a name, an employer and a listing", () => {
    expect(applicationMatches(only, "asha")).toBe(true);
    expect(applicationMatches(only, "aga khan")).toBe(true);
    expect(applicationMatches(only, "kilimani")).toBe(true);
  });

  it("matches a local 07… number against the stored +2547… number", () => {
    // The stored number has no leading zero after the country code, so a plain
    // substring test fails. This is the bug leaseMatches already had once.
    expect(applicationMatches(only, "0712345678")).toBe(true);
    expect(applicationMatches(only, "712345678")).toBe(true);
  });

  it("does not match an unrelated query", () => {
    expect(applicationMatches(only, "zzzz")).toBe(false);
  });

  it("returns everything for an empty query", () => {
    expect(applicationMatches(only, "   ")).toBe(true);
  });
});
