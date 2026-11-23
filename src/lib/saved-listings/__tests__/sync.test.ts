/**
 * @jest-environment jsdom
 */

/**
 * The one local/server merge policy.
 *
 * WHAT WENT WRONG BEFORE
 *   Two reconcilers disagreed about what a local entry missing from the server means.
 *   ListingCard assumed "deleted elsewhere" and removed it, uploading nothing — so
 *   saving while signed out and then signing in destroyed every save. useSavedListings
 *   assumed "not yet uploaded" and kept it — so unsaving on one device was undone by
 *   another. Only the destructive one ever ran, because its counterpart's sole consumer
 *   is rendered nowhere.
 *
 *   Neither could be right, because both answers are reachable from the same two lists.
 *   syncedAt records whether an entry was ever on the server, which is the fact that
 *   distinguishes them. The first two tests below are those two cases, and they must
 *   come out opposite ways — that is the whole point of the field.
 */

import {
  readSavedListings,
  writeSavedListings,
  resetSavedListingsCacheForTests,
  subscribeSavedListings,
  type SavedListing,
} from "../store";
import {
  reconcileSavedListingsWithServer,
  resetSavedListingsSyncForTests,
  invalidateSavedListingsSync,
} from "../sync";

type ServerRow = {
  listing_id: string;
  created_at: string;
  notes?: string | null;
};

interface FetchPlan {
  getStatus?: number;
  rows?: ServerRow[];
  postStatus?: number | ((listingId: string) => number);
  getThrows?: boolean;
}

function mockFetch(plan: FetchPlan) {
  const fetchMock = jest.fn(
    (_url: string, init?: { method?: string; body?: string }) => {
      if (init?.method === "POST") {
        const id = JSON.parse(init.body || "{}").listing_id as string;
        const status =
          typeof plan.postStatus === "function"
            ? plan.postStatus(id)
            : (plan.postStatus ?? 200);
        return Promise.resolve({
          ok: status >= 200 && status < 300,
          status,
          json: async () => ({}),
        });
      }
      if (plan.getThrows) return Promise.reject(new Error("offline"));
      const status = plan.getStatus ?? 200;
      return Promise.resolve({
        ok: status >= 200 && status < 300,
        status,
        json: async () => ({ saved_listings: plan.rows ?? [] }),
      });
    },
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

const postedIds = (m: ReturnType<typeof mockFetch>) =>
  m.mock.calls
    .filter(
      ([, init]) =>
        (init as { method?: string } | undefined)?.method === "POST",
    )
    .map(
      ([, init]) =>
        JSON.parse((init as { body: string }).body).listing_id as string,
    );

const getCount = (m: ReturnType<typeof mockFetch>) =>
  m.mock.calls.filter(
    ([, init]) => (init as { method?: string } | undefined)?.method !== "POST",
  ).length;

const ids = () =>
  readSavedListings()
    .map((s) => s.listingId)
    .sort();

const neverSynced: SavedListing = {
  listingId: "local-only",
  savedAt: "2026-01-01T00:00:00.000Z",
};
const wasSynced: SavedListing = {
  listingId: "once-on-server",
  savedAt: "2026-01-01T00:00:00.000Z",
  syncedAt: "2026-01-05T00:00:00.000Z",
};

describe("saved-listings server reconciliation", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSavedListingsCacheForTests();
    resetSavedListingsSyncForTests();
  });

  describe("the ambiguity that caused the data loss", () => {
    it("uploads and KEEPS a local entry the server has never seen", async () => {
      const f = mockFetch({ rows: [] });
      writeSavedListings([neverSynced]);

      await reconcileSavedListingsWithServer();

      expect(ids()).toEqual(["local-only"]);
      expect(postedIds(f)).toEqual(["local-only"]);
      // It is now on the server, and must not be re-uploaded next time.
      expect(readSavedListings()[0].syncedAt).toEqual(expect.any(String));
    });

    it("REMOVES a local entry that was on the server and is not any more", async () => {
      const f = mockFetch({ rows: [] });
      writeSavedListings([wasSynced]);

      await reconcileSavedListingsWithServer();

      expect(ids()).toEqual([]);
      // Nothing is uploaded: this is an unsave made on another device, not a new save.
      expect(postedIds(f)).toEqual([]);
    });

    it("handles both in one pass, in opposite directions", async () => {
      const f = mockFetch({ rows: [] });
      writeSavedListings([neverSynced, wasSynced]);

      await reconcileSavedListingsWithServer();

      expect(ids()).toEqual(["local-only"]);
      expect(postedIds(f)).toEqual(["local-only"]);
    });
  });

  describe("bringing the server's state down", () => {
    it("adds entries saved on another device", async () => {
      mockFetch({
        rows: [
          {
            listing_id: "from-other-device",
            created_at: "2026-02-01T00:00:00.000Z",
            notes: "n",
          },
        ],
      });

      await reconcileSavedListingsWithServer();

      const stored = readSavedListings();
      expect(stored.map((s) => s.listingId)).toEqual(["from-other-device"]);
      expect(stored[0].savedAt).toBe("2026-02-01T00:00:00.000Z");
      expect(stored[0].notes).toBe("n");
      expect(stored[0].syncedAt).toEqual(expect.any(String));
    });

    it("keeps an entry both sides already agree on, and uploads nothing", async () => {
      const f = mockFetch({
        rows: [
          { listing_id: "local-only", created_at: "2026-01-01T00:00:00.000Z" },
        ],
      });
      writeSavedListings([neverSynced]);

      await reconcileSavedListingsWithServer();

      expect(ids()).toEqual(["local-only"]);
      expect(postedIds(f)).toEqual([]);
    });
  });

  describe("refusing to act without server truth", () => {
    it("leaves storage untouched on 401, the ordinary signed-out case", async () => {
      const f = mockFetch({ getStatus: 401 });
      writeSavedListings([neverSynced, wasSynced]);

      await reconcileSavedListingsWithServer();

      expect(ids()).toEqual(["local-only", "once-on-server"]);
      expect(postedIds(f)).toEqual([]);
    });

    it("leaves storage untouched on a server error", async () => {
      mockFetch({ getStatus: 500 });
      writeSavedListings([wasSynced]);

      await reconcileSavedListingsWithServer();

      expect(ids()).toEqual(["once-on-server"]);
    });

    it("leaves storage untouched when the request throws", async () => {
      mockFetch({ getThrows: true });
      writeSavedListings([wasSynced]);

      await reconcileSavedListingsWithServer();

      expect(ids()).toEqual(["once-on-server"]);
    });

    it("retries after a failure rather than treating it as done", async () => {
      mockFetch({ getStatus: 500 });
      await reconcileSavedListingsWithServer();

      const f = mockFetch({ rows: [] });
      await reconcileSavedListingsWithServer();

      expect(getCount(f)).toBe(1);
    });
  });

  describe("when an upload does not succeed", () => {
    it("keeps the entry unsynced on a transient failure, and retries next time", async () => {
      mockFetch({ rows: [], postStatus: 500 });
      writeSavedListings([neverSynced]);

      await reconcileSavedListingsWithServer();

      expect(ids()).toEqual(["local-only"]);
      expect(readSavedListings()[0].syncedAt).toBeUndefined();

      invalidateSavedListingsSync();
      const f = mockFetch({ rows: [], postStatus: 200 });
      await reconcileSavedListingsWithServer();

      expect(postedIds(f)).toEqual(["local-only"]);
      expect(readSavedListings()[0].syncedAt).toEqual(expect.any(String));
    });

    it("drops an entry whose listing the server says no longer exists", async () => {
      mockFetch({ rows: [], postStatus: 404 });
      writeSavedListings([neverSynced]);

      await reconcileSavedListingsWithServer();

      // Retrying a 404 every 30 seconds would never succeed.
      expect(ids()).toEqual([]);
    });
  });

  describe("not making work for the rest of the app", () => {
    it("does not notify when the reconciliation changes nothing", async () => {
      mockFetch({
        rows: [
          {
            listing_id: "once-on-server",
            created_at: "2026-01-01T00:00:00.000Z",
          },
        ],
      });
      writeSavedListings([wasSynced]);

      const onChange = jest.fn();
      const teardown = subscribeSavedListings(onChange);
      await reconcileSavedListingsWithServer();
      teardown();

      // Every card on the page re-renders on a notification; a no-op sync must be silent.
      expect(onChange).not.toHaveBeenCalled();
    });

    it("skips the request entirely within the TTL", async () => {
      const f = mockFetch({ rows: [] });

      await reconcileSavedListingsWithServer();
      await reconcileSavedListingsWithServer();
      await reconcileSavedListingsWithServer();

      expect(getCount(f)).toBe(1);
    });

    it("issues one request for concurrent callers, not one each", async () => {
      const f = mockFetch({ rows: [] });

      await Promise.all([
        reconcileSavedListingsWithServer(),
        reconcileSavedListingsWithServer(),
        reconcileSavedListingsWithServer(),
      ]);

      expect(getCount(f)).toBe(1);
    });
  });
});
