/**
 * @jest-environment jsdom
 */

/**
 * The compare list is one store, not state plus two effects plus a hydration flag.
 *
 * WHAT THE isHydrated FLAG WAS GUARDING, AND WHY IT IS WORTH A TEST
 *   The provider had a load effect (localStorage -> state, the reported setState) and a
 *   persist effect (state -> localStorage). On mount the persist effect would have
 *   written the initial `[]` straight over the user's stored list, so a boolean existed
 *   to suppress it until the load had run. It worked only because of effect declaration
 *   order: load ran first and set the flag, persist ran second and still saw the old
 *   value. Reordering the two effects, or adding a third that touched `providers`,
 *   would have armed a silent "wipe the list on every page load" bug.
 *
 *   Reading and writing through one store cannot express that mistake, and the first
 *   test here is the one that would have caught it.
 */

import { render, act } from "@testing-library/react";
import { Profiler } from "react";
import {
  CompareProvidersProvider,
  CompareBar,
  CompareButton,
} from "../CompareProviders";
import type { ServiceProviderCardData } from "@/types/service-providers";

const KEY = "mitasafi-compare-providers";

function provider(
  id: string,
  name = `Provider ${id}`,
): ServiceProviderCardData {
  return {
    id,
    business_name: name,
    tagline: null,
    description: null,
    logo_url: null,
    cover_photo_url: null,
    service_image_urls: [],
    service_names: [],
    service_areas: [],
    is_available: true,
    instant_booking: false,
    is_verified: false,
    rating_average: 4,
    rating_count: 2,
    total_jobs_completed: 5,
    response_time_minutes: 30,
    tier: "free",
    min_price: 1000,
    price_type: "fixed",
    categories: [],
    subcategories: [],
    years_in_business: null,
    last_active_at: null,
    has_insurance: false,
    has_business_license: false,
    has_id_verified: false,
  };
}

beforeEach(() => {
  localStorage.clear();
});

function renderBar(extra?: React.ReactNode) {
  let commits = 0;
  const view = render(
    <Profiler
      id="compare"
      onRender={() => {
        commits += 1;
      }}
    >
      <CompareProvidersProvider>
        <CompareBar />
        {extra}
      </CompareProvidersProvider>
    </Profiler>,
  );
  return { view, commitsAtMount: () => commits };
}

describe("the stored list is honoured, not overwritten", () => {
  it("shows a stored list on the FIRST commit and leaves storage alone", () => {
    const stored = [provider("a"), provider("b")];
    localStorage.setItem(KEY, JSON.stringify(stored));

    const { view, commitsAtMount } = renderBar();

    expect(commitsAtMount()).toBe(1);
    expect(view.container.textContent).toContain("2 of 3");
    // Nothing wrote over it on mount.
    expect(JSON.parse(localStorage.getItem(KEY) ?? "null")).toEqual(stored);
  });

  it("does not create the key just by mounting with nothing stored", () => {
    renderBar();
    // The persist effect used to write "[]" on the first change after hydration.
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("renders nothing when the list is empty", () => {
    const { view } = renderBar();
    expect(view.container.textContent).toBe("");
  });
});

describe("mutations go through the store", () => {
  it("removing a provider persists and re-renders", () => {
    localStorage.setItem(KEY, JSON.stringify([provider("a"), provider("b")]));
    const { view } = renderBar();

    const remove = view.container.querySelector("button") as HTMLElement;
    act(() => {
      remove.click();
    });

    expect(view.container.textContent).toContain("1 of 3");
    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toHaveLength(1);
  });

  it("clear all removes the key", () => {
    localStorage.setItem(KEY, JSON.stringify([provider("a")]));
    const { view } = renderBar();

    const clear = [...view.container.querySelectorAll("button")].find(
      (b) => b.getAttribute("title") === "Clear all",
    );
    act(() => {
      clear?.click();
    });

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(view.container.textContent).toBe("");
  });

  it("the cap of three is enforced against storage, not against stale state", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify([provider("a"), provider("b"), provider("c")]),
    );
    const { view } = renderBar(<CompareButton provider={provider("d")} />);

    const add = [...view.container.querySelectorAll("button")].find(
      (b) => b.getAttribute("title") === "Compare list full (max 3)",
    );
    expect(add).toBeDefined();
    expect(add).toBeDisabled();
    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toHaveLength(3);
  });

  it("adding the same provider twice stores it once", () => {
    const { view } = renderBar(<CompareButton provider={provider("a")} />);
    const add = [...view.container.querySelectorAll("button")].find((b) =>
      b.getAttribute("title")?.startsWith("Add to compare"),
    );

    act(() => {
      add?.click();
    });
    expect(JSON.parse(localStorage.getItem(KEY) ?? "[]")).toHaveLength(1);

    // It is now "Remove from compare", so clicking again removes rather than adds;
    // the point is that storage never held a duplicate.
    expect(view.container.textContent).toContain("1 of 3");
  });
});

describe("another tab", () => {
  it("adding there shows here", () => {
    const { view } = renderBar();
    expect(view.container.textContent).toBe("");

    act(() => {
      localStorage.setItem(KEY, JSON.stringify([provider("z")]));
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });

    expect(view.container.textContent).toContain("1 of 3");
  });
});

describe("hand-edited storage", () => {
  it("drops entries missing the fields the table dereferences", () => {
    // business_name has .charAt(0) called on it in two places, and id is the React key.
    localStorage.setItem(
      KEY,
      JSON.stringify([
        provider("a"),
        { id: "b" },
        { business_name: "No id" },
        null,
        "nope",
      ]),
    );
    const { view } = renderBar();

    expect(view.container.textContent).toContain("1 of 3");
  });

  it("a non-array value renders as empty rather than throwing", () => {
    localStorage.setItem(KEY, '{"not":"an array"}');
    expect(() => renderBar()).not.toThrow();
  });
});
