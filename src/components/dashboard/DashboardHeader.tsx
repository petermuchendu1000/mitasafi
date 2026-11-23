"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { UserProfileDropdown } from "./UserProfileDropdown";
import type { UserRole } from "@/types/db-helpers";
import { normalizeRoleParam } from "@/lib/identity/roles";

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
