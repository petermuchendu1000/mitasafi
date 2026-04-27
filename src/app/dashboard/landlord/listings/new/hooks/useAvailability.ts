/**
 * Availability Hooks
 * 
 * React hooks for managing property availability state and validation.
 * Implements recommendations for real-time updates and caching.
 */

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  // Types
  AvailabilityStatus,
  VacancyRisk,
  AvailabilityData,
  ValidationResult,
  PropertyStatus,
  Booking,
  
  // Status functions
  getAvailabilityStatus,
  isAvailableNow,
  isAvailableSoon,
  isUpcoming,
  
  // Time calculations
  getDaysUntilAvailable,
  getWeeksUntilAvailable,
  getMonthsUntilAvailable,
  isWithinDays,
  
  // Scheduling
  calculateMoveInDate,
  getEarliestAvailableDate,
  suggestAvailabilityDate,
  
  // Lease calculations
  calculateLeaseEndDate,
  isLeaseExpiringSoon,
  getLeaseRemainingDays,
  
  // Vacancy
  getVacancyRisk,
  estimateVacancyLoss,
  
  // Transitions
  canTransitionTo,
  getValidTransitions,
  
  // Validation
  validateAvailabilityData,
  validateDateRange,
  validateLeaseTerms,
  
  // Scheduling conflicts
  hasSchedulingConflict,
  findNextAvailableSlot,
  
  // Date utils
  isValidAvailabilityDate,
  formatAvailabilityDate,
  parseAvailabilityDate,
  getDateDaysFromNow,
  
  // Constants
  MIN_NOTICE_DAYS,
  SOON_THRESHOLD_DAYS,
  VACANCY_WARNING_DAYS,
} from "../availability-utils";

// =============================================================================
// TYPES
// =============================================================================

export interface UseAvailabilityOptions {
  autoValidate?: boolean;
  debounceMs?: number;
  onStatusChange?: (status: AvailabilityStatus) => void;
  onValidationChange?: (validation: ValidationResult) => void;
}

export interface UseAvailabilityReturn {
  // Status
  status: AvailabilityStatus;
  isAvailable: boolean;
  isSoon: boolean;
  isUpcoming: boolean;
  
  // Time info
  daysUntil: number;
  weeksUntil: number;
  monthsUntil: number;
  formattedDate: string;
  
  // Risk assessment
  vacancyRisk: VacancyRisk;
  
  // Validation
  validation: ValidationResult;
  isValid: boolean;
  
  // Actions
  setAvailableFrom: (date: string | null) => void;
  setAvailableNow: (now: boolean) => void;
  setCurrentStatus: (status: "vacant" | "occupied") => void;
  suggestDate: (type: "long_term" | "short_term" | "immediate") => string;
  validate: () => ValidationResult;
}

export interface UseLeaseReturn {
  // Calculated values
  endDate: string | null;
  remainingDays: number | null;
  isExpiringSoon: boolean;
  
  // Actions
  calculateEndDate: (startDate: string, durationMonths: number) => string;
  setLeaseEndDate: (date: string | null) => void;
  
  // Validation
  validation: ValidationResult;
  validateTerms: (startDate: string, durationMonths: number, minDuration: number) => ValidationResult;
}

export interface UseSchedulingReturn {
  // Scheduling
  earliestMoveIn: string;
  suggestedDate: string;
  
  // Conflict detection
  hasConflict: boolean;
  nextAvailableSlot: { startDate: string; endDate: string } | null;
  
  // Actions
  checkConflict: (startDate: string, endDate: string) => boolean;
  findNextSlot: (preferredStart: string, durationDays: number) => { startDate: string; endDate: string };
  addBooking: (booking: Booking) => void;
  removeBooking: (index: number) => void;
  clearBookings: () => void;
}

export interface UseStatusTransitionReturn {
  currentStatus: PropertyStatus;
  validTransitions: PropertyStatus[];
  canTransition: (to: PropertyStatus) => boolean;
  transition: (to: PropertyStatus) => boolean;
  history: Array<{ from: PropertyStatus; to: PropertyStatus; timestamp: Date }>;
}

// =============================================================================
// CACHE FOR AVAILABILITY DATA
// =============================================================================

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class AvailabilityCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private ttlMs: number;

  constructor(ttlMs: number = 5 * 60 * 1000) { // 5 minute default
    this.ttlMs = ttlMs;
  }

  get(key: string): T | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;
    
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }
    
    return entry.value;
  }

  set(key: string, value: T): void {
    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}

// Global cache instance
const availabilityCache = new AvailabilityCache<AvailabilityStatus>();
const validationCache = new AvailabilityCache<ValidationResult>();

// =============================================================================
// MAIN AVAILABILITY HOOK
// =============================================================================

/**
 * Hook for managing availability state and validation
 */
export function useAvailability(
  initialData: Partial<AvailabilityData> = {},
  options: UseAvailabilityOptions = {}
): UseAvailabilityReturn {
  const {
    autoValidate = true,
    debounceMs = 300,
    onStatusChange,
    onValidationChange,
  } = options;

  // State
  const [data, setData] = useState<AvailabilityData>({
    availableFrom: initialData.availableFrom ?? null,
    availableNow: initialData.availableNow ?? true,
    currentStatus: initialData.currentStatus ?? "vacant",
    leaseEndDate: initialData.leaseEndDate ?? null,
  });

  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: {},
  });

  // Refs for debouncing
  const validationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized calculations
  const status = useMemo(() => {
    const cacheKey = JSON.stringify(data);
    const cached = availabilityCache.get(cacheKey);
    if (cached) return cached;
    
    const result = getAvailabilityStatus(data);
    availabilityCache.set(cacheKey, result);
    return result;
  }, [data]);

  const isAvailable = useMemo(() => isAvailableNow(data), [data]);
  const isSoon = useMemo(() => isAvailableSoon(data), [data]);
  const isUpcomingStatus = useMemo(() => isUpcoming(data), [data]);
  
  const daysUntil = useMemo(() => getDaysUntilAvailable(data), [data]);
  const weeksUntil = useMemo(() => getWeeksUntilAvailable(data), [data]);
  const monthsUntil = useMemo(() => getMonthsUntilAvailable(data), [data]);
  
  const formattedDate = useMemo(
    () => formatAvailabilityDate(data.availableFrom),
    [data.availableFrom]
  );
  
  const vacancyRisk = useMemo(() => getVacancyRisk(data), [data]);

  // Validation function
  const validate = useCallback((): ValidationResult => {
    const cacheKey = `validation:${JSON.stringify(data)}`;
    const cached = validationCache.get(cacheKey);
    if (cached) return cached;
    
    const result = validateAvailabilityData(data);
    validationCache.set(cacheKey, result);
    return result;
  }, [data]);

  // Debounced validation
  useEffect(() => {
    if (!autoValidate) return;

    if (validationTimeoutRef.current) {
      clearTimeout(validationTimeoutRef.current);
    }

    validationTimeoutRef.current = setTimeout(() => {
      const result = validate();
      setValidation(result);
      onValidationChange?.(result);
    }, debounceMs);

    return () => {
      if (validationTimeoutRef.current) {
        clearTimeout(validationTimeoutRef.current);
      }
    };
  }, [data, autoValidate, debounceMs, validate, onValidationChange]);

  // Notify on status change
  useEffect(() => {
    onStatusChange?.(status);
  }, [status, onStatusChange]);

  // Actions
  const setAvailableFrom = useCallback((date: string | null) => {
    setData((prev) => ({ ...prev, availableFrom: date }));
    availabilityCache.clear();
    validationCache.clear();
  }, []);

  const setAvailableNow = useCallback((now: boolean) => {
    setData((prev) => ({ ...prev, availableNow: now }));
    availabilityCache.clear();
    validationCache.clear();
  }, []);

  const setCurrentStatus = useCallback((status: "vacant" | "occupied") => {
    setData((prev) => ({ ...prev, currentStatus: status }));
    availabilityCache.clear();
    validationCache.clear();
  }, []);

  const suggestDate = useCallback((type: "long_term" | "short_term" | "immediate") => {
    return suggestAvailabilityDate(type);
  }, []);

  return {
    status,
    isAvailable,
    isSoon,
    isUpcoming: isUpcomingStatus,
    daysUntil,
    weeksUntil,
    monthsUntil,
    formattedDate,
    vacancyRisk,
    validation,
    isValid: validation.isValid,
    setAvailableFrom,
    setAvailableNow,
    setCurrentStatus,
    suggestDate,
    validate,
  };
}

// =============================================================================
// LEASE MANAGEMENT HOOK
// =============================================================================

/**
 * Hook for managing lease dates and calculations
 */
export function useLease(
  initialEndDate: string | null = null
): UseLeaseReturn {
  const [leaseEndDate, setLeaseEndDate] = useState<string | null>(initialEndDate);
  const [validation, setValidation] = useState<ValidationResult>({
    isValid: true,
    errors: {},
  });

  const remainingDays = useMemo(() => {
    if (!leaseEndDate) return null;
    return getLeaseRemainingDays({ leaseEndDate });
  }, [leaseEndDate]);

  const isExpiringSoon = useMemo(() => {
    if (!leaseEndDate) return false;
    return isLeaseExpiringSoon({ leaseEndDate }, VACANCY_WARNING_DAYS);
  }, [leaseEndDate]);

  const calculateEndDateFn = useCallback((startDate: string, durationMonths: number) => {
    return calculateLeaseEndDate(startDate, durationMonths);
  }, []);

  const validateTerms = useCallback(
    (startDate: string, durationMonths: number, minDuration: number) => {
      const result = validateLeaseTerms({
        startDate,
        durationMonths,
        minDurationMonths: minDuration,
      });
      setValidation(result);
      return result;
    },
    []
  );

  return {
    endDate: leaseEndDate,
    remainingDays,
    isExpiringSoon,
    calculateEndDate: calculateEndDateFn,
    setLeaseEndDate,
    validation,
    validateTerms,
  };
}

// =============================================================================
// SCHEDULING HOOK
// =============================================================================

/**
 * Hook for managing scheduling and conflict detection
 */
export function useScheduling(
  listingData: Partial<AvailabilityData> = {},
  initialBookings: Booking[] = []
): UseSchedulingReturn {
  const [bookings, setBookings] = useState<Booking[]>(initialBookings);
  const [proposedRange, setProposedRange] = useState<{ start: string; end: string } | null>(null);

  const earliestMoveIn = useMemo(
    () => getEarliestAvailableDate(listingData, MIN_NOTICE_DAYS),
    [listingData]
  );

  const suggestedDate = useMemo(
    () => calculateMoveInDate(MIN_NOTICE_DAYS),
    []
  );

  const hasConflict = useMemo(() => {
    if (!proposedRange) return false;
    return hasSchedulingConflict(proposedRange.start, proposedRange.end, bookings);
  }, [proposedRange, bookings]);

  const nextAvailableSlot = useMemo(() => {
    if (bookings.length === 0) return null;
    return findNextAvailableSlot(getDateDaysFromNow(0), 30, bookings);
  }, [bookings]);

  const checkConflict = useCallback(
    (startDate: string, endDate: string) => {
      setProposedRange({ start: startDate, end: endDate });
      return hasSchedulingConflict(startDate, endDate, bookings);
    },
    [bookings]
  );

  const findNextSlot = useCallback(
    (preferredStart: string, durationDays: number) => {
      return findNextAvailableSlot(preferredStart, durationDays, bookings);
    },
    [bookings]
  );

  const addBooking = useCallback((booking: Booking) => {
    setBookings((prev) => [...prev, booking]);
  }, []);

  const removeBooking = useCallback((index: number) => {
    setBookings((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearBookings = useCallback(() => {
    setBookings([]);
  }, []);

  return {
    earliestMoveIn,
    suggestedDate,
    hasConflict,
    nextAvailableSlot,
    checkConflict,
    findNextSlot,
    addBooking,
    removeBooking,
    clearBookings,
  };
}

// =============================================================================
// STATUS TRANSITION HOOK
// =============================================================================

/**
 * Hook for managing status transitions with history tracking
 */
export function useStatusTransition(
  initialStatus: PropertyStatus = "vacant"
): UseStatusTransitionReturn {
  const [currentStatus, setCurrentStatus] = useState<PropertyStatus>(initialStatus);
  const [history, setHistory] = useState<
    Array<{ from: PropertyStatus; to: PropertyStatus; timestamp: Date }>
  >([]);

  const validTransitions = useMemo(
    () => getValidTransitions(currentStatus),
    [currentStatus]
  );

  const canTransition = useCallback(
    (to: PropertyStatus) => canTransitionTo(currentStatus, to),
    [currentStatus]
  );

  const transition = useCallback(
    (to: PropertyStatus) => {
      if (!canTransitionTo(currentStatus, to)) {
        return false;
      }

      setHistory((prev) => [
        ...prev,
        { from: currentStatus, to, timestamp: new Date() },
      ]);
      setCurrentStatus(to);
      return true;
    },
    [currentStatus]
  );

  return {
    currentStatus,
    validTransitions,
    canTransition,
    transition,
    history,
  };
}

// =============================================================================
// VACANCY ANALYTICS HOOK
// =============================================================================

export interface VacancyAnalytics {
  currentVacancyDays: number;
  estimatedLoss: number;
  risk: VacancyRisk;
  suggestion: string;
}

/**
 * Hook for vacancy analytics and recommendations
 */
export function useVacancyAnalytics(
  listing: Partial<AvailabilityData>,
  monthlyRent: number
): VacancyAnalytics {
  return useMemo(() => {
    const daysUntil = getDaysUntilAvailable(listing);
    const loss = estimateVacancyLoss(monthlyRent, daysUntil);
    const risk = getVacancyRisk(listing);
    
    let suggestion = "";
    switch (risk) {
      case VacancyRisk.HIGH:
        suggestion = "Consider reducing rent or improving listing visibility. Property has been vacant for an extended period.";
        break;
      case VacancyRisk.MEDIUM:
        suggestion = "Review pricing and marketing strategy. Consider professional photos or virtual tours.";
        break;
      case VacancyRisk.LOW:
        suggestion = "Property is on track. Continue current marketing efforts.";
        break;
    }
    
    return {
      currentVacancyDays: daysUntil,
      estimatedLoss: loss,
      risk,
      suggestion,
    };
  }, [listing, monthlyRent]);
}

// =============================================================================
// DATE INPUT HOOK
// =============================================================================

export interface UseDateInputReturn {
  value: string;
  displayValue: string;
  isValid: boolean;
  error: string | null;
  setValue: (value: string) => void;
  clear: () => void;
  setToToday: () => void;
  addDays: (days: number) => void;
}

/**
 * Hook for managing date input with validation
 */
export function useDateInput(initialValue: string | null = null): UseDateInputReturn {
  const [value, setValueInternal] = useState<string>(initialValue || "");
  const [error, setError] = useState<string | null>(null);

  const isValid = useMemo(() => {
    if (!value) return true; // Empty is valid (optional)
    return isValidAvailabilityDate(value);
  }, [value]);

  const displayValue = useMemo(() => {
    if (!value) return "";
    return formatAvailabilityDate(value);
  }, [value]);

  useEffect(() => {
    if (value && !isValid) {
      setError("Invalid date format. Use YYYY-MM-DD");
    } else {
      setError(null);
    }
  }, [value, isValid]);

  const setValue = useCallback((newValue: string) => {
    setValueInternal(newValue);
  }, []);

  const clear = useCallback(() => {
    setValueInternal("");
    setError(null);
  }, []);

  const setToToday = useCallback(() => {
    setValueInternal(getDateDaysFromNow(0));
  }, []);

  const addDays = useCallback((days: number) => {
    if (!value || !isValid) {
      setValueInternal(getDateDaysFromNow(days));
    } else {
      const currentDate = parseAvailabilityDate(value);
      if (currentDate) {
        currentDate.setDate(currentDate.getDate() + days);
        const year = currentDate.getFullYear();
        const month = String(currentDate.getMonth() + 1).padStart(2, "0");
        const day = String(currentDate.getDate()).padStart(2, "0");
        setValueInternal(`${year}-${month}-${day}`);
      }
    }
  }, [value, isValid]);

  return {
    value,
    displayValue,
    isValid,
    error,
    setValue,
    clear,
    setToToday,
    addDays,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export {
  // Re-export types
  AvailabilityStatus,
  VacancyRisk,
  
  // Re-export constants
  MIN_NOTICE_DAYS,
  SOON_THRESHOLD_DAYS,
  VACANCY_WARNING_DAYS,
};

export default {
  useAvailability,
  useLease,
  useScheduling,
  useStatusTransition,
  useVacancyAnalytics,
  useDateInput,
};
