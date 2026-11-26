/**
 * Turning the tail of a listing slug into something the database can look up
 * on its primary key.
 *
 * WHAT WAS WRONG
 *   `/listings/[slug]` ends in the first 8 hex characters of the listing's
 *   UUID. Three places resolved that by fetching a page of listings — 200 in
 *   the page, 100 in generateMetadata's fallback and 100 in getListingBySlug
 *   — and then running `id.startsWith(prefix)` in JavaScript.
 *
 *   That is unsound rather than merely slow. The query carries no ORDER BY,
 *   so which rows come back is whatever Postgres finds convenient; add rows,
 *   update some, let autovacuum run, or let the planner switch to an index
 *   scan, and the set changes. A public URL that resolves today can start
 *   returning 404 tomorrow with no code change and nothing to see in a log.
 *   Measured on the live project with 210 visible listings, the row being
 *   looked up came back at position 2 — so the fault is latent there, not
 *   absent, which is the worst kind to leave in place.
 *
 * WHAT REPLACES IT
 *   A UUID prefix describes a CONTIGUOUS RANGE of UUIDs, so the lookup is
 *   `id >= <prefix padded with 0> AND id <= <prefix padded with f>`. That is
 *   an index range scan on the primary key: exact, bounded, and with no cap
 *   on how many listings may exist.
 *
 *   The same arithmetic already exists in the `find_listing_by_id_prefix`
 *   function on the database, which the metadata path used. It is not reused
 *   here because it filters `status = 'active'` and the page deliberately
 *   resolves paused, rented and archived listings too.
 *
 * AND ONE THING THAT SIMPLY DID NOT WORK
 *   A full UUID in the URL returned 404, because the old code took
 *   `slug.split("-").pop()` — the LAST hyphen-separated group, which for a
 *   UUID is its final twelve characters, never a prefix of itself. Verified
 *   against the live project before this change. Handled below.
 */

const FULL_UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The slug tail must be hex and long enough to be selective. */
const HEX_TAIL = /^[0-9a-f]{8,32}$/i;

export type ListingRef =
  | { kind: "id"; id: string }
  | { kind: "range"; lo: string; hi: string };

/** 32 hex characters -> canonical 8-4-4-4-12. */
function toUuid(hex32: string): string {
  return [
    hex32.slice(0, 8),
    hex32.slice(8, 12),
    hex32.slice(12, 16),
    hex32.slice(16, 20),
    hex32.slice(20, 32),
  ].join("-");
}

/**
 * Resolve a URL slug to either an exact id or the UUID range its prefix
 * covers. Returns null when the slug carries nothing usable, so the caller
 * can 404 without touching the database.
 */
export function resolveListingRef(
  slug: string | null | undefined,
): ListingRef | null {
  const s = (slug ?? "").trim();
  if (s === "") return null;

  // A bare UUID is the id itself. This is checked BEFORE splitting, because
  // splitting a UUID on "-" throws away everything but its last group.
  if (FULL_UUID.test(s)) return { kind: "id", id: s.toLowerCase() };

  const tail = s.split("-").pop() ?? "";
  // Whole-segment match, not a strip-and-hope: "kilimani" contains hex
  // letters, and accepting the hex it happens to contain would resolve a
  // typo'd URL to somebody else's listing.
  if (!HEX_TAIL.test(tail)) return null;

  const hex = tail.toLowerCase();
  return {
    kind: "range",
    lo: toUuid(hex.padEnd(32, "0")),
    hi: toUuid(hex.padEnd(32, "f")),
  };
}
