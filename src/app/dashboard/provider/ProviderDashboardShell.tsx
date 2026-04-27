/**
 * ProviderDashboardShell Component
 * 
 * Client component wrapper that provides the dashboard UI shell
 * with sidebar and header for service providers.
 */

"use client";

import { useState, useCallback, useRef, useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui";
import { ToastProvider, useToast } from "@/components/ui";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { reactivateProviderAccount } from "./settings/actions";
import { 
  Wrench, 
  LayoutDashboard, 
  Briefcase, 
  DollarSign, 
  Star, 
  Settings, 
  User,
  Eye,
  LogOut,
  Menu,
  X,
  MessageSquare,
  Calendar,
  FileText,
  ChevronDown,
  BadgeCheck,
  AlertTriangle,
  Loader2,
  BarChart3
} from "lucide-react";
import type { ProviderSidebarProfile } from "./layout";

interface ProviderDashboardShellProps {
  children: React.ReactNode;
  profile: ProviderSidebarProfile;
}

const navItems = [
  {
    label: "Dashboard",
    href: "/dashboard/provider",
    icon: LayoutDashboard,
  },
  {
    label: "Jobs",
    href: "/dashboard/provider/jobs",
    icon: Briefcase,
  },
  {
    label: "Messages",
    href: "/dashboard/provider/messages",
    icon: MessageSquare,
    badgeKey: "unreadMessageCount" as const,
  },
  {
    label: "My Services",
    href: "/dashboard/provider/services",
    icon: Wrench,
  },
  {
    label: "Earnings",
    href: "/dashboard/provider/earnings",
    icon: DollarSign,
  },
  {
    label: "Analytics",
    href: "/dashboard/provider/analytics",
    icon: BarChart3,
  },
  {
    label: "Reviews",
    href: "/dashboard/provider/reviews",
    icon: Star,
  },
  {
    label: "Availability",
    href: "/dashboard/provider/availability",
    icon: Calendar,
  },
  {
    label: "Quotes",
    href: "/dashboard/provider/quotes",
    icon: FileText,
  },
  {
    label: "Calendar",
    href: "/dashboard/provider/calendar",
    icon: Calendar,
  },
];

// Profile, Settings, and Sign out are now in the profile dropdown menu
// No need for separate bottomNavItems

export function ProviderDashboardShell({
  children,
  profile,
}: ProviderDashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const profileMenuRef = useRef<HTMLDivElement>(null);

  const handleMobileMenuToggle = useCallback(() => {
    setIsMobileMenuOpen(prev => !prev);
  }, []);

  const closeMobileMenu = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  // Close profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
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
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-gray-200 transform transition-transform duration-300 ease-in-out",
          "md:translate-x-0",
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          {/* Logo */}
          <div className="h-16 flex items-center justify-between px-4 border-b border-gray-100">
            <Link href="/dashboard/provider" onClick={closeMobileMenu}>
              <Logo variant="full" color="teal" size="sm" />
            </Link>
            <button 
              onClick={closeMobileMenu}
              className="md:hidden p-2 text-gray-500 hover:text-gray-700"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = pathname === item.href || 
                (item.href !== "/dashboard/provider" && pathname.startsWith(item.href));
              
              // Resolve badge count from profile
              const badgeCount = item.badgeKey ? (profile as unknown as Record<string, unknown>)[item.badgeKey] as number ?? 0 : 0;
              
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
                    <item.icon className={cn(
                      "w-5 h-5",
                      isActive ? "text-brand-600" : "text-gray-400"
                    )} />
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
          <div className="p-4 border-t border-gray-200 relative" ref={profileMenuRef}>
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
                {profile.isVerified && (
                  <div className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 bg-white rounded-full flex items-center justify-center">
                    <BadgeCheck className="w-4 h-4 text-green-500" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0 text-left">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {profile.name}
                </p>
                <p className="text-xs text-gray-500 truncate">
                  {profile.isVerified ? "Verified Provider" : "Service Provider"}
                </p>
              </div>
              <ChevronDown className={cn(
                "w-4 h-4 text-gray-400 transition-transform",
                isProfileMenuOpen && "rotate-180"
              )} />
            </button>

            {/* Profile Dropdown Menu */}
            {isProfileMenuOpen && (
              <div className="absolute top-full left-4 right-4 mt-2 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
                <Link
                  href={`/services/provider/${profile.providerId}`}
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Eye className="w-4 h-4 text-gray-400" />
                  View Profile
                </Link>
                <Link
                  href="/dashboard/provider/profile"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <User className="w-4 h-4 text-gray-400" />
                  Edit Profile
                </Link>
                <Link
                  href="/dashboard/provider/settings"
                  onClick={() => setIsProfileMenuOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Settings className="w-4 h-4 text-gray-400" />
                  Account Settings
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

        {/* Main content area */}
        <div className="md:ml-64">
          {/* Header */}
          <header className="sticky top-0 z-30 h-16 bg-white border-b border-gray-200 flex items-center justify-between px-4 lg:px-6">
            <div className="flex items-center gap-4">
              <button
                onClick={handleMobileMenuToggle}
                className="md:hidden p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <Menu className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
                  Provider Dashboard
                </h1>
                {profile.isVerified && (
                  <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 bg-green-50 text-green-700 text-xs font-medium rounded-full border border-green-200">
                    <BadgeCheck className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href="/dashboard/provider/messages"
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg relative"
              >
                <MessageSquare className="w-5 h-5" />
                {profile.unreadMessageCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 flex items-center justify-center text-[9px] font-bold text-white bg-red-500 rounded-full">
                    {profile.unreadMessageCount > 99 ? "99+" : profile.unreadMessageCount}
                  </span>
                )}
              </Link>
              <NotificationCenter />
            </div>
          </header>

          {/* Deactivation banner — visible on all dashboard pages when account is inactive */}
          {!profile.isAccountActive && (
            <DeactivationBanner router={router} />
          )}

          {/* Page content */}
          <main className="p-4 lg:p-6">
            {children}
          </main>
        </div>
      </div>
    </ToastProvider>
  );
}

// =============================================================================
// DEACTIVATION BANNER SUBCOMPONENT
// =============================================================================

function DeactivationBanner({ router }: { router: ReturnType<typeof useRouter> }) {
  const { success: showSuccess, error: showError } = useToast();
  const [isReactivating, startReactivation] = useTransition();

  const handleReactivate = useCallback(() => {
    startReactivation(async () => {
      const result = await reactivateProviderAccount();
      if (!result.success) {
        showError("Reactivation failed", result.error || "Please try again");
      } else {
        showSuccess("Account reactivated", "Your profile is now visible to clients");
        router.refresh();
      }
    });
  }, [router, showSuccess, showError]);

  return (
    <div className="bg-amber-50 border-b border-amber-200 px-4 lg:px-6 py-3">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-medium text-amber-800">
              Your account is deactivated
            </p>
            <p className="text-xs text-amber-600 mt-0.5">
              Your profile and services are hidden from clients. Reactivate to become visible again.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleReactivate}
          disabled={isReactivating}
          className="flex-shrink-0 px-4 py-2 text-sm font-medium text-amber-800 bg-amber-100 border border-amber-300 rounded-lg hover:bg-amber-200 transition-colors disabled:opacity-50 flex items-center gap-2"
        >
          {isReactivating && <Loader2 className="w-4 h-4 animate-spin" />}
          Reactivate
        </button>
      </div>
    </div>
  );
}
