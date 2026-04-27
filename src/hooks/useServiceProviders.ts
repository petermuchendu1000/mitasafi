/**
 * useServiceProviders Hook
 * 
 * Client-side hook for fetching and managing service providers.
 * Uses TanStack Query for data fetching with caching.
 * 
 * Features:
 * - Automatic caching and deduplication
 * - Background refetching
 * - Optimistic updates for saves
 * - Pagination support
 */

"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  ServiceProviderWithDetails,
  ServiceProviderFilters,
  PaginatedResponse,
} from "@/types/service-providers";

// =============================================================================
// QUERY KEYS
// =============================================================================

export const serviceProviderKeys = {
  all: ["service-providers"] as const,
  lists: () => [...serviceProviderKeys.all, "list"] as const,
  list: (filters: ServiceProviderFilters) => [...serviceProviderKeys.lists(), filters] as const,
  details: () => [...serviceProviderKeys.all, "detail"] as const,
  detail: (id: string) => [...serviceProviderKeys.details(), id] as const,
  reviews: (id: string) => [...serviceProviderKeys.all, "reviews", id] as const,
  saved: () => [...serviceProviderKeys.all, "saved"] as const,
  categories: () => [...serviceProviderKeys.all, "categories"] as const,
};

// =============================================================================
// FETCH FUNCTIONS
// =============================================================================

async function fetchProviders(
  filters: ServiceProviderFilters
): Promise<PaginatedResponse<ServiceProviderWithDetails>> {
  const params = new URLSearchParams();
  
  if (filters.category) params.set("category", filters.category);
  if (filters.subcategory) params.set("subcategory", filters.subcategory);
  if (filters.area && filters.area.length > 0) params.set("area", filters.area.join(","));
  if (filters.priceMin) params.set("priceMin", String(filters.priceMin));
  if (filters.priceMax) params.set("priceMax", String(filters.priceMax));
  if (filters.ratingMin) params.set("ratingMin", String(filters.ratingMin));
  if (filters.verifiedOnly) params.set("verified", "true");
  if (filters.availableNow) params.set("available", "true");
  if (filters.instantBooking) params.set("instant", "true");
  if (filters.search) params.set("q", filters.search);
  if (filters.sortBy) params.set("sortBy", filters.sortBy);
  if (filters.sortOrder) params.set("sortOrder", filters.sortOrder);
  if (filters.limit) params.set("limit", String(filters.limit));
  if (filters.offset) params.set("offset", String(filters.offset));
  
  const res = await fetch(`/api/services/providers?${params.toString()}`);
  
  if (!res.ok) {
    throw new Error("Failed to fetch providers");
  }
  
  return res.json();
}

async function fetchProvider(id: string): Promise<ServiceProviderWithDetails> {
  const res = await fetch(`/api/services/providers/${id}`);
  
  if (!res.ok) {
    throw new Error("Failed to fetch provider");
  }
  
  const data = await res.json();
  return data.provider;
}

async function fetchProviderReviews(
  id: string,
  page: number = 1,
  limit: number = 10
): Promise<{ reviews: unknown[]; total: number }> {
  const res = await fetch(`/api/services/providers/${id}/reviews?page=${page}&limit=${limit}`);
  
  if (!res.ok) {
    throw new Error("Failed to fetch reviews");
  }
  
  return res.json();
}

async function fetchSavedProviders(): Promise<ServiceProviderWithDetails[]> {
  const res = await fetch("/api/services/saved");
  
  if (!res.ok) {
    throw new Error("Failed to fetch saved providers");
  }
  
  const data = await res.json();
  return data.providers || [];
}

async function toggleSaveProvider(providerId: string): Promise<{ saved: boolean }> {
  const res = await fetch("/api/services/saved", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ providerId }),
  });
  
  if (!res.ok) {
    throw new Error("Failed to save provider");
  }
  
  return res.json();
}

async function fetchCategories(): Promise<unknown[]> {
  const res = await fetch("/api/services/categories");
  
  if (!res.ok) {
    throw new Error("Failed to fetch categories");
  }
  
  const data = await res.json();
  return data.categories || [];
}

// =============================================================================
// HOOKS
// =============================================================================

/**
 * Fetch list of providers with filters and pagination
 */
export function useServiceProviders(filters: ServiceProviderFilters = {}) {
  return useQuery({
    queryKey: serviceProviderKeys.list(filters),
    queryFn: () => fetchProviders(filters),
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Fetch single provider by ID
 */
export function useServiceProvider(id: string) {
  return useQuery({
    queryKey: serviceProviderKeys.detail(id),
    queryFn: () => fetchProvider(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch provider reviews with pagination
 */
export function useProviderReviews(id: string, page: number = 1, limit: number = 10) {
  return useQuery({
    queryKey: [...serviceProviderKeys.reviews(id), page, limit],
    queryFn: () => fetchProviderReviews(id, page, limit),
    enabled: !!id,
    staleTime: 1000 * 60 * 5, // 5 minutes
  });
}

/**
 * Fetch saved providers for current user
 */
export function useSavedProviders() {
  return useQuery({
    queryKey: serviceProviderKeys.saved(),
    queryFn: fetchSavedProviders,
    staleTime: 1000 * 60 * 2, // 2 minutes
  });
}

/**
 * Toggle save/unsave provider
 */
export function useToggleSaveProvider() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: toggleSaveProvider,
    onSuccess: () => {
      // Invalidate saved providers list
      queryClient.invalidateQueries({ queryKey: serviceProviderKeys.saved() });
    },
  });
}

/**
 * Fetch all categories
 */
export function useServiceCategories() {
  return useQuery({
    queryKey: serviceProviderKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 1000 * 60 * 60, // 1 hour (categories rarely change)
  });
}

/**
 * Check if a provider is saved
 */
export function useIsProviderSaved(providerId: string): boolean {
  const { data: savedProviders } = useSavedProviders();
  return savedProviders?.some((p) => p.id === providerId) ?? false;
}

// =============================================================================
// RE-EXPORT FOR CONVENIENCE
// =============================================================================

export { serviceProviderKeys as queryKeys };
