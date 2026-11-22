/**
 * @jest-environment jsdom
 */

/**
 * Saving through useSavedListings must tell the rest of the app.
 *
 * THE DEFECT
 *   The key "mitasafi_saved_listings" has five readers. Four of its writers dispatch a
 *   "savedListingsChanged" event so the others can re-read — ListingDetailClient:173,
 *   app/saved/page.tsx:258, PropertyCard:281, ListingCard:297. useSavedListings, the
 *   hook that actually OWNS the key, did not: setLocalSavedListings (useSavedListings.ts:59)
 *   called localStorage.setItem and returned.
 *
 *   SaveButton saves through this hook. So saving a listing from a card wrote to
 *   storage and told nobody, and the Navbar heart count stayed stale until a reload.
 *
 * ABLE TO FAIL (L5)
 *   The assertion is that a listener on the change event hears from a save. Against the
 *   unfixed hook it hears nothing, which is the contradicting result.
 */

import { renderHook, act } from "@testing-library/react";
import { useSavedListings } from "../useSavedListings";
import { SAVED_LISTINGS_CHANGED_EVENT } from "@/lib/saved-listings/store";

describe("useSavedListings change notification", () => {
  beforeEach(() => localStorage.clear());

  it("notifies listeners when a listing is saved", async () => {
    const onChange = jest.fn();
    window.addEventListener(SAVED_LISTINGS_CHANGED_EVENT, onChange);

    const { result } = renderHook(() => useSavedListings());

    await act(async () => {
      result.current.saveListing("listing-1");
    });

    expect(onChange).toHaveBeenCalled();
    window.removeEventListener(SAVED_LISTINGS_CHANGED_EVENT, onChange);
  });

  it("notifies listeners when a listing is unsaved", async () => {
    const { result } = renderHook(() => useSavedListings());

    await act(async () => {
      result.current.saveListing("listing-1");
    });

    const onChange = jest.fn();
    window.addEventListener(SAVED_LISTINGS_CHANGED_EVENT, onChange);

    await act(async () => {
      result.current.unsaveListing("listing-1");
    });

    expect(onChange).toHaveBeenCalled();
    window.removeEventListener(SAVED_LISTINGS_CHANGED_EVENT, onChange);
  });
});
