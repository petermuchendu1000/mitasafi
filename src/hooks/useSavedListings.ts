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

const STORAGE_KEY = "mitasafi_saved_listings";
const SYNC_DEBOUNCE_MS = 2000;

export interface SavedListing {
  listingId: string;
  savedAt: string;  // ISO date string
  notes?: string;
  lastKnownStatus?: string; // For tracking status changes
}

interface UseSavedListingsReturn {
  savedListings: SavedListing[];
  isSaved: (listingId: string) => boolean;
  toggleSave: (listingId: string, status?: string) => void;
  saveListing: (listingId: string, status?: string) => void;
  unsaveListing: (listingId: string) => void;
  isLoading: boolean;
  isSynced: boolean;
}

// Get saved listings from local storage
function getLocalSavedListings(): SavedListing[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    
    const parsed = JSON.parse(stored);
    if (!Array.isArray(parsed)) return [];
    
    return parsed;
  } catch {
    return [];
  }
}

// Save listings to local storage
function setLocalSavedListings(listings: SavedListing[]): void {
  if (typeof window === "undefined") return;
  
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(listings));
  } catch (error) {
    console.error("Failed to save to local storage:", error);
  }
}

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

  // Check auth status and sync if logged in
  useEffect(() => {
    let syncTimeout: NodeJS.Timeout;

    const checkAuthAndSync = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        // Debounce sync to avoid rapid calls during auth state changes
        syncTimeout = setTimeout(() => {
          syncWithServer(user.id);
        }, SYNC_DEBOUNCE_MS);
      } else {
        setUserId(null);
        setIsSynced(false);
      }
    };

    checkAuthAndSync();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user) {
        setUserId(session.user.id);
        syncTimeout = setTimeout(() => {
          syncWithServer(session.user.id);
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

  // Type for server response (since saved_listings table isn't in generated types yet)
  interface ServerSavedListing {
    listing_id: string;
    created_at: string;
    notes: string | null;
  }

  // Sync local saves with server
  const syncWithServer = useCallback(async (uid: string) => {
    try {
      // Get server saved listings
      // Note: Type assertion needed until saved_listings table is in generated types
      const { data: serverListings, error } = await supabase
        .from("saved_listings" as never)
        .select("listing_id, created_at, notes")
        .eq("user_id", uid) as unknown as { data: ServerSavedListing[] | null; error: Error | null };

      if (error) {
        console.error("Failed to fetch server saved listings:", error);
        return;
      }

      // Get local saves
      const localSaves = getLocalSavedListings();
      
      // Merge: union of local and server, server wins on conflict
      const serverMap = new Map<string, SavedListing>(
        (serverListings || []).map(s => [
          s.listing_id, 
          { listingId: s.listing_id, savedAt: s.created_at, notes: s.notes || undefined }
        ])
      );

      // Add local saves that aren't on server
      const toUpload: SavedListing[] = [];
      for (const local of localSaves) {
        if (!serverMap.has(local.listingId)) {
          toUpload.push(local);
          serverMap.set(local.listingId, local);
        }
      }

      // Upload local-only saves to server
      if (toUpload.length > 0) {
        const inserts = toUpload.map(s => ({
          user_id: uid,
          listing_id: s.listingId,
          notes: s.notes || null,
        }));

        // Note: Type assertion needed until saved_listings table is in generated types
        const { error: insertError } = await supabase
          .from("saved_listings" as never)
          .upsert(inserts as never, { onConflict: "user_id,listing_id" });

        if (insertError) {
          console.error("Failed to sync local saves to server:", insertError);
        }
      }

      // Update state with merged list
      const merged = Array.from(serverMap.values());
      setSavedListings(merged);
      setLocalSavedListings(merged);
      setIsSynced(true);
    } catch (error) {
      console.error("Sync failed:", error);
    }
  }, [supabase]);

  // Check if a listing is saved
  const isSaved = useCallback((listingId: string): boolean => {
    return savedListings.some(s => s.listingId === listingId);
  }, [savedListings]);

  // Save a listing
  const saveListing = useCallback(async (listingId: string, status?: string) => {
    // Check if already saved
    if (savedListings.some(s => s.listingId === listingId)) {
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

        if (error && (error as { code?: string }).code !== "23505") { // Ignore duplicate key error
          console.error("Failed to save to server:", error);
        }
      } catch (error) {
        console.error("Failed to save to server:", error);
      }
    }
  }, [savedListings, userId, supabase]);

  // Unsave a listing
  const unsaveListing = useCallback(async (listingId: string) => {
    // Update state immediately (optimistic)
    const updated = savedListings.filter(s => s.listingId !== listingId);
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
  }, [savedListings, userId, supabase]);

  // Toggle save state
  const toggleSave = useCallback((listingId: string, status?: string) => {
    if (isSaved(listingId)) {
      unsaveListing(listingId);
    } else {
      saveListing(listingId, status);
    }
  }, [isSaved, saveListing, unsaveListing]);

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
