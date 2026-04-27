/**
 * Landlord Listing Detail Page
 * 
 * Shows a landlord's listing with analytics and management actions.
 * Provides a preview of how tenants see the listing.
 */

import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { 
  ArrowLeft, 
  Pencil, 
  Eye, 
  MessageSquare, 
  Calendar,
  ExternalLink,
  Pause,
  Play,
  Trash2,
  Copy,
  MapPin,
  Bed,
  Bath,
  Maximize2,
  Home,
  CheckCircle,
  Clock,
  TrendingUp,
  Users,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ListingActions } from "./ListingActions";

// =============================================================================
// TYPES
// =============================================================================

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  property_type: string;
  area: string;
  city: string;
  address: string | null;
  bedrooms: number;
  bathrooms: number;
  size_sqft: number | null;
  rent_amount: number;
  currency: string;
  deposit_amount: number | null;
  service_charge: number | null;
  photos: { id: string; url: string; category: string }[];
  cover_photo: string | null;
  status: "draft" | "active" | "paused" | "rented" | "expired" | "archived";
  views_count: number;
  inquiries_count: number;
  is_verified: boolean;
  available_now: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  // Commercial
  listing_category: "residential" | "commercial" | null;
  commercial_type: string | null;
  size_sqm: number | null;
}

// =============================================================================
// DATA FETCHING
// =============================================================================

async function getListing(id: string): Promise<ListingDetail | null> {
  const supabase = await createClient();
  
  // Get current user
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  
  // Fetch listing owned by this user
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (supabase as any)
    .from("listings")
    .select("*")
    .eq("id", id)
    .eq("landlord_id", user.id)
    .single();
  
  if (error || !data) return null;
  
  // Cast to record for property access
  const listing = data as Record<string, unknown>;
  
  // Parse photos - handle various formats (array, JSON string, etc.)
  let photos: { id: string; url: string; category: string }[] = [];
  let photosData = listing.photos;
  
  // If photos is a string, try to parse it as JSON
  if (typeof photosData === "string") {
    try {
      photosData = JSON.parse(photosData);
    } catch {
      photosData = [];
    }
  }
  
  if (photosData && Array.isArray(photosData)) {
    photos = (photosData as unknown[]).map((p, i) => {
      const photo = p as Record<string, unknown>;
      return {
        id: String(photo.id || i),
        url: String(photo.url || ""),
        category: String(photo.category || "extra"),
      };
    }).filter(p => p.url && p.url.trim() !== "");
  }
  
  return {
    id: String(listing.id),
    title: String(listing.title || ""),
    description: String(listing.description || ""),
    property_type: String(listing.property_type || ""),
    area: String(listing.area || ""),
    city: String(listing.city || ""),
    address: listing.address as string | null,
    bedrooms: Number(listing.bedrooms || 0),
    bathrooms: Number(listing.bathrooms || 0),
    size_sqft: listing.size_sqft as number | null,
    rent_amount: Number(listing.rent_amount || 0),
    currency: String(listing.currency || "KES"),
    deposit_amount: listing.deposit_amount as number | null,
    service_charge: listing.service_charge as number | null,
    photos,
    cover_photo: listing.cover_photo as string | null,
    status: (listing.status as ListingDetail["status"]) || "draft",
    views_count: Number(listing.views_count || 0),
    inquiries_count: Number(listing.inquiries_count || 0),
    is_verified: Boolean(listing.is_verified),
    available_now: Boolean(listing.available_now),
    published_at: listing.published_at as string | null,
    created_at: String(listing.created_at || ""),
    updated_at: String(listing.updated_at || ""),
    listing_category: listing.listing_category as "residential" | "commercial" | null,
    commercial_type: listing.commercial_type as string | null,
    size_sqm: listing.size_sqm as number | null,
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

function formatDate(dateString: string | null): string {
  if (!dateString) return "Not published";
  return new Date(dateString).toLocaleDateString("en-KE", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getStatusConfig(status: ListingDetail["status"]) {
  const configs = {
    draft: { bg: "bg-gray-100", text: "text-gray-700", label: "Draft", icon: Clock },
    active: { bg: "bg-teal-100", text: "text-teal-700", label: "Active", icon: CheckCircle },
    paused: { bg: "bg-amber-100", text: "text-amber-700", label: "Paused", icon: Pause },
    rented: { bg: "bg-blue-100", text: "text-blue-700", label: "Rented", icon: Home },
    expired: { bg: "bg-red-100", text: "text-red-700", label: "Expired", icon: Clock },
    archived: { bg: "bg-gray-100", text: "text-gray-500", label: "Archived", icon: Clock },
  };
  return configs[status] || configs.draft;
}

const PROPERTY_TYPE_LABELS: Record<string, string> = {
  bedsitter: "Bedsitter",
  studio: "Studio",
  apartment: "Apartment",
  house: "House",
  townhouse: "Townhouse",
  maisonette: "Maisonette",
  villa: "Villa",
  office: "Office",
  retail: "Retail",
  food_beverage: "Restaurant/Café",
  warehouse: "Warehouse",
  hospitality: "Hotel/Event Space",
};

// =============================================================================
// PAGE COMPONENT
// =============================================================================

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LandlordListingDetailPage({ params }: PageProps) {
  const { id } = await params;
  const listing = await getListing(id);
  
  if (!listing) {
    notFound();
  }
  
  const statusConfig = getStatusConfig(listing.status);
  const StatusIcon = statusConfig.icon;
  const isCommercial = listing.listing_category === "commercial";
  
  // Check for valid cover image - prioritize cover_photo, fallback to first photo with "cover" category, then first photo
  const getValidCoverImage = (): string | null => {
    // Check cover_photo field
    if (listing.cover_photo && listing.cover_photo.trim() !== "") {
      return listing.cover_photo;
    }
    // Check for photo with "cover" category
    const coverCategoryPhoto = listing.photos.find(p => p.category === "cover");
    if (coverCategoryPhoto?.url) {
      return coverCategoryPhoto.url;
    }
    // Fallback to first photo
    if (listing.photos[0]?.url) {
      return listing.photos[0].url;
    }
    return null;
  };
  const coverImage = getValidCoverImage();
  
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/landlord/listings"
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-500" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{listing.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <span className={cn(
                "inline-flex items-center gap-1 text-sm font-medium",
                listing.status === "active" ? "text-green-600" :
                listing.status === "paused" ? "text-amber-600" :
                listing.status === "rented" ? "text-blue-600" : "text-gray-500"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  listing.status === "active" ? "bg-green-500" :
                  listing.status === "paused" ? "bg-amber-500" :
                  listing.status === "rented" ? "bg-blue-500" : "bg-gray-400"
                )} />
                {statusConfig.label}
              </span>
              {listing.is_verified && (
                <span className="inline-flex items-center gap-1 text-sm text-gray-500">
                  <CheckCircle className="w-4 h-4" />
                  Verified
                </span>
              )}
            </div>
          </div>
        </div>
        
        {/* Actions */}
        <div className="flex items-center gap-2">
          {listing.status !== "draft" && (
            <Link
              href={`/properties/${listing.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              View Public
            </Link>
          )}
          <Link
            href={`/dashboard/landlord/listings/${listing.id}/edit`}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Edit Listing
          </Link>
        </div>
      </div>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard
          icon={<Eye className="w-5 h-5" />}
          label="Total Views"
          value={listing.views_count.toLocaleString()}
        />
        <StatCard
          icon={<MessageSquare className="w-5 h-5" />}
          label="Inquiries"
          value={listing.inquiries_count.toLocaleString()}
        />
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Published"
          value={formatDate(listing.published_at)}
        />
        <StatCard
          icon={<TrendingUp className="w-5 h-5" />}
          label="Conversion"
          value={listing.views_count > 0 
            ? `${((listing.inquiries_count / listing.views_count) * 100).toFixed(1)}%`
            : "0%"
          }
        />
      </div>
      
      {/* Main Content */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Preview */}
        <div className="lg:col-span-2 space-y-6">
          {/* Gallery Preview */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="relative aspect-video bg-gray-100">
              {coverImage ? (
                <Image
                  src={coverImage}
                  alt={listing.title}
                  fill
                  className="object-cover"
                  unoptimized
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <Maximize2 className="w-12 h-12" />
                  <span className="text-sm">No cover image</span>
                </div>
              )}
            </div>
            
            {/* Photo thumbnails */}
            {listing.photos.length > 1 && (
              <div className="p-3 border-t border-gray-100">
                <div className="flex gap-2 overflow-x-auto">
                  {listing.photos.slice(0, 6).map((photo, i) => (
                    <div
                      key={photo.id}
                      className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100"
                    >
                      <Image
                        src={photo.url}
                        alt={`Photo ${i + 1}`}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  ))}
                  {listing.photos.length > 6 && (
                    <div className="w-16 h-16 flex-shrink-0 rounded-lg bg-gray-100 flex items-center justify-center text-sm font-medium text-gray-500">
                      +{listing.photos.length - 6}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          {/* Description */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">Description</h2>
            <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">
              {listing.description || "No description provided."}
            </p>
          </div>
        </div>
        
        {/* Right: Details & Actions */}
        <div className="space-y-6">
          {/* Price Card */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">Monthly Rent</p>
            <div className="text-3xl font-bold text-gray-900">
              {formatCurrency(listing.rent_amount, listing.currency)}
            </div>
            
            {(listing.deposit_amount || listing.service_charge) && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-2">
                {listing.deposit_amount && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Deposit</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(listing.deposit_amount, listing.currency)}</span>
                  </div>
                )}
                {listing.service_charge && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Service Charge</span>
                    <span className="font-semibold text-gray-900">{formatCurrency(listing.service_charge, listing.currency)}</span>
                  </div>
                )}
              </div>
            )}
          </div>
          
          {/* Property Details */}
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-4">Property Details</h3>
            
            <div className="space-y-1">
              <DetailRow icon={<MapPin className="w-4 h-4" />} label="Location" value={`${listing.area}, ${listing.city}`} />
              <DetailRow icon={<Home className="w-4 h-4" />} label="Type" value={PROPERTY_TYPE_LABELS[listing.property_type] || listing.property_type} />
              
              {!isCommercial ? (
                <>
                  <DetailRow icon={<Bed className="w-4 h-4" />} label="Bedrooms" value={listing.bedrooms.toString()} />
                  <DetailRow icon={<Bath className="w-4 h-4" />} label="Bathrooms" value={listing.bathrooms.toString()} />
                  {listing.size_sqft && (
                    <DetailRow icon={<Maximize2 className="w-4 h-4" />} label="Size" value={`${listing.size_sqft.toLocaleString()} sqft`} />
                  )}
                </>
              ) : (
                <>
                  {listing.size_sqm && (
                    <DetailRow icon={<Maximize2 className="w-4 h-4" />} label="Size" value={`${listing.size_sqm.toLocaleString()} sqm`} />
                  )}
                  <DetailRow icon={<Building2 className="w-4 h-4" />} label="Category" value="Commercial" />
                </>
              )}
            </div>
          </div>
          
          {/* Quick Actions */}
          <ListingActions listing={listing} />
        </div>
      </div>
    </div>
  );
}

// =============================================================================
// SUB-COMPONENTS
// =============================================================================

function StatCard({ 
  icon, 
  label, 
  value, 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center gap-2 text-gray-400 mb-2">
        {icon}
        <span className="text-sm font-medium uppercase tracking-wide">{label}</span>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
    </div>
  );
}

function DetailRow({ 
  icon, 
  label, 
  value 
}: { 
  icon: React.ReactNode; 
  label: string; 
  value: string;
}) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-2 text-gray-500">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <span className="text-sm font-semibold text-gray-900">{value}</span>
    </div>
  );
}
