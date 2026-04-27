/**
 * Listing Details Component
 * 
 * Displays property details including:
 * - Key specs (beds, baths, size, floor)
 * - Description
 * - Amenities by category
 * - Utilities & Infrastructure
 * - Security features
 * - House policies
 * 
 * Theme: 70% Teal, 30% Orange
 */

"use client";

import { useState } from "react";
import { 
  Bed, 
  Bath, 
  Square, 
  Building2, 
  Calendar,
  Sofa,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Droplets,
  Zap,
  Wifi,
  Shield,
  Car,
  PawPrint,
  Cigarette,
  Clock,
  CreditCard,
  Home,
  Layers
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { Listing, SecurityFeatures, Utilities } from "@/lib/listings/types";

interface ListingDetailsProps {
  listing: Listing;
  className?: string;
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

// Condition labels
const CONDITION_LABELS: Record<NonNullable<Listing["condition"]>, { label: string; color: string }> = {
  excellent: { label: "Excellent", color: "text-success-600 bg-success-50" },
  good: { label: "Good", color: "text-brand-600 bg-brand-50" },
  fair: { label: "Fair", color: "text-warning-600 bg-warning-50" },
  needs_work: { label: "Needs Work", color: "text-error-600 bg-error-50" },
};

// Furnishing labels
const FURNISHING_LABELS: Record<Listing["furnishing"], { label: string; icon: typeof Sofa }> = {
  unfurnished: { label: "Unfurnished", icon: Home },
  semi_furnished: { label: "Semi-Furnished", icon: Sofa },
  fully_furnished: { label: "Fully Furnished", icon: Sparkles },
};

// Amenity display config
const AMENITY_LABELS: Record<string, { label: string; category: string }> = {
  // Water & Power
  water_24_7: { label: "24/7 Water Supply", category: "utilities" },
  water_tank: { label: "Water Tank", category: "utilities" },
  borehole: { label: "Borehole", category: "utilities" },
  generator: { label: "Backup Generator", category: "utilities" },
  solar: { label: "Solar Power", category: "utilities" },
  prepaid_meter: { label: "Prepaid Meter", category: "utilities" },
  // Security
  perimeter_wall: { label: "Perimeter Wall", category: "security" },
  security_guard: { label: "Security Guard", category: "security" },
  cctv: { label: "CCTV Cameras", category: "security" },
  electric_fence: { label: "Electric Fence", category: "security" },
  controlled_gate: { label: "Controlled Gate", category: "security" },
  intercom: { label: "Intercom", category: "security" },
  caretaker: { label: "Caretaker On-site", category: "security" },
  // Indoor
  hot_water: { label: "Hot Water", category: "indoor" },
  bathtub: { label: "Bathtub", category: "indoor" },
  built_in_wardrobes: { label: "Built-in Wardrobes", category: "indoor" },
  walk_in_closet: { label: "Walk-in Closet", category: "indoor" },
  air_conditioning: { label: "Air Conditioning", category: "indoor" },
  ceiling_fans: { label: "Ceiling Fans", category: "indoor" },
  fireplace: { label: "Fireplace", category: "indoor" },
  balcony: { label: "Balcony/Terrace", category: "indoor" },
  tiled_floors: { label: "Tiled Floors", category: "indoor" },
  wooden_floors: { label: "Wooden Floors", category: "indoor" },
  ensuite: { label: "En-suite Bathroom", category: "indoor" },
  guest_toilet: { label: "Guest Toilet", category: "indoor" },
  dsq: { label: "DSQ", category: "indoor" },
  // Kitchen
  gas_allowed: { label: "Gas Cooking", category: "kitchen" },
  gas_piped: { label: "Piped Gas", category: "kitchen" },
  kitchen_cabinets: { label: "Kitchen Cabinets", category: "kitchen" },
  granite_counters: { label: "Granite Counters", category: "kitchen" },
  // Building
  swimming_pool: { label: "Swimming Pool", category: "building" },
  gym: { label: "Gym", category: "building" },
  garden: { label: "Garden", category: "building" },
  playground: { label: "Playground", category: "building" },
  rooftop: { label: "Rooftop Access", category: "building" },
  elevator: { label: "Elevator", category: "building" },
  laundry_room: { label: "Laundry Room", category: "building" },
  storage: { label: "Storage Room", category: "building" },
  bbq_area: { label: "BBQ Area", category: "building" },
  clubhouse: { label: "Clubhouse", category: "building" },
};

// Security feature labels
const SECURITY_GUARD_LABELS: Record<NonNullable<SecurityFeatures["guard"]>, string> = {
  none: "No Security Guard",
  daytime: "Daytime Security",
  "24_hour": "24-Hour Security",
};

const CCTV_LABELS: Record<NonNullable<SecurityFeatures["cctv"]>, string> = {
  none: "No CCTV",
  entry_only: "CCTV at Entry Points",
  full: "Full CCTV Coverage",
};

const ACCESS_LABELS: Record<NonNullable<SecurityFeatures["access_control"]>, string> = {
  none: "No Access Control",
  key_only: "Key Access",
  card: "Card Access",
  biometric: "Biometric Access",
};

// Utility labels
const WATER_LABELS: Record<NonNullable<Utilities["water"]>, string> = {
  "24_7": "24/7 Water Supply",
  rationed: "Rationed Water",
  tank_backup: "Tank Backup",
};

const BACKUP_POWER_LABELS: Record<NonNullable<Utilities["backup_power"]>, string> = {
  none: "No Backup Power",
  common_areas: "Generator (Common Areas)",
  full: "Full Backup Power",
};

// Policy labels
const PET_POLICY_LABELS: Record<Listing["pet_policy"], { label: string; color: string }> = {
  not_allowed: { label: "No Pets", color: "text-error-600" },
  small_only: { label: "Small Pets Only", color: "text-warning-600" },
  all_allowed: { label: "Pets Welcome", color: "text-success-600" },
  case_by_case: { label: "Ask Landlord", color: "text-brand-600" },
};

const SMOKING_POLICY_LABELS: Record<Listing["smoking_policy"], { label: string; color: string }> = {
  not_allowed: { label: "No Smoking", color: "text-error-600" },
  balcony_only: { label: "Balcony Only", color: "text-warning-600" },
  allowed: { label: "Smoking Allowed", color: "text-success-600" },
};

const LEASE_TERM_LABELS: Record<Listing["lease_term"], string> = {
  monthly: "Month-to-Month",
  fixed: "Fixed Term",
  flexible: "Flexible",
};

const PARKING_LABELS: Record<Listing["parking"], string> = {
  none: "No Parking",
  covered: "Covered Parking",
  open: "Open Parking",
  garage: "Garage Parking",
};

// Payment method labels
const PAYMENT_METHOD_LABELS: Record<string, string> = {
  mpesa: "M-Pesa",
  airtel: "Airtel Money",
  bank: "Bank Transfer",
  cheque: "Cheque",
  cash: "Cash",
};

// ISP labels
const ISP_LABELS: Record<string, string> = {
  safaricom: "Safaricom Fibre",
  zuku: "Zuku",
  jtl: "JTL",
  faiba: "Faiba",
  airtel: "Airtel",
  liquid: "Liquid Telecom",
  starlink: "Starlink",
};

export function ListingDetails({ listing, className }: ListingDetailsProps) {
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(["amenities"]));

  const toggleSection = (section: string) => {
    const newSet = new Set(expandedSections);
    if (newSet.has(section)) {
      newSet.delete(section);
    } else {
      newSet.add(section);
    }
    setExpandedSections(newSet);
  };

  // Group amenities by category
  const amenitiesList = listing.amenities || [];
  const groupedAmenities = amenitiesList.reduce((acc, amenity) => {
    const config = AMENITY_LABELS[amenity];
    if (config) {
      if (!acc[config.category]) acc[config.category] = [];
      acc[config.category].push({ id: amenity, label: config.label });
    }
    return acc;
  }, {} as Record<string, { id: string; label: string }[]>);

  const FurnishingIcon = FURNISHING_LABELS[listing.furnishing]?.icon || Sofa;

  return (
    <div className={cn("space-y-5", className)}>
      {/* Key Specs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border border-gray-200 rounded-lg p-3 text-center">
          <Bed className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{listing.bedrooms}</p>
          <p className="text-xs text-gray-500">{listing.bedrooms === 1 ? "Bedroom" : "Bedrooms"}</p>
        </div>
        <div className="border border-gray-200 rounded-lg p-3 text-center">
          <Bath className="w-5 h-5 text-gray-400 mx-auto mb-1" />
          <p className="text-xl font-bold text-gray-900">{listing.bathrooms}</p>
          <p className="text-xs text-gray-500">{listing.bathrooms === 1 ? "Bathroom" : "Bathrooms"}</p>
        </div>
        {listing.size_sqft && (
          <div className="border border-gray-200 rounded-lg p-3 text-center">
            <Square className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{listing.size_sqft.toLocaleString()}</p>
            <p className="text-xs text-gray-500">{listing.size_unit || "sqft"}</p>
          </div>
        )}
        {listing.floor_level && (
          <div className="border border-gray-200 rounded-lg p-3 text-center">
            <Layers className="w-5 h-5 text-gray-400 mx-auto mb-1" />
            <p className="text-xl font-bold text-gray-900">{listing.floor_level}</p>
            <p className="text-xs text-gray-500">Floor</p>
          </div>
        )}
      </div>

      {/* Quick Info Pills */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
          <Home className="w-3.5 h-3.5" />
          {PROPERTY_TYPE_LABELS[listing.property_type]}
        </span>
        <span className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
          <FurnishingIcon className="w-3.5 h-3.5" />
          {FURNISHING_LABELS[listing.furnishing].label}
        </span>
        {listing.condition && (
          <span className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
            <Sparkles className="w-3.5 h-3.5" />
            {CONDITION_LABELS[listing.condition].label}
          </span>
        )}
        {listing.year_built && (
          <span className="inline-flex items-center gap-1.5 text-sm border border-gray-200 text-gray-600 px-2.5 py-1 rounded-full">
            <Calendar className="w-3.5 h-3.5" />
            Built {listing.year_built}
          </span>
        )}
      </div>

      {/* Description */}
      <div>
        <h3 className="text-base font-semibold text-gray-900 mb-2">About this property</h3>
        <div className={cn(
          "text-gray-600 text-sm leading-relaxed whitespace-pre-line",
          !showFullDescription && listing.description.length > 400 && "line-clamp-4"
        )}>
          {listing.description}
        </div>
        {listing.description.length > 400 && (
          <button
            onClick={() => setShowFullDescription(!showFullDescription)}
            className="text-brand-600 hover:text-brand-700 font-medium text-sm mt-2 flex items-center gap-1"
          >
            {showFullDescription ? (
              <>Show less <ChevronUp className="w-4 h-4" /></>
            ) : (
              <>Read more <ChevronDown className="w-4 h-4" /></>
            )}
          </button>
        )}
      </div>

      {/* Amenities Section */}
      <CollapsibleSection
        title="Amenities & Features"
        icon={<Sparkles className="w-5 h-5" />}
        isOpen={expandedSections.has("amenities")}
        onToggle={() => toggleSection("amenities")}
        count={amenitiesList.length}
      >
        {Object.keys(groupedAmenities).length > 0 ? (
          <div className="space-y-4">
            {Object.entries(groupedAmenities).map(([category, items]) => (
              <div key={category}>
                <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-2">
                  {category.replace("_", " ")}
                </h4>
                <div className="flex flex-wrap gap-2">
                  {items.map(item => (
                    <span
                      key={item.id}
                      className="inline-flex items-center text-sm bg-gray-100 text-gray-700 px-3 py-1.5 rounded-full"
                    >
                      {item.label}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-sm">No amenities listed</p>
        )}
      </CollapsibleSection>

      {/* Utilities & Infrastructure */}
      <CollapsibleSection
        title="Utilities & Infrastructure"
        icon={<Zap className="w-5 h-5" />}
        isOpen={expandedSections.has("utilities")}
        onToggle={() => toggleSection("utilities")}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          {/* Water */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Droplets className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Water Supply</p>
              <p className="text-sm text-gray-600">
                {listing.utilities.water ? WATER_LABELS[listing.utilities.water] : "Not specified"}
                {listing.utilities.has_storage && " • Tank Storage"}
              </p>
            </div>
          </div>

          {/* Power */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-cta-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Zap className="w-5 h-5 text-cta-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Backup Power</p>
              <p className="text-sm text-gray-600">
                {listing.utilities.backup_power 
                  ? BACKUP_POWER_LABELS[listing.utilities.backup_power] 
                  : "Not specified"}
              </p>
            </div>
          </div>

          {/* Internet */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
              <Wifi className="w-5 h-5 text-brand-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Internet</p>
              <p className="text-sm text-gray-600">
                {listing.utilities.internet_ready ? "Internet Ready" : "Not specified"}
                {listing.utilities.isps && listing.utilities.isps.length > 0 && (
                  <span className="block mt-0.5">
                    Available: {listing.utilities.isps.map(isp => ISP_LABELS[isp] || isp).join(", ")}
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Parking */}
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <Car className="w-5 h-5 text-gray-600" />
            </div>
            <div>
              <p className="font-medium text-gray-900">Parking</p>
              <p className="text-sm text-gray-600">
                {PARKING_LABELS[listing.parking]}
                {listing.parking_spaces > 0 && ` • ${listing.parking_spaces} space${listing.parking_spaces > 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>

      {/* Security */}
      <CollapsibleSection
        title="Security"
        icon={<Shield className="w-5 h-5" />}
        isOpen={expandedSections.has("security")}
        onToggle={() => toggleSection("security")}
      >
        <div className="grid sm:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Security Guard</p>
            <p className="font-medium text-gray-900">
              {listing.security_features.guard 
                ? SECURITY_GUARD_LABELS[listing.security_features.guard]
                : "Not specified"}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">CCTV</p>
            <p className="font-medium text-gray-900">
              {listing.security_features.cctv 
                ? CCTV_LABELS[listing.security_features.cctv]
                : "Not specified"}
            </p>
          </div>
          <div className="text-center p-4 bg-gray-50 rounded-lg">
            <p className="text-sm text-gray-500 mb-1">Access Control</p>
            <p className="font-medium text-gray-900">
              {listing.security_features.access_control 
                ? ACCESS_LABELS[listing.security_features.access_control]
                : "Not specified"}
            </p>
          </div>
        </div>
      </CollapsibleSection>

      {/* Policies */}
      <CollapsibleSection
        title="House Rules & Policies"
        icon={<Clock className="w-5 h-5" />}
        isOpen={expandedSections.has("policies")}
        onToggle={() => toggleSection("policies")}
      >
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <PawPrint className={cn("w-5 h-5", PET_POLICY_LABELS[listing.pet_policy].color)} />
            <div>
              <p className="text-sm text-gray-500">Pets</p>
              <p className={cn("font-medium", PET_POLICY_LABELS[listing.pet_policy].color)}>
                {PET_POLICY_LABELS[listing.pet_policy].label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Cigarette className={cn("w-5 h-5", SMOKING_POLICY_LABELS[listing.smoking_policy].color)} />
            <div>
              <p className="text-sm text-gray-500">Smoking</p>
              <p className={cn("font-medium", SMOKING_POLICY_LABELS[listing.smoking_policy].color)}>
                {SMOKING_POLICY_LABELS[listing.smoking_policy].label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <Calendar className="w-5 h-5 text-brand-600" />
            <div>
              <p className="text-sm text-gray-500">Lease Term</p>
              <p className="font-medium text-gray-900">
                {LEASE_TERM_LABELS[listing.lease_term]}
                {listing.min_lease_months > 1 && ` (Min ${listing.min_lease_months} months)`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
            <CreditCard className="w-5 h-5 text-brand-600" />
            <div>
              <p className="text-sm text-gray-500">Payment Methods</p>
              <p className="font-medium text-gray-900">
                {listing.payment_methods.map(m => PAYMENT_METHOD_LABELS[m] || m).join(", ") || "Not specified"}
              </p>
            </div>
          </div>
        </div>
      </CollapsibleSection>
    </div>
  );
}

// Collapsible section component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  count?: number;
  children: React.ReactNode;
}

function CollapsibleSection({ title, icon, isOpen, onToggle, count, children }: CollapsibleSectionProps) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-white hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-brand-600">{icon}</span>
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          {count !== undefined && (
            <span className="text-sm text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-gray-400" />
        ) : (
          <ChevronDown className="w-5 h-5 text-gray-400" />
        )}
      </button>
      {isOpen && (
        <div className="p-4 pt-0 border-t border-gray-100 bg-white">
          {children}
        </div>
      )}
    </div>
  );
}

export default ListingDetails;
