/**
 * Category Quick Nav Component
 * 
 * Horizontal scrollable category chips for quick filtering.
 * Fiverr-style category navigation below the search bar.
 * 
 * Features:
 * - Horizontal scroll with fade edges
 * - Active state management
 * - URL sync
 * - Touch-friendly scrolling
 * - Smooth scroll to active item
 */

"use client";

import { useRef, useEffect, useState, useCallback, memo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";

// =============================================================================
// TYPES
// =============================================================================

interface CategoryQuickNavProps {
  className?: string;
  showAllOption?: boolean;
  variant?: "pills" | "underline" | "cards";
}

// =============================================================================
// CATEGORY CHIP COMPONENT
// =============================================================================

const CategoryChip = memo(function CategoryChip({
  category,
  isActive,
  onClick,
  variant,
}: {
  category: ServiceCategory | null;
  isActive: boolean;
  onClick: () => void;
  variant: "pills" | "underline" | "cards";
}) {
  const label = category?.shortName || "All";

  if (variant === "underline") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all",
          isActive
            ? "text-brand-700 border-brand-600"
            : "text-gray-600 border-transparent hover:text-gray-900 hover:border-gray-300"
        )}
      >
        {label}
      </button>
    );
  }

  if (variant === "cards") {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn(
          "flex flex-col items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all min-w-[80px]",
          isActive
            ? "bg-brand-50 border-brand-300 text-brand-700"
            : "bg-white border-gray-100 text-gray-700 hover:border-brand-200 hover:bg-brand-50/50"
        )}
      >
        <span className="text-xs font-medium">{label}</span>
      </button>
    );
  }

  // Default: pills
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all",
        isActive
          ? "bg-gray-900 text-white shadow-sm"
          : "bg-white text-gray-700 border border-gray-200 hover:border-gray-400 hover:bg-gray-50"
      )}
    >
      {label}
    </button>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CategoryQuickNav({
  className,
  showAllOption = true,
  variant = "pills",
}: CategoryQuickNavProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  
  const [showLeftArrow, setShowLeftArrow] = useState(false);
  const [showRightArrow, setShowRightArrow] = useState(true);

  const currentCategory = searchParams.get("category") || "";

  // Check scroll position for arrow visibility
  const checkScrollPosition = useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollLeft, scrollWidth, clientWidth } = container;
    setShowLeftArrow(scrollLeft > 10);
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 10);
  }, []);

  // Initial check and resize observer
  useEffect(() => {
    checkScrollPosition();
    
    const container = scrollContainerRef.current;
    if (!container) return;

    container.addEventListener("scroll", checkScrollPosition, { passive: true });
    
    const resizeObserver = new ResizeObserver(checkScrollPosition);
    resizeObserver.observe(container);

    return () => {
      container.removeEventListener("scroll", checkScrollPosition);
      resizeObserver.disconnect();
    };
  }, [checkScrollPosition]);

  // Scroll to active category on mount
  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container || !currentCategory) return;

    const activeButton = container.querySelector(`[data-category="${currentCategory}"]`);
    if (activeButton) {
      const containerRect = container.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      const scrollTo = container.scrollLeft + (buttonRect.left - containerRect.left) - containerRect.width / 2 + buttonRect.width / 2;
      
      container.scrollTo({
        left: scrollTo,
        behavior: "smooth",
      });
    }
  }, [currentCategory]);

  // Handle category click
  const handleCategoryClick = useCallback(
    (categoryId: string | null) => {
      const params = new URLSearchParams(searchParams.toString());
      
      if (categoryId) {
        params.set("category", categoryId);
      } else {
        params.delete("category");
      }
      
      // Clear subcategory when category changes
      params.delete("subcategory");
      params.delete("services");
      params.delete("page");
      
      router.push(`${pathname}?${params.toString()}`, { scroll: false });
    },
    [router, pathname, searchParams]
  );

  // Scroll handlers
  const scroll = useCallback((direction: "left" | "right") => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const scrollAmount = container.clientWidth * 0.6;
    container.scrollBy({
      left: direction === "left" ? -scrollAmount : scrollAmount,
      behavior: "smooth",
    });
  }, []);

  return (
    <div className={cn("relative", className)}>
      {/* Left Arrow */}
      {showLeftArrow && (
        <button
          type="button"
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:shadow-xl transition-all"
          aria-label="Scroll left"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>
      )}

      {/* Scroll Container */}
      <div
        ref={scrollContainerRef}
        className={cn(
          "flex items-center gap-2 overflow-x-auto scrollbar-hide",
          variant === "underline" ? "border-b border-gray-200" : "px-1 py-1",
          showLeftArrow && "pl-12",
          showRightArrow && "pr-12"
        )}
        style={{
          maskImage: showLeftArrow || showRightArrow
            ? `linear-gradient(to right, ${showLeftArrow ? "transparent 0px, black 48px" : "black 0%"}, ${showRightArrow ? "black calc(100% - 48px), transparent 100%" : "black 100%"})`
            : undefined,
        }}
      >
        {/* All Option */}
        {showAllOption && (
          <CategoryChip
            category={null}
            isActive={!currentCategory}
            onClick={() => handleCategoryClick(null)}
            variant={variant}
          />
        )}

        {/* Category Chips */}
        {SERVICE_CATEGORIES.map((category) => (
          <div key={category.id} data-category={category.id}>
            <CategoryChip
              category={category}
              isActive={currentCategory === category.id}
              onClick={() => handleCategoryClick(category.id)}
              variant={variant}
            />
          </div>
        ))}
      </div>

      {/* Right Arrow */}
      {showRightArrow && (
        <button
          type="button"
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-10 h-10 bg-white rounded-full shadow-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:text-gray-900 hover:shadow-xl transition-all"
          aria-label="Scroll right"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function CategoryQuickNavSkeleton() {
  return (
    <div className="flex gap-2 overflow-hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        <div
          key={i}
          className="flex-shrink-0 h-9 rounded-full bg-gray-200 animate-pulse"
          style={{ width: `${64 + (i % 3) * 20}px` }}
        />
      ))}
    </div>
  );
}
