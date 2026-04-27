/**
 * Services Page - Fiverr-Style Marketplace
 * 
 * Unified search hub for 700+ services with:
 * - Search-first UX (autocomplete with suggestions)
 * - Faceted sidebar filters
 * - Category quick-nav chips
 * - URL state persistence
 * - Responsive sidebar/sheet layout
 * 
 * URL Pattern: /services?category=X&subcategory=Y&q=search
 * All routes resolve to this single page with different filter states.
 * 
 * Performance optimizations:
 * - Server-side data fetching
 * - Parallel data loading
 * - Incremental static regeneration ready
 * - Optimistic UI updates
 * 
 * Design: 70% teal (brand), 30% orange (CTA accents)
 */

import { Metadata } from "next";
import { Suspense } from "react";
import {
  ServiceSearchAutocomplete,
  ServiceFilterSidebar,
  ActiveFilterChips,
  CategoryQuickNav,
  CategoryQuickNavSkeleton,
  ProvidersGrid,
  FeaturedProviders,
  FeaturedProvidersSkeleton,
  CompareBar,
  CompareProvidersProvider,
  SortDropdown,
  FeaturedByPrice,
  FeaturedByPriceSkeleton,
  SectionErrorBoundary,
} from "@/components/services";
import { getProviders, getFeaturedProviders } from "@/lib/services/providers";
import { getCategoriesWithSubs } from "@/lib/services/categories";
import {
  PROVIDERS_PER_PAGE,
  SERVICE_CATEGORIES,
} from "@/lib/constants";
import { ServicesMobileFilterButton } from "./mobile-filter-button";
import { QuickFilterToggle } from "./quick-filter-toggle";
import Link from "next/link";

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: "Services | Find Trusted Service Providers | MitaSafi",
  description:
    "Browse 700+ verified service providers in Nairobi. Moving, cleaning, repairs, interior works, security, and more. Compare quotes, read reviews, and book instantly.",
  keywords: [
    "service providers Nairobi",
    "home services Kenya",
    "moving services",
    "cleaning services",
    "repair services",
    "interior design Kenya",
    "verified contractors",
    "plumber Nairobi",
    "electrician Kenya",
    "house cleaning service",
  ],
  openGraph: {
    title: "Services | Find Trusted Service Providers | MitaSafi",
    description:
      "Browse verified service providers in Nairobi. Moving, cleaning, repairs, and more.",
    type: "website",
  },
};

// =============================================================================
// TYPES
// =============================================================================

interface SearchParams {
  category?: string;
  subcategory?: string;
  services?: string;
  area?: string;
  price?: string;
  priceMin?: string;
  priceMax?: string;
  rating?: string;
  verified?: string;
  available?: string;
  instant?: string;
  sort?: string;
  page?: string;
  q?: string;
}

interface PageProps {
  searchParams: Promise<SearchParams>;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function parseFilters(params: SearchParams) {
  // Parse price range from price param or individual params
  let priceMin: number | null = null;
  let priceMax: number | null = null;

  if (params.price) {
    // Map price range IDs to actual values
    const priceRanges: Record<string, { min: number; max: number | null }> = {
      budget: { min: 0, max: 5000 },
      moderate: { min: 5000, max: 15000 },
      standard: { min: 15000, max: 30000 },
      premium: { min: 30000, max: 50000 },
      luxury: { min: 50000, max: 100000 },
      enterprise: { min: 100000, max: null },
    };

    const ranges = params.price.split(",");
    if (ranges.length > 0) {
      // Get min of all mins and max of all maxes
      ranges.forEach((rangeId) => {
        const range = priceRanges[rangeId];
        if (range) {
          if (priceMin === null || range.min < priceMin) priceMin = range.min;
          if (range.max === null) {
            priceMax = null;
          } else if (priceMax !== null && range.max > priceMax) {
            priceMax = range.max;
          }
        }
      });
    }
  } else {
    priceMin = params.priceMin ? parseInt(params.priceMin) : null;
    priceMax = params.priceMax ? parseInt(params.priceMax) : null;
  }

  // Parse areas (multi-select) — pass full array for server-side filtering
  const areas = params.area?.split(",").filter(Boolean) || [];

  return {
    category: params.category || null,
    subcategory: params.subcategory?.split(",")[0] || null, // API takes single subcategory for now
    area: areas.length > 0 ? areas : null,
    priceMin,
    priceMax,
    ratingMin: params.rating ? parseFloat(params.rating) : null,
    verifiedOnly: params.verified === "true",
    availableNow: params.available === "true",
    instantBooking: params.instant === "true",
    sort: params.sort || "recommended",
    search: params.q || null,
  };
}

function hasActiveFilters(params: SearchParams): boolean {
  return !!(
    params.category ||
    params.subcategory ||
    params.services ||
    params.area ||
    params.price ||
    params.priceMin ||
    params.priceMax ||
    params.rating ||
    params.verified === "true" ||
    params.available === "true" ||
    params.instant === "true" ||
    params.q
  );
}

// =============================================================================
// PAGE COMPONENT
// =============================================================================

export default async function ServicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = parseFilters(params);
  const page = Math.max(1, parseInt(params.page || "1", 10));
  const hasFilters = hasActiveFilters(params);

  // Parallel data fetching for performance
  const [providersResult, featuredProviders, categories] = await Promise.all([
    getProviders({
      filters,
      page,
      pageSize: PROVIDERS_PER_PAGE,
    }),
    // Featured providers: only on landing (no filters, page 1)
    !hasFilters && page === 1
      ? getFeaturedProviders(6)
      : Promise.resolve([]),
    getCategoriesWithSubs(),
  ]);

  const { providers, pagination } = providersResult;
  const totalProviders = pagination.total;
  const totalPages = pagination.totalPages;

  // Get selected category name for display
  const selectedCategory = params.category
    ? SERVICE_CATEGORIES.find((c) => c.id === params.category)
    : null;

  return (
    <CompareProvidersProvider>
      <div className="min-h-screen bg-gray-50">
        {/* ================================================================= */}
        {/* HERO SECTION — Dark premium gradient, compact */}
        {/* ================================================================= */}
        <section className="relative bg-gradient-to-b from-gray-900 via-gray-900 to-brand-950">
          {/* Subtle radial glow — replaces dated SVG pattern */}
          <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] bg-brand-500/15 rounded-full blur-[120px]" />
          </div>

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-6 lg:pt-12 lg:pb-8">
            <div className="text-center">
              {/* Headline — bolder, specific, action-oriented */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-3 text-balance animate-fade-in-up animate-fill-both animate-delay-100">
                Home services you can trust
              </h1>
              <p className="text-lg lg:text-xl text-white/70 max-w-2xl mx-auto mb-6 animate-fade-in-up animate-fill-both animate-delay-200">
                From cleaning to movers, repairs to security — compare prices, read reviews, and book online.
              </p>

              {/* Search Autocomplete — wider */}
              <div className="relative z-40 max-w-2xl xl:max-w-3xl mx-auto mb-5 animate-fade-in-up animate-fill-both animate-delay-300">
                <Suspense fallback={
                  <div className="h-14 bg-white/10 rounded-2xl animate-pulse" />
                }>
                  <ServiceSearchAutocomplete
                    variant="hero"
                    showPopularOnFocus={true}
                  />
                </Suspense>
              </div>
            </div>
          </div>
        </section>

        {/* ================================================================= */}
        {/* CATEGORY QUICK NAV — Sticky, clean */}
        {/* ================================================================= */}
        <div className="bg-white border-b border-gray-200 sticky top-0 z-30">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
            <Suspense fallback={<CategoryQuickNavSkeleton />}>
              <CategoryQuickNav variant="pills" showAllOption={true} />
            </Suspense>
          </div>
        </div>

        {/* ================================================================= */}
        {/* MAIN CONTENT */}
        {/* ================================================================= */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Featured Providers — min 3 to avoid empty-carousel look */}
          {!hasFilters && page === 1 && featuredProviders.length >= 3 && (
            <section className="mb-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">Trending pros this week</h2>
                  <p className="text-gray-600 mt-1">Top-rated professionals in Nairobi</p>
                </div>
                <Link
                  href="/services/browse?sort=rating"
                  className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors hidden sm:inline-flex items-center gap-1"
                >
                  See all →
                </Link>
              </div>
              <SectionErrorBoundary name="Featured Providers">
                <Suspense fallback={<FeaturedProvidersSkeleton />}>
                  <FeaturedProviders providers={featuredProviders} />
                </Suspense>
              </SectionErrorBoundary>
            </section>
          )}

          {/* Featured By Price — show only when enough providers */}
          {!hasFilters && page === 1 && providers.length >= 4 && (
            <section className="mb-12">
              <SectionErrorBoundary name="Price Tiers">
                <Suspense fallback={<FeaturedByPriceSkeleton />}>
                  <FeaturedByPrice providers={providers.slice(0, 20)} />
                </Suspense>
              </SectionErrorBoundary>
            </section>
          )}

          {/* Results Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div className="flex items-center gap-4">
              <div>
                <h2 className="text-xl lg:text-2xl font-bold text-gray-900">
                  {params.q ? (
                    <>Results for <span className="text-brand-600">"{params.q}"</span></>
                  ) : hasFilters ? (
                    "Filtered Results"
                  ) : (
                    "Browse all pros"
                  )}
                </h2>
                <p className="text-gray-600 mt-1">
                  {totalProviders.toLocaleString()} provider{totalProviders !== 1 ? "s" : ""} found
                  {selectedCategory && ` in ${selectedCategory.name}`}
                  {params.area && ` • ${params.area.split(",")[0]}${params.area.includes(",") ? " +" + (params.area.split(",").length - 1) : ""}`}
                </p>
              </div>
            </div>

            {/* Sort & Filter Controls */}
            <div className="flex items-center gap-3">
              {/* Quick Filter Toggles (like Fiverr's Pro services, Instant response) */}
              <div className="flex items-center gap-2">
                <QuickFilterToggle
                  label="Verified"
                  paramKey="verified"
                />
                <QuickFilterToggle
                  label="Instant"
                  paramKey="instant"
                />
              </div>
              <Suspense fallback={<div className="h-10 w-40 bg-gray-100 rounded-xl animate-pulse" />}>
                <SortDropdown />
              </Suspense>
              {/* Mobile Filter Button */}
              <ServicesMobileFilterButton categories={categories} />
            </div>
          </div>

          {/* Active Filter Chips */}
          {hasFilters && (
            <div className="mb-6">
              <ActiveFilterChips categories={categories} />
            </div>
          )}

          {/* Two-Column Layout: Sidebar + Results */}
          <div className="flex gap-8">
            {/* Desktop Sidebar */}
            <aside className="hidden lg:block w-72 flex-shrink-0">
              <ServiceFilterSidebar categories={categories} />
            </aside>

            {/* Results Grid */}
            <main className="flex-1 min-w-0">
              <SectionErrorBoundary name="Provider Results">
                <ProvidersGrid
                  providers={providers}
                  total={totalProviders}
                  page={page}
                  totalPages={totalPages}
                  isLoading={false}
                />
              </SectionErrorBoundary>
            </main>
          </div>
        </div>

        {/* Compare Bar */}
        <CompareBar />
      </div>
    </CompareProvidersProvider>
  );
}
