"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Bell, ChevronLeft, Heart, Share2 } from "lucide-react";
import { Footer } from "@/components/landing";
import { HomeIcon } from "@/components/landing/HomeIcons";
import { HomeNavbar } from "@/components/landing/HomeNavbar";
import homeStyles from "@/components/landing/HomePage.module.css";
import {
  InquiryModal, ListingDetails, ListingGallery, ListingLandlord, ListingMap,
  ListingPriceCard, SimilarListings,
} from "@/components/listings";
import { ApplyModal } from "@/components/listings/ApplyModal";
import { UnavailableListingModal } from "@/components/listings/UnavailableListingModal";
import { formatCurrency } from "@/components/shared/listing-types";
import { sessionFlagStore } from "@/lib/browser-storage/local-store";
import { useLocalStore } from "@/lib/browser-storage/useLocalStore";
import { generateListingSlug, type Listing, type ListingCard, type PriceBreakdown } from "@/lib/listings/types";
import { addSavedListing, removeSavedListing } from "@/lib/saved-listings/store";
import { useIsListingSaved } from "@/lib/saved-listings/useIsListingSaved";
import { findPlace } from "@/lib/site/places";
import styles from "./listing-detail.module.css";

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

function placeSlug(value: string) {
  return value.toLowerCase().replace(/[’']/g, "").trim().replace(/\s+/g, "-");
}

export function ListingDetailClient({
  listing, priceBreakdown, similarListings, isAuthenticated, userId, userName, userEmail, userPhone,
}: ListingDetailClientProps) {
  const params = useSearchParams();
  const [inquiry, setInquiry] = useState<"contact" | "viewing" | null>(null);
  const [notifyOpen, setNotifyOpen] = useState(false);
  const [applyOpen, setApplyOpen] = useState(false);
  const [shareStatus, setShareStatus] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const isSaved = useIsListingSaved(listing.id);
  const isUnavailable = listing.status !== "active";
  const unavailableStatus = listing.status as "rented" | "paused" | "archived";

  const dismissKey = `inquiry-dismissed-${listing.id}`;
  const inquiryDismissed = useLocalStore(sessionFlagStore(dismissKey));
  const urlWantsInquiry = params.get("openInquiry") === "true" && isAuthenticated;
  // Keep the initial request when replaceState removes its URL flag.
  const [arrivedForInquiry] = useState(() => params.get("openInquiry") === "true");
  const inquiryOpen = !isUnavailable && (
    inquiry !== null || (isAuthenticated && (arrivedForInquiry || urlWantsInquiry) && !inquiryDismissed)
  );

  useEffect(() => {
    if (!urlWantsInquiry) return;
    const url = new URL(window.location.href);
    url.searchParams.delete("openInquiry");
    window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
  }, [urlWantsInquiry]);

  function closeInquiry() {
    setInquiry(null);
    sessionFlagStore(dismissKey).write(true);
  }

  function toggleSaved() {
    if (isSaved) removeSavedListing(listing.id);
    else addSavedListing(listing.id, listing.status);
  }

  async function shareListing() {
    const url = new URL(`/listings/${generateListingSlug(listing)}`, window.location.origin).href;
    setShareStatus("");
    setShareUrl("");
    if (navigator.share) {
      try {
        await navigator.share({ title: listing.title, url });
        return;
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setShareStatus("Link copied");
    } catch {
      setShareUrl(url);
      setShareStatus("Copy the listing link");
    }
  }

  const areaPlace = findPlace(placeSlug(listing.area));
  const servicePlace = areaPlace ?? findPlace(placeSlug(listing.city));
  const rentalLocation = areaPlace ? { location: areaPlace.slug } : { area: listing.area };
  const locationText = Array.from(new Set([listing.area, listing.city].filter(Boolean))).join(", ");
  const monthly = formatCurrency(priceBreakdown.totalMonthly, priceBreakdown.currency);
  const openContact = () => setInquiry("contact");
  const openNotify = () => setNotifyOpen(true);
  const openApply = () => setApplyOpen(true);

  return (
    <div className={`${homeStyles.home} ${styles.page}`}>
      <a href="#listing-main" className={homeStyles.skipLink}>Skip to listing</a>
      <HomeNavbar activePage="rentals" />
      <main id="listing-main" tabIndex={-1}>
        <header className={styles.intro}>
          <div className={styles.wrap}>
            <div className={styles.topLine}>
              <nav className={styles.breadcrumb} aria-label="Rental navigation">
                <Link href="/properties"><ChevronLeft size={17} aria-hidden="true" /> Rentals</Link>
                {listing.area && <Link className={styles.areaCrumb} href={{ pathname: "/properties", query: rentalLocation }}>{listing.area}</Link>}
              </nav>
              <div className={styles.toolbar}>
                <button type="button" onClick={shareListing} aria-label="Share listing">
                  <Share2 size={18} aria-hidden="true" /><span>Share</span>
                </button>
                <button type="button" onClick={toggleSaved} aria-label={isSaved ? "Remove from saved" : "Save listing"} aria-pressed={isSaved}>
                  <Heart size={19} fill={isSaved ? "currentColor" : "none"} aria-hidden="true" /><span>{isSaved ? "Saved" : "Save"}</span>
                </button>
              </div>
            </div>
            <p className={shareStatus ? styles.shareStatus : styles.srOnly} role="status">{shareStatus}</p>
            {shareUrl && <input aria-label="Listing link" className={styles.shareInput} type="url" value={shareUrl} readOnly onFocus={(event) => event.target.select()} />}
            <div className={styles.heading}>
              <h1>{listing.title}</h1>
              <div className={styles.meta}>
                {locationText && <p><HomeIcon name="pin" size={19} />{locationText}</p>}
                {listing.is_verified && <p className={styles.verified}><HomeIcon name="shield" size={19} />Verified listing</p>}
              </div>
            </div>
          </div>
        </header>

        <div className={styles.wrap}>
          {isUnavailable && (
            <div className={styles.notice}>
              <HomeIcon name="bell" size={20} />
              <p><strong>{unavailableStatus === "rented" ? "This home has been rented" : "This listing is unavailable"}</strong>
                {" "}{unavailableStatus === "paused" ? "You can ask to be notified if it returns." : "You can ask to be notified about similar homes."}</p>
            </div>
          )}
          <div className={styles.layout}>
            <div className={styles.media}>
              <ListingGallery key={listing.id} photos={listing.photos} title={listing.title} coverPhoto={listing.cover_photo} />
            </div>
            <aside className={styles.pricing} aria-label="Rent and next steps">
              <ListingPriceCard
                price={priceBreakdown}
                availableNow={listing.available_now}
                availableFrom={listing.available_from}
                onContact={isUnavailable ? openNotify : openContact}
                onApply={isUnavailable ? undefined : openApply}
                onScheduleViewing={() => setInquiry("viewing")}
                isUnavailable={isUnavailable}
              />
            </aside>
            <div className={styles.info}>
              <section aria-label="Property details">
                <ListingDetails listing={listing} className={styles.details} />
              </section>
              <ListingMap
                className={styles.location}
                latitude={listing.latitude}
                longitude={listing.longitude}
                address={listing.address}
                area={listing.area}
                city={listing.city}
                landmarks={listing.landmarks}
                buildingName={listing.hide_exact_address ? null : listing.building_name}
                hideExactAddress={listing.hide_exact_address}
              />
              {listing.landlord && <ListingLandlord landlord={listing.landlord} />}
            </div>
          </div>

          <SimilarListings listings={similarListings} currentArea={listing.area} className={styles.similar} />
          <section className={styles.resources} aria-label="Rental resources">
            <Link href="/guides/tenants"><HomeIcon name="key" size={23} /><span>Tenant guide</span><HomeIcon name="arrow" size={17} /></Link>
            <Link href={{ pathname: "/services/browse", query: servicePlace ? { location: servicePlace.slug } : {} }}>
              <HomeIcon name="tools" size={23} /><span>{servicePlace ? `Home services in ${servicePlace.name}` : "Find home services"}</span><HomeIcon name="arrow" size={17} />
            </Link>
          </section>
        </div>
      </main>
      <Footer />

      <div className={styles.mobileBar} role="group" aria-label="Rental actions">
        <div className={styles.mobilePrice}>
          <strong>{monthly}</strong>
          <span>{priceBreakdown.serviceCharge ? "Monthly total" : "Per month"}</span>
        </div>
        {isUnavailable ? (
          <button type="button" className={styles.primary} onClick={openNotify}><Bell size={17} aria-hidden="true" /> Notify me</button>
        ) : (
          <>
            <button type="button" className={styles.secondary} onClick={openContact}>Contact</button>
            <button type="button" className={styles.primary} onClick={openApply}>Apply</button>
          </>
        )}
      </div>

      <InquiryModal
        isOpen={inquiryOpen}
        onClose={closeInquiry}
        preferViewing={inquiry === "viewing"}
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
      <ApplyModal isOpen={applyOpen} onClose={() => setApplyOpen(false)} listingId={listing.id}
        listingTitle={listing.title} isAuthenticated={isAuthenticated} userName={userName} userEmail={userEmail} userPhone={userPhone} />
      {isUnavailable && (
        <UnavailableListingModal
          isOpen={notifyOpen}
          onClose={() => setNotifyOpen(false)}
          listing={{ ...listing, status: unavailableStatus }}
          similarListings={similarListings}
          isAuthenticated={isAuthenticated}
          userId={userId}
          userEmail={userEmail}
          userPhone={userPhone}
        />
      )}
    </div>
  );
}

export default ListingDetailClient;
