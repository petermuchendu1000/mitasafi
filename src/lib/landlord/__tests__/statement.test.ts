import {
  buildStatement,
  type StatementLease,
  type StatementPayment,
} from "../statement";

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
    period_month: 6,
    payment_date: "2026-06-05",
    payment_method: "mpesa",
    reference_number: null,
    mpesa_receipt: null,
    ...over,
  };
}

describe("the rent ledger", () => {
  it("charges each month from the first recorded rent, with a running balance", () => {
    const s = buildStatement(
      lease(),
      [
        pay({ period_month: 6, amount: 30000 }),
        pay({ period_month: 7, amount: 30000 }),
        pay({ period_month: 8, amount: 10000 }),
      ],
      TODAY,
    );
    expect(s.lines.map((l) => l.period)).toEqual([
      "Jun 2026",
      "Jul 2026",
      "Aug 2026",
      "Sep 2026",
      "Oct 2026",
      "Nov 2026",
    ]);
    // Jun/Jul settled, Aug short 20,000, Sep/Oct/Nov unpaid.
    expect(s.lines.map((l) => l.balance)).toEqual([
      0, 0, 20000, 50000, 80000, 110000,
    ]);
    expect(s.closingBalance).toBe(110000);
  });

  it("NEVER charges a month before the first recorded rent", () => {
    // The tenancy began in February; the landlord started recording in
    // August. February to July are months with no records, not arrears.
    // Charging them would put 180,000 of invented debt in a document
    // handed to the tenant.
    const s = buildStatement(
      lease({ start_date: "2026-02-01" }),
      [pay({ period_month: 8, amount: 30000 })],
      TODAY,
    );
    expect(s.lines[0].period).toBe("Aug 2026");
    expect(s.from).toBe("Aug 2026");
    expect(s.totalCharged).toBe(120000); // Aug, Sep, Oct, Nov
  });

  it("produces no ledger at all when nothing has ever been recorded", () => {
    const s = buildStatement(lease(), [], TODAY);
    expect(s.lines).toEqual([]);
    expect(s.from).toBeNull();
    expect(s.closingBalance).toBe(0);
    expect(s.totalCharged).toBe(0);
  });

  it("shows a credit as a negative balance rather than clamping it to zero", () => {
    // A tenant who overpays is owed that money. Clamping would quietly
    // keep it.
    const s = buildStatement(
      lease(),
      [pay({ period_month: 6, amount: 50000 })],
      TODAY,
    );
    expect(s.lines[0].balance).toBe(-20000);
  });

  it("stops charging after the lease ends", () => {
    const s = buildStatement(
      lease({ end_date: "2026-08-31" }),
      [pay({ period_month: 6, amount: 30000 })],
      TODAY,
    );
    expect(s.lines.map((l) => l.period)).toEqual([
      "Jun 2026",
      "Jul 2026",
      "Aug 2026",
    ]);
  });
});

describe("accounting for every payment", () => {
  it("lists a confirmed rent payment that has NO period, instead of dropping it", () => {
    // The arrears and collections reports skip these, correctly, because
    // they answer "what is owed this month". A statement cannot: the
    // tenant knows they sent it, and a missing payment discredits every
    // other figure on the page.
    const s = buildStatement(
      lease(),
      [
        pay({ period_month: 6, amount: 30000 }),
        pay({
          period_year: null,
          period_month: null,
          amount: 17500,
          mpesa_receipt: "SFG12ABCDE",
        }),
      ],
      TODAY,
    );
    expect(s.unallocated).toHaveLength(1);
    expect(s.unallocatedTotal).toBe(17500);
    expect(s.unallocated[0].reference).toBe("SFG12ABCDE");
    // And it is NOT silently applied to a month.
    expect(s.totalPaid).toBe(30000);
  });

  it("keeps non-rent payments out of the rent balance but on the statement", () => {
    const s = buildStatement(
      lease(),
      [
        pay({ period_month: 6, amount: 30000 }),
        pay({ payment_type: "water", amount: 1500, period_month: 6 }),
        pay({ payment_type: "service_charge", amount: 2500, period_month: 6 }),
      ],
      TODAY,
    );
    expect(s.other.map((o) => o.label).sort()).toEqual([
      "Service charge",
      "Water",
    ]);
    expect(s.otherTotal).toBe(4000);
    // June's rent is settled by the 30,000 alone; the water payment must
    // not make it look overpaid.
    expect(s.lines[0].balance).toBe(0);
  });

  it("never lets a deposit settle rent", () => {
    const s = buildStatement(
      lease(),
      [
        pay({ period_month: 6, amount: 30000 }),
        pay({ payment_type: "deposit", amount: 60000, period_month: 7 }),
      ],
      TODAY,
    );
    expect(s.lines[1]).toMatchObject({ period: "Jul 2026", paid: 0 });
    expect(s.depositHeld).toBe(60000);
  });

  it("ignores an unconfirmed payment but says how many there were", () => {
    // A pending payment is a promise. Counting it would tell the tenant
    // they are square when the money has not arrived.
    const s = buildStatement(
      lease(),
      [
        pay({ period_month: 6, amount: 30000 }),
        pay({ period_month: 7, amount: 30000, status: "pending" }),
      ],
      TODAY,
    );
    expect(s.lines[1]).toMatchObject({ period: "Jul 2026", paid: 0 });
    expect(s.unconfirmedCount).toBe(1);
  });
});

describe("it agrees with the rest of the product", () => {
  it("uses the same mid-month move-in rule as every other screen", () => {
    // A tenant who moved in on the 23rd does not owe rent that was due on
    // the 5th of that month. rentStatusForPeriod knows that; a statement
    // that recomputed the charge by hand would not.
    const s = buildStatement(
      lease({ start_date: "2026-06-23" }),
      [pay({ period_month: 6, amount: 1 })],
      TODAY,
    );
    expect(s.lines[0].period).toBe("Jun 2026");
    expect(s.lines[0].charged).toBe(30000);
  });

  it("totals charged and paid consistently with the lines", () => {
    const s = buildStatement(
      lease(),
      [pay({ period_month: 6 }), pay({ period_month: 7, amount: 5000 })],
      TODAY,
    );
    expect(s.totalCharged).toBe(s.lines.reduce((n, l) => n + l.charged, 0));
    expect(s.totalPaid).toBe(s.lines.reduce((n, l) => n + l.paid, 0));
    expect(s.closingBalance).toBe(s.totalCharged - s.totalPaid);
    expect(s.closingBalance).toBe(s.lines[s.lines.length - 1].balance);
  });
});

describe("the deposit appears exactly once", () => {
  it("does not list a deposit payment among the other amounts", () => {
    // Shown as "Deposit held 60,000" AND again as a 60,000 payment, the
    // statement reads as 120,000 to the tenant holding it. Found by
    // reading the rendered page, not by a failing assertion.
    const s = buildStatement(
      lease(),
      [
        pay({ period_month: 6, amount: 30000 }),
        pay({
          payment_type: "deposit",
          amount: 60000,
          period_month: null,
          period_year: null,
        }),
      ],
      TODAY,
    );
    expect(s.other).toEqual([]);
    expect(s.depositPayments).toHaveLength(1);
    expect(s.depositPaid).toBe(60000);
    expect(s.depositHeld).toBe(60000);
  });

  it("keeps the lease figure and the payments apart, so a mismatch shows", () => {
    // The lease says 60,000; only 20,000 was ever recorded. Netting these
    // into one number would hide the gap from both parties.
    const s = buildStatement(
      lease({ deposit_amount: 60000 }),
      [
        pay({ period_month: 6, amount: 30000 }),
        pay({ payment_type: "deposit", amount: 20000 }),
      ],
      TODAY,
    );
    expect(s.depositHeld).toBe(60000);
    expect(s.depositPaid).toBe(20000);
  });

  it("still keeps a deposit out of the rent balance", () => {
    const s = buildStatement(
      lease(),
      [
        pay({ period_month: 6, amount: 30000 }),
        pay({ payment_type: "deposit", amount: 60000, period_month: 7 }),
      ],
      TODAY,
    );
    expect(s.lines[1]).toMatchObject({ period: "Jul 2026", paid: 0 });
  });
});
