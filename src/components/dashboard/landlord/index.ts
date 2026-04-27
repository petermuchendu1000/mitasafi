/**
 * Landlord Dashboard Components - Barrel Export
 * 
 * Central export point for all landlord dashboard components.
 */

// Main sidebar
export { LandlordSidebar } from "./LandlordSidebar";

// Header
export { LandlordDashboardHeader } from "./LandlordDashboardHeader";

// Sidebar sub-components
export { SidebarNavItem } from "./SidebarNavItem";
export { SidebarSection } from "./SidebarSection";
export { SidebarProfile } from "./SidebarProfile";

// Configuration
export { 
  landlordNavSections, 
  landlordFooterNavItems, 
  signOutNavItem 
} from "./navigation-config";

// Types
export type { 
  NavItem, 
  NavSection, 
  SidebarState, 
  SidebarContextValue, 
  SidebarUserProfile 
} from "./types";
