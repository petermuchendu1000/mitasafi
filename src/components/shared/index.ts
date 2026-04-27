/**
 * Shared Components Index
 * 
 * Centralized exports for reusable components across the application.
 */

// Listing Card
export { ListingCard, ListingCardSkeleton } from "./ListingCard";
export {
  type ListingCardData,
  type ListingCategory,
  type CommercialType,
  type ListingStatus,
  PROPERTY_TYPE_LABELS,
  STATUS_BADGE_CONFIG,
  formatCurrency,
  getRelativeTime,
  generateListingSlug,
} from "./listing-types";

// Notification Center
export { NotificationCenter } from "./NotificationCenter";
