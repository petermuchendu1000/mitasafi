/**
 * Render-level guards for the two things this page must not do.
 *
 * The logic tests prove buildApplicationQueue does not rank by income. They
 * cannot prove the PAGE doesn't — a component is free to re-sort, or to print
 * a stated income as though it were a checked fact. These pin both at the
 * point a landlord actually reads them.
 */

import { render, screen, within } from "@testing-library/react";
import { ApplicationsQueue } from "../ApplicationsQueue";
import {
  buildApplicationQueue,
  type ApplicationRow,
} from "@/lib/landlord/applications";

jest.mock("../actions", () => ({
  recordApplicationDecision: jest.fn(async () => ({ success: true })),
}));

const row = (over: Partial<ApplicationRow>): ApplicationRow => ({
  id: "a",
  listing_id: "L1",
  applicant_id: "u",
  full_name: "Someone",
  email: null,
  phone: "+254712345678",
  occupation: null,
  employer: null,
  monthly_income: null,
  household_size: null,
  move_in_date: null,
  lease_months: null,
  message: null,
  status: "new",
  landlord_notes: null,
  decided_at: null,
  created_at: "2026-11-20T08:00:00Z",
  ...over,
});

function renderQueue(applications: ApplicationRow[]) {
  const built = buildApplicationQueue({
    applications,
    listings: [{ id: "L1", title: "2br in Kilimani", rent_amount: 45000 }],
  });
  return render(
    <ApplicationsQueue applications={built.applications} stats={built.stats} />,
  );
}

it("does not put the higher earner first", () => {
  renderQueue([
    row({
      id: "low",
      full_name: "Aisha Lowearner",
      monthly_income: 46000,
      created_at: "2026-11-22T00:00:00Z",
    }),
    row({
      id: "high",
      full_name: "Brian Highearner",
      monthly_income: 900000,
      created_at: "2026-11-01T00:00:00Z",
    }),
  ]);

  const names = screen
    .getAllByRole("heading", { level: 3 })
    .map((h) => h.textContent);
  expect(names).toEqual(["Aisha Lowearner", "Brian Highearner"]);
});

it("says on every income that nobody has checked it", () => {
  // The wording shortened in the mobile pass, from "This figure is what the
  // applicant entered; MitaSafi has not verified it." The claim is the same
  // one and is what this test is for: the figure is unverified, and the page
  // says so every time.
  renderQueue([row({ monthly_income: 90000 })]);
  expect(
    screen.getByText(/Entered by the applicant\. Not verified\./i),
  ).toBeInTheDocument();
  // And shows the ratio as arithmetic rather than a verdict.
  expect(screen.getByText(/2\.0× the asking rent/)).toBeInTheDocument();
  expect(screen.queryByText(/strong|weak|good|poor|risk/i)).toBeNull();
});

it("offers no control that would let a landlord withdraw for someone", () => {
  renderQueue([row({ status: "new" })]);
  const buttons = screen.getAllByRole("button").map((b) => b.textContent);
  expect(buttons).toEqual(
    expect.arrayContaining([
      "Reviewing",
      "Shortlisted",
      "Approved",
      "Declined",
    ]),
  );
  expect(buttons).not.toContain("Withdrawn");
});

it("distinguishes an empty queue from an unmatched search", () => {
  const { unmount } = renderQueue([]);
  expect(screen.getByText(/No applications yet/i)).toBeInTheDocument();
  unmount();

  renderQueue([row({ status: "approved" })]);
  // Default filter is "needs a decision", so an approved-only queue shows the
  // no-match message, not the never-had-any message.
  expect(screen.getByText(/No application matches that/i)).toBeInTheDocument();
});

it("counts open applications separately from the total", () => {
  renderQueue([
    row({ id: "1", status: "new" }),
    row({ id: "2", status: "approved" }),
    row({ id: "3", status: "rejected" }),
  ]);
  // "Applications" is also the h1 and "Needs a decision" is also a filter
  // button, so the tile is found by its own label element, not by text alone.
  const tileValue = (label: string) => {
    const p = screen
      .getAllByText(label)
      .find((el) => el.tagName === "P" && el.className.includes("uppercase"));
    return within(p!.parentElement as HTMLElement);
  };
  expect(tileValue("Applications").getByText("3")).toBeInTheDocument();
  expect(tileValue("Needs a decision").getByText("1")).toBeInTheDocument();
});
