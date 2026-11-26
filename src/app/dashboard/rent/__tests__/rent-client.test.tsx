/**
 * What a tenant is shown about their own tenancy.
 *
 * The failure that matters is not a broken layout — it is a page that shows
 * a plausible destination when none was configured, stays silent about a
 * payment that cannot be matched, or offers the tenant a way to mark their
 * own rent paid. All three are pinned here.
 *
 * The copy assertions were shortened when the page was, but every CLAIM they
 * make is the same one: no invented destination, a warning when the method
 * cannot identify the payer, MitaSafi never holds the money, and no control
 * that records a payment.
 */

import { render, screen, within, fireEvent } from "@testing-library/react";
import { RentClient } from "../RentClient";
import type { PayoutDestination } from "@/lib/landlord/payment-instructions";
import { tenancySummary } from "@/lib/tenant/summary";
import { buildStatement, type StatementLease } from "@/lib/landlord/statement";

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

const TODAY = { year: 2026, month: 11, day: 20 };

const LEASE: StatementLease = {
  id: "l1",
  unit_label: "A1",
  building_label: "Kilimani Heights",
  start_date: "2026-06-01",
  end_date: "2027-05-31",
  monthly_rent: 30000,
  rent_due_day: 5,
  grace_period_days: 5,
  deposit_amount: 60000,
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
    area: "Kilimani",
    accessInstructions: null,
    bedrooms: 2,
    bathrooms: 1,
    monthlyRent: 30000,
    rentDueDay: 5,
    gracePeriodDays: 5,
    leaseStart: "2026-06-01",
    leaseEnd: "2027-05-31",
    leaseStatus: "active",
    noticePeriodMonths: 2,
    leaseDocumentUrl: null,
    depositStatus: "held",
    destination: paybill,
    summary: tenancySummary(LEASE, [], TODAY),
    statement: buildStatement(LEASE, [], TODAY),
    payments: [],
    maintenance: [],
    today: "2026-11-20",
    ...over,
  };
  return render(<RentClient {...props} />);
};

describe("paying", () => {
  it("shows the paybill and the account number to type", () => {
    ok();
    expect(screen.getByText("M-Pesa paybill 522533")).toBeInTheDocument();
    expect(screen.getByText(/Business number: 522533/)).toBeInTheDocument();
    // The reference is surfaced separately, because it is the thing people
    // get wrong and the thing that makes the payment reconcilable.
    // "Account number" also appears inside the numbered steps, so the
    // discriminating assertion is the copy control beside the value.
    expect(screen.getByLabelText("Copy account number")).toBeInTheDocument();
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getAllByText("A1").length).toBeGreaterThan(0);
  });

  it("says plainly when the landlord has set no destination", () => {
    // The alternative — a blank panel, or a plausible-looking number — is
    // how rent goes to the wrong account.
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
      screen.getByText(
        /Send your landlord the M-Pesa code once you have paid/i,
      ),
    ).toBeInTheDocument();
  });

  it("does not warn for a paybill, which identifies the payer", () => {
    ok();
    expect(
      screen.queryByText(/carries nothing that identifies you/i),
    ).toBeNull();
  });

  it("states that MitaSafi never holds the money, and never asks for a PIN", () => {
    ok();
    expect(
      screen.getByText(/MitaSafi never receives or holds your rent/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/never ask for your M-Pesa PIN/i),
    ).toBeInTheDocument();
  });
});

describe("the tenant cannot write anything", () => {
  it("offers no way to record a payment", () => {
    ok({
      payments: [
        {
          id: "p1",
          amount: 30000,
          type: "rent",
          status: "confirmed",
          date: "2026-11-05",
          receipt: "SFG12ABC",
          method: "mpesa",
          period: "2026-11",
        },
      ],
    });
    fireEvent.click(screen.getByRole("tab", { name: /Payments/ }));
    // queryAllByRole, not getAllByRole: the tabs carry role="tab", so there
    // may legitimately be NO plain button on this panel, and getAllByRole
    // throws on an empty result rather than returning one.
    const buttons = screen
      .queryAllByRole("button")
      .map((b) => b.textContent ?? "");
    expect(buttons.some((b) => /add|record|mark.*paid|confirm/i.test(b))).toBe(
      false,
    );
    expect(screen.getByText(/you cannot add it here/i)).toBeInTheDocument();
  });

  it("says a repair cannot be raised here, rather than offering a dead button", () => {
    ok();
    fireEvent.click(screen.getByRole("tab", { name: /Repairs/ }));
    expect(screen.getByText(/not built yet/i)).toBeInTheDocument();
    const buttons = screen
      .queryAllByRole("button")
      .map((b) => b.textContent ?? "");
    expect(buttons.some((b) => /report|raise|new request/i.test(b))).toBe(
      false,
    );
  });
});

describe("this month, at a glance", () => {
  it("shows the balance and how late it is", () => {
    // Due the 5th, grace 5 days, today the 20th, nothing paid.
    ok();
    // Scoped to the tile. "KES 30,000" is also the monthly rent, so an
    // unscoped query matches two elements and proves neither.
    const tile = screen.getByText("This month").closest("div") as HTMLElement;
    expect(within(tile).getByText("KES 30,000")).toBeInTheDocument();
    expect(within(tile).getByText("10 days late")).toBeInTheDocument();
  });

  it("shows Clear when the month is settled", () => {
    const paid = [
      {
        id: "p1",
        amount: 30000,
        payment_type: "rent",
        status: "confirmed",
        period_year: 2026,
        period_month: 11,
        payment_date: "2026-11-03",
        payment_method: "mpesa",
        reference_number: null,
        mpesa_receipt: null,
      },
    ];
    ok({
      summary: tenancySummary(LEASE, paid, TODAY),
      statement: buildStatement(LEASE, paid, TODAY),
    });
    const tile = screen.getByText("This month").closest("div") as HTMLElement;
    expect(within(tile).getByText("Clear")).toBeInTheDocument();
    expect(within(tile).getByText("Paid")).toBeInTheDocument();
  });

  it("warns when the lease is ending soon, with the notice period", () => {
    ok({
      leaseEnd: "2026-12-20",
      summary: tenancySummary({ ...LEASE, end_date: "2026-12-20" }, [], TODAY),
    });
    expect(screen.getByText(/Lease ends in 30 days/)).toBeInTheDocument();
    expect(screen.getByText(/Notice period 2 months/)).toBeInTheDocument();
  });

  it("does not warn about a lease that is not ending soon", () => {
    ok();
    expect(screen.queryByText(/Lease ends in/)).toBeNull();
  });
});

describe("the statement the tenant can read themselves", () => {
  const paid = [
    {
      id: "p1",
      amount: 30000,
      payment_type: "rent",
      status: "confirmed",
      period_year: 2026,
      period_month: 9,
      payment_date: "2026-09-03",
      payment_method: "mpesa",
      reference_number: null,
      mpesa_receipt: null,
    },
  ];

  it("starts where the records start, not where the lease started", () => {
    // The lease begins in June; the first recorded rent is September. The
    // tenant must not be shown a charge for months nobody has records for.
    ok({
      summary: tenancySummary(LEASE, paid, TODAY),
      statement: buildStatement(LEASE, paid, TODAY),
    });
    fireEvent.click(screen.getByRole("tab", { name: /Statement/ }));
    const panel = screen.getByRole("tabpanel");
    expect(within(panel).getByText(/Sep 2026 – Nov 2026/)).toBeInTheDocument();
    expect(within(panel).queryByText("Jun 2026")).toBeNull();
    expect(within(panel).queryByText("Jul 2026")).toBeNull();
  });

  it("shows money received that is not yet applied to a month", () => {
    const withLoose = [
      ...paid,
      {
        id: "p2",
        amount: 17500,
        payment_type: "rent",
        status: "confirmed",
        period_year: null,
        period_month: null,
        payment_date: "2026-11-24",
        payment_method: "mpesa",
        reference_number: null,
        mpesa_receipt: "SFG12ABCDE",
      },
    ];
    ok({
      summary: tenancySummary(LEASE, withLoose, TODAY),
      statement: buildStatement(LEASE, withLoose, TODAY),
    });
    fireEvent.click(screen.getByRole("tab", { name: /Statement/ }));
    expect(
      screen.getByText(/KES 17,500 received, not yet applied to a month/),
    ).toBeInTheDocument();
    expect(screen.getByText(/SFG12ABCDE/)).toBeInTheDocument();
  });
});

describe("the lease tab", () => {
  it("lists the terms the tenant would otherwise have to ask for", () => {
    ok();
    fireEvent.click(screen.getByRole("tab", { name: /Lease/ }));
    const panel = screen.getByRole("tabpanel");
    for (const label of [
      "Due day",
      "Grace",
      "Notice",
      "Deposit",
      "Agreement",
    ]) {
      expect(within(panel).getByText(label)).toBeInTheDocument();
    }
    expect(within(panel).getByText("Not uploaded")).toBeInTheDocument();
  });

  it("links the agreement when there is one", () => {
    ok({ leaseDocumentUrl: "https://example.test/lease.pdf" });
    fireEvent.click(screen.getByRole("tab", { name: /Lease/ }));
    const link = screen.getByRole("link", { name: /Open/ });
    expect(link).toHaveAttribute("href", "https://example.test/lease.pdf");
    // A document opened in a new tab must not hand it a window opener.
    expect(link).toHaveAttribute("rel", expect.stringContaining("noopener"));
  });
});

describe("empty states", () => {
  it("distinguishes an account with no tenancy from one with no lease", () => {
    const { unmount } = render(<RentClient state="not-a-tenant" />);
    expect(screen.getByText(/not attached to a tenancy/i)).toBeInTheDocument();
    unmount();
    render(<RentClient state="no-lease" />);
    expect(screen.getByText(/No current lease/i)).toBeInTheDocument();
  });
});
