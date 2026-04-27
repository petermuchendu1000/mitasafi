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
  type SidebarUserProfile 
} from "@/components/dashboard/landlord";
import { ToastProvider } from "@/components/ui";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { useNotifications } from "@/hooks";

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
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  
  // Use proper notifications system
  const { unreadCount, latestNotification } = useNotifications();
  
  // Show toast for new notifications
  useEffect(() => {
    if (latestNotification && !latestNotification.read_at) {
      setToastMessage(latestNotification.title);
      const timer = setTimeout(() => setToastMessage(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [latestNotification]);
  
  // Merge server-side notification counts with realtime counts
  const notificationCounts = useMemo(() => ({
    ...serverNotificationCounts,
    inquiries: (serverNotificationCounts.inquiries || 0) + unreadCount,
  }), [serverNotificationCounts, unreadCount]);

  // Load sidebar collapsed state from localStorage
  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored !== null) {
      setIsSidebarCollapsed(stored === "true");
    }

    // Listen for storage changes (sync across tabs)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === "sidebar-collapsed" && e.newValue !== null) {
        setIsSidebarCollapsed(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);
    return () => window.removeEventListener("storage", handleStorage);
  }, []);

  // Also watch for changes via custom event (same tab)
  useEffect(() => {
    const observer = new MutationObserver(() => {
      const stored = localStorage.getItem("sidebar-collapsed");
      setIsSidebarCollapsed(stored === "true");
    });
    
    // This is a workaround - ideally we'd use a context
    const interval = setInterval(() => {
      const stored = localStorage.getItem("sidebar-collapsed");
      const newValue = stored === "true";
      if (newValue !== isSidebarCollapsed) {
        setIsSidebarCollapsed(newValue);
      }
    }, 100);

    return () => clearInterval(interval);
  }, [isSidebarCollapsed]);

  const handleMobileMenuOpen = useCallback(() => {
    setIsMobileMenuOpen(true);
  }, []);

  const handleMobileMenuClose = useCallback(() => {
    setIsMobileMenuOpen(false);
  }, []);

  const handleSidebarToggle = useCallback(() => {
    const newValue = !isSidebarCollapsed;
    setIsSidebarCollapsed(newValue);
    localStorage.setItem("sidebar-collapsed", String(newValue));
  }, [isSidebarCollapsed]);

  // Calculate total notification count for header
  const totalNotifications = Object.values(notificationCounts).reduce((a, b) => a + b, 0);

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
          isSidebarCollapsed && "md:ml-[72px]"
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
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
      
      {/* Toast notification - professional, top right */}
      {toastMessage && (
        <div className="fixed top-20 right-4 z-50 animate-in slide-in-from-right fade-in duration-200">
          <div className="bg-white border border-gray-200 px-4 py-3 rounded-lg shadow-lg flex items-start gap-3 max-w-sm">
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 flex items-center justify-center mt-0.5">
              <svg className="w-3 h-3 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-sm text-gray-700 flex-1">{toastMessage}</p>
            <button 
              onClick={() => setToastMessage(null)}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </div>
    </ToastProvider>
  );
}
