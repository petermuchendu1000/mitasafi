/**
 * Landlord Dashboard Sidebar Types
 * 
 * Type definitions for navigation items, sections, and sidebar state.
 */

import type { LucideIcon } from "lucide-react";

/**
 * Individual navigation item configuration
 */
export interface NavItem {
  /** Unique identifier for the nav item */
  id: string;
  /** Display label */
  label: string;
  /** Route path */
  href: string;
  /** Lucide icon component */
  icon: LucideIcon;
  /** Optional notification count (shows badge) */
  notificationCount?: number;
  /** Whether to show notification as dot instead of count */
  notificationAsDot?: boolean;
  /** Whether item is disabled */
  disabled?: boolean;
  /** Optional description for accessibility */
  description?: string;
}

/**
 * Navigation section grouping multiple items
 */
export interface NavSection {
  /** Unique identifier for the section */
  id: string;
  /** Section header label */
  label: string;
  /** Navigation items in this section */
  items: NavItem[];
}

/**
 * Sidebar state for responsive behavior
 */
export interface SidebarState {
  /** Whether sidebar is expanded (desktop) or open (mobile) */
  isOpen: boolean;
  /** Whether sidebar is in collapsed icon-only mode (tablet) */
  isCollapsed: boolean;
}

/**
 * Props for sidebar context
 */
export interface SidebarContextValue {
  state: SidebarState;
  toggle: () => void;
  open: () => void;
  close: () => void;
  setCollapsed: (collapsed: boolean) => void;
}

/**
 * User profile data for sidebar header
 */
export interface SidebarUserProfile {
  name: string;
  email: string;
  avatarUrl?: string | null;
  isVerified: boolean;
  role: "landlord" | "tenant" | "service_provider";
}
