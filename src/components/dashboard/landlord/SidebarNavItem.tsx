/**
 * SidebarNavItem Component
 * 
 * Individual navigation item with icon, label, and optional notification badge.
 * Supports active, hover, and disabled states with proper accessibility.
 */

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { NavItem } from "./types";

interface SidebarNavItemProps {
  item: NavItem;
  /** Whether sidebar is in collapsed (icon-only) mode */
  isCollapsed?: boolean;
}

export function SidebarNavItem({ item, isCollapsed = false }: SidebarNavItemProps) {
  const pathname = usePathname();
  
  // Determine if this item is currently active
  const isActive = pathname === item.href || 
    (item.href !== "/dashboard/landlord" && pathname.startsWith(item.href));
  
  const Icon = item.icon;
  
  // Notification badge/dot logic
  const hasNotification = item.notificationCount !== undefined && item.notificationCount > 0;
  const showDot = hasNotification && item.notificationAsDot;
  const showCount = hasNotification && !item.notificationAsDot;

  const content = (
    <>
      {/* Icon */}
      <span className="relative flex-shrink-0">
        <Icon 
          className={cn(
            "w-5 h-5 transition-colors duration-150",
            isActive ? "text-teal-400" : "text-white/70 group-hover:text-white"
          )}
          strokeWidth={1.75}
          aria-hidden="true"
        />
        
        {/* Notification dot (positioned on icon) */}
        {showDot && (
          <span 
            className="absolute -top-1 -right-1 w-2 h-2 bg-orange-500 rounded-full"
            aria-label={`${item.notificationCount} notification${item.notificationCount === 1 ? '' : 's'}`}
          />
        )}
      </span>

      {/* Label - hidden when collapsed */}
      {!isCollapsed && (
        <span className={cn(
          "flex-1 text-[15px] transition-colors duration-150 truncate",
          isActive 
            ? "text-white font-semibold" 
            : "text-white/80 font-medium group-hover:text-white"
        )}>
          {item.label}
        </span>
      )}

      {/* Notification count badge - hidden when collapsed */}
      {showCount && !isCollapsed && (
        <span 
          className="flex-shrink-0 px-2 py-0.5 text-[11px] font-semibold text-white bg-orange-500 rounded-full min-w-[20px] text-center"
          aria-label={`${item.notificationCount} notification${item.notificationCount === 1 ? '' : 's'}`}
        >
          {item.notificationCount! > 99 ? "99+" : item.notificationCount}
        </span>
      )}
    </>
  );

  // Base classes for the nav item
  const baseClasses = cn(
    "group flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-150",
    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900",
    isCollapsed ? "justify-center" : "",
    item.disabled 
      ? "opacity-50 cursor-not-allowed" 
      : "cursor-pointer",
    isActive 
      ? "bg-teal-500/20 border-l-[3px] border-teal-500 -ml-px pl-[calc(0.75rem-2px)]" 
      : "hover:bg-white/10 border-l-[3px] border-transparent -ml-px pl-[calc(0.75rem-2px)]"
  );

  // Render as disabled span if disabled
  if (item.disabled) {
    return (
      <span 
        className={baseClasses}
        aria-disabled="true"
        title={isCollapsed ? item.label : undefined}
      >
        {content}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      className={baseClasses}
      aria-current={isActive ? "page" : undefined}
      aria-describedby={item.description ? `${item.id}-description` : undefined}
      title={isCollapsed ? item.label : undefined}
    >
      {content}
      
      {/* Hidden description for screen readers */}
      {item.description && (
        <span id={`${item.id}-description`} className="sr-only">
          {item.description}
        </span>
      )}
    </Link>
  );
}
