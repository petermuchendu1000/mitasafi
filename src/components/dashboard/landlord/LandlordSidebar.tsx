/**
 * LandlordSidebar Component
 * 
 * Main sidebar component for the landlord dashboard.
 * Features:
 * - Dark teal gradient background
 * - Grouped navigation sections
 * - Monochrome icons with semantic color accents
 * - Bottom icon bar (Reports, Settings, Help, Sign Out)
 * - Responsive: Desktop (260px), Tablet (72px collapsed), Mobile (overlay)
 * - Full accessibility support
 */

"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui";
import { X } from "lucide-react";

import { SidebarProfile } from "./SidebarProfile";
import { SidebarSection } from "./SidebarSection";
import { SidebarNavItem } from "./SidebarNavItem";
import { 
  landlordNavSections, 
  landlordFooterNavItems, 
  signOutNavItem 
} from "./navigation-config";
import type { SidebarUserProfile, NavSection } from "./types";

interface LandlordSidebarProps {
  /** User profile data */
  profile: SidebarUserProfile;
  /** Navigation sections with dynamic notification counts */
  sections?: NavSection[];
  /** Notification counts for specific items (keyed by item id) */
  notificationCounts?: Record<string, number>;
  /** Whether mobile sidebar is open (controlled externally) */
  isMobileOpen?: boolean;
  /** Callback when mobile sidebar should close */
  onMobileClose?: () => void;
  /** Whether sidebar is collapsed (controlled externally) */
  isCollapsed?: boolean;
}

export function LandlordSidebar({
  profile,
  sections = landlordNavSections,
  notificationCounts = {},
  isMobileOpen = false,
  onMobileClose,
  isCollapsed = false,
}: LandlordSidebarProps) {
  const pathname = usePathname();
  
  // Merge notification counts into sections
  const sectionsWithNotifications = sections.map((section) => ({
    ...section,
    items: section.items.map((item) => ({
      ...item,
      notificationCount: notificationCounts[item.id] ?? item.notificationCount,
    })),
  }));

  // Close mobile sidebar on route change
  useEffect(() => {
    onMobileClose?.();
  }, [pathname, onMobileClose]);

  // Handle escape key for mobile
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isMobileOpen) {
        onMobileClose?.();
      }
    };
    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [isMobileOpen, onMobileClose]);

  // Prevent body scroll when mobile sidebar is open
  useEffect(() => {
    if (isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobileOpen]);

  const sidebarContent = (
    <>
      {/* Logo */}
      <div className={cn(
        "flex items-center h-16 border-b border-white/10",
        isCollapsed ? "justify-center px-2" : "px-5"
      )}>
        <Link 
          href="/dashboard/landlord"
          className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
        >
          {isCollapsed ? (
            <Logo variant="icon" color="white" size="sm" />
          ) : (
            <Logo variant="full" color="white" size="sm" />
          )}
        </Link>
      </div>

      {/* Profile Section */}
      <div className="border-b border-white/10">
        <SidebarProfile profile={profile} isCollapsed={isCollapsed} />
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-sidebar">
        {sectionsWithNotifications.map((section) => (
          <SidebarSection 
            key={section.id} 
            section={section} 
            isCollapsed={isCollapsed}
          />
        ))}
      </div>

      {/* Bottom Icon Bar */}
      <div className="border-t border-white/10 px-2 py-3">
        <nav 
          className={cn(
            "flex items-center gap-1",
            isCollapsed ? "flex-col" : "justify-around"
          )} 
          aria-label="Secondary navigation"
        >
          {landlordFooterNavItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            
            return (
              <Link
                key={item.id}
                href={item.href}
                className={cn(
                  "flex items-center justify-center p-2.5 rounded-lg transition-colors",
                  "text-gray-400 hover:text-white hover:bg-white/10",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                  isActive && "text-white bg-white/10"
                )}
                title={item.label}
                aria-label={item.label}
              >
                <IconComponent className="w-5 h-5" strokeWidth={1.5} />
              </Link>
            );
          })}
          
          {/* Sign Out - with separator */}
          {(() => {
            const IconComponent = signOutNavItem.icon;
            return (
              <Link
                href={signOutNavItem.href}
                className={cn(
                  "flex items-center justify-center p-2.5 rounded-lg transition-colors",
                  "text-gray-400 hover:text-red-400 hover:bg-white/10",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                  !isCollapsed && "ml-2 pl-3 border-l border-white/10"
                )}
                title={signOutNavItem.label}
                aria-label={signOutNavItem.label}
              >
                <IconComponent className="w-5 h-5" strokeWidth={1.5} />
              </Link>
            );
          })()}
        </nav>
      </div>
    </>
  );

  return (
    <>
      {/* Desktop/Tablet Sidebar */}
      <aside
        className={cn(
          "hidden md:flex flex-col fixed left-0 top-0 bottom-0 z-40",
          "bg-gradient-to-b from-gray-900 to-teal-950",
          "border-r border-white/10 transition-all duration-300",
          isCollapsed ? "w-[72px]" : "w-[260px]"
        )}
        aria-label="Main navigation"
      >
        {sidebarContent}
      </aside>

      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          {/* Backdrop */}
          <div 
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onMobileClose}
            aria-hidden="true"
          />
          
          {/* Sidebar */}
          <aside
            className={cn(
              "absolute left-0 top-0 bottom-0 w-[280px]",
              "bg-gradient-to-b from-gray-900 to-teal-950",
              "flex flex-col animate-in slide-in-from-left duration-300"
            )}
            aria-label="Main navigation"
          >
            {/* Mobile Close Button */}
            <button
              onClick={onMobileClose}
              className={cn(
                "absolute top-4 right-4 p-2 rounded-lg",
                "text-gray-400 hover:text-white hover:bg-white/10 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400"
              )}
              aria-label="Close menu"
            >
              <X className="w-5 h-5" />
            </button>
            
            {/* Reuse sidebar content (never collapsed on mobile) */}
            {/* Logo */}
            <div className="flex items-center h-16 border-b border-white/10 px-5">
              <Link 
                href="/dashboard/landlord"
                className="focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400 rounded"
              >
                <Logo variant="full" color="white" size="sm" />
              </Link>
            </div>

            {/* Profile Section */}
            <div className="border-b border-white/10">
              <SidebarProfile profile={profile} isCollapsed={false} />
            </div>

            {/* Navigation Sections */}
            <div className="flex-1 overflow-y-auto px-2 py-2 scrollbar-sidebar">
              {sectionsWithNotifications.map((section) => (
                <SidebarSection 
                  key={section.id} 
                  section={section} 
                  isCollapsed={false}
                />
              ))}
            </div>

            {/* Bottom Icon Bar */}
            <div className="border-t border-white/10 px-2 py-3">
              <nav 
                className="flex items-center justify-around" 
                aria-label="Secondary navigation"
              >
                {landlordFooterNavItems.map((item) => {
                  const IconComponent = item.icon;
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                  
                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      onClick={onMobileClose}
                      className={cn(
                        "flex items-center justify-center p-2.5 rounded-lg transition-colors",
                        "text-gray-400 hover:text-white hover:bg-white/10",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                        isActive && "text-white bg-white/10"
                      )}
                      title={item.label}
                      aria-label={item.label}
                    >
                      <IconComponent className="w-5 h-5" strokeWidth={1.5} />
                    </Link>
                  );
                })}
                
                {/* Sign Out */}
                {(() => {
                  const IconComponent = signOutNavItem.icon;
                  return (
                    <Link
                      href={signOutNavItem.href}
                      className={cn(
                        "flex items-center justify-center p-2.5 rounded-lg transition-colors",
                        "text-gray-400 hover:text-red-400 hover:bg-white/10",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-400",
                        "ml-2 pl-3 border-l border-white/10"
                      )}
                      title={signOutNavItem.label}
                      aria-label={signOutNavItem.label}
                    >
                      <IconComponent className="w-5 h-5" strokeWidth={1.5} />
                    </Link>
                  );
                })()}
              </nav>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
