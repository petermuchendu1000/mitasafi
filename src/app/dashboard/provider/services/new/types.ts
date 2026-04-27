/**
 * Service Wizard Types
 * 
 * Type definitions for the "Add Services" wizard.
 * Follows KISS principle - minimal, focused types.
 */

// =============================================================================
// WIZARD CONFIGURATION
// =============================================================================

export const TOTAL_STEPS = 6;

export const WIZARD_STEPS = [
  { id: 1, title: "Select Category", shortTitle: "Category" },
  { id: 2, title: "Choose Services", shortTitle: "Services" },
  { id: 3, title: "Set Pricing", shortTitle: "Pricing" },
  { id: 4, title: "Service Areas", shortTitle: "Areas" },
  { id: 5, title: "Description & Photos", shortTitle: "Details" },
  { id: 6, title: "Review & Publish", shortTitle: "Review" },
] as const;

// =============================================================================
// PRICE TYPES
// =============================================================================

export const PRICE_TYPES = [
  { id: "fixed", label: "Fixed price", description: "Same price for this job" },
  { id: "starting_from", label: "Starting from", description: "Price may change depending on work" },
  { id: "quote", label: "Request a quote", description: "Customer asks first, then you agree" },
] as const;

export type PriceType = "fixed" | "starting_from" | "quote";

// =============================================================================
// CATEGORY PRICE DEFAULTS
// =============================================================================

/**
 * Smart defaults: category name → default price type.
 * Shared by Step2 (service selection) and Step3 (pricing).
 */
export const CATEGORY_PRICE_DEFAULTS: Record<string, PriceType> = {
  "Plumbing": "quote",
  "Electrical": "quote",
  "HVAC": "quote",
  "Appliance Repair": "quote",
  "Carpentry": "starting_from",
  "Painting": "starting_from",
  "Flooring": "starting_from",
  "Roofing": "quote",
  "Moving": "starting_from",
  "Security": "quote",
  "Cleaning": "fixed",
  "Laundry": "fixed",
  "Pest Control": "starting_from",
  "Landscaping": "starting_from",
  "Pet Care": "fixed",
  "Waste Management": "fixed",
  "Water Services": "quote",
  "Tech Support": "starting_from",
  "Locksmith": "starting_from",
  "Interior Design": "quote",
  "Renovation": "quote",
  "Events": "quote",
  "Catering": "starting_from",
  "Childcare": "fixed",
  "Glass": "starting_from",
};

// =============================================================================
// SELECTED SERVICE
// =============================================================================

export interface SelectedService {
  serviceId: string;
  serviceName: string;
  subcategoryId: string;
  subcategoryName: string;
  categoryId: string;
  categoryName: string;
  customPrice: number | null;
  priceType: PriceType;
  description: string;
  experienceYears: number | null;
}

// =============================================================================
// FORM DATA
// =============================================================================

export interface ServiceFormData {
  // Step 1: Category (supports multiple)
  categoryIds: string[];
  subcategoryId: string | null;
  
  // Step 2: Services (multiple selection)
  selectedServices: SelectedService[];
  
  // Step 3 is editing the selectedServices pricing
  
  // Step 4: Service Areas
  serviceAreas?: {
    bulk?: string[]; // Area IDs when bulk applying
    perService?: Record<string, string[]>; // serviceId -> area IDs
    canTravelOutside?: boolean;
  };
  
  // Step 5: Service image URLs (uploaded to Supabase Storage)
  serviceImages?: Record<string, { description: string; imageUrls: string[] }>;
}

export const DEFAULT_FORM_DATA: ServiceFormData = {
  categoryIds: [],
  subcategoryId: null,
  selectedServices: [],
};

// =============================================================================
// WIZARD STATE
// =============================================================================

export interface WizardState {
  currentStep: number;
  formData: ServiceFormData;
  isSubmitting: boolean;
  errors: Record<string, string>;
}

export const DEFAULT_WIZARD_STATE: WizardState = {
  currentStep: 1,
  formData: DEFAULT_FORM_DATA,
  isSubmitting: false,
  errors: {},
};

// =============================================================================
// VALIDATION
// =============================================================================

export function validateStep(step: number, formData: ServiceFormData): Record<string, string> {
  const errors: Record<string, string> = {};

  switch (step) {
    case 1:
      if (formData.categoryIds.length === 0) {
        errors.categoryId = "Please select at least one category";
      }
      break;

    case 2:
      if (formData.selectedServices.length === 0) {
        errors.services = "Please select at least one service";
      }
      break;

    case 3:
      // Validate pricing for each selected service
      formData.selectedServices.forEach((service, index) => {
        if (service.priceType !== "quote" && !service.customPrice) {
          errors[`price_${index}`] = `Please set a price for ${service.serviceName}`;
        }
        if (service.customPrice && service.customPrice < 0) {
          errors[`price_${index}`] = "Price cannot be negative";
        }
      });
      break;

    case 4:
      // Validate service areas
      if (!formData.serviceAreas) {
        errors.serviceAreas = "Please select at least one service area";
      } else if (formData.serviceAreas.bulk) {
        if (formData.serviceAreas.bulk.length === 0) {
          errors.serviceAreas = "Please select at least one service area";
        }
      } else if (formData.serviceAreas.perService) {
        const allEmpty = Object.values(formData.serviceAreas.perService).every(
          (areas) => areas.length === 0
        );
        if (allEmpty) {
          errors.serviceAreas = "Please select areas for at least one service";
        }
      }
      break;

    case 5:
      // Validate images — at least 1 photo per service
      formData.selectedServices.forEach((service) => {
        const imgs = formData.serviceImages?.[service.serviceId]?.imageUrls || [];
        if (imgs.length === 0) {
          errors[`images_${service.serviceId}`] = `Upload at least one photo for ${service.serviceName}`;
        }
      });
      break;
  }

  return errors;
}

// =============================================================================
// API TYPES (for server actions)
// =============================================================================

export interface AddServicesInput {
  services: Array<{
    serviceId: string;
    customPrice: number | null;
    priceType: PriceType;
    description: string;
    experienceYears: number | null;
    imageUrls?: string[];
  }>;
  /** Neighborhood UUIDs selected in Step 4 — persisted to provider_service_areas */
  serviceAreas?: {
    bulk?: string[];
    canTravelOutside?: boolean;
  };
}

export interface ActionResult {
  success: boolean;
  error?: string;
  data?: unknown;
}
