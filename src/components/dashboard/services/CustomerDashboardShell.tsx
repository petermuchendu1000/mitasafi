/**
 * CustomerDashboardShell Component
 *
 * Client component that provides the dashboard UI shell with sidebar
 * and header for service customers (tenants). Mirrors the provider
 * dashboard shell (ProviderDashboardShell) for consistency.
 *
 * Features:
 * - Responsive sidebar navigation (collapsible on mobile)
 * - Profile dropdown with role switching
 * - Notification bell with unread count
 * - Active link highlighting
 * - Mobile hamburger menu
 */

"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui";
import { ToastProvider } from "@/components/ui";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import {
  LayoutDashboard,
  Briefcase,
  Heart,
  MessageSquare,
  Search,
  Star,
  User,
  Settings,
  LogOut,
  Menu,
  X,
  ChevronDown,
  Bell,
  Calendar,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

export interface CustomerShellProfile {
  userId: string;
  name: string;
  email: string;
  avatarUrl: string | null;
  unreadMessageCount: number;
}

interface CustomerDashboardShellProps {
  children: React.ReactNode;
  profile: CustomerShellProfile;
}

// =============================================================================
// NAV ITEMS
// =============================================================================

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    label: "My Bookings",
    href: "/dashboard/bookings",
    icon: Briefcase,
  },
  {
    label: "Messages",
    href: "/dashboard/bookings/messages",
    icon: MessageSquare,
    badgeKey: "unreadMessageCount" as const,
  },
  {
    label: "Saved Providers",
    href: "/dashboard/saved-providers",
    icon: Heart,
  },
  {
    label: "My Reviews",
    href: "/dashboard/reviews",
    icon: Star,
  },
  {
    label: "Notifications",
    href: "/dashboard/notifications",
    icon: Bell,
  },
  {
    label: "Browse Services",
    href: "/services/browse",
    icon: Search,
    external: true,
  },
];

// =============================================================================
// COMPONENT
// =============================================================================

export function CustomerDashboardShell({
  children,
  profile,
}: CustomerDashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen((prev) => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        profileMenuRef.current &&
        !profileMenuRef.current.contains(event.target as Node)
      ) {
        setIsProfileMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Mobile menu overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={closeMobileMenu}
          />
        )}

        {/* Sidebar */}
        <aside
          className={cn(
            "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out",
            "md:translate-x-0",
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          )}
        >
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
            <Link href="/dashboard" onClick={closeMobileMenu}>
              <Logo variant="full" color="teal" size="sm" />
            </Link>
            <button
              onClick={closeMobileMenu}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700"
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = item.exact
                ? pathname === item.href
                : pathname === item.href ||
                  pathname.startsWith(item.href + "/");

              // Resolve badge count from profile
              const badgeCount = item.badgeKey
                ? (profile as unknown as Record<string, unknown>)[
                    item.badgeKey
                  ] as number ?? 0
                : 0;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={closeMobileMenu}
                  className={cn(
                    "flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
                    isActive
                      ? "bg-brand-50 text-brand-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <item.icon
                      className={cn(
                        "w-5 h-5",
                        isActive ? "text-brand-600" : "text-gray-400"
                      )}
                    />
                    {item.label}
                  </div>
                  {badgeCount > 0 && (
                    <span className="inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-[10px] font-bold text-white bg-red-500 rounded-full">
                      {badgeCount > 99 ? "99+" : badgeCount}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>

          {/* User section with dropdown */}
          <div
            className="p-4 border-t border-gray-200 relative"
            ref={profileMenuRef}
          >
            <button
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <div className="relative w-10 h-10 bg-brand-100 rounded-full flex items-center justify-center flex-shrink-0">
                {profile.avatarUrl ? (
                  <img
                    src={profile.avatarUrl}
                    alt={profile.name}
                    className="w-10 h-10 rounded-full object-cover"
                  />
                ) : (
                  <span className="text-brand-700 font-semibold text-sm">
                    {profile.name.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {profile.email}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-gray-400 transition-transform",
                  isProfileMenuOpen && "rotate-180"
                )}
              />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  href="/dashboard/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  My Profile
                </Link>
                <Link
                  href="/dashboard/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Settings
                </Link>
                <div className="border-t border-gray-100 my-1" />
                <Link
                  href="/auth/signout"
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-red-600 hover:bg-red-50"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </Link>
              </div>
            )}
          </div>
        </aside>

        {/* Header (mobile + desktop) */}
        <header className="md:ml-64 h-16 bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="flex items-center justify-between h-full px-4 sm:px-6">
            {/* Mobile hamburger */}
            <button
              onClick={handleMobileMenuToggle}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              aria-label="Open menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Desktop left spacer / breadcrumb area */}
            <div className="hidden md:block" />

            {/* Right side */}
            <div className="flex items-center gap-2 sm:gap-4">
              <NotificationCenter />
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="md:ml-64 p-4 sm:p-6 lg:p-8">{children}</main>
      </div>
    </ToastProvider>
  );
}
