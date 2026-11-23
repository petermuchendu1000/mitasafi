"use client";

import { useSyncExternalStore } from "react";
import type { LocalStore } from "./local-store";

/**
 * Read a browser-storage key as React state, with no mount effect and no setState.
 *
 * The three functions handed to useSyncExternalStore must be reference-stable across
 * renders or React resubscribes on every commit. createLocalStore closes over its state
 * and returns the same three functions for the lifetime of the store, so the store
 * object has to be created at module scope — not inside a component.
 */
export function useLocalStore<T>(store: LocalStore<T>): T {
  return useSyncExternalStore(
    store.subscribe,
    store.read,
    store.serverSnapshot,
  );
}
