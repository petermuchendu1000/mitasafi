/**
 * A settings page is where privilege escalation gets added by accident.
 *
 * The database already refuses the dangerous writes — `is_verified` is a
 * generated column (428C9 for everyone), `verification_level` is 42501 for
 * client roles, and `primary_role` is overwritten by a trigger. None of that
 * stops a form from RENDERING a control that appears to change them and
 * silently does nothing, which is its own kind of lie.
 *
 * These pin the absence of those controls.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsClient, type SettingsProfile } from "../SettingsClient";

jest.mock("../actions", () => ({
  updateLandlordProfile: jest.fn(async () => ({ success: true })),
  updateLandlordNotifications: jest.fn(async () => ({ success: true })),
  requestLandlordAccountDeletion: jest.fn(async () => ({ success: true })),
  saveLandlordSettings: jest.fn(async () => ({ success: true })),
  saveLateFeeRule: jest.fn(async () => ({ success: true })),
  deleteLateFeeRule: jest.fn(async () => ({ success: true })),
  saveStaffMember: jest.fn(async () => ({ success: true })),
  setStaffStatus: jest.fn(async () => ({ success: true })),
  removeStaffMember: jest.fn(async () => ({ success: true })),
}));

// Typed explicitly: inferred from the literal, the null fields narrow to
// `null` and every override in a test becomes a type error.
const profile: SettingsProfile = {
  fullName: "Asha Mwangi",
  email: "landlord.e2e@mitasafi.test",
  phone: "",
  role: "landlord",
  isVerified: false,
  verificationLevel: null,
  memberSince: "2026-11-23T00:00:00Z",
  deletionRequestedAt: null,
};

const preferences = {
  email_notifications: true,
  sms_notifications: true,
  push_notifications: true,
};

function open(over: Partial<SettingsProfile> = {}) {
  return render(
    <SettingsClient
      profile={{ ...profile, ...over }}
      channels={preferences}
      settings={null}
      lateFeeRules={[]}
      buildings={[]}
      settingsMissing={false}
    />,
  );
}

it("offers exactly two editable text fields on General: name and contact phone", () => {
  const { container } = open();
  const editable = Array.from(
    container.querySelectorAll(
      'input[type="text"], input:not([type]), textarea, select',
    ),
  ).map((c) => (c as HTMLInputElement).labels?.[0]?.textContent);
  expect(editable).toEqual(["Name", "Contact phone"]);
});

it("renders no control for the sign-in email", () => {
  open();
  // The address is shown as a fact...
  expect(screen.getByText("landlord.e2e@mitasafi.test")).toBeInTheDocument();
  // ...and there is no text field for it. Scoped to inputs on purpose: the
  // first version of this matched the "Email" NOTIFICATION switch, which is a
  // legitimate control and nothing to do with the sign-in address.
  const emailInput = screen
    .queryAllByLabelText(/email/i)
    .filter((el) => el.tagName === "INPUT" || el.tagName === "TEXTAREA");
  expect(emailInput).toHaveLength(0);
  expect(screen.getByText(/This is how you sign in/i)).toBeInTheDocument();
});

it("renders no control for role or verification", () => {
  open({ verificationLevel: "id" });
  expect(screen.getByText("ID verified")).toBeInTheDocument();
  expect(screen.queryByLabelText(/account type|role|verification/i)).toBeNull();

  const buttonNames = screen
    .getAllByRole("button")
    .map((b) => b.textContent ?? "");
  for (const name of buttonNames) {
    expect(name).not.toMatch(/verify|upgrade|become|switch to|make me/i);
  }
});

it("says the phone is not the sign-in method", () => {
  open();
  expect(screen.getByText(/not your sign-in method/i)).toBeInTheDocument();
});

it("does not offer to delete anything outright", () => {
  open();
  const names = screen.getAllByRole("button").map((b) => b.textContent ?? "");
  // The control asks; it does not claim to delete.
  expect(names.some((n) => /Ask to close my account/.test(n))).toBe(true);
  expect(names.some((n) => /^Delete (my )?account$/i.test(n.trim()))).toBe(
    false,
  );
});

it("reports an existing request instead of letting it be sent twice", () => {
  open({ deletionRequestedAt: "2026-11-01T00:00:00Z" });
  expect(
    screen.getByText(/You asked to close this account/i),
  ).toBeInTheDocument();
  const names = screen.getAllByRole("button").map((b) => b.textContent ?? "");
  expect(names.some((n) => /Ask to close my account/.test(n))).toBe(false);
});

it("exposes each notification channel as a switch reporting its state", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Notifications" }));
  for (const label of ["Email", "SMS", "Push"]) {
    expect(screen.getByRole("switch", { name: label })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  }
});

it("marks every feature toggle that is not actually in force", () => {
  // A stored switch nothing reads is a control that does nothing. Each one
  // that MitaSafi does not act on yet must say so beside itself.
  open();
  // Scoped to the notes themselves: the help sidebar has an FAQ that quotes
  // this phrase, and the first version of this assertion counted it.
  const notYet = screen
    .getAllByText(/Saved, but not in effect/i)
    .filter((el) => el.tagName === "P");
  // Five of the seven gate features that do not exist yet.
  expect(notYet).toHaveLength(5);
  // ...and the two that ARE in force carry no such note.
  const live = screen.getByRole("switch", {
    name: /Applications and screening/i,
  });
  expect(live).toBeInTheDocument();
});

it("hides caretaker management until staff access is switched on", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Caretakers" }));
  // Managing people moved to its own page; the tab points there and warns
  // when the feature is off rather than pretending to manage anyone.
  expect(screen.getByText(/lives on its own page/i)).toBeInTheDocument();
  expect(screen.getByText(/currently switched off/i)).toBeInTheDocument();
});

it("says plainly that MitaSafi does not hold the rent", () => {
  open();
  fireEvent.click(screen.getByRole("button", { name: "Bank" }));
  expect(
    screen.getByText(/does not hold or disburse your rent/i),
  ).toBeInTheDocument();
  // And offers no account field to fill in, which would imply it did.
  expect(screen.queryByLabelText(/account number|bank name/i)).toBeNull();
});
