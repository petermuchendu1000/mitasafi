/**
 * Featured Providers Component
 * 
 * Horizontal scrollable carousel of featured/enterprise-tier providers.
 * Shows premium and enterprise providers with enhanced styling.
 */

"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { ProviderCard, ProviderCardSkeleton } from "./ProviderCard";
import { cn } from "@/lib/utils";
import type { ServiceProviderCardData } from "@/types/service-providers";

interface FeaturedProvidersProps {
  providers: ServiceProviderCardData[];
  className?: string;
}

export function FeaturedProviders({ providers, className }: FeaturedProvidersProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  
  const checkScroll = () => {
    if (!scrollRef.current) return;
    const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current;
    setCanScrollLeft(scrollLeft > 0);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10);
  };
  
  const scroll = (direction: "left" | "right") => {
    if (!scrollRef.current) return;
    const scrollAmount = 350; // Card width + gap
    const newScroll =
      direction === "left"
        ? scrollRef.current.scrollLeft - scrollAmount
        : scrollRef.current.scrollLeft + scrollAmount;
    scrollRef.current.scrollTo({ left: newScroll, behavior: "smooth" });
  };
  
  if (providers.length === 0) return null;
  
  return (
    <div className={cn("relative group", className)}>
      {/* Scroll Buttons */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-brand-600 hover:bg-brand-50 transition-colors opacity-0 group-hover:opacity-100 -translate-x-1/2"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}
      
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white shadow-lg rounded-full flex items-center justify-center text-gray-600 hover:text-brand-600 hover:bg-brand-50 transition-colors opacity-0 group-hover:opacity-100 translate-x-1/2"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
      
      {/* Carousel Container */}
      <div
        ref={scrollRef}
        onScroll={checkScroll}
        className="flex gap-4 md:gap-6 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100 hover:scrollbar-thumb-gray-400"
        style={{ scrollbarWidth: 'thin' }}
      >
        {providers.map((provider) => (
          <div
            key={provider.id}
            className="flex-shrink-0 w-[280px] sm:w-[300px] md:w-[320px] snap-start"
          >
            <ProviderCard
              provider={provider}
              variant="featured"
            />
          </div>
        ))}
      </div>
    </div>
  );
}

// Skeleton for loading state
export function FeaturedProvidersSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex gap-6 overflow-x-auto pb-4 scrollbar-hide">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex-shrink-0 w-[320px]">
          <ProviderCardSkeleton />
        </div>
      ))}
    </div>
  );
}
