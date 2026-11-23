/**
 * @jest-environment jsdom
 */

/**
 * DashboardHeader records a newly added role, which is the writer that went missing.
 *
 * markRoleNewlyAdded's only caller was RoleSwitchBanner, which was deleted for having
 * no call sites — and which was never rendered either, so the key had in fact never
 * been written and the "New" badge only ever lasted as long as the ?newRole=
 * parameter sat in the URL. This component is where the role is actually learned
 * about, so it is where the record belongs.
 *
 * This file exists because a mutation run caught its absence: removing the call left
 * every other test green.
 */

import { render } from "@testing-library/react";
import { DashboardHeader } from "../DashboardHeader";

const params = { value: new URLSearchParams() };
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn() }),
  useSearchParams: () => params.value,
}));

const KEY = "mitasafi_newly_added_roles";

const PROPS = {
  userName: "Asha Mwangi",
  userEmail: "asha@example.com",
  currentRole: "tenant" as const,
  allRoles: [
    { role: "tenant" as const, is_verified: true },
    { role: "landlord" as const, is_verified: true },
  ],
};

beforeEach(() => {
  localStorage.clear();
  params.value = new URLSearchParams();
});

function stored(): Record<string, { addedAt: string }> {
  return JSON.parse(localStorage.getItem(KEY) ?? "{}");
}

describe("recording a newly added role", () => {
  it("records the role named in the URL", () => {
    params.value = new URLSearchParams("newRole=landlord");

    render(<DashboardHeader {...PROPS} />);

    expect(Object.keys(stored())).toEqual(["landlord"]);
  });

  it("writes nothing when no role is named", () => {
    render(<DashboardHeader {...PROPS} />);
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("writes nothing for a role the URL made up", () => {
    // normalizeRoleParam rejects it, so it never reaches storage — the same hardening
    // the storage read path already had.
    params.value = new URLSearchParams("newRole=administrator");

    render(<DashboardHeader {...PROPS} />);

    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("does not extend the seven days when the URL is revisited", () => {
    const earlier = new Date(Date.now() - 3 * 86_400_000).toISOString();
    localStorage.setItem(
      KEY,
      JSON.stringify({ landlord: { addedAt: earlier } }),
    );
    params.value = new URLSearchParams("newRole=landlord");

    render(<DashboardHeader {...PROPS} />);

    // markRoleNewlyAdded leaves an existing timestamp alone; otherwise bookmarking
    // the URL would keep the badge alive indefinitely.
    expect(stored().landlord.addedAt).toBe(earlier);
  });

  it("writes nothing at all when the role is already recorded", () => {
    params.value = new URLSearchParams("newRole=landlord");
    render(<DashboardHeader {...PROPS} />);

    const setItem = jest.spyOn(Storage.prototype, "setItem");
    render(<DashboardHeader {...PROPS} />);

    // Idempotent, so it cannot drive its own change notification in a loop.
    expect(setItem).not.toHaveBeenCalled();
    setItem.mockRestore();
  });

  it("keeps a role recorded earlier alongside the new one", () => {
    const earlier = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify({ tenant: { addedAt: earlier } }));
    params.value = new URLSearchParams("newRole=landlord");

    render(<DashboardHeader {...PROPS} />);

    expect(Object.keys(stored()).sort()).toEqual(["landlord", "tenant"]);
  });
});
