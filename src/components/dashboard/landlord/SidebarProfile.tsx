/**
 * SidebarProfile Component
 * 
 * Displays user profile information in the sidebar header.
 * Shows avatar, name, verification status, and view profile link.
 */

"use client";

import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { CheckCircle, User } from "lucide-react";
import type { SidebarUserProfile } from "./types";

interface SidebarProfileProps {
  profile: SidebarUserProfile;
  /** Whether sidebar is in collapsed (icon-only) mode */
  isCollapsed?: boolean;
}

export function SidebarProfile({ profile, isCollapsed = false }: SidebarProfileProps) {
  // Role display mapping
  const roleLabels = {
    landlord: "Landlord",
    tenant: "Tenant",
    service_provider: "Service Provider",
  };

  // Get initials for fallback avatar
  const initials = profile.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  if (isCollapsed) {
    // Collapsed mode: just show avatar
    return (
      <div className="px-3 py-4 flex justify-center">
        <Link
          href="/dashboard/landlord/settings"
          className={cn(
            "relative block rounded-full",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900"
          )}
          title={`${profile.name} - ${roleLabels[profile.role]}`}
        >
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              width={40}
              height={40}
              className="rounded-full ring-2 ring-teal-500"
            />
          ) : (
            <div className="w-10 h-10 rounded-full ring-2 ring-teal-500 bg-gray-700 flex items-center justify-center">
              <span className="text-sm font-semibold text-white/80">{initials}</span>
            </div>
          )}
          
          {/* Verification badge */}
          {profile.isVerified && (
            <span className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-gray-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-3 h-3 text-teal-400" />
            </span>
          )}
        </Link>
      </div>
    );
  }

  return (
    <div className="px-4 py-4">
      <div className="flex flex-col items-center text-center">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          {profile.avatarUrl ? (
            <Image
              src={profile.avatarUrl}
              alt={profile.name}
              width={48}
              height={48}
              className="rounded-full ring-2 ring-teal-500"
            />
          ) : (
            <div className="w-12 h-12 rounded-full ring-2 ring-teal-500 bg-gray-700 flex items-center justify-center">
              <User className="w-6 h-6 text-gray-400" />
            </div>
          )}
          
          {/* Verification badge */}
          {profile.isVerified && (
            <span className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-gray-900 rounded-full flex items-center justify-center">
              <CheckCircle className="w-3.5 h-3.5 text-teal-400" />
            </span>
          )}
        </div>

        {/* User info */}
        <div className="mt-3">
          <h3 className="text-white font-semibold text-[15px]">
            {profile.name}
          </h3>
          <p className="text-white/60 text-sm">
            {roleLabels[profile.role]}
          </p>
        </div>
      </div>
    </div>
  );
}
