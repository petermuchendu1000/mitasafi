/**
 * Specialized Space Details - Router Component
 * 
 * Routes to the appropriate specialized subtype component.
 * This architecture enables:
 * - Code splitting per subtype
 * - Independent maintenance
 * - Scalable addition of new types
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 */

"use client";

import { useWizard } from "../../context";
import {
  DataCenterDetails,
  RecordingStudioDetails,
  PhotoStudioDetails,
  GymFitnessDetails,
  SalonSpaDetails,
  ReligiousFacilityDetails,
  BankBranchDetails,
  AtmSiteDetails,
} from "./specialized";

// Mapping of subtype to component
const SPECIALIZED_COMPONENTS: Record<string, React.ComponentType> = {
  data_center: DataCenterDetails,
  recording_studio: RecordingStudioDetails,
  photo_studio: PhotoStudioDetails,
  gym_fitness: GymFitnessDetails,
  salon_spa: SalonSpaDetails,
  religious_facility: ReligiousFacilityDetails,
  bank_branch: BankBranchDetails,
  atm_site: AtmSiteDetails,
};

export function SpecializedDetails() {
  const { state } = useWizard();
  const { commercialSubtype } = state.formData;

  // Get the component for this subtype
  const Component = SPECIALIZED_COMPONENTS[commercialSubtype || ""];

  // Fallback for unknown subtypes
  if (!Component) {
    return (
      <div className="max-w-2xl mx-auto text-center py-12">
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-6">
          <h3 className="font-semibold text-orange-800 mb-2">
            Unknown Specialized Type
          </h3>
          <p className="text-orange-600 text-sm">
            No form available for subtype: {commercialSubtype || "none"}
          </p>
        </div>
      </div>
    );
  }

  return <Component />;
}
