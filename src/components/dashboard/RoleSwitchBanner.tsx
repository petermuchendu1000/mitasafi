"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { X, ArrowRight, Sparkles, Home, Building2, Wrench } from "lucide-react";
import type { UserRole } from "@/types/db-helpers";

interface RoleSwitchBannerProps {
  currentViewRole: UserRole;
  allRoles: UserRole[];
}

const BANNER_STORAGE_KEY = "mitasafi_role_banner";
const NEW_ROLES_STORAGE_KEY = "mitasafi_newly_added_roles";
const MAX_BANNER_VIEWS_PER_SESSION = 3;

// Role display configuration
const roleDisplayConfig: Record<UserRole, { label: string; icon: typeof Home; dashboardLabel: string }> = {
  tenant: {
    label: "Tenant",
    icon: Home,
    dashboardLabel: "Tenant Dashboard",
  },
  landlord: {
    label: "Landlord",
    icon: Building2,
    dashboardLabel: "Landlord Dashboard",
  },
  service_provider: {
    label: "Service Provider",
    icon: Wrench,
    dashboardLabel: "Service Provider Dashboard",
  },
};

function RoleSwitchBannerInner({ currentViewRole, allRoles }: RoleSwitchBannerProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const newRole = searchParams.get("newRole") as UserRole | null;
  
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    if (!newRole || !allRoles.includes(newRole)) {
      setIsVisible(false);
      return;
    }

    // Store the newly added role in localStorage (for badge persistence)
    const newRolesData = localStorage.getItem(NEW_ROLES_STORAGE_KEY);
    let newlyAddedRoles: Record<string, { addedAt: string }> = {};
    
    try {
      if (newRolesData) {
        newlyAddedRoles = JSON.parse(newRolesData);
      }
    } catch {
      // Invalid data
    }
    
    // Mark this role as newly added if not already
    if (!newlyAddedRoles[newRole]) {
      newlyAddedRoles[newRole] = { addedAt: new Date().toISOString() };
      localStorage.setItem(NEW_ROLES_STORAGE_KEY, JSON.stringify(newlyAddedRoles));
    }

    // Get session-based view tracking
    // Use sessionStorage for per-login tracking (clears when browser closes or new session)
    const sessionKey = `${BANNER_STORAGE_KEY}_${newRole}`;
    const sessionData = sessionStorage.getItem(sessionKey);
    
    let viewCount = 0;
    let dismissed = false;
    
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        viewCount = parsed.viewCount || 0;
        dismissed = parsed.dismissed || false;
      } catch {
        // Invalid data
      }
    }

    // If dismissed this session, don't show
    if (dismissed) {
      setIsVisible(false);
      return;
    }

    // Show banner and increment view count (up to MAX per session)
    if (viewCount < MAX_BANNER_VIEWS_PER_SESSION) {
      setIsVisible(true);
      sessionStorage.setItem(sessionKey, JSON.stringify({
        viewCount: viewCount + 1,
        dismissed: false,
      }));
    } else {
      // After max views this session, stop showing automatically
      setIsVisible(false);
    }
  }, [newRole, allRoles]);

  const handleDismiss = () => {
    if (!newRole) return;
    
    // Mark as dismissed for this session
    const sessionKey = `${BANNER_STORAGE_KEY}_${newRole}`;
    const sessionData = sessionStorage.getItem(sessionKey);
    let viewCount = 0;
    
    if (sessionData) {
      try {
        const parsed = JSON.parse(sessionData);
        viewCount = parsed.viewCount || 0;
      } catch {
        // Invalid data
      }
    }
    
    sessionStorage.setItem(sessionKey, JSON.stringify({
      viewCount,
      dismissed: true,
    }));
    
    setIsDismissed(true);
    
    // Clean URL by removing newRole param
    const params = new URLSearchParams(searchParams.toString());
    params.delete("newRole");
    const newUrl = params.toString() ? `/dashboard?${params.toString()}` : "/dashboard";
    router.replace(newUrl, { scroll: false });
  };

  const handleSwitchRole = () => {
    if (!newRole) return;
    
    // Navigate to role-specific dashboard view
    // For now, we'll use a query param; later this can be a proper route
    router.push(`/dashboard?activeRole=${newRole}`);
    
    // Also dismiss the banner
    handleDismiss();
  };

  if (!isVisible || isDismissed || !newRole) {
    return null;
  }

  const roleConfig = roleDisplayConfig[newRole];
  const RoleIcon = roleConfig.icon;

  return (
    <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 gap-4">
          {/* Left: Icon and Message */}
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div className="flex-shrink-0 p-2 bg-white/20 rounded-lg">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-sm sm:text-base truncate">
                You&apos;re now a {roleConfig.label}!
              </p>
              <p className="text-xs sm:text-sm text-white/80 hidden sm:block">
                Switch to your {roleConfig.label.toLowerCase()} dashboard to get started
              </p>
            </div>
          </div>

          {/* Right: CTA and Dismiss */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <button
              onClick={handleSwitchRole}
              className="flex items-center gap-2 px-4 py-2 bg-white text-brand-700 rounded-lg font-semibold text-sm hover:bg-white/90 transition-colors"
            >
              <RoleIcon className="w-4 h-4" />
              <span className="hidden sm:inline">View {roleConfig.dashboardLabel}</span>
              <span className="sm:hidden">Switch</span>
              <ArrowRight className="w-4 h-4" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-2 hover:bg-white/20 rounded-lg transition-colors"
              aria-label="Dismiss notification"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Internal component for direct use (when already wrapped in Suspense)
export function RoleSwitchBanner(props: RoleSwitchBannerProps) {
  return <RoleSwitchBannerInner {...props} />;
}

// Wrapper with Suspense for use in Server Components
export function RoleSwitchBannerWrapper(props: RoleSwitchBannerProps) {
  return (
    <Suspense fallback={null}>
      <RoleSwitchBannerInner {...props} />
    </Suspense>
  );
}
