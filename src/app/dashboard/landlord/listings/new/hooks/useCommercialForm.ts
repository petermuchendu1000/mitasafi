/**
 * useCommercialForm Hook
 * 
 * Shared hook for all commercial detail components.
 * Centralizes:
 * - State access and updates
 * - Validation via required-fields-config (cached)
 * - Required field checking
 * 
 * This eliminates boilerplate duplicated across 10+ commercial components.
 * 
 * Performance optimizations:
 * - Uses memoized config lookups
 * - Uses cached validation results
 */

import { useCallback, useEffect, useMemo } from "react";
import { useWizard } from "../context";
import { 
  isFieldRequired, 
  type RequiredFieldKey,
} from "../required-fields-config";
import {
  validateRequiredFieldsCached,
  getRequiredFieldsMemoized,
} from "../validation-cache";
import type { CommercialFormData } from "../commercial-types";

/**
 * Hook for commercial form components
 * Provides standardized state management, validation, and helpers
 */
export function useCommercialForm() {
  const { state, updateFormData, setValidation } = useWizard();
  const { commercial, commercialType, commercialSubtype } = state.formData;

  /**
   * Check if a field is required for current type/subtype
   */
  const isRequired = useCallback(
    (field: RequiredFieldKey | keyof CommercialFormData) => 
      isFieldRequired(field as RequiredFieldKey, commercialType, commercialSubtype),
    [commercialType, commercialSubtype]
  );

  /**
   * Update commercial data with partial updates
   * Preserves existing data and merges new values
   */
  const updateCommercial = useCallback(
    (data: Partial<CommercialFormData>) => {
      updateFormData({
        commercial: { ...commercial, ...data },
      });
    },
    [commercial, updateFormData]
  );

  /**
   * Centralized validation effect
   * Runs whenever commercial data, type, or subtype changes
   * Uses cached validation for performance
   */
  useEffect(() => {
    const errors = validateRequiredFieldsCached(commercial, commercialType, commercialSubtype);
    
    setValidation(3, {
      isValid: Object.keys(errors).length === 0,
      errors,
      touched: {},
    });
  }, [commercial, commercialType, commercialSubtype, setValidation]);

  /**
   * Get validation errors (memoized with cached results)
   */
  const validationErrors = useMemo(
    () => validateRequiredFieldsCached(commercial, commercialType, commercialSubtype),
    [commercial, commercialType, commercialSubtype]
  );

  /**
   * Get required fields configuration (memoized)
   */
  const requiredFields = useMemo(
    () => getRequiredFieldsMemoized(commercialType, commercialSubtype),
    [commercialType, commercialSubtype]
  );

  /**
   * Check if form is valid
   */
  const isValid = useMemo(
    () => Object.keys(validationErrors).length === 0,
    [validationErrors]
  );

  return {
    // State
    commercial,
    commercialType,
    commercialSubtype,
    
    // Actions
    updateCommercial,
    
    // Validation helpers
    isRequired,
    validationErrors,
    isValid,
    requiredFields,
  };
}

/**
 * Subtype-specific helpers
 * Use these to check current subtype context
 */
export function useCommercialSubtype() {
  const { state } = useWizard();
  const { commercialSubtype } = state.formData;

  return {
    subtype: commercialSubtype,
    
    // Office subtypes
    isCoworkingDesk: commercialSubtype === "coworking_desk",
    isCoworkingPrivate: commercialSubtype === "coworking_private",
    isServicedOffice: commercialSubtype === "serviced_office",
    isVirtualOffice: commercialSubtype === "virtual_office",
    
    // Retail subtypes
    isStreetFront: commercialSubtype === "street_front",
    isMallUnit: commercialSubtype === "mall_unit",
    isShowroom: commercialSubtype === "showroom",
    isKiosk: commercialSubtype === "kiosk",
    
    // F&B subtypes
    isRestaurant: commercialSubtype === "restaurant_space",
    isCafe: commercialSubtype === "cafe_space",
    isCloudKitchen: commercialSubtype === "cloud_kitchen",
    isBar: commercialSubtype === "bar_lounge",
    
    // Warehouse subtypes
    isColdStorage: commercialSubtype === "cold_storage",
    isDistribution: commercialSubtype === "distribution",
    isFulfillment: commercialSubtype === "fulfillment_center",
    isLightManufacturing: commercialSubtype === "light_manufacturing",
    
    // Automotive subtypes
    isParkingLot: commercialSubtype === "parking_lot",
    isParkingBuilding: commercialSubtype === "parking_building",
    isGarage: commercialSubtype === "garage_workshop",
    isCarWash: commercialSubtype === "car_wash",
    isPetrolStation: commercialSubtype === "petrol_station",
    
    // Commercial land subtypes
    isDevelopmentPlot: commercialSubtype === "development_plot",
    isBillboardSite: commercialSubtype === "billboard_site",
    isStorageYard: commercialSubtype === "storage_yard",
    
    // Hospitality subtypes
    isHotel: commercialSubtype === "hotel_building",
    isEventVenue: commercialSubtype === "event_venue",
    isConferenceCenter: commercialSubtype === "conference_center",
    
    // Healthcare subtypes
    isClinic: commercialSubtype === "clinic_space",
    isDentalClinic: commercialSubtype === "dental_clinic",
    isPharmacy: commercialSubtype === "pharmacy_space",
    isLab: commercialSubtype === "lab_space",
    
    // Educational subtypes
    isSchool: commercialSubtype === "school_building",
    isDaycare: commercialSubtype === "daycare_space",
    isTrainingCenter: commercialSubtype === "training_center",
    
    // Specialized subtypes
    isDataCenter: commercialSubtype === "data_center",
    isRecordingStudio: commercialSubtype === "recording_studio",
    isPhotoStudio: commercialSubtype === "photo_studio",
    isGym: commercialSubtype === "gym_fitness",
    isSalon: commercialSubtype === "salon_spa",
  };
}

export type UseCommercialFormReturn = ReturnType<typeof useCommercialForm>;
export type UseCommercialSubtypeReturn = ReturnType<typeof useCommercialSubtype>;
