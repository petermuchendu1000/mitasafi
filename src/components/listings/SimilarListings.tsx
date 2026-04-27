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
    <section className={cn("py-8", className)}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Similar Homes</h2>
          <p className="text-sm text-gray-500">
            More properties in {currentArea} and nearby areas
          </p>
        </div>
        <Link
          href={`/listings?area=${encodeURIComponent(currentArea)}`}
          className="text-brand-600 hover:text-brand-700 font-medium text-sm flex items-center gap-1 transition-colors"
        >
          View all
          <ChevronRight className="w-4 h-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
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
      className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-brand-200 transition-all"
    >
      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden">
        {listing.cover_photo ? (
          <Image
            src={listing.cover_photo}
            alt={listing.title}
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

        {/* Verified Badge */}
        {listing.is_verified && (
          <div className="absolute top-2 left-2 bg-brand-600 text-white px-2 py-0.5 rounded-full text-xs font-medium flex items-center gap-1">
            <CheckCircle className="w-3 h-3" />
            Verified
          </div>
        )}

        {/* Price Tag */}
        <div className="absolute bottom-2 left-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-lg shadow-sm">
          <span className="font-bold text-gray-900">
            {formatPrice(listing.rent_amount, listing.currency)}
          </span>
          <span className="text-xs text-gray-500">/mo</span>
        </div>
      </div>

      {/* Content */}
      <div className="p-3">
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
          <span className="text-xs text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">
            {PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default SimilarListings;
