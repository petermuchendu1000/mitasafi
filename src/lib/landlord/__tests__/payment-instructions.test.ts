/**
 * The instruction a tenant follows with their own money.
 *
 * Two failures matter: sending them to the wrong place, and telling them a
 * payment will be matched when it cannot be. Both are tested.
 */

import {
  destinationFor,
  buildInstruction,
  accountReferenceFor,
  describeDestination,
  type PayoutDestination,
} from "../payment-instructions";

const base: PayoutDestination = {
  id: "d1",
  label: "Main",
  method: "mpesa_paybill",
  paybill_number: "522533",
  till_number: null,
  mpesa_phone: null,
  account_reference_mode: "unit_number",
  account_reference: null,
  bank_name: null,
  bank_account_name: null,
  bank_account_number: null,
  bank_branch: null,
  instructions: null,
  is_default: true,
  all_properties: true,
  building_ids: [],
};

const ctx = { unitNumber: "A1", tenantPhone: "+254712345678" };

describe("choosing a destination", () => {
  it("returns null when the landlord has configured none", () => {
    // The caller must say so. Inventing a paybill would send somebody's rent
    // to a stranger.
    expect(destinationFor([], "b1")).toBeNull();
  });

  it("prefers a destination assigned to that block over the default", () => {
    const specific = {
      ...base,
      id: "d2",
      is_default: false,
      all_properties: false,
      building_ids: ["b1"],
      paybill_number: "999111",
    };
    expect(destinationFor([base, specific], "b1")!.id).toBe("d2");
  });

  it("falls back to the default for a block with no assignment", () => {
    const specific = {
      ...base,
      id: "d2",
      is_default: false,
      all_properties: false,
      building_ids: ["b1"],
    };
    expect(destinationFor([base, specific], "b9")!.id).toBe("d1");
  });
});

describe("the account reference", () => {
  it("is the unit number by default", () => {
    expect(accountReferenceFor(base, ctx)).toBe("A1");
  });

  it("is the tenant's phone when that mode is chosen", () => {
    expect(
      accountReferenceFor(
        { ...base, account_reference_mode: "tenant_phone" },
        ctx,
      ),
    ).toBe("+254712345678");
  });

  it("is the fixed text when custom", () => {
    expect(
      accountReferenceFor(
        {
          ...base,
          account_reference_mode: "custom",
          account_reference: "RENT",
        },
        ctx,
      ),
    ).toBe("RENT");
  });

  it("is null rather than a guess when the unit is unknown", () => {
    expect(
      accountReferenceFor(base, { unitNumber: null, tenantPhone: null }),
    ).toBeNull();
  });
});

describe("the instruction", () => {
  it("names the paybill and puts the unit in the account field", () => {
    const i = buildInstruction(base, ctx);
    expect(i.headline).toBe("M-Pesa paybill 522533");
    expect(i.steps.join(" ")).toContain("Business number: 522533");
    expect(i.steps.join(" ")).toContain("Account number: A1");
    expect(i.referenceMissing).toBe(false);
  });

  it("flags that a till cannot carry a reference", () => {
    // A till has no account field, so the payment cannot be matched
    // automatically. Saying so is the difference between a tenant who sends
    // the code and one who assumes it is handled.
    const i = buildInstruction(
      {
        ...base,
        method: "mpesa_till",
        paybill_number: null,
        till_number: "888999",
      },
      ctx,
    );
    expect(i.reference).toBeNull();
    expect(i.referenceMissing).toBe(true);
    expect(i.steps.join(" ")).toMatch(/no account field/i);
  });

  it("flags send-money the same way", () => {
    const i = buildInstruction(
      {
        ...base,
        method: "mpesa_send_money",
        paybill_number: null,
        mpesa_phone: "+254722123456",
      },
      ctx,
    );
    expect(i.referenceMissing).toBe(true);
    expect(i.headline).toBe("M-Pesa to +254722123456");
  });

  it("gives the bank the account name, which a transfer needs", () => {
    const i = buildInstruction(
      {
        ...base,
        method: "bank",
        paybill_number: null,
        bank_name: "Equity Bank",
        bank_account_name: "Asha Mwangi",
        bank_account_number: "0123456789",
        bank_branch: "Kilimani",
        account_reference_mode: "custom",
        account_reference: "A1",
      },
      ctx,
    );
    expect(i.steps.join(" ")).toContain("Account name: Asha Mwangi");
    expect(i.steps.join(" ")).toContain("Account number: 0123456789");
    expect(i.steps.join(" ")).toContain("Kilimani branch");
  });

  it("says 'your unit number' rather than printing nothing when unresolved", () => {
    const i = buildInstruction(base, { unitNumber: null, tenantPhone: null });
    expect(i.steps.join(" ")).toContain("Account number: your unit number");
    expect(i.referenceMissing).toBe(true);
  });

  it("carries the landlord's own note through", () => {
    const i = buildInstruction(
      { ...base, instructions: "Pay by the 5th." },
      ctx,
    );
    expect(i.note).toBe("Pay by the 5th.");
  });
});

describe("the one-line description", () => {
  it("names each method distinctly", () => {
    expect(describeDestination(base)).toBe("Paybill 522533");
    expect(
      describeDestination({ ...base, method: "mpesa_till", till_number: "1" }),
    ).toBe("Till 1");
  });
});
