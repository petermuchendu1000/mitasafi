/**
 * Shared Hooks
 * 
 * Centralized exports for all wizard hooks.
 */

// Commercial hooks
export { useCommercialForm, useCommercialSubtype } from "./useCommercialForm";
export type { UseCommercialFormReturn, UseCommercialSubtypeReturn } from "./useCommercialForm";

// Residential hooks
export { useResidentialForm, usePropertyType } from "./useResidentialForm";
export type { UseResidentialFormReturn, UsePropertyTypeReturn } from "./useResidentialForm";

// Optimized validation hooks
export { useOptimizedValidation, useCachedValidation } from "./useOptimizedValidation";

// Availability hooks
export {
  useAvailability,
  useLease,
  useScheduling,
  useStatusTransition,
  useVacancyAnalytics,
  useDateInput,
  AvailabilityStatus,
  VacancyRisk,
  MIN_NOTICE_DAYS,
  SOON_THRESHOLD_DAYS,
  VACANCY_WARNING_DAYS,
} from "./useAvailability";
export type {
  UseAvailabilityOptions,
  UseAvailabilityReturn,
  UseLeaseReturn,
  UseSchedulingReturn,
  UseStatusTransitionReturn,
  VacancyAnalytics,
  UseDateInputReturn,
} from "./useAvailability";

// Reliability hooks
export {
  useRetry,
  useCircuitBreaker,
  useSafeAsync,
  useDataRecovery,
  useGracefulDegradation,
  useOnlineStatus,
  useOperationQueue,
  useReliableFetch,
} from "./useReliability";
