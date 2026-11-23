/**
 * The one place that knows how "roles you added recently" are stored in the browser.
 *
 * WHY THIS MODULE EXISTS
 *   `mitasafi_newly_added_roles` was declared twice, as a private const in two
 *   different components:
 *
 *     components/dashboard/RoleSwitchBanner.tsx:14   — writes it
 *     components/dashboard/UserProfileDropdown.tsx:20 — reads it, and writes on switch
 *
 *   Neither notified the other, and the dropdown only read the key in a mount effect,
 *   so a write by the banner was invisible to a dropdown that was already mounted.
 *   That is the same shape as the defect lib/saved-listings/store.ts was written to
 *   kill for `mitasafi_saved_listings`; it survived here only because RoleSwitchBanner
 *   is currently rendered nowhere. One owner, one notification channel, no second
 *   declaration of the key.
 *
 * WHAT IS STORED
 *   A map of role name to when it was added, e.g. {"landlord": {"addedAt": "2026-..."}}.
 *   The keys come from localStorage, which the user can edit by hand, so they are
 *   validated with normalizeRoleParam at the point of use rather than asserted with a
 *   cast — an unrecognised key is simply dropped instead of becoming a badge.
 */

import { createLocalStore } from "@/lib/browser-storage/local-store";
import { normalizeRoleParam } from "./roles";
import type { UserRole } from "@/types/db-helpers";

export const NEWLY_ADDED_ROLES_KEY = "mitasafi_newly_added_roles";

/** When a role was added. More fields may appear; unknown ones are preserved. */
export interface NewlyAddedRoleEntry {
  addedAt: string;
}

export type NewlyAddedRoles = Readonly<Record<string, NewlyAddedRoleEntry>>;

/** How long the "New" badge is shown after a role is added. */
export const NEW_ROLE_EXPIRY_DAYS = 7;

const EMPTY: NewlyAddedRoles = Object.freeze({});

function isEntry(value: unknown): value is NewlyAddedRoleEntry {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as NewlyAddedRoleEntry).addedAt === "string"
  );
}

export const newlyAddedRolesStore = createLocalStore<NewlyAddedRoles>({
  key: NEWLY_ADDED_ROLES_KEY,
  empty: EMPTY,
  parse: (raw) => {
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed !== "object" ||
      parsed === null ||
      Array.isArray(parsed)
    ) {
      return null;
    }
    // Keep only well-formed entries. One hand-edited key should not discard the rest.
    const kept: Record<string, NewlyAddedRoleEntry> = {};
    for (const [role, entry] of Object.entries(parsed)) {
      if (isEntry(entry)) kept[role] = entry;
    }
    return Object.keys(kept).length === 0 ? EMPTY : kept;
  },
});

/** Days since `addedAt`, or Infinity if it is not a usable date. */
function daysSince(addedAt: string, now: number): number {
  const then = new Date(addedAt).getTime();
  if (Number.isNaN(then)) return Infinity;
  return (now - then) / (1000 * 60 * 60 * 24);
}

/**
 * The roles that should still show a "New" badge.
 *
 * Pure, so it can be derived during render instead of being assembled by an effect.
 * `now` is a parameter rather than a call to Date.now() inside, so the result is a
 * function of its inputs and the tests do not have to mock the clock.
 */
export function unexpiredNewRoles(
  stored: NewlyAddedRoles,
  now: number = Date.now(),
): ReadonlySet<UserRole> {
  const roles = new Set<UserRole>();
  for (const [role, entry] of Object.entries(stored)) {
    const valid = normalizeRoleParam(role);
    if (valid && daysSince(entry.addedAt, now) < NEW_ROLE_EXPIRY_DAYS) {
      roles.add(valid);
    }
  }
  return roles;
}

/**
 * Drop expired and unrecognised entries from storage.
 *
 * Returns true if it wrote. Idempotent: a second call finds nothing to drop and writes
 * nothing, so it is safe to run from an effect under StrictMode's double invoke, and it
 * cannot drive a notify/re-render loop.
 */
export function pruneExpiredNewRoles(now: number = Date.now()): boolean {
  const stored = newlyAddedRolesStore.read();
  const kept: Record<string, NewlyAddedRoleEntry> = {};
  for (const [role, entry] of Object.entries(stored)) {
    if (
      normalizeRoleParam(role) &&
      daysSince(entry.addedAt, now) < NEW_ROLE_EXPIRY_DAYS
    ) {
      kept[role] = entry;
    }
  }

  if (Object.keys(kept).length === Object.keys(stored).length) return false;

  if (Object.keys(kept).length === 0) {
    newlyAddedRolesStore.clear();
  } else {
    newlyAddedRolesStore.write(kept);
  }
  return true;
}

/** Stop showing the "New" badge for one role. Idempotent. */
export function clearNewRole(role: UserRole): void {
  const stored = newlyAddedRolesStore.read();
  if (!(role in stored)) return;

  const kept = { ...stored };
  delete kept[role];
  if (Object.keys(kept).length === 0) {
    newlyAddedRolesStore.clear();
  } else {
    newlyAddedRolesStore.write(kept);
  }
}

/** Record that a role was just added, if it is not already recorded. Idempotent. */
export function markRoleNewlyAdded(
  role: UserRole,
  addedAt: string = new Date().toISOString(),
): void {
  const stored = newlyAddedRolesStore.read();
  if (stored[role]) return;
  newlyAddedRolesStore.write({ ...stored, [role]: { addedAt } });
}
