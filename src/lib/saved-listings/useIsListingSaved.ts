"use client";

/**
 * "Is this one listing saved?", as a subscription rather than a mount effect.
 *
 * WHY A SHARED HOOK
 *   PropertyCard, ListingCard and listings/[slug]/ListingDetailClient each need exactly
 *   this one boolean, and each had its own copy: a mount effect that read localStorage and
 *   seeded state (which is what react-hooks/set-state-in-effect reported), with no
 *   subscription at all. The heart was therefore a snapshot taken at mount — save the same
 *   property anywhere else and the other views kept showing an empty heart until a reload.
 *
 * WHY THE SNAPSHOT IS A BOOLEAN AND NOT THE LIST
 *   useSyncExternalStore compares snapshots with Object.is during render. An array would
 *   have to be the cached reference from the store or React throws "The result of
 *   getSnapshot should be cached to avoid an infinite loop". A boolean is a primitive, so
 *   equality holds by value and the caching question cannot be got wrong here.
 *
 *   getSnapshot is still memoised on listingId: React re-reads whenever that function's
 *   identity changes, and there is no reason to make it do so on every render.
 */

import { useCallback, useSyncExternalStore } from "react";
import { isListingSaved, subscribeSavedListings } from "./store";

/** There is no localStorage on the server; render as if nothing is saved. */
const serverSnapshot = () => false;

export function useIsListingSaved(listingId: string): boolean {
  const getSnapshot = useCallback(() => isListingSaved(listingId), [listingId]);
  return useSyncExternalStore(
    subscribeSavedListings,
    getSnapshot,
    serverSnapshot,
  );
}
