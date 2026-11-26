/**
 * The two shapes have to agree.
 *
 * The whole point of taking columns as data is that the card list and the
 * table cannot drift apart. A card that quietly dropped a column would be
 * exactly the bug this replaced: on a phone the landlord would once again
 * not be able to see the balance, only this time with no clipped table to
 * make it obvious.
 */

import { render, screen, within } from "@testing-library/react";
import { DataTable } from "../DataTable";

const columns = [
  { label: "Unit" },
  { label: "Building" },
  { label: "Tenant" },
  { label: "Rent", right: true },
  { label: "Balance", right: true },
];

const rows = [
  {
    key: "a",
    cells: ["A101", "Riverside Court", "Brian Kamau", "KES 85,000", "KES 0"],
  },
  {
    // Rent and Balance differ on purpose. With the same figure in both, a
    // query for it matches two cells and says nothing about which column
    // the value landed in, which is the only thing these tests care about.
    key: "b",
    cells: [
      "W1",
      "Westlands Heights",
      "Dennis Omondi",
      "KES 95,000",
      "KES 40,000",
    ],
  },
];

function cardList(container: HTMLElement): HTMLElement {
  const el = container.querySelector<HTMLElement>(".sm\\:hidden");
  if (!el) throw new Error("no card list");
  return el;
}

describe("DataTable", () => {
  it("puts every column in the card, labelled, except the heading cells", () => {
    const { container } = render(
      <DataTable
        caption="Rent roll"
        columns={columns}
        rows={rows}
        titleAt={0}
        subtitleAt={1}
      />,
    );
    const list = cardList(container);
    const terms = Array.from(list.querySelectorAll("dt")).map(
      (dt) => dt.textContent,
    );
    // Unit is the heading and Building the subheading, so neither is a term.
    expect(terms).toEqual([
      "Tenant",
      "Rent",
      "Balance",
      "Tenant",
      "Rent",
      "Balance",
    ]);

    // Balance is the column the clipped table used to hide. It is the one
    // worth naming in an assertion.
    expect(within(list).getByText("KES 40,000")).toBeInTheDocument();
  });

  it("shows the heading cells as the card heading, not as a labelled row", () => {
    const { container } = render(
      <DataTable
        caption="Rent roll"
        columns={columns}
        rows={rows}
        titleAt={0}
        subtitleAt={1}
      />,
    );
    const list = cardList(container);
    expect(within(list).getByText("A101")).toBeTruthy();
    expect(within(list).getByText("Riverside Court")).toBeTruthy();
    expect(within(list).queryByText("Unit")).not.toBeInTheDocument();
  });

  it("renders the same cells in the table", () => {
    const { container } = render(
      <DataTable caption="Rent roll" columns={columns} rows={rows} />,
    );
    const table = container.querySelector("table")!;
    expect(
      Array.from(table.querySelectorAll("thead th")).map(
        (th) => th.textContent,
      ),
    ).toEqual(["Unit", "Building", "Tenant", "Rent", "Balance"]);
    expect(table.querySelectorAll("tbody tr")).toHaveLength(2);
    expect(within(table).getByText("KES 40,000")).toBeTruthy();
  });

  it("tells a screen reader what the card list is", () => {
    // The table has a <caption>; the card list is a pile of divs and would
    // otherwise be unlabelled.
    render(<DataTable caption="Rent roll" columns={columns} rows={rows} />);
    expect(
      screen.getByRole("heading", { name: "Rent roll", level: 3 }),
    ).toBeInTheDocument();
  });

  describe("totals", () => {
    const totals = [
      { label: "2 leases", value: "" },
      { label: "Rent due", value: "KES 180,000" },
      { label: "Balance", value: "KES 40,000" },
    ];

    it("spans exactly the width of the table, whatever the shape", () => {
      // N pairs is 2N cells and the first label absorbs the spare, so the
      // footer row must come to columns.length however many pairs there are.
      for (const n of [1, 2, 3]) {
        const { container, unmount } = render(
          <DataTable
            caption="x"
            columns={columns}
            rows={rows}
            totals={totals.slice(0, n)}
          />,
        );
        const foot = container.querySelector("tfoot tr")!;
        const span = Array.from(foot.querySelectorAll("td")).reduce(
          (sum, td) => sum + (Number(td.getAttribute("colspan")) || 1),
          0,
        );
        expect(span).toBe(columns.length);
        unmount();
      }
    });

    it("shows the same totals on a phone", () => {
      const { container } = render(
        <DataTable caption="x" columns={columns} rows={rows} totals={totals} />,
      );
      const list = cardList(container);
      expect(within(list).getByText("Rent due")).toBeTruthy();
      expect(within(list).getByText("KES 180,000")).toBeTruthy();
    });

    it("renders no footer when there are none", () => {
      const { container } = render(
        <DataTable caption="x" columns={columns} rows={rows} />,
      );
      expect(container.querySelector("tfoot")).toBeNull();
    });
  });

  it("leaves out a column marked cardHidden, but keeps it in the table", () => {
    const { container } = render(
      <DataTable
        caption="x"
        columns={[{ label: "Unit" }, { label: "Note", cardHidden: true }]}
        rows={[{ key: "a", cells: ["A101", "hidden on a phone"] }]}
      />,
    );
    expect(
      within(cardList(container)).queryByText("hidden on a phone"),
    ).not.toBeInTheDocument();
    expect(
      within(container.querySelector("table")!).getByText("hidden on a phone"),
    ).toBeTruthy();
  });
});
