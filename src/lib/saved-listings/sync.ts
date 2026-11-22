/**
 * The one reconciliation between local storage and the server's saved_listings table.
 *
 * WHY THIS MODULE EXISTS
 *   There were two reconcilers with OPPOSITE policies for the same key:
 *
 *     ListingCard.fetchSavedListingsOnce  kept `local ∩ server` — it deleted every local
 *                                         entry the server did not have, and uploaded
 *                                         nothing.
 *     useSavedListings.syncWithServer     kept `local ∪ server` and uploaded the
 *                                         difference.
 *
 *   Only the first ever ran: SaveButton is the sole consumer of useSavedListings and is
 *   rendered nowhere, so the half that would have saved the data was dead code. The
 *   surviving half destroys saves. Sign out, save three listings, sign in, open any
 *   browse page: the server list is empty, all three fail the filter, and they are
 *   written away without ever having been uploaded. That is the exact flow the hook's
 *   own header calls the philosophy — "NEVER block an action. Save works instantly,
 *   sync is a bonus."
 *
 * THE AMBIGUITY BOTH POLICIES GOT WRONG
 *   A local entry the server does not have is one of two different things:
 *     (a) saved while signed out, never uploaded   -> must be uploaded and KEPT
 *     (b) saved earlier, then unsaved on another device -> must be REMOVED
 *   They are indistinguishable from the lists alone, which is why one policy lost data
 *   (treated everything as (b)) and the other resurrected deletions (treated everything
 *   as (a)). SavedListing.syncedAt records whether an entry was ever on the server, so
 *   (a) and (b) can be told apart. Entries stored before that field existed have none
 *   and are read as (a) — the choice that keeps data rather than destroying it.
 *
 * WHAT THIS DOES NOT DO
 *   It never deletes from the server. Local storage holds no record of a deletion, so
 *   an unsave made while offline cannot be distinguished from a listing never saved on
 *   this device, and guessing in that direction is how the original bug happened.
 */

import {
  readSavedListings,
  writeSavedListings,
  type SavedListing,
} from "./store";

const SYNC_TTL_MS = 30_000;
const SAVED_LISTINGS_ENDPOINT = "/api/saved-listings";

/** When storage was last reconciled, and the request in flight if there is one. */
let lastSyncedAt = 0;
let inFlight: Promise<void> | null = null;

interface ServerRow {
  listing_id: string;
  created_at: string;
  notes?: string | null;
}

/** Force the next call to reconcile instead of skipping within the TTL. */
export function invalidateSavedListingsSync(): void {
  lastSyncedAt = 0;
}

/** Test seam: forget both the TTL and any in-flight request. */
export function resetSavedListingsSyncForTests(): void {
  lastSyncedAt = 0;
  inFlight = null;
}

/** POST one local-only entry. Returns what the server said about it. */
async function upload(entry: SavedListing): Promise<"ok" | "gone" | "failed"> {
  try {
    const res = await fetch(SAVED_LISTINGS_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        listing_id: entry.listingId,
        notes: entry.notes ?? null,
      }),
    });
    if (res.ok) return "ok";
    // The route answers 404 when the listing itself no longer exists. Retrying that
    // every 30 seconds forever would never succeed, so the entry is dropped instead.
    if (res.status === 404) return "gone";
    return "failed";
  } catch {
    return "failed";
  }
}

/**
 * Reconcile local storage with the server, at most once per TTL across all callers.
 * Signed-out visitors get a 401 and are left entirely alone: their saves are local and
 * that is the supported state, not an error.
 */
export async function reconcileSavedListingsWithServer(): Promise<void> {
  if (lastSyncedAt !== 0 && Date.now() - lastSyncedAt < SYNC_TTL_MS) return;

  // Another caller is already doing it — join that one rather than issue a second.
  if (inFlight) {
    await inFlight;
    return;
  }

  inFlight = (async () => {
    try {
      const res = await fetch(SAVED_LISTINGS_ENDPOINT);
      // 401 is the ordinary signed-out case. Any other non-ok answer is a server
      // problem. Either way there is no server truth to apply, so storage stands and
      // lastSyncedAt is left alone so the next caller may try again.
      if (!res.ok) return;

      const data = await res.json();
      const rows: ServerRow[] = data?.saved_listings ?? [];
      const serverIds = new Set(rows.map((r) => r.listing_id));
      const local = readSavedListings();

      const dropped = new Set<string>();
      const uploaded = new Set<string>();

      for (const entry of local) {
        if (serverIds.has(entry.listingId)) continue;
        if (entry.syncedAt) {
          // Was on the server, is not now: unsaved on another device.
          dropped.add(entry.listingId);
          continue;
        }
        const outcome = await upload(entry);
        if (outcome === "ok") uploaded.add(entry.listingId);
        else if (outcome === "gone") dropped.add(entry.listingId);
        // "failed": keep it local and unsynced, and try again next time.
      }

      const now = new Date().toISOString();
      const merged = new Map<string, SavedListing>();

      for (const entry of local) {
        if (dropped.has(entry.listingId)) continue;
        const onServer =
          serverIds.has(entry.listingId) || uploaded.has(entry.listingId);
        merged.set(entry.listingId, {
          ...entry,
          // Only ever set on a transition, never refreshed, so an unchanged list
          // serializes identically and the write below is skipped.
          syncedAt: onServer ? (entry.syncedAt ?? now) : entry.syncedAt,
        });
      }

      // Saves made on another device, which this one has never seen.
      for (const row of rows) {
        if (merged.has(row.listing_id)) continue;
        merged.set(row.listing_id, {
          listingId: row.listing_id,
          savedAt: row.created_at,
          notes: row.notes ?? undefined,
          syncedAt: now,
        });
      }

      const next = [...merged.values()];
      // Writing notifies every subscriber, so skip it when nothing actually changed:
      // otherwise every card on the page re-renders once per sync for no reason.
      if (JSON.stringify(next) !== JSON.stringify(local)) {
        writeSavedListings(next);
      }
      lastSyncedAt = Date.now();
    } catch {
      // Network error: local storage stands, and the next caller retries.
    } finally {
      inFlight = null;
    }
  })();

  await inFlight;
}
