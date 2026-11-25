/**
 * The apply form, and the bug that made it necessary.
 *
 * `Field` was first declared INSIDE ApplyModal. That makes it a new component
 * type on every render, so React unmounts and remounts every input under it —
 * and the field you are typing in loses focus after each character. eslint
 * flagged it; nothing else would have, because the markup and the values were
 * all correct. The focus test below fails if it is ever moved back inside.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { ApplyModal } from "../ApplyModal";

jest.mock("@/app/listings/[slug]/actions", () => ({
  submitRentalApplication: jest.fn(async () => ({ success: true })),
}));

const open = (over: Partial<React.ComponentProps<typeof ApplyModal>> = {}) =>
  render(
    <ApplyModal
      isOpen
      onClose={() => {}}
      listingId="L1"
      listingTitle="2 bedroom in Kilimani"
      isAuthenticated
      {...over}
    />,
  );

it("keeps focus in the field while you type", () => {
  open();
  const name = screen.getByLabelText("Your name") as HTMLInputElement;
  name.focus();
  expect(document.activeElement).toBe(name);

  fireEvent.change(name, { target: { value: "W" } });
  fireEvent.change(name, { target: { value: "Wa" } });

  // A remount would have moved focus to <body>.
  expect(document.activeElement).toBe(screen.getByLabelText("Your name"));
  expect((screen.getByLabelText("Your name") as HTMLInputElement).value).toBe(
    "Wa",
  );
});

it("associates every control with a label", () => {
  const { container } = open();
  const controls = container.querySelectorAll("input, textarea");
  expect(controls.length).toBeGreaterThan(5);
  for (const c of Array.from(controls)) {
    const labels = (c as HTMLInputElement).labels;
    expect(labels && labels.length).toBeGreaterThan(0);
  }
});

it("requires only a name and a phone number", () => {
  const { container } = open();
  const required = Array.from(
    container.querySelectorAll("input[required], textarea[required]"),
  ).map((c) => (c as HTMLInputElement).labels?.[0]?.textContent);
  expect(required).toEqual(["Your name", "Phone"]);
});

it("says who sees the income and that nothing scores it", () => {
  open();
  expect(
    screen.getByText(
      /Only this landlord sees it\. It is not checked or scored\./i,
    ),
  ).toBeInTheDocument();
});

it("asks an unauthenticated visitor to sign in rather than showing the form", () => {
  open({ isAuthenticated: false });
  expect(screen.getByText(/Sign in to apply/i)).toBeInTheDocument();
  expect(screen.queryByLabelText("Your name")).toBeNull();
});
