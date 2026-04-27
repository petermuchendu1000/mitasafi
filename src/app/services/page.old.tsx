/**
 * Services Page
 * 
 * Main marketplace page for browsing service providers.
 * URL: /services
 * 
 * Features:
 * - Hero section with search
 * - Category grid for quick filtering
 * - Featured providers carousel
 * - Full provider grid with filters
 * - Pagination
 * - Compare providers functionality
 * 
 * Layout: Full-width hero, then max-width content sections
 * Design: 70% teal (brand), 30% orange (CTA accents)
 */

import { Metadata } from "next";
import { Suspense } from "react";
import {
  ServicesHero,
  FeaturedProviders,
  ProvidersGrid,
  ServicesFilters,
  CategoryGrid,
  CategoryGridSkeleton,
  CompareBar,
  CompareProvidersProvider,
} from "@/components/services";
import { getProviders, getFeaturedProviders } from "@/lib/services/providers";
import { getCategoriesWithSubs } from "@/lib/services/categories";
import {
  PROVIDERS_PER_PAGE,
  PROVIDER_SORT_OPTIONS,
  SERVICE_CATEGORIES,
} from "@/lib/constants";

// =============================================================================
// METADATA
// =============================================================================

export const metadata: Metadata = {
  title: "Services | Find Trusted Service Providers | MitaSafi",
  description:
    "Browse verified service providers in Nairobi. Moving, cleaning, repairs, interior works, security, and more. Compare quotes, read reviews, and book instantly.",
  keywords: [
    "service providers Nairobi",
    "home services Kenya",
    "moving services",
    "cleaning services",
    "repair services",
    "interior design Kenya",
    "verified contractors",
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
  area?: string;
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
// PAGE COMPONENT
// =============================================================================

export default async function ServicesPage({ searchParams }: PageProps) {
  const params = await searchParams;
  
  // Parse search params into filters
  const filters = {
    category: params.category || null,
    subcategory: params.subcategory || null,
    area: params.area ? params.area.split(",").filter(Boolean) : null,
    priceMin: params.priceMin ? parseInt(params.priceMin) : null,
    priceMax: params.priceMax ? parseInt(params.priceMax) : null,
    ratingMin: params.rating ? parseFloat(params.rating) : null,
    verifiedOnly: params.verified === "true",
    availableNow: params.available === "true",
    instantBooking: params.instant === "true",
    sort: params.sort || "recommended",
    search: params.q || null,
  };
  
  const page = parseInt(params.page || "1", 10);
  
  // Determine if we're in filtered mode (has any filters applied)
  const hasFilters = !!(
    filters.category ||
    filters.subcategory ||
    filters.area ||
    filters.priceMin ||
    filters.priceMax ||
    filters.ratingMin ||
    filters.verifiedOnly ||
    filters.availableNow ||
    filters.instantBooking ||
    filters.search
  );
  
  // Fetch data in parallel
  const [providersResult, featuredProviders, categories] = await Promise.all([
    // Main providers list
    getProviders({
      filters,
      page,
      pageSize: PROVIDERS_PER_PAGE,
    }),
    // Featured providers (only on first page without filters)
    !hasFilters && page === 1 ? getFeaturedProviders(6) : Promise.resolve([]),
    // Categories with subcategories
    getCategoriesWithSubs(),
  ]);
  
  // Get subcategories for the selected category
  const selectedCategoryData = filters.category
    ? categories.find((cat) => cat.id === filters.category)
    : null;
  const subcategories = selectedCategoryData?.subcategories || [];
  
  // Pagination info
  const totalProviders = providersResult.pagination.total;
  const totalPages = providersResult.pagination.totalPages;
  
  return (
    <CompareProvidersProvider>
      <div className="min-h-screen bg-gray-50">
        {/* Hero Section */}
        <ServicesHero />
        
        {/* Main Content */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Category Quick Nav (only on landing view) */}
          {!hasFilters && page === 1 && (
            <section className="py-12">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Browse by Category
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Find the right service for your needs
                  </p>
                </div>
              </div>
              <Suspense fallback={<CategoryGridSkeleton />}>
                <CategoryGrid
                  variant="featured"
                  columns={4}
                  showDescription={true}
                  showArrow={true}
                />
              </Suspense>
            </section>
          )}
          
          {/* Featured Providers (only on landing view) */}
          {!hasFilters && page === 1 && featuredProviders.length > 0 && (
            <section className="py-12 border-t border-gray-200">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    Featured Providers
                  </h2>
                  <p className="text-gray-600 mt-1">
                    Top-rated service providers in Nairobi
                  </p>
                </div>
              </div>
              <FeaturedProviders providers={featuredProviders} />
            </section>
          )}
          
          {/* Filters + Results Section */}
          <section className={cn(
            "pb-12",
            (!hasFilters && page === 1) ? "pt-0 border-t border-gray-200" : "pt-8"
          )}>
            {/* Section Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold text-gray-900">
                  {hasFilters
                    ? `${totalProviders} Provider${totalProviders !== 1 ? "s" : ""} Found`
                    : "All Service Providers"}
                </h2>
                {filters.category && (
                  <p className="text-gray-600 mt-1">
                    in {SERVICE_CATEGORIES.find((c) => c.id === filters.category)?.name || filters.category}
                    {filters.area && ` • ${filters.area}`}
                  </p>
                )}
              </div>
            </div>
            
            {/* Filters Bar */}
            <div className="mb-6">
              <ServicesFilters
                hideSearch={!hasFilters && page === 1}
                showCategoryFilter={true}
                subcategories={subcategories.map((sub: { id: string; name: string }) => ({
                  id: sub.id,
                  name: sub.name,
                }))}
              />
            </div>
            
            {/* Providers Grid */}
            <ProvidersGrid
              providers={providersResult.providers}
              total={totalProviders}
              page={page}
              totalPages={totalPages}
              isLoading={false}
            />
          </section>
        </div>
        
        {/* Compare Bar (floating) */}
        <CompareBar />
      </div>
    </CompareProvidersProvider>
  );
}

// Helper for classnames
function cn(...classes: (string | boolean | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}
