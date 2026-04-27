/**
 * Services Components Index
 * 
 * Central export point for all services-related components.
 * Fiverr-style marketplace architecture.
 */

// Card Components
export { ProviderCard, ProviderCardSkeleton } from "./ProviderCard";

// Grid & Layout
export { CategoryGrid, CategoryGridSkeleton } from "./CategoryGrid";
export { ProvidersGrid } from "./ProvidersGrid";
export { FeaturedProviders, FeaturedProvidersSkeleton } from "./FeaturedProviders";

// Search (Fiverr-style)
export { ServiceSearchAutocomplete } from "./ServiceSearchAutocomplete";
export { ServiceFilterSidebar, ActiveFilterChips } from "./ServiceFilterSidebar";
export { CategoryQuickNav, CategoryQuickNavSkeleton } from "./CategoryQuickNav";
export { SortDropdown } from "./SortDropdown";
export { SuggestedTags, SuggestedTagsCompact } from "./SuggestedTags";
export { FeaturedByPrice, FeaturedByPriceSkeleton } from "./FeaturedByPrice";

// Legacy Filters (kept for backwards compatibility)
export { ServicesFilters } from "./ServicesFilters";

// Hero
export { ServicesHero } from "./ServicesHero";

// Compare Feature
export {
  CompareBar,
  CompareButton,
  CompareProvidersProvider,
  useCompareProviders,
} from "./CompareProviders";

// Error Handling
export { SectionErrorBoundary } from "./SectionErrorBoundary";
