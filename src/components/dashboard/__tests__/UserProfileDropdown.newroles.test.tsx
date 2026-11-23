/**
 * @jest-environment jsdom
 */

/**
 * The "New" role badges are derived from one store and from the prop, not assembled in
 * state by two effects.
 *
 * The two effects were a mount read of `mitasafi_newly_added_roles` (the reported
 * setState, and the reason a badge written by RoleSwitchBanner never reached an
 * already-mounted dropdown) and a second that merged the newlyAddedRole prop into the
 * same state — a copy of a value the component is handed on every render.
 */

import { render, act } from "@testing-library/react";
import { Profiler } from "react";
import { UserProfileDropdown } from "../UserProfileDropdown";
import { markRoleNewlyAdded } from "@/lib/identity/newly-added-roles";

const push = jest.fn();

jest.mock("next/navigation", () => ({
  useRouter: () => ({ push }),
  useSearchParams: () => new URLSearchParams(),
}));

const KEY = "mitasafi_newly_added_roles";
const ALL_ROLES = [
  { role: "tenant" as const, is_verified: true },
  { role: "landlord" as const, is_verified: true },
];

beforeEach(() => {
  localStorage.clear();
  push.mockReset();
});

function renderDropdown(newlyAddedRole?: "tenant" | "landlord" | null) {
  let commits = 0;
  const view = render(
    <Profiler
      id="dd"
      onRender={() => {
        commits += 1;
      }}
    >
      <UserProfileDropdown
        userName="Asha Mwangi"
        userEmail="asha@example.com"
        currentRole="tenant"
        allRoles={ALL_ROLES}
        newlyAddedRole={newlyAddedRole}
      />
    </Profiler>,
  );
  return { view, commitsAtMount: () => commits };
}

function open(view: { container: HTMLElement }) {
  act(() => {
    (view.container.querySelector("button") as HTMLElement).click();
  });
}

function badges(view: { container: HTMLElement }) {
  return [...view.container.querySelectorAll("span")].filter(
    (s) => s.textContent?.trim() === "New",
  );
}

describe("badges are derived", () => {
  it("shows a stored badge with no extra commit before the dropdown opens", () => {
    markRoleNewlyAdded("landlord", new Date().toISOString());

    const { view, commitsAtMount } = renderDropdown();
    expect(commitsAtMount()).toBe(1);

    open(view);
    expect(badges(view)).toHaveLength(1);
  });

  it("shows a badge for the role named in the URL even with nothing stored", () => {
    const { view } = renderDropdown("landlord");
    open(view);
    expect(badges(view)).toHaveLength(1);
  });

  it("does not double up when the prop and storage name the same role", () => {
    markRoleNewlyAdded("landlord", new Date().toISOString());
    const { view } = renderDropdown("landlord");
    open(view);
    expect(badges(view)).toHaveLength(1);
  });

  it("shows no badge when nothing is stored and no role is named", () => {
    const { view } = renderDropdown();
    open(view);
    expect(badges(view)).toHaveLength(0);
  });

  it("ignores an expired entry", () => {
    const eightDaysAgo = new Date(Date.now() - 8 * 86_400_000).toISOString();
    markRoleNewlyAdded("landlord", eightDaysAgo);

    const { view } = renderDropdown();
    open(view);
    expect(badges(view)).toHaveLength(0);
  });

  it("ignores a hand-edited key that is not a role", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({ "<script>": { addedAt: new Date().toISOString() } }),
    );
    const { view } = renderDropdown();
    open(view);
    expect(badges(view)).toHaveLength(0);
  });

  it("renders without throwing on a corrupt value", () => {
    localStorage.setItem(KEY, "{{{not json");
    expect(() => renderDropdown()).not.toThrow();
  });
});

describe("the badge reaches an already-mounted dropdown", () => {
  it("a write from elsewhere shows up without a remount", () => {
    const { view } = renderDropdown();
    open(view);
    expect(badges(view)).toHaveLength(0);

    // This is what RoleSwitchBanner does. Before, the dropdown had already taken its
    // mount-time snapshot and nothing told it to look again.
    act(() => {
      markRoleNewlyAdded("landlord", new Date().toISOString());
    });

    expect(badges(view)).toHaveLength(1);
  });

  it("another tab's write shows up too", () => {
    const { view } = renderDropdown();
    open(view);

    act(() => {
      localStorage.setItem(
        KEY,
        JSON.stringify({ landlord: { addedAt: new Date().toISOString() } }),
      );
      window.dispatchEvent(new StorageEvent("storage", { key: KEY }));
    });

    expect(badges(view)).toHaveLength(1);
  });
});

describe("switching role clears its badge", () => {
  it("removes the entry from storage and navigates", () => {
    markRoleNewlyAdded("landlord", new Date().toISOString());
    const { view } = renderDropdown();
    open(view);

    const landlordButton = [...view.container.querySelectorAll("button")].find(
      (b) => b.textContent?.includes("Manage your properties"),
    );
    act(() => {
      landlordButton?.click();
    });

    expect(localStorage.getItem(KEY)).toBeNull();
    expect(push).toHaveBeenCalledWith("/dashboard?activeRole=landlord");
  });

  it("prunes expired entries on mount, and writes only when there is something to drop", () => {
    localStorage.setItem(
      KEY,
      JSON.stringify({
        landlord: { addedAt: new Date().toISOString() },
        tenant: {
          addedAt: new Date(Date.now() - 9 * 86_400_000).toISOString(),
        },
      }),
    );

    renderDropdown();

    expect(Object.keys(JSON.parse(localStorage.getItem(KEY) ?? "{}"))).toEqual([
      "landlord",
    ]);
  });

  it("does not write on mount when there is nothing to prune", () => {
    markRoleNewlyAdded("landlord", new Date().toISOString());
    const setItem = jest.spyOn(Storage.prototype, "setItem");

    renderDropdown();

    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });
});
