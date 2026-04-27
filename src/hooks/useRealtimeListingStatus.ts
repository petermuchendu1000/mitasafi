/**
 * Real-time Listing Status Hook
 * 
 * PURPOSE:
 * Provides real-time notifications to tenants when listings they've saved change status.
 * Uses Supabase Realtime to listen for UPDATE events on the listings table.
 * 
 * WHY WEBSOCKET (not polling):
 * - Prevents wasted inquiries: Tenant shouldn't inquire on a rented/paused property
 * - Fan-out pattern: One status change needs to notify many users
 * - User experience: Immediate feedback without page refresh
 * 
 * WHO:
 * - Tenants who have saved listings (authenticated or local storage based)
 * 
 * WHEN:
 * - Landlord calls pauseListing(), resumeListing(), markAsRented(), deleteListing()
 * - UPDATE event triggers on listings table for monitored listing IDs
 * 
 * HOW:
 * - Subscribes to Supabase Realtime channel on listings table
 * - Filters by listing IDs in user's saved list
 * - Calls onStatusChange callback when status changes
 * - Integrates with existing notification system (localStorage)
 */

"use client";

import { useEffect, useRef, useCallback, useState, useMemo } from "react";
import { createClient } from "@/lib/supabase/client";
import { addNotification } from "@/lib/notifications";
import type { RealtimeChannel, RealtimePostgresUpdatePayload } from "@supabase/supabase-js";

// Types for listing status updates
export interface ListingStatusUpdate {
  id: string;
  title: string;
  status: "draft" | "active" | "paused" | "rented" | "expired" | "archived";
  updated_at: string;
}

// Minimal listing row from realtime (only what we need)
interface ListingRealtimeRow {
  id: string;
  title: string;
  status: string;
  updated_at: string;
}

interface UseRealtimeListingStatusOptions {
  /**
   * Array of listing IDs to monitor for status changes
   */
  listingIds: string[];
  
  /**
   * Callback fired when a listing status changes
   */
  onStatusChange?: (update: ListingStatusUpdate, previousStatus?: string) => void;
  
  /**
   * Whether the subscription is enabled (default: true)
   * Set to false to temporarily disable without unmounting
   */
  enabled?: boolean;
  
  /**
   * Whether to automatically add notifications to localStorage (default: true)
   */
  autoNotify?: boolean;
  
  /**
   * Map of listing IDs to their last known status (for detecting changes)
   * If not provided, will notify on any update
   */
  lastKnownStatuses?: Map<string, string>;
}

interface UseRealtimeListingStatusReturn {
  /**
   * Whether the realtime connection is active
   */
  isConnected: boolean;
  
  /**
   * Current connection status
   */
  status: "connecting" | "connected" | "disconnected" | "error" | "idle";
  
  /**
   * Error message if connection failed
   */
  error: string | null;
  
  /**
   * Recent status changes received (limited to last 10)
   */
  recentChanges: ListingStatusUpdate[];
  
  /**
   * Clear recent changes list
   */
  clearChanges: () => void;
}

export function useRealtimeListingStatus(
  options: UseRealtimeListingStatusOptions
): UseRealtimeListingStatusReturn {
  const { 
    listingIds, 
    onStatusChange, 
    enabled = true, 
    autoNotify = true,
    lastKnownStatuses 
  } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error" | "idle">("idle");
  const [error, setError] = useState<string | null>(null);
  const [recentChanges, setRecentChanges] = useState<ListingStatusUpdate[]>([]);
  
  // Refs to avoid stale closures
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onStatusChangeRef = useRef(onStatusChange);
  const lastKnownStatusesRef = useRef(lastKnownStatuses);
  
  // Keep callback refs updated
  useEffect(() => {
    onStatusChangeRef.current = onStatusChange;
  }, [onStatusChange]);
  
  useEffect(() => {
    lastKnownStatusesRef.current = lastKnownStatuses;
  }, [lastKnownStatuses]);
  
  // Memoize listing IDs to prevent unnecessary re-subscriptions
  const listingIdsKey = useMemo(() => {
    const sorted = [...listingIds].sort();
    return sorted.join(",");
  }, [listingIds]);
  
  const clearChanges = useCallback(() => {
    setRecentChanges([]);
  }, []);

  // Subscribe to realtime listing status changes
  useEffect(() => {
    // Don't subscribe if no listings to monitor
    if (!enabled || listingIds.length === 0) {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
      setStatus(listingIds.length === 0 ? "idle" : "disconnected");
      return;
    }

    const supabase = createClient();
    
    const setupSubscription = async () => {
      try {
        setStatus("connecting");
        setError(null);
        
        // For Supabase Realtime, we can't filter by multiple IDs directly
        // We need to listen to all updates and filter client-side
        // OR use a function/view - for now, we'll use client-side filtering
        // This is acceptable because the filter happens in JS, not DB
        
        const channel = supabase
          .channel(`listing-status-${Date.now()}`)
          .on<ListingRealtimeRow>(
            "postgres_changes",
            {
              event: "UPDATE",
              schema: "public",
              table: "listings",
              // Note: Supabase Realtime filter doesn't support IN operator
              // We filter client-side from the IDs array
            },
            (payload: RealtimePostgresUpdatePayload<ListingRealtimeRow>) => {
              const listing = payload.new;
              const oldListing = payload.old as Partial<ListingRealtimeRow>;
              
              // Check if this listing is in our monitored list
              if (!listingIds.includes(listing.id)) {
                return;
              }
              
              // Check if status actually changed
              const previousStatus = lastKnownStatusesRef.current?.get(listing.id) || oldListing?.status;
              const newStatus = listing.status;
              
              // Skip if status didn't change
              if (previousStatus && previousStatus === newStatus) {
                return;
              }
              
              const update: ListingStatusUpdate = {
                id: listing.id,
                title: listing.title,
                status: newStatus as ListingStatusUpdate["status"],
                updated_at: listing.updated_at,
              };
              
              // Add to recent changes (keep last 10)
              setRecentChanges((prev) => [update, ...prev].slice(0, 10));
              
              // Auto-notify if enabled
              if (autoNotify && previousStatus) {
                let notificationType: "rented" | "paused" | "deleted" | "resumed" = "paused";
                
                if (newStatus === "rented") {
                  notificationType = "rented";
                } else if (newStatus === "paused") {
                  notificationType = "paused";
                } else if (newStatus === "archived") {
                  notificationType = "deleted";
                } else if (newStatus === "active" && previousStatus !== "active") {
                  notificationType = "resumed";
                }
                
                // Only notify for meaningful transitions
                if (previousStatus === "active" || notificationType === "resumed") {
                  addNotification({
                    listingId: listing.id,
                    listingTitle: listing.title,
                    type: notificationType,
                    timestamp: Date.now(),
                  });
                }
              }
              
              // Call callback if provided
              if (onStatusChangeRef.current) {
                onStatusChangeRef.current(update, previousStatus);
              }
              
              // Dispatch custom event for other components
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("listingStatusChanged", { 
                    detail: { ...update, previousStatus } 
                  })
                );
              }
            }
          )
          .subscribe((subscriptionStatus) => {
            if (subscriptionStatus === "SUBSCRIBED") {
              setIsConnected(true);
              setStatus("connected");
              setError(null);
            } else if (subscriptionStatus === "CHANNEL_ERROR") {
              setIsConnected(false);
              setStatus("error");
              setError("Failed to connect to real-time updates");
            } else if (subscriptionStatus === "TIMED_OUT") {
              setIsConnected(false);
              setStatus("error");
              setError("Connection timed out");
            } else if (subscriptionStatus === "CLOSED") {
              setIsConnected(false);
              setStatus("disconnected");
            }
          });
        
        channelRef.current = channel;
        
      } catch (err) {
        console.error("[useRealtimeListingStatus] Setup error:", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };
    
    setupSubscription();
    
    // Cleanup on unmount or when listing IDs change
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [enabled, listingIdsKey, autoNotify]);

  return {
    isConnected,
    status,
    error,
    recentChanges,
    clearChanges,
  };
}

/**
 * Hook to listen for listing status change events
 * Lighter weight than full subscription - just listens to custom events
 */
export function useListingStatusEvents(
  onStatusChange: (update: ListingStatusUpdate & { previousStatus?: string }) => void
): void {
  const callbackRef = useRef(onStatusChange);
  
  useEffect(() => {
    callbackRef.current = onStatusChange;
  }, [onStatusChange]);
  
  useEffect(() => {
    const handleStatusChange = (event: CustomEvent) => {
      callbackRef.current(event.detail);
    };
    
    window.addEventListener("listingStatusChanged", handleStatusChange as EventListener);
    
    return () => {
      window.removeEventListener("listingStatusChanged", handleStatusChange as EventListener);
    };
  }, []);
}
