/**
 * useServicesSearch Hook
 * 
 * Client-side hook for managing service search state.
 * Provides URL-synced filter state with optimistic updates.
 * 
 * Features:
 * - URL state synchronization
 * - Debounced search
 * - Filter state management
 * - History preservation
 * - Type-safe filter updates
 */

"use client";

import { useCallback, useMemo } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { SERVICE_CATEGORIES, NAIROBI_AREAS } from "@/lib/constants";

// =============================================================================
// TYPES
// =============================================================================

export interface ServiceFiltersState {
  query: string;
  category: string | null;
  subcategories: string[];
  services: string[];
  areas: string[];
  priceRanges: string[];
  rating: string | null;
  verified: boolean;
  available: boolean;
  instant: boolean;
  sort: string;
  page: number;
}

export interface UseServicesSearchReturn {
  filters: ServiceFiltersState;
  hasFilters: boolean;
  activeFilterCount: number;
  setQuery: (query: string) => void;
  setCategory: (category: string | null) => void;
  toggleSubcategory: (subcategory: string) => void;
  toggleService: (service: string) => void;
  toggleArea: (area: string) => void;
  togglePriceRange: (priceRange: string) => void;
  setRating: (rating: string | null) => void;
  toggleVerified: () => void;
  toggleAvailable: () => void;
  toggleInstant: () => void;
  setSort: (sort: string) => void;
  setPage: (page: number) => void;
  clearFilters: () => void;
  clearFilter: (key: keyof ServiceFiltersState) => void;
  getSearchUrl: (overrides?: Partial<ServiceFiltersState>) => string;
}

// =============================================================================
// PARSE FILTERS FROM URL
// =============================================================================

function parseFiltersFromUrl(searchParams: URLSearchParams): ServiceFiltersState {
  return {
    query: searchParams.get("q") || "",
    category: searchParams.get("category") || null,
    subcategories: searchParams.get("subcategory")?.split(",").filter(Boolean) || [],
    services: searchParams.get("services")?.split(",").filter(Boolean) || [],
    areas: searchParams.get("area")?.split(",").filter(Boolean) || [],
    priceRanges: searchParams.get("price")?.split(",").filter(Boolean) || [],
    rating: searchParams.get("rating") || null,
    verified: searchParams.get("verified") === "true",
    available: searchParams.get("available") === "true",
    instant: searchParams.get("instant") === "true",
    sort: searchParams.get("sort") || "recommended",
    page: Math.max(1, parseInt(searchParams.get("page") || "1", 10)),
  };
}

// =============================================================================
// BUILD URL FROM FILTERS
// =============================================================================

function buildUrlFromFilters(
  pathname: string,
  filters: Partial<ServiceFiltersState>
): string {
  const params = new URLSearchParams();

  if (filters.query) params.set("q", filters.query);
  if (filters.category) params.set("category", filters.category);
  if (filters.subcategories?.length) params.set("subcategory", filters.subcategories.join(","));
  if (filters.services?.length) params.set("services", filters.services.join(","));
  if (filters.areas?.length) params.set("area", filters.areas.join(","));
  if (filters.priceRanges?.length) params.set("price", filters.priceRanges.join(","));
  if (filters.rating) params.set("rating", filters.rating);
  if (filters.verified) params.set("verified", "true");
  if (filters.available) params.set("available", "true");
  if (filters.instant) params.set("instant", "true");
  if (filters.sort && filters.sort !== "recommended") params.set("sort", filters.sort);
  if (filters.page && filters.page > 1) params.set("page", filters.page.toString());

  const queryString = params.toString();
  return queryString ? `${pathname}?${queryString}` : pathname;
}

// =============================================================================
// HOOK
// =============================================================================

export function useServicesSearch(): UseServicesSearchReturn {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Parse current filters from URL
  const filters = useMemo(
    () => parseFiltersFromUrl(searchParams),
    [searchParams]
  );

  // Check if any filters are active
  const hasFilters = useMemo(() => {
    return !!(
      filters.query ||
      filters.category ||
      filters.subcategories.length ||
      filters.services.length ||
      filters.areas.length ||
      filters.priceRanges.length ||
      filters.rating ||
      filters.verified ||
      filters.available ||
      filters.instant
    );
  }, [filters]);

  // Count active filters
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.query) count++;
    if (filters.category) count++;
    count += filters.subcategories.length;
    count += filters.services.length;
    count += filters.areas.length;
    count += filters.priceRanges.length;
    if (filters.rating) count++;
    if (filters.verified) count++;
    if (filters.available) count++;
    if (filters.instant) count++;
    return count;
  }, [filters]);

  // Update URL with new filters
  const updateFilters = useCallback(
    (updates: Partial<ServiceFiltersState>, resetPage = true) => {
      const newFilters = { ...filters, ...updates };
      if (resetPage && !("page" in updates)) {
        newFilters.page = 1;
      }
      const url = buildUrlFromFilters(pathname, newFilters);
      router.push(url, { scroll: false });
    },
    [filters, pathname, router]
  );

  // Individual filter setters
  const setQuery = useCallback(
    (query: string) => updateFilters({ query }),
    [updateFilters]
  );

  const setCategory = useCallback(
    (category: string | null) =>
      updateFilters({
        category,
        subcategories: [], // Clear subcategories when category changes
        services: [],
      }),
    [updateFilters]
  );

  const toggleSubcategory = useCallback(
    (subcategory: string) => {
      const newSubcategories = filters.subcategories.includes(subcategory)
        ? filters.subcategories.filter((s) => s !== subcategory)
        : [...filters.subcategories, subcategory];
      updateFilters({ subcategories: newSubcategories });
    },
    [filters.subcategories, updateFilters]
  );

  const toggleService = useCallback(
    (service: string) => {
      const newServices = filters.services.includes(service)
        ? filters.services.filter((s) => s !== service)
        : [...filters.services, service];
      updateFilters({ services: newServices });
    },
    [filters.services, updateFilters]
  );

  const toggleArea = useCallback(
    (area: string) => {
      const newAreas = filters.areas.includes(area)
        ? filters.areas.filter((a) => a !== area)
        : [...filters.areas, area];
      updateFilters({ areas: newAreas });
    },
    [filters.areas, updateFilters]
  );

  const togglePriceRange = useCallback(
    (priceRange: string) => {
      const newRanges = filters.priceRanges.includes(priceRange)
        ? filters.priceRanges.filter((p) => p !== priceRange)
        : [...filters.priceRanges, priceRange];
      updateFilters({ priceRanges: newRanges });
    },
    [filters.priceRanges, updateFilters]
  );

  const setRating = useCallback(
    (rating: string | null) => updateFilters({ rating }),
    [updateFilters]
  );

  const toggleVerified = useCallback(
    () => updateFilters({ verified: !filters.verified }),
    [filters.verified, updateFilters]
  );

  const toggleAvailable = useCallback(
    () => updateFilters({ available: !filters.available }),
    [filters.available, updateFilters]
  );

  const toggleInstant = useCallback(
    () => updateFilters({ instant: !filters.instant }),
    [filters.instant, updateFilters]
  );

  const setSort = useCallback(
    (sort: string) => updateFilters({ sort }, false),
    [updateFilters]
  );

  const setPage = useCallback(
    (page: number) => updateFilters({ page }, false),
    [updateFilters]
  );

  const clearFilters = useCallback(() => {
    router.push(pathname, { scroll: false });
  }, [pathname, router]);

  const clearFilter = useCallback(
    (key: keyof ServiceFiltersState) => {
      const defaultValues: Partial<ServiceFiltersState> = {
        query: "",
        category: null,
        subcategories: [],
        services: [],
        areas: [],
        priceRanges: [],
        rating: null,
        verified: false,
        available: false,
        instant: false,
        sort: "recommended",
        page: 1,
      };
      updateFilters({ [key]: defaultValues[key] });
    },
    [updateFilters]
  );

  const getSearchUrl = useCallback(
    (overrides?: Partial<ServiceFiltersState>) => {
      const newFilters = { ...filters, ...overrides };
      return buildUrlFromFilters(pathname, newFilters);
    },
    [filters, pathname]
  );

  return {
    filters,
    hasFilters,
    activeFilterCount,
    setQuery,
    setCategory,
    toggleSubcategory,
    toggleService,
    toggleArea,
    togglePriceRange,
    setRating,
    toggleVerified,
    toggleAvailable,
    toggleInstant,
    setSort,
    setPage,
    clearFilters,
    clearFilter,
    getSearchUrl,
  };
}
