/**
 * Commercial Listing Flow Configuration
 * 
 * Defines which steps, fields, and amenity categories are relevant
 * for each commercial type and subtype combination.
 * 
 * This enables:
 * - Skipping irrelevant steps (e.g., billboard doesn't need amenities)
 * - Showing only relevant amenity categories
 * - Customizing pricing models per type
 * - Optimizing the user experience
 */

import type { CommercialType, CommercialSubtype } from "./commercial-types";

// =============================================================================
// STEP CONFIGURATION
// =============================================================================

export type WizardStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface StepConfig {
  /** Step number */
  step: WizardStep;
  /** Display label */
  label: string;
  /** Whether this step is required */
  required: boolean;
  /** Whether to skip this step entirely */
  skip?: boolean;
  /** Custom component to use (if different from default) */
  customComponent?: string;
}

/** Partial override for specific subtypes */
export interface SubtypeOverride {
  steps?: {
    amenities?: Partial<StepConfig>;
    pricing?: Partial<StepConfig>;
  };
  amenityCategories?: string[];
  defaultPricingModel?: "per_sqm" | "fixed" | "revenue_share" | "per_unit";
  availablePricingModels?: string[];
  photosRequired?: boolean;
  minPhotos?: number;
}

export interface CommercialFlowConfig {
  /** Commercial type */
  type: CommercialType;
  /** Subtypes that have special handling */
  specialSubtypes?: Partial<Record<CommercialSubtype, SubtypeOverride>>;
  /** Steps configuration */
  steps: {
    amenities: StepConfig;
    pricing: StepConfig;
  };
  /** Which amenity categories to show */
  amenityCategories: string[];
  /** Default pricing model */
  defaultPricingModel: "per_sqm" | "fixed" | "revenue_share" | "per_unit";
  /** Available pricing models */
  availablePricingModels: string[];
  /** Whether photos are required */
  photosRequired: boolean;
  /** Minimum photos required */
  minPhotos: number;
}

// =============================================================================
// AMENITY CATEGORIES BY RELEVANCE
// =============================================================================

/** All amenity categories */
export const ALL_AMENITY_CATEGORIES = [
  "building",
  "security", 
  "parking",
  "facilities",
  "utilities",
] as const;

/** Categories for spaces inside buildings */
export const BUILDING_AMENITY_CATEGORIES = [
  "building",
  "security",
  "parking", 
  "facilities",
  "utilities",
];

/** Categories for outdoor/land spaces */
export const LAND_AMENITY_CATEGORIES = [
  "security",
  "utilities",
];

/** Categories for minimal amenity spaces */
export const MINIMAL_AMENITY_CATEGORIES = [
  "security",
];

// =============================================================================
// FLOW CONFIGURATION BY TYPE
// =============================================================================

export const COMMERCIAL_FLOW_CONFIG: Record<CommercialType, CommercialFlowConfig> = {
  // ─────────────────────────────────────────────────────────────────────────────
  // OFFICE - Full amenities, per sqm pricing
  // ─────────────────────────────────────────────────────────────────────────────
  office: {
    type: "office",
    steps: {
      amenities: { step: 4, label: "Amenities", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: BUILDING_AMENITY_CATEGORIES,
    defaultPricingModel: "per_sqm",
    availablePricingModels: ["per_sqm", "fixed"],
    photosRequired: true,
    minPhotos: 3,
    specialSubtypes: {
      coworking_desk: {
        amenityCategories: ["facilities"], // Just shared facilities
        defaultPricingModel: "fixed",
      },
      virtual_office: {
        steps: {
          amenities: { step: 4, label: "Amenities", required: false, skip: true },
          pricing: { step: 6, label: "Pricing", required: true },
        },
        amenityCategories: [],
        defaultPricingModel: "fixed",
        minPhotos: 1,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // RETAIL - Full amenities, revenue share option
  // ─────────────────────────────────────────────────────────────────────────────
  retail: {
    type: "retail",
    steps: {
      amenities: { step: 4, label: "Amenities", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: BUILDING_AMENITY_CATEGORIES,
    defaultPricingModel: "per_sqm",
    availablePricingModels: ["per_sqm", "fixed", "revenue_share"],
    photosRequired: true,
    minPhotos: 3,
    specialSubtypes: {
      kiosk: {
        amenityCategories: MINIMAL_AMENITY_CATEGORIES,
        defaultPricingModel: "fixed",
        minPhotos: 2,
      },
      market_stall: {
        amenityCategories: MINIMAL_AMENITY_CATEGORIES,
        defaultPricingModel: "fixed",
        minPhotos: 1,
      },
      pop_up: {
        defaultPricingModel: "fixed",
        minPhotos: 2,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // FOOD & BEVERAGE - Full amenities, revenue share option
  // ─────────────────────────────────────────────────────────────────────────────
  food_beverage: {
    type: "food_beverage",
    steps: {
      amenities: { step: 4, label: "Amenities", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: BUILDING_AMENITY_CATEGORIES,
    defaultPricingModel: "per_sqm",
    availablePricingModels: ["per_sqm", "fixed", "revenue_share"],
    photosRequired: true,
    minPhotos: 4,
    specialSubtypes: {
      cloud_kitchen: {
        amenityCategories: ["utilities", "parking"], // No customer-facing facilities
        defaultPricingModel: "fixed",
        minPhotos: 3,
      },
      food_court: {
        amenityCategories: ["security", "utilities"], // Shared with mall
        defaultPricingModel: "fixed",
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // WAREHOUSE - Partial amenities (industrial focus)
  // ─────────────────────────────────────────────────────────────────────────────
  warehouse: {
    type: "warehouse",
    steps: {
      amenities: { step: 4, label: "Features", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: ["security", "parking", "utilities"],
    defaultPricingModel: "per_sqm",
    availablePricingModels: ["per_sqm", "fixed"],
    photosRequired: true,
    minPhotos: 3,
    specialSubtypes: {
      cold_storage: {
        minPhotos: 4, // Need to show cold storage features
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // AUTOMOTIVE - Minimal/specific amenities
  // ─────────────────────────────────────────────────────────────────────────────
  automotive: {
    type: "automotive",
    steps: {
      amenities: { step: 4, label: "Features", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: ["security", "utilities"],
    defaultPricingModel: "fixed",
    availablePricingModels: ["fixed", "revenue_share"],
    photosRequired: true,
    minPhotos: 3,
    specialSubtypes: {
      parking_lot: {
        steps: {
          amenities: { step: 4, label: "Features", required: false, skip: true },
          pricing: { step: 6, label: "Pricing", required: true },
        },
        amenityCategories: MINIMAL_AMENITY_CATEGORIES,
        defaultPricingModel: "per_unit", // Per parking space
        minPhotos: 2,
      },
      parking_building: {
        amenityCategories: ["security"],
        defaultPricingModel: "per_unit",
      },
      petrol_station: {
        availablePricingModels: ["fixed", "revenue_share"],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // COMMERCIAL LAND - No building amenities
  // ─────────────────────────────────────────────────────────────────────────────
  commercial_land: {
    type: "commercial_land",
    steps: {
      amenities: { step: 4, label: "Features", required: false, skip: true }, // Skip for most land
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: LAND_AMENITY_CATEGORIES,
    defaultPricingModel: "per_sqm",
    availablePricingModels: ["per_sqm", "fixed"],
    photosRequired: true,
    minPhotos: 2,
    specialSubtypes: {
      billboard_site: {
        steps: {
          amenities: { step: 4, label: "Features", required: false, skip: true },
          pricing: { step: 6, label: "Pricing", required: true },
        },
        amenityCategories: [], // No amenities for billboard
        defaultPricingModel: "fixed",
        availablePricingModels: ["fixed"],
        minPhotos: 3, // Show location, facing, traffic
      },
      storage_yard: {
        amenityCategories: ["security"],
      },
      container_yard: {
        amenityCategories: ["security"],
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HOSPITALITY - Full amenities, special pricing
  // ─────────────────────────────────────────────────────────────────────────────
  hospitality: {
    type: "hospitality",
    steps: {
      amenities: { step: 4, label: "Amenities", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: BUILDING_AMENITY_CATEGORIES,
    defaultPricingModel: "fixed",
    availablePricingModels: ["fixed", "per_sqm"],
    photosRequired: true,
    minPhotos: 5,
    specialSubtypes: {
      event_venue: {
        defaultPricingModel: "fixed", // Per event/day
        minPhotos: 6,
      },
      wedding_venue: {
        defaultPricingModel: "fixed",
        minPhotos: 6,
      },
      conference_center: {
        defaultPricingModel: "fixed",
        minPhotos: 5,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // HEALTHCARE - Partial amenities (compliance focus)
  // ─────────────────────────────────────────────────────────────────────────────
  healthcare: {
    type: "healthcare",
    steps: {
      amenities: { step: 4, label: "Amenities", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: ["building", "security", "parking", "utilities"],
    defaultPricingModel: "per_sqm",
    availablePricingModels: ["per_sqm", "fixed"],
    photosRequired: true,
    minPhotos: 4,
    specialSubtypes: {
      pharmacy_space: {
        amenityCategories: ["security", "parking"],
        minPhotos: 3,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // EDUCATIONAL - Partial amenities
  // ─────────────────────────────────────────────────────────────────────────────
  educational: {
    type: "educational",
    steps: {
      amenities: { step: 4, label: "Amenities", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: BUILDING_AMENITY_CATEGORIES,
    defaultPricingModel: "per_sqm",
    availablePricingModels: ["per_sqm", "fixed"],
    photosRequired: true,
    minPhotos: 4,
    specialSubtypes: {
      classroom_rental: {
        amenityCategories: ["building", "utilities"],
        defaultPricingModel: "fixed",
        minPhotos: 2,
      },
      driving_school: {
        amenityCategories: ["parking"],
        defaultPricingModel: "fixed",
        minPhotos: 3,
      },
    },
  },

  // ─────────────────────────────────────────────────────────────────────────────
  // SPECIALIZED - Highly specific per subtype
  // ─────────────────────────────────────────────────────────────────────────────
  specialized: {
    type: "specialized",
    steps: {
      amenities: { step: 4, label: "Amenities", required: false },
      pricing: { step: 6, label: "Pricing", required: true },
    },
    amenityCategories: BUILDING_AMENITY_CATEGORIES,
    defaultPricingModel: "fixed",
    availablePricingModels: ["fixed", "per_sqm"],
    photosRequired: true,
    minPhotos: 4,
    specialSubtypes: {
      data_center: {
        amenityCategories: ["security", "utilities"], // Very specific needs
        defaultPricingModel: "per_unit", // Per rack
        availablePricingModels: ["per_unit", "fixed"],
        minPhotos: 5,
      },
      recording_studio: {
        amenityCategories: ["building", "parking"],
        defaultPricingModel: "fixed",
      },
      photo_studio: {
        amenityCategories: ["building", "parking"],
        defaultPricingModel: "fixed",
      },
      gym_fitness: {
        amenityCategories: BUILDING_AMENITY_CATEGORIES,
        minPhotos: 5,
      },
      salon_spa: {
        amenityCategories: ["building", "parking", "utilities"],
        minPhotos: 4,
      },
      atm_site: {
        steps: {
          amenities: { step: 4, label: "Features", required: false, skip: true },
          pricing: { step: 6, label: "Pricing", required: true },
        },
        amenityCategories: [], // ATM has specific fields, not general amenities
        defaultPricingModel: "fixed",
        minPhotos: 3,
      },
      bank_branch: {
        amenityCategories: BUILDING_AMENITY_CATEGORIES,
        minPhotos: 4,
      },
      religious_facility: {
        amenityCategories: ["building", "parking", "utilities"],
        defaultPricingModel: "fixed",
        minPhotos: 4,
      },
    },
  },
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Get the flow configuration for a specific type/subtype combination
 */
export function getFlowConfig(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): CommercialFlowConfig | null {
  if (!type) return null;
  
  const baseConfig = COMMERCIAL_FLOW_CONFIG[type];
  if (!baseConfig) return null;
  
  // If no subtype or no special handling, return base config
  if (!subtype || !baseConfig.specialSubtypes?.[subtype]) {
    return baseConfig;
  }
  
  // Merge base config with subtype-specific overrides
  const subtypeOverrides = baseConfig.specialSubtypes[subtype];
  return {
    ...baseConfig,
    ...subtypeOverrides,
    steps: {
      ...baseConfig.steps,
      ...(subtypeOverrides.steps || {}),
    },
    amenityCategories: subtypeOverrides.amenityCategories ?? baseConfig.amenityCategories,
    availablePricingModels: subtypeOverrides.availablePricingModels ?? baseConfig.availablePricingModels,
  } as CommercialFlowConfig;
}

/**
 * Check if amenities step should be skipped
 */
export function shouldSkipAmenities(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): boolean {
  const config = getFlowConfig(type, subtype);
  return config?.steps.amenities.skip ?? false;
}

/**
 * Get relevant amenity categories for a type/subtype
 */
export function getAmenityCategories(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): string[] {
  const config = getFlowConfig(type, subtype);
  return config?.amenityCategories ?? BUILDING_AMENITY_CATEGORIES;
}

/**
 * Get default pricing model for a type/subtype
 */
export function getDefaultPricingModel(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): string {
  const config = getFlowConfig(type, subtype);
  return config?.defaultPricingModel ?? "per_sqm";
}

/**
 * Get minimum photos required
 */
export function getMinPhotos(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): number {
  const config = getFlowConfig(type, subtype);
  return config?.minPhotos ?? 3;
}

/**
 * Get steps for commercial flow with skip handling
 */
export function getCommercialSteps(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): WizardStep[] {
  const config = getFlowConfig(type, subtype);
  const allSteps: WizardStep[] = [1, 2, 3, 4, 5, 6, 7];
  
  if (!config) return allSteps;
  
  // Filter out skipped steps
  return allSteps.filter((step) => {
    if (step === 4 && config.steps.amenities.skip) return false;
    return true;
  });
}

// =============================================================================
// PRICING MODEL LABELS
// =============================================================================

export const PRICING_MODEL_LABELS: Record<string, { label: string; description: string }> = {
  per_sqm: { label: "Per Square Meter", description: "Monthly rate × space size" },
  fixed: { label: "Fixed Monthly", description: "Set monthly amount" },
  revenue_share: { label: "Revenue Share", description: "Percentage of sales" },
  per_unit: { label: "Per Unit", description: "Per parking space / rack / room" },
};

// =============================================================================
// COMMERCIAL PHOTO CATEGORIES
// =============================================================================

export interface PhotoCategory {
  id: string;
  label: string;
  icon: string; // Lucide icon name
  description?: string;
  required?: boolean;
}

/** Base photo categories for all commercial types */
const BASE_PHOTO_CATEGORIES: PhotoCategory[] = [
  { id: "cover", label: "Cover", icon: "Star", description: "Main listing photo", required: true },
  { id: "exterior", label: "Exterior", icon: "Building2", description: "Building front view" },
  { id: "entrance", label: "Entrance", icon: "DoorOpen", description: "Main entry point" },
];

/** Photo categories by commercial type */
const COMMERCIAL_PHOTO_CATEGORIES: Record<CommercialType, PhotoCategory[]> = {
  office: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "workspace", label: "Workspace", icon: "Monitor", description: "Main work area" },
    { id: "meeting_room", label: "Meeting Room", icon: "Users", description: "Conference space" },
    { id: "reception", label: "Reception", icon: "Armchair", description: "Reception area" },
    { id: "common_area", label: "Common Area", icon: "Coffee", description: "Break/lounge area" },
    { id: "restroom", label: "Restroom", icon: "Bath", description: "Toilet facilities" },
  ],
  retail: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "storefront", label: "Storefront", icon: "Store", description: "Shop front/window" },
    { id: "sales_floor", label: "Sales Floor", icon: "ShoppingBag", description: "Main retail area" },
    { id: "storage", label: "Storage", icon: "Package", description: "Back storage" },
    { id: "counter", label: "Counter", icon: "CreditCard", description: "Checkout area" },
  ],
  food_beverage: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "dining_area", label: "Dining Area", icon: "UtensilsCrossed", description: "Seating area" },
    { id: "kitchen", label: "Kitchen", icon: "ChefHat", description: "Kitchen/prep area" },
    { id: "bar_counter", label: "Bar/Counter", icon: "Wine", description: "Bar or service counter" },
    { id: "outdoor_seating", label: "Outdoor", icon: "TreePine", description: "Outdoor seating" },
    { id: "restroom", label: "Restroom", icon: "Bath", description: "Toilet facilities" },
  ],
  warehouse: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "floor_space", label: "Floor Space", icon: "Warehouse", description: "Main storage area" },
    { id: "loading_dock", label: "Loading Dock", icon: "Truck", description: "Loading/unloading area" },
    { id: "racking", label: "Racking", icon: "Layers", description: "Shelving/racking system" },
    { id: "office_area", label: "Office Area", icon: "Monitor", description: "Admin office" },
    { id: "parking", label: "Parking", icon: "ParkingCircle", description: "Truck/vehicle parking" },
  ],
  automotive: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "service_area", label: "Service Area", icon: "Wrench", description: "Main service area" },
    { id: "parking_area", label: "Parking Area", icon: "Car", description: "Parking spaces" },
    { id: "equipment", label: "Equipment", icon: "Settings", description: "Tools & equipment" },
    { id: "office_area", label: "Office/Reception", icon: "Monitor", description: "Customer area" },
  ],
  commercial_land: [
    { id: "cover", label: "Cover", icon: "Star", description: "Main listing photo", required: true },
    { id: "aerial_view", label: "Aerial View", icon: "Plane", description: "Bird's eye view" },
    { id: "street_view", label: "Street View", icon: "MapPin", description: "View from road" },
    { id: "boundaries", label: "Boundaries", icon: "Square", description: "Plot boundaries" },
    { id: "surroundings", label: "Surroundings", icon: "Mountain", description: "Neighboring area" },
  ],
  hospitality: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "lobby", label: "Lobby", icon: "Armchair", description: "Reception/lobby" },
    { id: "room", label: "Room", icon: "BedDouble", description: "Sample room" },
    { id: "amenities", label: "Amenities", icon: "Sparkles", description: "Pool/gym/spa" },
    { id: "dining", label: "Dining", icon: "UtensilsCrossed", description: "Restaurant/bar" },
    { id: "event_space", label: "Event Space", icon: "Presentation", description: "Conference/ballroom" },
  ],
  healthcare: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "waiting_area", label: "Waiting Area", icon: "Sofa", description: "Patient waiting" },
    { id: "treatment_room", label: "Treatment Room", icon: "Stethoscope", description: "Consultation room" },
    { id: "equipment", label: "Equipment", icon: "Activity", description: "Medical equipment" },
    { id: "pharmacy", label: "Pharmacy", icon: "Pill", description: "Dispensary area" },
    { id: "restroom", label: "Restroom", icon: "Bath", description: "Patient facilities" },
  ],
  educational: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "classroom", label: "Classroom", icon: "GraduationCap", description: "Teaching space" },
    { id: "common_area", label: "Common Area", icon: "Users", description: "Student area" },
    { id: "playground", label: "Playground", icon: "TreePine", description: "Outdoor play area" },
    { id: "office", label: "Office", icon: "Monitor", description: "Admin office" },
    { id: "restroom", label: "Restroom", icon: "Bath", description: "Toilet facilities" },
  ],
  specialized: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "main_space", label: "Main Space", icon: "Maximize", description: "Primary area" },
    { id: "equipment", label: "Equipment", icon: "Settings", description: "Specialized equipment" },
    { id: "support", label: "Support Area", icon: "Layers", description: "Support facilities" },
    { id: "amenities", label: "Amenities", icon: "Sparkles", description: "Additional features" },
  ],
};

/** Subtype-specific photo category overrides */
const SUBTYPE_PHOTO_OVERRIDES: Partial<Record<CommercialSubtype, PhotoCategory[]>> = {
  // Billboard just needs a few photos
  billboard_site: [
    { id: "cover", label: "Cover", icon: "Star", description: "Billboard location", required: true },
    { id: "street_view", label: "Street View", icon: "MapPin", description: "View from road" },
    { id: "dimensions", label: "Dimensions", icon: "Ruler", description: "Size reference" },
  ],
  // ATM site minimal photos
  atm_site: [
    { id: "cover", label: "Cover", icon: "Star", description: "ATM location", required: true },
    { id: "street_view", label: "Street View", icon: "MapPin", description: "Visibility from street" },
    { id: "surroundings", label: "Surroundings", icon: "Eye", description: "Area context" },
  ],
  // Data center specific
  data_center: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "server_room", label: "Server Room", icon: "Server", description: "Main server area" },
    { id: "cooling", label: "Cooling System", icon: "Fan", description: "HVAC/cooling" },
    { id: "power", label: "Power Systems", icon: "Zap", description: "UPS/generators" },
    { id: "security", label: "Security", icon: "Shield", description: "Security features" },
    { id: "network", label: "Network", icon: "Network", description: "Network infrastructure" },
  ],
  // Recording studio
  recording_studio: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "live_room", label: "Live Room", icon: "Mic", description: "Recording space" },
    { id: "control_room", label: "Control Room", icon: "Sliders", description: "Mixing console" },
    { id: "isolation_booth", label: "Isolation Booth", icon: "VolumeX", description: "Vocal booth" },
    { id: "equipment", label: "Equipment", icon: "Radio", description: "Audio equipment" },
  ],
  // Photo studio
  photo_studio: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "shooting_area", label: "Shooting Area", icon: "Camera", description: "Main studio" },
    { id: "lighting", label: "Lighting Setup", icon: "Lightbulb", description: "Lighting equipment" },
    { id: "backdrop", label: "Backdrop", icon: "Square", description: "Cyclorama/backdrops" },
    { id: "makeup", label: "Makeup Room", icon: "Sparkles", description: "Prep area" },
  ],
  // Gym
  gym_fitness: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "cardio", label: "Cardio Area", icon: "Heart", description: "Cardio machines" },
    { id: "weights", label: "Weights Area", icon: "Dumbbell", description: "Free weights" },
    { id: "class_studio", label: "Class Studio", icon: "Users", description: "Group fitness" },
    { id: "locker_room", label: "Locker Room", icon: "Lock", description: "Changing facilities" },
  ],
  // Salon/Spa
  salon_spa: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "styling", label: "Styling Stations", icon: "Scissors", description: "Hair stations" },
    { id: "treatment", label: "Treatment Room", icon: "Sparkles", description: "Spa treatments" },
    { id: "waiting", label: "Waiting Area", icon: "Sofa", description: "Reception" },
    { id: "wash_area", label: "Wash Area", icon: "Droplet", description: "Shampoo area" },
  ],
  // Cold storage
  cold_storage: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "cold_room", label: "Cold Room", icon: "Snowflake", description: "Refrigerated area" },
    { id: "loading", label: "Loading Area", icon: "Truck", description: "Loading dock" },
    { id: "controls", label: "Controls", icon: "Thermometer", description: "Temperature controls" },
  ],
  // Parking
  parking_lot: [
    { id: "cover", label: "Cover", icon: "Star", description: "Main view", required: true },
    { id: "entrance", label: "Entrance", icon: "DoorOpen", description: "Entry/exit" },
    { id: "parking_spaces", label: "Parking Spaces", icon: "Car", description: "Parking layout" },
    { id: "payment", label: "Payment", icon: "CreditCard", description: "Payment system" },
  ],
  parking_building: [
    { id: "cover", label: "Cover", icon: "Star", description: "Building exterior", required: true },
    { id: "entrance", label: "Entrance", icon: "DoorOpen", description: "Vehicle entry" },
    { id: "levels", label: "Parking Levels", icon: "Layers", description: "Interior levels" },
    { id: "facilities", label: "Facilities", icon: "Settings", description: "Lifts/stairs" },
  ],
  // Event venues
  event_venue: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "main_hall", label: "Main Hall", icon: "Presentation", description: "Event space" },
    { id: "stage", label: "Stage", icon: "Mic2", description: "Stage area" },
    { id: "seating", label: "Seating", icon: "Users", description: "Seating arrangement" },
    { id: "catering", label: "Catering", icon: "UtensilsCrossed", description: "Kitchen/bar" },
  ],
  wedding_venue: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "ceremony", label: "Ceremony Area", icon: "Heart", description: "Wedding ceremony" },
    { id: "reception", label: "Reception Hall", icon: "PartyPopper", description: "Reception space" },
    { id: "gardens", label: "Gardens", icon: "TreePine", description: "Outdoor areas" },
    { id: "bridal", label: "Bridal Suite", icon: "Sparkles", description: "Preparation rooms" },
  ],
  // Bank
  bank_branch: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "banking_hall", label: "Banking Hall", icon: "Building", description: "Customer area" },
    { id: "teller", label: "Teller Counter", icon: "CreditCard", description: "Service counter" },
    { id: "office", label: "Offices", icon: "Briefcase", description: "Private offices" },
    { id: "vault", label: "Vault Area", icon: "Lock", description: "Secure area" },
  ],
  // Religious
  religious_facility: [
    ...BASE_PHOTO_CATEGORIES,
    { id: "worship_hall", label: "Worship Hall", icon: "Church", description: "Main worship space" },
    { id: "altar", label: "Altar/Pulpit", icon: "Book", description: "Focal point" },
    { id: "seating", label: "Seating", icon: "Users", description: "Congregation seating" },
    { id: "grounds", label: "Grounds", icon: "TreePine", description: "Outdoor areas" },
  ],
};

/**
 * Get photo categories for a commercial type/subtype
 */
export function getPhotoCategories(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): PhotoCategory[] {
  // Check for subtype-specific override first
  if (subtype && SUBTYPE_PHOTO_OVERRIDES[subtype]) {
    return SUBTYPE_PHOTO_OVERRIDES[subtype]!;
  }
  
  // Fall back to type-level categories
  if (type && COMMERCIAL_PHOTO_CATEGORIES[type]) {
    return COMMERCIAL_PHOTO_CATEGORIES[type];
  }
  
  // Default fallback
  return BASE_PHOTO_CATEGORIES;
}
