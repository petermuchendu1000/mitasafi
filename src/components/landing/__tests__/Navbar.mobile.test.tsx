/**
 * The public header, on a phone.
 *
 * This renders on every page a visitor sees before they sign in, so every
 * defect in it was a defect nine times over. Three were real:
 *
 *   - the saved-listings link had no text and no aria-label, only a title.
 *     A touch device never shows a title, so the control announced as
 *     "link" and nothing else.
 *   - the logo, the menu toggle and every row of the drawer were 35px to
 *     40px.
 *   - the drawer is a max-height transition pinned at max-h-96, which is
 *     384px. Raising seven rows to 44px takes the contents to about 416px,
 *     so the fix for the second defect would have hidden "Create Account"
 *     behind the clip if the max-height had been left alone. That is the
 *     one worth a test, because it only breaks when both are true.
 */

import { render, screen, fireEvent, within } from "@testing-library/react";

jest.mock("@/components/shared/NotificationCenter", () => ({
  NotificationCenter: () => null,
}));

import { Navbar } from "../Navbar";

describe("Navbar on a phone", () => {
  it("names the saved-listings link", () => {
    render(<Navbar />);
    expect(
      screen.getAllByRole("link", { name: /saved properties/i }).length,
    ).toBeGreaterThan(0);
  });

  it("gives the logo, the saved link and the toggle a 44px box", () => {
    render(<Navbar />);
    const logo = screen.getAllByRole("link", { name: /mitasafi home/i })[0];
    expect(logo.className).toMatch(/min-h-\[44px\]/);

    const saved = screen.getAllByRole("link", { name: /saved properties/i })[0];
    expect(saved.className).toMatch(/min-w-\[44px\]/);
    expect(saved.className).toMatch(/min-h-\[44px\]/);

    const toggle = screen.getByRole("button", { name: /open menu/i });
    expect(toggle.className).toMatch(/min-w-\[44px\]/);
    expect(toggle.className).toMatch(/min-h-\[44px\]/);
  });

  describe("the drawer", () => {
    function drawer(container: HTMLElement): HTMLElement {
      const el = container.querySelector<HTMLElement>(
        ".lg\\:hidden.overflow-hidden",
      );
      if (!el) throw new Error("no drawer");
      return el;
    }

    it("is shut to begin with and says so", () => {
      const { container } = render(<Navbar />);
      expect(
        screen.getByRole("button", { name: /open menu/i }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(drawer(container).className).toMatch(/max-h-0/);
    });

    it("opens, and renames the control that opened it", () => {
      const { container } = render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
      expect(
        screen.getByRole("button", { name: /close menu/i }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(drawer(container).className).not.toMatch(/max-h-0/);
    });

    it("is tall enough for seven 44px rows", () => {
      // max-h-96 is 384px. Five links, two dividers, two buttons and the
      // gaps come to about 416px once every row is a thumb target, so the
      // last control would sit behind the clip. Measured, not guessed.
      const { container } = render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
      const cls = drawer(container).className;
      expect(cls).not.toMatch(/max-h-96\b/);
      const rem = /max-h-\[(\d+)rem\]/.exec(cls);
      expect(rem).not.toBeNull();
      expect(Number(rem![1]) * 16).toBeGreaterThanOrEqual(416);
    });

    it("gives every row in it a 44px box", () => {
      const { container } = render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
      const rows = within(drawer(container)).getAllByRole("link");
      expect(rows.length).toBeGreaterThanOrEqual(6);
      for (const row of rows) {
        // Create Account comes from buttonVariants, which sizes itself.
        if (/create account/i.test(row.textContent ?? "")) continue;
        expect(row.className).toMatch(/min-h-\[44px\]/);
      }
    });

    it("closes when a row is followed", () => {
      const { container } = render(<Navbar />);
      fireEvent.click(screen.getByRole("button", { name: /open menu/i }));
      fireEvent.click(
        within(drawer(container)).getByRole("link", { name: "Services" }),
      );
      expect(drawer(container).className).toMatch(/max-h-0/);
    });
  });
});
