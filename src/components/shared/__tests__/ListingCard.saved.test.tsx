/**
 * @jest-environment jsdom
 */

/**
 * ListingCard's saved state.
 *
 * WHY THIS EXISTS
 *   ListingCard was the fifth independent owner of "mitasafi_saved_listings". Its mount
 *   effect read the key and seeded React state (ListingCard.tsx:256), which is what
 *   react-hooks/set-state-in-effect reported.
 *
 *   Reading the file in full turned up three things the rule does not report:
 *
 *   D1  NO SUBSCRIPTION. Like PropertyCard, this card registers no saved-listings
 *       listener, so its heart is a snapshot taken at mount. The same property saved from
 *       anywhere else leaves this card showing an empty heart.
 *
 *   D2  THE DATABASE SYNC WRITES WITHOUT NOTIFYING. fetchSavedListingsOnce() rewrites the
 *       whole key from the server response (ListingCard.tsx:105) and never dispatches
 *       "savedListingsChanged". Four of the five writers of this key dispatched it; this
 *       path did not. So a logged-in user's server state can change what is stored and
 *       leave the Navbar count reading the old number.
 *
 *   D3  THE ERROR ROLLBACK IS A NO-OP. handleSave computes
 *       `const newSavedState = !isSaved`, calls setIsSaved(newSavedState), and on a thrown
 *       request calls setIsSaved(!isSaved) (ListingCard.tsx:325). `isSaved` in that
 *       closure is the PRE-CLICK value, so `!isSaved` IS newSavedState: the rollback
 *       re-asserts the value it is meant to undo. localStorage is never rolled back at all,
 *       so a failed write leaves the listing looking saved everywhere.
 *
 * THE DISCRIMINATING OBSERVATIONS, STATED BEFORE THE RUN
 *   Each of the four tests under "defects" can return either answer. Against the
 *   unmodified component I expect all four to FAIL. D3's test is the one I am least sure
 *   of: it asserts on STORAGE rather than on the button, because the no-op rollback leaves
 *   the button in the same place either way — if it passes pre-change, my reading of the
 *   closure is wrong.
 *
 * WHY Date.now IS MOCKED
 *   fetchSavedListingsOnce records in module scope when it last reconciled storage, and
 *   skips the request for 30 seconds afterwards. Module state outlives a test, so without
 *   an advancing clock a later test would silently skip the sync and assert nothing.
 */

import { render, screen, act, fireEvent } from "@testing-library/react";
import { ListingCard } from "../ListingCard";
import {
  writeSavedListings,
  readSavedListings,
  subscribeSavedListings,
  resetSavedListingsCacheForTests,
} from "@/lib/saved-listings/store";
import type { ListingCardData } from "../listing-types";

const SAVE = "Save property";
const UNSAVE = "Remove from saved";

const listing: ListingCardData = {
  id: "listing-under-test",
  title: "2 Bed in Kilimani",
  property_type: "apartment",
  area: "Kilimani",
  city: "Nairobi",
  rent_amount: 65_000,
  currency: "KES",
  status: "active",
  is_verified: true,
  available_now: true,
  bedrooms: 2,
  bathrooms: 1,
  size_sqft: 900,
  listing_category: "residential",
  commercial_type: null,
  size_sqm: null,
  workstation_capacity: null,
  building_grade: null,
  seating_capacity: null,
  frontage_width_m: null,
  clear_height_m: null,
  loading_docks: null,
  parking_spaces_count: null,
  room_count: null,
  plot_size_acres: null,
  // null keeps next/image out of the tree; the component renders its fallback icon.
  cover_photo: null,
  views_count: 0,
  inquiries_count: 0,
  created_at: "2026-01-01T00:00:00.000Z",
  published_at: "2026-01-01T00:00:00.000Z",
};

const other: ListingCardData = { ...listing, id: "some-other-listing" };

type SavedRow = { listing_id: string; created_at: string };

/**
 * A fetch mock that tells the two call sites apart: fetchSavedListingsOnce() issues a bare
 * GET, handleSave issues POST/DELETE with an init object.
 */
function mockFetch(opts: {
  serverSaved?: SavedRow[];
  getOk?: boolean;
  writeFails?: boolean;
}) {
  const fetchMock = jest.fn(
    (_url: string, init?: { method?: string }): Promise<unknown> => {
      const isWrite = init?.method === "POST" || init?.method === "DELETE";
      if (isWrite) {
        if (opts.writeFails) return Promise.reject(new Error("network down"));
        return Promise.resolve({
          ok: true,
          status: 200,
          json: async () => ({}),
        });
      }
      return Promise.resolve({
        ok: opts.getOk ?? true,
        status: opts.getOk === false ? 401 : 200,
        json: async () => ({ saved_listings: opts.serverSaved ?? [] }),
      });
    },
  );
  global.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

// Module-scope cache in ListingCard.tsx lives 30s; keep stepping past that window.
let clock = 1_700_000_000_000;

describe("ListingCard saved state", () => {
  let consoleError: jest.SpyInstance;

  beforeEach(() => {
    localStorage.clear();
    resetSavedListingsCacheForTests();
    clock += 120_000;
    jest.spyOn(Date, "now").mockImplementation(() => clock);
    consoleError = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe("defects this migration is meant to fix", () => {
    it("D1 reflects a save made elsewhere", async () => {
      mockFetch({ getOk: false });
      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });
      expect(screen.getByLabelText(SAVE)).toBeInTheDocument();

      act(() => {
        writeSavedListings([
          { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
        ]);
      });

      expect(screen.getByLabelText(UNSAVE)).toBeInTheDocument();
    });

    it("D1 reflects an unsave made elsewhere", async () => {
      mockFetch({ getOk: false });
      writeSavedListings([
        { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
      ]);
      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });
      expect(screen.getByLabelText(UNSAVE)).toBeInTheDocument();

      act(() => {
        writeSavedListings([]);
      });

      expect(screen.getByLabelText(SAVE)).toBeInTheDocument();
    });

    /**
     * Added after the browser run on the listing detail page, which had the same
     * read-push-write against a stale isSaved as this card did. There, clicking the
     * heart after a save made elsewhere appended a SECOND entry for the same id and the
     * Navbar badge read 2. None of the other tests here clicked after an external save,
     * so none of them would have caught it.
     */
    it("D1 does not append a duplicate when clicked after a save made elsewhere", async () => {
      mockFetch({ getOk: false });
      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });

      act(() => {
        writeSavedListings([
          { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
        ]);
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText(UNSAVE));
      });

      expect(readSavedListings().map((s) => s.listingId)).toEqual([]);
    });

    it("D2 the database sync notifies other components", async () => {
      mockFetch({
        serverSaved: [
          { listing_id: listing.id, created_at: "2026-01-03T00:00:00.000Z" },
        ],
      });
      const onChange = jest.fn();
      const teardown = subscribeSavedListings(onChange);

      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });

      // The sync changed what is stored, so every reader of the key must be told.
      expect(readSavedListings().map((s) => s.listingId)).toEqual([listing.id]);
      expect(onChange).toHaveBeenCalled();
      teardown();
    });

    it("D3 rolls storage back when the server write throws", async () => {
      mockFetch({ getOk: false, writeFails: true });
      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });

      await act(async () => {
        fireEvent.click(screen.getByLabelText(SAVE));
      });

      expect(readSavedListings().map((s) => s.listingId)).toEqual([]);
      expect(consoleError).toHaveBeenCalled();
    });
  });

  describe("behaviour that already worked (regression guards)", () => {
    it("starts saved when the listing is already in storage", async () => {
      mockFetch({ getOk: false });
      writeSavedListings([
        { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
      ]);
      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });
      expect(screen.getByLabelText(UNSAVE)).toBeInTheDocument();
    });

    it("persists the save with the status it had at save time", async () => {
      mockFetch({ getOk: false });
      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText(SAVE));
      });

      const stored = readSavedListings();
      expect(stored.map((s) => s.listingId)).toEqual([listing.id]);
      expect(stored[0].lastKnownStatus).toBe("active");
    });

    it("leaves other listings' saves alone when unsaving", async () => {
      mockFetch({ getOk: false });
      writeSavedListings([
        { listingId: other.id, savedAt: "2026-01-01T00:00:00.000Z" },
        { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
      ]);
      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText(UNSAVE));
      });

      expect(readSavedListings().map((s) => s.listingId)).toEqual([other.id]);
    });

    it("renders no save button for the landlord variant", async () => {
      mockFetch({ getOk: false });
      await act(async () => {
        render(<ListingCard listing={listing} variant="landlord" />);
      });
      expect(screen.queryByLabelText(SAVE)).toBeNull();
      expect(screen.queryByLabelText(UNSAVE)).toBeNull();
    });

    it("does not treat a 401 from the write as an error worth logging", async () => {
      const fetchMock = jest.fn(
        (_url: string, init?: { method?: string }): Promise<unknown> => {
          const isWrite = init?.method === "POST" || init?.method === "DELETE";
          return Promise.resolve({
            ok: false,
            status: 401,
            json: async () => (isWrite ? { error: "unauthorized" } : {}),
          });
        },
      );
      global.fetch = fetchMock as unknown as typeof fetch;

      await act(async () => {
        render(<ListingCard listing={listing} variant="public" />);
      });
      await act(async () => {
        fireEvent.click(screen.getByLabelText(SAVE));
      });

      // Anonymous users are expected: the save stays local and nothing is logged.
      expect(readSavedListings().map((s) => s.listingId)).toEqual([listing.id]);
      expect(consoleError).not.toHaveBeenCalled();
    });
  });

  describe("subscription hygiene", () => {
    it("leaves no window listener behind after unmount", async () => {
      mockFetch({ getOk: false });
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

      for (let i = 0; i < 3; i += 1) {
        let view: ReturnType<typeof render> | undefined;
        await act(async () => {
          view = render(<ListingCard listing={listing} variant="public" />);
        });
        view!.unmount();
      }

      const after = total();

      window.addEventListener = realAdd;
      window.removeEventListener = realRemove;

      expect(after).toBe(before);
    });
  });
});
