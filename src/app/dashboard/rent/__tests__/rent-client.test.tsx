/**
 * What a tenant is shown before they send money.
 *
 * The failure that matters is not a broken layout — it is a page that shows
 * a plausible destination when none was configured, or stays silent when a
 * payment cannot be matched. Both are pinned here.
 */

import { render, screen } from "@testing-library/react";
import { RentClient } from "../RentClient";
import type { PayoutDestination } from "@/lib/landlord/payment-instructions";

const paybill: PayoutDestination = {
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
  instructions: "Pay by the 5th.",
  is_default: true,
  all_properties: true,
  building_ids: [],
};

type OkProps = Extract<
  React.ComponentProps<typeof RentClient>,
  { state: "ok" }
>;

// Typed against the real prop union rather than Record<string, unknown>: the
// first version spread `never` and jest was happy while tsc was not.
const ok = (over: Partial<OkProps> = {}) => {
  const props: OkProps = {
    state: "ok",
    tenantName: "Wanjiru Kariuki",
    tenantPhone: "+254712345678",
    unitNumber: "A1",
    buildingName: "Kilimani Heights",
    monthlyRent: 30000,
    rentDueDay: 5,
    destination: paybill,
    payments: [],
    ...over,
  };
  return render(<RentClient {...props} />);
};

it("shows the paybill and the account number to type", () => {
  ok();
  expect(screen.getByText("M-Pesa paybill 522533")).toBeInTheDocument();
  expect(screen.getByText(/Business number: 522533/)).toBeInTheDocument();
  // The reference is surfaced separately, because it is the thing people get
  // wrong and the thing that makes the payment reconcilable.
  expect(screen.getByText(/Account number to type/)).toBeInTheDocument();
  expect(screen.getByLabelText("Copy account number")).toBeInTheDocument();
});

it("says plainly when the landlord has set no destination", () => {
  // The alternative — a blank panel, or a plausible-looking number — is how
  // rent goes to the wrong account.
  ok({ destination: null });
  expect(
    screen.getByText(/has not told MitaSafi where rent should be sent/i),
  ).toBeInTheDocument();
  expect(
    screen.getByText(/do not use a number from anywhere else/i),
  ).toBeInTheDocument();
  expect(screen.queryByText(/paybill/i)).toBeNull();
});

it("warns when the method cannot identify the payer", () => {
  ok({
    destination: {
      ...paybill,
      method: "mpesa_till",
      paybill_number: null,
      till_number: "888999",
    },
  });
  expect(
    screen.getByText(/send your landlord the M-Pesa confirmation code/i),
  ).toBeInTheDocument();
});

it("does not warn for a paybill, which identifies the payer", () => {
  ok();
  expect(screen.queryByText(/carries nothing that identifies you/i)).toBeNull();
});

it("states that MitaSafi does not receive the money", () => {
  ok();
  expect(
    screen.getByText(/MitaSafi does not receive or hold your rent/i),
  ).toBeInTheDocument();
});

it("offers the tenant no way to record a payment themselves", () => {
  ok({
    payments: [
      {
        id: "p1",
        amount: 30000,
        type: "rent",
        status: "confirmed",
        date: "2026-11-05",
        receipt: "SFG12ABC",
      },
    ],
  });
  const buttons = screen.getAllByRole("button").map((b) => b.textContent ?? "");
  expect(buttons.some((b) => /add|record|mark.*paid|confirm/i.test(b))).toBe(
    false,
  );
  expect(screen.getByText(/you cannot add it here/i)).toBeInTheDocument();
});

it("distinguishes an account with no tenancy from one with no lease", () => {
  const { unmount } = render(<RentClient state="not-a-tenant" />);
  expect(screen.getByText(/not attached to a tenancy/i)).toBeInTheDocument();
  unmount();
  render(<RentClient state="no-lease" />);
  expect(screen.getByText(/no current lease/i)).toBeInTheDocument();
});
