"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { 
  ChevronDown, 
  Home, 
  Building2, 
  Wrench, 
  Settings, 
  LogOut, 
  Check,
  Sparkles,
  ArrowRightLeft
} from "lucide-react";
import type { UserRole } from "@/types/db-helpers";

const NEW_ROLES_STORAGE_KEY = "mitasafi_newly_added_roles";
const NEW_ROLE_EXPIRY_DAYS = 7; // Badge shows for 7 days after role added

interface UserProfileDropdownProps {
  userName: string;
  userEmail: string;
  avatarUrl?: string | null;
  currentRole: UserRole;
  allRoles: { role: UserRole; is_verified: boolean }[];
  newlyAddedRole?: UserRole | null;
}

// Role display configuration
const roleConfig: Record<UserRole, { 
  label: string; 
  icon: typeof Home; 
  color: string;
  bgColor: string;
  description: string;
}> = {
  tenant: {
    label: "Tenant",
    icon: Home,
    color: "text-brand-600",
    bgColor: "bg-brand-50",
    description: "Find your perfect home",
  },
  landlord: {
    label: "Landlord",
    icon: Building2,
    color: "text-cta-600",
    bgColor: "bg-cta-50",
    description: "Manage your properties",
  },
  service_provider: {
    label: "Service Provider",
    icon: Wrench,
    color: "text-success-600",
    bgColor: "bg-success-50",
    description: "Grow your business",
  },
};

export function UserProfileDropdown({
  userName,
  userEmail,
  avatarUrl,
  currentRole,
  allRoles,
  newlyAddedRole,
}: UserProfileDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [newRolesFromStorage, setNewRolesFromStorage] = useState<Set<UserRole>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  // Load newly added roles from localStorage on mount
  useEffect(() => {
    const storedData = localStorage.getItem(NEW_ROLES_STORAGE_KEY);
    if (!storedData) {
      setNewRolesFromStorage(new Set());
      return;
    }

    try {
      const parsed: Record<string, { addedAt: string }> = JSON.parse(storedData);
      const now = new Date();
      const validNewRoles = new Set<UserRole>();
      const updatedData: Record<string, { addedAt: string }> = {};

      for (const [role, data] of Object.entries(parsed)) {
        const addedAt = new Date(data.addedAt);
        const daysSinceAdded = (now.getTime() - addedAt.getTime()) / (1000 * 60 * 60 * 24);
        
        if (daysSinceAdded < NEW_ROLE_EXPIRY_DAYS) {
          validNewRoles.add(role as UserRole);
          updatedData[role] = data;
        }
      }

      // Clean up expired entries
      if (Object.keys(updatedData).length !== Object.keys(parsed).length) {
        if (Object.keys(updatedData).length > 0) {
          localStorage.setItem(NEW_ROLES_STORAGE_KEY, JSON.stringify(updatedData));
        } else {
          localStorage.removeItem(NEW_ROLES_STORAGE_KEY);
        }
      }

      setNewRolesFromStorage(validNewRoles);
    } catch {
      setNewRolesFromStorage(new Set());
    }
  }, []);

  // Also track if newlyAddedRole prop is set (from URL)
  useEffect(() => {
    if (newlyAddedRole) {
      setNewRolesFromStorage(prev => new Set([...prev, newlyAddedRole]));
    }
  }, [newlyAddedRole]);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close dropdown on escape key
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, []);

  const handleRoleSwitch = (role: UserRole) => {
    // Clear "new" status for this role when user switches to it
    if (newRolesFromStorage.has(role)) {
      const storedData = localStorage.getItem(NEW_ROLES_STORAGE_KEY);
      if (storedData) {
        try {
          const parsed: Record<string, { addedAt: string }> = JSON.parse(storedData);
          delete parsed[role];
          if (Object.keys(parsed).length > 0) {
            localStorage.setItem(NEW_ROLES_STORAGE_KEY, JSON.stringify(parsed));
          } else {
            localStorage.removeItem(NEW_ROLES_STORAGE_KEY);
          }
        } catch {
          // Ignore errors
        }
      }
      setNewRolesFromStorage(prev => {
        const updated = new Set(prev);
        updated.delete(role);
        return updated;
      });
    }

    // Update URL to reflect the active role view
    const params = new URLSearchParams(searchParams.toString());
    params.set("activeRole", role);
    params.delete("newRole"); // Clear newRole param if present
    router.push(`/dashboard?${params.toString()}`);
    setIsOpen(false);
  };

  const currentRoleConfig = roleConfig[currentRole];
  const CurrentRoleIcon = currentRoleConfig.icon;

  // Get initials for avatar fallback
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const hasMultipleRoles = allRoles.length > 1;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`
          flex items-center gap-2 px-3 py-2 rounded-lg transition-all
          ${isOpen 
            ? "bg-gray-100 ring-2 ring-brand-200" 
            : "hover:bg-gray-50"
          }
        `}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {/* Avatar */}
        <div className="relative">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={userName}
              className="w-8 h-8 rounded-full object-cover"
            />
          ) : (
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-sm font-semibold">
              {initials}
            </div>
          )}
          {/* Role indicator dot */}
          <div className={`absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white ${
            currentRole === "tenant" ? "bg-brand-500" :
            currentRole === "landlord" ? "bg-cta-500" :
            "bg-success-500"
          }`} />
        </div>

        {/* Name and Role (hidden on mobile) */}
        <div className="hidden sm:block text-left">
          <p className="text-sm font-medium text-gray-900 leading-tight">{userName}</p>
          <p className="text-xs text-gray-500 leading-tight">{currentRoleConfig.label}</p>
        </div>

        {/* Chevron with badge for multiple roles */}
        <div className="relative">
          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? "rotate-180" : ""}`} />
          {hasMultipleRoles && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-brand-500 rounded-full" />
          )}
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          {/* User Info Header */}
          <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
            <p className="font-semibold text-gray-900">{userName}</p>
            <p className="text-sm text-gray-500 truncate">{userEmail}</p>
          </div>

          {/* Role Switcher Section */}
          {hasMultipleRoles && (
            <div className="p-2 border-b border-gray-100">
              <div className="px-2 py-1.5 flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <ArrowRightLeft className="w-3 h-3" />
                Switch Dashboard View
              </div>
              
              <div className="mt-1 space-y-1">
                {allRoles.map(({ role, is_verified }) => {
                  const config = roleConfig[role];
                  const Icon = config.icon;
                  const isActive = role === currentRole;
                  // Check localStorage-based tracking instead of just URL param
                  const isNewRole = newRolesFromStorage.has(role);

                  return (
                    <button
                      key={role}
                      onClick={() => handleRoleSwitch(role)}
                      className={`
                        w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all
                        ${isActive 
                          ? `${config.bgColor} ${config.color} ring-2 ring-inset ring-current/20` 
                          : "hover:bg-gray-50 text-gray-700"
                        }
                      `}
                    >
                      <div className={`p-2 rounded-lg ${isActive ? "bg-white/60" : config.bgColor}`}>
                        <Icon className={`w-4 h-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{config.label}</span>
                          {isNewRole && (
                            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-brand-100 text-brand-700 text-xs font-semibold rounded animate-pulse">
                              <Sparkles className="w-3 h-3" />
                              New
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{config.description}</p>
                      </div>
                      {isActive && (
                        <Check className="w-5 h-5 flex-shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Single role indicator (when user has only one role) */}
          {!hasMultipleRoles && (
            <div className="px-4 py-3 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg ${currentRoleConfig.bgColor}`}>
                  <CurrentRoleIcon className={`w-4 h-4 ${currentRoleConfig.color}`} />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{currentRoleConfig.label}</p>
                  <p className="text-xs text-gray-500">{currentRoleConfig.description}</p>
                </div>
              </div>
            </div>
          )}

          {/* Menu Actions */}
          <div className="p-2">
            <Link
              href="/dashboard/settings"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </Link>
            
            <form action="/auth/signout" method="post" className="w-full">
              <button
                type="submit"
                className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign out</span>
              </button>
            </form>
          </div>

          {/* Add Role Hint (if user has less than 3 roles) */}
          {allRoles.length < 3 && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <Link
                href="/signup"
                onClick={() => setIsOpen(false)}
                className="text-xs text-brand-600 hover:text-brand-700 font-medium hover:underline"
              >
                + Add another role
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
