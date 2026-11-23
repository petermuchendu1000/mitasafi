/**
 * @jest-environment jsdom
 */

/**
 * State that was synchronised by an effect, and is now derived during render.
 *
 * WHY RENDER COUNTS, AND NOT THE RENDERED OUTPUT
 *   react-hooks/set-state-in-effect is about the EXTRA RENDER: the component paints
 *   once with the stale value, the effect then writes state, and it paints again with
 *   the right one. Testing Library wraps render and rerender in act(), which flushes
 *   effects before any assertion runs — so by the time a test can look at the DOM, the
 *   second paint has already happened and the output looks correct in both versions.
 *
 *   The observable difference is the number of renders, so that is what these assert.
 *   Each test fails if the effect is put back: the count goes from 1 to 2.
 */

import { render, renderHook, act } from "@testing-library/react";
import { Profiler } from "react";
import {
  LocationPicker,
  type SavedLocation,
  type LocationData,
} from "@/components/booking/LocationPicker";
import { useDateInput } from "@/app/dashboard/landlord/listings/new/hooks/useAvailability";

const EMPTY_VALUE: LocationData = {
  addressLine1: "",
  addressLine2: "",
  area: "",
  city: "Nairobi",
  accessNotes: "",
  locationType: "",
  saveLocation: false,
  locationLabel: "",
};

const SAVED: SavedLocation[] = [
  {
    id: "loc-1",
    label: "Home",
    address_line1: "Riverside Court",
    area: "Kilimani",
    city: "Nairobi",
  },
];

/**
 * Counts COMMITS of the wrapped subtree.
 *
 * A first attempt counted renders of a wrapper component instead. That cannot work:
 * when LocationPicker updates its own state, only LocationPicker re-renders and the
 * parent does not, so the wrapper never saw the extra render and the test passed with
 * the effect restored. The mutation run caught it. <Profiler> fires onRender for each
 * commit of the subtree it wraps, including ones caused by the child's own setState.
 */
function Counted({
  savedLocations,
  onCommit,
}: {
  savedLocations: SavedLocation[];
  onCommit: () => void;
}) {
  // onCommit is called, not mutated. An earlier version incremented a counter object
  // passed in as a prop, which react-hooks/immutability correctly reported: this task
  // is about removing lint errors, not trading one rule's for another's.
  return (
    <Profiler id="lp" onRender={onCommit}>
      <LocationPicker
        savedLocations={savedLocations}
        value={EMPTY_VALUE}
        onChange={() => {}}
      />
    </Profiler>
  );
}

describe("LocationPicker mode is derived, not synchronised", () => {
  it("losing the last saved location costs ONE commit, not two", () => {
    let commits = 0;
    const bump = () => {
      commits += 1;
    };
    const view = render(<Counted savedLocations={SAVED} onCommit={bump} />);
    commits = 0;

    view.rerender(<Counted savedLocations={[]} onCommit={bump} />);

    // With the effect, the prop change rendered with mode still "saved", the effect
    // then called setMode("new"), and React rendered a second time.
    expect(commits).toBe(1);
  });

  it("shows the new-address form once there are no saved locations", () => {
    const view = render(
      <LocationPicker
        savedLocations={SAVED}
        value={EMPTY_VALUE}
        onChange={() => {}}
      />,
    );
    view.rerender(
      <LocationPicker
        savedLocations={[]}
        value={EMPTY_VALUE}
        onChange={() => {}}
      />,
    );

    // The render the user would have seen mid-transition drew neither branch: the
    // saved list is gated on savedLocations.length > 0 and the form on mode === "new".
    expect(view.container.querySelector("#loc-address")).not.toBeNull();
  });

  it("still lets the user switch modes while saved locations exist", () => {
    const view = render(
      <LocationPicker
        savedLocations={SAVED}
        value={EMPTY_VALUE}
        onChange={() => {}}
      />,
    );
    // Saved mode first: the address form is not shown.
    expect(view.container.querySelector("#loc-address")).toBeNull();

    const newAddressButton = [
      ...view.container.querySelectorAll("button"),
    ].find((b) => b.textContent?.includes("New address"));
    act(() => {
      newAddressButton?.click();
    });

    expect(view.container.querySelector("#loc-address")).not.toBeNull();
  });
});

describe("useDateInput error is derived, not synchronised", () => {
  it("a keystroke costs ONE render, not two", () => {
    // Counts renders SINCE the reset below. An earlier version of this test assigned
    // a cumulative useRef counter instead of incrementing a delta, so it read 2 for a
    // single re-render and failed against correct code.
    const renders = { n: 0 };
    const { result } = renderHook(() => {
      renders.n += 1;
      return useDateInput(null);
    });

    renders.n = 0;
    const before = result.current;
    act(() => {
      before.setValue("not-a-date");
    });

    // With the effect: one render for the value, one more for the error it set.
    expect(renders.n).toBe(1);
  });

  it("reports the error for the CURRENT value, not the previous one", () => {
    const { result } = renderHook(() => useDateInput(null));

    act(() => result.current.setValue("not-a-date"));
    expect(result.current.error).toBe("Invalid date format. Use YYYY-MM-DD");
    expect(result.current.isValid).toBe(false);

    act(() => result.current.setValue("2026-03-01"));
    expect(result.current.error).toBeNull();
    expect(result.current.isValid).toBe(true);
  });

  it("clear() leaves no stale error", () => {
    const { result } = renderHook(() => useDateInput(null));
    act(() => result.current.setValue("nonsense"));
    expect(result.current.error).not.toBeNull();

    act(() => result.current.clear());
    expect(result.current.value).toBe("");
    expect(result.current.error).toBeNull();
  });
});
