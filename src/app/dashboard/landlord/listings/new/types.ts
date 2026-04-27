/**
 * Property Wizard Types
 * 
 * Comprehensive type definitions for the property creation flow.
 * These types ensure type safety across all wizard steps.
 * Supports both Residential and Commercial listings.
 */

// Re-export commercial types
export * from "./commercial-types";
import {
  type ListingCategory,
  type CommercialType,
  type CommercialSubtype,
  type CommercialFormData,
  DEFAULT_COMMERCIAL_FORM_DATA,
} from "./commercial-types";

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

// Listing Category
export const LISTING_CATEGORIES = [
  { id: "residential", label: "Residential", icon: "home", description: "Homes & apartments" },
  { id: "commercial", label: "Commercial", icon: "building-2", description: "Business spaces" },
] as const;

export const PROPERTY_TYPES = [
  { id: "bedsitter", label: "Bedsitter", icon: "bed", description: "Room + kitchenette" },
  { id: "studio", label: "Studio", icon: "square", description: "Open-plan unit" },
  { id: "apartment", label: "Apartment", icon: "building", description: "1+ bedroom unit" },
  { id: "house", label: "House", icon: "home", description: "Standalone home" },
  { id: "townhouse", label: "Townhouse", icon: "warehouse", description: "Multi-story, shared walls" },
  { id: "maisonette", label: "Maisonette", icon: "castle", description: "2-story unit in building" },
  { id: "villa", label: "Villa", icon: "castle", description: "Premium standalone" },
] as const;

export type PropertyType = typeof PROPERTY_TYPES[number]["id"];

export const CONDITIONS = [
  { id: "excellent", label: "Excellent", description: "Like new, pristine condition" },
  { id: "good", label: "Good", description: "Well maintained, minor wear" },
  { id: "fair", label: "Fair", description: "Functional, some visible wear" },
  { id: "needs_work", label: "Needs Work", description: "Requires repairs" },
] as const;

export type PropertyCondition = typeof CONDITIONS[number]["id"];

export const FURNISHING_OPTIONS = [
  { id: "unfurnished", label: "Unfurnished", description: "Empty, no furniture" },
  { id: "semi_furnished", label: "Semi-Furnished", description: "Basic furniture included" },
  { id: "fully_furnished", label: "Fully Furnished", description: "Move-in ready" },
] as const;

export type FurnishingType = typeof FURNISHING_OPTIONS[number]["id"];

export const KITCHEN_TYPES = [
  { id: "none", label: "No Kitchen" },
  { id: "kitchenette", label: "Kitchenette" },
  { id: "full", label: "Full Kitchen" },
] as const;

export type KitchenType = typeof KITCHEN_TYPES[number]["id"];

export const POLICY_OPTIONS = [
  { id: "not_allowed", label: "Not Allowed" },
  { id: "negotiable", label: "Negotiable" },
  { id: "allowed", label: "Allowed" },
] as const;

export type PolicyType = typeof POLICY_OPTIONS[number]["id"];

// Enhanced Pet Policy Options
export const PET_POLICY_OPTIONS = [
  { id: "not_allowed", label: "Not Allowed", description: "No pets permitted" },
  { id: "small_only", label: "Small Pets Only", description: "Cats, small dogs under 10kg" },
  { id: "all_allowed", label: "All Pets Allowed", description: "Dogs, cats, other pets welcome" },
  { id: "case_by_case", label: "Case by Case", description: "Discuss with landlord" },
] as const;

export type PetPolicyType = typeof PET_POLICY_OPTIONS[number]["id"];

// Enhanced Smoking Policy Options
export const SMOKING_POLICY_OPTIONS = [
  { id: "not_allowed", label: "Not Allowed", description: "No smoking on premises" },
  { id: "balcony_only", label: "Balcony/Outdoor Only", description: "Smoking outdoors only" },
  { id: "allowed", label: "Allowed", description: "Smoking permitted" },
] as const;

export type SmokingPolicyType = typeof SMOKING_POLICY_OPTIONS[number]["id"];

// Security Guard Options
export const SECURITY_GUARD_OPTIONS = [
  { id: "none", label: "None", description: "" },
  { id: "daytime", label: "Daytime Only", description: "6am - 6pm" },
  { id: "24_hour", label: "24-Hour Security", description: "Round the clock" },
] as const;

export type SecurityGuardType = typeof SECURITY_GUARD_OPTIONS[number]["id"];

// CCTV Options
export const CCTV_OPTIONS = [
  { id: "none", label: "None", description: "" },
  { id: "entry_only", label: "Entry Points Only", description: "Gate, main entrance" },
  { id: "full", label: "Full Coverage", description: "Corridors, parking, common areas" },
] as const;

export type CCTVType = typeof CCTV_OPTIONS[number]["id"];

// Access Control Options
export const ACCESS_CONTROL_OPTIONS = [
  { id: "none", label: "None", description: "" },
  { id: "key_only", label: "Key Only", description: "" },
  { id: "card", label: "Access Card", description: "RFID or swipe card" },
  { id: "biometric", label: "Biometric", description: "Fingerprint or facial recognition" },
] as const;

export type AccessControlType = typeof ACCESS_CONTROL_OPTIONS[number]["id"];

// Water Reliability Options
export const WATER_RELIABILITY_OPTIONS = [
  { id: "24_7", label: "24/7 Supply", description: "Constant water supply" },
  { id: "rationed", label: "Rationed Schedule", description: "Water available on schedule" },
  { id: "tank_backup", label: "Tank Backup", description: "Reliable with storage backup" },
] as const;

export type WaterReliabilityType = typeof WATER_RELIABILITY_OPTIONS[number]["id"];

// Backup Power Options
export const BACKUP_POWER_OPTIONS = [
  { id: "none", label: "None", description: "" },
  { id: "common_areas", label: "Common Areas Only", description: "Lights, security, lifts" },
  { id: "full", label: "Full Backup", description: "Individual unit power backup" },
] as const;

export type BackupPowerType = typeof BACKUP_POWER_OPTIONS[number]["id"];

// Kenya ISP Options
export const ISP_OPTIONS = [
  { id: "safaricom", label: "Safaricom Home Fibre" },
  { id: "zuku", label: "Zuku" },
  { id: "jtl", label: "JTL" },
  { id: "faiba", label: "Faiba" },
  { id: "airtel", label: "Airtel" },
  { id: "liquid", label: "Liquid Telecom" },
  { id: "starlink", label: "Starlink" },
  { id: "other", label: "Other Provider" },
] as const;

export type ISPType = typeof ISP_OPTIONS[number]["id"];

export const LEASE_TERMS = [
  { id: "monthly", label: "Monthly", description: "Month-to-month" },
  { id: "fixed", label: "Fixed Term", description: "6-24 months" },
  { id: "flexible", label: "Flexible", description: "Negotiable" },
] as const;

export type LeaseTermType = typeof LEASE_TERMS[number]["id"];

export const PARKING_OPTIONS = [
  { id: "none", label: "None" },
  { id: "covered", label: "Covered" },
  { id: "open", label: "Open" },
  { id: "garage", label: "Garage" },
] as const;

export type ParkingType = typeof PARKING_OPTIONS[number]["id"];

export const PAYMENT_METHODS = [
  { id: "mpesa", label: "M-Pesa" },
  { id: "airtel", label: "Airtel Money" },
  { id: "bank", label: "Bank Transfer" },
  { id: "cheque", label: "Cheque" },
  { id: "cash", label: "Cash" },
] as const;

export const PAYMENT_FREQUENCIES = [
  { id: "monthly", label: "Monthly" },
  { id: "quarterly", label: "Quarterly" },
  { id: "annually", label: "Annually" },
] as const;

export type PaymentFrequency = typeof PAYMENT_FREQUENCIES[number]["id"];

export const FLOOR_LEVELS = [
  "Ground Floor",
  "1st Floor",
  "2nd Floor", 
  "3rd Floor",
  "4th Floor",
  "5th Floor",
  "6th Floor",
  "7th Floor",
  "8th Floor",
  "9th Floor",
  "10th Floor+",
  "Penthouse",
] as const;

// =============================================================================
// AMENITIES CONFIGURATION
// =============================================================================

export const AMENITY_CATEGORIES = {
  water: {
    title: "Water & Utilities",
    icon: "droplets",
    amenities: [
      { id: "water_24_7", label: "24/7 Water Supply" },
      { id: "water_tank", label: "Water Tank/Storage" },
      { id: "borehole", label: "Borehole" },
      { id: "water_included", label: "Water Included in Rent" },
      { id: "electricity_kplc", label: "Electricity (KPLC)" },
      { id: "prepaid_meter", label: "Prepaid Electricity Meter" },
      { id: "generator", label: "Backup Generator" },
      { id: "solar", label: "Solar Power" },
    ],
  },
  security: {
    title: "Security",
    icon: "shield",
    amenities: [
      { id: "perimeter_wall", label: "Perimeter Wall" },
      { id: "security_guard", label: "24hr Security Guard" },
      { id: "cctv", label: "CCTV Cameras" },
      { id: "electric_fence", label: "Electric Fence" },
      { id: "controlled_gate", label: "Controlled Access Gate" },
      { id: "intercom", label: "Intercom System" },
      { id: "caretaker", label: "Caretaker On-site" },
    ],
  },
  indoor: {
    title: "Indoor Features",
    icon: "sofa",
    amenities: [
      { id: "hot_water", label: "Hot Water (Shower)" },
      { id: "bathtub", label: "Bathtub" },
      { id: "built_in_wardrobes", label: "Built-in Wardrobes" },
      { id: "walk_in_closet", label: "Walk-in Closet" },
      { id: "air_conditioning", label: "Air Conditioning" },
      { id: "ceiling_fans", label: "Ceiling Fans" },
      { id: "fireplace", label: "Fireplace" },
      { id: "balcony", label: "Balcony/Terrace" },
      { id: "tiled_floors", label: "Tiled Floors" },
      { id: "wooden_floors", label: "Wooden/Laminate Floors" },
      { id: "ensuite", label: "En-suite Bathroom" },
      { id: "guest_toilet", label: "Guest Toilet" },
      { id: "dsq", label: "DSQ (Staff Quarter)" },
    ],
  },
  kitchen: {
    title: "Kitchen",
    icon: "chef-hat",
    amenities: [
      { id: "gas_allowed", label: "Gas Cooker Allowed" },
      { id: "gas_piped", label: "Piped Gas" },
      { id: "kitchen_cabinets", label: "Kitchen Cabinets" },
      { id: "granite_counters", label: "Granite Countertops" },
    ],
  },
  building: {
    title: "Building/Compound",
    icon: "trees",
    amenities: [
      { id: "swimming_pool", label: "Swimming Pool" },
      { id: "gym", label: "Gym/Fitness Center" },
      { id: "garden", label: "Garden/Lawn" },
      { id: "playground", label: "Children's Playground" },
      { id: "rooftop", label: "Rooftop Access" },
      { id: "elevator", label: "Lift/Elevator" },
      { id: "laundry_room", label: "Laundry Room" },
      { id: "storage", label: "Storage Room" },
      { id: "bbq_area", label: "BBQ Area" },
      { id: "clubhouse", label: "Clubhouse" },
    ],
  },
} as const;

// =============================================================================
// NAIROBI NEIGHBORHOODS
// =============================================================================

export const NAIROBI_AREAS = {
  "high-end": {
    label: "High-End",
    areas: [
      { id: "karen", name: "Karen" },
      { id: "runda", name: "Runda" },
      { id: "muthaiga", name: "Muthaiga" },
      { id: "kitisuru", name: "Kitisuru" },
      { id: "nyari", name: "Nyari" },
      { id: "rosslyn", name: "Rosslyn" },
      { id: "gigiri", name: "Gigiri" },
    ],
  },
  "upper-middle": {
    label: "Upper-Middle",
    areas: [
      { id: "kilimani", name: "Kilimani" },
      { id: "kileleshwa", name: "Kileleshwa" },
      { id: "lavington", name: "Lavington" },
      { id: "westlands", name: "Westlands" },
      { id: "parklands", name: "Parklands" },
      { id: "spring-valley", name: "Spring Valley" },
      { id: "riverside", name: "Riverside" },
      { id: "loresho", name: "Loresho" },
    ],
  },
  "middle": {
    label: "Middle",
    areas: [
      { id: "south-b", name: "South B" },
      { id: "south-c", name: "South C" },
      { id: "langata", name: "Langata" },
      { id: "ngumo", name: "Ngumo" },
      { id: "hurlingham", name: "Hurlingham" },
      { id: "nairobi-west", name: "Nairobi West" },
      { id: "madaraka", name: "Madaraka" },
      { id: "nyayo-estate", name: "Nyayo Estate" },
    ],
  },
  "affordable": {
    label: "Affordable",
    areas: [
      { id: "eastleigh", name: "Eastleigh" },
      { id: "roysambu", name: "Roysambu" },
      { id: "kasarani", name: "Kasarani" },
      { id: "kahawa", name: "Kahawa" },
      { id: "zimmerman", name: "Zimmerman" },
      { id: "githurai", name: "Githurai" },
      { id: "ruaka", name: "Ruaka" },
      { id: "ruiru", name: "Ruiru" },
    ],
  },
  "budget": {
    label: "Budget",
    areas: [
      { id: "pipeline", name: "Pipeline" },
      { id: "umoja", name: "Umoja" },
      { id: "donholm", name: "Donholm" },
      { id: "buruburu", name: "Buruburu" },
      { id: "kayole", name: "Kayole" },
      { id: "embakasi", name: "Embakasi" },
      { id: "komarock", name: "Komarock" },
      { id: "utawala", name: "Utawala" },
    ],
  },
} as const;

// =============================================================================
// FORM DATA INTERFACES
// =============================================================================

export interface PropertyPhoto {
  id: string;
  file?: File;
  preview: string;
  url?: string;
  path?: string;
  thumbnailUrl?: string;
  sortOrder?: number;
  isCover?: boolean;
  category?: string;
  caption?: string;
  isUploading?: boolean;
  uploadProgress?: number;
}

export interface CustomFee {
  id: string;
  name: string;
  amount: number;
  amountType: "fixed" | "percentage"; // percentage = % of rent
  frequency: "monthly" | "once";
}

export interface PropertyFormData {
  // Listing Category (Residential or Commercial)
  listingCategory: ListingCategory;
  
  // Step 1: Property Type (Residential)
  propertyType: PropertyType | null;
  
  // Step 2: Location
  buildingName: string;
  address: string;
  streetAddress: string;
  latitude: number | null;
  longitude: number | null;
  area: string;
  city: string;
  unitNumber: string;
  hideExactAddress: boolean;
  landmarks: string; // NEW: Nearby landmarks for easier identification
  plotNumber: string; // NEW: LR/Plot number for legal reference
  
  // Step 3: Details
  bedrooms: number;
  bathrooms: number;
  sizeSqft: number | null;
  sizeUnit: "sqft" | "sqm";
  floorLevel: string;
  totalFloors: number | null;
  yearBuilt: number | null;
  condition: PropertyCondition | null;
  lastRenovated: number | null;
  furnishing: FurnishingType;
  
  // Step 4: Amenities
  amenities: string[];
  parking: ParkingType;
  parkingSpaces: number;
  parkingType: string[];
  visitorParking: boolean;
  kitchenType: KitchenType;
  
  // Enhanced Policies (replacing simple booleans)
  petPolicy: PetPolicyType;
  smokingPolicy: SmokingPolicyType;
  airbnbAllowed: boolean;
  partyFriendly: boolean;
  
  // Enhanced Security Features
  securityGuard: SecurityGuardType;
  cctv: CCTVType;
  accessControl: AccessControlType;
  
  // Enhanced Water & Power
  waterReliability: WaterReliabilityType;
  hasWaterStorage: boolean;
  backupPower: BackupPowerType;
  
  // Internet/ISP Availability
  internetReady: boolean;
  availableIsps: string[];
  
  // Legacy fields (kept for backward compatibility)
  petsAllowed: boolean;
  smokingAllowed: boolean;
  petsPolicy: PolicyType;
  
  // Step 5: Photos
  photos: PropertyPhoto[];
  videoUrl: string;
  
  // Step 6: Pricing
  rentAmount: number | null;
  currency: string;
  rentNegotiable: boolean;
  depositMonths: number;
  depositAmount: number | null;
  agentFee: number | null;
  agentFeeType: "fixed" | "percentage";
  serviceCharge: number | null;
  customFees: CustomFee[];
  leaseTerm: LeaseTermType;
  minLeaseDuration: number;
  minLeaseMonths: number;
  paymentFrequency: PaymentFrequency;
  paymentMethods: string[];
  rentDueDay: number;
  availableFrom: string | null;
  availableNow: boolean;
  currentStatus: "vacant" | "occupied";
  rentIncludes: string[];
  acceptsMpesa: boolean;
  acceptsBank: boolean;
  acceptsCash: boolean;
  
  // Step 7: Description
  title: string;
  description: string;
  termsAccepted: boolean;
  
  // Commercial-specific fields (merged from CommercialFormData)
  commercialType: CommercialType | null;
  commercialSubtype: CommercialSubtype | null;
  commercial: CommercialFormData;
}

// =============================================================================
// WIZARD STATE
// =============================================================================

export interface StepValidation {
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export interface WizardState {
  currentStep: number;
  highestStepReached: number;
  totalSteps: number;
  formData: PropertyFormData;
  validation: Record<number, StepValidation>;
  isDirty: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  lastSaved: Date | null;
  draftId: string | null;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_FORM_DATA: PropertyFormData = {
  // Listing Category
  listingCategory: "residential",
  
  // Step 1
  propertyType: null,
  
  // Step 2
  buildingName: "",
  address: "",
  streetAddress: "",
  latitude: null,
  longitude: null,
  area: "",
  city: "Nairobi",
  unitNumber: "",
  hideExactAddress: false,
  landmarks: "",
  plotNumber: "",
  
  // Step 3
  bedrooms: 3, // Default for townhouse
  bathrooms: 2,
  sizeSqft: null,
  sizeUnit: "sqft",
  floorLevel: "",
  totalFloors: null,
  yearBuilt: null,
  condition: null,
  lastRenovated: null,
  furnishing: "unfurnished",
  
  // Step 4
  amenities: [],
  parking: "none",
  parkingSpaces: 1,
  parkingType: [],
  visitorParking: false,
  kitchenType: "full",
  
  // Enhanced Policies
  petPolicy: "not_allowed",
  smokingPolicy: "not_allowed",
  airbnbAllowed: false,
  partyFriendly: false,
  
  // Enhanced Security
  securityGuard: "none",
  cctv: "none",
  accessControl: "none",
  
  // Enhanced Water & Power
  waterReliability: "24_7",
  hasWaterStorage: false,
  backupPower: "none",
  
  // Internet
  internetReady: false,
  availableIsps: [],
  
  // Legacy (backward compatibility)
  petsAllowed: false,
  smokingAllowed: false,
  petsPolicy: "not_allowed",
  
  // Step 5
  photos: [],
  videoUrl: "",
  
  // Step 6
  rentAmount: null,
  currency: "KES",
  rentNegotiable: false,
  depositMonths: 2,
  depositAmount: null,
  agentFee: null,
  agentFeeType: "fixed",
  serviceCharge: null,
  customFees: [],
  leaseTerm: "fixed",
  minLeaseDuration: 12,
  minLeaseMonths: 12,
  paymentFrequency: "monthly",
  paymentMethods: ["mpesa"],
  rentDueDay: 5,
  availableFrom: null,
  availableNow: true,
  currentStatus: "vacant",
  rentIncludes: [],
  acceptsMpesa: true,
  acceptsBank: true,
  acceptsCash: false,
  
  // Step 7
  title: "",
  description: "",
  termsAccepted: false,
  
  // Commercial fields
  commercialType: null,
  commercialSubtype: null,
  commercial: DEFAULT_COMMERCIAL_FORM_DATA,
};

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

export const WIZARD_STEPS = [
  { id: 1, title: "What are you listing?", shortTitle: "Type", nextLabel: "Continue" },
  { id: 2, title: "Where is it located?", shortTitle: "Location", nextLabel: "Continue" },
  { id: 3, title: "Tell us about the unit", shortTitle: "Details", nextLabel: "Continue" },
  { id: 4, title: "What's included?", shortTitle: "Amenities", nextLabel: "Continue" },
  { id: 5, title: "Add photos", shortTitle: "Photos", nextLabel: "Continue" },
  { id: 6, title: "Set your price", shortTitle: "Pricing", nextLabel: "Continue" },
  { id: 7, title: "Review & publish", shortTitle: "Review", nextLabel: "Publish Listing" },
] as const;

export const TOTAL_STEPS = WIZARD_STEPS.length;
