/**
 * The validation, and the one thing a forged request must not get through.
 */

import {
  validateProfileDraft,
  sanitisePreferences,
  verificationLabel,
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
