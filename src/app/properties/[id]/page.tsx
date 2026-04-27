/**
 * Public Property Detail Page
 * 
 * Displays a single listing with full details for public viewing.
 * Includes property info, photos, amenities, location, and contact form.
 */

import type { Metadata, ResolvingMetadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";
import { Navbar, Footer } from "@/components/landing";
import { Container, Badge } from "@/components/ui";
import { getListingById } from "@/lib/listings/get-listing";
import { 
  Bed, 
  Bath, 
  Maximize2, 
  MapPin, 
  Calendar, 
  Shield, 
  Car, 
  DogIcon,
  Cigarette,
  ChevronLeft,
  Share2,
  Heart,
  Phone,
  MessageSquare,
  Check,
  Building2,
  Clock,
} from "lucide-react";

// =============================================================================
// TYPES
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

// =============================================================================
// METADATA
// =============================================================================

export async function generateMetadata(
  { params }: PageProps,
  parent: ResolvingMetadata
): Promise<Metadata> {
  const { id } = await params;
  const { listing, error } = await getListingById(id, { incrementViews: false });

  if (!listing) {
    return {
      title: "Property Not Found | MitaSafi",
    };
  }

  const title = `${listing.title} | MitaSafi`;
  const description = listing.description.slice(0, 160);

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      images: listing.cover_photo ? [listing.cover_photo] : [],
    },
  };
}

// =============================================================================
// HELPERS
// =============================================================================

function formatCurrency(amount: number, currency: string = "KES"): string {
  return new Intl.NumberFormat("en-KE", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatPropertyType(type: string): string {
  const types: Record<string, string> = {
    bedsitter: "Bedsitter",
    studio: "Studio",
    apartment: "Apartment",
    house: "House",
    townhouse: "Townhouse",
    maisonette: "Maisonette",
    villa: "Villa",
  };
  return types[type] || type;
}

function formatPetPolicy(policy: string): string {
  const policies: Record<string, string> = {
    not_allowed: "No pets allowed",
    small_only: "Small pets only",
    all_allowed: "Pets allowed",
    case_by_case: "Pets negotiable",
  };
  return policies[policy] || policy;
}

function formatSmokingPolicy(policy: string): string {
  const policies: Record<string, string> = {
    not_allowed: "No smoking",
    balcony_only: "Balcony only",
    allowed: "Smoking allowed",
  };
  return policies[policy] || policy;
}

// =============================================================================
// COMPONENTS
// =============================================================================

function PropertyGallery({ photos, title }: { photos: { url: string; category?: string }[]; title: string }) {
  const mainPhoto = photos[0]?.url;
  const otherPhotos = photos.slice(1, 5);

  return (
    <div className="grid grid-cols-4 gap-2 rounded-xl overflow-hidden h-[400px]">
      {/* Main large photo */}
      <div className="col-span-2 row-span-2 relative">
        {mainPhoto ? (
          <Image
            src={mainPhoto}
            alt={title}
            fill
            className="object-cover"
            sizes="50vw"
            priority
          />
        ) : (
          <div className="absolute inset-0 bg-gray-200 flex items-center justify-center">
            <Building2 className="w-16 h-16 text-gray-400" />
          </div>
        )}
      </div>
      
      {/* Secondary photos */}
      {otherPhotos.map((photo, index) => (
        <div key={index} className="relative">
          <Image
            src={photo.url}
            alt={`${title} - Photo ${index + 2}`}
            fill
            className="object-cover"
            sizes="25vw"
          />
        </div>
      ))}
      
      {/* Placeholder slots if less than 4 other photos */}
      {Array.from({ length: Math.max(0, 4 - otherPhotos.length) }).map((_, i) => (
        <div key={`placeholder-${i}`} className="relative bg-gray-100">
          <div className="absolute inset-0 flex items-center justify-center">
            <Building2 className="w-8 h-8 text-gray-300" />
          </div>
        </div>
      ))}
      
      {/* View all photos button */}
      {photos.length > 5 && (
        <button className="absolute bottom-4 right-4 bg-white px-4 py-2 rounded-lg shadow-md text-sm font-medium hover:bg-gray-50 transition-colors">
          View all {photos.length} photos
        </button>
      )}
    </div>
  );
}

function ContactCard({ listing, landlord }: { listing: any; landlord?: any }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 sticky top-24">
      {/* Price */}
      <div className="mb-6">
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-gray-900">
            {formatCurrency(listing.rent_amount, listing.currency)}
          </span>
          <span className="text-gray-500">/month</span>
        </div>
        {listing.rent_negotiable && (
          <span className="text-sm text-teal-600 font-medium">Price negotiable</span>
        )}
      </div>

      {/* Deposit */}
      {listing.deposit_months && (
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="text-sm text-gray-600">Deposit Required</div>
          <div className="font-semibold">
            {listing.deposit_months} month{listing.deposit_months > 1 ? "s" : ""} rent
            {listing.deposit_amount && ` (${formatCurrency(listing.deposit_amount)})`}
          </div>
        </div>
      )}

      {/* Availability */}
      <div className="mb-6 flex items-center gap-2">
        <Calendar className="w-4 h-4 text-gray-400" />
        <span className="text-sm">
          {listing.available_now ? (
            <span className="text-teal-600 font-medium">Available Now</span>
          ) : listing.available_from ? (
            <>Available from {new Date(listing.available_from).toLocaleDateString()}</>
          ) : (
            "Contact for availability"
          )}
        </span>
      </div>

      {/* Contact buttons */}
      <div className="space-y-3">
        <button className="w-full py-3 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 transition-colors flex items-center justify-center gap-2">
          <Phone className="w-4 h-4" />
          Request Phone Number
        </button>
        <button className="w-full py-3 border-2 border-teal-600 text-teal-600 rounded-lg font-semibold hover:bg-teal-50 transition-colors flex items-center justify-center gap-2">
          <MessageSquare className="w-4 h-4" />
          Send Message
        </button>
      </div>

      {/* Landlord info */}
      {landlord && (
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
              {landlord.avatar_url ? (
                <Image
                  src={landlord.avatar_url}
                  alt={landlord.full_name || "Landlord"}
                  width={48}
                  height={48}
                  className="rounded-full object-cover"
                />
              ) : (
                <span className="text-lg font-semibold text-gray-500">
                  {landlord.full_name?.charAt(0) || "L"}
                </span>
              )}
            </div>
            <div>
              <div className="font-medium text-gray-900">{landlord.full_name || "Landlord"}</div>
              {landlord.is_verified && (
                <div className="flex items-center gap-1 text-sm text-teal-600">
                  <Shield className="w-3.5 h-3.5" />
                  Verified Landlord
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// MAIN PAGE
// =============================================================================

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const { listing, error } = await getListingById(id);

  if (!listing || error) {
    notFound();
  }

  const photos = listing.photos || [];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />

      {/* Back navigation */}
      <div className="bg-white border-b border-gray-200">
        <Container>
          <div className="py-4 flex items-center justify-between">
            <Link 
              href="/properties"
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ChevronLeft className="w-5 h-5" />
              Back to search
            </Link>
            <div className="flex items-center gap-3">
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Share2 className="w-5 h-5 text-gray-600" />
              </button>
              <button className="p-2 rounded-full hover:bg-gray-100 transition-colors">
                <Heart className="w-5 h-5 text-gray-600" />
              </button>
            </div>
          </div>
        </Container>
      </div>

      <main className="py-8">
        <Container>
          {/* Photo Gallery */}
          <PropertyGallery photos={photos} title={listing.title} />

          {/* Main content grid */}
          <div className="mt-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left column - Property details */}
            <div className="lg:col-span-2 space-y-8">
              {/* Title and badges */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant="neutral">{formatPropertyType(listing.property_type)}</Badge>
                  {listing.is_verified && (
                    <Badge variant="success" className="flex items-center gap-1">
                      <Shield className="w-3.5 h-3.5" />
                      Verified
                    </Badge>
                  )}
                </div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{listing.title}</h1>
                <div className="flex items-center gap-2 text-gray-600">
                  <MapPin className="w-4 h-4" />
                  <span>{listing.area}, {listing.city || "Nairobi"}</span>
                </div>
              </div>

              {/* Key features */}
              <div className="flex flex-wrap gap-6 py-4 border-y border-gray-200">
                <div className="flex items-center gap-2">
                  <Bed className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">{listing.bedrooms}</span>
                  <span className="text-gray-500">Bedrooms</span>
                </div>
                <div className="flex items-center gap-2">
                  <Bath className="w-5 h-5 text-gray-400" />
                  <span className="font-medium">{listing.bathrooms}</span>
                  <span className="text-gray-500">Bathrooms</span>
                </div>
                {listing.size_sqft && (
                  <div className="flex items-center gap-2">
                    <Maximize2 className="w-5 h-5 text-gray-400" />
                    <span className="font-medium">{listing.size_sqft.toLocaleString()}</span>
                    <span className="text-gray-500">{listing.size_unit || "sqft"}</span>
                  </div>
                )}
              </div>

              {/* Description */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">About this property</h2>
                <p className="text-gray-600 whitespace-pre-line">{listing.description}</p>
              </div>

              {/* Amenities */}
              {listing.amenities && listing.amenities.length > 0 && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-3">Amenities</h2>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {listing.amenities.map((amenity: string) => (
                      <div key={amenity} className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-teal-600" />
                        <span className="text-gray-700 capitalize">{amenity.replace(/_/g, " ")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Policies */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">House Rules</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <DogIcon className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">{formatPetPolicy(listing.pet_policy)}</span>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                    <Cigarette className="w-5 h-5 text-gray-400" />
                    <span className="text-sm text-gray-700">{formatSmokingPolicy(listing.smoking_policy)}</span>
                  </div>
                  {listing.parking !== "none" && (
                    <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                      <Car className="w-5 h-5 text-gray-400" />
                      <span className="text-sm text-gray-700">
                        {listing.parking_spaces} parking space{listing.parking_spaces > 1 ? "s" : ""}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Lease terms */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Lease Terms</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Minimum Lease</div>
                    <div className="font-medium">
                      {listing.min_lease_months} month{listing.min_lease_months > 1 ? "s" : ""}
                    </div>
                  </div>
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-gray-500 mb-1">Lease Type</div>
                    <div className="font-medium capitalize">{listing.lease_term}</div>
                  </div>
                  {listing.service_charge && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Service Charge</div>
                      <div className="font-medium">{formatCurrency(listing.service_charge)}/month</div>
                    </div>
                  )}
                  {listing.rent_includes && listing.rent_includes.length > 0 && (
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <div className="text-sm text-gray-500 mb-1">Rent Includes</div>
                      <div className="font-medium capitalize">
                        {listing.rent_includes.join(", ").replace(/_/g, " ")}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Location */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-3">Location</h2>
                <div className="bg-gray-100 rounded-lg h-64 flex items-center justify-center">
                  <div className="text-center">
                    <MapPin className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                    <p className="text-gray-500">
                      {listing.area}, {listing.city || "Nairobi"}
                    </p>
                    {listing.landmarks && (
                      <p className="text-sm text-gray-400 mt-1">Near: {listing.landmarks}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right column - Contact card */}
            <div className="lg:col-span-1">
              <ContactCard listing={listing} landlord={listing.landlord} />
            </div>
          </div>
        </Container>
      </main>

      <Footer />
    </div>
  );
}
