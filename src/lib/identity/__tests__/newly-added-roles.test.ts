/**
 * @jest-environment jsdom
 */

/**
 * `mitasafi_newly_added_roles` now has one owner.
 *
 * It was declared as a private const in two components — RoleSwitchBanner (which
 * writes it) and UserProfileDropdown (which reads it, and writes on role switch) —
 * with no notification between them, and the dropdown only read it in a mount effect.
 * A badge written by the banner was therefore invisible to an already-mounted dropdown.
 * That is the same shape as the saved-listings defect; it survived here only because
 * RoleSwitchBanner is currently rendered nowhere.
 */

import {
  NEWLY_ADDED_ROLES_KEY,
  NEW_ROLE_EXPIRY_DAYS,
  newlyAddedRolesStore,
  unexpiredNewRoles,
  pruneExpiredNewRoles,
  clearNewRole,
  markRoleNewlyAdded,
} from "../newly-added-roles";

const NOW = Date.parse("2026-11-23T12:00:00.000Z");
const daysAgo = (n: number) => new Date(NOW - n * 86_400_000).toISOString();

beforeEach(() => {
  localStorage.clear();
  newlyAddedRolesStore.invalidate();
});

describe("the key has one declaration", () => {
  it("is the value both components used", () => {
    expect(NEWLY_ADDED_ROLES_KEY).toBe("mitasafi_newly_added_roles");
  });
});

describe("unexpiredNewRoles", () => {
  it("keeps a role added within the window", () => {
    const roles = unexpiredNewRoles({ landlord: { addedAt: daysAgo(1) } }, NOW);
    expect([...roles]).toEqual(["landlord"]);
  });

  it("drops a role added outside the window", () => {
    const roles = unexpiredNewRoles(
      { landlord: { addedAt: daysAgo(NEW_ROLE_EXPIRY_DAYS + 1) } },
      NOW,
    );
    expect([...roles]).toEqual([]);
  });

  it("drops a key that is not a role, instead of asserting it is one", () => {
    // These keys come from localStorage, which the user can edit. `role as UserRole`
    // asserted something nothing had checked.
    const roles = unexpiredNewRoles(
      {
        landlord: { addedAt: daysAgo(1) },
        "'; DROP TABLE": { addedAt: daysAgo(1) },
        admin: { addedAt: daysAgo(1) },
      },
      NOW,
    );
    expect([...roles]).toEqual(["landlord"]);
  });

  it("drops an entry whose addedAt is not a date", () => {
    const roles = unexpiredNewRoles(
      { landlord: { addedAt: "yesterday" } },
      NOW,
    );
    expect([...roles]).toEqual([]);
  });

  it("is a function of its arguments, so the clock is not a dependency", () => {
    const stored = { landlord: { addedAt: daysAgo(1) } };
    expect([...unexpiredNewRoles(stored, NOW)]).toEqual(["landlord"]);
    expect([
      ...unexpiredNewRoles(stored, NOW + NEW_ROLE_EXPIRY_DAYS * 86_400_000),
    ]).toEqual([]);
  });
});

describe("the store", () => {
  it("returns the same reference while storage is unchanged", () => {
    localStorage.setItem(
      NEWLY_ADDED_ROLES_KEY,
      JSON.stringify({ landlord: { addedAt: daysAgo(1) } }),
    );
    expect(newlyAddedRolesStore.read()).toBe(newlyAddedRolesStore.read());
  });

  it("falls back to empty on a hand-edited value", () => {
    for (const raw of ["{{{", "[]", '"nope"', "null", "7"]) {
      localStorage.setItem(NEWLY_ADDED_ROLES_KEY, raw);
      newlyAddedRolesStore.invalidate();
      expect(newlyAddedRolesStore.read()).toEqual({});
    }
  });

  it("keeps the well-formed entries and drops only the malformed ones", () => {
    localStorage.setItem(
      NEWLY_ADDED_ROLES_KEY,
      JSON.stringify({
        landlord: { addedAt: daysAgo(1) },
        tenant: { nope: true },
        service_provider: "not an object",
      }),
    );
    expect(Object.keys(newlyAddedRolesStore.read())).toEqual(["landlord"]);
  });

  it("notifies on write, which is what the two components never did", () => {
    const listener = jest.fn();
    const off = newlyAddedRolesStore.subscribe(listener);
    markRoleNewlyAdded("landlord", daysAgo(0));
    expect(listener).toHaveBeenCalledTimes(1);
    off();
  });
});

describe("markRoleNewlyAdded", () => {
  it("records a role", () => {
    markRoleNewlyAdded("landlord", daysAgo(0));
    expect(newlyAddedRolesStore.read().landlord.addedAt).toBe(daysAgo(0));
  });

  it("does not overwrite an existing timestamp, so the window is not extended", () => {
    markRoleNewlyAdded("landlord", daysAgo(5));
    markRoleNewlyAdded("landlord", daysAgo(0));
    expect(newlyAddedRolesStore.read().landlord.addedAt).toBe(daysAgo(5));
  });

  it("is idempotent, so it will not notify twice under StrictMode", () => {
    markRoleNewlyAdded("landlord", daysAgo(0));
    const listener = jest.fn();
    const off = newlyAddedRolesStore.subscribe(listener);
    markRoleNewlyAdded("landlord", daysAgo(0));
    expect(listener).not.toHaveBeenCalled();
    off();
  });
});

describe("clearNewRole", () => {
  it("removes one role and leaves the others", () => {
    markRoleNewlyAdded("landlord", daysAgo(1));
    markRoleNewlyAdded("tenant", daysAgo(1));
    clearNewRole("landlord");
    expect(Object.keys(newlyAddedRolesStore.read())).toEqual(["tenant"]);
  });

  it("removes the key entirely when the last role goes", () => {
    markRoleNewlyAdded("landlord", daysAgo(1));
    clearNewRole("landlord");
    expect(localStorage.getItem(NEWLY_ADDED_ROLES_KEY)).toBeNull();
  });

  it("is a no-op, and silent, for a role that is not recorded", () => {
    const listener = jest.fn();
    const off = newlyAddedRolesStore.subscribe(listener);
    clearNewRole("tenant");
    expect(listener).not.toHaveBeenCalled();
    off();
  });
});

describe("pruneExpiredNewRoles", () => {
  it("writes once when there is something to drop, and reports it", () => {
    localStorage.setItem(
      NEWLY_ADDED_ROLES_KEY,
      JSON.stringify({
        landlord: { addedAt: daysAgo(1) },
        tenant: { addedAt: daysAgo(NEW_ROLE_EXPIRY_DAYS + 2) },
      }),
    );
    expect(pruneExpiredNewRoles(NOW)).toBe(true);
    expect(Object.keys(newlyAddedRolesStore.read())).toEqual(["landlord"]);
  });

  it("is idempotent: the second call writes nothing", () => {
    // This is what makes it safe to call from an effect under StrictMode's double
    // invoke, and what stops it driving a notify/re-render loop.
    localStorage.setItem(
      NEWLY_ADDED_ROLES_KEY,
      JSON.stringify({
        landlord: { addedAt: daysAgo(1) },
        tenant: { addedAt: daysAgo(99) },
      }),
    );
    expect(pruneExpiredNewRoles(NOW)).toBe(true);

    const listener = jest.fn();
    const off = newlyAddedRolesStore.subscribe(listener);
    expect(pruneExpiredNewRoles(NOW)).toBe(false);
    expect(listener).not.toHaveBeenCalled();
    off();
  });

  it("removes the key when everything has expired", () => {
    localStorage.setItem(
      NEWLY_ADDED_ROLES_KEY,
      JSON.stringify({ tenant: { addedAt: daysAgo(99) } }),
    );
    expect(pruneExpiredNewRoles(NOW)).toBe(true);
    expect(localStorage.getItem(NEWLY_ADDED_ROLES_KEY)).toBeNull();
  });

  it("drops keys that are not roles as well as expired ones", () => {
    localStorage.setItem(
      NEWLY_ADDED_ROLES_KEY,
      JSON.stringify({
        landlord: { addedAt: daysAgo(1) },
        nonsense: { addedAt: daysAgo(1) },
      }),
    );
    expect(pruneExpiredNewRoles(NOW)).toBe(true);
    expect(Object.keys(newlyAddedRolesStore.read())).toEqual(["landlord"]);
  });
});
