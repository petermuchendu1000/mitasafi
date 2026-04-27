/**
 * useResidentialForm Hook
 * 
 * Shared hook for residential listing steps.
 * Centralizes:
 * - State access and updates
 * - Step-based validation via residential-required-fields-config
 * - Required field checking
 * 
 * This mirrors useCommercialForm for consistency across listing types.
 */

import { useCallback, useEffect, useMemo } from "react";
import { useWizard } from "../context";
import { 
  isResidentialFieldRequired, 
  validateResidentialStep,
  type ResidentialFieldKey,
} from "../residential-required-fields-config";
import type { PropertyFormData } from "../types";

/**
 * Hook for residential form components
 * Provides standardized state management, validation, and helpers
 */
export function useResidentialForm(step: number) {
  const { state, updateFormData, setValidation } = useWizard();
  const formData = state.formData;

  /**
   * Check if a field is required for current form state
   */
  const isRequired = useCallback(
    (field: ResidentialFieldKey | keyof PropertyFormData) => 
      isResidentialFieldRequired(field as ResidentialFieldKey, formData),
    [formData]
  );

  /**
   * Update form data with partial updates
   */
  const updateField = useCallback(
    <K extends keyof PropertyFormData>(field: K, value: PropertyFormData[K]) => {
      updateFormData({ [field]: value });
    },
    [updateFormData]
  );

  /**
   * Update multiple fields at once
   */
  const updateFields = useCallback(
    (data: Partial<PropertyFormData>) => {
      updateFormData(data);
    },
    [updateFormData]
  );

  /**
   * Centralized validation effect
   * Runs whenever form data changes
   */
  useEffect(() => {
    const errors = validateResidentialStep(step, formData);
    
    setValidation(step, {
      isValid: Object.keys(errors).length === 0,
      errors,
      touched: {},
    });
  }, [formData, step, setValidation]);

  /**
   * Get validation errors for current step (memoized)
   */
  const validationErrors = useMemo(
    () => validateResidentialStep(step, formData),
    [formData, step]
  );

  /**
   * Check if current step is valid
   */
  const isValid = useMemo(
    () => Object.keys(validationErrors).length === 0,
    [validationErrors]
  );

  return {
    // State
    formData,
    
    // Individual field values for convenience
    propertyType: formData.propertyType,
    bedrooms: formData.bedrooms,
    bathrooms: formData.bathrooms,
    sizeSqft: formData.sizeSqft,
    sizeUnit: formData.sizeUnit,
    condition: formData.condition,
    furnishing: formData.furnishing,
    rentAmount: formData.rentAmount,
    photos: formData.photos,
    
    // Actions
    updateField,
    updateFields,
    updateFormData, // Direct access when needed
    
    // Validation helpers
    isRequired,
    validationErrors,
    isValid,
  };
}

/**
 * Property type helpers
 */
export function usePropertyType() {
  const { state } = useWizard();
  const { propertyType } = state.formData;

  return {
    propertyType,
    
    // Property type checks
    isBedsitter: propertyType === "bedsitter",
    isStudio: propertyType === "studio",
    isApartment: propertyType === "apartment",
    isHouse: propertyType === "house",
    isTownhouse: propertyType === "townhouse",
    isMaisonette: propertyType === "maisonette",
    isVilla: propertyType === "villa",
    
    // Grouped checks
    isSmallUnit: propertyType === "bedsitter" || propertyType === "studio",
    isStandalone: propertyType === "house" || propertyType === "villa",
    hasFixedBedrooms: propertyType === "bedsitter" || propertyType === "studio",
  };
}

export type UseResidentialFormReturn = ReturnType<typeof useResidentialForm>;
export type UsePropertyTypeReturn = ReturnType<typeof usePropertyType>;
