/**
 * @jest-environment jsdom
 */

/**
 * PropertyCard's saved state.
 *
 * WHY THIS EXISTS
 *   PropertyCard was one of five independent owners of the "mitasafi_saved_listings" key.
 *   It read the key in a mount effect and seeded React state from it, which is what
 *   react-hooks/set-state-in-effect reported at PropertyCard.tsx:237.
 *
 *   Reading the file in full showed something the rule does not report: the card registers
 *   NO listener for saved-listings changes. Its only listener is the share-menu
 *   click-outside handler. So the heart is a snapshot taken at mount and never refreshed —
 *   save the same listing from its detail page, from the saved page, or from the
 *   ListingCard that renders the same property elsewhere on the screen, and this card goes
 *   on showing an empty heart until the route remounts.
 *
 * THE DISCRIMINATING OBSERVATION, STATED BEFORE THE RUN
 *   "reflects a save made elsewhere" and "reflects an unsave made elsewhere" write through
 *   the store and then re-query the button's accessible name. Either can return either
 *   answer. Against the unmodified component I expect both to FAIL, because nothing
 *   subscribes; if they pass pre-change then my reading of the file is wrong and the
 *   migration is cosmetic.
 *
 *   The remaining tests are regression guards, not evidence. PropertyCard already wrote
 *   and dispatched correctly, so they are expected to pass in BOTH states and prove only
 *   that the migration preserved behaviour.
 */

import { render, screen, act, fireEvent } from "@testing-library/react";
import { PropertyCard } from "../PropertyCard";
import {
  writeSavedListings,
  readSavedListings,
  subscribeSavedListings,
  resetSavedListingsCacheForTests,
} from "@/lib/saved-listings/store";
import type { ListingCard } from "@/lib/listings/types";

const SAVE = "Save property";
const UNSAVE = "Remove from saved";

const listing: ListingCard = {
  id: "listing-under-test",
  title: "2 Bed in Kilimani",
  slug: "2-bed-kilimani",
  property_type: "apartment",
  area: "Kilimani",
  city: "Nairobi",
  bedrooms: 2,
  bathrooms: 1,
  rent_amount: 65_000,
  currency: "KES",
  // null keeps next/image out of the tree; the component renders its MapPin fallback.
  cover_photo: null,
  is_verified: true,
  available_now: true,
  published_at: "2026-01-01T00:00:00.000Z",
  status: "active",
};

const other: ListingCard = { ...listing, id: "some-other-listing" };

describe("PropertyCard saved state", () => {
  beforeEach(() => {
    localStorage.clear();
    resetSavedListingsCacheForTests();
  });

  describe("reacting to changes made elsewhere (the defect)", () => {
    it("reflects a save made elsewhere", () => {
      render(<PropertyCard listing={listing} />);
      expect(screen.getByLabelText(SAVE)).toBeInTheDocument();

      act(() => {
        writeSavedListings([
          { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
        ]);
      });

      expect(screen.getByLabelText(UNSAVE)).toBeInTheDocument();
    });

    it("reflects an unsave made elsewhere", () => {
      writeSavedListings([
        { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
      ]);
      render(<PropertyCard listing={listing} />);
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
     * Navbar badge read 2. The tests above would not have caught it: none of them
     * clicked after an external save. This one does.
     */
    it("does not append a duplicate when clicked after a save made elsewhere", () => {
      render(<PropertyCard listing={listing} />);

      act(() => {
        writeSavedListings([
          { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
        ]);
      });

      fireEvent.click(screen.getByLabelText(UNSAVE));

      expect(readSavedListings().map((s) => s.listingId)).toEqual([]);
    });

    it("ignores a change to a different listing", () => {
      render(<PropertyCard listing={listing} />);

      act(() => {
        writeSavedListings([
          { listingId: other.id, savedAt: "2026-01-02T00:00:00.000Z" },
        ]);
      });

      expect(screen.getByLabelText(SAVE)).toBeInTheDocument();
    });
  });

  describe("behaviour that already worked (regression guards)", () => {
    it("starts saved when the listing is already in storage", () => {
      writeSavedListings([
        { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
      ]);
      render(<PropertyCard listing={listing} />);
      expect(screen.getByLabelText(UNSAVE)).toBeInTheDocument();
    });

    it("persists the save, with the status it had at save time", () => {
      render(<PropertyCard listing={listing} />);
      fireEvent.click(screen.getByLabelText(SAVE));

      const stored = readSavedListings();
      expect(stored.map((s) => s.listingId)).toEqual([listing.id]);
      expect(stored[0].lastKnownStatus).toBe("active");
      expect(stored[0].savedAt).toEqual(expect.any(String));
    });

    it("removes the save on a second click", () => {
      render(<PropertyCard listing={listing} />);
      fireEvent.click(screen.getByLabelText(SAVE));
      fireEvent.click(screen.getByLabelText(UNSAVE));

      expect(readSavedListings()).toHaveLength(0);
    });

    it("leaves other listings' saves alone when unsaving", () => {
      writeSavedListings([
        { listingId: other.id, savedAt: "2026-01-01T00:00:00.000Z" },
        { listingId: listing.id, savedAt: "2026-01-02T00:00:00.000Z" },
      ]);
      render(<PropertyCard listing={listing} />);
      fireEvent.click(screen.getByLabelText(UNSAVE));

      expect(readSavedListings().map((s) => s.listingId)).toEqual([other.id]);
    });

    it("notifies other components when it saves", () => {
      const onChange = jest.fn();
      const teardown = subscribeSavedListings(onChange);

      render(<PropertyCard listing={listing} />);
      fireEvent.click(screen.getByLabelText(SAVE));

      expect(onChange).toHaveBeenCalled();
      teardown();
    });
  });

  describe("subscription hygiene", () => {
    it("leaves no window listener behind after unmount", () => {
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
        render(<PropertyCard listing={listing} />).unmount();
      }

      const after = total();

      window.addEventListener = realAdd;
      window.removeEventListener = realRemove;

      expect(after).toBe(before);
    });
  });
});
