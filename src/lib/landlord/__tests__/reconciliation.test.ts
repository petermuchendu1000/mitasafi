/**
 * Matching money to a lease.
 *
 * The failure that matters is not a missed match — it is a WRONG one.
 * Crediting rent to the wrong tenant leaves the person who actually paid
 * showing as in arrears and somebody else's account quietly wrong. Every
 * ambiguous case below must refuse rather than guess.
 */

import {
  matchPayment,
  parseMpesaMessage,
  splitMessages,
  normaliseRef,
  periodToSettle,
  type LeaseCandidate,
  type InboundPayment,
} from "../reconciliation";

const lease = (over: Partial<LeaseCandidate> = {}): LeaseCandidate => ({
  leaseId: "L1",
  unitNumber: "A1",
  tenantPhone: "+254712345678",
  tenantName: "Wanjiru Kariuki",
  status: "active",
  ...over,
});

const pay = (over: Partial<InboundPayment> = {}): InboundPayment => ({
  transId: "SFG12ABCDE",
  amount: 30000,
  billRef: "A1",
  msisdn: "254712345678",
  payerName: "WANJIRU KARIUKI",
  transTime: "2026-11-26T09:00:00Z",
  ...over,
});

describe("normalising a reference", () => {
  it("ignores case, spaces, dots, dashes and hashes", () => {
    for (const v of ["a1", "A 1", "a-1", "A.1", "#A1", "a/1", "A_1"]) {
      expect(normaliseRef(v)).toBe("A1");
    }
  });

  it("treats absent as empty rather than throwing", () => {
    expect(normaliseRef(null)).toBe("");
    expect(normaliseRef(undefined)).toBe("");
  });
});

describe("matching", () => {
  it("matches the unit the tenant typed", () => {
    const r = matchPayment(pay(), [
      lease(),
      lease({ leaseId: "L2", unitNumber: "B2" }),
    ]);
    expect(r).toMatchObject({ matched: true, leaseId: "L1" });
  });

  it("matches through sloppy typing", () => {
    const r = matchPayment(pay({ billRef: "a 1" }), [lease()]);
    expect(r.matched).toBe(true);
  });

  it("REFUSES when two units normalise the same way", () => {
    // "A-1" and "A1" are the same string once normalised. A guess here puts
    // money on the wrong account.
    const r = matchPayment(pay({ billRef: "A1" }), [
      lease({ leaseId: "L1", unitNumber: "A1" }),
      lease({ leaseId: "L2", unitNumber: "A-1" }),
    ]);
    expect(r.matched).toBe(false);
    expect(r.reason).toMatch(/ambiguous/i);
  });

  it("ignores leases that are not live", () => {
    const r = matchPayment(pay(), [
      lease({ leaseId: "OLD", status: "terminated" }),
      lease({ leaseId: "L2", unitNumber: "A1", status: "active" }),
    ]);
    expect(r).toMatchObject({ matched: true, leaseId: "L2" });
  });

  it("falls back to the paying number when there is no reference", () => {
    const r = matchPayment(pay({ billRef: null }), [
      lease(),
      lease({ leaseId: "L2", unitNumber: "B2", tenantPhone: "+254799000000" }),
    ]);
    expect(r).toMatchObject({ matched: true, leaseId: "L1" });
    expect(r.reason).toMatch(/No account number/i);
  });

  it("compares phone numbers across formats", () => {
    const r = matchPayment(pay({ billRef: null, msisdn: "0712345678" }), [
      lease(),
    ]);
    expect(r.matched).toBe(true);
  });

  it("REFUSES when one number is on two leases", () => {
    const r = matchPayment(pay({ billRef: null }), [
      lease({ leaseId: "L1" }),
      lease({ leaseId: "L2", unitNumber: "B2" }),
    ]);
    expect(r.matched).toBe(false);
    expect(r.reason).toMatch(/2 leases/);
  });

  it("refuses, with a reason, when nothing matches", () => {
    const r = matchPayment(pay({ billRef: "ZZ9", msisdn: "254700000000" }), [
      lease(),
    ]);
    expect(r.matched).toBe(false);
    expect(r.reason).toMatch(/matches no unit/i);
  });

  it("refuses when the landlord has no live lease at all", () => {
    expect(matchPayment(pay(), [lease({ status: "terminated" })]).matched).toBe(
      false,
    );
  });

  it("NEVER uses the amount to decide", () => {
    // A tenant who pays half their rent has still paid. Matching on amount
    // would strand exactly the people most likely to be chased.
    //
    // The paying number deliberately does NOT belong to the lease: the first
    // version of this test left it matching, so a mutant that filtered on
    // amount was rescued by the phone fallback and the assertion still
    // passed. Only the reference can carry this match now.
    const stranger = { msisdn: "254700999888" };
    const only = [lease({ tenantPhone: "+254799000111" })];
    expect(matchPayment(pay({ ...stranger, amount: 1 }), only)).toMatchObject({
      matched: true,
      leaseId: "L1",
    });
    expect(
      matchPayment(pay({ ...stranger, amount: 999999 }), only),
    ).toMatchObject({ matched: true, leaseId: "L1" });
  });
});

describe("reading an M-Pesa confirmation", () => {
  const real =
    "SFG12ABCDE Confirmed. Ksh30,000.00 received from WANJIRU KARIUKI 0712345678 on 4/11/26 at 9:15 AM. Account Number A1. New Account balance is Ksh45,000.00";

  it("pulls out the code, amount, payer and account", () => {
    const p = parseMpesaMessage(real)!;
    expect(p.transId).toBe("SFG12ABCDE");
    expect(p.amount).toBe(30000);
    expect(p.billRef).toBe("A1");
    expect(p.msisdn).toBe("0712345678");
    expect(p.payerName).toBe("WANJIRU KARIUKI");
  });

  it("handles a Buy Goods message, which carries no account", () => {
    const p = parseMpesaMessage(
      "SEJ88XYZQ1 Confirmed. Ksh12,500.00 received from JOHN OTIENO 0722004455 on 5/11/26 at 10:00 AM.",
    )!;
    expect(p.billRef).toBeNull();
    expect(p.amount).toBe(12500);
  });

  it("returns null rather than a half-filled row", () => {
    // A row in the money inbox with a guessed amount is worse than no row.
    expect(parseMpesaMessage("")).toBeNull();
    expect(parseMpesaMessage("just some text")).toBeNull();
    expect(
      parseMpesaMessage("SFG12ABCDE Confirmed. received from X 0712345678"),
    ).toBeNull();
  });

  it("refuses a zero or negative amount", () => {
    expect(
      parseMpesaMessage(
        "SFG12ABCDE Confirmed. Ksh0.00 received from X 0712345678",
      ),
    ).toBeNull();
  });

  it("splits a pasted block into separate confirmations", () => {
    const two = `${real}\n\nSEJ88XYZQ1 Confirmed. Ksh12,500.00 received from JOHN OTIENO 0722004455 on 5/11/26 at 10:00 AM.`;
    const parts = splitMessages(two);
    expect(parts).toHaveLength(2);
    expect(parts.map((t) => parseMpesaMessage(t)!.transId)).toEqual([
      "SFG12ABCDE",
      "SEJ88XYZQ1",
    ]);
  });

  it("splits even when they are run together on one line", () => {
    const run = `${real} SEJ88XYZQ1 Confirmed. Ksh12,500.00 received from JOHN OTIENO 0722004455 on 5/11/26 at 10:00 AM.`;
    expect(splitMessages(run)).toHaveLength(2);
  });
});

describe("end to end on the text", () => {
  it("reads a real message and matches it to the right lease", () => {
    const p = parseMpesaMessage(
      "SFG12ABCDE Confirmed. Ksh30,000.00 received from WANJIRU KARIUKI 0712345678 on 4/11/26 at 9:15 AM. Account Number a-1.",
    )!;
    const r = matchPayment(p, [
      lease({ leaseId: "L1", unitNumber: "A1" }),
      lease({ leaseId: "L2", unitNumber: "A2", tenantPhone: "+254700111222" }),
    ]);
    expect(r).toMatchObject({ matched: true, leaseId: "L1" });
  });
});

describe("which month a reconciled payment settles", () => {
  const terms = {
    monthlyRent: 30000,
    rentDueDay: 5,
    gracePeriodDays: 5,
    startDate: "2026-06-01",
    endDate: null as string | null,
  };
  const today = { year: 2026, month: 11, day: 20 };

  it("credits the current month when nothing has ever been recorded", () => {
    // No ledger exists, so there is no arrear to apply this against. The
    // alternative — walking back to the lease start — would declare five
    // months unpaid on the strength of no evidence at all.
    expect(periodToSettle(terms, new Map(), today)).toEqual({
      year: 2026,
      month: 11,
    });
  });

  it("never treats months before the first recorded rent as debt", () => {
    // THE REAL CASE THIS EXISTS FOR: a lease running since February whose
    // landlord only began recording in August. February to July are not
    // arrears; they are months with no records. The next payment belongs to
    // September, the first month actually owing inside the ledger.
    const early = { ...terms, startDate: "2026-02-01" };
    const paid = new Map([["2026-8", 30000]]);
    expect(periodToSettle(early, paid, today)).toEqual({
      year: 2026,
      month: 9,
    });
  });

  it("settles the oldest month still owing once a ledger exists", () => {
    const paid = new Map([
      ["2026-6", 30000],
      ["2026-8", 30000],
    ]);
    expect(periodToSettle(terms, paid, today)).toEqual({
      year: 2026,
      month: 7,
    });
  });

  it("stays on a month that is only part paid", () => {
    // 10,000 of 30,000. The month is not settled, so the next payment
    // belongs to it — not to the month after.
    const paid = new Map([["2026-6", 10000]]);
    expect(periodToSettle(terms, paid, today)).toEqual({
      year: 2026,
      month: 6,
    });
  });

  it("falls to the current month when the tenant is paid up", () => {
    const paid = new Map<string, number>();
    for (let m = 6; m <= 11; m++) paid.set(`2026-${m}`, 30000);
    expect(periodToSettle(terms, paid, today)).toEqual({
      year: 2026,
      month: 11,
    });
  });

  it("never credits a month before the tenancy began", () => {
    const late = { ...terms, startDate: "2026-10-14" };
    const paid = new Map([["2026-10", 5000]]);
    expect(periodToSettle(late, paid, today)).toEqual({
      year: 2026,
      month: 10,
    });
  });

  it("credits an ended lease's last real month, not today", () => {
    // A lease that ended in August cannot owe November rent, and filing a
    // late payment against November would invent a tenancy.
    const ended = { ...terms, endDate: "2026-08-31" };
    const paid = new Map([
      ["2026-6", 30000],
      ["2026-7", 30000],
      ["2026-8", 30000],
    ]);
    expect(periodToSettle(ended, paid, today)).toEqual({
      year: 2026,
      month: 8,
    });
  });

  it("crosses the year boundary correctly", () => {
    const old = { ...terms, startDate: "2025-01-01" };
    const jan = { year: 2026, month: 1, day: 20 };
    // The ledger starts Feb 2025 and that month is settled, so the next
    // month owing is March 2025 — a year-crossing walk, not a reset.
    const paid = new Map([["2025-2", 30000]]);
    expect(periodToSettle(old, paid, jan)).toEqual({ year: 2025, month: 3 });
  });
});
