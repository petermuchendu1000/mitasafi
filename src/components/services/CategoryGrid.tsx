/**
 * Category Grid Component
 * 
 * Grid display of service categories with icons and colors.
 * Clicking a category navigates to filtered services view.
 * 
 * Used on:
 * - Services landing page (hero section)
 * - Category selection in filters
 */

"use client";

import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { SERVICE_CATEGORIES, type ServiceCategory } from "@/lib/constants";
import { ArrowRight } from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface CategoryGridProps {
  className?: string;
  variant?: "default" | "compact" | "featured";
  showDescription?: boolean;
  showArrow?: boolean;
  columns?: 2 | 3 | 4;
  limit?: number;
  currentCategory?: string;
  onCategorySelect?: (categoryId: string) => void;
}

interface CategoryCardProps {
  category: ServiceCategory;
  variant: "default" | "compact" | "featured";
  showDescription: boolean;
  showArrow: boolean;
  isActive: boolean;
  onClick: () => void;
}

// =============================================================================
// CATEGORY CARD
// =============================================================================

function CategoryCard({
  category,
  variant,
  showDescription,
  showArrow,
  isActive,
  onClick,
}: CategoryCardProps) {
  const Icon = category.icon;
  
  if (variant === "compact") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "flex items-center gap-3 p-3 rounded-xl border transition-all text-left group",
          isActive
            ? "bg-brand-50 border-brand-300 ring-2 ring-brand-500/20"
            : "bg-white border-gray-200 hover:border-brand-300 hover:shadow-sm"
        )}
      >
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center transition-colors",
            category.bgColor
          )}
        >
          <Icon className={cn("w-5 h-5", category.textColor)} />
        </div>
        <span
          className={cn(
            "font-medium",
            isActive ? "text-brand-700" : "text-gray-900 group-hover:text-brand-600"
          )}
        >
          {category.shortName}
        </span>
      </button>
    );
  }
  
  if (variant === "featured") {
    return (
      <button
        onClick={onClick}
        className={cn(
          "relative flex flex-col items-center p-6 rounded-2xl border-2 transition-all group overflow-hidden",
          isActive
            ? "border-brand-400 bg-brand-50"
            : "border-gray-100 bg-white hover:border-brand-200 hover:shadow-lg"
        )}
      >
        {/* Background gradient */}
        <div
          className={cn(
            "absolute inset-0 opacity-5 group-hover:opacity-10 transition-opacity",
            `bg-gradient-to-br ${category.bgColor}`
          )}
        />
        
        {/* Icon */}
        <div
          className={cn(
            "relative w-16 h-16 rounded-2xl flex items-center justify-center mb-4 transition-transform group-hover:scale-110",
            category.bgColor
          )}
        >
          <Icon className={cn("w-8 h-8", category.textColor)} />
        </div>
        
        {/* Content */}
        <h3
          className={cn(
            "relative text-lg font-semibold mb-1",
            isActive ? "text-brand-700" : "text-gray-900 group-hover:text-brand-600"
          )}
        >
          {category.name}
        </h3>
        
        {showDescription && (
          <p className="relative text-sm text-gray-500 text-center line-clamp-2">
            {category.description}
          </p>
        )}
        
        {showArrow && (
          <ArrowRight
            className={cn(
              "relative w-5 h-5 mt-3 transition-transform group-hover:translate-x-1",
              isActive ? "text-brand-600" : "text-gray-400 group-hover:text-brand-500"
            )}
          />
        )}
        
        {/* Emergency badge */}
        {category.isEmergencyAvailable && (
          <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full">
            24/7
          </span>
        )}
      </button>
    );
  }
  
  // Default variant
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col p-5 rounded-xl border transition-all text-left group",
        isActive
          ? "border-brand-300 bg-brand-50 ring-2 ring-brand-500/20"
          : "border-gray-200 bg-white hover:border-brand-300 hover:shadow-md"
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center mb-3 transition-transform group-hover:scale-105",
          category.bgColor
        )}
      >
        <Icon className={cn("w-6 h-6", category.textColor)} />
      </div>
      
      {/* Content */}
      <h3
        className={cn(
          "font-semibold mb-1",
          isActive ? "text-brand-700" : "text-gray-900 group-hover:text-brand-600"
        )}
      >
        {category.shortName}
      </h3>
      
      {showDescription && (
        <p className="text-sm text-gray-500 line-clamp-2">{category.description}</p>
      )}
      
      {/* Arrow */}
      {showArrow && (
        <div className="mt-auto pt-3 flex items-center gap-1 text-sm font-medium text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
          <span>Browse</span>
          <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
        </div>
      )}
      
      {/* Emergency badge */}
      {category.isEmergencyAvailable && (
        <span className="mt-2 inline-flex items-center px-2 py-0.5 text-xs font-medium bg-red-100 text-red-700 rounded-full w-fit">
          24/7 Available
        </span>
      )}
    </button>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function CategoryGrid({
  className,
  variant = "default",
  showDescription = true,
  showArrow = true,
  columns = 4,
  limit,
  currentCategory,
  onCategorySelect,
}: CategoryGridProps) {
  const router = useRouter();
  
  const categories = limit ? SERVICE_CATEGORIES.slice(0, limit) : SERVICE_CATEGORIES;
  
  const handleCategoryClick = (categoryId: string) => {
    if (onCategorySelect) {
      // Custom handler (for use in filters)
      onCategorySelect(categoryId);
    } else {
      // Navigate to services browse page with category filter
      router.push(`/services/browse?category=${categoryId}`);
    }
  };
  
  // Grid column classes
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  };
  
  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {categories.map((category) => (
        <CategoryCard
          key={category.id}
          category={category}
          variant={variant}
          showDescription={showDescription}
          showArrow={showArrow}
          isActive={currentCategory === category.id}
          onClick={() => handleCategoryClick(category.id)}
        />
      ))}
    </div>
  );
}

// =============================================================================
// SKELETON
// =============================================================================

export function CategoryGridSkeleton({
  variant = "default",
  columns = 4,
  count = 8,
}: {
  variant?: "default" | "compact" | "featured";
  columns?: 2 | 3 | 4;
  count?: number;
}) {
  const gridCols = {
    2: "grid-cols-1 sm:grid-cols-2",
    3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-2 sm:grid-cols-3 lg:grid-cols-4",
  };
  
  if (variant === "compact") {
    return (
      <div className={cn("grid gap-3", gridCols[columns])}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 bg-white animate-pulse"
          >
            <div className="w-10 h-10 rounded-lg bg-gray-200" />
            <div className="h-4 w-20 bg-gray-200 rounded" />
          </div>
        ))}
      </div>
    );
  }
  
  if (variant === "featured") {
    return (
      <div className={cn("grid gap-4", gridCols[columns])}>
        {Array.from({ length: count }).map((_, i) => (
          <div
            key={i}
            className="flex flex-col items-center p-6 rounded-2xl border-2 border-gray-100 bg-white animate-pulse"
          >
            <div className="w-16 h-16 rounded-2xl bg-gray-200 mb-4" />
            <div className="h-5 w-28 bg-gray-200 rounded mb-2" />
            <div className="h-4 w-full bg-gray-200 rounded" />
            <div className="h-4 w-3/4 bg-gray-200 rounded mt-1" />
          </div>
        ))}
      </div>
    );
  }
  
  // Default variant
  return (
    <div className={cn("grid gap-4", gridCols[columns])}>
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="flex flex-col p-5 rounded-xl border border-gray-200 bg-white animate-pulse"
        >
          <div className="w-12 h-12 rounded-xl bg-gray-200 mb-3" />
          <div className="h-5 w-24 bg-gray-200 rounded mb-2" />
          <div className="h-4 w-full bg-gray-200 rounded" />
          <div className="h-4 w-3/4 bg-gray-200 rounded mt-1" />
        </div>
      ))}
    </div>
  );
}
