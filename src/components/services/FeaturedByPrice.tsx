// =============================================================================
// MITASAFI: FEATURED BY PRICE SECTION
// =============================================================================
// Displays provider recommendations grouped by price tiers like Fiverr.
// "Top-rated this month"
// =============================================================================

"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn, formatCurrency } from "@/lib/utils";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ServiceProviderCardData } from "@/types/service-providers";

// =============================================================================
// TYPES
// =============================================================================

interface PriceTier {
  id: string;
  label: string;
  range: string;
  minPrice: number;
  maxPrice: number | null;
}

// =============================================================================
// PRICE TIERS
// =============================================================================

const PRICE_TIERS: PriceTier[] = [
  { id: "budget", label: "Under KSh 5k", range: "Under KSh 5,000", minPrice: 0, maxPrice: 5000 },
  { id: "moderate", label: "KSh 5k - 15k", range: "KSh 5,000 - 15,000", minPrice: 5000, maxPrice: 15000 },
  { id: "standard", label: "KSh 15k - 30k", range: "KSh 15,000 - 30,000", minPrice: 15000, maxPrice: 30000 },
  { id: "premium", label: "Above KSh 30k", range: "Above KSh 30,000", minPrice: 30000, maxPrice: null },
];

// =============================================================================
// PROVIDER CARD
// =============================================================================

interface ProviderMiniCardProps {
  provider: ServiceProviderCardData;
}

function ProviderMiniCard({ provider }: ProviderMiniCardProps) {
  const [imgError, setImgError] = useState(false);
  const handleImgError = useCallback(() => setImgError(true), []);

  const showImage = provider.logo_url && !imgError;

  return (
    <Link
      href={`/services/provider/${provider.id}`}
      className="group flex-shrink-0 w-[260px] bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 overflow-hidden"
    >
      {/* Header with Avatar */}
      <div className="p-4 pb-2 flex items-start gap-3">
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border-2 border-white shadow">
            {showImage ? (
              <Image
                src={provider.logo_url!}
                alt={provider.business_name}
                width={48}
                height={48}
                sizes="48px"
                className="object-cover w-full h-full"
                onError={handleImgError}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-brand-100 text-brand-600 font-semibold text-lg">
                {provider.business_name.charAt(0)}
              </div>
            )}
          </div>
          {/* Verification Badge */}
          {provider.is_verified && (
            <div className="absolute -bottom-0.5 -right-0.5 w-5 h-5 bg-brand-500 rounded-full flex items-center justify-center border-2 border-white">
              <span className="text-[8px] font-bold text-white">✓</span>
            </div>
          )}
        </div>

        {/* Name & Rating */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
              {provider.business_name}
            </h3>
          </div>
          {/* Rating */}
          {provider.rating_average ? (
            <div className="flex items-center gap-1 mt-0.5">
              <span className="text-sm text-amber-500">★</span>
              <span className="text-sm font-medium text-gray-900">
                {provider.rating_average.toFixed(1)}
              </span>
              {provider.rating_count && (
                <span className="text-sm text-gray-500">
                  ({provider.rating_count > 999 ? "1k+" : provider.rating_count})
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-gray-500">New provider</span>
          )}
        </div>
      </div>

      {/* Service Title */}
      <div className="px-4 pb-2">
        <p className="text-sm text-gray-600 line-clamp-2 min-h-[40px]">
          I will {(provider.tagline ?? "provide professional services").toLowerCase()}
        </p>
      </div>

      {/* Footer */}
      <div className="px-4 pb-4 flex items-center justify-between">
        {/* Badges */}
        <div className="flex items-center gap-2">
          {provider.instant_booking && (
            <span className="text-xs text-brand-600 font-medium">Instant</span>
          )}
          {provider.is_available && (
            <span className="text-xs text-green-600 font-medium">Available</span>
          )}
        </div>

        {/* Price */}
        <div className="text-right">
          <span className="text-xs text-gray-500">From</span>
          <span className="ml-1 font-bold text-gray-900">
            {provider.min_price ? formatCurrency(provider.min_price) : "Quote"}
          </span>
        </div>
      </div>
    </Link>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

interface FeaturedByPriceProps {
  providers: ServiceProviderCardData[];
  className?: string;
}

export function FeaturedByPrice({ providers, className }: FeaturedByPriceProps) {
  const [selectedTier, setSelectedTier] = useState<string | null>(null);
  const [scrollPosition, setScrollPosition] = useState(0);

  // Group providers by price tier
  const providersByTier = PRICE_TIERS.reduce((acc, tier) => {
    acc[tier.id] = providers.filter((p) => {
      const price = p.min_price || 0;
      if (tier.maxPrice === null) {
        return price >= tier.minPrice;
      }
      return price >= tier.minPrice && price < tier.maxPrice;
    });
    return acc;
  }, {} as Record<string, ServiceProviderCardData[]>);

  // Get providers to display
  const displayProviders = selectedTier
    ? providersByTier[selectedTier] || []
    : providers.slice(0, 8);

  const handleScroll = (direction: "left" | "right") => {
    const container = document.getElementById("featured-price-scroll");
    if (!container) return;
    const scrollAmount = 280;
    const newPosition =
      direction === "left"
        ? Math.max(0, scrollPosition - scrollAmount)
        : scrollPosition + scrollAmount;
    container.scrollTo({ left: newPosition, behavior: "smooth" });
    setScrollPosition(newPosition);
  };

  if (providers.length === 0) return null;

  return (
    <section className={cn("relative", className)}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">
            Top-rated this month
          </h2>
        </div>

        {/* Price Tier Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedTier(null)}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
              selectedTier === null
                ? "bg-gray-900 text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            )}
          >
            All
          </button>
          {PRICE_TIERS.map((tier) => {
            const count = providersByTier[tier.id]?.length || 0;
            if (count === 0) return null;
            return (
              <button
                key={tier.id}
                onClick={() => setSelectedTier(tier.id)}
                className={cn(
                  "px-4 py-2 text-sm font-medium rounded-full whitespace-nowrap transition-colors",
                  selectedTier === tier.id
                    ? "bg-gray-900 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                )}
              >
                {tier.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Scroll Container */}
      <div className="relative group">
        {/* Left Arrow */}
        <button
          onClick={() => handleScroll("left")}
          className={cn(
            "absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity",
            scrollPosition === 0 && "hidden"
          )}
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>

        {/* Cards Container */}
        <div
          id="featured-price-scroll"
          className="flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
          style={{ scrollbarWidth: 'thin' }}
          onScroll={(e) => setScrollPosition(e.currentTarget.scrollLeft)}
        >
          {displayProviders.length > 0 ? (
            displayProviders.map((provider) => (
              <ProviderMiniCard key={provider.id} provider={provider} />
            ))
          ) : (
            <div className="w-full py-8 text-center text-gray-500">
              No providers found in this price range
            </div>
          )}
        </div>

        {/* Right Arrow */}
        <button
          onClick={() => handleScroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
    </section>
  );
}

// =============================================================================
// SKELETON LOADER
// =============================================================================

export function FeaturedByPriceSkeleton() {
  return (
    <section>
      <div className="flex items-center justify-between mb-6">
        <div className="h-7 w-96 bg-gray-200 rounded animate-pulse" />
        <div className="flex gap-2">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-9 w-24 bg-gray-200 rounded-full animate-pulse" />
          ))}
        </div>
      </div>
      <div className="flex gap-4 overflow-hidden">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="flex-shrink-0 w-[260px] h-[180px] bg-gray-200 rounded-xl animate-pulse" />
        ))}
      </div>
    </section>
  );
}
