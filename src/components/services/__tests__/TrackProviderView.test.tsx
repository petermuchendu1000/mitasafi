/**
 * @jest-environment jsdom
 */

/**
 * The writer that makes the home page's "Recently viewed" section reachable.
 *
 * Before this component nothing in the repository wrote recently-viewed data —
 * addProvider, trackProviderView and the rest had no callers, and a repo-wide grep
 * for the storage key found only the hook's own file. RecentlyViewedSection returns
 * null on an empty list, so it could never render anything at all.
 *
 * The last test is the point of the whole item: record a view, then mount the section
 * and see it appear.
 */

import { render, act } from "@testing-library/react";
import { TrackProviderView } from "../TrackProviderView";
import { useRecentlyViewed } from "@/hooks/useRecentlyViewed";
import { renderHook } from "@testing-library/react";

const KEY = "mitasafi_recently_viewed_providers";

beforeEach(() => {
  localStorage.clear();
});

const PROPS = {
  id: "p1",
  businessName: "Zuri Cleaning Services",
  tagline: "Spotless homes across Nairobi",
  logoUrl: "/logo.png",
  ratingAverage: 4.8,
  ratingCount: 134,
  minPrice: 3500,
  categoryIds: "cleaning,repairs",
};

describe("recording a view", () => {
  it("writes the provider to storage and renders nothing", () => {
    const view = render(<TrackProviderView {...PROPS} />);

    expect(view.container.innerHTML).toBe("");
    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    expect(stored).toHaveLength(1);
    expect(stored[0]).toMatchObject({
      id: "p1",
      business_name: "Zuri Cleaning Services",
      tagline: "Spotless homes across Nairobi",
      logo_url: "/logo.png",
      rating_average: 4.8,
      rating_count: 134,
      min_price: 3500,
      categories: ["cleaning", "repairs"],
    });
    expect(typeof stored[0].viewedAt).toBe("number");
  });

  it("copes with a provider that has no logo, rating or price", () => {
    render(<TrackProviderView id="p2" businessName="New Provider" />);

    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    expect(stored[0]).toMatchObject({
      id: "p2",
      business_name: "New Provider",
      tagline: null,
      logo_url: null,
      rating_average: null,
      rating_count: null,
      min_price: null,
      categories: [],
    });
  });

  it("does not record the same view twice on a re-render", () => {
    // The dependency array is made of primitives for exactly this reason: taking the
    // provider object or a categories array would give it a new identity each render.
    const view = render(<TrackProviderView {...PROPS} />);
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    view.rerender(<TrackProviderView {...PROPS} />);
    view.rerender(<TrackProviderView {...PROPS} />);

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("records a second provider in front of the first", () => {
    render(<TrackProviderView {...PROPS} />);
    render(<TrackProviderView {...PROPS} id="p9" businessName="Later Pro" />);

    const stored = JSON.parse(localStorage.getItem(KEY) ?? "[]");
    expect(stored.map((p: { id: string }) => p.id)).toEqual(["p9", "p1"]);
  });
});

describe("the section can now show something", () => {
  it("a recorded view reaches useRecentlyViewed, which the home page reads", () => {
    render(<TrackProviderView {...PROPS} />);

    const { result } = renderHook(() => useRecentlyViewed());

    expect(result.current.providers.map((p) => p.id)).toEqual(["p1"]);
    expect(result.current.hasHistory).toBe(true);
  });

  it("reaches a hook that is ALREADY mounted, with no remount", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.hasHistory).toBe(false);

    act(() => {
      render(<TrackProviderView {...PROPS} />);
    });

    // The store notifies, so the section updates on the same page view rather than
    // waiting for a navigation.
    expect(result.current.providers.map((p) => p.id)).toEqual(["p1"]);
  });
});
