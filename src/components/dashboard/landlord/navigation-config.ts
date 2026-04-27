/**
 * Sidebar Navigation Configuration
 * 
 * Defines all navigation sections and items for the landlord dashboard.
 * Centralized configuration makes it easy to modify navigation structure.
 * 
 * TERMINOLOGY:
 * - "Listings" = Public advertising flow (single units for rent)
 * - "My Properties" = Private management flow (buildings with multiple units)
 */

import {
  LayoutDashboard,
  Building2,
  Megaphone,
  Home,
  Wrench,
  Users,
  FileText,
  FolderOpen,
  Wallet,
  TrendingUp,
  TrendingDown,
  Settings,
  HelpCircle,
  LogOut,
  ClipboardList,
  Plus,
  MessageSquare,
} from "lucide-react";
import type { NavSection, NavItem } from "./types";

/**
 * Main navigation sections for landlord dashboard
 * Organized by functional area for cognitive ease
 */
export const landlordNavSections: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      {
        id: "dashboard",
        label: "Dashboard",
        href: "/dashboard/landlord",
        icon: LayoutDashboard,
        description: "View your property management overview",
      },
    ],
  },
  {
    id: "listings",
    label: "Listings",
    items: [
      {
        id: "my-listings",
        label: "My Listings",
        href: "/dashboard/landlord/listings",
        icon: Megaphone,
        description: "View and manage your vacancy listings",
      },
      {
        id: "create-listing",
        label: "List a Vacancy",
        href: "/dashboard/landlord/listings/new",
        icon: Plus,
        description: "Create a new listing to find tenants",
      },
      {
        id: "inquiries",
        label: "Inquiries",
        href: "/dashboard/inquiries",
        icon: MessageSquare,
        description: "View and respond to tenant inquiries",
        // notificationCount populated via realtime hook
      },
      {
        id: "applications",
        label: "Applications",
        href: "/dashboard/landlord/applications",
        icon: FileText,
        description: "Review tenant applications",
        // notificationCount will come from database
      },
    ],
  },
  {
    id: "properties",
    label: "My Properties",
    items: [
      {
        id: "all-properties",
        label: "All Properties",
        href: "/dashboard/landlord/properties",
        icon: Building2,
        description: "Manage your properties and units",
      },
      {
        id: "add-property",
        label: "Add Property",
        href: "/dashboard/landlord/properties/new",
        icon: Home,
        description: "Register a new property to manage",
      },
      {
        id: "tenants",
        label: "Tenants",
        href: "/dashboard/landlord/tenants",
        icon: Users,
        description: "View all your tenants",
      },
      {
        id: "leases",
        label: "Leases & Files",
        href: "/dashboard/landlord/leases",
        icon: FolderOpen,
        description: "Manage lease agreements and documents",
      },
      {
        id: "maintenance",
        label: "Maintenance",
        href: "/dashboard/landlord/maintenance",
        icon: Wrench,
        description: "Handle maintenance requests",
        // notificationCount will come from database
      },
    ],
  },
  {
    id: "finances",
    label: "Finances",
    items: [
      {
        id: "rent-collection",
        label: "Rent Collection",
        href: "/dashboard/landlord/rent",
        icon: Wallet,
        description: "Collect and track rent payments",
      },
      {
        id: "income",
        label: "Income",
        href: "/dashboard/landlord/income",
        icon: TrendingUp,
        description: "View income reports and analytics",
      },
      {
        id: "expenses",
        label: "Expenses",
        href: "/dashboard/landlord/expenses",
        icon: TrendingDown,
        description: "Track property expenses",
      },
    ],
  },
];

/**
 * Footer navigation items (Settings, Help, Sign Out)
 * These appear at the bottom of the sidebar as an icon bar
 */
export const landlordFooterNavItems: NavItem[] = [
  {
    id: "reports",
    label: "Reports",
    href: "/dashboard/landlord/reports",
    icon: ClipboardList,
    description: "View reports and analytics",
  },
  {
    id: "settings",
    label: "Settings",
    href: "/dashboard/landlord/settings",
    icon: Settings,
    description: "Manage your account settings",
  },
  {
    id: "help",
    label: "Help & Support",
    href: "/dashboard/landlord/help",
    icon: HelpCircle,
    description: "Get help and contact support",
  },
];

/**
 * Sign out item (separate for special handling)
 */
export const signOutNavItem: NavItem = {
  id: "signout",
  label: "Sign Out",
  href: "/auth/signout",
  icon: LogOut,
  description: "Sign out of your account",
};
