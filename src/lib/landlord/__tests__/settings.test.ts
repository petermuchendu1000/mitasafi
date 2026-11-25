/**
 * The validation, and the one thing a forged request must not get through.
 */

import {
  validateProfileDraft,
  sanitisePreferences,
  verificationLabel,
  sanitiseSettingsPatch,
  lateFeeProblem,
  MAX_NAME_LENGTH,
} from "../settings";

describe("the name", () => {
  it("collapses runs of whitespace rather than storing them", () => {
    const r = validateProfileDraft({ fullName: "  Asha   Mwangi ", phone: "" });
    expect(r.ok).toBe(true);
    expect(r.values.full_name).toBe("Asha Mwangi");
  });

  it("refuses an empty name", () => {
    const r = validateProfileDraft({ fullName: "   ", phone: "" });
    expect(r.ok).toBe(false);
    expect(r.errors.fullName).toMatch(/cannot be empty/i);
  });

  it("refuses a name longer than the limit", () => {
    const r = validateProfileDraft({
      fullName: "a".repeat(MAX_NAME_LENGTH + 1),
      phone: "",
    });
    expect(r.ok).toBe(false);
    expect(r.errors.fullName).toBeDefined();
  });
});

describe("the contact phone", () => {
  it("stores a local 07… number in +254 form", () => {
    const r = validateProfileDraft({
      fullName: "Asha",
      phone: "0712345678",
    });
    expect(r.ok).toBe(true);
    expect(r.values.phone).toBe("+254712345678");
  });

  it("treats an empty phone as clearing it, not as an error", () => {
    const r = validateProfileDraft({ fullName: "Asha", phone: "  " });
    expect(r.ok).toBe(true);
    expect(r.values.phone).toBeNull();
  });

  it("refuses something that is not a Kenyan mobile number", () => {
    const r = validateProfileDraft({ fullName: "Asha", phone: "12345" });
    expect(r.ok).toBe(false);
    expect(r.errors.phone).toMatch(/Kenyan mobile/i);
  });
});

describe("preference sanitising", () => {
  it("keeps the three known boolean keys", () => {
    expect(
      sanitisePreferences({
        email_notifications: false,
        sms_notifications: true,
        push_notifications: false,
      }),
    ).toEqual({
      email_notifications: false,
      sms_notifications: true,
      push_notifications: false,
    });
  });

  it("drops anything not on the list, however it is spelled", () => {
    // A forged request is the reason this exists. is_verified and primary_role
    // live on a different table and the client cannot write is_verified at all,
    // but the whitelist means they never even reach the query.
    const out = sanitisePreferences({
      email_notifications: true,
      is_verified: true,
      primary_role: "admin",
      show_profile_publicly: false,
      preferred_language: "fr",
    });
    expect(out).toEqual({ email_notifications: true });
  });

  it("drops non-boolean values for known keys", () => {
    expect(
      sanitisePreferences({ email_notifications: "yes" as unknown as boolean }),
    ).toBeNull();
  });

  it("returns null when nothing valid is supplied", () => {
    expect(sanitisePreferences({})).toBeNull();
    expect(sanitisePreferences({ nonsense: 1 })).toBeNull();
  });
});

describe("verification label", () => {
  it("names each level and treats absent as not verified", () => {
    expect(verificationLabel("full")).toBe("Fully verified");
    expect(verificationLabel("id")).toBe("ID verified");
    expect(verificationLabel(null)).toBe("Not verified");
    expect(verificationLabel("something-else")).toBe("Not verified");
  });
});

describe("the settings patch whitelist", () => {
  it("keeps known keys of the right shape", () => {
    expect(
      sanitiseSettingsPatch({
        application_screening: false,
        grace_period_days: 7,
        late_fee_type: "fixed",
        mpesa_fee_payer: "landlord",
      }),
    ).toEqual({
      application_screening: false,
      grace_period_days: 7,
      late_fee_type: "fixed",
      mpesa_fee_payer: "landlord",
    });
  });

  it("drops a key that is not a setting at all", () => {
    // landlord_id is the one that matters: this table is keyed on it and a
    // patch is a bag of keys from a browser.
    expect(
      sanitiseSettingsPatch({
        landlord_id: "00000000-0000-0000-0000-000000000000",
        is_verified: true,
        enable_chat: true,
      }),
    ).toEqual({ enable_chat: true });
  });

  it("drops an enum value that is not on the list", () => {
    expect(
      sanitiseSettingsPatch({ mpesa_fee_payer: "somebody_else" }),
    ).toBeNull();
  });

  it("drops a number outside its declared range", () => {
    expect(sanitiseSettingsPatch({ grace_period_days: 9999 })).toBeNull();
    expect(sanitiseSettingsPatch({ late_fee_percentage: -1 })).toBeNull();
    expect(sanitiseSettingsPatch({ grace_period_days: 0 })).toEqual({
      grace_period_days: 0,
    });
  });

  it("does not let a string masquerade as a boolean or a number", () => {
    expect(
      sanitiseSettingsPatch({ enable_chat: "true", grace_period_days: "7" }),
    ).toBeNull();
  });

  it("lets a money field be cleared but not go negative", () => {
    expect(sanitiseSettingsPatch({ late_fee_amount: null })).toEqual({
      late_fee_amount: null,
    });
    expect(sanitiseSettingsPatch({ late_fee_amount: -5 })).toBeNull();
  });
});

describe("the late fee policy check", () => {
  it("passes when the fee is off", () => {
    expect(lateFeeProblem({ late_fee_enabled: false })).toBeNull();
  });

  it("catches a percentage fee with no percentage", () => {
    expect(
      lateFeeProblem({ late_fee_enabled: true, late_fee_type: "percentage" }),
    ).toMatch(/percentage/i);
  });

  it("catches a fixed fee with no amount", () => {
    expect(
      lateFeeProblem({ late_fee_enabled: true, late_fee_type: "fixed" }),
    ).toMatch(/amount/i);
  });

  it("passes a complete policy", () => {
    expect(
      lateFeeProblem({
        late_fee_enabled: true,
        late_fee_type: "percentage",
        late_fee_percentage: 10,
      }),
    ).toBeNull();
  });
});
