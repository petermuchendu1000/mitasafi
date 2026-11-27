/**
 * Similar Listings Component
 * 
 * Displays a grid of similar listings at the bottom of the detail page.
 * Shows 4 listings with the same area/price range/bedrooms.
 * 
 * Theme: 70% Teal, 30% Orange
 */

"use client";

import Image from "next/image";
import Link from "next/link";
import { 
  Bed, 
  Bath, 
  MapPin, 
  CheckCircle,
  ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { ListingCard } from "@/lib/listings/types";

interface SimilarListingsProps {
  listings: ListingCard[];
  currentArea: string;
  className?: string;
}

// Format currency
function formatPrice(amount: number, currency: string = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Property type display
const PROPERTY_TYPE_LABELS: Record<string, string> = {
  bedsitter: "Bedsitter",
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
  townhouse: "Townhouse",
  maisonette: "Maisonette",
  villa: "Villa",
};

export function SimilarListings({ listings, currentArea, className }: SimilarListingsProps) {
  if (listings.length === 0) return null;

  return (
    <section className={cn("pt-6", className)}>
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Similar rentals</h2>
        </div>
        <Link
          href={{ pathname: "/properties", query: currentArea ? { area: currentArea } : {} }}
          className="text-brand-700 hover:underline underline-offset-4 font-medium text-sm inline-flex min-h-11 items-center gap-1"
        >
          {currentArea ? `All rentals in ${currentArea}` : "All rentals"}
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {listings.map((listing) => (
          <SimilarListingCard key={listing.id} listing={listing} />
        ))}
      </div>
    </section>
  );
}

interface SimilarListingCardProps {
  listing: ListingCard;
}

function SimilarListingCard({ listing }: SimilarListingCardProps) {
  return (
    <Link
      href={`/listings/${listing.slug}`}
      className="group min-w-0 bg-white rounded-xl border border-gray-200 overflow-hidden hover:border-brand-400 transition-colors"
    >
      {/* Image */}
      <div className="relative aspect-[16/10] bg-gray-100 overflow-hidden">
        {listing.cover_photo ? (
          <Image
            src={listing.cover_photo}
            alt=""
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-300"
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
            unoptimized
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
            </svg>
          </div>
        )}

      </div>

      {/* Content */}
      <div className="p-3">
        <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
          <p className="font-bold text-brand-800">{formatPrice(listing.rent_amount, listing.currency)} <span className="text-xs font-normal text-gray-500">/mo</span></p>
          {listing.is_verified && <span className="inline-flex items-center gap-1 text-xs text-brand-700"><CheckCircle size={13} aria-hidden="true" /> Verified</span>}
        </div>
        {/* Title */}
        <h3 className="font-medium text-gray-900 line-clamp-1 group-hover:text-brand-600 transition-colors">
          {listing.title}
        </h3>

        {/* Location */}
        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
          <MapPin className="w-3.5 h-3.5 text-gray-400" />
          <span className="line-clamp-1">{listing.area}</span>
        </div>

        {/* Specs */}
        <div className="flex items-center gap-3 mt-2 text-sm text-gray-600">
          <span className="flex items-center gap-1">
            <Bed className="w-3.5 h-3.5 text-brand-500" />
            {listing.bedrooms} bed
          </span>
          <span className="flex items-center gap-1">
            <Bath className="w-3.5 h-3.5 text-brand-500" />
            {listing.bathrooms} bath
          </span>
          <span className="text-xs text-gray-600">
            {PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default SimilarListings;
