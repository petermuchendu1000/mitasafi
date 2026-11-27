// =============================================================================
// MITASAFI: RECENTLY VIEWED SECTION
// =============================================================================
// Displays recently viewed providers on the landing page (Fiverr-style).
// Personalized section that shows user's browsing history.
// =============================================================================

"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  useRecentlyViewed,
  type RecentlyViewedProvider,
} from "@/hooks/useRecentlyViewed";
import { Star } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { HomeIcon } from "./HomeIcons";
import styles from "./HomePage.module.css";

// =============================================================================
// PROVIDER CARD
// =============================================================================

interface ProviderCardProps {
  provider: RecentlyViewedProvider;
  onRemove: (id: string) => void;
}

function ProviderCard({ provider, onRemove }: ProviderCardProps) {
  return (
    <div className="relative w-full border-b border-gray-200">
      {/* Remove Button */}
      <button
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onRemove(provider.id);
        }}
        className="absolute top-0 right-0 z-10 grid h-11 w-11 place-items-center text-gray-600 hover:text-brand-700"
        aria-label={`Remove ${provider.business_name} from recently viewed`}
      >
        <HomeIcon name="close" size={18} />
      </button>

      <Link href={`/services/provider/${provider.id}`} className="group block p-2 pr-11">
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
              <div className="w-full h-full flex items-center justify-center bg-white text-brand-800 font-semibold text-lg">
                {provider.business_name.charAt(0)}
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 truncate group-hover:text-brand-600 transition-colors">
              {provider.business_name}
            </h3>
            {provider.tagline && (
              <p className="text-sm text-gray-500 truncate">
                {provider.tagline}
              </p>
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
        {provider.categories?.length > 0 && (
          <p className="mt-2 text-sm text-gray-600">{provider.categories.slice(0, 2).join(" · ")}</p>
        )}
      </Link>
    </div>
  );
}

// =============================================================================
// MAIN SECTION
// =============================================================================

export function RecentlyViewedSection() {
  const { providers, removeProvider, clearAll } = useRecentlyViewed();
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  // Don't render if no history or not loaded yet
  // `isLoaded` was dropped from the hook: it was always false exactly when
  // providers was still [], so `!isLoaded ||` could never change this outcome.
  if (providers.length === 0) {
    return null;
  }

  return (
    <section className={`${styles.section} ${styles.history}`} aria-labelledby="recent-providers">
      <div className={styles.wrap}>
        <div className={styles.sectionHead}>
          <h2 id="recent-providers">Recently viewed providers</h2>

          <div className="flex flex-wrap items-center gap-x-4">
            {showClearConfirm ? (
              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Clear all?</span>
                <button
                  onClick={() => {
                    clearAll();
                    setShowClearConfirm(false);
                  }}
                  className="min-h-11 px-2 text-red-700 hover:underline"
                >
                  Clear history
                </button>
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="min-h-11 px-2 text-gray-700 hover:underline"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowClearConfirm(true)}
                className="min-h-11 text-sm text-gray-700 hover:underline"
              >
                Clear all
              </button>
            )}

            <Link href="/services/browse" className={styles.textLink}>
              Browse all services <HomeIcon name="arrow" size={16} />
            </Link>
          </div>
        </div>

        <ul className={styles.historyList}>
          {providers.map((provider) => (
            <li key={provider.id}>
              <ProviderCard provider={provider} onRemove={removeProvider} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
