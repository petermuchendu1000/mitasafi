"use client";

/**
 * The whole saved-listings list, as a subscription rather than a mount effect.
 *
 * useIsListingSaved covers the three views that need one boolean. app/saved/page.tsx
 * needs the list itself, and had its own pair of effects for it: a mount effect calling
 * setSavedIds([...readSavedListings()]) — which is what
 * react-hooks/set-state-in-effect reported — and a second effect subscribing and doing
 * the same thing again on every change.
 *
 * THE SPREAD MATTERED
 *   Both of those did `[...readSavedListings()]`. readSavedListings returns a CACHED
 *   array that is reference-stable while storage is unchanged; spreading it threw that
 *   away and produced a new reference every time. That is why the page carried a
 *   comment explaining it could not persist through writeSavedListings without risking
 *   the notification feeding the subscription feeding another setState — the loop it
 *   feared was created by the spread, not by the store.
 *
 *   This hook returns the cached reference untouched, so a notify leads to one read,
 *   one Object.is comparison, and a re-render only if the data actually changed. The
 *   value is shared with React and must not be mutated, which is what `readonly` says.
 */

import { useSyncExternalStore } from "react";
import {
  readSavedListings,
  subscribeSavedListings,
  getSavedListingsServerSnapshot,
  type SavedListing,
} from "./store";

export function useSavedListings(): readonly SavedListing[] {
  return useSyncExternalStore(
    subscribeSavedListings,
    readSavedListings,
    getSavedListingsServerSnapshot,
  );
}
