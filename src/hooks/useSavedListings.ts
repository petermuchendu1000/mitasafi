/**
 * Saved Listings Hook
 *
 * Manages saved/favorited listings with:
 * - Local storage for immediate, friction-free saves (works for everyone)
 * - Server sync for logged-in users (cross-device)
 * - Automatic merge when user logs in
 *
 * Philosophy: NEVER block an action. Save works instantly, sync is a bonus.
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  readSavedListings,
  writeSavedListings,
  type SavedListing,
} from "@/lib/saved-listings/store";
import { reconcileSavedListingsWithServer } from "@/lib/saved-listings/sync";

const SYNC_DEBOUNCE_MS = 2000;

// The shape and the storage key now live in @/lib/saved-listings/store, which is the
// one module that knows how saved listings are persisted. Re-exported so existing
// importers of this type keep working.
export type { SavedListing };

interface UseSavedListingsReturn {
  savedListings: SavedListing[];
  isSaved: (listingId: string) => boolean;
  toggleSave: (listingId: string, status?: string) => void;
  saveListing: (listingId: string, status?: string) => void;
  unsaveListing: (listingId: string) => void;
  isLoading: boolean;
  isSynced: boolean;
}

// Local copies of these used to live here. setLocalSavedListings wrote to storage and
// returned WITHOUT dispatching "savedListingsChanged", while the four other writers of
// this key all dispatched it — so saving through SaveButton (which uses this hook) left
// the Navbar count stale until a reload. writeSavedListings notifies as part of the
// write, so that cannot recur. Reproduced in __tests__/useSavedListings.notify.test.ts.
const getLocalSavedListings = (): SavedListing[] => [...readSavedListings()];
const setLocalSavedListings = writeSavedListings;

export function useSavedListings(): UseSavedListingsReturn {
  const [savedListings, setSavedListings] = useState<SavedListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSynced, setIsSynced] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const supabase = useMemo(() => createClient(), []);

  // Load from local storage on mount
  useEffect(() => {
    const local = getLocalSavedListings();
    setSavedListings(local);
    setIsLoading(false);
  }, []);

  /**
   * Reconcile with the server.
   *
   * This used to run its own merge, querying Supabase directly and keeping
   * `local ∪ server` while uploading the difference — the exact opposite of the policy
   * ListingCard ran against /api/saved-listings, which kept `local ∩ server` and
   * uploaded nothing. Two policies for one key, and whichever ran last won. In practice
   * only ListingCard's ever ran, because SaveButton is this hook's sole consumer and is
   * rendered nowhere, so the destructive one had no counterweight.
   *
   * Both are now @/lib/saved-listings/sync, which can tell a never-uploaded save apart
   * from one deleted on another device. Neither policy could.
   */
  const syncWithServer = useCallback(async () => {
    await reconcileSavedListingsWithServer();
    setSavedListings([...readSavedListings()]);
    setIsSynced(true);
  }, []);

  // Check auth status and sync if logged in
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout;

    const checkAuthAndSync = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        setUserId(user.id);

        // Debounce sync to avoid rapid calls during auth state changes
        syncTimeout = setTimeout(() => {
          syncWithServer();
        }, SYNC_DEBOUNCE_MS);
      } else {
        setUserId(null);
        setIsSynced(false);
      }
    };

    checkAuthAndSync();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        syncTimeout = setTimeout(() => {
          syncWithServer();
        }, SYNC_DEBOUNCE_MS);
      } else if (event === "SIGNED_OUT") {
        setUserId(null);
        setIsSynced(false);
      }
    });

    return () => {
      subscription.unsubscribe();
      if (syncTimeout) clearTimeout(syncTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Check if a listing is saved
  const isSaved = useCallback(
    (listingId: string): boolean => {
      return savedListings.some((s) => s.listingId === listingId);
    },
    [savedListings],
  );

  // Save a listing
  const saveListing = useCallback(
    async (listingId: string, status?: string) => {
      // Check if already saved
      if (savedListings.some((s) => s.listingId === listingId)) {
        return;
      }

      const newSave: SavedListing = {
        listingId,
        savedAt: new Date().toISOString(),
        lastKnownStatus: status || "active",
      };

      // Update state immediately (optimistic)
      const updated = [...savedListings, newSave];
      setSavedListings(updated);
      setLocalSavedListings(updated);

      // Sync to server if logged in
      if (userId) {
        try {
          // Note: Type assertion needed until saved_listings table is in generated types
          const { error } = await supabase
            .from("saved_listings" as never)
            .insert({
              user_id: userId,
              listing_id: listingId,
            } as never);

          if (error && (error as { code?: string }).code !== "23505") {
            // Ignore duplicate key error
            console.error("Failed to save to server:", error);
          }
        } catch (error) {
          console.error("Failed to save to server:", error);
        }
      }
    },
    [savedListings, userId, supabase],
  );

  // Unsave a listing
  const unsaveListing = useCallback(
    async (listingId: string) => {
      // Update state immediately (optimistic)
      const updated = savedListings.filter((s) => s.listingId !== listingId);
      setSavedListings(updated);
      setLocalSavedListings(updated);

      // Sync to server if logged in
      if (userId) {
        try {
          // Note: Type assertion needed until saved_listings table is in generated types
          const { error } = await supabase
            .from("saved_listings" as never)
            .delete()
            .eq("user_id", userId)
            .eq("listing_id", listingId);

          if (error) {
            console.error("Failed to delete from server:", error);
          }
        } catch (error) {
          console.error("Failed to delete from server:", error);
        }
      }
    },
    [savedListings, userId, supabase],
  );

  // Toggle save state
  const toggleSave = useCallback(
    (listingId: string, status?: string) => {
      if (isSaved(listingId)) {
        unsaveListing(listingId);
      } else {
        saveListing(listingId, status);
      }
    },
    [isSaved, saveListing, unsaveListing],
  );

  return {
    savedListings,
    isSaved,
    toggleSave,
    saveListing,
    unsaveListing,
    isLoading,
    isSynced,
  };
}

/**
 * Get saved listing count from local storage (for SSR-safe usage)
 */
export function getSavedListingCount(): number {
  return getLocalSavedListings().length;
}
