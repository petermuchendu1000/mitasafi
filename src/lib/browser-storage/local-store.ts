/**
 * One implementation of "a browser storage key is an external store".
 *
 * WHY THIS EXISTS
 *   Eight components each kept a copy of the same five-step dance: declare a key, read
 *   it in a mount effect, setState with what came back, write it back on change, and
 *   (sometimes) listen for the `storage` event. Every copy paid the same costs:
 *
 *     - an extra render, because the first paint showed the default and the effect
 *       replaced it one commit later (this is what react-hooks/set-state-in-effect
 *       reports);
 *     - no same-tab notification, so two components reading one key disagreed until
 *       something remounted — the defect `lib/saved-listings/store.ts` was written to
 *       kill for `mitasafi_saved_listings`, and `mitasafi_newly_added_roles` still had
 *       it in two files;
 *     - asymmetric teardown, because `removeEventListener` was handed a different
 *       function than `addEventListener` got.
 *
 *   localStorage plus a change event IS an external store, and useSyncExternalStore is
 *   React's API for one. See `useLocalStore.ts`.
 *
 * THE CACHING RULE, WHICH IS NOT OPTIONAL
 *   useSyncExternalStore calls `read` during render and compares results with
 *   Object.is. A freshly parsed object every call is never reference-equal, and React
 *   throws "The result of getSnapshot should be cached to avoid an infinite loop".
 *   `read` therefore caches the parsed value against the raw string it came from and
 *   returns the SAME reference until that string changes. Because the cache is keyed on
 *   the raw string and not on a dirty flag, a write that bypasses this module (a bare
 *   localStorage.setItem elsewhere) is still picked up by the next read.
 *
 *   The returned value must be treated as immutable: it is shared with React, which
 *   believes an unchanged reference means unchanged data. `write` always takes a new
 *   value; nothing here mutates in place.
 *
 * SERVER RENDERING
 *   There is no localStorage on the server, so `serverSnapshot` returns `empty`. React
 *   uses it for the server render AND for hydration, then switches to `read`, which is
 *   what keeps the markup identical on both sides. Reading storage in a useState
 *   initialiser instead would produce a hydration mismatch.
 */

export interface LocalStore<T> {
  /** The storage key this store owns. */
  readonly key: string;
  /**
   * Current value. Returns the same reference while the underlying raw string is
   * unchanged, so it is safe as a useSyncExternalStore snapshot.
   */
  read: () => T;
  /** Persist and notify every subscriber in this tab. */
  write: (value: T) => void;
  /** Remove the key entirely and notify. */
  clear: () => void;
  /** Subscribe to changes from this tab and from other tabs. Teardown is symmetric. */
  subscribe: (onChange: () => void) => () => void;
  /** The value to render on the server and during hydration. */
  serverSnapshot: () => T;
  /** Forget the parsed cache. For tests, and for after an out-of-band write. */
  invalidate: () => void;
}

export interface CreateLocalStoreOptions<T> {
  /** Storage key. */
  key: string;
  /**
   * Value for "nothing stored", "storage unreadable" and "stored value unusable".
   * Must be a stable reference — it is returned directly, including as the server
   * snapshot, so a fresh `[]` here would defeat the caching rule.
   */
  empty: T;
  /**
   * Turn the raw string into a value. May throw, and may return `null` to reject what
   * it was given; either way the store falls back to `empty`. Shape validation belongs
   * here: the contents of localStorage are user-editable input, not trusted data.
   */
  parse: (raw: string) => T | null;
  /** Turn a value into the raw string. Defaults to JSON.stringify. */
  serialize?: (value: T) => string;
  /**
   * Name of the same-tab CustomEvent. Defaults to `<key>:changed`. The `storage` event
   * only fires in OTHER tabs, which is why a same-tab channel is needed at all.
   */
  event?: string;
  /** `sessionStorage` instead of `localStorage`. */
  session?: boolean;
}

export function createLocalStore<T>(
  options: CreateLocalStoreOptions<T>,
): LocalStore<T> {
  const {
    key,
    empty,
    parse,
    serialize = (value: T) => JSON.stringify(value),
    event = `${key}:changed`,
    session = false,
  } = options;

  /** The raw string the cache was built from. `undefined` means "never read". */
  let cachedRaw: string | null | undefined;
  let cachedValue: T = empty;

  function area(): Storage | null {
    if (typeof window === "undefined") return null;
    try {
      return session ? window.sessionStorage : window.localStorage;
    } catch {
      // Accessing the property itself throws when storage is disabled by policy.
      return null;
    }
  }

  function read(): T {
    const storage = area();
    if (!storage) return empty;

    let raw: string | null;
    try {
      raw = storage.getItem(key);
    } catch {
      // Private mode, disabled storage, quota errors — empty beats throwing.
      return empty;
    }

    if (raw === cachedRaw) return cachedValue;

    cachedRaw = raw;
    if (raw === null || raw === "") {
      cachedValue = empty;
      return cachedValue;
    }

    try {
      const parsed = parse(raw);
      cachedValue = parsed === null ? empty : parsed;
    } catch {
      cachedValue = empty;
    }
    return cachedValue;
  }

  function notify(): void {
    if (typeof window === "undefined") return;
    window.dispatchEvent(new CustomEvent(event));
  }

  function write(value: T): void {
    const storage = area();
    if (!storage) return;
    try {
      storage.setItem(key, serialize(value));
    } catch (error) {
      // Quota exceeded, or storage disabled mid-session. Do not notify: nothing changed.
      console.error(`Failed to write ${key} to browser storage:`, error);
      return;
    }
    cachedRaw = undefined;
    notify();
  }

  function clear(): void {
    const storage = area();
    if (!storage) return;
    try {
      storage.removeItem(key);
    } catch (error) {
      console.error(`Failed to clear ${key} from browser storage:`, error);
      return;
    }
    cachedRaw = undefined;
    notify();
  }

  function subscribe(onChange: () => void): () => void {
    if (typeof window === "undefined") return () => {};

    const onStorage = (e: StorageEvent) => {
      // e.key is null when the whole area was cleared, which affects us too.
      if (e.key === key || e.key === null) {
        cachedRaw = undefined; // another tab wrote; our cache is stale
        onChange();
      }
    };

    window.addEventListener(event, onChange);
    window.addEventListener("storage", onStorage);

    // Removes exactly what was added. The Navbar leak this replaces came from adding an
    // anonymous handler and removing a different reference.
    return () => {
      window.removeEventListener(event, onChange);
      window.removeEventListener("storage", onStorage);
    };
  }

  function serverSnapshot(): T {
    return empty;
  }

  function invalidate(): void {
    cachedRaw = undefined;
    cachedValue = empty;
  }

  return { key, read, write, clear, subscribe, serverSnapshot, invalidate };
}

/**
 * The common case: a JSON array whose elements pass a guard.
 *
 * Elements that fail the guard are dropped rather than failing the whole read, because
 * one corrupt entry should not empty a user's saved list. `empty` is shared and frozen
 * so the "nothing stored" reference is stable.
 */
export function createArrayStore<T>(
  key: string,
  isElement: (value: unknown) => value is T,
  options?: { session?: boolean; event?: string },
): LocalStore<readonly T[]> {
  const empty: readonly T[] = Object.freeze([]);
  return createLocalStore<readonly T[]>({
    key,
    empty,
    parse: (raw) => {
      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return null;
      const kept = parsed.filter(isElement);
      // Preserve the stable `empty` reference rather than returning a new [].
      return kept.length === 0 ? empty : kept;
    },
    ...options,
  });
}

/** `"true"` / `"false"` under a key, which is how `sidebar-collapsed` was stored. */
export function createBooleanStore(
  key: string,
  options?: { session?: boolean; event?: string },
): LocalStore<boolean> {
  return createLocalStore<boolean>({
    key,
    empty: false,
    parse: (raw) => (raw === "true" ? true : raw === "false" ? false : null),
    serialize: (value) => String(value),
    ...options,
  });
}
