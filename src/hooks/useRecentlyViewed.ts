// =============================================================================
// MITASAFI: RECENTLY VIEWED HOOK
// =============================================================================
// Tracks recently viewed providers and services in localStorage.
// Used for personalization on landing page (Fiverr-style).
// =============================================================================

"use client";

import { useState, useEffect, useCallback } from "react";

// =============================================================================
// TYPES
// =============================================================================

export interface RecentlyViewedProvider {
  id: string;
  business_name: string;
  tagline: string | null;
  logo_url: string | null;
  rating_average: number | null;
  rating_count: number | null;
  min_price: number | null;
  categories: string[];
  viewedAt: number; // timestamp
}

export interface RecentlyViewedService {
  id: string;
  name: string;
  slug: string;
  category_name: string;
  category_slug: string;
  subcategory_name: string;
  subcategory_slug: string;
  viewedAt: number;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const PROVIDERS_KEY = "mitasafi_recently_viewed_providers";
const SERVICES_KEY = "mitasafi_recently_viewed_services";
const MAX_ITEMS = 12;
const EXPIRY_DAYS = 30;

// =============================================================================
// MAIN HOOK
// =============================================================================

export function useRecentlyViewed() {
  const [providers, setProviders] = useState<RecentlyViewedProvider[]>([]);
  const [services, setServices] = useState<RecentlyViewedService[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      // Load providers
      const storedProviders = localStorage.getItem(PROVIDERS_KEY);
      if (storedProviders) {
        const parsed = JSON.parse(storedProviders) as RecentlyViewedProvider[];
        // Filter out expired items (older than EXPIRY_DAYS)
        const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const valid = parsed.filter((p) => p.viewedAt > cutoff);
        setProviders(valid);
        
        // Clean up storage if items were removed
        if (valid.length !== parsed.length) {
          localStorage.setItem(PROVIDERS_KEY, JSON.stringify(valid));
        }
      }

      // Load services
      const storedServices = localStorage.getItem(SERVICES_KEY);
      if (storedServices) {
        const parsed = JSON.parse(storedServices) as RecentlyViewedService[];
        const cutoff = Date.now() - EXPIRY_DAYS * 24 * 60 * 60 * 1000;
        const valid = parsed.filter((s) => s.viewedAt > cutoff);
        setServices(valid);
        
        if (valid.length !== parsed.length) {
          localStorage.setItem(SERVICES_KEY, JSON.stringify(valid));
        }
      }
    } catch (error) {
      console.error("Error loading recently viewed:", error);
    }

    setIsLoaded(true);
  }, []);

  // Add provider to recently viewed
  const addProvider = useCallback((provider: Omit<RecentlyViewedProvider, "viewedAt">) => {
    if (typeof window === "undefined") return;

    setProviders((prev) => {
      // Remove if already exists
      const filtered = prev.filter((p) => p.id !== provider.id);
      
      // Add to beginning with timestamp
      const updated = [
        { ...provider, viewedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      
      // Persist
      try {
        localStorage.setItem(PROVIDERS_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving recently viewed providers:", error);
      }
      
      return updated;
    });
  }, []);

  // Add service to recently viewed
  const addService = useCallback((service: Omit<RecentlyViewedService, "viewedAt">) => {
    if (typeof window === "undefined") return;

    setServices((prev) => {
      const filtered = prev.filter((s) => s.id !== service.id);
      
      const updated = [
        { ...service, viewedAt: Date.now() },
        ...filtered,
      ].slice(0, MAX_ITEMS);
      
      try {
        localStorage.setItem(SERVICES_KEY, JSON.stringify(updated));
      } catch (error) {
        console.error("Error saving recently viewed services:", error);
      }
      
      return updated;
    });
  }, []);

  // Clear all
  const clearAll = useCallback(() => {
    if (typeof window === "undefined") return;
    
    setProviders([]);
    setServices([]);
    localStorage.removeItem(PROVIDERS_KEY);
    localStorage.removeItem(SERVICES_KEY);
  }, []);

  // Remove single provider
  const removeProvider = useCallback((providerId: string) => {
    if (typeof window === "undefined") return;
    
    setProviders((prev) => {
      const updated = prev.filter((p) => p.id !== providerId);
      localStorage.setItem(PROVIDERS_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  // Remove single service
  const removeService = useCallback((serviceId: string) => {
    if (typeof window === "undefined") return;
    
    setServices((prev) => {
      const updated = prev.filter((s) => s.id !== serviceId);
      localStorage.setItem(SERVICES_KEY, JSON.stringify(updated));
      return updated;
    });
  }, []);

  return {
    providers,
    services,
    isLoaded,
    addProvider,
    addService,
    removeProvider,
    removeService,
    clearAll,
    hasHistory: providers.length > 0 || services.length > 0,
  };
}

// =============================================================================
// STANDALONE FUNCTIONS (for use outside React)
// =============================================================================

export function trackProviderView(provider: Omit<RecentlyViewedProvider, "viewedAt">) {
  if (typeof window === "undefined") return;
  
  try {
    const stored = localStorage.getItem(PROVIDERS_KEY);
    const existing = stored ? (JSON.parse(stored) as RecentlyViewedProvider[]) : [];
    
    const filtered = existing.filter((p) => p.id !== provider.id);
    const updated = [
      { ...provider, viewedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    
    localStorage.setItem(PROVIDERS_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error tracking provider view:", error);
  }
}

export function trackServiceView(service: Omit<RecentlyViewedService, "viewedAt">) {
  if (typeof window === "undefined") return;
  
  try {
    const stored = localStorage.getItem(SERVICES_KEY);
    const existing = stored ? (JSON.parse(stored) as RecentlyViewedService[]) : [];
    
    const filtered = existing.filter((s) => s.id !== service.id);
    const updated = [
      { ...service, viewedAt: Date.now() },
      ...filtered,
    ].slice(0, MAX_ITEMS);
    
    localStorage.setItem(SERVICES_KEY, JSON.stringify(updated));
  } catch (error) {
    console.error("Error tracking service view:", error);
  }
}
