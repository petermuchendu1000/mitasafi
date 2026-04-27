// =============================================================================
// MITASAFI: RECENTLY VIEWED SECTION
// =============================================================================
// Displays recently viewed providers on the landing page (Fiverr-style).
// Personalized section that shows user's browsing history.
// =============================================================================

"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Container } from "@/components/ui";
import { useRecentlyViewed, type RecentlyViewedProvider } from "@/hooks/useRecentlyViewed";
import { Star, ChevronRight, Clock, X, ArrowRight } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

// =============================================================================
// PROVIDER CARD
// =============================================================================

interface ProviderCardProps {
  provider: RecentlyViewedProvider;
  onRemove: (id: string) => void;
}

function ProviderCard({ provider, onRemove }: ProviderCardProps) {
  return (
    <div className="group relative flex-shrink-0 w-[280px] bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-all duration-200">
      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(provider.id);
        }}
        className="absolute top-2 right-2 z-10 p-1.5 bg-white/90 rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-100"
        aria-label="Remove from recently viewed"
      >
        <X className="w-3.5 h-3.5 text-gray-500" />
      </button>

      <Link href={`/services/provider/${provider.id}`} className="block p-4">
        {/* Header with Logo */}
        <div className="flex items-start gap-3 mb-3">
          <div className="relative w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
            {provider.logo_url ? (
              <Image
                src={provider.logo_url}
                alt={provider.business_name}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400 font-semibold text-lg">
                {provider.business_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
              {provider.business_name}
            </h3>
            {provider.tagline && (
              <p className="text-sm text-gray-500 truncate">{provider.tagline}</p>
            )}
          </div>
        </div>

        {/* Rating & Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {provider.rating_average ? (
              <>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span className="text-sm font-medium text-gray-900">
                  {provider.rating_average.toFixed(1)}
                </span>
                {provider.rating_count && (
                  <span className="text-sm text-gray-500">
                    ({provider.rating_count})
                  </span>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-500">New</span>
            )}
          </div>
          {provider.min_price && (
            <div className="text-sm">
              <span className="text-gray-500">From </span>
              <span className="font-semibold text-gray-900">
                {formatCurrency(provider.min_price)}
              </span>
            </div>
          )}
        </div>

        {/* Categories */}
        {provider.categories.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1">
            {provider.categories.slice(0, 2).map((cat) => (
              <span
                key={cat}
                className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full"
              >
                {cat}
              </span>
            ))}
            {provider.categories.length > 2 && (
              <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-600 rounded-full">
                +{provider.categories.length - 2}
              </span>
            )}
          </div>
        )}
      </Link>
    </div>
  );
}

// =============================================================================
// MAIN SECTION
// =============================================================================

export function RecentlyViewedSection() {
  const { providers, isLoaded, removeProvider, clearAll } = useRecentlyViewed();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Don't render if no history or not loaded yet
  if (!isLoaded || providers.length === 0) {
    return null;
  }

  return (
    <section className="py-12 bg-gray-50/50">
      <Container>
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-brand-100 rounded-lg">
              <Clock className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                Recently Viewed & More
              </h2>
              <p className="text-sm text-gray-500">
                Continue where you left off
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            {/* Clear All */}
            {showClearConfirm ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Clear all?</span>
                <button
                  onClick={() => {
                    clearAll();
                    setShowClearConfirm(false);
                  }}
                  className="px-2 py-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                >
                  Yes
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-2 py-1 text-gray-600 hover:bg-gray-100 rounded transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                Clear all
              </button>
            )}

            {/* View All Link */}
            <Link
              href="/services/browse"
              className="flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
            >
              Browse all services
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>

        {/* Horizontal Scroll Container */}
        <div className="relative -mx-4 px-4">
          <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide snap-x snap-mandatory">
            {providers.map((provider) => (
              <div key={provider.id} className="snap-start">
                <ProviderCard provider={provider} onRemove={removeProvider} />
              </div>
            ))}
            
            {/* Browse More Card */}
            <Link
              href="/services/browse"
              className="flex-shrink-0 w-[280px] bg-gradient-to-br from-brand-50 to-brand-100 rounded-xl border border-brand-200 p-4 flex flex-col items-center justify-center gap-3 hover:shadow-md transition-all duration-200 group"
            >
              <div className="p-4 bg-white rounded-full shadow-sm group-hover:shadow transition-shadow">
                <ChevronRight className="w-6 h-6 text-brand-600" />
              </div>
              <div className="text-center">
                <p className="font-semibold text-brand-900">Browse More</p>
                <p className="text-sm text-brand-600">700+ services available</p>
              </div>
            </Link>
          </div>
        </div>
      </Container>
    </section>
  );
}
