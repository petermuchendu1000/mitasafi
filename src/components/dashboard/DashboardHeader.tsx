"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { UserProfileDropdown } from "./UserProfileDropdown";
import type { UserRole } from "@/types/db-helpers";
import { normalizeRoleParam } from "@/lib/identity/roles";
import { markRoleNewlyAdded } from "@/lib/identity/newly-added-roles";

interface DashboardHeaderProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  currentRole: UserRole;
  allRoles: { role: UserRole; is_verified: boolean }[];
}

// Inner component that uses useSearchParams
function DashboardHeaderInner({
  userName,
  userEmail,
  avatarUrl,
  currentRole,
  allRoles,
}: DashboardHeaderProps) {
  const searchParams = useSearchParams();
  // `as UserRole` asserted something nothing had checked, on a value that comes
  // straight from the query string. UserProfileDropdown's storage path was already
  // hardened this way; the URL path is the same hole and is one line from the same fix.
  // normalizeRoleParam returns null for anything unrecognised, so ?newRole=junk no
  // longer reaches roleConfig[...] as a key.
  const newRole = normalizeRoleParam(searchParams.get("newRole"));

  // Remember that this role was just added, so the "New" badge survives the
  // ?newRole= parameter leaving the URL.
  //
  // This is the writer that went missing. RoleSwitchBanner was the only caller of
  // markRoleNewlyAdded and has been deleted for having no call sites of its own —
  // but it was never rendered either, so the key has in fact never been written and
  // the badge has only ever lasted as long as the query parameter. Recording it here
  // is where it belonged anyway: this is the component that learns a role was added,
  // and it is on every dashboard page rather than on a banner nobody mounted.
  //
  // markRoleNewlyAdded does not overwrite an existing timestamp, so revisiting the
  // URL does not extend the seven days; and it writes nothing when the role is
  // already recorded, so it cannot loop through its own notification. No setState
  // here — the badge is derived from the store inside UserProfileDropdown.
  useEffect(() => {
    if (newRole) markRoleNewlyAdded(newRole);
  }, [newRole]);

  return (
    <UserProfileDropdown
      userName={userName}
      userEmail={userEmail}
      avatarUrl={avatarUrl}
      currentRole={currentRole}
      allRoles={allRoles}
      newlyAddedRole={newRole}
    />
  );
}

// Wrapped component with Suspense for useSearchParams
export function DashboardHeader(props: DashboardHeaderProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center gap-2 px-3 py-2">
          <div className="w-8 h-8 rounded-full bg-gray-200 animate-pulse" />
          <div className="hidden sm:block">
            <div className="w-20 h-4 bg-gray-200 rounded animate-pulse" />
            <div className="w-16 h-3 bg-gray-200 rounded mt-1 animate-pulse" />
          </div>
        </div>
      }
    >
      <DashboardHeaderInner {...props} />
    </Suspense>
  );
}

// Export individual components for flexible usage
export { UserProfileDropdown } from "./UserProfileDropdown";
