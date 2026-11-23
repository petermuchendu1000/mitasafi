// =============================================================================
// MITASAFI: RECENTLY VIEWED HOOK
// =============================================================================
// Tracks recently viewed providers in localStorage.
// Used for personalization on landing page (Fiverr-style).
// =============================================================================

"use client";

import { useEffect, useCallback } from "react";
import {
  createLocalStore,
  type LocalStore,
} from "@/lib/browser-storage/local-store";
import { useLocalStore } from "@/lib/browser-storage/useLocalStore";

// =============================================================================
// TYPES
// =============================================================================

export interface RecentlyViewedProvider {
  id: string;
  business_name: string;
  tagline: string | null;
  logo_url: string | null;
  rating_average: number | null;
  rating_count: number | null;
  min_price: number | null;
  categories: string[];
  viewedAt: number; // timestamp
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PROVIDERS_KEY = "mitasafi_recently_viewed_providers";
const MAX_ITEMS = 12;
const EXPIRY_DAYS = 30;
const EXPIRY_MS = EXPIRY_DAYS * 24 * 60 * 60 * 1000;

// =============================================================================
// STORES
// =============================================================================
//
// Two keys, two stores, both at module scope. They replace a mount effect that read
// the key, filtered it by age and called setProviders — the reported
// setState — and the pair of useState lists behind it.
//
// Expiry is applied in `parse`, not during render. The cutoff depends on Date.now(),
// so filtering in a useMemo would recompute on every render and hand React a new array
// each time, which is exactly what useSyncExternalStore must not be given. Parsing
// happens once per change of the raw string, so this preserves the previous behaviour
// (filter once per mount) without the extra commit.

const EMPTY_PROVIDERS: readonly RecentlyViewedProvider[] = Object.freeze([]);

function isRecentProvider(value: unknown): value is RecentlyViewedProvider {
  const v = value as RecentlyViewedProvider;
  return (
    typeof v === "object" &&
    v !== null &&
    typeof v.id === "string" &&
    typeof v.business_name === "string" &&
    typeof v.viewedAt === "number"
  );
}

const providersStore = createLocalStore<readonly RecentlyViewedProvider[]>({
  key: PROVIDERS_KEY,
  empty: EMPTY_PROVIDERS,
  parse: (raw) => {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    const cutoff = Date.now() - EXPIRY_MS;
    const valid = parsed
      .filter(isRecentProvider)
      .filter((p) => p.viewedAt > cutoff);
    return valid.length === 0 ? EMPTY_PROVIDERS : valid;
  },
});

/**
 * Write expired entries out of storage for one store.
 *
 * `parse` already hides them from readers, so this is pure housekeeping: it stops a
 * list that is never read from growing forever. It writes only when the stored count
 * differs from the usable count, which makes it idempotent and unable to drive a
 * notify/re-render loop.
 *
 * Generic over the element type so the two stores can share it without a cast; an
 * earlier version looped over a tuple of both stores and needed a @ts-expect-error to
 * do it, which is a suppression standing in for a type that was simply available.
 */
function pruneExpiredIn<T>(store: LocalStore<readonly T[]>): void {
  let storedCount: number;
  try {
    const raw = localStorage.getItem(store.key);
    if (!raw) return;
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return;
    storedCount = parsed.length;
  } catch {
    return;
  }

  const usable = store.read();
  if (usable.length !== storedCount) store.write(usable);
}

/** Most recent first, capped, de-duplicated by id. */
function prepend<T extends { id: string }>(
  list: readonly T[],
  item: T,
): readonly T[] {
  return [item, ...list.filter((existing) => existing.id !== item.id)].slice(
    0,
    MAX_ITEMS,
  );
}

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useRecentlyViewed() {
  const providers = useLocalStore(providersStore);

  // Housekeeping only: no setState, so nothing cascades. See pruneExpiredIn.
  useEffect(() => {
    pruneExpiredIn(providersStore);
  }, []);

  const addProvider = useCallback(
    (provider: Omit<RecentlyViewedProvider, "viewedAt">) => {
      providersStore.write(
        prepend(providersStore.read(), { ...provider, viewedAt: Date.now() }),
      );
    },
    [],
  );

  const clearAll = useCallback(() => {
    providersStore.clear();
  }, []);

  const removeProvider = useCallback((providerId: string) => {
    const current = providersStore.read();
    if (!current.some((p) => p.id === providerId)) return;
    providersStore.write(current.filter((p) => p.id !== providerId));
  }, []);

  return {
    providers,
    addProvider,
    removeProvider,
    clearAll,
    hasHistory: providers.length > 0,
  };
}

// =============================================================================
// STANDALONE FUNCTIONS (for use outside React)
// =============================================================================

/**
 * Record a provider view from outside React.
 *
 * This used to read and write localStorage directly, with its own JSON handling and
 * its own copy of the cap-and-dedupe logic, which made it invisible to a mounted
 * useRecentlyViewed: nothing notified it, so the home page's list would not update
 * until a remount. Writing through the store notifies.
 *
 * It also had no callers at all, which meant the whole feature was inert: nothing
 * wrote recently-viewed data and RecentlyViewedSection could never show anything.
 * components/services/TrackProviderView.tsx is the caller, on the provider detail
 * page.
 *
 * The services half of this module — RecentlyViewedService, addService,
 * removeService, trackServiceView and their store — was removed at the same time. It
 * had neither a writer nor a reader: RecentlyViewedSection only renders providers.
 * Wiring it up would have meant adding a writer with no reader, which is the same
 * problem pointing the other way. It is a few lines to bring back from git history if
 * recently-viewed services are ever wanted.
 */
export function trackProviderView(
  provider: Omit<RecentlyViewedProvider, "viewedAt">,
) {
  providersStore.write(
    prepend(providersStore.read(), { ...provider, viewedAt: Date.now() }),
  );
}
