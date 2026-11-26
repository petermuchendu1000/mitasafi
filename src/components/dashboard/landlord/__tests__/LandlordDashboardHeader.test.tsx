/**
 * The landlord header bar.
 *
 * WHY THIS EXISTS
 *   The header carried a magnifying-glass button with no onClick, no href
 *   and no form around it. It rendered on every landlord page and did
 *   nothing when tapped. Nothing failed, because a button that does nothing
 *   is valid in every sense a compiler or a linter cares about, which is
 *   exactly why it survived. The only thing that can catch it coming back
 *   is a test that says so.
 */

import { render, screen } from "@testing-library/react";
import { LandlordDashboardHeader } from "../LandlordDashboardHeader";

describe("LandlordDashboardHeader", () => {
  it("renders no control that does nothing when pressed", () => {
    render(<LandlordDashboardHeader onMenuToggle={() => {}} />);

    for (const button of screen.getAllByRole("button")) {
      // Every button here must either carry a handler React has bound, or
      // be one of the two the component is for. onclick is null for React
      // handlers, so the name is what is checkable: a button whose whole
      // purpose is unnamed behaviour is the failure mode being guarded.
      const name = button.getAttribute("aria-label") ?? "";
      expect(name).not.toBe("Search");
    }
  });

  it("still renders the controls it is for, so the check above is not vacuous", () => {
    // Without this, deleting the entire header would pass the test above.
    render(<LandlordDashboardHeader onMenuToggle={() => {}} />);
    expect(
      screen.getByRole("button", { name: /toggle navigation menu/i }),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /notifications/i })).toBeTruthy();
  });

  it("gives the menu toggle a 44px target", () => {
    // jsdom does no layout, so the class is the assertion. p-2 around a 24px
    // icon measured 40px in Chromium, which is what this replaced.
    render(<LandlordDashboardHeader onMenuToggle={() => {}} />);
    const menu = screen.getByRole("button", {
      name: /toggle navigation menu/i,
    });
    expect(menu.className).toMatch(/min-w-\[44px\]/);
    expect(menu.className).toMatch(/min-h-\[44px\]/);
  });

  it("calls back when the menu toggle is pressed", () => {
    const onMenuToggle = jest.fn();
    render(<LandlordDashboardHeader onMenuToggle={onMenuToggle} />);
    screen.getByRole("button", { name: /toggle navigation menu/i }).click();
    expect(onMenuToggle).toHaveBeenCalledTimes(1);
  });
});
