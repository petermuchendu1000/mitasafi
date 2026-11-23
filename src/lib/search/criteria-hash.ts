/**
 * A stable identity for a set of search criteria.
 *
 * WHAT WAS FRAGILE
 *   SaveSearchButton decided "have you already been notified about this search?" with
 *   `JSON.stringify(searchCriteria)`, compared against strings produced the same way.
 *   JSON.stringify serialises keys in insertion order, so two objects describing the
 *   same search hash differently if they were built in a different order — and arrays
 *   compare by order too, so ["Kilimani","Westlands"] and ["Westlands","Kilimani"] are
 *   different searches as far as that comparison is concerned.
 *
 * HOW LIVE IS IT
 *   Worth being precise rather than alarming: not very, today. ListingsGrid builds the
 *   object as a single literal with all six keys always present, so its key order is
 *   fixed, and it only ever puts one entry in each array. JSON.stringify drops
 *   undefined values, so absent filters already vanish. The breakage needs a second
 *   construction site with a different key order, or multi-value filters — both of
 *   which the type permits and neither of which is far off. This is a latent defect
 *   being closed, not a bug users are hitting.
 *
 * COMPATIBILITY WITH WHAT IS ALREADY STORED
 *   Entries written by the old code are plain JSON, so they are canonicalised on read
 *   and still match. Nothing in anyone's browser is orphaned, and no migration runs.
 *   An entry that is not JSON at all is compared literally rather than discarded.
 */

/** Criteria as the browse UI builds them. Every field is optional. */
export interface SearchCriteria {
  areas?: string[];
  propertyTypes?: string[];
  bedroomsMin?: number;
  bedroomsMax?: number;
  priceMin?: number;
  priceMax?: number;
  verifiedOnly?: boolean;
  availableNow?: boolean;
  query?: string;
}

/**
 * Normalise one value.
 *
 * Arrays are sorted, because every array field here is a SET of filters — areas,
 * property types — where order carries no meaning. Entries inside them are left
 * alone otherwise.
 */
function normaliseValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return [...value].sort();
  }
  return value;
}

/**
 * Should this field take part in the identity of the search?
 *
 * undefined, null and an empty array all mean "this filter is not set", so they are
 * dropped — that is also what JSON.stringify already did with undefined, which keeps
 * old entries matching.
 *
 * `false` and `0` are KEPT. It is tempting to treat verifiedOnly:false as equivalent
 * to absent, and it probably is, but the same rule would have to decide what
 * priceMin:0 means, and that is a real filter. Rather than guess which falsy values
 * are defaults, only the three that unambiguously mean "unset" are dropped.
 */
function isSet(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (Array.isArray(value) && value.length === 0) return false;
  return true;
}

/** A stable string for a criteria object: keys sorted, unset fields dropped. */
export function canonicalSearchHash(criteria: unknown): string {
  if (typeof criteria !== "object" || criteria === null) {
    return JSON.stringify(criteria ?? null);
  }

  const entries = Object.entries(criteria as Record<string, unknown>)
    .filter(([, value]) => isSet(value))
    .map(([key, value]) => [key, normaliseValue(value)] as const)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));

  return JSON.stringify(Object.fromEntries(entries));
}

/**
 * Canonicalise something already in storage.
 *
 * Old entries are `JSON.stringify(criteria)` from the previous scheme and parse
 * cleanly, so they canonicalise to the same string the new code produces. Anything
 * that is not JSON — a hand-edited value — is returned unchanged so it can still match
 * itself rather than being silently dropped.
 */
export function canonicalHashOfStoredEntry(entry: string): string {
  try {
    return canonicalSearchHash(JSON.parse(entry));
  } catch {
    return entry;
  }
}

/** Is this search already in the stored list, whichever scheme wrote it? */
export function storedListContains(
  storedEntries: readonly string[],
  criteria: SearchCriteria,
): boolean {
  const target = canonicalSearchHash(criteria);
  return storedEntries.some(
    (entry) => canonicalHashOfStoredEntry(entry) === target,
  );
}
