/**
 * Apply has to be reachable on a desktop.
 *
 * The first version of this feature put the Apply button only in the listing
 * page's bottom bar, which is `lg:hidden` — a mobile-only sticky strip. Every
 * desktop visitor saw Contact and nothing else, so the whole application flow
 * was unreachable for them. jsdom has no viewport and no CSS, so no render
 * test would have caught it; a real browser did, by failing to find the button.
 *
 * What is pinned here is the fix: the price card — which renders in BOTH the
 * mobile and the desktop column — offers Apply whenever the listing can take
 * one, and offers nothing when it cannot.
 */

import { render, screen } from "@testing-library/react";
import { ListingPriceCard } from "../ListingPriceCard";
import type { PriceBreakdown } from "@/lib/listings/types";

// The real PriceBreakdown, uncast. The first version of this fixture invented
// a shape and hid the mismatch behind `as unknown as`, which turned a type
// error into a runtime crash inside the component.
const price: PriceBreakdown = {
  rent: 45000,
  serviceCharge: null,
  totalMonthly: 45000,
  depositMonths: 2,
  depositAmount: 90000,
  moveInCost: 135000,
  currency: "KES",
  rentIncludes: [],
  isNegotiable: false,
};

const base = {
  price,
  availableNow: true,
  availableFrom: null,
  onContact: () => {},
  onScheduleViewing: () => {},
  isAuthenticated: true,
};

it("offers Apply in the price card, which both columns render", () => {
  render(<ListingPriceCard {...base} onApply={() => {}} />);
  expect(screen.getByRole("button", { name: "Apply" })).toBeInTheDocument();
  // Contact is still there; applying does not replace asking a question.
  expect(
    screen.getByRole("button", { name: /Contact Landlord/i }),
  ).toBeInTheDocument();
});

it("offers no Apply button when the listing cannot take one", () => {
  render(<ListingPriceCard {...base} />);
  expect(screen.queryByRole("button", { name: "Apply" })).toBeNull();
});
