/**
 * @jest-environment jsdom
 */

/**
 * Recent searches come from one store, not from a copy taken in each component's mount
 * effect; and suggestions for an empty query are derived, not written by an effect.
 *
 * WHY TWO SEARCH BOXES
 *   /services/browse renders this component twice (the hero and the filter bar), and
 *   that is what made the old shape a real defect rather than just an extra render:
 *   each instance read localStorage once into its own state, so clearing the list in
 *   one left the other showing it until something remounted. There was no same-tab
 *   notification at all. These tests mount two instances for exactly that reason.
 */

import { render, act, fireEvent } from "@testing-library/react";
import { Profiler } from "react";
import { ServiceSearchAutocomplete } from "../ServiceSearchAutocomplete";

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), replace: jest.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));

jest.mock("@/lib/analytics/use-analytics", () => ({
  useAnalytics: () => ({ track: jest.fn(), logSearch: jest.fn() }),
}));

const KEY = "mitasafi_recent_service_searches";

beforeEach(() => {
  localStorage.clear();
  global.fetch = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => ({ suggestions: [] }),
  }) as unknown as typeof fetch;
});

function openBox(container: HTMLElement) {
  const input = container.querySelector("input") as HTMLInputElement;
  // Opening the dropdown is itself a state change, so it is a commit. Anything
  // counting mount commits has to read the counter BEFORE calling this.
  fireEvent.focus(input);
  return input;
}

/**
 * Type into the box and submit.
 *
 * The input is controlled, so assigning `input.value` and dispatching a raw "input"
 * event does not reach React's state: React tracks the node's value itself and treats
 * the assignment as its own. fireEvent.change goes through React's synthetic event
 * system and does update `query`. Getting this wrong made three tests fail with
 * storage simply unchanged, because executeSearch saw an empty query and returned.
 */
function search(container: HTMLElement, text: string) {
  const input = container.querySelector("input") as HTMLInputElement;
  fireEvent.change(input, { target: { value: text } });
  fireEvent.submit(container.querySelector("form") as HTMLFormElement);
}

function recentItems(container: HTMLElement) {
  return [
    ...container.querySelectorAll('[aria-label="Remove from recent searches"]'),
  ].map((b) => b.parentElement?.textContent?.replace("×", "").trim());
}

describe("recent searches are shared, not copied per instance", () => {
  it("reads what is already in storage on the FIRST render, with no extra commit", () => {
    localStorage.setItem(KEY, JSON.stringify(["plumber", "movers"]));

    let commits = 0;
    const view = render(
      <Profiler
        id="search"
        onRender={() => {
          commits += 1;
        }}
      >
        <ServiceSearchAutocomplete variant="filter" />
      </Profiler>,
    );
    // Read the counter before opening the dropdown, which is a commit of its own.
    // The mount effect `setRecentSearches(getRecentSearches())` cost a second commit
    // on every mount, before the list could be shown at all.
    expect(commits).toBe(1);

    openBox(view.container);
    expect(recentItems(view.container)).toEqual(["plumber", "movers"]);
  });

  it("clearing in one box empties the other immediately", () => {
    localStorage.setItem(KEY, JSON.stringify(["plumber", "movers"]));

    const a = render(<ServiceSearchAutocomplete variant="filter" />);
    const b = render(<ServiceSearchAutocomplete variant="navbar" />);
    openBox(a.container);
    openBox(b.container);

    expect(recentItems(a.container)).toEqual(["plumber", "movers"]);
    expect(recentItems(b.container)).toEqual(["plumber", "movers"]);

    const clearAll = [...a.container.querySelectorAll("button")].find((x) =>
      x.textContent?.includes("Clear all"),
    );
    act(() => {
      clearAll?.click();
    });

    expect(recentItems(a.container)).toEqual([]);
    // The second box held its own mount-time copy and went on offering searches the
    // user had just cleared.
    expect(recentItems(b.container)).toEqual([]);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("removing one entry in one box removes it from the other", () => {
    localStorage.setItem(KEY, JSON.stringify(["plumber", "movers"]));

    const a = render(<ServiceSearchAutocomplete variant="filter" />);
    const b = render(<ServiceSearchAutocomplete variant="navbar" />);
    openBox(a.container);
    openBox(b.container);

    const remove = a.container.querySelector<HTMLElement>(
      '[aria-label="Remove from recent searches"]',
    );
    act(() => {
      remove?.click();
    });

    expect(recentItems(a.container)).toEqual(["movers"]);
    expect(recentItems(b.container)).toEqual(["movers"]);
    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toEqual(["movers"]);
  });

  it("a search run in one box appears in the other", () => {
    const a = render(<ServiceSearchAutocomplete variant="filter" />);
    const b = render(<ServiceSearchAutocomplete variant="navbar" />);
    search(a.container, "electrician");

    openBox(b.container);
    expect(recentItems(b.container)).toEqual(["electrician"]);
  });

  it("another tab's change is picked up", () => {
    const view = render(<ServiceSearchAutocomplete variant="filter" />);
    openBox(view.container);
    expect(recentItems(view.container)).toEqual([]);

    act(() => {
      localStorage.setItem(KEY, JSON.stringify(["from-another-tab"]));
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });

    expect(recentItems(view.container)).toEqual(["from-another-tab"]);
  });

  it("survives a hand-edited storage value instead of crashing", () => {
    localStorage.setItem(KEY, '["ok", 42, null, {"not":"a string"}]');
    const view = render(<ServiceSearchAutocomplete variant="filter" />);
    openBox(view.container);

    // One bad entry must not empty the list, and must not throw during render.
    expect(recentItems(view.container)).toEqual(["ok"]);
  });

  it("caps the list at five, most recent first", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify(["one", "two", "three", "four", "five"]),
    );
    const view = render(<ServiceSearchAutocomplete variant="filter" />);
    search(view.container, "six");

    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toEqual([
      "six",
      "one",
      "two",
      "three",
      "four",
    ]);
  });

  it("de-duplicates case-insensitively and promotes the entry", () => {
    localStorage.setItem(KEY, JSON.stringify(["Plumber", "movers"]));
    const view = render(<ServiceSearchAutocomplete variant="filter" />);
    search(view.container, "plumber");

    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toEqual([
      "plumber",
      "movers",
    ]);
  });
});
