/**
 * The two rules that decide whether these pages tell the truth.
 *
 * A deposit counted as income overstates earnings by its full value, every
 * month it sits there. An estimate counted as spend reports money that has not
 * left the account. Both are the kind of error that looks like a working page.
 */

import {
  summariseIncome,
  summariseExpenses,
  type PaymentInput,
  type MaintenanceCostInput,
} from "../finance";

const TODAY = { year: 2026, month: 11, day: 25 };

const pay = (over: Partial<PaymentInput> = {}): PaymentInput => ({
  amount: 50000,
  payment_type: "rent",
  status: "confirmed",
  payment_date: "2026-11-05",
  ...over,
});

const job = (
  over: Partial<MaintenanceCostInput> = {},
): MaintenanceCostInput => ({
  actual_cost: null,
  estimated_cost: null,
  cost_paid_by: "landlord",
  status: "completed",
  category: "plumbing",
  completed_at: "2026-11-10",
  reported_at: "2026-11-01",
  ...over,
});

describe("income", () => {
  it("does not count a deposit as earnings", () => {
    const r = summariseIncome(
      [pay({ amount: 50000 }), pay({ payment_type: "deposit", amount: 80000 })],
      TODAY,
    );
    expect(r.received).toBe(50000);
    expect(r.depositsHeld).toBe(80000);
    // Nor in the breakdown shown under the received figure.
    expect(r.byType.map((t) => t.type)).not.toContain("deposit");
  });

  it("keeps the type breakdown adding up to the received figure", () => {
    // A column that sums to more than the headline above it is the same
    // overstatement in a different shape.
    const r = summariseIncome(
      [
        pay({ amount: 50000 }),
        pay({ payment_type: "water", amount: 3000 }),
        pay({ payment_type: "deposit", amount: 80000 }),
        pay({ payment_type: "deposit_refund", amount: 10000 }),
      ],
      TODAY,
    );
    const sum = r.byType.reduce((t, row) => t + row.amount, 0);
    expect(sum).toBe(r.received);
    expect(sum).toBe(53000);
  });

  it("ignores anything not confirmed, because a promise is not money", () => {
    const r = summariseIncome(
      [pay(), pay({ status: "pending" }), pay({ status: "failed" })],
      TODAY,
    );
    expect(r.received).toBe(50000);
    expect(r.countedPayments).toBe(1);
    expect(r.unconfirmed).toBe(2);
  });

  it("subtracts a refunded deposit from what is held", () => {
    const r = summariseIncome(
      [
        pay({ payment_type: "deposit", amount: 80000 }),
        pay({ payment_type: "deposit_refund", amount: 30000 }),
      ],
      TODAY,
    );
    expect(r.depositsHeld).toBe(50000);
    expect(r.refunded).toBe(30000);
    // A refund is not negative earnings either.
    expect(r.received).toBe(0);
  });

  it("buckets earnings by the month they arrived, and leaves deposits out of the chart", () => {
    const r = summariseIncome(
      [
        pay({ amount: 10000, payment_date: "2026-11-05" }),
        pay({ amount: 20000, payment_date: "2026-10-05" }),
        pay({
          payment_type: "deposit",
          amount: 99000,
          payment_date: "2026-11-05",
        }),
      ],
      TODAY,
    );
    const nov = r.months.find((m) => m.month === 11)!;
    const oct = r.months.find((m) => m.month === 10)!;
    expect(nov.amount).toBe(10000);
    expect(oct.amount).toBe(20000);
  });

  it("groups by type, largest first", () => {
    const r = summariseIncome(
      [pay({ amount: 10000 }), pay({ payment_type: "water", amount: 40000 })],
      TODAY,
    );
    expect(r.byType[0]).toMatchObject({ type: "water", amount: 40000 });
  });
});

describe("expenses", () => {
  it("counts actual cost as spend and keeps an estimate out of it", () => {
    // A job quoted at 18,000 and not yet done has cost nothing.
    const r = summariseExpenses(
      [
        job({ actual_cost: 12500 }),
        job({
          actual_cost: null,
          estimated_cost: 18000,
          status: "in_progress",
        }),
      ],
      TODAY,
    );
    expect(r.spent).toBe(12500);
    expect(r.committed).toBe(18000);
  });

  it("prefers the actual cost when both are present", () => {
    const r = summariseExpenses(
      [job({ actual_cost: 12500, estimated_cost: 14000 })],
      TODAY,
    );
    expect(r.spent).toBe(12500);
    expect(r.committed).toBe(0);
  });

  it("excludes costs somebody else bears", () => {
    const r = summariseExpenses(
      [
        job({ actual_cost: 5000, cost_paid_by: "landlord" }),
        job({ actual_cost: 9000, cost_paid_by: "tenant" }),
        job({ actual_cost: 7000, cost_paid_by: "warranty" }),
      ],
      TODAY,
    );
    expect(r.spent).toBe(5000);
    expect(r.borneByOthers).toBe(16000);
  });

  it("treats an unrecorded payer on the landlord's own job as theirs", () => {
    // Understating spend is the worse error, and the job is already filtered
    // to this landlord before it gets here.
    const r = summariseExpenses(
      [job({ actual_cost: 4000, cost_paid_by: null })],
      TODAY,
    );
    expect(r.spent).toBe(4000);
  });

  it("reports jobs with no cost recorded as a gap, not as zero spend", () => {
    const r = summariseExpenses(
      [job({ actual_cost: null, estimated_cost: null })],
      TODAY,
    );
    expect(r.jobsWithoutCost).toBe(1);
    expect(r.spent).toBe(0);
    expect(r.jobsWithCost).toBe(0);
  });

  it("buckets spend by the month the work completed", () => {
    const r = summariseExpenses(
      [
        job({ actual_cost: 1000, completed_at: "2026-11-10" }),
        job({ actual_cost: 2000, completed_at: "2026-09-10" }),
      ],
      TODAY,
    );
    expect(r.months.find((m) => m.month === 11)!.amount).toBe(1000);
    expect(r.months.find((m) => m.month === 9)!.amount).toBe(2000);
  });

  it("groups by category, largest first", () => {
    const r = summariseExpenses(
      [
        job({ actual_cost: 1000, category: "plumbing" }),
        job({ actual_cost: 9000, category: "electrical" }),
      ],
      TODAY,
    );
    expect(r.byCategory[0]).toMatchObject({
      category: "electrical",
      amount: 9000,
    });
  });
});

describe("the month window", () => {
  it("covers the requested number of months ending with today", () => {
    const r = summariseIncome([], TODAY, 6);
    expect(r.months).toHaveLength(6);
    expect(r.months[5]).toMatchObject({ year: 2026, month: 11 });
    expect(r.months[0]).toMatchObject({ year: 2026, month: 6 });
  });

  it("crosses a year boundary without inventing a month 0", () => {
    const r = summariseIncome([], { year: 2027, month: 2, day: 1 }, 4);
    expect(r.months.map((m) => `${m.year}-${m.month}`)).toEqual([
      "2026-11",
      "2026-12",
      "2027-1",
      "2027-2",
    ]);
  });
});
