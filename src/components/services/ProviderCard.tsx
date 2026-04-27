/**
 * Provider Card Component
 * 
 * Psychology-Optimized Design for Maximum Conversion
 * 
 * Design Principles:
 * 1. PRICE & RATING are #1 and #2 decision factors - always visible
 * 2. LOCATION confirms relevance - binary filter
 * 3. RESPONSE TIME & JOBS COMPLETED enable comparison without clicking
 * 4. VERIFIED reduces perceived risk - authority bias
 * 5. Minimal clutter - every element must help ELIMINATE or CHOOSE
 * 
 * Information Hierarchy:
 * - Tier 1 (Deal-breakers): Price, Rating+Count, Location, Availability
 * - Tier 2 (Differentiators): Verified, Jobs, Response Time, Instant Booking
 * - Tier 3 (Detail page): Full description, all areas, insurance, etc.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  formatServicePrice,
  getCategoryById,
} from "@/lib/constants";
import { useAnalytics } from "@/lib/analytics/use-analytics";
import { getResponseTimeLabel } from "@/types/service-providers";
import type { ServiceProviderCardData } from "@/types/service-providers";

// =============================================================================
// TYPES
// =============================================================================

interface ProviderCardProps {
  provider: ServiceProviderCardData;
  className?: string;
  variant?: "default" | "featured" | "compact";
  priority?: boolean;
  showCompare?: boolean;
  onSaveToggle?: (providerId: string) => void;
  isSaved?: boolean;
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format price for card display.
 * Clean, scannable: "KES 5,000" or "Get Quote"
 */
function formatCardPrice(price: number | null, priceType: string | null): string {
  if (price === null || price === undefined || priceType === "quote_only") {
    return "Get Quote";
  }
  return formatServicePrice(
    price,
    (priceType as "fixed" | "hourly" | "per_sqm" | "quote_only") || "fixed"
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================



// =============================================================================
// CATEGORY PLACEHOLDER — soft background with category initial
// =============================================================================

function CategoryPlaceholder({ categoryId, businessName }: { categoryId?: string; businessName?: string }) {
  const category = categoryId ? getCategoryById(categoryId) : null;
  const bg = category?.bgColor || "bg-gray-100";
  const text = category?.textColor || "text-gray-400";
  const initial = (businessName || category?.shortName || "S").charAt(0).toUpperCase();

  return (
    <div className={cn("w-full h-full flex items-center justify-center", bg)}>
      <span className={cn("text-4xl font-bold opacity-30 select-none", text)}>{initial}</span>
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ProviderCard({
  provider,
  className,
  variant = "default",
  priority = false,
  onSaveToggle,
  isSaved = false,
}: ProviderCardProps) {
  const [imageErrorIndexes, setImageErrorIndexes] = useState<number[]>([]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const { track } = useAnalytics();
  
  // =============================================
  // EVENT HANDLERS
  // =============================================

  const handleCardClick = useCallback(() => {
    track("card_click", {
      provider_id: provider.id,
      provider_name: provider.business_name,
      rating: provider.rating_average,
      tier: provider.tier,
      variant,
    });
  }, [track, provider.id, provider.business_name, provider.rating_average, provider.tier, variant]);
  
  const handleSaveClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onSaveToggle?.(provider.id);
  }, [provider.id, onSaveToggle]);
  
  // =============================================
  // DERIVED DATA
  // =============================================
  
  // Tier — for badge logic
  const isEnterprise = provider.tier === "enterprise";
  const isPremium = provider.tier === "premium";

  const carouselImages = (provider.service_image_urls || [])
    .filter((url): url is string => typeof url === "string" && url.trim().length > 0)
    .slice(0, 3)
    .map((url, index) => ({ url, index }));

  const visibleCarouselImages = carouselImages.filter(
    (image) => !imageErrorIndexes.includes(image.index)
  );
  const activeCarouselImage = visibleCarouselImages[activeImageIndex] ?? null;
  const hasCarousel = visibleCarouselImages.length > 0;
  const hasMultipleImages = visibleCarouselImages.length > 1;
  
  // Primary category for placeholder fallback
  const primaryCategory = provider.categories?.[0];
  
  // Location: "Westlands, Kilimani +3"
  const areaDisplay = provider.service_areas?.length > 0
    ? provider.service_areas.slice(0, 2).join(", ") + 
      (provider.service_areas.length > 2 ? ` +${provider.service_areas.length - 2}` : "")
    : null;
  
  // Price display
  const priceDisplay = formatCardPrice(provider.min_price, provider.price_type);
  
  // Availability
  const isAvailable = provider.is_available !== false;
  const canInstantBook = provider.instant_booking && isAvailable;

  // Single badge: Pro > nothing. Never stack two badges.
  const badgeLabel = isEnterprise ? "⭐ Top Pro" : isPremium ? "✦ Pro" : null;
  const badgeClass = isEnterprise
    ? "bg-amber-400/95 text-amber-900"
    : isPremium
      ? "bg-brand-500/95 text-white"
      : "";

  useEffect(() => {
    if (!hasCarousel) {
      if (activeImageIndex !== 0) setActiveImageIndex(0);
      return;
    }

    if (activeImageIndex > visibleCarouselImages.length - 1) {
      setActiveImageIndex(0);
    }
  }, [activeImageIndex, hasCarousel, visibleCarouselImages.length]);

  const goToPreviousImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setActiveImageIndex((prev) =>
      prev === 0 ? visibleCarouselImages.length - 1 : prev - 1
    );
  }, [hasMultipleImages, visibleCarouselImages.length]);

  const goToNextImage = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!hasMultipleImages) return;
    setActiveImageIndex((prev) =>
      prev === visibleCarouselImages.length - 1 ? 0 : prev + 1
    );
  }, [hasMultipleImages, visibleCarouselImages.length]);

  const goToImage = useCallback((e: React.MouseEvent, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    setActiveImageIndex(index);
  }, []);

  const handleImageError = useCallback(() => {
    if (!activeCarouselImage) return;
    setImageErrorIndexes((prev) => {
      if (prev.includes(activeCarouselImage.index)) return prev;
      return [...prev, activeCarouselImage.index];
    });
  }, [activeCarouselImage]);

  // =============================================
  // SHARED SUB-RENDERS
  // =============================================

  /** Hover action: text-only save action (no icon noise) */
  const SaveButton = (
    <button
      onClick={handleSaveClick}
      className={cn(
        "absolute top-3 right-3 h-8 px-3 flex items-center justify-center rounded-full shadow-sm transition-all duration-200 backdrop-blur-sm text-xs font-semibold",
        isHovered ? "opacity-100" : "opacity-0",
        isSaved 
          ? "bg-cta-500 text-white" 
          : "bg-white/90 text-gray-500 hover:text-cta-500 hover:bg-white"
      )}
      title={isSaved ? "Saved" : "Save for later"}
    >
      {isSaved ? "Saved" : "Save"}
    </button>
  );

  /** Verified indicator — specific to what was actually verified */
  const VerifiedBadge = provider.is_verified ? (
    <span className="text-xs font-medium text-brand-600">ID verified</span>
  ) : null;

  // Category label: single short name for the primary category (e.g. "Repairs", "Cleaning")
  // Matches Fiverr/Thumbtack/TaskRabbit pattern: one contextual label, not a service list.
  // Multi-service detail belongs on the provider detail page, not the browse card.
  const categoryLabel = primaryCategory
    ? getCategoryById(primaryCategory)?.shortName ?? null
    : null;

  // =============================================
  // COMPACT VARIANT — Horizontal card for lists
  // =============================================

  if (variant === "compact") {
    return (
      <article
        className={cn(
          "group relative bg-white rounded-xl overflow-hidden transition-all duration-200",
          "shadow-soft hover:shadow-medium hover:-translate-y-0.5",
          className
        )}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <Link
          href={`/services/provider/${provider.id}`}
          className="flex"
          prefetch={false}
          onClick={handleCardClick}
        >
          {/* IMAGE — Fixed-width left column */}
          <div className="relative w-32 sm:w-40 flex-shrink-0 overflow-hidden bg-gray-100">
            {activeCarouselImage ? (
              <Image
                src={activeCarouselImage.url}
                alt={provider.business_name}
                fill
                className="object-cover transition-transform duration-300 group-hover:scale-105"
                sizes="160px"
                priority={priority}
                onError={handleImageError}
              />
            ) : (
              <CategoryPlaceholder categoryId={primaryCategory} businessName={provider.business_name} />
            )}

            {hasMultipleImages && (
              <>
                <button
                  type="button"
                  onClick={goToPreviousImage}
                  aria-label="Previous service image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/55 text-white text-sm font-bold flex items-center justify-center"
                >
                  ‹
                </button>
                <button
                  type="button"
                  onClick={goToNextImage}
                  aria-label="Next service image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-full bg-black/55 text-white text-sm font-bold flex items-center justify-center"
                >
                  ›
                </button>
              </>
            )}

            {hasMultipleImages && (
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5">
                {visibleCarouselImages.map((img, index) => (
                  <button
                    key={img.index}
                    type="button"
                    onClick={(e) => goToImage(e, index)}
                    aria-label={`View image ${index + 1}`}
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      index === activeImageIndex
                        ? "w-4 bg-white"
                        : "w-1.5 bg-white/70"
                    )}
                  />
                ))}
              </div>
            )}

            {badgeLabel && (
              <div className="absolute top-2 left-2">
                <span className={cn(
                  "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shadow-sm backdrop-blur-sm",
                  badgeClass
                )}>
                  {badgeLabel}
                </span>
              </div>
            )}
            {SaveButton}
          </div>

          {/* CONTENT — Right column */}
          <div className="flex flex-col flex-1 p-3 min-w-0">
            {/* Name + Verified */}
            <div className="flex items-center gap-1.5 mb-1">
              <h3 className="font-semibold text-gray-900 leading-tight group-hover:text-brand-600 transition-colors line-clamp-1 flex-1 min-w-0">
                {provider.business_name}
              </h3>
              {VerifiedBadge}
            </div>

            {/* Tagline */}
            <p className="text-xs text-gray-500 line-clamp-1 mb-1 min-h-[16px]">
              {provider.tagline || ""}
            </p>

            {/* Category label */}
            {categoryLabel && (
              <span className="text-[11px] text-gray-400 mb-1.5">
                {categoryLabel}
              </span>
            )}

            {/* Price + Rating */}
            <div className="flex items-center justify-between mt-auto min-w-0">
              <span className="text-base font-bold text-gray-900 flex-shrink-0">{priceDisplay}</span>
              {provider.rating_average != null && (
                <span className="text-sm text-gray-600">
                  {provider.rating_average.toFixed(1)} <span className="text-amber-500">★</span>
                </span>
              )}
            </div>
          </div>
        </Link>
      </article>
    );
  }

  // =============================================
  // FEATURED / DEFAULT VARIANT — Vertical card
  // =============================================

  const isFeatured = variant === "featured";

  return (
    <article
      className={cn(
        "group relative bg-white rounded-xl overflow-hidden transition-all duration-200 h-full flex flex-col",
        // Borderless shadow cards — modern, clean (D5.4)
        "shadow-soft hover:shadow-medium hover:-translate-y-0.5",
        // Featured gets a subtle top accent bar via ring
        isFeatured && "ring-1 ring-brand-200",
        className
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <Link
        href={`/services/provider/${provider.id}`}
        className="flex flex-col flex-1"
        prefetch={false}
        onClick={handleCardClick}
      >
        {/* ============================================= */}
        {/* IMAGE SECTION — 16:9                         */}
        {/* ============================================= */}
        <div className="relative aspect-video overflow-hidden bg-gray-100">
          {activeCarouselImage ? (
            <Image
              src={activeCarouselImage.url}
              alt={provider.business_name}
              fill
              className="object-cover transition-transform duration-300 group-hover:scale-105"
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              priority={priority}
              onError={handleImageError}
            />
          ) : (
            <CategoryPlaceholder categoryId={primaryCategory} businessName={provider.business_name} />
          )}

          {hasMultipleImages && (
            <>
              <button
                type="button"
                onClick={goToPreviousImage}
                aria-label="Previous service image"
                className="absolute left-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/55 text-white text-base font-bold flex items-center justify-center"
              >
                ‹
              </button>
              <button
                type="button"
                onClick={goToNextImage}
                aria-label="Next service image"
                className="absolute right-3 top-1/2 -translate-y-1/2 h-8 w-8 rounded-full bg-black/55 text-white text-base font-bold flex items-center justify-center"
              >
                ›
              </button>
            </>
          )}

          {hasMultipleImages && (
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
              {visibleCarouselImages.map((img, index) => (
                <button
                  key={img.index}
                  type="button"
                  onClick={(e) => goToImage(e, index)}
                  aria-label={`View image ${index + 1}`}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    index === activeImageIndex
                      ? "w-5 bg-white"
                      : "w-1.5 bg-white/70"
                  )}
                />
              ))}
            </div>
          )}
          
          {/* TOP-LEFT: Single badge (never stack) */}
          {badgeLabel && (
            <div className="absolute top-3 left-3">
              <span className={cn(
                "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm backdrop-blur-sm",
                badgeClass
              )}>
                {badgeLabel}
              </span>
            </div>
          )}
          
          {/* TOP-RIGHT: Save action */}
          {SaveButton}
          
          {/* BOTTOM-LEFT: Instant booking indicator */}
          {canInstantBook && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-white/90 text-gray-900 backdrop-blur-sm shadow-sm">
                Instant
              </span>
            </div>
          )}
          
          {/* BOTTOM-LEFT: Unavailable (overrides instant indicator) */}
          {!isAvailable && (
            <div className="absolute bottom-3 left-3">
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-900/80 text-gray-300 backdrop-blur-sm">
                Currently Unavailable
              </span>
            </div>
          )}
        </div>
        
        {/* ============================================= */}
        {/* CONTENT                                      */}
        {/* ============================================= */}
        <div className="p-4 flex flex-col flex-1">
          
          {/* ROW 1: Name (smaller) + Verified badge right */}
          <div className="flex items-center gap-1.5 mb-1">
            <h3 className="text-sm font-medium text-gray-900 leading-tight group-hover:text-brand-700 transition-colors line-clamp-1 flex-1 min-w-0">
              {provider.business_name}
            </h3>
            {VerifiedBadge}
          </div>

          {/* ROW 2: Service overview (tagline) */}
          {provider.tagline && (
            <p className="text-xs text-gray-500 leading-relaxed mb-2 min-h-[16px]">
              {provider.tagline}
            </p>
          )}

          {/* ROW 3: Rating, Reviews (hide if none), Response time */}
          <div className="flex items-center gap-2 mb-2 text-xs text-gray-500 flex-wrap">
            {provider.rating_average != null && provider.rating_average > 0 && (
              <span className="flex items-center gap-0.5">
                <span className="text-amber-500">★</span>
                <span className="font-semibold text-gray-700">{provider.rating_average.toFixed(1)}</span>
                {provider.rating_count != null && provider.rating_count > 0 && (
                  <span className="text-gray-400">({provider.rating_count})</span>
                )}
              </span>
            )}
            {provider.response_time_minutes != null && (
              <>
                {provider.rating_average != null && provider.rating_average > 0 && (
                  <span className="text-gray-300">·</span>
                )}
                <span>{getResponseTimeLabel(provider.response_time_minutes)}</span>
              </>
            )}
          </div>
          
          {/* ROW 4: Price + Location — anchored to bottom */}
          <div className="flex items-center justify-between mt-auto pt-2 border-t border-gray-100">
            <span className="text-sm font-bold text-gray-900">{priceDisplay}</span>
            {areaDisplay && (
              <span className="text-xs text-gray-400 min-w-0 truncate ml-2">
                {areaDisplay}
              </span>
            )}
          </div>
        </div>
      </Link>
    </article>
  );
}

// =============================================================================
// SKELETON — Matches new 3-row card layout
// =============================================================================

export function ProviderCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-soft overflow-hidden animate-pulse">
      {/* Image skeleton — 16:9 */}
      <div className="aspect-video bg-gray-200" />
      
      {/* Content skeleton */}
      <div className="p-4 space-y-2.5">
        {/* Row 1: Name + verified */}
        <div className="flex items-center justify-between">
          <div className="h-4 bg-gray-200 rounded w-2/3" />
          <div className="h-3 bg-gray-200 rounded w-14" />
        </div>
        
        {/* Row 2: Tagline */}
        <div className="h-3 bg-gray-200 rounded w-full" />
        
        {/* Row 3: Rating + response */}
        <div className="h-3 bg-gray-200 rounded w-40" />
        
        {/* Row 4: Price + Location */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100">
          <div className="h-4 bg-gray-200 rounded w-20" />
          <div className="h-3 bg-gray-200 rounded w-16" />
        </div>
      </div>
    </div>
  );
}
