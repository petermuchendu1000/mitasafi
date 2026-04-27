/**
 * Residential Required Fields Configuration
 * 
 * Defines which fields are required for residential property listings.
 * Mirrors the commercial required-fields-config.ts pattern for consistency.
 * 
 * This centralizes residential validation logic that was previously
 * scattered across individual step components.
 */

import type { PropertyFormData, PropertyType, PropertyCondition } from "./types";

// =============================================================================
// TYPES
// =============================================================================

export type ResidentialFieldKey = keyof PropertyFormData;

export interface ResidentialFieldConfig {
  /** Field key */
  field: ResidentialFieldKey;
  /** Human-readable label */
  label: string;
  /** Validation function - returns error message or null if valid */
  validate: (value: unknown, formData: PropertyFormData) => string | null;
  /** Step number where this field appears */
  step: number;
  /** Conditional: only required when this returns true */
  when?: (formData: PropertyFormData) => boolean;
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

const validOption = <T extends string>(label: string, options: readonly T[]) => 
  (value: unknown): string | null => {
    if (!value || !options.includes(value as T)) {
      return `Please select a ${label.toLowerCase()}`;
    }
    return null;
  };

const minArrayLength = (label: string, min: number) => (value: unknown): string | null => {
  if (!Array.isArray(value) || value.length < min) {
    return `Select at least ${min} ${label.toLowerCase()}`;
  }
  return null;
};

const validYear = (label: string, minYear: number = 1900) => 
  (value: unknown, formData: PropertyFormData): string | null => {
    if (value === null || value === undefined) return null; // Optional field
    if (typeof value !== "number") return `${label} must be a number`;
    const currentYear = new Date().getFullYear();
    if (value < minYear || value > currentYear) {
      return `${label} must be between ${minYear} and ${currentYear}`;
    }
    return null;
  };

// =============================================================================
// STEP 1: PROPERTY TYPE
// =============================================================================

const STEP1_REQUIREMENTS: ResidentialFieldConfig[] = [
  {
    field: "propertyType",
    label: "Property Type",
    step: 1,
    validate: validOption("Property Type", [
      "bedsitter", "studio", "apartment", "house", "townhouse", "maisonette", "villa"
    ] as const),
  },
];

// =============================================================================
// STEP 2: LOCATION
// =============================================================================

const STEP2_REQUIREMENTS: ResidentialFieldConfig[] = [
  {
    field: "address",
    label: "Address",
    step: 2,
    validate: notEmpty("Address"),
  },
  {
    field: "area",
    label: "Neighborhood",
    step: 2,
    validate: notEmpty("Neighborhood"),
  },
];

// =============================================================================
// STEP 3: DETAILS
// =============================================================================

const STEP3_REQUIREMENTS: ResidentialFieldConfig[] = [
  {
    field: "bedrooms",
    label: "Bedrooms",
    step: 3,
    validate: nonNegativeNumber("Bedrooms"),
    // Bedsitters and studios have fixed bedrooms (0)
    when: (formData) => !["bedsitter", "studio"].includes(formData.propertyType || ""),
  },
  {
    field: "bathrooms",
    label: "Bathrooms",
    step: 3,
    validate: positiveNumber("Bathrooms"),
  },
  {
    field: "condition",
    label: "Property Condition",
    step: 3,
    validate: validOption("Property Condition", [
      "excellent", "good", "fair", "needs_work"
    ] as const),
  },
  {
    field: "yearBuilt",
    label: "Year Built",
    step: 3,
    validate: validYear("Year Built"),
  },
];

// =============================================================================
// STEP 4: AMENITIES
// =============================================================================

const STEP4_REQUIREMENTS: ResidentialFieldConfig[] = [
  // Most amenities are optional - user selects what applies
  // No strict requirements here
];

// =============================================================================
// STEP 5: PHOTOS
// =============================================================================

const STEP5_REQUIREMENTS: ResidentialFieldConfig[] = [
  {
    field: "photos",
    label: "Photos",
    step: 5,
    validate: (value) => {
      if (!Array.isArray(value) || value.length < 3) {
        return "Please upload at least 3 photos";
      }
      // Check that photos are actually uploaded (have URLs)
      const uploadedPhotos = value.filter(p => p.url || p.preview);
      if (uploadedPhotos.length < 3) {
        return "Please wait for photos to finish uploading";
      }
      return null;
    },
  },
];

// =============================================================================
// STEP 6: PRICING
// =============================================================================

const STEP6_REQUIREMENTS: ResidentialFieldConfig[] = [
  {
    field: "rentAmount",
    label: "Rent Amount",
    step: 6,
    validate: positiveNumber("Rent amount"),
  },
  {
    field: "availableFrom",
    label: "Available From",
    step: 6,
    validate: notEmpty("Availability date"),
  },
  {
    field: "paymentMethods",
    label: "Payment Methods",
    step: 6,
    validate: minArrayLength("Payment Method", 1),
  },
  {
    field: "depositMonths",
    label: "Deposit",
    step: 6,
    validate: positiveNumber("Deposit months"),
  },
];

// =============================================================================
// STEP 7: REVIEW (FINAL)
// =============================================================================

const STEP7_REQUIREMENTS: ResidentialFieldConfig[] = [
  {
    field: "title",
    label: "Listing Title",
    step: 7,
    validate: (value) => {
      if (!value || typeof value !== "string" || value.trim().length < 10) {
        return "Title must be at least 10 characters";
      }
      if (value.length > 100) {
        return "Title must be less than 100 characters";
      }
      return null;
    },
  },
  {
    field: "description",
    label: "Description",
    step: 7,
    validate: (value) => {
      if (!value || typeof value !== "string" || value.trim().length < 50) {
        return "Description must be at least 50 characters";
      }
      return null;
    },
  },
];

// =============================================================================
// COMBINED CONFIGURATION
// =============================================================================

export const RESIDENTIAL_REQUIREMENTS: ResidentialFieldConfig[] = [
  ...STEP1_REQUIREMENTS,
  ...STEP2_REQUIREMENTS,
  ...STEP3_REQUIREMENTS,
  ...STEP4_REQUIREMENTS,
  ...STEP5_REQUIREMENTS,
  ...STEP6_REQUIREMENTS,
  ...STEP7_REQUIREMENTS,
];

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if a field is required for residential listings
 */
export function isResidentialFieldRequired(
  field: ResidentialFieldKey,
  formData: PropertyFormData
): boolean {
  const config = RESIDENTIAL_REQUIREMENTS.find(r => r.field === field);
  if (!config) return false;
  
  // Check conditional requirement
  if (config.when && !config.when(formData)) {
    return false;
  }
  
  return true;
}

/**
 * Get required fields for a specific step
 */
export function getStepRequiredFields(step: number): ResidentialFieldConfig[] {
  return RESIDENTIAL_REQUIREMENTS.filter(r => r.step === step);
}

/**
 * Validate all required fields for a specific step
 */
export function validateResidentialStep(
  step: number,
  formData: PropertyFormData
): Record<string, string> {
  const errors: Record<string, string> = {};
  const stepFields = getStepRequiredFields(step);
  
  for (const config of stepFields) {
    // Skip if conditional and condition not met
    if (config.when && !config.when(formData)) {
      continue;
    }
    
    const value = formData[config.field];
    const error = config.validate(value, formData);
    
    if (error) {
      errors[config.field] = error;
    }
  }
  
  return errors;
}

/**
 * Validate all required fields across all steps
 */
export function validateAllResidentialFields(
  formData: PropertyFormData
): Record<string, string> {
  const errors: Record<string, string> = {};
  
  for (const config of RESIDENTIAL_REQUIREMENTS) {
    // Skip if conditional and condition not met
    if (config.when && !config.when(formData)) {
      continue;
    }
    
    const value = formData[config.field];
    const error = config.validate(value, formData);
    
    if (error) {
      errors[config.field] = error;
    }
  }
  
  return errors;
}

/**
 * Check if a step is complete (all required fields valid)
 */
export function isStepComplete(step: number, formData: PropertyFormData): boolean {
  const errors = validateResidentialStep(step, formData);
  return Object.keys(errors).length === 0;
}

/**
 * Get completion percentage for the entire form
 */
export function getFormCompletionPercentage(formData: PropertyFormData): number {
  const totalFields = RESIDENTIAL_REQUIREMENTS.filter(
    r => !r.when || r.when(formData)
  ).length;
  
  if (totalFields === 0) return 100;
  
  const errors = validateAllResidentialFields(formData);
  const validFields = totalFields - Object.keys(errors).length;
  
  return Math.round((validFields / totalFields) * 100);
}
