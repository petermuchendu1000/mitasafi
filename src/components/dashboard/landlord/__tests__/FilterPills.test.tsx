/**
 * The filter row every list shares.
 *
 * Five lists had written their own and every copy was 30px to 36px tall.
 * Buildings' copy had no aria-pressed on any button at all, so a screen
 * reader heard three unnamed buttons and nothing about which filter was on.
 * Both of those are the kind of thing that survives in a copy of a copy, so
 * both are pinned here rather than in five places.
 */

import { render, screen, fireEvent } from "@testing-library/react";
import { FilterPills } from "../FilterPills";

type Id = "all" | "live" | "ended";

const options = [
  { id: "all" as Id, label: "All", count: 12 },
  { id: "live" as Id, label: "Live", count: 9 },
  { id: "ended" as Id, label: "Ended", count: 3 },
];

describe("FilterPills", () => {
  it("gives every pill a 44px target", () => {
    render(
      <FilterPills
        label="Filter leases"
        value="all"
        onChange={() => {}}
        options={options}
      />,
    );
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const b of buttons) expect(b.className).toMatch(/min-h-\[44px\]/);
  });

  it("says which one is on", () => {
    render(
      <FilterPills
        label="Filter leases"
        value="live"
        onChange={() => {}}
        options={options}
      />,
    );
    expect(screen.getByRole("button", { name: /^Live/ })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /^All/ })).toHaveAttribute(
      "aria-pressed",
      "false",
    );
  });

  it("names the group, so the pills are not three loose buttons", () => {
    render(
      <FilterPills
        label="Filter leases"
        value="all"
        onChange={() => {}}
        options={options}
      />,
    );
    expect(screen.getByRole("group", { name: "Filter leases" })).toBeTruthy();
  });

  it("reports the choice", () => {
    const onChange = jest.fn();
    render(
      <FilterPills
        label="Filter leases"
        value="all"
        onChange={onChange}
        options={options}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /^Ended/ }));
    expect(onChange).toHaveBeenCalledWith("ended");
  });

  it("scrolls in one row on a phone rather than wrapping into a ragged block", () => {
    const { container } = render(
      <FilterPills
        label="Filter leases"
        value="all"
        onChange={() => {}}
        options={options}
      />,
    );
    const group = container.querySelector('[role="group"]')!;
    expect(group.className).toMatch(/overflow-x-auto/);
    // Wrapping is allowed from sm:, where there is room.
    expect(group.className).toMatch(/sm:flex-wrap/);
    for (const b of screen.getAllByRole("button")) {
      expect(b.className).toMatch(/whitespace-nowrap/);
      expect(b.className).toMatch(/shrink-0/);
    }
  });

  describe("counts", () => {
    it("shows one when given", () => {
      render(
        <FilterPills
          label="x"
          value="all"
          onChange={() => {}}
          options={options}
        />,
      );
      expect(
        screen.getByRole("button", { name: "All 12" }),
      ).toBeInTheDocument();
    });

    it("shows a zero, because zero is a fact", () => {
      render(
        <FilterPills
          label="x"
          value="all"
          onChange={() => {}}
          options={[{ id: "ended" as Id, label: "Ended", count: 0 }]}
        />,
      );
      expect(screen.getByRole("button", { name: "Ended 0" })).toBeTruthy();
    });

    it("shows nothing when there is no count", () => {
      render(
        <FilterPills
          label="x"
          value="all"
          onChange={() => {}}
          options={[{ id: "all" as Id, label: "All" }]}
        />,
      );
      expect(screen.getByRole("button", { name: "All" }).textContent).toBe(
        "All",
      );
    });
  });
});
