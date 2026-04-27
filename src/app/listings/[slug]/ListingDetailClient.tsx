/**
 * Listing Detail Client Component
 * 
 * Client-side wrapper for the listing detail page.
 * Handles interactivity like inquiry modal, navigation, etc.
 * 
 * Layout:
 * - Mobile: Stacked cards with sticky bottom CTA
 * - Desktop: 2-column with sticky sidebar
 */

"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  Share2, 
  Heart,
  MessageCircle,
  AlertTriangle,
  Clock,
  Bell
} from "lucide-react";
import { Navbar, Footer } from "@/components/landing";
import { Container } from "@/components/ui";
import {
  ListingGallery,
  ListingPriceCard,
  ListingMap,
  ListingDetails,
  ListingLandlord,
  InquiryModal,
  SimilarListings,
} from "@/components/listings";
import { UnavailableListingModal } from "@/components/listings/UnavailableListingModal";
import type { Listing, ListingCard, PriceBreakdown } from "@/lib/listings/types";
import { cn } from "@/lib/utils";

interface ListingDetailClientProps {
  listing: Listing;
  priceBreakdown: PriceBreakdown;
  similarListings: ListingCard[];
  isAuthenticated: boolean;
  userId?: string;
  userName?: string;
  userEmail?: string;
  userPhone?: string;
}

// Format relative time
function formatRelativeTime(dateString: string | null): string {
  if (!dateString) return "";
  
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
  return `${Math.floor(diffDays / 365)} years ago`;
}

// Property type labels
const PROPERTY_TYPE_LABELS: Record<Listing["property_type"], string> = {
  bedsitter: "Bedsitter",
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
  townhouse: "Townhouse",
  maisonette: "Maisonette",
  villa: "Villa",
};

export function ListingDetailClient({
  listing,
  priceBreakdown,
  similarListings,
  isAuthenticated,
  userId,
  userName,
  userEmail,
  userPhone,
}: ListingDetailClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const [unavailableModalOpen, setUnavailableModalOpen] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  
  // Check if listing is unavailable
  const isUnavailable = listing.status !== "active";
  const unavailableStatus = listing.status as "rented" | "paused" | "archived";

  // Auto-open unavailable modal for non-active listings
  useEffect(() => {
    if (isUnavailable) {
      // Small delay to let page render first
      const timer = setTimeout(() => {
        setUnavailableModalOpen(true);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isUnavailable]);

  // Auto-open inquiry modal when returning from signup
  // Track dismissed state to prevent re-opening on browser back
  useEffect(() => {
    const dismissedKey = `inquiry-dismissed-${listing.id}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey);
    
    if (searchParams.get("openInquiry") === "true" && isAuthenticated && !wasDismissed) {
      setInquiryOpen(true);
      // Clean up URL without triggering navigation
      const url = new URL(window.location.href);
      url.searchParams.delete("openInquiry");
      window.history.replaceState({}, "", url.pathname);
    }
  }, [searchParams, isAuthenticated, listing.id]);

  // Handle modal close - track dismissal to prevent re-open on back
  const handleInquiryClose = () => {
    setInquiryOpen(false);
    // Mark as dismissed so browser back doesn't reopen it
    sessionStorage.setItem(`inquiry-dismissed-${listing.id}`, "true");
  };

  const handleShare = async () => {
    const shareData = {
      title: listing.title,
      text: `Check out this ${listing.bedrooms} bedroom ${listing.property_type} in ${listing.area}`,
      url: window.location.href,
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch {
        // User cancelled or error
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
      // TODO: Show toast
    }
  };

  const handleSave = () => {
    // Toggle saved state in local storage (works for everyone, syncs when logged in)
    const STORAGE_KEY = "mitasafi_saved_listings";
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      if (isSaved) {
        // Remove from saved
        const updated = saved.filter((s: { listingId: string }) => s.listingId !== listing.id);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
        setIsSaved(false);
      } else {
        // Add to saved with current status for change tracking
        saved.push({ 
          listingId: listing.id, 
          savedAt: new Date().toISOString(),
          lastKnownStatus: listing.status || "active"
        });
        localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
        setIsSaved(true);
      }
      // Dispatch event for navbar to update saved count
      window.dispatchEvent(new CustomEvent("savedListingsChanged"));
    } catch (e) {
      console.error("Failed to save listing:", e);
    }
  };

  // Initialize saved state from local storage
  useEffect(() => {
    const STORAGE_KEY = "mitasafi_saved_listings";
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
      const isListingSaved = saved.some((s: { listingId: string }) => s.listingId === listing.id);
      setIsSaved(isListingSaved);
    } catch {
      // Ignore parse errors
    }
  }, [listing.id]);

  // Safe back navigation - only goes back if previous page was internal
  const handleBack = () => {
    // Check if there's a meaningful history to go back to
    // If user came directly to this page (e.g., from Google), go to listings
    if (window.history.length <= 1) {
      router.push("/properties");
    } else {
      // Check referrer to avoid going back to external sites
      const referrer = document.referrer;
      const isInternalReferrer = referrer && referrer.includes(window.location.host);
      if (isInternalReferrer) {
        router.back();
      } else {
        router.push("/properties");
      }
    }
  };

  return (
    <>
      <Navbar />
      
      <main className="min-h-screen bg-white pt-16 pb-24 md:pb-8">
        {/* Breadcrumb & Actions Bar */}
        <div className="border-b border-gray-100 sticky top-16 z-30 bg-white">
          <Container>
            <div className="flex items-center justify-between py-3 lg:py-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleBack}
                  className="p-2 -ml-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Go back"
                >
                  <ArrowLeft className="w-5 h-5 text-gray-600" />
                </button>
                <nav className="hidden sm:flex items-center gap-2 text-sm text-gray-500">
                  <button 
                    onClick={() => router.replace("/properties")}
                    className="hover:text-brand-600 transition-colors"
                  >
                    Listings
                  </button>
                  <span>/</span>
                  <button 
                    onClick={() => router.replace(`/properties?area=${encodeURIComponent(listing.area)}`)}
                    className="hover:text-brand-600 transition-colors"
                  >
                    {listing.area}
                  </button>
                  <span>/</span>
                  <span className="text-gray-900 font-medium truncate max-w-[200px]">
                    {listing.title}
                  </span>
                </nav>
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={handleShare}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors"
                  aria-label="Share"
                >
                  <Share2 className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={handleSave}
                  className={cn(
                    "p-2 rounded-full transition-colors",
                    isSaved 
                      ? "bg-error-50 text-error-500" 
                      : "hover:bg-gray-100 text-gray-600"
                  )}
                  aria-label={isSaved ? "Remove from saved" : "Save listing"}
                >
                  <Heart className={cn("w-5 h-5", isSaved && "fill-current")} />
                </button>
              </div>
            </div>
          </Container>
        </div>

        <Container className="mt-4">
          {/* Unavailable Banner */}
          {isUnavailable && (
            <div className={cn(
              "rounded-xl p-4 mb-4 flex items-start gap-3",
              unavailableStatus === "rented" ? "bg-red-50 border border-red-100" : "bg-yellow-50 border border-yellow-100"
            )}>
              {unavailableStatus === "rented" ? (
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              ) : (
                <Clock className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <p className={cn(
                  "font-medium",
                  unavailableStatus === "rented" ? "text-red-800" : "text-yellow-800"
                )}>
                  {unavailableStatus === "rented" 
                    ? "This property has been rented" 
                    : "This property is temporarily unavailable"
                  }
                </p>
                <p className={cn(
                  "text-sm mt-1",
                  unavailableStatus === "rented" ? "text-red-600" : "text-yellow-700"
                )}>
                  {unavailableStatus === "rented"
                    ? "Someone else got there first, but we can notify you about similar properties."
                    : "The landlord has paused this listing. We can notify you when it's available again."
                  }
                </p>
              </div>
              <button
                onClick={() => setUnavailableModalOpen(true)}
                className={cn(
                  "flex-shrink-0 font-medium text-sm py-2 px-4 rounded-lg flex items-center gap-2 transition-colors",
                  unavailableStatus === "rented" 
                    ? "bg-red-100 text-red-700 hover:bg-red-200" 
                    : "bg-yellow-100 text-yellow-800 hover:bg-yellow-200"
                )}
              >
                <Bell className="w-4 h-4" />
                Notify Me
              </button>
            </div>
          )}

          {/* Photo Gallery */}
          <ListingGallery 
            photos={listing.photos} 
            title={listing.title}
            isVerified={listing.is_verified}
          />

          {/* Main Content */}
          <div className="mt-4 lg:grid lg:grid-cols-3 lg:gap-6">
            {/* Left Column - Details */}
            <div className="lg:col-span-2 space-y-4">
              {/* Title & Meta */}
              <div>
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-1">
                  <span className="text-gray-600 font-medium">
                    {PROPERTY_TYPE_LABELS[listing.property_type]}
                  </span>
                  <span className="text-gray-300">•</span>
                  <span>{listing.views_count} views</span>
                  {listing.published_at && (
                    <>
                      <span className="text-gray-300">•</span>
                      <span>{formatRelativeTime(listing.published_at)}</span>
                    </>
                  )}
                </div>
                <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
                  {listing.title}
                </h1>
                <p className="text-gray-600 mt-1">
                  {listing.area}, {listing.city}
                  {listing.building_name && ` • ${listing.building_name}`}
                </p>
              </div>

              {/* Price Card - Mobile Only */}
              <div className="lg:hidden">
                <ListingPriceCard
                  price={priceBreakdown}
                  availableNow={listing.available_now}
                  availableFrom={listing.available_from}
                  onContact={isUnavailable ? () => setUnavailableModalOpen(true) : () => setInquiryOpen(true)}
                  onScheduleViewing={isUnavailable ? () => setUnavailableModalOpen(true) : () => setInquiryOpen(true)}
                  isAuthenticated={isAuthenticated}
                  isUnavailable={isUnavailable}
                />
              </div>

              {/* Details */}
              <ListingDetails listing={listing} />

              {/* Map */}
              <ListingMap
                latitude={listing.latitude}
                longitude={listing.longitude}
                address={listing.address}
                area={listing.area}
                city={listing.city}
                landmarks={listing.landmarks}
                buildingName={listing.building_name}
                hideExactAddress={listing.hide_exact_address}
              />

              {/* Landlord - Mobile Only */}
              <div className="lg:hidden">
                <ListingLandlord landlord={listing.landlord} />
              </div>
            </div>

            {/* Right Column - Sticky Sidebar (Desktop) */}
            <div className="hidden lg:block">
              <div className="sticky top-28 space-y-4">
                <ListingPriceCard
                  price={priceBreakdown}
                  availableNow={listing.available_now}
                  availableFrom={listing.available_from}
                  onContact={isUnavailable ? () => setUnavailableModalOpen(true) : () => setInquiryOpen(true)}
                  onScheduleViewing={isUnavailable ? () => setUnavailableModalOpen(true) : () => setInquiryOpen(true)}
                  isAuthenticated={isAuthenticated}
                  isUnavailable={isUnavailable}
                />
                <ListingLandlord landlord={listing.landlord} />
              </div>
            </div>
          </div>

          {/* Similar Listings */}
          <SimilarListings 
            listings={similarListings}
            currentArea={listing.area}
            className="mt-8 border-t border-gray-100 pt-6"
          />
        </Container>

        {/* Mobile Sticky CTA */}
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 lg:hidden z-40">
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-xl font-bold text-gray-900">
                {new Intl.NumberFormat("en-KE", {
                  style: "currency",
                  currency: priceBreakdown.currency,
                  minimumFractionDigits: 0,
                }).format(priceBreakdown.rent)}
                <span className="text-sm font-normal text-gray-500">/mo</span>
              </p>
              {priceBreakdown.serviceCharge && (
                <p className="text-xs text-gray-500">
                  +{new Intl.NumberFormat("en-KE", {
                    style: "currency",
                    currency: priceBreakdown.currency,
                    minimumFractionDigits: 0,
                  }).format(priceBreakdown.serviceCharge)} service
                </p>
              )}
            </div>
            {isUnavailable ? (
              <button
                onClick={() => setUnavailableModalOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <Bell className="w-5 h-5" />
                Notify Me
              </button>
            ) : (
              <button
                onClick={() => setInquiryOpen(true)}
                className="bg-gradient-to-r from-cta-500 to-cta-600 hover:from-cta-600 hover:to-cta-700 text-white font-semibold py-3 px-6 rounded-xl flex items-center gap-2 transition-all shadow-md"
              >
                <MessageCircle className="w-5 h-5" />
                Contact
              </button>
            )}
          </div>
        </div>
      </main>

      <Footer />

      {/* Inquiry Modal - Works for everyone (no login required) */}
      <InquiryModal
        isOpen={inquiryOpen}
        onClose={handleInquiryClose}
        listingId={listing.id}
        listingTitle={listing.title}
        listingArea={listing.area}
        landlordName={listing.landlord?.full_name || null}
        landlordId={listing.landlord?.id || listing.landlord_id}
        isAuthenticated={isAuthenticated}
        userId={userId}
        userName={userName}
        userEmail={userEmail}
        userPhone={userPhone}
      />

      {/* Unavailable Listing Modal - Lead capture */}
      {isUnavailable && (
        <UnavailableListingModal
          isOpen={unavailableModalOpen}
          onClose={() => setUnavailableModalOpen(false)}
          listing={{
            id: listing.id,
            title: listing.title,
            area: listing.area,
            city: listing.city,
            property_type: listing.property_type,
            bedrooms: listing.bedrooms,
            rent_amount: listing.rent_amount,
            currency: listing.currency,
            cover_photo: listing.cover_photo,
            status: unavailableStatus,
          }}
          similarListings={similarListings.map(l => ({
            id: l.id,
            title: l.title,
            area: l.area,
            rent_amount: l.rent_amount,
            currency: l.currency,
            cover_photo: l.cover_photo,
            bedrooms: l.bedrooms,
          }))}
          isAuthenticated={isAuthenticated}
          userId={userId}
          userEmail={userEmail}
          userPhone={userPhone}
        />
      )}
    </>
  );
}

export default ListingDetailClient;
