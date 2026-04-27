/**
 * Saved Listings Page
 * 
 * Displays user's saved/favorited properties from local storage.
 * Clean, professional design - no banners or distracting UI elements.
 * 
 * REALTIME UPDATES:
 * Uses WebSocket subscription to receive instant notifications when 
 * any saved listing's status changes (rented, paused, deleted).
 */

"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { Heart, Search, ArrowRight, Wifi, WifiOff, Bell } from "lucide-react";
import { Navbar, Footer } from "@/components/landing";
import { Container } from "@/components/ui";
import { ListingCard, ListingCardSkeleton, type ListingCardData } from "@/components/shared";
import { UnavailableListingModal } from "@/components/listings/UnavailableListingModal";
import type { ListingCard as LegacyListingCard } from "@/lib/listings/types";
import { addNotification, getUnreadCount } from "@/lib/notifications";
import { useRealtimeListingStatus, type ListingStatusUpdate } from "@/hooks/useRealtimeListingStatus";
import { cn } from "@/lib/utils";

// Local storage key
const STORAGE_KEY = "mitasafi_saved_listings";

interface SavedListing {
  listingId: string;
  savedAt: string;
  lastKnownStatus?: string;
}

/**
 * Transform legacy ListingCard to shared ListingCardData format
 */
function transformToCardData(listing: LegacyListingCard): ListingCardData {
  return {
    id: listing.id,
    title: listing.title,
    property_type: listing.property_type,
    area: listing.area,
    city: listing.city,
    rent_amount: listing.rent_amount,
    currency: listing.currency || "KES",
    cover_photo: listing.cover_photo,
    photos: undefined,
    is_verified: listing.is_verified,
    available_now: listing.available_now,
    published_at: listing.published_at,
    created_at: listing.published_at || new Date().toISOString(),
    status: (listing.status as "active" | "paused" | "rented" | "draft") || "active",
    views_count: 0,
    inquiries_count: 0,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    size_sqft: listing.size_sqft ?? null,
    listing_category: listing.listing_category ?? "residential",
    commercial_type: listing.commercial_type ?? null,
    size_sqm: listing.size_sqm ?? null,
    workstation_capacity: listing.workstation_capacity ?? null,
    building_grade: listing.building_grade ?? null,
    seating_capacity: listing.seating_capacity ?? null,
    frontage_width_m: listing.frontage_width_m ?? null,
    clear_height_m: listing.clear_height_m ?? null,
    loading_docks: listing.loading_docks ?? null,
    parking_spaces_count: listing.parking_spaces_count ?? null,
    room_count: listing.room_count ?? null,
    plot_size_acres: listing.plot_size_acres ?? null,
  };
}

export default function SavedListingsPage() {
  const [savedIds, setSavedIds] = useState<SavedListing[]>([]);
  const [listings, setListings] = useState<LegacyListingCard[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Unavailable listing modal state
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);
  const [unavailableListing, setUnavailableListing] = useState<{
    id: string;
    title: string;
    area: string;
    city: string;
    property_type: string;
    bedrooms?: number;
    rent_amount: number;
    currency?: string;
    cover_photo?: string | null;
    status: "rented" | "paused" | "archived";
  } | null>(null);
  const [similarListings, setSimilarListings] = useState<LegacyListingCard[]>([]);
  
  // Build map of last known statuses for realtime comparison
  const lastKnownStatuses = useMemo(() => {
    const map = new Map<string, string>();
    savedIds.forEach(s => {
      if (s.lastKnownStatus) {
        map.set(s.listingId, s.lastKnownStatus);
      }
    });
    return map;
  }, [savedIds]);
  
  // Get listing IDs for realtime subscription
  const listingIdsToMonitor = useMemo(() => 
    savedIds.map(s => s.listingId), 
    [savedIds]
  );
  
  // Realtime subscription for listing status changes
  const { 
    isConnected: isRealtimeConnected, 
    status: realtimeStatus,
    recentChanges 
  } = useRealtimeListingStatus({
    listingIds: listingIdsToMonitor,
    lastKnownStatuses,
    autoNotify: true, // Automatically adds to notification system
    onStatusChange: (update: ListingStatusUpdate, previousStatus?: string) => {
      // Update the listings state with new status
      // Cast to match LegacyListingCard status type
      const newStatus = update.status as LegacyListingCard["status"];
      setListings(prev => prev.map(listing => 
        listing.id === update.id 
          ? { ...listing, status: newStatus }
          : listing
      ));
      
      // Update saved IDs with new status
      setSavedIds(prev => {
        const updated = prev.map(s => 
          s.listingId === update.id 
            ? { ...s, lastKnownStatus: update.status }
            : s
        );
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        return updated;
      });
      
      // Update notification count
      setNotificationCount(getUnreadCount());
      
      // Show unavailable modal if listing became rented or paused
      if ((update.status === "rented" || update.status === "paused") && previousStatus === "active") {
        const affectedListing = listings.find(l => l.id === update.id);
        if (affectedListing) {
          // Get similar listings (same area, exclude the unavailable one)
          const similar = listings.filter(l => 
            l.id !== update.id && 
            l.area === affectedListing.area &&
            l.status === "active"
          ).slice(0, 4);
          
          setSimilarListings(similar);
          setUnavailableListing({
            id: affectedListing.id,
            title: affectedListing.title,
            area: affectedListing.area,
            city: affectedListing.city,
            property_type: affectedListing.property_type,
            bedrooms: affectedListing.bedrooms,
            rent_amount: affectedListing.rent_amount,
            currency: affectedListing.currency,
            cover_photo: affectedListing.cover_photo,
            status: update.status as "rented" | "paused",
          });
          setUnavailableModalOpen(true);
        }
      }
    },
  });

  // Load saved IDs from local storage
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as SavedListing[];
      setSavedIds(saved);
    } catch {
      setSavedIds([]);
    }
    
    // Load initial notification count
    setNotificationCount(getUnreadCount());
  }, []);

  // Check for status changes and create notifications
  const checkStatusChanges = useCallback((
    savedList: SavedListing[], 
    fetchedListings: LegacyListingCard[]
  ) => {
    const updatedSaved = [...savedList];
    let hasChanges = false;

    // Track fetched IDs
    const fetchedIds = new Set(fetchedListings.map(l => l.id));

    // Check each saved listing
    savedList.forEach((saved, index) => {
      const listing = fetchedListings.find(l => l.id === saved.listingId);
      
      if (listing) {
        // Get current and previous status
        const previousStatus = saved.lastKnownStatus || "active"; // Default to active for old saved items
        const currentStatus = listing.status || "active";
        
        // Check for status changes (only notify if actually changed)
        if (previousStatus !== currentStatus) {
          // Determine notification type
          let notificationType: "rented" | "paused" | "deleted" | "resumed" = "paused";
          if (currentStatus === "rented") notificationType = "rented";
          else if (currentStatus === "paused") notificationType = "paused";
          else if (currentStatus === "active" && previousStatus !== "active") notificationType = "resumed";
          
          // Create notification
          addNotification({
            listingId: listing.id,
            listingTitle: listing.title,
            type: notificationType,
            timestamp: Date.now(),
          });
          
          // Update stored status
          updatedSaved[index] = { ...saved, lastKnownStatus: currentStatus };
          hasChanges = true;
        } else if (!saved.lastKnownStatus) {
          // First time seeing this listing, just record the status without notification
          updatedSaved[index] = { ...saved, lastKnownStatus: currentStatus };
          hasChanges = true;
        }
      } else if (!fetchedIds.has(saved.listingId)) {
        // Listing was deleted by landlord
        if (saved.lastKnownStatus !== "deleted") {
          // Create notification for deletion
          addNotification({
            listingId: saved.listingId,
            listingTitle: `Saved property`,
            type: "deleted",
            timestamp: Date.now(),
          });
          updatedSaved[index] = { ...saved, lastKnownStatus: "deleted" };
          hasChanges = true;
        }
      }
    });

    // Remove deleted listings from saved
    const cleanedSaved = updatedSaved.filter(s => s.lastKnownStatus !== "deleted");
    
    if (hasChanges) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanedSaved));
      if (cleanedSaved.length !== savedList.length) {
        setSavedIds(cleanedSaved);
      }
      window.dispatchEvent(new CustomEvent("savedListingsChanged"));
    }
  }, []);

  // Fetch listing details for saved IDs
  useEffect(() => {
    const fetchListings = async () => {
      if (savedIds.length === 0) {
        setListings([]);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const ids = savedIds.map(s => s.listingId);
        const response = await fetch(`/api/listings/batch?ids=${ids.join(",")}`);
        
        if (!response.ok) {
          throw new Error("Failed to fetch listings");
        }

        const data = await response.json();
        const fetchedListings = data.listings || [];
        
        // Check for status changes
        checkStatusChanges(savedIds, fetchedListings);
        
        setListings(fetchedListings);
      } catch (err) {
        console.error("Failed to fetch saved listings:", err);
        setError("Failed to load saved listings");
      } finally {
        setIsLoading(false);
      }
    };

    fetchListings();
  }, [savedIds, checkStatusChanges]);

  // Listen for changes from other components
  useEffect(() => {
    const handleChange = () => {
      try {
        const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]") as SavedListing[];
        setSavedIds(saved);
      } catch {
        // Ignore
      }
    };

    window.addEventListener("savedListingsChanged", handleChange);
    window.addEventListener("storage", (e) => {
      if (e.key === STORAGE_KEY) handleChange();
    });

    return () => {
      window.removeEventListener("savedListingsChanged", handleChange);
      window.removeEventListener("storage", handleChange);
    };
  }, []);

  // Count of actual available listings
  const availableCount = listings.length;

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50 pt-20">
        {/* Header */}
        <section className="bg-white border-b border-gray-200 py-8">
          <Container>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Saved Properties</h1>
                <p className="text-gray-500 mt-1">
                  {availableCount === 0 
                    ? "No saved properties" 
                    : `${availableCount} ${availableCount === 1 ? "property" : "properties"}`
                  }
                </p>
              </div>
              
              {/* Realtime status indicator */}
              {listingIdsToMonitor.length > 0 && (
                <div className="flex items-center gap-3">
                  {/* Notification count badge */}
                  {notificationCount > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium">
                      <Bell className="w-3 h-3" />
                      <span>{notificationCount} update{notificationCount !== 1 ? "s" : ""}</span>
                    </div>
                  )}
                  
                  {/* Connection indicator */}
                  <div className={cn(
                    "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium",
                    isRealtimeConnected 
                      ? "bg-green-100 text-green-700" 
                      : "bg-gray-100 text-gray-600"
                  )}>
                    {isRealtimeConnected ? (
                      <>
                        <Wifi className="w-3 h-3" />
                        <span className="hidden sm:inline">Live updates</span>
                      </>
                    ) : (
                      <>
                        <WifiOff className="w-3 h-3" />
                        <span className="hidden sm:inline">Offline</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          </Container>
        </section>

        {/* Content */}
        <section className="py-8">
          <Container>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {Array.from({ length: Math.min(savedIds.length || 3, 6) }).map((_, i) => (
                  <ListingCardSkeleton key={i} />
                ))}
              </div>
            ) : error ? (
              <div className="text-center py-16">
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={() => window.location.reload()}
                  className="text-gray-900 hover:text-gray-700 font-medium"
                >
                  Try again
                </button>
              </div>
            ) : listings.length === 0 ? (
              <EmptyState />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                {listings.map((listing) => (
                  <ListingCard 
                    key={listing.id} 
                    listing={transformToCardData(listing)} 
                    variant="public"
                  />
                ))}
              </div>
            )}
          </Container>
        </section>
      </main>
      <Footer />
      
      {/* Unavailable Listing Modal - Lead capture */}
      {unavailableListing && (
        <UnavailableListingModal
          isOpen={unavailableModalOpen}
          onClose={() => {
            setUnavailableModalOpen(false);
            setUnavailableListing(null);
          }}
          listing={unavailableListing}
          similarListings={similarListings.map(l => ({
            id: l.id,
            title: l.title,
            area: l.area,
            rent_amount: l.rent_amount,
            currency: l.currency,
            cover_photo: l.cover_photo,
            bedrooms: l.bedrooms,
          }))}
        />
      )}
    </>
  );
}

function EmptyState() {
  return (
    <div className="text-center py-16">
      <Heart className="w-12 h-12 text-gray-300 mx-auto mb-4" />
      <h3 className="text-lg font-semibold text-gray-900 mb-2">
        No saved properties
      </h3>
      <p className="text-gray-500 max-w-sm mx-auto mb-6">
        Properties you save will appear here for easy access.
      </p>
      <Link
        href="/properties"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-lg transition-colors"
      >
        <Search className="w-4 h-4" />
        Browse Properties
        <ArrowRight className="w-4 h-4" />
      </Link>
    </div>
  );
}
