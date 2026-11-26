/**
 * Rent collection, the landlord's view.
 *
 * The failure that matters here is not the layout, it is the page telling a
 * landlord something untrue about money. The first version of the phone card
 * put "Owes KES 95,000" in red beside a badge reading "Not due yet", because
 * it keyed the word and the colour off the balance rather than off lateness.
 * A lease whose due day has not arrived has a balance and owes nothing.
 *
 * Both the card list and the table are in the DOM at once; which one is seen
 * is CSS, and jsdom computes no CSS. Every query below is therefore scoped to
 * one or the other, and the scoping itself is asserted first.
 */

import { render, screen, within, fireEvent } from "@testing-library/react";
import { RentCollection, type RentRow, type MonthRow } from "../RentCollection";

const base: RentRow = {
  leaseId: "l1",
  unitId: "u1",
  unitNumber: "A101",
  buildingId: "b1",
  buildingName: "Riverside Court",
  tenantName: "Brian Kamau",
  tenantPhone: "+254700111222",
  due: 85000,
  paid: 0,
  balance: 85000,
  status: "overdue",
  daysLate: 12,
  dueDay: 5,
};

const notYetDue: RentRow = {
  ...base,
  leaseId: "l2",
  unitId: "u2",
  unitNumber: "W1",
  buildingName: "Westlands Heights",
  tenantName: "Dennis Omondi",
  due: 95000,
  paid: 0,
  balance: 95000,
  status: "pending",
  daysLate: 0,
  dueDay: 28,
};

const settled: RentRow = {
  ...base,
  leaseId: "l3",
  unitId: "u3",
  unitNumber: "A201",
  tenantName: "Faith Njoroge",
  due: 70000,
  paid: 70000,
  balance: 0,
  status: "paid",
  daysLate: 0,
};

/**
 * Jun is deliberately a SMALLER month than the other two.
 *
 * The first version of this fixture gave every month expected: 320000, which
 * is also the maximum. collected/maxMonth and collected/expected then produce
 * the same number for every row, so the scaling test passed against a mutant
 * that divided by the row's own expected. Jun at 225000 is what tells the two
 * formulas apart: 225/320 is 70%, 225/225 is 100%.
 */
const months: MonthRow[] = [
  { label: "Jun 2026", expected: 225000, collected: 225000 },
  { label: "Oct 2026", expected: 320000, collected: 320000 },
  { label: "Nov 2026", expected: 320000, collected: 155000 },
];

function renderPage(rows: RentRow[] = [base, notYetDue, settled]) {
  const expected = rows.reduce((s, r) => s + r.due, 0);
  const collected = rows.reduce((s, r) => s + r.paid, 0);
  return render(
    <RentCollection
      periodLabel="Nov 2026"
      expected={expected}
      collected={collected}
      outstanding={Math.max(0, expected - collected)}
      collectionRate={
        expected === 0 ? null : Math.round((collected / expected) * 100)
      }
      depositsHeld={320000}
      rows={rows}
      months={months}
      buildings={[
        { id: "b1", name: "Riverside Court" },
        { id: "b2", name: "Westlands Heights" },
      ]}
    />,
  );
}

/** The phone card list. */
function cards(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>(".sm\\:hidden");
  if (!el) throw new Error("no card list in the DOM");
  return el;
}

/** The table shown from sm: up. */
function table(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>("table");
  if (!el) throw new Error("no table in the DOM");
  return el;
}

/**
 * The balance cell of the only row in the table.
 *
 * Not getByText: when a lease has paid nothing, Due and Balance hold the
 * same string and the query matches two cells. The balance is the one
 * carrying font-semibold, which is also the one the colour is on.
 */
function balanceCell(container: HTMLElement): HTMLElement {
  const cells = table(container).querySelectorAll<HTMLElement>(
    "tbody td.font-semibold",
  );
  if (cells.length !== 1) {
    throw new Error(`expected 1 balance cell, found ${cells.length}`);
  }
  return cells[0];
}

describe("RentCollection", () => {
  it("renders both the card list and the table, which the scoping below needs", () => {
    // Without this, a helper that silently found nothing would make every
    // scoped assertion below vacuous.
    const { container } = renderPage();
    expect(cards(container)).toBeTruthy();
    expect(table(container)).toBeTruthy();
    expect(within(cards(container)).getAllByText("A101")).toHaveLength(1);
    expect(within(table(container)).getAllByText("A101")).toHaveLength(1);
  });

  describe("money a tenant does not owe yet", () => {
    it('says "Due", not "Owes", when the due day has not arrived', () => {
      const { container } = renderPage([notYetDue]);
      const list = within(cards(container));
      expect(list.getByText("Due")).toBeInTheDocument();
      expect(list.queryByText("Owes")).not.toBeInTheDocument();
    });

    it("does not colour it red", () => {
      const { container } = renderPage([notYetDue]);
      const amount = within(cards(container)).getByText("KES 95,000");
      expect(amount.className).not.toMatch(/text-red-600/);
    });

    it("shows the badge that goes with it", () => {
      const { container } = renderPage([notYetDue]);
      expect(within(cards(container)).getByText("Not due yet")).toBeTruthy();
    });
  });

  describe("money that is late", () => {
    it('says "Owes" in red', () => {
      const { container } = renderPage([base]);
      const list = within(cards(container));
      expect(list.getByText("Owes")).toBeInTheDocument();
      expect(list.getByText("KES 85,000").className).toMatch(/text-red-600/);
    });

    it("says how late, with the right singular", () => {
      const { container } = renderPage([{ ...base, daysLate: 1 }]);
      expect(within(cards(container)).getByText("1 day late")).toBeTruthy();
      const second = renderPage([base]);
      expect(
        within(cards(second.container)).getByText("12 days late"),
      ).toBeTruthy();
    });

    it("colours the table balance red too", () => {
      const { container } = renderPage([base]);
      const cell = balanceCell(container);
      expect(cell.textContent).toBe("KES 85,000");
      expect(cell.className).toMatch(/text-red-600/);
    });

    it("leaves a not-yet-due table balance uncoloured", () => {
      const { container } = renderPage([notYetDue]);
      const cell = balanceCell(container);
      expect(cell.textContent).toBe("KES 95,000");
      expect(cell.className).not.toMatch(/text-red-600/);
    });
  });

  it('says "Paid" on a settled lease and shows what came in', () => {
    // The default filter is "outstanding", and a settled lease is not in it,
    // so the card list does not exist until the filter moves. That is the
    // filter working; it also means this test has to move it.
    const { container } = renderPage([settled]);
    fireEvent.click(screen.getByRole("button", { name: /^All/ }));
    const list = within(cards(container));
    expect(list.getByText("Paid", { selector: "p" })).toBeInTheDocument();
    expect(list.queryByText("Owes")).not.toBeInTheDocument();
    expect(list.getByText("KES 70,000")).toBeTruthy();
  });

  describe("the six-month chart", () => {
    it("gives the bar the full width instead of a fixed column", () => {
      // The bar lived between a w-20 label and a w-60 figure. 320px of fixed
      // width in a 328px row left the bar at zero and the figure overflowing,
      // which is what made the page 381px wide in a 360px viewport.
      const { container } = renderPage();
      const chart = screen.getByText("Last 6 months").parentElement!;
      expect(chart.querySelector(".w-20")).toBeNull();
      expect(chart.querySelector(".w-60")).toBeNull();
    });

    it("still draws a bar per month", () => {
      renderPage();
      const chart = screen.getByText("Last 6 months").parentElement!;
      // One track per month row.
      expect(
        chart.querySelectorAll(".rounded-full.overflow-hidden"),
      ).toHaveLength(months.length);
    });

    it("scales every bar against the largest month, not against its own", () => {
      renderPage();
      const chart = screen.getByText("Last 6 months").parentElement!;
      const tracks = chart.querySelectorAll(".rounded-full.overflow-hidden");
      expect(tracks).toHaveLength(3);

      // Jun collected all 225,000 it expected, but 225,000 is 70% of the
      // 320,000 high-water mark, so its bar is 70% of the row. A chart that
      // divided by the row's own expected would paint it full, and a
      // landlord would read a flat six months where there is a dip.
      const jun = tracks[0].querySelectorAll<HTMLElement>("div");
      expect(jun[1].style.width.startsWith("70.")).toBe(true);

      // Nov: 155,000 of the same 320,000 maximum.
      const nov = tracks[2].querySelectorAll<HTMLElement>("div");
      expect(nov[1].style.width.startsWith("48.")).toBe(true);
      expect(nov[0].style.width).toBe("100%");
    });
  });

  describe("filters", () => {
    it("gives every filter a 44px target", () => {
      renderPage();
      for (const label of ["Outstanding", "Overdue", "Paid", "All"]) {
        const button = screen.getByRole("button", {
          name: new RegExp(`^${label}`),
        });
        expect(button.className).toMatch(/min-h-\[44px\]/);
      }
    });

    it("narrows the list and the counts stay off the filtered set", () => {
      const { container } = renderPage();
      // Default is outstanding: the overdue one and the not-yet-due one.
      expect(
        within(cards(container)).getAllByText(/^(Owes|Due)$/),
      ).toHaveLength(2);
      fireEvent.click(screen.getByRole("button", { name: /^Overdue/ }));
      const list = within(cards(container));
      expect(list.getByText("A101")).toBeTruthy();
      expect(list.queryByText("W1")).not.toBeInTheDocument();
      // The count on the All button still describes every row, not the two
      // left on screen.
      expect(
        screen.getByRole("button", { name: /^All/ }).textContent,
      ).toContain("3");
    });

    it("searches by tenant as well as by unit", () => {
      const { container } = renderPage();
      fireEvent.click(screen.getByRole("button", { name: /^All/ }));
      fireEvent.change(screen.getByLabelText("Search rent rows"), {
        target: { value: "njoroge" },
      });
      const list = within(cards(container));
      expect(list.getByText("A201")).toBeTruthy();
      expect(list.queryByText("A101")).not.toBeInTheDocument();
    });
  });

  it("gives each tenant a call target of 44px with a name on it", () => {
    const { container } = renderPage([base]);
    const call = within(cards(container)).getByRole("link", {
      name: "Call Brian Kamau",
    });
    expect(call).toHaveAttribute("href", "tel:+254700111222");
    expect(call.className).toMatch(/min-h-\[44px\]/);
  });

  it("makes the whole unit block the link, not just the unit number", () => {
    const { container } = renderPage([base]);
    const link = within(cards(container)).getByRole("link", {
      name: /A101/,
    });
    expect(link.className).toMatch(/min-h-\[44px\]/);
    // The building name is inside the link, so the target covers both lines.
    expect(within(link).getByText("Riverside Court")).toBeTruthy();
  });

  it("uses no em dash anywhere a landlord reads", () => {
    const { container } = renderPage();
    expect(container.textContent).not.toContain("—");
  });

  it("uses no em dash in the empty state either", () => {
    const { container } = renderPage([]);
    expect(container.textContent).not.toContain("—");
    expect(screen.getByText(/Nothing due in Nov 2026/)).toBeTruthy();
  });
});
