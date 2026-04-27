/**
 * Required Fields Configuration
 * 
 * Defines which fields are required for each commercial type and subtype.
 * This enables:
 * - Consistent validation across the application
 * - Dynamic form field indicators
 * - Clear user guidance on what's needed to publish
 */

import type { CommercialType, CommercialSubtype, CommercialFormData } from "./commercial-types";

// =============================================================================
// TYPES
// =============================================================================

export type RequiredFieldKey = keyof CommercialFormData;

export interface RequiredFieldConfig {
  /** Field key */
  field: RequiredFieldKey;
  /** Human-readable label */
  label: string;
  /** Validation function - returns error message or null if valid */
  validate: (value: unknown, formData: CommercialFormData) => string | null;
  /** Conditional: only required when this returns true */
  when?: (formData: CommercialFormData) => boolean;
}

export interface TypeRequirements {
  /** Base required fields for this type */
  base: RequiredFieldConfig[];
  /** Additional fields required for specific subtypes */
  subtypes?: Partial<Record<CommercialSubtype, RequiredFieldConfig[]>>;
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

const notEmpty = (label: string) => (value: unknown): string | null => {
  if (value === null || value === undefined || value === "") {
    return `${label} is required`;
  }
  return null;
};

const positiveNumber = (label: string) => (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return `${label} is required`;
  }
  if (typeof value !== "number" || value <= 0) {
    return `${label} must be greater than 0`;
  }
  return null;
};

const nonNegativeNumber = (label: string) => (value: unknown): string | null => {
  if (value === null || value === undefined) {
    return `${label} is required`;
  }
  if (typeof value !== "number" || value < 0) {
    return `${label} cannot be negative`;
  }
  return null;
};

const validOption = (label: string, options: readonly string[]) => (value: unknown): string | null => {
  if (!value || !options.includes(value as string)) {
    return `Please select a ${label.toLowerCase()}`;
  }
  return null;
};

// =============================================================================
// COMMON REQUIRED FIELDS
// =============================================================================

/** Fields required for all area-based commercial properties */
const SIZE_REQUIRED: RequiredFieldConfig = {
  field: "sizeSqm",
  label: "Size (sqm)",
  validate: positiveNumber("Size"),
};

const FITOUT_REQUIRED: RequiredFieldConfig = {
  field: "fitoutLevel",
  label: "Fit-out Level",
  validate: validOption("Fit-out Level", ["shell", "semi_fitted", "fitted", "furnished"]),
};

// =============================================================================
// OFFICE REQUIRED FIELDS
// =============================================================================

const OFFICE_REQUIREMENTS: TypeRequirements = {
  base: [
    SIZE_REQUIRED,
    FITOUT_REQUIRED,
    {
      field: "layoutType",
      label: "Layout Type",
      validate: validOption("Layout Type", ["open_plan", "cellular", "hybrid", "coworking"]),
    },
  ],
  subtypes: {
    coworking_desk: [
      {
        field: "workstationCapacity",
        label: "Available Desks",
        validate: positiveNumber("Number of desks"),
      },
    ],
    coworking_private: [
      {
        field: "workstationCapacity",
        label: "Capacity",
        validate: positiveNumber("Room capacity"),
      },
    ],
    serviced_office: [
      {
        field: "workstationCapacity",
        label: "Workstation Capacity",
        validate: positiveNumber("Workstation capacity"),
      },
    ],
    virtual_office: [
      // Virtual office has minimal physical requirements
    ],
  },
};

// =============================================================================
// RETAIL REQUIRED FIELDS
// =============================================================================

const RETAIL_REQUIREMENTS: TypeRequirements = {
  base: [
    SIZE_REQUIRED,
    FITOUT_REQUIRED,
    {
      field: "footTraffic",
      label: "Foot Traffic",
      validate: validOption("Foot Traffic Level", ["low", "medium", "high", "very_high"]),
    },
  ],
  subtypes: {
    street_front: [
      {
        field: "frontageWidthM",
        label: "Frontage Width",
        validate: positiveNumber("Frontage width"),
      },
    ],
    mall_unit: [
      {
        field: "mallName",
        label: "Mall Name",
        validate: notEmpty("Mall name"),
      },
    ],
    showroom: [
      {
        field: "frontageWidthM",
        label: "Frontage Width",
        validate: positiveNumber("Frontage width"),
      },
    ],
    kiosk: [
      // Smaller spaces, size is enough
    ],
    market_stall: [
      // Minimal requirements
    ],
  },
};

// =============================================================================
// FOOD & BEVERAGE REQUIRED FIELDS
// =============================================================================

const FOOD_BEVERAGE_REQUIREMENTS: TypeRequirements = {
  base: [
    SIZE_REQUIRED,
    FITOUT_REQUIRED,
    {
      field: "seatingCapacity",
      label: "Seating Capacity",
      validate: positiveNumber("Seating capacity"),
    },
    {
      field: "kitchenAreaSqm",
      label: "Kitchen Area",
      validate: positiveNumber("Kitchen area"),
    },
  ],
  subtypes: {
    restaurant_space: [
      {
        field: "exhaustSystem",
        label: "Exhaust System",
        validate: (value) => value === true ? null : "Exhaust system is required for restaurants",
      },
    ],
    bar_lounge: [
      {
        field: "liquorLicenseEligible",
        label: "Liquor License Eligibility",
        validate: () => null, // Must confirm, but can be false
      },
    ],
    cloud_kitchen: [
      {
        field: "deliveryReady",
        label: "Delivery Setup",
        validate: () => null, // Not strictly required but important
      },
    ],
    cafe_space: [],
    fast_food: [],
    food_court: [],
    bakery_space: [
      {
        field: "gasConnection",
        label: "Gas Connection",
        validate: () => null, // Important but not strictly required
      },
    ],
  },
};

// =============================================================================
// WAREHOUSE REQUIRED FIELDS
// =============================================================================

const WAREHOUSE_REQUIREMENTS: TypeRequirements = {
  base: [
    {
      field: "warehouseAreaSqm",
      label: "Warehouse Area",
      validate: positiveNumber("Warehouse area"),
    },
    {
      field: "clearHeightM",
      label: "Clear Height",
      validate: positiveNumber("Clear height"),
    },
  ],
  subtypes: {
    cold_storage: [
      {
        field: "coldStorage",
        label: "Cold Storage",
        validate: (value) => value === true ? null : "Must confirm cold storage capability",
      },
      {
        field: "coldStorageTempRange",
        label: "Temperature Range",
        validate: notEmpty("Temperature range"),
      },
    ],
    fulfillment_center: [
      {
        field: "loadingDocks",
        label: "Loading Docks",
        validate: positiveNumber("Number of loading docks"),
      },
    ],
    distribution: [
      {
        field: "loadingDocks",
        label: "Loading Docks",
        validate: nonNegativeNumber("Number of loading docks"),
      },
    ],
    heavy_industrial: [
      {
        field: "floorLoadCapacity",
        label: "Floor Load Capacity",
        validate: positiveNumber("Floor load capacity"),
      },
    ],
  },
};

// =============================================================================
// AUTOMOTIVE REQUIRED FIELDS
// =============================================================================

const AUTOMOTIVE_REQUIREMENTS: TypeRequirements = {
  base: [
    SIZE_REQUIRED,
  ],
  subtypes: {
    parking_lot: [
      {
        field: "parkingSpacesCount",
        label: "Parking Spaces",
        validate: positiveNumber("Number of parking spaces"),
      },
    ],
    parking_building: [
      {
        field: "parkingSpacesCount",
        label: "Parking Spaces",
        validate: positiveNumber("Number of parking spaces"),
      },
      {
        field: "floorLevel",
        label: "Number of Floors",
        validate: notEmpty("Number of floors"),
      },
    ],
    garage_workshop: [
      {
        field: "workBays",
        label: "Work Bays",
        validate: positiveNumber("Number of work bays"),
      },
    ],
    car_wash: [
      {
        field: "carWashType",
        label: "Car Wash Type",
        validate: validOption("Car wash type", ["manual", "automatic", "self_service", "touchless"]),
      },
    ],
    petrol_station: [
      {
        field: "pumpIslands",
        label: "Pump Islands",
        validate: positiveNumber("Number of pump islands"),
      },
    ],
    car_showroom: [
      {
        field: "frontageWidthM",
        label: "Frontage Width",
        validate: positiveNumber("Frontage width"),
      },
    ],
  },
};

// =============================================================================
// COMMERCIAL LAND REQUIRED FIELDS
// =============================================================================

const COMMERCIAL_LAND_REQUIREMENTS: TypeRequirements = {
  base: [
    {
      field: "plotSizeSqm",
      label: "Plot Size",
      validate: positiveNumber("Plot size"),
    },
    {
      field: "zoningType",
      label: "Zoning Type",
      validate: validOption("Zoning type", ["commercial", "industrial", "mixed_use", "special_economic"]),
    },
  ],
  subtypes: {
    billboard_site: [
      {
        field: "billboardSize",
        label: "Billboard Size",
        validate: notEmpty("Billboard size"),
      },
      {
        field: "billboardFacing",
        label: "Billboard Facing",
        validate: notEmpty("Billboard facing direction"),
      },
      {
        field: "dailyImpressions",
        label: "Daily Impressions",
        validate: positiveNumber("Estimated daily impressions"),
      },
    ],
    development_plot: [
      {
        field: "maxPlotRatio",
        label: "Max Plot Ratio",
        validate: positiveNumber("Maximum plot ratio"),
      },
    ],
    storage_yard: [
      {
        field: "isFenced",
        label: "Fenced",
        validate: () => null, // Optional but recommended
      },
    ],
  },
};

// =============================================================================
// HOSPITALITY REQUIRED FIELDS
// =============================================================================

const HOSPITALITY_REQUIREMENTS: TypeRequirements = {
  base: [
    SIZE_REQUIRED,
  ],
  subtypes: {
    hotel_building: [
      {
        field: "roomCount",
        label: "Room Count",
        validate: positiveNumber("Number of rooms"),
      },
      {
        field: "starRating",
        label: "Star Rating",
        validate: validOption("Star rating", ["1", "2", "3", "4", "5"]),
      },
    ],
    guest_house: [
      {
        field: "roomCount",
        label: "Room Count",
        validate: positiveNumber("Number of rooms"),
      },
      {
        field: "bedCount",
        label: "Bed Count",
        validate: positiveNumber("Number of beds"),
      },
    ],
    serviced_apartment: [
      {
        field: "roomCount",
        label: "Number of Units",
        validate: positiveNumber("Number of units"),
      },
    ],
    hostel: [
      {
        field: "bedCount",
        label: "Bed Count",
        validate: positiveNumber("Number of beds"),
      },
    ],
    event_venue: [
      {
        field: "eventCapacitySeated",
        label: "Seated Capacity",
        validate: positiveNumber("Seated capacity"),
      },
    ],
    conference_center: [
      {
        field: "conferenceCapacity",
        label: "Conference Capacity",
        validate: positiveNumber("Conference capacity"),
      },
    ],
    wedding_venue: [
      {
        field: "eventCapacitySeated",
        label: "Guest Capacity",
        validate: positiveNumber("Guest capacity"),
      },
    ],
  },
};

// =============================================================================
// HEALTHCARE REQUIRED FIELDS
// =============================================================================

const HEALTHCARE_REQUIREMENTS: TypeRequirements = {
  base: [
    SIZE_REQUIRED,
    {
      field: "consultationRooms",
      label: "Consultation Rooms",
      validate: positiveNumber("Number of consultation rooms"),
    },
    {
      field: "wheelchairAccessible",
      label: "Wheelchair Accessible",
      validate: () => null, // Required awareness, not value
    },
  ],
  subtypes: {
    dental_clinic: [
      {
        field: "dentalChairPlumbing",
        label: "Dental Chair Plumbing",
        validate: (value) => value === true ? null : "Dental chair plumbing is required",
      },
      {
        field: "treatmentRooms",
        label: "Treatment Rooms",
        validate: positiveNumber("Number of treatment rooms"),
      },
    ],
    lab_space: [
      {
        field: "hasLabLicense",
        label: "Lab License",
        validate: () => null, // Must confirm awareness
      },
    ],
    pharmacy_space: [
      {
        field: "hasPharmacyLicense",
        label: "Pharmacy License Eligible",
        validate: () => null, // Must confirm awareness
      },
    ],
    hospital_building: [
      {
        field: "treatmentRooms",
        label: "Treatment Rooms",
        validate: positiveNumber("Number of treatment rooms"),
      },
      {
        field: "backupPowerMedical",
        label: "Backup Power",
        validate: (value) => value === true ? null : "Backup power is required for hospitals",
      },
    ],
  },
};

// =============================================================================
// EDUCATIONAL REQUIRED FIELDS
// =============================================================================

const EDUCATIONAL_REQUIREMENTS: TypeRequirements = {
  base: [
    SIZE_REQUIRED,
    {
      field: "classroomCount",
      label: "Classroom Count",
      validate: positiveNumber("Number of classrooms"),
    },
    {
      field: "totalStudentCapacity",
      label: "Student Capacity",
      validate: positiveNumber("Total student capacity"),
    },
  ],
  subtypes: {
    school_building: [
      {
        field: "hasPlayground",
        label: "Playground",
        validate: () => null, // Important but optional
      },
    ],
    daycare_space: [
      {
        field: "hasPlayground",
        label: "Play Area",
        validate: (value) => value === true ? null : "Play area is required for daycare",
      },
    ],
    training_center: [
      {
        field: "classroomCapacity",
        label: "Room Capacity",
        validate: positiveNumber("Classroom capacity"),
      },
    ],
  },
};

// =============================================================================
// SPECIALIZED REQUIRED FIELDS
// =============================================================================

const SPECIALIZED_REQUIREMENTS: TypeRequirements = {
  base: [
    SIZE_REQUIRED,
  ],
  subtypes: {
    data_center: [
      {
        field: "rackCapacity",
        label: "Rack Capacity",
        validate: positiveNumber("Rack capacity"),
      },
      {
        field: "powerCapacityKva",
        label: "Power Capacity",
        validate: positiveNumber("Power capacity (KVA)"),
      },
      {
        field: "uptimeTier",
        label: "Uptime Tier",
        validate: validOption("Uptime tier", ["tier_1", "tier_2", "tier_3", "tier_4"]),
      },
      {
        field: "coolingType",
        label: "Cooling Type",
        validate: notEmpty("Cooling type"),
      },
    ],
    recording_studio: [
      {
        field: "soundproofing",
        label: "Soundproofing",
        validate: (value) => value === true ? null : "Soundproofing is essential for recording studios",
      },
      {
        field: "studioRoomCount",
        label: "Studio Rooms",
        validate: positiveNumber("Number of studio rooms"),
      },
    ],
    photo_studio: [
      {
        field: "ceilingHeightStudios",
        label: "Ceiling Height",
        validate: positiveNumber("Ceiling height"),
      },
      {
        field: "blackoutCapability",
        label: "Blackout Capability",
        validate: (value) => value === true ? null : "Blackout capability is required for photo studios",
      },
    ],
    gym_fitness: [
      {
        field: "gymFloorSqm",
        label: "Gym Floor Area",
        validate: positiveNumber("Gym floor area"),
      },
      {
        field: "showerCount",
        label: "Showers",
        validate: positiveNumber("Number of showers"),
      },
      {
        field: "lockerRooms",
        label: "Locker Rooms",
        validate: positiveNumber("Number of locker rooms"),
      },
    ],
    salon_spa: [
      {
        field: "stylingStations",
        label: "Styling Stations",
        validate: positiveNumber("Number of styling stations"),
      },
      {
        field: "washBasins",
        label: "Wash Basins",
        validate: positiveNumber("Number of wash basins"),
      },
      {
        field: "ventilationForChemicals",
        label: "Ventilation System",
        validate: (value) => value === true ? null : "Proper ventilation is required for salons",
      },
    ],
    religious_facility: [
      {
        field: "worshipHallCapacity",
        label: "Worship Hall Capacity",
        validate: positiveNumber("Worship hall capacity"),
      },
      {
        field: "prayerHallSqm",
        label: "Prayer Hall Size",
        validate: positiveNumber("Prayer hall size"),
      },
    ],
    bank_branch: [
      {
        field: "customerServiceArea",
        label: "Customer Service Area",
        validate: positiveNumber("Customer service area"),
      },
      {
        field: "tellerCounterPositions",
        label: "Teller Positions",
        validate: positiveNumber("Number of teller positions"),
      },
      {
        field: "vaultRoom",
        label: "Vault Room",
        validate: (value) => value === true ? null : "Vault room is required for bank branches",
      },
      {
        field: "securityControlRoom",
        label: "Security Control Room",
        validate: (value) => value === true ? null : "Security control room is required",
      },
    ],
    atm_site: [
      {
        field: "atmBoothSecure",
        label: "Secure ATM Booth",
        validate: (value) => value === true ? null : "Secure ATM booth is required",
      },
      {
        field: "powerBackup24h",
        label: "24h Power Backup",
        validate: (value) => value === true ? null : "24-hour power backup is required for ATMs",
      },
      {
        field: "cctvCoverage",
        label: "CCTV Coverage",
        validate: (value) => value === true ? null : "CCTV coverage is required for ATM sites",
      },
      {
        field: "footTrafficLevel",
        label: "Foot Traffic Level",
        validate: validOption("Foot traffic level", ["low", "medium", "high", "very_high"]),
      },
    ],
  },
};

// =============================================================================
// MAIN CONFIGURATION MAP
// =============================================================================

export const REQUIRED_FIELDS_CONFIG: Record<CommercialType, TypeRequirements> = {
  office: OFFICE_REQUIREMENTS,
  retail: RETAIL_REQUIREMENTS,
  food_beverage: FOOD_BEVERAGE_REQUIREMENTS,
  warehouse: WAREHOUSE_REQUIREMENTS,
  automotive: AUTOMOTIVE_REQUIREMENTS,
  commercial_land: COMMERCIAL_LAND_REQUIREMENTS,
  hospitality: HOSPITALITY_REQUIREMENTS,
  healthcare: HEALTHCARE_REQUIREMENTS,
  educational: EDUCATIONAL_REQUIREMENTS,
  specialized: SPECIALIZED_REQUIREMENTS,
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get all required fields for a commercial type and subtype
 */
export function getRequiredFields(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): RequiredFieldConfig[] {
  if (!type) return [];

  const config = REQUIRED_FIELDS_CONFIG[type];
  if (!config) return [];

  // Start with base requirements
  const fields = [...config.base];

  // Add subtype-specific requirements
  if (subtype && config.subtypes?.[subtype]) {
    fields.push(...config.subtypes[subtype]!);
  }

  return fields;
}

/**
 * Check if a specific field is required for a type/subtype
 */
export function isFieldRequired(
  field: RequiredFieldKey,
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): boolean {
  const requiredFields = getRequiredFields(type, subtype);
  return requiredFields.some((f) => f.field === field);
}

/**
 * Validate all required fields and return errors
 */
export function validateRequiredFields(
  formData: CommercialFormData,
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): Record<string, string> {
  const errors: Record<string, string> = {};
  const requiredFields = getRequiredFields(type, subtype);

  for (const fieldConfig of requiredFields) {
    // Check conditional requirement
    if (fieldConfig.when && !fieldConfig.when(formData)) {
      continue;
    }

    const value = formData[fieldConfig.field];
    const error = fieldConfig.validate(value, formData);

    if (error) {
      errors[fieldConfig.field] = error;
    }
  }

  return errors;
}

/**
 * Get human-readable list of missing required fields
 */
export function getMissingRequiredFields(
  formData: CommercialFormData,
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): string[] {
  const errors = validateRequiredFields(formData, type, subtype);
  return Object.values(errors);
}

/**
 * Check if all required fields are filled
 */
export function areRequiredFieldsComplete(
  formData: CommercialFormData,
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): boolean {
  const errors = validateRequiredFields(formData, type, subtype);
  return Object.keys(errors).length === 0;
}

// =============================================================================
// PRICING REQUIRED FIELDS
// =============================================================================

export interface PricingRequiredFields {
  rentPerSqm: boolean;
  rentAmount: boolean;
  revenueSharePercent: boolean;
  serviceChargeMonthly: boolean;
  depositMonthsCommercial: boolean;
  minLeaseMonths: boolean;
}

/**
 * Get required pricing fields based on pricing model
 */
export function getPricingRequiredFields(
  pricingModel: string
): PricingRequiredFields {
  const base = {
    rentPerSqm: false,
    rentAmount: false,
    revenueSharePercent: false,
    serviceChargeMonthly: false,
    depositMonthsCommercial: true,
    minLeaseMonths: true,
  };

  switch (pricingModel) {
    case "per_sqm":
      return { ...base, rentPerSqm: true };
    case "fixed":
    case "per_unit":
      return { ...base, rentAmount: true };
    case "revenue_share":
      return { ...base, revenueSharePercent: true };
    default:
      return base;
  }
}
