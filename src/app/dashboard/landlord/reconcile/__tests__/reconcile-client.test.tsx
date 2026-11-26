/**
 * Reconcile on a phone.
 *
 * WHY THE "PLACED" LIST IS THE POINT OF THIS FILE
 *   It is a five-column table, the same shape that measured 749px and was
 *   clipped outright on the reports page. The browser run could not catch
 *   it here because the test landlord has nothing matched yet, so the
 *   branch never rendered. An empty branch is not a working branch; these
 *   tests are what actually exercise it.
 */

import {
  render,
  screen,
  within,
  fireEvent,
  waitFor,
} from "@testing-library/react";

// The component imports a "use server" module. Loading it under jsdom pulls
// next/cache in and the suite cannot start.
const ingestPastedPayments = jest.fn();
jest.mock("../actions", () => ({
  ingestPastedPayments: (text: string) => ingestPastedPayments(text),
  assignInboxRow: jest.fn(),
  ignoreInboxRow: jest.fn(),
}));

import { ReconcileClient, type InboxRow } from "../ReconcileClient";

const matched: InboxRow = {
  id: "m1",
  transId: "SFG12ABCDE",
  amount: 30000,
  billRef: "A101",
  payerName: "Wanjiru Kariuki",
  msisdn: "+254712345678",
  transTime: "2026-11-04T06:15:00Z",
  status: "matched",
  reason: "Account A101 matched one live lease",
  matchedLeaseId: "l1",
};

const unmatched: InboxRow = {
  id: "u1",
  transId: "TGH88ZZZZZ",
  amount: 12000,
  billRef: null,
  payerName: null,
  msisdn: null,
  transTime: "2026-11-20T08:00:00Z",
  status: "unmatched",
  reason: "No account number in the message",
  matchedLeaseId: null,
};

const ignored: InboxRow = {
  ...unmatched,
  id: "i1",
  transId: "IGN00AAAAA",
  status: "ignored",
  reason: "Not rent.",
};

const leases = [{ id: "l1", label: "A101, Riverside Court" }];

function renderClient(rows: InboxRow[]) {
  return render(<ReconcileClient rows={rows} leases={leases} />);
}

function placedCards(container: HTMLElement): HTMLElement {
  const lists = container.querySelectorAll<HTMLElement>(".sm\\:hidden");
  if (lists.length !== 1) {
    throw new Error(`expected one card list, found ${lists.length}`);
  }
  return lists[0];
}

describe("ReconcileClient", () => {
  describe("the placed list", () => {
    it("shows every column of a matched payment on a phone", () => {
      const { container } = renderClient([matched]);
      const list = within(placedCards(container));
      expect(list.getByText("SFG12ABCDE")).toBeTruthy();
      expect(list.getByText("KES 30,000")).toBeTruthy();
      expect(list.getByText("Wanjiru Kariuki")).toBeTruthy();
      expect(
        list.getByText(/Account A101 matched one live lease/),
      ).toBeTruthy();
    });

    it("labels each value, because there is no header row on a card", () => {
      const { container } = renderClient([matched]);
      const terms = Array.from(
        placedCards(container).querySelectorAll("dt"),
      ).map((dt) => dt.textContent);
      // Code is the heading and Recorded the subheading.
      expect(terms).toEqual(["Payer", "Why", "Amount"]);
    });

    it("renders the table as well, for sm: and up", () => {
      const { container } = renderClient([matched]);
      const table = container.querySelector("table")!;
      expect(
        Array.from(table.querySelectorAll("th")).map((th) => th.textContent),
      ).toEqual(["Code", "Recorded", "Payer", "Why", "Amount"]);
    });

    it("names an anonymous payer rather than printing a dash", () => {
      const { container } = renderClient([{ ...matched, payerName: null }]);
      expect(
        within(placedCards(container)).getByText("Unknown payer"),
      ).toBeTruthy();
    });

    it("says so when nothing has been matched", () => {
      renderClient([]);
      expect(screen.getByText("Nothing matched yet.")).toBeTruthy();
    });
  });

  describe("the unmatched list", () => {
    it("gives both decisions a 44px target", () => {
      renderClient([unmatched]);
      expect(screen.getByRole("button", { name: "Post" }).className).toMatch(
        /min-h-\[44px\]/,
      );
      expect(
        screen.getByRole("button", { name: /Not rent/ }).className,
      ).toMatch(/min-h-\[44px\]/);
      expect(screen.getByLabelText(/Lease to assign/).className).toMatch(
        /min-h-\[44px\]/,
      );
    });

    it("will not post until a lease is chosen", () => {
      renderClient([unmatched]);
      expect(screen.getByRole("button", { name: "Post" })).toBeDisabled();
    });

    it("says why it could not be placed", () => {
      renderClient([unmatched]);
      expect(screen.getByText("No account number in the message")).toBeTruthy();
      expect(screen.getByText(/no account given/)).toBeTruthy();
    });
  });

  it("gives the read button a 44px target", () => {
    renderClient([]);
    expect(
      screen.getByRole("button", { name: "Read and match" }).className,
    ).toMatch(/min-h-\[44px\]/);
  });

  it("uses no em dash, with rows in every state", () => {
    const { container } = renderClient([matched, unmatched, ignored]);
    expect(container.textContent).not.toContain("—");
  });

  it("uses no em dash when reconciliation is switched off", () => {
    const { container } = render(
      <ReconcileClient rows={[]} leases={[]} notEnabled />,
    );
    expect(container.textContent).not.toContain("—");
    expect(screen.getByText(/not switched on here/)).toBeTruthy();
  });

  describe("the report after a paste", () => {
    /**
     * This branch renders only after a successful paste, so nothing in the
     * browser run or in the tests above ever reached it. A mutant that put
     * an em dash back between the code and the detail survived the first
     * mutation pass because of exactly that gap.
     */
    beforeEach(() => ingestPastedPayments.mockReset());

    async function paste(report: unknown) {
      ingestPastedPayments.mockResolvedValue({ success: true, report });
      const view = render(<ReconcileClient rows={[]} leases={leases} />);
      fireEvent.change(screen.getByLabelText("M-Pesa confirmation messages"), {
        target: { value: "SFG12ABCDE Confirmed. Ksh30,000.00" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Read and match" }));
      await waitFor(() =>
        expect(
          screen.getByLabelText("What happened to each message"),
        ).toBeInTheDocument(),
      );
      return view;
    }

    it("says what happened to each message", async () => {
      const { container } = await paste([
        {
          transId: "SFG12ABCDE",
          outcome: "matched",
          detail: "Placed on A101, Riverside Court.",
        },
        {
          transId: null,
          outcome: "unreadable",
          detail: "No M-Pesa code in that message.",
        },
      ]);
      const list = within(
        screen.getByLabelText("What happened to each message"),
      );
      expect(list.getByText("matched")).toBeTruthy();
      expect(list.getByText("SFG12ABCDE")).toBeTruthy();
      expect(list.getByText(/Placed on A101/)).toBeTruthy();
      expect(list.getByText("unreadable")).toBeTruthy();
      expect(container.textContent).not.toContain("\u2014");
    });

    it("surfaces a refusal instead of a report", async () => {
      ingestPastedPayments.mockResolvedValue({
        success: false,
        error: "Could not read that.",
      });
      render(<ReconcileClient rows={[]} leases={leases} />);
      fireEvent.change(screen.getByLabelText("M-Pesa confirmation messages"), {
        target: { value: "nonsense" },
      });
      fireEvent.click(screen.getByRole("button", { name: "Read and match" }));
      await waitFor(() =>
        expect(screen.getByRole("alert")).toHaveTextContent(
          "Could not read that.",
        ),
      );
      expect(
        screen.queryByLabelText("What happened to each message"),
      ).not.toBeInTheDocument();
    });

    it("will not read an empty box", () => {
      render(<ReconcileClient rows={[]} leases={leases} />);
      expect(
        screen.getByRole("button", { name: "Read and match" }),
      ).toBeDisabled();
    });
  });
});
