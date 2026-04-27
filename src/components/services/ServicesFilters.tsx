/**
 * Services Filters Component
 * 
 * Filter controls for the services/providers page.
 * Responsive: horizontal bar on desktop, drawer on mobile.
 * Uses URL params for state (same pattern as SearchFilters).
 * 
 * Design: 70% teal (brand), 30% orange (CTA) accents
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Search,
  SlidersHorizontal,
  X,
  ChevronDown,
  MapPin,
  Star,
  CheckCircle,
  Zap,
  Filter,
  ArrowUpDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  SERVICE_CATEGORIES,
  NAIROBI_AREAS,
  PROVIDER_SORT_OPTIONS,
  type ServiceCategory,
} from "@/lib/constants";

// =============================================================================
// TYPES
// =============================================================================

interface ServicesFiltersProps {
  className?: string;
  hideSearch?: boolean;
  showCategoryFilter?: boolean;
  subcategories?: Array<{ id: string; name: string }>;
}

// =============================================================================
// PRICE RANGES
// =============================================================================

const PRICE_RANGES = [
  { value: "0-5000", label: "Under KES 5K" },
  { value: "5000-15000", label: "KES 5K - 15K" },
  { value: "15000-30000", label: "KES 15K - 30K" },
  { value: "30000-50000", label: "KES 30K - 50K" },
  { value: "50000-100000", label: "KES 50K - 100K" },
  { value: "100000+", label: "KES 100K+" },
];

// =============================================================================
// RATING OPTIONS
// =============================================================================

const RATING_OPTIONS = [
  { value: "4.5", label: "4.5+ ⭐" },
  { value: "4", label: "4+ ⭐" },
  { value: "3.5", label: "3.5+ ⭐" },
  { value: "3", label: "3+ ⭐" },
];

// =============================================================================
// FILTER DROPDOWN COMPONENT
// =============================================================================

interface FilterDropdownProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: Array<{ value: string; label: string; icon?: React.ComponentType<{ className?: string }> }>;
  onChange: (value: string) => void;
  placeholder?: string;
  showClear?: boolean;
  isSort?: boolean;
}

function FilterDropdown({
  label,
  icon,
  value,
  options,
  onChange,
  placeholder = "All",
  showClear = true,
  isSort = false,
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find((opt) => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;
  
  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
          value && !isSort
            ? "bg-brand-50 border-brand-300 text-brand-700"
            : "bg-white border-gray-200 text-gray-700 hover:border-brand-300"
        )}
      >
        {icon}
        <span>{isSort ? displayValue : label}</span>
        {!isSort && value && (
          <span className="text-brand-600">: {displayValue}</span>
        )}
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>
      
      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute left-0 top-full mt-1 w-56 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
            {showClear && value && (
              <button
                onClick={() => {
                  onChange("");
                  setIsOpen(false);
                }}
                className="w-full px-4 py-2 text-left text-sm text-gray-500 hover:bg-gray-50 flex items-center gap-2"
              >
                <X className="w-4 h-4" />
                Clear filter
              </button>
            )}
            {options.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full px-4 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2",
                  value === opt.value && "bg-brand-50 text-brand-700"
                )}
              >
                {opt.icon && <opt.icon className="w-4 h-4" />}
                {opt.label}
                {value === opt.value && (
                  <CheckCircle className="w-4 h-4 ml-auto text-brand-600" />
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// =============================================================================
// MOBILE FILTER SECTION
// =============================================================================

function MobileFilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-medium text-gray-900 mb-3">{title}</h4>
      {children}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ServicesFilters({
  className,
  hideSearch = false,
  showCategoryFilter = true,
  subcategories = [],
}: ServicesFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");
  
  // Get current filter values from URL
  const currentCategory = searchParams.get("category") || "";
  const currentSubcategory = searchParams.get("subcategory") || "";
  const currentArea = searchParams.get("area") || "";
  const currentPrice = searchParams.get("price") || "";
  const currentRating = searchParams.get("rating") || "";
  const currentSort = searchParams.get("sort") || "recommended";
  const currentVerified = searchParams.get("verified") === "true";
  const currentAvailable = searchParams.get("available") === "true";
  const currentInstant = searchParams.get("instant") === "true";
  
  // Update URL params
  const updateFilters = useCallback(
    (updates: Record<string, string | null>) => {
      const params = new URLSearchParams(searchParams.toString());
      
      Object.entries(updates).forEach(([key, value]) => {
        if (value === null || value === "") {
          params.delete(key);
        } else {
          params.set(key, value);
        }
      });
      
      // Reset to page 1 when filters change
      params.delete("page");
      
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );
  
  // Handle search submit
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    updateFilters({ q: searchQuery || null });
  };
  
  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    router.push(pathname);
  };
  
  // Count active filters
  const activeFilterCount = [
    currentCategory,
    currentSubcategory,
    currentArea,
    currentPrice,
    currentRating,
    currentVerified,
    currentAvailable,
    currentInstant,
    searchParams.get("q"),
  ].filter(Boolean).length;
  
  // Category options with icons
  const categoryOptions = SERVICE_CATEGORIES.map((cat) => ({
    value: cat.id,
    label: cat.shortName,
    icon: cat.icon,
  }));
  
  // Area options
  const areaOptions = NAIROBI_AREAS.map((area) => ({
    value: area,
    label: area,
  }));
  
  // Subcategory options (if available)
  const subcategoryOptions = subcategories.map((sub) => ({
    value: sub.id,
    label: sub.name,
  }));
  
  // Sort options
  const sortOptions = PROVIDER_SORT_OPTIONS.map((opt) => ({
    value: opt.value,
    label: opt.label,
  }));
  
  return (
    <div className={cn("bg-white border-b border-gray-200", className)}>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search Bar */}
          {!hideSearch && (
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for services, providers, or keywords..."
                  className="w-full pl-12 pr-24 py-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent transition-all"
                />
                <button
                  type="submit"
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-1.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg transition-colors"
                >
                  Search
                </button>
              </div>
            </form>
          )}
          
          {/* Filter Bar */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Category Filter */}
            {showCategoryFilter && (
              <FilterDropdown
                label="Category"
                icon={<SlidersHorizontal className="w-4 h-4" />}
                value={currentCategory}
                options={categoryOptions}
                onChange={(value) => {
                  // Clear subcategory when category changes
                  updateFilters({ category: value, subcategory: null });
                }}
                placeholder="All Services"
              />
            )}
            
            {/* Subcategory Filter (if category selected) */}
            {currentCategory && subcategoryOptions.length > 0 && (
              <FilterDropdown
                label="Service"
                value={currentSubcategory}
                options={subcategoryOptions}
                onChange={(value) => updateFilters({ subcategory: value })}
                placeholder="All"
              />
            )}
            
            {/* Area Filter */}
            <FilterDropdown
              label="Area"
              icon={<MapPin className="w-4 h-4" />}
              value={currentArea}
              options={areaOptions}
              onChange={(value) => updateFilters({ area: value })}
              placeholder="All Areas"
            />
            
            {/* Price Range */}
            <FilterDropdown
              label="Price"
              value={currentPrice}
              options={PRICE_RANGES}
              onChange={(value) => {
                if (value.includes("-")) {
                  const [min, max] = value.split("-");
                  updateFilters({ priceMin: min, priceMax: max === "+" ? null : max });
                } else if (value.endsWith("+")) {
                  updateFilters({ priceMin: value.replace("+", ""), priceMax: null });
                } else {
                  updateFilters({ priceMin: null, priceMax: null });
                }
              }}
              placeholder="Any Price"
            />
            
            {/* Rating Filter */}
            <FilterDropdown
              label="Rating"
              icon={<Star className="w-4 h-4" />}
              value={currentRating}
              options={RATING_OPTIONS}
              onChange={(value) => updateFilters({ rating: value })}
              placeholder="Any Rating"
            />
            
            {/* Toggle Buttons */}
            <button
              onClick={() => updateFilters({ verified: currentVerified ? null : "true" })}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                currentVerified
                  ? "bg-brand-50 border-brand-300 text-brand-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:text-brand-600"
              )}
            >
              <CheckCircle className={cn("w-4 h-4", currentVerified && "text-brand-600")} />
              Verified
            </button>
            
            <button
              onClick={() => updateFilters({ available: currentAvailable ? null : "true" })}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                currentAvailable
                  ? "bg-green-50 border-green-300 text-green-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-green-300 hover:text-green-600"
              )}
            >
              Available Now
            </button>
            
            <button
              onClick={() => updateFilters({ instant: currentInstant ? null : "true" })}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
                currentInstant
                  ? "bg-cta-50 border-cta-300 text-cta-700"
                  : "bg-white border-gray-200 text-gray-600 hover:border-cta-300 hover:text-cta-600"
              )}
            >
              <Zap className={cn("w-4 h-4", currentInstant && "text-cta-600")} />
              Instant Book
            </button>
            
            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 mx-2" />
            
            {/* Sort */}
            <FilterDropdown
              label="Sort"
              icon={<ArrowUpDown className="w-4 h-4" />}
              value={currentSort}
              options={sortOptions}
              onChange={(value) => updateFilters({ sort: value })}
              showClear={false}
              isSort={true}
            />
            
            {/* Clear All */}
            {activeFilterCount > 0 && (
              <button
                onClick={clearFilters}
                className="inline-flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                <X className="w-4 h-4" />
                Clear ({activeFilterCount})
              </button>
            )}
          </div>
        </div>
      </div>
      
      {/* Mobile Filters */}
      <div className="lg:hidden">
        <div className="px-4 py-3">
          {/* Search + Filter Toggle */}
          <div className="flex gap-2">
            {!hideSearch && (
              <form onSubmit={handleSearch} className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search services..."
                    className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                  />
                </div>
              </form>
            )}
            
            <button
              onClick={() => setShowMobileFilters(true)}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-colors",
                activeFilterCount > 0
                  ? "bg-brand-50 border-brand-300 text-brand-700"
                  : "bg-white border-gray-200 text-gray-700"
              )}
            >
              <Filter className="w-4 h-4" />
              {activeFilterCount > 0 && (
                <span className="w-5 h-5 flex items-center justify-center bg-brand-600 text-white text-xs rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>
          </div>
          
          {/* Quick Filters */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-hide">
            <button
              onClick={() => updateFilters({ verified: currentVerified ? null : "true" })}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                currentVerified
                  ? "bg-brand-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <CheckCircle className="w-3.5 h-3.5" />
              Verified
            </button>
            
            <button
              onClick={() => updateFilters({ instant: currentInstant ? null : "true" })}
              className={cn(
                "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                currentInstant
                  ? "bg-cta-600 text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              )}
            >
              <Zap className="w-3.5 h-3.5" />
              Instant
            </button>
            
            {/* Quick category pills */}
            {SERVICE_CATEGORIES.slice(0, 4).map((cat) => (
              <button
                key={cat.id}
                onClick={() => updateFilters({ category: currentCategory === cat.id ? null : cat.id })}
                className={cn(
                  "flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  currentCategory === cat.id
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                <cat.icon className="w-3.5 h-3.5" />
                {cat.shortName}
              </button>
            ))}
          </div>
        </div>
        
        {/* Mobile Filter Drawer */}
        {showMobileFilters && (
          <div className="fixed inset-0 z-50">
            {/* Backdrop */}
            <div
              className="absolute inset-0 bg-black/50"
              onClick={() => setShowMobileFilters(false)}
            />
            
            {/* Drawer */}
            <div className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl max-h-[85vh] overflow-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Filters</h3>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>
              
              {/* Filter Content */}
              <div className="p-4 space-y-6">
                {/* Category */}
                {showCategoryFilter && (
                  <MobileFilterSection title="Service Category">
                    <div className="flex flex-wrap gap-2">
                      {SERVICE_CATEGORIES.map((cat) => (
                        <button
                          key={cat.id}
                          onClick={() => updateFilters({ category: currentCategory === cat.id ? null : cat.id, subcategory: null })}
                          className={cn(
                            "inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                            currentCategory === cat.id
                              ? "bg-brand-600 text-white"
                              : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                          )}
                        >
                          <cat.icon className="w-4 h-4" />
                          {cat.shortName}
                        </button>
                      ))}
                    </div>
                  </MobileFilterSection>
                )}
                
                {/* Area */}
                <MobileFilterSection title="Service Area">
                  <div className="flex flex-wrap gap-2">
                    {NAIROBI_AREAS.map((area) => (
                      <button
                        key={area}
                        onClick={() => updateFilters({ area: currentArea === area ? null : area })}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          currentArea === area
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {area}
                      </button>
                    ))}
                  </div>
                </MobileFilterSection>
                
                {/* Price Range */}
                <MobileFilterSection title="Price Range">
                  <div className="flex flex-wrap gap-2">
                    {PRICE_RANGES.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => {
                          const isSelected = currentPrice === opt.value;
                          if (isSelected) {
                            updateFilters({ priceMin: null, priceMax: null });
                          } else if (opt.value.includes("-")) {
                            const [min, max] = opt.value.split("-");
                            updateFilters({ priceMin: min, priceMax: max });
                          } else if (opt.value.endsWith("+")) {
                            updateFilters({ priceMin: opt.value.replace("+", ""), priceMax: null });
                          }
                        }}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          currentPrice === opt.value
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </MobileFilterSection>
                
                {/* Rating */}
                <MobileFilterSection title="Minimum Rating">
                  <div className="flex flex-wrap gap-2">
                    {RATING_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateFilters({ rating: currentRating === opt.value ? null : opt.value })}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          currentRating === opt.value
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </MobileFilterSection>
                
                {/* Toggle Options */}
                <MobileFilterSection title="Provider Features">
                  <div className="space-y-3">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentVerified}
                        onChange={() => updateFilters({ verified: currentVerified ? null : "true" })}
                        className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">Verified providers only</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentAvailable}
                        onChange={() => updateFilters({ available: currentAvailable ? null : "true" })}
                        className="w-5 h-5 rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                      />
                      <span className="text-sm text-gray-700">Available now</span>
                    </label>
                    
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={currentInstant}
                        onChange={() => updateFilters({ instant: currentInstant ? null : "true" })}
                        className="w-5 h-5 rounded border-gray-300 text-cta-600 focus:ring-cta-500"
                      />
                      <span className="text-sm text-gray-700">Instant booking available</span>
                    </label>
                  </div>
                </MobileFilterSection>
                
                {/* Sort */}
                <MobileFilterSection title="Sort By">
                  <div className="flex flex-wrap gap-2">
                    {PROVIDER_SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateFilters({ sort: opt.value })}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          currentSort === opt.value
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </MobileFilterSection>
              </div>
              
              {/* Footer Actions */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-2.5 px-4 rounded-lg border border-gray-300 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-2.5 px-4 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
                >
                  Show Results
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
