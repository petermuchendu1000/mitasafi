/**
 * Recording a payment.
 *
 * The property that matters most is that the PERIOD and the PAYMENT DATE are
 * separate. November's rent paid on 2 December is a December payment of
 * November's rent, and every rent figure on every landlord screen keys on the
 * period. Conflating them credits the wrong month and shows a tenant as both
 * overdue and paid up.
 *
 * The second is that a deposit has no period. Those columns are nullable
 * precisely so the distinction survives, and the portfolio rollup refuses to
 * count a payment with no period as rent.
 */

import {
  buildPayment,
  PAYMENT_TYPE_VALUES,
  PAYMENT_METHOD_VALUES,
  type PaymentFormValues,
} from "../payment-form";

const TODAY = { year: 2026, month: 11, day: 23 };

const VALID: PaymentFormValues = {
  amount: "85000",
  payment_type: "rent",
  payment_date: "2026-11-04",
  payment_method: "mpesa",
  reference_number: "RHA10111",
  period: "2026-11",
  notes: "",
};

const build = (over: Partial<PaymentFormValues> = {}) =>
  buildPayment({ ...VALID, ...over }, TODAY);

describe("the allowed sets match the CHECK constraints", () => {
  it("payment_type", () => {
    expect([...PAYMENT_TYPE_VALUES].sort()).toEqual(
      [
        "deposit",
        "deposit_refund",
        "electricity",
        "late_fee",
        "other",
        "rent",
        "repair_deduction",
        "service_charge",
        "water",
      ].sort(),
    );
  });

  it("payment_method", () => {
    expect([...PAYMENT_METHOD_VALUES].sort()).toEqual(
      ["bank", "cash", "cheque", "mpesa", "other"].sort(),
    );
  });

  it("rejects a type outside the constraint", () => {
    expect(build({ payment_type: "tip" }).errors.payment_type).toBeTruthy();
  });

  it("rejects a method outside the constraint", () => {
    // 'mixed' is a LEASE payment method, not a payments one.
    expect(
      build({ payment_method: "mixed" }).errors.payment_method,
    ).toBeTruthy();
  });
});

describe("a valid payment", () => {
  it("produces a confirmed row", () => {
    const p = build().payment!;
    expect(p.amount).toBe(85000);
    expect(p.payment_type).toBe("rent");
    expect(p.payment_date).toBe("2026-11-04");
    expect(p.reference_number).toBe("RHA10111");
    // A landlord recording money they have received is confirming it.
    expect(p.status).toBe("confirmed");
  });

  it("accepts an amount with thousands separators", () => {
    expect(build({ amount: "85,000" }).payment!.amount).toBe(85000);
  });

  it("rounds to the two decimals the column stores", () => {
    expect(build({ amount: "85000.456" }).payment!.amount).toBe(85000.46);
  });

  it("never returns a payment alongside an error", () => {
    expect(build({ amount: "" }).payment).toBeNull();
  });
});

describe("the period is not the payment date", () => {
  it("keeps them apart when rent is paid late", () => {
    // September's rent, settled on 5 October.
    const p = build({ payment_date: "2026-10-05", period: "2026-09" }).payment!;
    expect(p.payment_date).toBe("2026-10-05");
    expect(p.period_year).toBe(2026);
    expect(p.period_month).toBe(9);
  });

  it("keeps them apart when rent is paid early", () => {
    // December's rent, paid on 20 November.
    const p = build({ payment_date: "2026-11-20", period: "2026-12" }).payment!;
    expect(p.payment_date).toBe("2026-11-20");
    expect(p.period_year).toBe(2026);
    expect(p.period_month).toBe(12);
  });

  it("records the period a landlord chose, not the month they typed the date in", () => {
    const p = build({ payment_date: "2026-11-23", period: "2026-09" }).payment!;
    expect(p.period_month).toBe(9);
  });

  it("requires a period for rent", () => {
    expect(build({ period: "" }).errors.period).toBeTruthy();
  });

  it("requires a period for the other recurring charges", () => {
    for (const t of ["service_charge", "water", "electricity", "late_fee"]) {
      expect(build({ payment_type: t, period: "" }).errors.period).toBeTruthy();
    }
  });

  it("does NOT require one for a deposit, and leaves it null", () => {
    const r = build({ payment_type: "deposit", period: "" });
    expect(r.errors).toEqual({});
    expect(r.payment!.period_year).toBeNull();
    expect(r.payment!.period_month).toBeNull();
  });

  it("leaves a deposit's period null even if one was typed", () => {
    // Otherwise the rollup would count a deposit toward a month's rent.
    const p = build({ payment_type: "deposit", period: "2026-11" }).payment!;
    expect(p.period_month).toBeNull();
  });

  it("rejects a month of 13", () => {
    expect(build({ period: "2026-13" }).errors.period).toBeTruthy();
  });

  it("rejects a period decades out", () => {
    expect(build({ period: "1999-01" }).errors.period).toBeTruthy();
    expect(build({ period: "2030-01" }).errors.period).toBeTruthy();
  });

  it("allows next year, for rent paid in advance", () => {
    expect(build({ period: "2027-01" }).errors.period).toBeUndefined();
  });
});

describe("the payment date", () => {
  it("rejects a date in the future", () => {
    // Money that has not arrived should not be in the ledger.
    expect(
      build({ payment_date: "2026-11-24" }).errors.payment_date,
    ).toBeTruthy();
    expect(
      build({ payment_date: "2027-01-01" }).errors.payment_date,
    ).toBeTruthy();
  });

  it("accepts today", () => {
    expect(
      build({ payment_date: "2026-11-23" }).errors.payment_date,
    ).toBeUndefined();
  });

  it("rejects a date decades in the past", () => {
    expect(
      build({ payment_date: "1999-01-01" }).errors.payment_date,
    ).toBeTruthy();
  });

  it("rejects a malformed date", () => {
    expect(build({ payment_date: "" }).errors.payment_date).toBeTruthy();
    expect(build({ payment_date: "4 Nov" }).errors.payment_date).toBeTruthy();
    expect(
      build({ payment_date: "2026-13-01" }).errors.payment_date,
    ).toBeTruthy();
  });
});

describe("the amount", () => {
  it("rejects zero and negatives", () => {
    expect(build({ amount: "0" }).errors.amount).toBeTruthy();
    expect(build({ amount: "-100" }).errors.amount).toBeTruthy();
  });

  it("rejects text and an absurd figure", () => {
    expect(build({ amount: "lots" }).errors.amount).toBeTruthy();
    expect(build({ amount: "10000001" }).errors.amount).toBeTruthy();
  });
});

describe("optional fields", () => {
  it("a blank reference becomes null, not an empty string", () => {
    expect(
      build({ reference_number: "  " }).payment!.reference_number,
    ).toBeNull();
  });

  it("a blank note becomes null", () => {
    expect(build({ notes: "" }).payment!.notes).toBeNull();
  });

  it("rejects an over-long reference", () => {
    expect(
      build({ reference_number: "x".repeat(61) }).errors.reference_number,
    ).toBeTruthy();
  });
});
