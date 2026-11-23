/**
 * LandlordDashboardShell Component
 *
 * Client component wrapper that manages sidebar state.
 * Handles responsive behavior, state management, and realtime notifications.
 */

"use client";

import { useState, useCallback, useEffect, useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  LandlordSidebar,
  LandlordDashboardHeader,
  type SidebarUserProfile,
} from "@/components/dashboard/landlord";
import { ToastProvider } from "@/components/ui";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { useNotifications } from "@/hooks";
import { createBooleanStore } from "@/lib/browser-storage/local-store";
import { useLocalStore } from "@/lib/browser-storage/useLocalStore";

/**
 * Whether the sidebar is collapsed, persisted across visits.
 *
 * At module scope because useLocalStore passes these functions to
 * useSyncExternalStore, which resubscribes whenever their identity changes.
 */
const sidebarCollapsedStore = createBooleanStore("sidebar-collapsed");

interface LandlordDashboardShellProps {
  children: React.ReactNode;
  profile: SidebarUserProfile;
  notificationCounts?: Record<string, number>;
}

export function LandlordDashboardShell({
  children,
  profile,
  notificationCounts: serverNotificationCounts = {},
}: LandlordDashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Read from the store, not copied into state by a mount effect. See below.
  const isSidebarCollapsed = useLocalStore(sidebarCollapsedStore);

  // Which toast the user is finished with, rather than a copy of its text.
  const [dismissedToastId, setDismissedToastId] = useState<string | null>(null);

  // Use proper notifications system
  const { unreadCount, latestNotification } = useNotifications();

  // The toast is derived from the notification, with dismissal tracked separately.
  //
  // This used to be `toastMessage` state written by an effect:
  //     if (latestNotification && !latestNotification.read_at) {
  //       setToastMessage(latestNotification.title);   // <- the reported setState
  //       ...
  //     }
  // which copied one field out of an object we already have, and took an extra commit
  // to do it. Keying on the notification's id instead means two notifications that
  // happen to share a title are distinguishable, and the toast's identity is the
  // notification rather than a loose string.
  //
  // latestNotification is only assigned when a realtime INSERT arrives
  // (useNotifications.ts:293), so its reference is stable between notifications and
  // this value does not churn.
  const activeToast =
    latestNotification &&
    !latestNotification.read_at &&
    latestNotification.id !== dismissedToastId
      ? latestNotification
      : null;

  // Auto-dismiss after five seconds. setDismissedToastId runs inside the timer
  // callback, not in the effect body, which is both what the rule cares about and the
  // honest description of what it is: a delayed event, not a derivation.
  useEffect(() => {
    if (!activeToast) return;
    const { id } = activeToast;
    const timer = setTimeout(() => setDismissedToastId(id), 5000);
    return () => clearTimeout(timer);
  }, [activeToast]);

  // Merge server-side notification counts with realtime counts
  const notificationCounts = useMemo(
    () => ({
      ...serverNotificationCounts,
      inquiries: (serverNotificationCounts.inquiries || 0) + unreadCount,
    }),
    [serverNotificationCounts, unreadCount],
  );

  // The two effects that used to live here are gone, replaced by the
  // useLocalStore(sidebarCollapsedStore) call above. What they were:
  //
  // 1. A mount effect reading localStorage into state. That is the reported setState,
  //    and it meant the first paint always drew the sidebar expanded, with the content
  //    margin at md:ml-[260px], before snapping to 72px one commit later for anyone who
  //    had collapsed it. Its cross-tab listener also ignored a removal of the key
  //    (`e.newValue !== null`), so clearing site data in another tab was not picked up.
  //
  // 2. A setInterval, every 100ms, for the lifetime of every landlord dashboard page,
  //    re-reading localStorage and comparing it with state — plus a MutationObserver
  //    that was constructed and never observed anything, so it did nothing at all. Its
  //    own comment said "This is a workaround - ideally we'd use a context". The poll
  //    was watching for writes from some other component, and there are none: a
  //    repo-wide grep finds "sidebar-collapsed" only in this file, where the toggle
  //    below already updates the value it just wrote. It was 10 reads a second to
  //    observe itself. Because the effect listed isSidebarCollapsed as a dependency, it
  //    also tore down and recreated the interval on every toggle.
  //
  // A store subscription does what the poll was reaching for, for real and for free:
  // writes notify in this tab, and the `storage` event covers the others.

  const handleMobileMenuOpen = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    // One write. The store notifies, so there is no separate setState to keep in step.
    sidebarCollapsedStore.write(!sidebarCollapsedStore.read());
  }, []);

  // Calculate total notification count for header
  const totalNotifications = Object.values(notificationCounts).reduce(
    (a, b) => a + b,
    0,
  );

  return (
    <ToastProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Sidebar */}
        <LandlordSidebar
          profile={profile}
          notificationCounts={notificationCounts}
          isMobileOpen={isMobileMenuOpen}
          onMobileClose={handleMobileMenuClose}
          isCollapsed={isSidebarCollapsed}
        />

        {/* Main content area */}
        <div
          className={cn(
            "transition-all duration-300",
            // Push content to the right on desktop
            "md:ml-[260px]",
            isSidebarCollapsed && "md:ml-[72px]",
          )}
        >
          {/* Header with NotificationCenter */}
          <LandlordDashboardHeader
            onMenuToggle={handleMobileMenuOpen}
            onSidebarToggle={handleSidebarToggle}
            notificationCount={totalNotifications}
            isSidebarCollapsed={isSidebarCollapsed}
          >
            <NotificationCenter />
          </LandlordDashboardHeader>

          {/* Page content */}
          <main className="p-4 lg:p-6">{children}</main>
        </div>

        {/* Toast notification - professional, top right */}
        {activeToast && (
          <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right fade-in duration-200">
            <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 max-w-sm">
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center mt-0.5">
                <svg
                  className="w-3 h-3 text-teal-600"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <p className="text-sm text-gray-700 flex-1">
                {activeToast.title}
              </p>
              <button
                onClick={() => setDismissedToastId(activeToast.id)}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}
      </div>
    </ToastProvider>
  );
}
