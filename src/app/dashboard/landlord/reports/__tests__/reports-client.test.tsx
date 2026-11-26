/**
 * Six reports on a phone.
 *
 * WHAT WAS WRONG
 *   The tab panel was overflow-hidden around tables up to 749px wide in a
 *   326px box. Not a sideways scroll, a clip: on the rent roll the landlord
 *   could see Building, Unit and Tenant, and rent, deposit, status and
 *   balance were unreachable by any gesture. The assertions below are
 *   mostly "this column is on screen on a phone", which reads as trivial
 *   and is the exact thing that was broken.
 */

import { render, screen, within, fireEvent } from "@testing-library/react";
import { ReportsClient } from "../ReportsClient";

const rentRoll = {
  period: { year: 2026, month: 11 },
  totalRent: 180000,
  // Every money figure in this fixture is distinct, so a query for one
  // cannot match two columns and pass without saying which it found.
  totalDeposit: 170000,
  rows: [
    {
      building: "Riverside Court",
      unit: "A101",
      tenant: "Brian Kamau",
      phone: "+254700111222",
      monthlyRent: 85000,
      dueDay: 5,
      start: "2026-01-01",
      end: "2027-01-31",
      deposit: 80000,
      status: "paid",
      balance: 0,
    },
    {
      building: "Westlands Heights",
      unit: "W1",
      tenant: "Dennis Omondi",
      phone: "+254711000333",
      monthlyRent: 95000,
      dueDay: 28,
      start: "2026-06-01",
      end: "",
      deposit: 90000,
      status: "pending",
      balance: 42000,
    },
  ],
};

const arrears = {
  monthsConsidered: 6,
  leasesWithNoLedger: 2,
  total: 42000,
  rows: [
    {
      building: "Westlands Heights",
      unit: "W1",
      tenant: "Dennis Omondi",
      phone: "+254711000333",
      period: "Oct 2026",
      due: 95000,
      paid: 53000,
      balance: 42000,
      daysLate: 23,
    },
  ],
};

const deposits = {
  total: 175000,
  rows: [
    {
      building: "Riverside Court",
      unit: "A101",
      tenant: "Brian Kamau",
      amount: 85000,
      status: "held",
    },
  ],
};

const expiries = {
  withinDays: 90,
  lapsed: 1,
  rows: [
    {
      building: "Riverside Court",
      unit: "A101",
      tenant: "Brian Kamau",
      phone: "",
      end: "2027-01-31",
      daysLeft: -4,
    },
  ],
};

const occupancy = {
  total: 6,
  occupied: 3,
  rate: 50,
  rows: [
    {
      building: "Riverside Court",
      total: 4,
      occupied: 2,
      vacant: 1,
      other: 1,
      rate: 50,
    },
  ],
};

const collections = [
  {
    period: "Sep 2026",
    expected: 0,
    collected: 0,
    rate: null,
    leasesNotYetRecorded: 0,
  },
  {
    period: "Oct 2026",
    expected: 180000,
    collected: 138000,
    rate: 77,
    leasesNotYetRecorded: 1,
  },
];

function renderReports() {
  return render(
    <ReportsClient
      generatedOn="2026-11-27"
      rentRoll={rentRoll}
      arrears={arrears}
      deposits={deposits}
      expiries={expiries}
      occupancy={occupancy}
      collections={collections}
    />,
  );
}

/** The card list of whichever report is open. */
function cards(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>(
    '[role="tabpanel"] .sm\\:hidden',
  );
  if (!el) throw new Error("no card list in the open panel");
  return el;
}

function openTab(name: RegExp) {
  fireEvent.click(screen.getByRole("tab", { name }));
}

describe("ReportsClient", () => {
  it("shows every rent roll column on a phone, balance included", () => {
    const { container } = renderReports();
    const list = within(cards(container));
    // The four that used to be past the clip.
    expect(list.getByText("KES 85,000")).toBeTruthy();
    expect(list.getAllByText("Deposit").length).toBeGreaterThan(0);
    expect(list.getAllByText("Status").length).toBeGreaterThan(0);
    expect(list.getByText("KES 42,000")).toBeTruthy();
  });

  it("writes the dates out rather than printing the ISO string", () => {
    const { container } = renderReports();
    const list = within(cards(container));
    expect(list.getByText("31 Jan 2027")).toBeTruthy();
    expect(list.queryByText("2027-01-31")).not.toBeInTheDocument();
    // An open-ended lease has no date to write.
    expect(list.getByText("Open")).toBeTruthy();
  });

  it("dates the page in words", () => {
    renderReports();
    expect(screen.getByText("As at 27 Nov 2026")).toBeTruthy();
    expect(screen.queryByText(/2026-11-27/)).not.toBeInTheDocument();
  });

  it("gives every tab a 44px target and keeps them on one row", () => {
    renderReports();
    const tabs = screen.getAllByRole("tab");
    expect(tabs).toHaveLength(6);
    for (const tab of tabs) {
      expect(tab.className).toMatch(/min-h-\[44px\]/);
      expect(tab.className).toMatch(/whitespace-nowrap/);
    }
    // The strip scrolls instead of wrapping onto three rows.
    expect(tabs[0].parentElement!.className).toMatch(/overflow-x-auto/);
    expect(tabs[0].parentElement!.className).not.toMatch(
      /^.*\bflex-wrap\b(?!.*sm:)/,
    );
  });

  it("switches report", () => {
    const { container } = renderReports();
    openTab(/^Arrears/);
    const list = within(cards(container));
    expect(list.getByText("Oct 2026")).toBeTruthy();
    expect(list.getAllByText("Days late").length).toBeGreaterThan(0);
  });

  it("says nothing was due rather than nothing was collected", () => {
    // A month with no lease in force collected 0% of nothing. Printing 0%,
    // or the em dash this used to print, both read as a failure.
    const { container } = renderReports();
    openTab(/^Collections/);
    const list = within(cards(container));
    expect(list.getByText("Nothing due")).toBeTruthy();
    expect(list.getByText("77%")).toBeTruthy();
  });

  it("keeps the arrears warning about leases with no ledger at all", () => {
    // This is the claim that stops the report being read as "these tenants
    // owe nothing". Shortening the note must not have dropped it.
    renderReports();
    openTab(/^Arrears/);
    expect(
      screen.getByText(/2 leases have no recorded rent at all/),
    ).toBeInTheDocument();
    expect(screen.getByText(/gap in your records/)).toBeInTheDocument();
  });

  it("keeps the lapsed-lease warning on expiries", () => {
    renderReports();
    openTab(/^Lease expiries/);
    expect(
      screen.getByText(/already past the end date and still marked live/),
    ).toBeInTheDocument();
  });

  it("offers a CSV, and refuses one when the open report is empty", () => {
    const { rerender } = renderReports();
    const button = screen.getByRole("button", { name: /CSV/ });
    expect(button).not.toBeDisabled();
    expect(button.className).toMatch(/min-h-\[44px\]/);

    rerender(
      <ReportsClient
        generatedOn="2026-11-27"
        rentRoll={{ ...rentRoll, rows: [] }}
        arrears={arrears}
        deposits={deposits}
        expiries={expiries}
        occupancy={occupancy}
        collections={collections}
      />,
    );
    expect(screen.getByRole("button", { name: /CSV/ })).toBeDisabled();
  });

  it("uses no em dash on any of the six reports", () => {
    const { container } = renderReports();
    for (const name of [
      /^Rent roll/,
      /^Arrears/,
      /^Collections/,
      /^Deposits held/,
      /^Lease expiries/,
      /^Occupancy/,
    ]) {
      openTab(name);
      expect(container.textContent).not.toContain("—");
    }
  });
});
