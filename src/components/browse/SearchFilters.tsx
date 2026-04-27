/**
 * Search Filters Component
 * 
 * Filter controls for the browse listings page.
 * Responsive: horizontal bar on desktop, drawer on mobile.
 * 
 * Design: 70% teal, 30% orange accents
 */

"use client";

import { useState, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { 
  Search, 
  SlidersHorizontal, 
  X, 
  ChevronDown,
  Home,
  MapPin,
  DollarSign,
  Bed,
  CheckCircle,
  Filter
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SearchFiltersProps {
  areas?: string[];
  propertyTypes?: string[];
  className?: string;
  hideSearch?: boolean;
}

// Property type options
const PROPERTY_TYPE_OPTIONS = [
  { value: "apartment", label: "Apartment" },
  { value: "bedsitter", label: "Bedsitter" },
  { value: "studio", label: "Studio" },
  { value: "house", label: "House" },
  { value: "townhouse", label: "Townhouse" },
  { value: "villa", label: "Villa" },
  { value: "maisonette", label: "Maisonette" },
];

// Bedroom options
const BEDROOM_OPTIONS = [
  { value: "0", label: "Studio/Bedsitter" },
  { value: "1", label: "1 Bedroom" },
  { value: "2", label: "2 Bedrooms" },
  { value: "3", label: "3 Bedrooms" },
  { value: "4", label: "4+ Bedrooms" },
];

// Price range options (in KES)
const PRICE_RANGES = [
  { value: "0-20000", label: "Under 20K" },
  { value: "20000-40000", label: "20K - 40K" },
  { value: "40000-70000", label: "40K - 70K" },
  { value: "70000-100000", label: "70K - 100K" },
  { value: "100000-150000", label: "100K - 150K" },
  { value: "150000+", label: "150K+" },
];

// Sort options
const SORT_OPTIONS = [
  { value: "newest", label: "Newest First" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "popular", label: "Most Popular" },
];

// Popular Nairobi areas
const POPULAR_AREAS = [
  "Westlands",
  "Kilimani",
  "Lavington",
  "Kileleshwa",
  "South B",
  "South C",
  "Langata",
  "Karen",
  "Ruaka",
  "Ruiru",
  "Parklands",
  "Upper Hill",
];

export function SearchFilters({ areas = POPULAR_AREAS, propertyTypes, className, hideSearch = false }: SearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [searchQuery, setSearchQuery] = useState(searchParams.get("q") || "");

  // Get current filter values from URL
  const currentArea = searchParams.get("area") || "";
  const currentType = searchParams.get("type") || "";
  const currentBedrooms = searchParams.get("beds") || "";
  const currentPrice = searchParams.get("price") || "";
  const currentSort = searchParams.get("sort") || "newest";
  const currentVerified = searchParams.get("verified") === "true";
  const currentAvailable = searchParams.get("available") === "true";

  // Update URL params
  const updateFilters = useCallback((updates: Record<string, string | null>) => {
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
  }, [router, pathname, searchParams]);

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
    currentArea,
    currentType,
    currentBedrooms,
    currentPrice,
    currentVerified,
    currentAvailable,
    searchParams.get("q"),
  ].filter(Boolean).length;

  return (
    <div className={cn("bg-white border-b border-gray-200", className)}>
      {/* Desktop Filters */}
      <div className="hidden lg:block">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          {/* Search Bar - only show if not hidden */}
          {!hideSearch && (
            <form onSubmit={handleSearch} className="mb-4">
              <div className="relative max-w-2xl mx-auto">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by area, neighborhood, or keyword..."
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
            {/* Area Filter */}
            <FilterDropdown
              label="Area"
              icon={<MapPin className="w-4 h-4" />}
              value={currentArea}
              options={areas.map(area => ({ value: area, label: area }))}
              onChange={(value) => updateFilters({ area: value })}
              placeholder="All Areas"
            />

            {/* Property Type */}
            <FilterDropdown
              label="Type"
              icon={<Home className="w-4 h-4" />}
              value={currentType}
              options={PROPERTY_TYPE_OPTIONS}
              onChange={(value) => updateFilters({ type: value })}
              placeholder="All Types"
            />

            {/* Bedrooms */}
            <FilterDropdown
              label="Beds"
              icon={<Bed className="w-4 h-4" />}
              value={currentBedrooms}
              options={BEDROOM_OPTIONS}
              onChange={(value) => updateFilters({ beds: value })}
              placeholder="Any"
            />

            {/* Price Range */}
            <FilterDropdown
              label="Price"
              icon={<DollarSign className="w-4 h-4" />}
              value={currentPrice}
              options={PRICE_RANGES}
              onChange={(value) => updateFilters({ price: value })}
              placeholder="Any Price"
            />

            {/* Verified Only Toggle */}
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
              Verified Only
            </button>

            {/* Divider */}
            <div className="h-8 w-px bg-gray-200 mx-2" />

            {/* Sort */}
            <FilterDropdown
              label="Sort"
              value={currentSort}
              options={SORT_OPTIONS}
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
            <form onSubmit={handleSearch} className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search listings..."
                  className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </form>
            
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
            
            {["Westlands", "Kilimani", "Lavington"].map((area) => (
              <button
                key={area}
                onClick={() => updateFilters({ area: currentArea === area ? null : area })}
                className={cn(
                  "flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-all",
                  currentArea === area
                    ? "bg-brand-600 text-white"
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                )}
              >
                {area}
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
                {/* Area */}
                <MobileFilterSection title="Area">
                  <div className="flex flex-wrap gap-2">
                    {areas.slice(0, 12).map((area) => (
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

                {/* Property Type */}
                <MobileFilterSection title="Property Type">
                  <div className="flex flex-wrap gap-2">
                    {PROPERTY_TYPE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateFilters({ type: currentType === opt.value ? null : opt.value })}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          currentType === opt.value
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </MobileFilterSection>

                {/* Bedrooms */}
                <MobileFilterSection title="Bedrooms">
                  <div className="flex flex-wrap gap-2">
                    {BEDROOM_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateFilters({ beds: currentBedrooms === opt.value ? null : opt.value })}
                        className={cn(
                          "px-3 py-2 rounded-lg text-sm font-medium transition-all",
                          currentBedrooms === opt.value
                            ? "bg-brand-600 text-white"
                            : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </MobileFilterSection>

                {/* Price */}
                <MobileFilterSection title="Price Range">
                  <div className="flex flex-wrap gap-2">
                    {PRICE_RANGES.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateFilters({ price: currentPrice === opt.value ? null : opt.value })}
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

                {/* Sort */}
                <MobileFilterSection title="Sort By">
                  <div className="space-y-2">
                    {SORT_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => updateFilters({ sort: opt.value })}
                        className={cn(
                          "w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
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

              {/* Footer */}
              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex gap-3">
                <button
                  onClick={clearFilters}
                  className="flex-1 py-3 rounded-xl border border-gray-200 text-gray-700 font-medium hover:bg-gray-50 transition-colors"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowMobileFilters(false)}
                  className="flex-1 py-3 rounded-xl bg-brand-600 text-white font-medium hover:bg-brand-700 transition-colors"
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

// Desktop Filter Dropdown Component
interface FilterDropdownProps {
  label: string;
  icon?: React.ReactNode;
  value: string;
  options: { value: string; label: string }[];
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
  placeholder = "Any", 
  showClear = true,
  isSort = false
}: FilterDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  
  const selectedOption = options.find(opt => opt.value === value);
  const displayValue = selectedOption?.label || placeholder;

  // Sort dropdown never highlights as "active filter"
  const hasActiveSelection = value && !isSort;

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-lg border text-sm font-medium transition-all",
          hasActiveSelection
            ? "bg-brand-50 border-brand-300 text-brand-700"
            : "bg-white border-gray-200 text-gray-700 hover:border-gray-300"
        )}
      >
        {icon}
        <span className="hidden sm:inline">{label}:</span>
        <span className={cn(!value && "text-gray-500")}>{displayValue}</span>
        <ChevronDown className={cn("w-4 h-4 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setIsOpen(false)}
          />
          <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20 max-h-64 overflow-auto">
            {showClear && value && (
              <button
                onClick={() => { onChange(""); setIsOpen(false); }}
                className="w-full text-left px-4 py-2 text-sm text-gray-500 hover:bg-gray-50 transition-colors"
              >
                Clear selection
              </button>
            )}
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => { onChange(option.value); setIsOpen(false); }}
                className={cn(
                  "w-full text-left px-4 py-2 text-sm transition-colors",
                  value === option.value
                    ? "bg-brand-50 text-brand-700 font-medium"
                    : "text-gray-700 hover:bg-gray-50"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Mobile Filter Section Component
function MobileFilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h4 className="text-sm font-semibold text-gray-900 mb-3">{title}</h4>
      {children}
    </div>
  );
}
