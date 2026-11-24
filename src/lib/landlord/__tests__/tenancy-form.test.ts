/**
 * Add Tenant: one screen, two tables.
 *
 * The groups that carry the weight:
 *
 *   THE ID TYPE. The form offered `military_id`, which tenants_id_type_check
 *   does not permit, and did NOT offer `alien_id`, which is the one Kenyan
 *   landlords need for foreign tenants. One would have failed the insert; the
 *   other was a missing capability.
 *
 *   THE PHONE. The old check was /^0[17]\d{8}$/ — it refused every number in
 *   +254 form, which is the form the rest of this codebase writes. A tenant's
 *   number stored in two shapes is a tenant you cannot find.
 *
 *   THE DEPOSIT STATUS. 'held' means the landlord has the money, and the
 *   portfolio's "deposits held" total sums it. Saying held when the deposit
 *   has not been collected inflates a figure the landlord may act on.
 */

import {
  buildTenancy,
  normaliseKenyanPhone,
  normaliseIdNumber,
  validateIdNumber,
  ID_TYPE_VALUES,
  type TenancyFormValues,
} from "../tenancy-form";

const TODAY = { year: 2026, month: 11, day: 23 };

const VALID: TenancyFormValues = {
  first_name: "Brian",
  last_name: "Kamau",
  phone: "0712345678",
  email: "brian@example.test",
  id_type: "national_id",
  id_number: "24110001",
  occupation: "Engineer",
  employer: "Safaricom",
  emergency_name: "Alice Kamau",
  emergency_phone: "0722000112",
  emergency_relationship: "Spouse",
  start_date: "2026-12-01",
  end_date: "2027-11-30",
  monthly_rent: "85000",
  deposit_amount: "85000",
  deposit_paid: true,
  rent_due_day: "5",
  payment_method: "mpesa",
  notes: "",
};

const build = (over: Partial<TenancyFormValues> = {}) =>
  buildTenancy({ ...VALID, ...over }, TODAY);

describe("normaliseKenyanPhone", () => {
  it("accepts the four shapes landlords type, and returns one", () => {
    for (const input of [
      "0712345678",
      "+254712345678",
      "254712345678",
      "712345678",
    ]) {
      expect(normaliseKenyanPhone(input)).toBe("+254712345678");
    }
  });

  it("accepts an 01 number as well as 07", () => {
    expect(normaliseKenyanPhone("0112345678")).toBe("+254112345678");
  });

  it("ignores spaces, dashes and brackets", () => {
    expect(normaliseKenyanPhone("0712 345 678")).toBe("+254712345678");
    expect(normaliseKenyanPhone("+254 (712) 345-678")).toBe("+254712345678");
  });

  it("rejects a number that is too short or too long", () => {
    expect(normaliseKenyanPhone("071234567")).toBeNull();
    expect(normaliseKenyanPhone("07123456789")).toBeNull();
  });

  it("rejects a landline and a non-Kenyan number", () => {
    expect(normaliseKenyanPhone("0202345678")).toBeNull();
    expect(normaliseKenyanPhone("+447700900000")).toBeNull();
  });

  it("rejects empty and junk", () => {
    expect(normaliseKenyanPhone("")).toBeNull();
    expect(normaliseKenyanPhone("   ")).toBeNull();
    expect(normaliseKenyanPhone("call me")).toBeNull();
  });
});

describe("the ID types match the CHECK constraint", () => {
  it("is exactly national_id, passport, alien_id", () => {
    expect([...ID_TYPE_VALUES].sort()).toEqual(
      ["alien_id", "national_id", "passport"].sort(),
    );
  });

  it("rejects military_id, which the old form offered", () => {
    expect(build({ id_type: "military_id" }).errors.id_type).toBeTruthy();
  });

  it("accepts alien_id, which the old form did not offer", () => {
    expect(build({ id_type: "alien_id" }).errors.id_type).toBeUndefined();
  });
});

describe("a complete form", () => {
  it("produces a tenant and a lease with no errors", () => {
    const r = build();
    expect(r.errors).toEqual({});
    expect(r.tenant).not.toBeNull();
    expect(r.lease).not.toBeNull();
  });

  it("joins the two name fields into full_name", () => {
    expect(build().tenant!.full_name).toBe("Brian Kamau");
  });

  it("stores the phone normalised", () => {
    expect(build({ phone: "0712 345 678" }).tenant!.phone).toBe(
      "+254712345678",
    );
  });

  it("builds the emergency contact as an object", () => {
    expect(build().tenant!.emergency_contact).toEqual({
      name: "Alice Kamau",
      phone: "+254722000112",
      relationship: "Spouse",
    });
  });

  it("carries the lease terms", () => {
    const l = build().lease!;
    expect(l.start_date).toBe("2026-12-01");
    expect(l.end_date).toBe("2027-11-30");
    expect(l.monthly_rent).toBe(85000);
    expect(l.rent_due_day).toBe(5);
    expect(l.deposit_amount).toBe(85000);
    expect(l.status).toBe("active");
  });

  it("never returns one row without the other", () => {
    const r = build({ phone: "" });
    expect(r.tenant).toBeNull();
    expect(r.lease).toBeNull();
  });
});

describe("required fields", () => {
  it("rejects missing names", () => {
    expect(build({ first_name: "" }).errors.first_name).toBeTruthy();
    expect(build({ last_name: " " }).errors.last_name).toBeTruthy();
  });

  it("rejects a missing phone, and says so differently from a bad one", () => {
    expect(build({ phone: "" }).errors.phone).toContain("required");
    expect(build({ phone: "12345" }).errors.phone).toContain("Kenyan");
  });

  it("rejects missing rent and a missing start date", () => {
    expect(build({ monthly_rent: "" }).errors.monthly_rent).toBeTruthy();
    expect(build({ start_date: "" }).errors.start_date).toBeTruthy();
  });

  it("reports every bad field at once", () => {
    const r = build({ first_name: "", phone: "", monthly_rent: "" });
    expect(Object.keys(r.errors).sort()).toEqual([
      "first_name",
      "monthly_rent",
      "phone",
    ]);
  });
});

describe("optional fields", () => {
  it("an email is optional but must look like one", () => {
    expect(build({ email: "" }).tenant!.email).toBeNull();
    expect(build({ email: "not an email" }).errors.email).toBeTruthy();
  });

  it("occupation, employer and notes become null when blank", () => {
    const t = build({ occupation: "", employer: " ", notes: "" }).tenant!;
    expect(t.occupation).toBeNull();
    expect(t.employer).toBeNull();
    expect(t.notes).toBeNull();
  });

  it("an emergency contact may be left out entirely", () => {
    const r = build({
      emergency_name: "",
      emergency_phone: "",
      emergency_relationship: "",
    });
    expect(r.errors).toEqual({});
    expect(r.tenant!.emergency_contact).toEqual({});
  });

  it("but a given emergency phone must be a real number", () => {
    expect(
      build({ emergency_phone: "123" }).errors.emergency_phone,
    ).toBeTruthy();
  });
});

describe("the lease term", () => {
  it("is month_to_month when no end date is given", () => {
    const l = build({ end_date: "" }).lease!;
    expect(l.end_date).toBeNull();
    expect(l.lease_type).toBe("month_to_month");
  });

  it("is fixed when an end date is given", () => {
    expect(build().lease!.lease_type).toBe("fixed");
  });

  it("rejects an end date on or before the start", () => {
    expect(
      build({ start_date: "2026-12-01", end_date: "2026-12-01" }).errors
        .end_date,
    ).toBeTruthy();
    expect(
      build({ start_date: "2026-12-01", end_date: "2026-11-30" }).errors
        .end_date,
    ).toBeTruthy();
  });

  it("accepts an end date one day after the start", () => {
    expect(
      build({ start_date: "2026-12-01", end_date: "2026-12-02" }).errors
        .end_date,
    ).toBeUndefined();
  });

  it("flags a start date decades in the past as a likely typo", () => {
    // Backdating a tenancy silently backdates every month of rent owed.
    expect(build({ start_date: "1998-01-01" }).errors.start_date).toBeTruthy();
    expect(
      build({ start_date: "2010-01-01" }).errors.start_date,
    ).toBeUndefined();
  });
});

describe("the rent due day, which the column constrains to 1-28", () => {
  it("accepts 1 and 28", () => {
    expect(build({ rent_due_day: "1" }).lease!.rent_due_day).toBe(1);
    expect(build({ rent_due_day: "28" }).lease!.rent_due_day).toBe(28);
  });

  it("rejects 0 and 29", () => {
    // 29-31 do not exist in every month, which is why the constraint stops at 28.
    expect(build({ rent_due_day: "0" }).errors.rent_due_day).toBeTruthy();
    expect(build({ rent_due_day: "29" }).errors.rent_due_day).toBeTruthy();
    expect(build({ rent_due_day: "31" }).errors.rent_due_day).toBeTruthy();
  });

  it("defaults to the 5th when left blank", () => {
    expect(build({ rent_due_day: "" }).lease!.rent_due_day).toBe(5);
  });

  it("rejects text", () => {
    expect(build({ rent_due_day: "fifth" }).errors.rent_due_day).toBeTruthy();
  });
});

describe("the deposit", () => {
  it("is held when the landlord says they have it", () => {
    expect(build({ deposit_paid: true }).lease!.deposit_status).toBe("held");
  });

  it("is pending when they do not", () => {
    // "deposits held" on the rent page sums the held ones; claiming to hold
    // money that has not arrived inflates a figure a landlord acts on.
    expect(build({ deposit_paid: false }).lease!.deposit_status).toBe(
      "pending",
    );
  });

  it("may be left out", () => {
    const r = build({ deposit_amount: "" });
    expect(r.errors).toEqual({});
    expect(r.lease!.deposit_amount).toBeNull();
  });

  it("rejects a negative deposit", () => {
    expect(build({ deposit_amount: "-1" }).errors.deposit_amount).toBeTruthy();
  });

  it("accepts a deposit of zero", () => {
    expect(build({ deposit_amount: "0" }).lease!.deposit_amount).toBe(0);
  });
});

describe("the payment method", () => {
  it("defaults to mpesa", () => {
    expect(build({ payment_method: "" }).lease!.payment_method).toBe("mpesa");
  });

  it("rejects one outside the constraint", () => {
    expect(
      build({ payment_method: "crypto" }).errors.payment_method,
    ).toBeTruthy();
  });
});

describe("the ID number", () => {
  /**
   * THE CASE THAT ACTUALLY HAPPENED. Driving the add-tenant form through to a
   * real tenancy, the National ID field accepted the literal text "Tenancy
   * Probe" and stored it; the unit page then showed "National ID Tenancy
   * Probe" beside the tenant's name.
   */
  it("rejects prose typed into the National ID box", () => {
    expect(
      build({ id_type: "national_id", id_number: "Tenancy Probe" }).errors
        .id_number,
    ).toBeTruthy();
  });

  it("accepts both the seven- and eight-digit forms in circulation", () => {
    for (const n of ["1234567", "12345678"]) {
      const r = build({ id_type: "national_id", id_number: n });
      expect(r.errors.id_number).toBeUndefined();
      expect(r.tenant!.id_number).toBe(n);
    }
  });

  it("treats spacing as noise and stores the tidy value", () => {
    const r = build({ id_type: "national_id", id_number: "12 345 678" });
    expect(r.errors.id_number).toBeUndefined();
    expect(r.tenant!.id_number).toBe("12345678");
  });

  it("pins the stated range at its edges, so it cannot be narrowed unnoticed", () => {
    // The rule is 6-9 digits: seven and eight are what circulate, with one
    // either side as margin. Without these two the margin is undefended and a
    // later edit could quietly tighten it onto real holders.
    for (const n of ["123456", "123456789"]) {
      expect(
        build({ id_type: "national_id", id_number: n }).errors.id_number,
      ).toBeUndefined();
    }
  });

  it("rejects digit counts no Kenyan ID has", () => {
    for (const n of ["12345", "1234567890"]) {
      expect(
        build({ id_type: "national_id", id_number: n }).errors.id_number,
      ).toBeTruthy();
    }
  });

  it("validates as a national ID when no type was chosen, matching the default the builder applies", () => {
    const r = build({ id_type: "", id_number: "Tenancy Probe" });
    expect(r.errors.id_number).toBeTruthy();
  });

  it("names the right document when an alien ID is wrong", () => {
    expect(
      build({ id_type: "alien_id", id_number: "not-a-number" }).errors
        .id_number,
    ).toMatch(/alien/i);
  });

  it("accepts a passport and upper-cases it", () => {
    const r = build({ id_type: "passport", id_number: "a1234567" });
    expect(r.errors.id_number).toBeUndefined();
    expect(r.tenant!.id_number).toBe("A1234567");
  });

  it("is deliberately loose on passports, because a tenant may hold any country's", () => {
    // Letters and digits in any arrangement pass; this rule exists to catch
    // prose, not to recognise every national format.
    expect(validateIdNumber("passport", "X9Y8Z7Q6")).toBeNull();
  });

  it("still rejects a passport with punctuation or spaces", () => {
    expect(validateIdNumber("passport", "A 123 4567")).toBeTruthy();
  });

  it("leaves an absent ID number alone, because it is optional", () => {
    const r = build({ id_type: "", id_number: "" });
    expect(r.errors.id_number).toBeUndefined();
    expect(r.tenant!.id_number).toBeNull();
  });

  it("normaliseIdNumber strips spaces and hyphens and upper-cases", () => {
    expect(normaliseIdNumber("  a1-234 567 ")).toBe("A1234567");
  });
});
