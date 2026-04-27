/**
 * Step 3 Commercial: Space Details Router
 * 
 * Routes to the appropriate detail form based on commercial type.
 * Each commercial category has specific fields relevant to that space.
 */

"use client";

import { useWizard } from "../../context";
import { OfficeDetails } from "./OfficeDetails";
import { RetailDetails } from "./RetailDetails";
import { FoodBeverageDetails } from "./FoodBeverageDetails";
import { WarehouseDetails } from "./WarehouseDetails";
import { AutomotiveDetails } from "./AutomotiveDetails";
import { CommercialLandDetails } from "./CommercialLandDetails";
import { HospitalityDetails } from "./HospitalityDetails";
import { HealthcareDetails } from "./HealthcareDetails";
import { EducationalDetails } from "./EducationalDetails";
import { SpecializedDetails } from "./SpecializedDetails";

export function Step3Commercial() {
  const { state } = useWizard();
  const { commercialType } = state.formData;

  // Route to appropriate detail component based on commercial type
  switch (commercialType) {
    case "office":
      return <OfficeDetails />;
    case "retail":
      return <RetailDetails />;
    case "food_beverage":
      return <FoodBeverageDetails />;
    case "warehouse":
      return <WarehouseDetails />;
    case "automotive":
      return <AutomotiveDetails />;
    case "commercial_land":
      return <CommercialLandDetails />;
    case "hospitality":
      return <HospitalityDetails />;
    case "healthcare":
      return <HealthcareDetails />;
    case "educational":
      return <EducationalDetails />;
    case "specialized":
      return <SpecializedDetails />;
    default:
      return (
        <div className="max-w-2xl mx-auto text-center py-12">
          <p className="text-gray-500">
            Please select a commercial type in Step 1.
          </p>
        </div>
      );
  }
}

// Re-export all detail components
export { OfficeDetails } from "./OfficeDetails";
export { RetailDetails } from "./RetailDetails";
export { FoodBeverageDetails } from "./FoodBeverageDetails";
export { WarehouseDetails } from "./WarehouseDetails";
export { AutomotiveDetails } from "./AutomotiveDetails";
export { CommercialLandDetails } from "./CommercialLandDetails";
export { HospitalityDetails } from "./HospitalityDetails";
export { HealthcareDetails } from "./HealthcareDetails";
export { EducationalDetails } from "./EducationalDetails";
export { SpecializedDetails } from "./SpecializedDetails";
