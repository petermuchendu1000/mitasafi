/**
 * Specialized Details - Modular Export
 * 
 * Re-exports all specialized subtype components.
 * This architecture enables:
 * - Code splitting per subtype
 * - Independent maintenance
 * - Scalable addition of new types
 */

export { DataCenterDetails } from "./DataCenterDetails";
export { RecordingStudioDetails } from "./RecordingStudioDetails";
export { PhotoStudioDetails } from "./PhotoStudioDetails";
export { GymFitnessDetails } from "./GymFitnessDetails";
export { SalonSpaDetails } from "./SalonSpaDetails";
export { ReligiousFacilityDetails } from "./ReligiousFacilityDetails";
export { BankBranchDetails } from "./BankBranchDetails";
export { AtmSiteDetails } from "./AtmSiteDetails";

// Field configuration types
export type { FieldConfig, SectionConfig } from "./field-configs";
