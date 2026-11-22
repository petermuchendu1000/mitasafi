/**
 * @jest-environment jsdom
 */

/**
 * The saved-listings store.
 *
 * Two properties matter most here, and both can fail:
 *
 *  1. SNAPSHOT STABILITY. useSyncExternalStore calls getSnapshot during render and
 *     compares with Object.is. A snapshot that returns a freshly parsed array every
 *     call makes every comparison unequal and React throws "The result of getSnapshot
 *     should be cached to avoid an infinite loop". The reference-identity assertions
 *     below are what stand between this module and that crash.
 *
 *  2. WRITE NOTIFIES. The defect this module replaces was useSavedListings.ts:59
 *     writing the key without dispatching "savedListingsChanged", so SaveButton could
 *     save a listing and leave the Navbar count stale until a reload. Four other
 *     writers did dispatch. Here the write and the notification are one call.
 */

import {
  SAVED_LISTINGS_STORAGE_KEY,
  readSavedListings,
  writeSavedListings,
  subscribeSavedListings,
  getSavedListingsServerSnapshot,
  resetSavedListingsCacheForTests,
  type SavedListing,
} from "../store";

const one: SavedListing = {
  listingId: "a",
  savedAt: "2026-01-01T00:00:00.000Z",
};
const two: SavedListing = {
  listingId: "b",
  savedAt: "2026-01-02T00:00:00.000Z",
};

describe("saved-listings store", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSavedListingsCacheForTests();
  });

  describe("snapshot stability (the useSyncExternalStore contract)", () => {
    it("returns the identical reference while storage is unchanged", () => {
      writeSavedListings([one]);
      const a = readSavedListings();
      const b = readSavedListings();
      const c = readSavedListings();
      expect(a).toBe(b);
      expect(b).toBe(c);
    });

    it("returns a different reference once storage changes", () => {
      writeSavedListings([one]);
      const before = readSavedListings();
      writeSavedListings([one, two]);
      const after = readSavedListings();

      expect(after).not.toBe(before);
      expect(after.map((s) => s.listingId)).toEqual(["a", "b"]);
    });

    it("returns a stable empty reference when nothing is stored", () => {
      expect(readSavedListings()).toBe(readSavedListings());
      expect(readSavedListings()).toHaveLength(0);
    });
  });

  describe("tolerating whatever is actually in storage", () => {
    it("treats malformed JSON as empty instead of throwing", () => {
      localStorage.setItem(SAVED_LISTINGS_STORAGE_KEY, "{not json");
      resetSavedListingsCacheForTests();
      expect(() => readSavedListings()).not.toThrow();
      expect(readSavedListings()).toHaveLength(0);
    });

    it("treats a non-array value as empty", () => {
      localStorage.setItem(SAVED_LISTINGS_STORAGE_KEY, '{"listingId":"a"}');
      resetSavedListingsCacheForTests();
      expect(readSavedListings()).toHaveLength(0);
    });

    it("reads a list written by any of the previous call sites", () => {
      // The old copies wrote a plain array of {listingId, savedAt[, ...]}.
      localStorage.setItem(
        SAVED_LISTINGS_STORAGE_KEY,
        JSON.stringify([{ listingId: "legacy", savedAt: "2026-01-01" }]),
      );
      resetSavedListingsCacheForTests();
      expect(readSavedListings().map((s) => s.listingId)).toEqual(["legacy"]);
    });
  });

  describe("writing notifies", () => {
    it("tells subscribers, which is what useSavedListings never did", () => {
      const onChange = jest.fn();
      const teardown = subscribeSavedListings(onChange);

      writeSavedListings([one]);

      expect(onChange).toHaveBeenCalledTimes(1);
      teardown();
    });

    it("a subscriber sees the new value when it re-reads", () => {
      let seen: readonly SavedListing[] = [];
      const teardown = subscribeSavedListings(() => {
        seen = readSavedListings();
      });

      writeSavedListings([one, two]);

      expect(seen.map((s) => s.listingId)).toEqual(["a", "b"]);
      teardown();
    });

    it("stops notifying once torn down", () => {
      const onChange = jest.fn();
      subscribeSavedListings(onChange)();

      writeSavedListings([one]);

      expect(onChange).not.toHaveBeenCalled();
    });
  });

  describe("subscription hygiene", () => {
    it("removes exactly the listeners it registered", () => {
      const live = new Map<string, Set<unknown>>();
      const realAdd = window.addEventListener.bind(window);
      const realRemove = window.removeEventListener.bind(window);

      window.addEventListener = ((t: string, f: never, o?: never) => {
        if (!live.has(t)) live.set(t, new Set());
        live.get(t)!.add(f);
        return realAdd(t, f, o);
      }) as typeof window.addEventListener;
      window.removeEventListener = ((t: string, f: never, o?: never) => {
        live.get(t)?.delete(f);
        return realRemove(t, f, o);
      }) as typeof window.removeEventListener;

      const total = () => [...live.values()].reduce((n, s) => n + s.size, 0);
      const before = total();

      for (let i = 0; i < 5; i += 1) subscribeSavedListings(() => {})();

      expect(total()).toBe(before);

      window.addEventListener = realAdd;
      window.removeEventListener = realRemove;
    });
  });

  it("renders as empty on the server, where there is no localStorage", () => {
    expect(getSavedListingsServerSnapshot()).toHaveLength(0);
    // Must also be reference-stable, for the same reason as getSnapshot.
    expect(getSavedListingsServerSnapshot()).toBe(
      getSavedListingsServerSnapshot(),
    );
  });
});
