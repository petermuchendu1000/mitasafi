/**
 * Real-time Inquiry Notifications Hook
 * 
 * PURPOSE:
 * Provides real-time notifications to landlords when tenants submit new inquiries.
 * Uses Supabase Realtime to listen for INSERT events on the inquiries table.
 * 
 * WHY WEBSOCKET (not polling):
 * - First-responder advantage: Landlords who respond quickly win tenants
 * - Push is essential: Landlord could be on dashboard already
 * - Efficient: Only fires when relevant (vs polling every 30s for 1000 landlords)
 * 
 * WHO:
 * - Landlords (authenticated users with landlord role)
 * 
 * WHEN:
 * - Tenant submits inquiry via /api/listings/inquire
 * - INSERT event triggers on inquiries table filtered by landlord_id
 * 
 * HOW:
 * - Subscribes to Supabase Realtime channel on inquiries table
 * - Filters by landlord_id = current user
 * - Calls onNewInquiry callback with inquiry data
 * - Manages subscription lifecycle (connect, reconnect, cleanup)
 */

"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePostgresInsertPayload } from "@supabase/supabase-js";

// Types for inquiry data from realtime events
export interface RealtimeInquiry {
  id: string;
  listing_id: string;
  landlord_id: string;
  user_id: string | null;
  name: string;
  email: string | null;
  phone: string | null;
  message: string | null;
  request_viewing: boolean;
  preferred_viewing_time: string | null;
  preferred_viewing_day: string | null;
  status: string;
  source: string | null;
  created_at: string;
}

interface UseRealtimeInquiriesOptions {
  /**
   * Callback fired when a new inquiry is received
   */
  onNewInquiry?: (inquiry: RealtimeInquiry) => void;
  
  /**
   * Whether the subscription is enabled (default: true)
   * Set to false to temporarily disable without unmounting
   */
  enabled?: boolean;
}

interface UseRealtimeInquiriesReturn {
  /**
   * Whether the realtime connection is active
   */
  isConnected: boolean;
  
  /**
   * Current connection status
   */
  status: "connecting" | "connected" | "disconnected" | "error";
  
  /**
   * Error message if connection failed
   */
  error: string | null;
  
  /**
   * Count of new inquiries received since hook mounted (for badge)
   */
  newInquiriesCount: number;
  
  /**
   * Reset the new inquiries counter (e.g., when user views inquiries)
   */
  resetCount: () => void;
}

export function useRealtimeInquiries(
  options: UseRealtimeInquiriesOptions = {}
): UseRealtimeInquiriesReturn {
  const { onNewInquiry, enabled = true } = options;
  
  const [isConnected, setIsConnected] = useState(false);
  const [status, setStatus] = useState<"connecting" | "connected" | "disconnected" | "error">("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [newInquiriesCount, setNewInquiriesCount] = useState(0);
  const [userId, setUserId] = useState<string | null>(null);
  
  // Refs to avoid stale closures
  const channelRef = useRef<RealtimeChannel | null>(null);
  const onNewInquiryRef = useRef(onNewInquiry);
  
  // Keep callback ref updated
  useEffect(() => {
    onNewInquiryRef.current = onNewInquiry;
  }, [onNewInquiry]);
  
  const resetCount = useCallback(() => {
    setNewInquiriesCount(0);
  }, []);

  // Subscribe to realtime inquiries
  useEffect(() => {
    if (!enabled) {
      // Clean up if disabled
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
      setIsConnected(false);
      setStatus("disconnected");
      return;
    }

    const supabase = createClient();
    
    // Get current user first
    const setupSubscription = async () => {
      try {
        setStatus("connecting");
        setError(null);
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setStatus("disconnected");
          setError("Authentication required for real-time updates");
          return;
        }
        
        setUserId(user.id);
        
        // Create channel with filter for this landlord's inquiries
        // Using postgres_changes for row-level filtering
        // NOTE: We listen to BOTH 'inquiries' (new engagement table) AND 'listing_inquiries' (legacy)
        // because different parts of the codebase may write to different tables
        const channel = supabase
          .channel(`landlord-inquiries-${user.id}`)
          .on<RealtimeInquiry>(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "inquiries",
              filter: `landlord_id=eq.${user.id}`,
            },
            (payload: RealtimePostgresInsertPayload<RealtimeInquiry>) => {
              const inquiry = payload.new;
              
              // Increment counter
              setNewInquiriesCount((prev) => prev + 1);
              
              // Call callback if provided
              if (onNewInquiryRef.current) {
                onNewInquiryRef.current(inquiry);
              }
              
              // Dispatch custom event for other components
              if (typeof window !== "undefined") {
                window.dispatchEvent(
                  new CustomEvent("newInquiryReceived", { detail: inquiry })
                );
              }
            }
          )
          // Also listen to legacy listing_inquiries table
          // The listing_inquiries table uses landlord_id through listings join,
          // but we can't filter on joins in realtime. We'll filter client-side.
          .on(
            "postgres_changes",
            {
              event: "INSERT",
              schema: "public",
              table: "listing_inquiries",
            },
            async (payload) => {
              // For listing_inquiries, we need to verify this belongs to our landlord
              // by checking if the listing belongs to us
              const newRecord = payload.new as { 
                id: string;
                listing_id: string; 
                name?: string;
                email?: string;
                phone?: string;
                message?: string;
                status?: string;
                created_at?: string;
              };
              
              // Fetch listing to verify ownership
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              const { data: listingData } = await (supabase as any)
                .from("listings")
                .select("landlord_id, title")
                .eq("id", newRecord.listing_id)
                .single();
              
              const listing = listingData as { landlord_id: string; title: string } | null;
              
              // Only process if this listing belongs to us
              if (listing && listing.landlord_id === user.id) {
                // Transform to RealtimeInquiry format
                const inquiry: RealtimeInquiry = {
                  id: newRecord.id,
                  listing_id: newRecord.listing_id,
                  landlord_id: listing.landlord_id,
                  user_id: null,
                  name: newRecord.name || "Unknown",
                  email: newRecord.email || null,
                  phone: newRecord.phone || null,
                  message: newRecord.message || null,
                  request_viewing: false,
                  preferred_viewing_time: null,
                  preferred_viewing_day: null,
                  status: newRecord.status || "pending",
                  source: "listing_page",
                  created_at: newRecord.created_at || new Date().toISOString(),
                };
                
                setNewInquiriesCount((prev) => prev + 1);
                
                if (onNewInquiryRef.current) {
                  onNewInquiryRef.current(inquiry);
                }
                
                if (typeof window !== "undefined") {
                  window.dispatchEvent(
                    new CustomEvent("newInquiryReceived", { detail: inquiry })
                  );
                }
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
        console.error("[useRealtimeInquiries] Setup error:", err);
        setStatus("error");
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    };
    
    setupSubscription();
    
    // Cleanup on unmount or when disabled
    return () => {
      if (channelRef.current) {
        channelRef.current.unsubscribe();
        channelRef.current = null;
      }
    };
  }, [enabled]);

  // Listen for auth state changes
  useEffect(() => {
    const supabase = createClient();
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        // Clean up subscription on logout
        if (channelRef.current) {
          channelRef.current.unsubscribe();
          channelRef.current = null;
        }
        setIsConnected(false);
        setStatus("disconnected");
        setUserId(null);
        setNewInquiriesCount(0);
      }
    });
    
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return {
    isConnected,
    status,
    error,
    newInquiriesCount,
    resetCount,
  };
}

/**
 * Lightweight hook to just get the new inquiry count
 * For use in header badges where full subscription info isn't needed
 */
export function useNewInquiryCount(): number {
  const [count, setCount] = useState(0);
  
  useEffect(() => {
    const handleNewInquiry = () => {
      setCount((prev) => prev + 1);
    };
    
    window.addEventListener("newInquiryReceived", handleNewInquiry);
    
    return () => {
      window.removeEventListener("newInquiryReceived", handleNewInquiry);
    };
  }, []);
  
  return count;
}
