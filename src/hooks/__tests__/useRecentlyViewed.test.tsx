/**
 * @jest-environment jsdom
 */

/**
 * Recently-viewed providers are read from a store, not loaded into state by a mount
 * effect.
 *
 * A NOTE ON WHAT THIS FEATURE DOES
 *   Nothing in the repository calls addProvider, addService, trackProviderView or
 *   trackServiceView, and no file other than the hook's own mentions either storage
 *   key. So no recently-viewed data is ever written, and RecentlyViewedSection —
 *   rendered on the home page — can never show anything. These tests exercise the hook
 *   against data placed in storage directly, which is what a caller would do, so they
 *   are ready for the writer the feature is missing. Supplying that writer is a product
 *   decision and is reported, not quietly added here.
 */

import { renderHook, act } from "@testing-library/react";
import { useRecentlyViewed, trackProviderView } from "../useRecentlyViewed";

const PROVIDERS_KEY = "mitasafi_recently_viewed_providers";
const DAY = 86_400_000;

function storedProvider(id: string, viewedAt: number) {
  return {
    id,
    business_name: `Biz ${id}`,
    tagline: null,
    logo_url: null,
    rating_average: 4,
    rating_count: 1,
    min_price: 100,
    categories: [],
    viewedAt,
  };
}

beforeEach(() => {
  localStorage.clear();
});

describe("reading", () => {
  it("has stored providers on the first render, with no second commit", () => {
    localStorage.setItem(
      PROVIDERS_KEY,
      JSON.stringify([storedProvider("a", Date.now())]),
    );

    let renders = 0;
    const { result } = renderHook(() => {
      renders += 1;
      return useRecentlyViewed();
    });

    // The mount effect cost an extra render before anything could be shown.
    expect(renders).toBe(1);
    expect(result.current.providers).toHaveLength(1);
    expect(result.current.hasHistory).toBe(true);
  });

  it("hides entries older than thirty days", () => {
    localStorage.setItem(
      PROVIDERS_KEY,
      JSON.stringify([
        storedProvider("fresh", Date.now() - DAY),
        storedProvider("stale", Date.now() - 31 * DAY),
      ]),
    );

    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.providers.map((p) => p.id)).toEqual(["fresh"]);
  });

  it("prunes expired entries out of storage, once", () => {
    localStorage.setItem(
      PROVIDERS_KEY,
      JSON.stringify([
        storedProvider("fresh", Date.now() - DAY),
        storedProvider("stale", Date.now() - 31 * DAY),
      ]),
    );

    renderHook(() => useRecentlyViewed());

    expect(
      JSON.parse(localStorage.getItem(PROVIDERS_KEY) ?? "[]"),
    ).toHaveLength(1);
  });

  it("leaves storage untouched when there is nothing to prune", () => {
    const fresh = [storedProvider("a", Date.now())];
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(fresh));
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    renderHook(() => useRecentlyViewed());

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("drops malformed entries instead of throwing", () => {
    localStorage.setItem(
      PROVIDERS_KEY,
      JSON.stringify([
        storedProvider("a", Date.now()),
        { id: "b" },
        { business_name: "no id", viewedAt: Date.now() },
        null,
        7,
      ]),
    );

    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.providers.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("writing", () => {
  it("addProvider puts the newest first and persists", () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      result.current.addProvider({
        id: "a",
        business_name: "A",
        tagline: null,
        logo_url: null,
        rating_average: null,
        rating_count: null,
        min_price: null,
        categories: [],
      });
    });
    act(() => {
      result.current.addProvider({
        id: "b",
        business_name: "B",
        tagline: null,
        logo_url: null,
        rating_average: null,
        rating_count: null,
        min_price: null,
        categories: [],
      });
    });

    expect(result.current.providers.map((p) => p.id)).toEqual(["b", "a"]);
    expect(
      JSON.parse(localStorage.getItem(PROVIDERS_KEY) ?? "[]").map(
        (p: { id: string }) => p.id,
      ),
    ).toEqual(["b", "a"]);
  });

  it("caps the list at twelve", () => {
    localStorage.setItem(
      PROVIDERS_KEY,
      JSON.stringify(
        Array.from({ length: 12 }, (_, i) =>
          storedProvider(`p${i}`, Date.now() - i),
        ),
      ),
    );
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      result.current.addProvider({
        id: "new",
        business_name: "New",
        tagline: null,
        logo_url: null,
        rating_average: null,
        rating_count: null,
        min_price: null,
        categories: [],
      });
    });

    expect(result.current.providers).toHaveLength(12);
    expect(result.current.providers[0].id).toBe("new");
  });

  it("re-viewing a provider moves it to the front without duplicating it", () => {
    localStorage.setItem(
      PROVIDERS_KEY,
      JSON.stringify([
        storedProvider("a", Date.now() - 2),
        storedProvider("b", Date.now() - 1),
      ]),
    );
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      result.current.addProvider({
        id: "a",
        business_name: "Biz a",
        tagline: null,
        logo_url: null,
        rating_average: null,
        rating_count: null,
        min_price: null,
        categories: [],
      });
    });

    expect(result.current.providers.map((p) => p.id)).toEqual(["a", "b"]);
  });

  it("removeProvider is idempotent and silent when the id is absent", () => {
    localStorage.setItem(
      PROVIDERS_KEY,
      JSON.stringify([storedProvider("a", Date.now())]),
    );
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      result.current.removeProvider("a");
    });
    expect(result.current.providers).toHaveLength(0);

    const setItem = jest.spyOn(Storage.prototype, "setItem");
    act(() => {
      result.current.removeProvider("a");
    });
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("clearAll removes the key", () => {
    localStorage.setItem(
      PROVIDERS_KEY,
      JSON.stringify([storedProvider("a", Date.now())]),
    );
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      result.current.clearAll();
    });

    expect(localStorage.getItem(PROVIDERS_KEY)).toBeNull();
    expect(result.current.hasHistory).toBe(false);
  });
});

describe("the standalone trackers reach a mounted hook", () => {
  it("trackProviderView updates a hook that is already rendered", () => {
    const { result } = renderHook(() => useRecentlyViewed());
    expect(result.current.providers).toHaveLength(0);

    act(() => {
      trackProviderView({
        id: "from-detail-page",
        business_name: "Detail",
        tagline: null,
        logo_url: null,
        rating_average: null,
        rating_count: null,
        min_price: null,
        categories: [],
      });
    });

    // These wrote localStorage directly and notified nobody, so the home page's list
    // would not have changed until a remount.
    expect(result.current.providers.map((p) => p.id)).toEqual([
      "from-detail-page",
    ]);
  });
});

describe("another tab", () => {
  it("a view recorded there shows here", () => {
    const { result } = renderHook(() => useRecentlyViewed());

    act(() => {
      localStorage.setItem(
        PROVIDERS_KEY,
        JSON.stringify([storedProvider("other-tab", Date.now())]),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: PROVIDERS_KEY }));
    });

    expect(result.current.providers.map((p) => p.id)).toEqual(["other-tab"]);
  });
});
