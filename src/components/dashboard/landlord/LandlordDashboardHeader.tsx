/**
 * LandlordDashboardHeader Component
 * 
 * Top header bar for the landlord dashboard.
 * Features:
 * - Mobile menu toggle button
 * - Page title (optional)
 * - Notification bell (via children or default)
 * - Quick search (optional)
 */

"use client";

import { cn } from "@/lib/utils";
import { Menu, Bell, Search, PanelLeftClose, PanelLeft } from "lucide-react";

interface LandlordDashboardHeaderProps {
  /** Current page title */
  pageTitle?: string;
  /** Notification count for default bell icon (not used if children provided) */
  notificationCount?: number;
  /** Callback to toggle mobile sidebar */
  onMenuToggle: () => void;
  /** Callback to toggle sidebar collapse (desktop) */
  onSidebarToggle?: () => void;
  /** Whether sidebar is currently collapsed (for layout adjustment) */
  isSidebarCollapsed?: boolean;
  /** Custom notification component (replaces default bell) */
  children?: React.ReactNode;
}

export function LandlordDashboardHeader({
  pageTitle,
  notificationCount = 0,
  onMenuToggle,
  onSidebarToggle,
  isSidebarCollapsed = false,
  children,
}: LandlordDashboardHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 h-16 bg-white border-b border-gray-200",
        "flex items-center justify-between px-4 lg:px-6",
        "transition-all duration-300"
      )}
    >
      {/* Left section */}
      <div className="flex items-center gap-3">
        {/* Mobile menu toggle */}
        <button
          onClick={onMenuToggle}
          className={cn(
            "md:hidden p-2 -ml-2 rounded-lg",
            "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
            "transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          )}
          aria-label="Toggle navigation menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Desktop sidebar toggle (like Innago) */}
        {onSidebarToggle && (
          <button
            onClick={onSidebarToggle}
            className={cn(
              "hidden md:flex items-center justify-center p-2 -ml-2 rounded-lg",
              "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
              "transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            )}
            aria-label={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={isSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isSidebarCollapsed ? (
              <PanelLeft className="w-5 h-5" />
            ) : (
              <PanelLeftClose className="w-5 h-5" />
            )}
          </button>
        )}

        {/* Page title */}
        {pageTitle && (
          <h1 className="text-lg font-semibold text-gray-900 hidden sm:block">
            {pageTitle}
          </h1>
        )}
      </div>

      {/* Right section */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Search button (optional, can expand to search bar) */}
        <button
          className={cn(
            "p-2 rounded-lg",
            "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
            "transition-colors",
            "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
          )}
          aria-label="Search"
        >
          <Search className="w-5 h-5" />
        </button>

        {/* Custom notification component or default bell */}
        {children || (
          <button
            className={cn(
              "relative p-2 rounded-lg",
              "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
              "transition-colors",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
            )}
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
          >
            <Bell className="w-5 h-5" />
            
            {/* Notification badge */}
            {notificationCount > 0 && (
              <span 
                className={cn(
                  "absolute top-1 right-1 min-w-[18px] h-[18px]",
                  "flex items-center justify-center",
                  "bg-orange-500 text-white text-[10px] font-bold rounded-full",
                  "px-1"
                )}
                aria-hidden="true"
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </span>
            )}
          </button>
        )}
      </div>
    </header>
  );
}
