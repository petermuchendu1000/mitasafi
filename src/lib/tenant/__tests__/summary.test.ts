import { tenancySummary, duePhrase } from "../summary";
import type {
  StatementLease,
  StatementPayment,
} from "@/lib/landlord/statement";

const TODAY = { year: 2026, month: 11, day: 20 };

function lease(over: Partial<StatementLease> = {}): StatementLease {
  return {
    id: "l1",
    unit_label: "A1",
    building_label: "Riverside",
    start_date: "2026-06-01",
    end_date: "2027-05-31",
    monthly_rent: 30000,
    rent_due_day: 5,
    grace_period_days: 5,
    deposit_amount: 60000,
    ...over,
  };
}

let n = 0;
function pay(over: Partial<StatementPayment> = {}): StatementPayment {
  n += 1;
  return {
    id: `p${n}`,
    amount: 30000,
    payment_type: "rent",
    status: "confirmed",
    period_year: 2026,
    period_month: 11,
    payment_date: "2026-11-03",
    payment_method: "mpesa",
    reference_number: null,
    mpesa_receipt: null,
    ...over,
  };
}

describe("this month's position", () => {
  it("reports paid when the month is settled", () => {
    const s = tenancySummary(lease(), [pay()], TODAY);
    expect(s.status).toBe("paid");
    expect(s.balance).toBe(0);
    expect(duePhrase(s)).toBe("Paid");
  });

  it("reports the balance left on a part payment", () => {
    const s = tenancySummary(lease(), [pay({ amount: 11000 })], TODAY);
    expect(s.status).toBe("partial");
    expect(s.balance).toBe(19000);
  });

  it("counts how late it is once the grace period has run out", () => {
    // Due the 5th, grace 5 days, today the 20th.
    const s = tenancySummary(lease(), [], TODAY);
    expect(s.status).toBe("overdue");
    expect(s.daysLate).toBe(10);
    expect(duePhrase(s)).toBe("10 days late");
  });

  it("is not late while still inside the grace period", () => {
    const s = tenancySummary(
      lease({ rent_due_day: 18, grace_period_days: 5 }),
      [],
      TODAY,
    );
    expect(s.status).toBe("pending");
    expect(s.daysLate).toBe(0);
    expect(duePhrase(s)).toBe("Due");
  });

  it("counts down to a due date still ahead", () => {
    const s = tenancySummary(lease({ rent_due_day: 23 }), [], TODAY);
    expect(s.daysUntilDue).toBe(3);
    expect(duePhrase(s)).toBe("Due in 3 days");
  });

  it("says due today on the day", () => {
    const s = tenancySummary(lease({ rent_due_day: 20 }), [], TODAY);
    expect(duePhrase(s)).toBe("Due today");
  });

  it("says day, not days, for one", () => {
    const s = tenancySummary(lease({ rent_due_day: 21 }), [], TODAY);
    expect(duePhrase(s)).toBe("Due in 1 day");
  });

  it("ignores another month's payment", () => {
    const s = tenancySummary(lease(), [pay({ period_month: 10 })], TODAY);
    expect(s.paid).toBe(0);
    expect(s.status).toBe("overdue");
  });

  it("ignores an unconfirmed payment", () => {
    const s = tenancySummary(lease(), [pay({ status: "pending" })], TODAY);
    expect(s.paid).toBe(0);
  });

  it("never lets a deposit settle the rent", () => {
    const s = tenancySummary(
      lease(),
      [pay({ payment_type: "deposit", amount: 60000 })],
      TODAY,
    );
    expect(s.paid).toBe(0);
    expect(s.depositHeld).toBe(60000);
  });
});

describe("the rest of the tenancy", () => {
  it("counts the days to the end of the lease", () => {
    expect(
      tenancySummary(lease({ end_date: "2026-12-31" }), [], TODAY).daysUntilEnd,
    ).toBe(41);
  });

  it("reports no end date for an open lease", () => {
    expect(
      tenancySummary(lease({ end_date: null }), [], TODAY).daysUntilEnd,
    ).toBeNull();
  });

  it("goes negative once the lease has run out", () => {
    const s = tenancySummary(lease({ end_date: "2026-10-31" }), [], TODAY);
    expect(s.daysUntilEnd).toBeLessThan(0);
  });

  it("totals every confirmed rent payment, including one with no month", () => {
    // The tenant paid it. It counts toward what they have paid, even though
    // no month can claim it — the statement lists those separately.
    const s = tenancySummary(
      lease(),
      [
        pay({ period_month: 10, amount: 30000 }),
        pay({ period_year: null, period_month: null, amount: 5000 }),
      ],
      TODAY,
    );
    expect(s.lifetimeRentPaid).toBe(35000);
  });
});
