/**
 * Availability Utilities
 * 
 * Comprehensive utilities for managing property availability,
 * date validation, status transitions, and vacancy management.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

export const MIN_NOTICE_DAYS = 3;
export const MAX_FUTURE_DAYS = 730; // 2 years
export const SOON_THRESHOLD_DAYS = 14;
export const VACANCY_WARNING_DAYS = 30;

export const AVAILABILITY_CONFIG = {
  minNoticeDays: MIN_NOTICE_DAYS,
  maxFutureDays: MAX_FUTURE_DAYS,
  soonThresholdDays: SOON_THRESHOLD_DAYS,
  vacancyWarningDays: VACANCY_WARNING_DAYS,
  defaultLeaseMonths: 12,
  gracePeriodDays: 7,
} as const;

// =============================================================================
// TYPES & ENUMS
// =============================================================================

export enum AvailabilityStatus {
  AVAILABLE_NOW = "available_now",
  AVAILABLE_SOON = "available_soon",
  UPCOMING = "upcoming",
  OCCUPIED = "occupied",
  RESERVED = "reserved",
}

export enum VacancyRisk {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
}

export type PropertyStatus = "vacant" | "occupied" | "reserved" | "notice_given";

export interface AvailabilityData {
  availableFrom: string | null;
  availableNow: boolean;
  currentStatus: "vacant" | "occupied";
  leaseEndDate?: string | null;
}

export interface Booking {
  startDate: string;
  endDate: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

export interface LeaseTerms {
  startDate: string;
  durationMonths: number;
  minDurationMonths: number;
}

export interface TimeSlot {
  startDate: string;
  endDate: string;
}

// =============================================================================
// STATUS TRANSITIONS
// =============================================================================

export const AVAILABILITY_TRANSITIONS: Record<PropertyStatus, PropertyStatus[]> = {
  vacant: ["occupied", "reserved"],
  occupied: ["vacant", "notice_given"],
  reserved: ["occupied", "vacant"],
  notice_given: ["vacant"],
};

// =============================================================================
// DATE VALIDATION FUNCTIONS
// =============================================================================

/**
 * Check if a string is a valid ISO date (YYYY-MM-DD)
 */
export function isValidAvailabilityDate(date: string | null | undefined): boolean {
  if (!date || typeof date !== "string" || date.trim() === "") {
    return false;
  }

  // Check format YYYY-MM-DD
  const isoPattern = /^\d{4}-\d{2}-\d{2}$/;
  if (!isoPattern.test(date)) {
    return false;
  }

  // Parse and validate the date
  const parsed = new Date(date + "T00:00:00");
  if (isNaN(parsed.getTime())) {
    return false;
  }

  // Check if the date components match (catches invalid dates like Feb 30)
  const [year, month, day] = date.split("-").map(Number);
  return (
    parsed.getFullYear() === year &&
    parsed.getMonth() + 1 === month &&
    parsed.getDate() === day
  );
}

/**
 * Check if a date is in the future (after today)
 */
export function isDateInFuture(date: string): boolean {
  if (!isValidAvailabilityDate(date)) return false;
  const parsed = parseAvailabilityDate(date);
  if (!parsed) return false;
  
  const today = getStartOfDay(new Date());
  return parsed > today;
}

/**
 * Check if a date is today
 */
export function isDateToday(date: string): boolean {
  if (!isValidAvailabilityDate(date)) return false;
  const parsed = parseAvailabilityDate(date);
  if (!parsed) return false;
  
  const today = getStartOfDay(new Date());
  return parsed.getTime() === today.getTime();
}

/**
 * Check if a date is in the past
 */
export function isDateInPast(date: string): boolean {
  if (!isValidAvailabilityDate(date)) return false;
  const parsed = parseAvailabilityDate(date);
  if (!parsed) return false;
  
  const today = getStartOfDay(new Date());
  return parsed < today;
}

/**
 * Get a date string N days from now
 */
export function getDateDaysFromNow(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDateToISO(date);
}

/**
 * Format a date string for display
 */
export function formatAvailabilityDate(date: string | null | undefined): string {
  if (!date || !isValidAvailabilityDate(date)) {
    return "Invalid Date";
  }
  
  const parsed = parseAvailabilityDate(date);
  if (!parsed) return "Invalid Date";
  
  const today = getStartOfDay(new Date());
  if (parsed <= today) {
    return "Immediately";
  }
  
  return parsed.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Parse a date string to a Date object
 */
export function parseAvailabilityDate(date: string | null | undefined): Date | null {
  if (!date || !isValidAvailabilityDate(date)) {
    return null;
  }
  
  // Parse as local date to avoid timezone issues
  const [year, month, day] = date.split("-").map(Number);
  return new Date(year, month - 1, day);
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

function getStartOfDay(date: Date): Date {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDateToISO(date: Date): string {
  // Use local date components to avoid timezone issues
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function daysBetween(date1: Date, date2: Date): number {
  const diffTime = date2.getTime() - date1.getTime();
  return Math.round(diffTime / (1000 * 60 * 60 * 24));
}

// =============================================================================
// AVAILABILITY STATUS FUNCTIONS
// =============================================================================

/**
 * Get the availability status of a listing
 */
export function getAvailabilityStatus(listing: Partial<AvailabilityData>): AvailabilityStatus {
  const { availableFrom, availableNow, currentStatus } = listing;
  
  // Check if available now
  if (availableNow && currentStatus === "vacant") {
    return AvailabilityStatus.AVAILABLE_NOW;
  }
  
  // Check availableFrom date
  if (availableFrom) {
    if (!isDateInFuture(availableFrom)) {
      return AvailabilityStatus.AVAILABLE_NOW;
    }
    
    const days = getDaysUntilDate(availableFrom);
    if (days <= SOON_THRESHOLD_DAYS) {
      return AvailabilityStatus.AVAILABLE_SOON;
    }
    
    return AvailabilityStatus.UPCOMING;
  }
  
  // Occupied with no future date
  if (currentStatus === "occupied" || availableNow === false) {
    return AvailabilityStatus.OCCUPIED;
  }
  
  return AvailabilityStatus.AVAILABLE_NOW;
}

/**
 * Check if a property is available now
 */
export function isAvailableNow(listing: Partial<AvailabilityData>): boolean {
  if (listing.availableNow) return true;
  
  if (listing.availableFrom) {
    return !isDateInFuture(listing.availableFrom);
  }
  
  return listing.currentStatus === "vacant";
}

/**
 * Check if a property is available soon (within threshold)
 */
export function isAvailableSoon(listing: Partial<AvailabilityData>): boolean {
  if (isAvailableNow(listing)) return false;
  
  if (listing.availableFrom) {
    const days = getDaysUntilDate(listing.availableFrom);
    return days > 0 && days <= SOON_THRESHOLD_DAYS;
  }
  
  return false;
}

/**
 * Check if availability is upcoming (beyond soon threshold)
 */
export function isUpcoming(listing: Partial<AvailabilityData>): boolean {
  if (isAvailableNow(listing) || isAvailableSoon(listing)) return false;
  
  if (listing.availableFrom) {
    const days = getDaysUntilDate(listing.availableFrom);
    return days > SOON_THRESHOLD_DAYS;
  }
  
  return false;
}

function getDaysUntilDate(date: string): number {
  const parsed = parseAvailabilityDate(date);
  if (!parsed) return 0;
  
  const today = getStartOfDay(new Date());
  const days = daysBetween(today, parsed);
  return Math.max(0, days);
}

// =============================================================================
// STATUS TRANSITIONS
// =============================================================================

/**
 * Check if a status transition is valid
 */
export function canTransitionTo(from: PropertyStatus, to: PropertyStatus): boolean {
  const validTransitions = AVAILABILITY_TRANSITIONS[from];
  return validTransitions?.includes(to) ?? false;
}

/**
 * Get all valid transitions from a status
 */
export function getValidTransitions(from: PropertyStatus): PropertyStatus[] {
  return AVAILABILITY_TRANSITIONS[from] || [];
}

// =============================================================================
// SCHEDULING FUNCTIONS
// =============================================================================

/**
 * Calculate move-in date based on notice period
 */
export function calculateMoveInDate(noticeDays: number = MIN_NOTICE_DAYS): string {
  return getDateDaysFromNow(noticeDays);
}

/**
 * Get the earliest available date for a listing
 */
export function getEarliestAvailableDate(
  listing: Partial<AvailabilityData>,
  minNoticeDays: number = 0
): string {
  const today = formatDateToISO(new Date());
  
  if (listing.currentStatus === "vacant" && !listing.availableFrom) {
    if (minNoticeDays > 0) {
      return getDateDaysFromNow(minNoticeDays);
    }
    return today;
  }
  
  if (listing.availableFrom) {
    const availableDate = parseAvailabilityDate(listing.availableFrom);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + minNoticeDays);
    
    if (availableDate && availableDate >= minDate) {
      return listing.availableFrom;
    }
    
    return formatDateToISO(minDate);
  }
  
  return today;
}

/**
 * Suggest an availability date based on rental type
 */
export function suggestAvailabilityDate(type: "long_term" | "short_term" | "immediate"): string {
  if (type === "immediate") {
    return getDateDaysFromNow(0);
  }
  
  if (type === "short_term") {
    return getDateDaysFromNow(7);
  }
  
  // Long term: first of next month (or first of month after if we're close to end of month)
  const today = new Date();
  let targetMonth = today.getMonth() + 1; // Next month
  let targetYear = today.getFullYear();
  
  // If we're past the 25th, suggest first of month after next
  if (today.getDate() > 25) {
    targetMonth += 1;
  }
  
  // Handle year rollover
  while (targetMonth > 11) {
    targetMonth = targetMonth - 12;
    targetYear += 1;
  }
  
  // Create date as first of target month
  const nextMonthFirst = new Date(targetYear, targetMonth, 1);
  return formatDateToISO(nextMonthFirst);
}

// =============================================================================
// TIME CALCULATION FUNCTIONS
// =============================================================================

/**
 * Get days until a property is available
 */
export function getDaysUntilAvailable(listing: Partial<AvailabilityData>): number {
  if (listing.availableNow || !listing.availableFrom) {
    return 0;
  }
  
  return getDaysUntilDate(listing.availableFrom);
}

/**
 * Get weeks until a property is available
 */
export function getWeeksUntilAvailable(listing: Partial<AvailabilityData>): number {
  const days = getDaysUntilAvailable(listing);
  return Math.floor(days / 7);
}

/**
 * Get months until a property is available
 */
export function getMonthsUntilAvailable(listing: Partial<AvailabilityData>): number {
  const days = getDaysUntilAvailable(listing);
  return Math.floor(days / 30);
}

/**
 * Check if property is available within N days
 */
export function isWithinDays(listing: Partial<AvailabilityData>, days: number): boolean {
  if (isAvailableNow(listing)) return true;
  
  const daysUntil = getDaysUntilAvailable(listing);
  return daysUntil <= days;
}

// =============================================================================
// LEASE CALCULATION FUNCTIONS
// =============================================================================

/**
 * Calculate lease end date
 */
export function calculateLeaseEndDate(startDate: string, durationMonths: number): string {
  const start = parseAvailabilityDate(startDate);
  if (!start) return startDate;
  
  const endDate = new Date(start);
  endDate.setMonth(endDate.getMonth() + durationMonths);
  
  return formatDateToISO(endDate);
}

/**
 * Check if a lease is expiring soon
 */
export function isLeaseExpiringSoon(
  listing: Partial<AvailabilityData>,
  thresholdDays: number = VACANCY_WARNING_DAYS
): boolean {
  const { leaseEndDate } = listing;
  if (!leaseEndDate) return false;
  
  const days = getDaysUntilDate(leaseEndDate);
  return days > 0 && days <= thresholdDays;
}

/**
 * Get remaining days on a lease
 */
export function getLeaseRemainingDays(listing: Partial<AvailabilityData>): number | null {
  const { leaseEndDate } = listing;
  if (!leaseEndDate) return null;
  
  const days = getDaysUntilDate(leaseEndDate);
  return Math.max(0, days);
}

// =============================================================================
// VACANCY MANAGEMENT FUNCTIONS
// =============================================================================

/**
 * Calculate vacancy period between tenants
 */
export function calculateVacancyPeriod(moveOutDate: string, moveInDate: string): number {
  const out = parseAvailabilityDate(moveOutDate);
  const inn = parseAvailabilityDate(moveInDate);
  
  if (!out || !inn) return 0;
  
  return Math.max(0, daysBetween(out, inn));
}

/**
 * Estimate revenue loss from vacancy
 */
export function estimateVacancyLoss(monthlyRent: number, vacancyDays: number): number {
  const dailyRent = monthlyRent / 30;
  return Math.round(dailyRent * vacancyDays);
}

/**
 * Get vacancy risk level
 */
export function getVacancyRisk(listing: Partial<AvailabilityData>): VacancyRisk {
  // If property has been vacant for a while
  if (listing.currentStatus === "vacant" && listing.availableFrom) {
    const availDate = parseAvailabilityDate(listing.availableFrom);
    if (availDate) {
      const today = getStartOfDay(new Date());
      const daysSinceAvailable = daysBetween(availDate, today);
      
      if (daysSinceAvailable >= 60) return VacancyRisk.HIGH;
      if (daysSinceAvailable >= 30) return VacancyRisk.MEDIUM;
    }
  }
  
  // If available soon or upcoming
  if (isAvailableSoon(listing)) return VacancyRisk.LOW;
  if (listing.currentStatus === "vacant") return VacancyRisk.MEDIUM;
  
  return VacancyRisk.LOW;
}

// =============================================================================
// SCHEDULING CONFLICT FUNCTIONS
// =============================================================================

/**
 * Check if a date range has conflicts with existing bookings
 */
export function hasSchedulingConflict(
  startDate: string,
  endDate: string,
  bookings: Booking[]
): boolean {
  return getOverlappingBookings(startDate, endDate, bookings).length > 0;
}

/**
 * Get all bookings that overlap with a date range
 */
export function getOverlappingBookings(
  startDate: string,
  endDate: string,
  bookings: Booking[]
): Booking[] {
  const start = parseAvailabilityDate(startDate);
  const end = parseAvailabilityDate(endDate);
  
  if (!start || !end) return [];
  
  return bookings.filter((booking) => {
    const bookingStart = parseAvailabilityDate(booking.startDate);
    const bookingEnd = parseAvailabilityDate(booking.endDate);
    
    if (!bookingStart || !bookingEnd) return false;
    
    // Check for overlap (exclusive of end dates)
    return start < bookingEnd && end > bookingStart;
  });
}

/**
 * Find the next available time slot
 */
export function findNextAvailableSlot(
  preferredStart: string,
  durationDays: number,
  bookings: Booking[]
): TimeSlot {
  if (bookings.length === 0) {
    return {
      startDate: preferredStart,
      endDate: getDateDaysFromNow(
        daysBetween(getStartOfDay(new Date()), parseAvailabilityDate(preferredStart)!) + durationDays
      ),
    };
  }
  
  // Sort bookings by start date
  const sorted = [...bookings].sort((a, b) => 
    new Date(a.startDate).getTime() - new Date(b.startDate).getTime()
  );
  
  let currentDate = parseAvailabilityDate(preferredStart)!;
  
  for (const booking of sorted) {
    const bookingStart = parseAvailabilityDate(booking.startDate)!;
    const bookingEnd = parseAvailabilityDate(booking.endDate)!;
    
    // Check if there's a gap before this booking
    const gapDays = daysBetween(currentDate, bookingStart);
    if (gapDays >= durationDays) {
      return {
        startDate: formatDateToISO(currentDate),
        endDate: formatDateToISO(new Date(currentDate.getTime() + durationDays * 24 * 60 * 60 * 1000)),
      };
    }
    
    // Move past this booking
    if (bookingEnd > currentDate) {
      currentDate = new Date(bookingEnd.getTime() + 24 * 60 * 60 * 1000); // Day after booking ends
    }
  }
  
  // No conflicts found after last booking
  return {
    startDate: formatDateToISO(currentDate),
    endDate: formatDateToISO(new Date(currentDate.getTime() + durationDays * 24 * 60 * 60 * 1000)),
  };
}

// =============================================================================
// BULK OPERATIONS
// =============================================================================

/**
 * Filter listings that are available now
 */
export function getAvailableListings<T extends Partial<AvailabilityData>>(listings: T[]): T[] {
  return listings.filter(isAvailableNow);
}

/**
 * Get listings that will be available within N days
 */
export function getUpcomingAvailability<T extends Partial<AvailabilityData>>(
  listings: T[],
  withinDays: number
): T[] {
  return listings.filter((listing) => isWithinDays(listing, withinDays));
}

/**
 * Group listings by their availability month
 */
export function groupByAvailabilityMonth<T extends Partial<AvailabilityData>>(
  listings: T[]
): Record<string, T[]> {
  const groups: Record<string, T[]> = {};
  
  for (const listing of listings) {
    let key: string;
    
    if (isAvailableNow(listing)) {
      key = "Now";
    } else if (listing.availableFrom) {
      const date = parseAvailabilityDate(listing.availableFrom);
      if (date) {
        key = date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
      } else {
        key = "Unknown";
      }
    } else {
      key = "Unknown";
    }
    
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(listing);
  }
  
  return groups;
}

// =============================================================================
// VALIDATION FUNCTIONS
// =============================================================================

/**
 * Validate availability data
 */
export function validateAvailabilityData(data: Partial<AvailabilityData>): ValidationResult {
  const errors: Record<string, string> = {};
  
  // Check for inconsistency: availableNow with future date
  if (data.availableNow && data.availableFrom && isDateInFuture(data.availableFrom)) {
    errors.availableNow = "Cannot be marked as available now with a future availability date";
  }
  
  // Occupied must have availability date
  if (data.currentStatus === "occupied" && !data.availableNow && !data.availableFrom) {
    errors.availableFrom = "Occupied properties must have an availability date";
  }
  
  // Check date validity
  if (data.availableFrom) {
    if (!isValidAvailabilityDate(data.availableFrom)) {
      errors.availableFrom = "Invalid date format";
    } else {
      const days = getDaysUntilDate(data.availableFrom);
      if (days > MAX_FUTURE_DAYS) {
        errors.availableFrom = `Date is too far in the future (max ${MAX_FUTURE_DAYS} days)`;
      }
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate a date range
 */
export function validateDateRange(startDate: string, endDate: string): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!isValidAvailabilityDate(startDate)) {
    errors.startDate = "Invalid start date";
  }
  
  if (!isValidAvailabilityDate(endDate)) {
    errors.endDate = "Invalid end date";
  }
  
  if (Object.keys(errors).length === 0) {
    const start = parseAvailabilityDate(startDate)!;
    const end = parseAvailabilityDate(endDate)!;
    
    if (end < start) {
      errors.endDate = "End date cannot be before start date";
    }
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Validate lease terms
 */
export function validateLeaseTerms(terms: LeaseTerms): ValidationResult {
  const errors: Record<string, string> = {};
  
  if (!isValidAvailabilityDate(terms.startDate)) {
    errors.startDate = "Invalid start date";
  } else if (isDateInPast(terms.startDate)) {
    errors.startDate = "Start date cannot be in the past";
  }
  
  if (terms.durationMonths < terms.minDurationMonths) {
    errors.durationMonths = `Duration must be at least ${terms.minDurationMonths} months (minimum required)`;
  }
  
  if (terms.durationMonths < 1) {
    errors.durationMonths = "Duration must be at least 1 month";
  }
  
  if (terms.durationMonths > 120) {
    errors.durationMonths = "Duration cannot exceed 120 months (10 years)";
  }
  
  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

// =============================================================================
// EXPORTS
// =============================================================================

export default {
  // Configuration
  AVAILABILITY_CONFIG,
  MIN_NOTICE_DAYS,
  MAX_FUTURE_DAYS,
  SOON_THRESHOLD_DAYS,
  
  // Enums
  AvailabilityStatus,
  VacancyRisk,
  
  // Date validation
  isValidAvailabilityDate,
  isDateInFuture,
  isDateToday,
  isDateInPast,
  getDateDaysFromNow,
  formatAvailabilityDate,
  parseAvailabilityDate,
  
  // Status
  getAvailabilityStatus,
  isAvailableNow,
  isAvailableSoon,
  isUpcoming,
  
  // Transitions
  canTransitionTo,
  getValidTransitions,
  AVAILABILITY_TRANSITIONS,
  
  // Scheduling
  calculateMoveInDate,
  getEarliestAvailableDate,
  suggestAvailabilityDate,
  
  // Time calculations
  getDaysUntilAvailable,
  getWeeksUntilAvailable,
  getMonthsUntilAvailable,
  isWithinDays,
  
  // Lease
  calculateLeaseEndDate,
  isLeaseExpiringSoon,
  getLeaseRemainingDays,
  
  // Vacancy
  calculateVacancyPeriod,
  estimateVacancyLoss,
  getVacancyRisk,
  
  // Scheduling conflicts
  hasSchedulingConflict,
  getOverlappingBookings,
  findNextAvailableSlot,
  
  // Bulk
  getAvailableListings,
  getUpcomingAvailability,
  groupByAvailabilityMonth,
  
  // Validation
  validateAvailabilityData,
  validateDateRange,
  validateLeaseTerms,
};
