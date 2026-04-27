/**
 * Building Wizard Types
 * 
 * Comprehensive type definitions for the building creation flow.
 * These types ensure type safety across all wizard steps.
 */

// =============================================================================
// ENUMS & CONSTANTS
// =============================================================================

export const BUILDING_TYPES = [
  { id: "apartment", label: "Apartment Building", icon: "building", description: "Multi-story building with individual units" },
  { id: "flat_block", label: "Flat Block", icon: "building2", description: "Smaller apartment building (4-20 units)" },
  { id: "townhouse_complex", label: "Townhouse Complex", icon: "warehouse", description: "Multiple townhouses in gated compound" },
  { id: "gated_community", label: "Gated Community", icon: "shield", description: "Large development with multiple buildings" },
  { id: "student_hostel", label: "Student Hostel", icon: "users", description: "Dormitory-style accommodation" },
  { id: "mixed_use", label: "Mixed-Use Building", icon: "store", description: "Ground floor commercial, upper residential" },
  { id: "other", label: "Other", icon: "more-horizontal", description: "Other multi-unit property" },
] as const;

export type BuildingType = typeof BUILDING_TYPES[number]["id"];

export const MANAGEMENT_TYPES = [
  { id: "self", label: "Self-Managed", description: "You manage the building directly" },
  { id: "caretaker", label: "Caretaker", description: "On-site caretaker handles day-to-day" },
  { id: "property_manager", label: "Property Manager", description: "Professional management company" },
] as const;

export type ManagementType = typeof MANAGEMENT_TYPES[number]["id"];

// Security options
export const SECURITY_GUARD_OPTIONS = [
  { id: "none", label: "None" },
  { id: "daytime", label: "Daytime Only" },
  { id: "24_hour", label: "24-Hour Security" },
] as const;

export const CCTV_OPTIONS = [
  { id: "none", label: "None" },
  { id: "entry_only", label: "Entry Points Only" },
  { id: "full", label: "Full Coverage" },
] as const;

export const ACCESS_CONTROL_OPTIONS = [
  { id: "none", label: "None" },
  { id: "key", label: "Key Only" },
  { id: "card", label: "Access Card" },
  { id: "biometric", label: "Biometric" },
] as const;

// Water & Power options
export const WATER_SOURCE_OPTIONS = [
  { id: "county", label: "County Water Only" },
  { id: "borehole", label: "Borehole Only" },
  { id: "both", label: "Both (County + Borehole)" },
] as const;

export const WATER_STORAGE_OPTIONS = [
  { id: "none", label: "None" },
  { id: "tank", label: "Single Tank" },
  { id: "multiple_tanks", label: "Multiple Tanks" },
] as const;

export const WATER_RELIABILITY_OPTIONS = [
  { id: "rationed", label: "Rationed Schedule" },
  { id: "24_7", label: "24/7 Supply" },
] as const;

export const GENERATOR_OPTIONS = [
  { id: "none", label: "None" },
  { id: "common_areas", label: "Common Areas Only" },
  { id: "full", label: "Full Backup" },
] as const;

export const GENERATOR_FUEL_OPTIONS = [
  { id: "shared", label: "Shared Cost" },
  { id: "included", label: "Included in Rent" },
] as const;

export const SOLAR_OPTIONS = [
  { id: "none", label: "None" },
  { id: "lighting", label: "Common Area Lighting" },
  { id: "water_heating", label: "Water Heating" },
  { id: "partial", label: "Partial Building Power" },
] as const;

// Parking options
export const PARKING_TYPE_OPTIONS = [
  { id: "none", label: "No Parking" },
  { id: "open", label: "Open Parking" },
  { id: "covered", label: "Covered Parking" },
  { id: "basement", label: "Basement Parking" },
] as const;

export const PARKING_ALLOCATION_OPTIONS = [
  { id: "per_unit", label: "Per Unit (Dedicated)" },
  { id: "shared", label: "Shared Pool" },
  { id: "first_come", label: "First-Come Basis" },
] as const;

// Services options
export const GARBAGE_OPTIONS = [
  { id: "county", label: "County Collection" },
  { id: "private", label: "Private Contractor" },
  { id: "building", label: "Building Staff" },
] as const;

export const GAS_OPTIONS = [
  { id: "none", label: "None" },
  { id: "cylinder", label: "Cylinder Points" },
  { id: "piped", label: "Piped Gas" },
] as const;

// Policy options
export const PET_POLICY_OPTIONS = [
  { id: "no", label: "Not Allowed" },
  { id: "small_only", label: "Small Pets Only" },
  { id: "all", label: "All Pets Allowed" },
  { id: "case_by_case", label: "Case by Case" },
] as const;

export const SMOKING_POLICY_OPTIONS = [
  { id: "allowed", label: "Allowed" },
  { id: "balcony_only", label: "Balcony/Outdoor Only" },
  { id: "not_allowed", label: "Not Allowed" },
] as const;

export const BUSINESS_POLICY_OPTIONS = [
  { id: "allowed", label: "Allowed" },
  { id: "not_allowed", label: "Not Allowed" },
  { id: "approval_needed", label: "With Approval" },
] as const;

// ISP options for Kenya
export const ISP_OPTIONS = [
  { id: "safaricom", label: "Safaricom Home Fibre" },
  { id: "zuku", label: "Zuku" },
  { id: "jtl", label: "JTL" },
  { id: "faiba", label: "Faiba" },
  { id: "airtel", label: "Airtel" },
  { id: "liquid", label: "Liquid Telecom" },
  { id: "other", label: "Other" },
] as const;

// Service charge includes options
export const SERVICE_CHARGE_INCLUDES_OPTIONS = [
  { id: "security", label: "Security" },
  { id: "cleaning", label: "Common Area Cleaning" },
  { id: "garbage", label: "Garbage Collection" },
  { id: "water", label: "Water" },
  { id: "generator", label: "Generator Fuel" },
  { id: "lift", label: "Lift Maintenance" },
  { id: "pool", label: "Pool Maintenance" },
  { id: "gym", label: "Gym Maintenance" },
  { id: "garden", label: "Garden Maintenance" },
  { id: "repairs", label: "Minor Repairs" },
] as const;

export const TOTAL_STEPS = 5;

// =============================================================================
// FORM DATA INTERFACES
// =============================================================================

export interface SecurityFeatures {
  perimeter_wall: boolean;
  electric_fence: boolean;
  security_guards: "none" | "daytime" | "24_hour";
  cctv: "none" | "entry_only" | "full";
  access_control: "none" | "key" | "card" | "biometric";
  intercom: boolean;
  boom_barrier: boolean;
}

export interface WaterPowerFeatures {
  water_source: "county" | "borehole" | "both";
  water_storage: "none" | "tank" | "multiple_tanks";
  water_capacity_liters?: number;
  water_reliability: "rationed" | "24_7";
  backup_generator: "none" | "common_areas" | "full";
  generator_fuel?: "shared" | "included";
  solar: "none" | "lighting" | "water_heating" | "partial";
}

export interface ParkingFeatures {
  type: "none" | "open" | "covered" | "basement";
  allocation: "per_unit" | "shared" | "first_come";
  total_spaces?: number;
  visitor_spaces?: number;
  motorcycle: boolean;
  ev_charging: boolean;
}

export interface CommonFacilities {
  lift: boolean;
  swimming_pool: boolean;
  gym: boolean;
  playground: boolean;
  garden: boolean;
  rooftop: boolean;
  bbq: boolean;
  laundry: boolean;
  clubhouse: boolean;
  staff_quarters: boolean;
}

export interface BuildingServices {
  garbage: "county" | "private" | "building";
  internet_ready: boolean;
  available_isps: string[];
  gas: "none" | "cylinder" | "piped";
  caretaker_onsite: boolean;
}

export interface BuildingPolicies {
  pets: "no" | "small_only" | "all" | "case_by_case";
  smoking: "allowed" | "balcony_only" | "not_allowed";
  business_use: "allowed" | "not_allowed" | "approval_needed";
  airbnb: boolean;
  quiet_hours?: string;
}

export interface BankDetails {
  bank_name?: string;
  account_name?: string;
  account_number?: string;
  mpesa_paybill?: string;
  mpesa_till?: string;
  mpesa_account?: string;
}

export interface BuildingFormData {
  // Step 1: Basics
  name: string;
  building_type: BuildingType | "";
  address: string;
  area: string;
  city: string;
  latitude?: number;
  longitude?: number;
  total_floors?: number;
  total_units?: number;
  year_built?: number;
  plot_number?: string;
  landmarks?: string;
  
  // Step 2: Amenities
  security_features: SecurityFeatures;
  water_power: WaterPowerFeatures;
  parking: ParkingFeatures;
  common_facilities: CommonFacilities;
  services: BuildingServices;
  
  // Step 3: Policies
  policies: BuildingPolicies;
  access_instructions?: string;
  
  // Step 4: Photos
  photos: string[];
  cover_photo?: string;
  
  // Step 5: Financials
  service_charge?: number;
  service_charge_includes: string[];
  collection_via_mitasafi: boolean;
  bank_details: BankDetails;
  management_type: ManagementType;
}

// =============================================================================
// DEFAULT VALUES
// =============================================================================

export const DEFAULT_SECURITY_FEATURES: SecurityFeatures = {
  perimeter_wall: true,
  electric_fence: false,
  security_guards: "none",
  cctv: "none",
  access_control: "none",
  intercom: false,
  boom_barrier: false,
};

export const DEFAULT_WATER_POWER: WaterPowerFeatures = {
  water_source: "county",
  water_storage: "none",
  water_reliability: "rationed",
  backup_generator: "none",
  solar: "none",
};

export const DEFAULT_PARKING: ParkingFeatures = {
  type: "none",
  allocation: "shared",
  motorcycle: false,
  ev_charging: false,
};

export const DEFAULT_COMMON_FACILITIES: CommonFacilities = {
  lift: false,
  swimming_pool: false,
  gym: false,
  playground: false,
  garden: false,
  rooftop: false,
  bbq: false,
  laundry: false,
  clubhouse: false,
  staff_quarters: false,
};

export const DEFAULT_SERVICES: BuildingServices = {
  garbage: "county",
  internet_ready: false,
  available_isps: [],
  gas: "none",
  caretaker_onsite: false,
};

export const DEFAULT_POLICIES: BuildingPolicies = {
  pets: "no",
  smoking: "not_allowed",
  business_use: "not_allowed",
  airbnb: false,
};

export const DEFAULT_BANK_DETAILS: BankDetails = {};

export const DEFAULT_FORM_DATA: BuildingFormData = {
  // Step 1
  name: "",
  building_type: "",
  address: "",
  area: "",
  city: "Nairobi",
  
  // Step 2
  security_features: DEFAULT_SECURITY_FEATURES,
  water_power: DEFAULT_WATER_POWER,
  parking: DEFAULT_PARKING,
  common_facilities: DEFAULT_COMMON_FACILITIES,
  services: DEFAULT_SERVICES,
  
  // Step 3
  policies: DEFAULT_POLICIES,
  
  // Step 4
  photos: [],
  
  // Step 5
  service_charge_includes: [],
  collection_via_mitasafi: true,
  bank_details: DEFAULT_BANK_DETAILS,
  management_type: "self",
};

// =============================================================================
// VALIDATION TYPES
// =============================================================================

export interface StepValidation {
  isValid: boolean;
  errors: Record<string, string>;
  touched: Record<string, boolean>;
}

export interface WizardState {
  currentStep: number;
  totalSteps: number;
  formData: BuildingFormData;
  validation: Record<number, StepValidation>;
  isDirty: boolean;
  isSaving: boolean;
  isSubmitting: boolean;
  lastSaved: Date | null;
  draftId: string | null;
}

// =============================================================================
// STEP DEFINITIONS
// =============================================================================

export const WIZARD_STEPS = [
  { number: 1, title: "Basics", description: "Building name, type & location" },
  { number: 2, title: "Amenities", description: "Security, water, power, facilities" },
  { number: 3, title: "Policies", description: "Rules and regulations" },
  { number: 4, title: "Photos", description: "Building images" },
  { number: 5, title: "Financials", description: "Fees, payment collection" },
] as const;
