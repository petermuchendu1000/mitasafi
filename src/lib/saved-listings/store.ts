/**
 * The one place that knows how saved listings are stored in the browser.
 *
 * WHY THIS MODULE EXISTS
 *   The key "mitasafi_saved_listings" was declared and parsed independently in five
 *   places — Navbar.tsx, PropertyCard.tsx, ListingCard.tsx, app/saved/page.tsx and
 *   listings/[slug]/ListingDetailClient.tsx — none of which imported useSavedListings,
 *   the hook that owns it. Each copy needed its own mount effect to read client-only
 *   storage, which is why react-hooks/set-state-in-effect fired across the cluster.
 *
 *   The duplication also produced a real defect. Four of the writers dispatch a
 *   "savedListingsChanged" event so the others can re-read; useSavedListings
 *   (useSavedListings.ts:59) did not. SaveButton saves through that hook, so saving a
 *   listing from a card left the Navbar heart count stale until a reload.
 *
 *   Writing through this module cannot reproduce that: writeSavedListings notifies.
 *
 * WHY useSyncExternalStore RATHER THAN AN EFFECT
 *   localStorage plus a change event is an external store, and that is the API React
 *   provides for one. It removes the mount effect, removes the setState, and makes the
 *   subscription teardown symmetric by construction.
 *
 * THE CACHING RULE, WHICH IS NOT OPTIONAL
 *   useSyncExternalStore calls getSnapshot during render and compares the result with
 *   Object.is. Returning a freshly parsed array every call makes every comparison
 *   unequal and React throws "The result of getSnapshot should be cached to avoid an
 *   infinite loop". readSavedListings therefore caches the parsed array against the raw
 *   string it came from and returns the same reference until the raw string changes.
 *   __tests__/store.test.ts asserts that reference stability directly.
 */

export const SAVED_LISTINGS_STORAGE_KEY = "mitasafi_saved_listings";
export const SAVED_LISTINGS_CHANGED_EVENT = "savedListingsChanged";

export interface SavedListing {
  listingId: string;
  savedAt: string;
  notes?: string;
  lastKnownStatus?: string;
}

/**
 * Widest of the three shapes that were in use: app/saved/page.tsx carried
 * lastKnownStatus, useSavedListings also carried notes, PropertyCard neither. They were
 * compatible subsets, so nothing stored under the old copies is lost by reading it here.
 */

const EMPTY: readonly SavedListing[] = Object.freeze([]);

/** The raw string the cache was built from. `undefined` means "never read". */
let cachedRaw: string | null | undefined;
let cachedParsed: readonly SavedListing[] = EMPTY;

/**
 * Current saved listings. Returns the SAME array reference while storage is unchanged,
 * which is what makes it safe as a useSyncExternalStore snapshot.
 */
export function readSavedListings(): readonly SavedListing[] {
  if (typeof window === "undefined") return EMPTY;

  let raw: string | null;
  try {
    raw = localStorage.getItem(SAVED_LISTINGS_STORAGE_KEY);
  } catch {
    // Private mode, disabled storage, quota errors — treat as empty rather than throw.
    return EMPTY;
  }

  if (raw === cachedRaw) return cachedParsed;

  cachedRaw = raw;
  if (!raw) {
    cachedParsed = EMPTY;
    return cachedParsed;
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    cachedParsed = Array.isArray(parsed)
      ? (parsed as SavedListing[])
      : // Someone stored a non-array under our key. Prefer an empty list to a crash.
        EMPTY;
  } catch {
    cachedParsed = EMPTY;
  }
  return cachedParsed;
}

/** Tell every subscriber in this tab that the list changed. */
export function notifySavedListingsChanged(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(SAVED_LISTINGS_CHANGED_EVENT));
}

/**
 * Persist and notify. The notification is not optional — omitting it is the defect this
 * module exists to make impossible.
 */
export function writeSavedListings(listings: readonly SavedListing[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(SAVED_LISTINGS_STORAGE_KEY, JSON.stringify(listings));
  } catch (error) {
    console.error("Failed to save listings to local storage:", error);
    return;
  }
  // Drop the cache so the next read reflects what was just written.
  cachedRaw = undefined;
  notifySavedListingsChanged();
}

/**
 * Subscribe to changes, from this tab (the custom event) and from others (the storage
 * event). The returned teardown removes exactly what was added — the Navbar leak came
 * from registering an anonymous handler and removing a different reference.
 */
export function subscribeSavedListings(onChange: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const onStorage = (e: StorageEvent) => {
    if (e.key === SAVED_LISTINGS_STORAGE_KEY) {
      cachedRaw = undefined; // another tab wrote; our cache is stale
      onChange();
    }
  };

  window.addEventListener(SAVED_LISTINGS_CHANGED_EVENT, onChange);
  window.addEventListener("storage", onStorage);

  return () => {
    window.removeEventListener(SAVED_LISTINGS_CHANGED_EVENT, onChange);
    window.removeEventListener("storage", onStorage);
  };
}

/** There is no localStorage on the server; render as if nothing is saved. */
export function getSavedListingsServerSnapshot(): readonly SavedListing[] {
  return EMPTY;
}

/** Test seam: forget the parsed cache. Not needed in application code. */
export function resetSavedListingsCacheForTests(): void {
  cachedRaw = undefined;
  cachedParsed = EMPTY;
}
