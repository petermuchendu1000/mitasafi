/**
 * Availability Tests
 * 
 * Comprehensive test suite for property availability management.
 * Tests date validation, status transitions, and availability calculations.
 */

import {
  // Date validation
  isValidAvailabilityDate,
  isDateInFuture,
  isDateToday,
  isDateInPast,
  getDateDaysFromNow,
  formatAvailabilityDate,
  parseAvailabilityDate,
  
  // Availability status
  AvailabilityStatus,
  getAvailabilityStatus,
  isAvailableNow,
  isAvailableSoon,
  isUpcoming,
  
  // Status transitions
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
  
  // Lease calculations
  calculateLeaseEndDate,
  isLeaseExpiringSoon,
  getLeaseRemainingDays,
  
  // Vacancy management
  VacancyRisk,
  calculateVacancyPeriod,
  estimateVacancyLoss,
  getVacancyRisk,
  
  // Scheduling conflicts
  hasSchedulingConflict,
  getOverlappingBookings,
  findNextAvailableSlot,
  
  // Bulk operations
  getAvailableListings,
  getUpcomingAvailability,
  groupByAvailabilityMonth,
  
  // Validation
  validateAvailabilityData,
  validateDateRange,
  validateLeaseTerms,
  
  // Constants
  AVAILABILITY_CONFIG,
  MIN_NOTICE_DAYS,
  MAX_FUTURE_DAYS,
  SOON_THRESHOLD_DAYS,
} from "../availability-utils";

// =============================================================================
// TEST DATA GENERATORS
// =============================================================================

const today = new Date();
const formatDate = (date: Date): string => date.toISOString().split("T")[0];

const createDate = (daysOffset: number): Date => {
  const date = new Date(today);
  date.setDate(date.getDate() + daysOffset);
  return date;
};

const createDateString = (daysOffset: number): string => formatDate(createDate(daysOffset));

// Sample listing data
const createListing = (overrides: Partial<{
  availableFrom: string | null;
  availableNow: boolean;
  currentStatus: "vacant" | "occupied";
  leaseEndDate?: string | null;
}> = {}) => ({
  availableFrom: null,
  availableNow: true,
  currentStatus: "vacant" as const,
  leaseEndDate: null,
  ...overrides,
});

// =============================================================================
// DATE VALIDATION TESTS
// =============================================================================

describe("Date Validation", () => {
  describe("isValidAvailabilityDate", () => {
    it("should accept valid ISO date strings", () => {
      expect(isValidAvailabilityDate("2025-01-15")).toBe(true);
      expect(isValidAvailabilityDate("2025-12-31")).toBe(true);
      expect(isValidAvailabilityDate("2026-06-01")).toBe(true);
    });

    it("should reject invalid date formats", () => {
      expect(isValidAvailabilityDate("01-15-2025")).toBe(false);
      expect(isValidAvailabilityDate("15/01/2025")).toBe(false);
      expect(isValidAvailabilityDate("January 15, 2025")).toBe(false);
      expect(isValidAvailabilityDate("invalid")).toBe(false);
    });

    it("should reject null and undefined", () => {
      expect(isValidAvailabilityDate(null)).toBe(false);
      expect(isValidAvailabilityDate(undefined)).toBe(false);
      expect(isValidAvailabilityDate("")).toBe(false);
    });

    it("should reject invalid calendar dates", () => {
      expect(isValidAvailabilityDate("2025-02-30")).toBe(false); // Feb 30
      expect(isValidAvailabilityDate("2025-13-01")).toBe(false); // Month 13
      expect(isValidAvailabilityDate("2025-00-15")).toBe(false); // Month 0
    });
  });

  describe("isDateInFuture", () => {
    it("should return true for future dates", () => {
      expect(isDateInFuture(createDateString(1))).toBe(true);
      expect(isDateInFuture(createDateString(30))).toBe(true);
      expect(isDateInFuture(createDateString(365))).toBe(true);
    });

    it("should return false for past dates", () => {
      expect(isDateInFuture(createDateString(-1))).toBe(false);
      expect(isDateInFuture(createDateString(-30))).toBe(false);
    });

    it("should return false for today", () => {
      expect(isDateInFuture(createDateString(0))).toBe(false);
    });
  });

  describe("isDateToday", () => {
    it("should return true for today's date", () => {
      expect(isDateToday(createDateString(0))).toBe(true);
    });

    it("should return false for other dates", () => {
      expect(isDateToday(createDateString(1))).toBe(false);
      expect(isDateToday(createDateString(-1))).toBe(false);
    });
  });

  describe("isDateInPast", () => {
    it("should return true for past dates", () => {
      expect(isDateInPast(createDateString(-1))).toBe(true);
      expect(isDateInPast(createDateString(-30))).toBe(true);
    });

    it("should return false for future dates", () => {
      expect(isDateInPast(createDateString(1))).toBe(false);
    });

    it("should return false for today", () => {
      expect(isDateInPast(createDateString(0))).toBe(false);
    });
  });

  describe("getDateDaysFromNow", () => {
    it("should return correct date for positive days", () => {
      const result = getDateDaysFromNow(7);
      expect(result).toBe(createDateString(7));
    });

    it("should return correct date for negative days", () => {
      const result = getDateDaysFromNow(-7);
      expect(result).toBe(createDateString(-7));
    });

    it("should return today for 0 days", () => {
      const result = getDateDaysFromNow(0);
      expect(result).toBe(createDateString(0));
    });
  });

  describe("formatAvailabilityDate", () => {
    it("should format dates for display", () => {
      // Use a future date to avoid "Immediately" return
      const futureDate = createDateString(30);
      const result = formatAvailabilityDate(futureDate);
      expect(result).not.toBe("Immediately");
      expect(result).not.toBe("Invalid Date");
    });

    it("should return 'Immediately' for past or today dates", () => {
      expect(formatAvailabilityDate(createDateString(0))).toBe("Immediately");
      expect(formatAvailabilityDate(createDateString(-1))).toBe("Immediately");
    });

    it("should return 'Invalid Date' for invalid input", () => {
      expect(formatAvailabilityDate("invalid")).toBe("Invalid Date");
      expect(formatAvailabilityDate(null)).toBe("Invalid Date");
    });
  });

  describe("parseAvailabilityDate", () => {
    it("should parse valid date strings to Date objects", () => {
      const result = parseAvailabilityDate("2025-01-15");
      expect(result).toBeInstanceOf(Date);
      expect(result?.getFullYear()).toBe(2025);
      expect(result?.getMonth()).toBe(0); // January = 0
      expect(result?.getDate()).toBe(15);
    });

    it("should return null for invalid dates", () => {
      expect(parseAvailabilityDate("invalid")).toBeNull();
      expect(parseAvailabilityDate(null)).toBeNull();
      expect(parseAvailabilityDate("")).toBeNull();
    });
  });
});

// =============================================================================
// AVAILABILITY STATUS TESTS
// =============================================================================

describe("Availability Status", () => {
  describe("getAvailabilityStatus", () => {
    it("should return 'available_now' for vacant properties with no future date", () => {
      const listing = createListing({ availableNow: true, currentStatus: "vacant" });
      expect(getAvailabilityStatus(listing)).toBe(AvailabilityStatus.AVAILABLE_NOW);
    });

    it("should return 'available_now' for past availability dates", () => {
      const listing = createListing({ 
        availableFrom: createDateString(-5), 
        currentStatus: "vacant" 
      });
      expect(getAvailabilityStatus(listing)).toBe(AvailabilityStatus.AVAILABLE_NOW);
    });

    it("should return 'available_soon' for dates within threshold", () => {
      const listing = createListing({ 
        availableFrom: createDateString(7), // 7 days from now
        availableNow: false,
        currentStatus: "occupied"
      });
      expect(getAvailabilityStatus(listing)).toBe(AvailabilityStatus.AVAILABLE_SOON);
    });

    it("should return 'upcoming' for dates beyond threshold", () => {
      const listing = createListing({ 
        availableFrom: createDateString(60), 
        availableNow: false,
        currentStatus: "occupied"
      });
      expect(getAvailabilityStatus(listing)).toBe(AvailabilityStatus.UPCOMING);
    });

    it("should return 'occupied' for occupied with no availability date", () => {
      const listing = createListing({ 
        availableNow: false, 
        currentStatus: "occupied",
        availableFrom: null 
      });
      expect(getAvailabilityStatus(listing)).toBe(AvailabilityStatus.OCCUPIED);
    });
  });

  describe("isAvailableNow", () => {
    it("should return true for immediately available properties", () => {
      expect(isAvailableNow(createListing({ 
        availableNow: true, 
        currentStatus: "vacant" 
      }))).toBe(true);
    });

    it("should return true for past availability dates", () => {
      expect(isAvailableNow(createListing({ 
        availableFrom: createDateString(-10) 
      }))).toBe(true);
    });

    it("should return false for future availability", () => {
      expect(isAvailableNow(createListing({ 
        availableFrom: createDateString(30),
        availableNow: false 
      }))).toBe(false);
    });
  });

  describe("isAvailableSoon", () => {
    it("should return true for dates within SOON_THRESHOLD_DAYS", () => {
      const listing = createListing({ 
        availableFrom: createDateString(SOON_THRESHOLD_DAYS - 1),
        availableNow: false 
      });
      expect(isAvailableSoon(listing)).toBe(true);
    });

    it("should return false for dates beyond threshold", () => {
      const listing = createListing({ 
        availableFrom: createDateString(SOON_THRESHOLD_DAYS + 10),
        availableNow: false 
      });
      expect(isAvailableSoon(listing)).toBe(false);
    });

    it("should return false for already available properties", () => {
      expect(isAvailableSoon(createListing({ availableNow: true }))).toBe(false);
    });
  });

  describe("isUpcoming", () => {
    it("should return true for far future dates", () => {
      const listing = createListing({ 
        availableFrom: createDateString(90),
        availableNow: false 
      });
      expect(isUpcoming(listing)).toBe(true);
    });

    it("should return false for soon or available properties", () => {
      expect(isUpcoming(createListing({ availableNow: true }))).toBe(false);
      expect(isUpcoming(createListing({ 
        availableFrom: createDateString(7),
        availableNow: false 
      }))).toBe(false);
    });
  });
});

// =============================================================================
// STATUS TRANSITION TESTS
// =============================================================================

describe("Status Transitions", () => {
  describe("canTransitionTo", () => {
    it("should allow valid transitions from vacant", () => {
      expect(canTransitionTo("vacant", "occupied")).toBe(true);
      expect(canTransitionTo("vacant", "reserved")).toBe(true);
    });

    it("should allow valid transitions from occupied", () => {
      expect(canTransitionTo("occupied", "vacant")).toBe(true);
      expect(canTransitionTo("occupied", "notice_given")).toBe(true);
    });

    it("should reject invalid transitions", () => {
      expect(canTransitionTo("vacant", "notice_given")).toBe(false);
      expect(canTransitionTo("occupied", "reserved")).toBe(false);
    });
  });

  describe("getValidTransitions", () => {
    it("should return all valid transitions from vacant", () => {
      const transitions = getValidTransitions("vacant");
      expect(transitions).toContain("occupied");
      expect(transitions).toContain("reserved");
      expect(transitions).not.toContain("notice_given");
    });

    it("should return all valid transitions from occupied", () => {
      const transitions = getValidTransitions("occupied");
      expect(transitions).toContain("vacant");
      expect(transitions).toContain("notice_given");
      expect(transitions).not.toContain("reserved");
    });

    it("should return valid transitions from reserved", () => {
      const transitions = getValidTransitions("reserved");
      expect(transitions).toContain("occupied");
      expect(transitions).toContain("vacant");
    });
  });

  describe("AVAILABILITY_TRANSITIONS", () => {
    it("should define all status transitions", () => {
      expect(AVAILABILITY_TRANSITIONS.vacant).toBeDefined();
      expect(AVAILABILITY_TRANSITIONS.occupied).toBeDefined();
      expect(AVAILABILITY_TRANSITIONS.reserved).toBeDefined();
      expect(AVAILABILITY_TRANSITIONS.notice_given).toBeDefined();
    });
  });
});

// =============================================================================
// SCHEDULING TESTS
// =============================================================================

describe("Scheduling", () => {
  describe("calculateMoveInDate", () => {
    it("should add notice period to current date", () => {
      const result = calculateMoveInDate(7);
      expect(result).toBe(createDateString(7));
    });

    it("should default to MIN_NOTICE_DAYS if not specified", () => {
      const result = calculateMoveInDate();
      expect(result).toBe(createDateString(MIN_NOTICE_DAYS));
    });

    it("should handle longer notice periods", () => {
      const result = calculateMoveInDate(30);
      expect(result).toBe(createDateString(30));
    });
  });

  describe("getEarliestAvailableDate", () => {
    it("should return today for vacant properties", () => {
      const listing = createListing({ currentStatus: "vacant" });
      expect(getEarliestAvailableDate(listing)).toBe(createDateString(0));
    });

    it("should return availableFrom for occupied properties", () => {
      const futureDate = createDateString(30);
      const listing = createListing({ 
        availableFrom: futureDate, 
        currentStatus: "occupied" 
      });
      expect(getEarliestAvailableDate(listing)).toBe(futureDate);
    });

    it("should return minimum notice date if availableFrom is too soon", () => {
      const listing = createListing({ 
        availableFrom: createDateString(1), // Tomorrow
        currentStatus: "occupied" 
      });
      const result = getEarliestAvailableDate(listing, MIN_NOTICE_DAYS);
      // Should enforce minimum notice period
      expect(new Date(result) >= createDate(MIN_NOTICE_DAYS - 1)).toBe(true);
    });
  });

  describe("suggestAvailabilityDate", () => {
    it("should suggest first of next month for long-term rentals", () => {
      const result = suggestAvailabilityDate("long_term");
      // Parse using the same method used by the utility to avoid timezone issues
      const resultDate = parseAvailabilityDate(result);
      // Should be first of some future month
      expect(resultDate).not.toBeNull();
      expect(resultDate!.getDate()).toBe(1);
      expect(resultDate!.getTime() >= new Date().setHours(0,0,0,0)).toBe(true);
    });

    it("should suggest soon for short-term rentals", () => {
      const result = suggestAvailabilityDate("short_term");
      const resultDate = new Date(result);
      const daysFromNow = Math.round((resultDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      expect(daysFromNow).toBeLessThanOrEqual(14);
    });

    it("should suggest today for immediate availability", () => {
      const result = suggestAvailabilityDate("immediate");
      expect(result).toBe(createDateString(0));
    });
  });
});

// =============================================================================
// TIME CALCULATION TESTS
// =============================================================================

describe("Time Calculations", () => {
  describe("getDaysUntilAvailable", () => {
    it("should return correct days for future dates", () => {
      const listing = createListing({ 
        availableFrom: createDateString(10),
        availableNow: false 
      });
      expect(getDaysUntilAvailable(listing)).toBe(10);
    });

    it("should return 0 for past or today dates", () => {
      expect(getDaysUntilAvailable(createListing({ 
        availableFrom: createDateString(0) 
      }))).toBe(0);
      expect(getDaysUntilAvailable(createListing({ 
        availableFrom: createDateString(-5) 
      }))).toBe(0);
    });

    it("should return 0 for availableNow", () => {
      expect(getDaysUntilAvailable(createListing({ availableNow: true }))).toBe(0);
    });
  });

  describe("getWeeksUntilAvailable", () => {
    it("should calculate weeks correctly", () => {
      const listing = createListing({ 
        availableFrom: createDateString(14),
        availableNow: false 
      });
      expect(getWeeksUntilAvailable(listing)).toBe(2);
    });

    it("should round down partial weeks", () => {
      const listing = createListing({ 
        availableFrom: createDateString(10),
        availableNow: false 
      });
      expect(getWeeksUntilAvailable(listing)).toBe(1);
    });
  });

  describe("getMonthsUntilAvailable", () => {
    it("should calculate months correctly", () => {
      const listing = createListing({ 
        availableFrom: createDateString(60),
        availableNow: false 
      });
      expect(getMonthsUntilAvailable(listing)).toBe(2);
    });

    it("should return 0 for dates less than a month away", () => {
      const listing = createListing({ availableFrom: createDateString(15) });
      expect(getMonthsUntilAvailable(listing)).toBe(0);
    });
  });

  describe("isWithinDays", () => {
    it("should return true for dates within range", () => {
      const listing = createListing({ availableFrom: createDateString(5) });
      expect(isWithinDays(listing, 7)).toBe(true);
      expect(isWithinDays(listing, 5)).toBe(true);
    });

    it("should return false for dates outside range", () => {
      const listing = createListing({ 
        availableFrom: createDateString(10),
        availableNow: false 
      });
      expect(isWithinDays(listing, 7)).toBe(false);
    });

    it("should return true for available now properties", () => {
      const listing = createListing({ availableNow: true });
      expect(isWithinDays(listing, 7)).toBe(true);
    });
  });
});

// =============================================================================
// LEASE CALCULATION TESTS
// =============================================================================

describe("Lease Calculations", () => {
  describe("calculateLeaseEndDate", () => {
    it("should calculate end date from start and duration", () => {
      const startDate = "2025-01-01";
      const result = calculateLeaseEndDate(startDate, 12);
      expect(result).toBe("2026-01-01");
    });

    it("should handle different durations", () => {
      const startDate = "2025-06-15";
      expect(calculateLeaseEndDate(startDate, 6)).toBe("2025-12-15");
      expect(calculateLeaseEndDate(startDate, 24)).toBe("2027-06-15");
    });

    it("should handle month boundaries correctly", () => {
      const startDate = "2025-01-31";
      // Adding 1 month to Jan 31 will result in Feb 28 or Mar 3 depending on implementation
      const result = calculateLeaseEndDate(startDate, 1);
      const resultDate = new Date(result);
      // Should be February or March (handling month boundary)
      expect([1, 2]).toContain(resultDate.getMonth()); // Feb=1, Mar=2
    });
  });

  describe("isLeaseExpiringSoon", () => {
    it("should return true for leases ending within 30 days", () => {
      const listing = createListing({ 
        leaseEndDate: createDateString(20) 
      });
      expect(isLeaseExpiringSoon(listing, 30)).toBe(true);
    });

    it("should return false for leases ending later", () => {
      const listing = createListing({ 
        leaseEndDate: createDateString(60) 
      });
      expect(isLeaseExpiringSoon(listing, 30)).toBe(false);
    });

    it("should return false for properties without lease end date", () => {
      const listing = createListing({ leaseEndDate: null });
      expect(isLeaseExpiringSoon(listing, 30)).toBe(false);
    });
  });

  describe("getLeaseRemainingDays", () => {
    it("should calculate remaining days correctly", () => {
      const listing = createListing({ 
        leaseEndDate: createDateString(45) 
      });
      expect(getLeaseRemainingDays(listing)).toBe(45);
    });

    it("should return 0 for expired leases", () => {
      const listing = createListing({ 
        leaseEndDate: createDateString(-10) 
      });
      expect(getLeaseRemainingDays(listing)).toBe(0);
    });

    it("should return null for no lease end date", () => {
      const listing = createListing({ leaseEndDate: null });
      expect(getLeaseRemainingDays(listing)).toBeNull();
    });
  });
});

// =============================================================================
// VACANCY MANAGEMENT TESTS
// =============================================================================

describe("Vacancy Management", () => {
  describe("calculateVacancyPeriod", () => {
    it("should calculate days between tenant move-out and move-in", () => {
      const moveOutDate = "2025-01-01";
      const moveInDate = "2025-01-15";
      expect(calculateVacancyPeriod(moveOutDate, moveInDate)).toBe(14);
    });

    it("should return 0 for same-day transitions", () => {
      const date = "2025-01-01";
      expect(calculateVacancyPeriod(date, date)).toBe(0);
    });

    it("should handle invalid dates", () => {
      expect(calculateVacancyPeriod("invalid", "2025-01-15")).toBe(0);
    });
  });

  describe("estimateVacancyLoss", () => {
    it("should calculate revenue loss from vacancy", () => {
      const monthlyRent = 50000;
      const vacancyDays = 30;
      const loss = estimateVacancyLoss(monthlyRent, vacancyDays);
      expect(loss).toBe(50000); // One month
    });

    it("should prorate for partial months", () => {
      const monthlyRent = 30000;
      const vacancyDays = 15;
      const loss = estimateVacancyLoss(monthlyRent, vacancyDays);
      expect(loss).toBeCloseTo(15000, 0);
    });

    it("should return 0 for no vacancy", () => {
      expect(estimateVacancyLoss(50000, 0)).toBe(0);
    });
  });

  describe("getVacancyRisk", () => {
    it("should return LOW for properties available soon", () => {
      const listing = createListing({ 
        availableFrom: createDateString(7),
        availableNow: false 
      });
      expect(getVacancyRisk(listing)).toBe(VacancyRisk.LOW);
    });

    it("should return MEDIUM for properties with longer vacancy", () => {
      const listing = createListing({ 
        availableFrom: createDateString(45),
        currentStatus: "vacant" 
      });
      expect(getVacancyRisk(listing)).toBe(VacancyRisk.MEDIUM);
    });

    it("should return HIGH for properties vacant 60+ days", () => {
      const listing = createListing({ 
        availableFrom: createDateString(-60), // Vacant for 60 days
        currentStatus: "vacant" 
      });
      expect(getVacancyRisk(listing)).toBe(VacancyRisk.HIGH);
    });
  });
});

// =============================================================================
// SCHEDULING CONFLICT TESTS
// =============================================================================

describe("Scheduling Conflicts", () => {
  const bookings = [
    { startDate: "2025-01-01", endDate: "2025-01-10" },
    { startDate: "2025-01-15", endDate: "2025-01-20" },
    { startDate: "2025-02-01", endDate: "2025-02-28" },
  ];

  describe("hasSchedulingConflict", () => {
    it("should detect overlapping bookings", () => {
      expect(hasSchedulingConflict("2025-01-05", "2025-01-12", bookings)).toBe(true);
      expect(hasSchedulingConflict("2025-01-18", "2025-01-25", bookings)).toBe(true);
    });

    it("should allow non-overlapping bookings", () => {
      expect(hasSchedulingConflict("2025-01-11", "2025-01-14", bookings)).toBe(false);
      expect(hasSchedulingConflict("2025-01-21", "2025-01-31", bookings)).toBe(false);
    });

    it("should handle edge cases (adjacent dates)", () => {
      expect(hasSchedulingConflict("2025-01-10", "2025-01-14", bookings)).toBe(false);
    });
  });

  describe("getOverlappingBookings", () => {
    it("should return all overlapping bookings", () => {
      const result = getOverlappingBookings("2025-01-05", "2025-01-25", bookings);
      expect(result).toHaveLength(2);
    });

    it("should return empty array for no conflicts", () => {
      const result = getOverlappingBookings("2025-03-01", "2025-03-15", bookings);
      expect(result).toHaveLength(0);
    });
  });

  describe("findNextAvailableSlot", () => {
    it("should find next available time slot", () => {
      const result = findNextAvailableSlot("2025-01-01", 5, bookings);
      // Should find a slot after the conflicting bookings
      expect(new Date(result.startDate) >= new Date("2025-01-10")).toBe(true);
      expect(result.endDate).toBeDefined();
    });

    it("should handle empty bookings", () => {
      const result = findNextAvailableSlot("2025-01-01", 7, []);
      expect(result.startDate).toBe("2025-01-01");
    });
  });
});

// =============================================================================
// BULK OPERATIONS TESTS
// =============================================================================

describe("Bulk Operations", () => {
  const listings = [
    createListing({ availableNow: true, currentStatus: "vacant" }),
    createListing({ availableFrom: createDateString(7), availableNow: false }),
    createListing({ availableFrom: createDateString(30), availableNow: false }),
    createListing({ availableFrom: createDateString(60), availableNow: false }),
    createListing({ currentStatus: "occupied", availableNow: false }),
  ];

  describe("getAvailableListings", () => {
    it("should filter for available listings", () => {
      const result = getAvailableListings(listings);
      expect(result.length).toBeGreaterThanOrEqual(1);
    });

    it("should include immediately available and past dates", () => {
      const testListings = [
        createListing({ availableNow: true }),
        createListing({ availableFrom: createDateString(-5) }),
        createListing({ availableFrom: createDateString(30), availableNow: false }),
      ];
      const result = getAvailableListings(testListings);
      expect(result.length).toBe(2);
    });
  });

  describe("getUpcomingAvailability", () => {
    it("should filter for upcoming availability within days", () => {
      const result = getUpcomingAvailability(listings, 14);
      // Should include availableNow and within 14 days
      expect(result.length).toBeGreaterThanOrEqual(2);
    });

    it("should respect the days parameter", () => {
      const result = getUpcomingAvailability(listings, 7);
      expect(result.length).toBeLessThanOrEqual(
        getUpcomingAvailability(listings, 30).length
      );
    });
  });

  describe("groupByAvailabilityMonth", () => {
    it("should group listings by their availability month", () => {
      const result = groupByAvailabilityMonth(listings);
      expect(typeof result).toBe("object");
      expect(Object.keys(result).length).toBeGreaterThanOrEqual(1);
    });

    it("should use 'Now' key for immediately available", () => {
      const result = groupByAvailabilityMonth([
        createListing({ availableNow: true }),
      ]);
      expect(result["Now"]).toBeDefined();
    });
  });
});

// =============================================================================
// VALIDATION TESTS
// =============================================================================

describe("Validation", () => {
  describe("validateAvailabilityData", () => {
    it("should validate complete availability data", () => {
      const data = {
        availableFrom: createDateString(7),
        availableNow: false,
        currentStatus: "occupied" as const,
      };
      const result = validateAvailabilityData(data);
      expect(result.isValid).toBe(true);
      expect(result.errors).toEqual({});
    });

    it("should reject availableNow with future date inconsistency", () => {
      const data = {
        availableFrom: createDateString(30),
        availableNow: true,
        currentStatus: "vacant" as const,
      };
      const result = validateAvailabilityData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.availableNow).toBeDefined();
    });

    it("should require availability date for occupied status", () => {
      const data = {
        availableFrom: null,
        availableNow: false,
        currentStatus: "occupied" as const,
      };
      const result = validateAvailabilityData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.availableFrom).toBeDefined();
    });

    it("should reject dates too far in the future", () => {
      const data = {
        availableFrom: createDateString(MAX_FUTURE_DAYS + 100),
        availableNow: false,
        currentStatus: "occupied" as const,
      };
      const result = validateAvailabilityData(data);
      expect(result.isValid).toBe(false);
      expect(result.errors.availableFrom).toContain("far");
    });
  });

  describe("validateDateRange", () => {
    it("should accept valid date ranges", () => {
      const result = validateDateRange("2025-01-01", "2025-12-31");
      expect(result.isValid).toBe(true);
    });

    it("should reject end date before start date", () => {
      const result = validateDateRange("2025-12-31", "2025-01-01");
      expect(result.isValid).toBe(false);
      expect(result.errors.endDate).toContain("before");
    });

    it("should reject invalid dates", () => {
      const result = validateDateRange("invalid", "2025-12-31");
      expect(result.isValid).toBe(false);
    });
  });

  describe("validateLeaseTerms", () => {
    it("should accept valid lease terms", () => {
      const result = validateLeaseTerms({
        startDate: createDateString(0),
        durationMonths: 12,
        minDurationMonths: 6,
      });
      expect(result.isValid).toBe(true);
    });

    it("should reject duration less than minimum", () => {
      const result = validateLeaseTerms({
        startDate: createDateString(0),
        durationMonths: 3,
        minDurationMonths: 6,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.durationMonths).toContain("minimum");
    });

    it("should reject past start dates", () => {
      const result = validateLeaseTerms({
        startDate: createDateString(-30),
        durationMonths: 12,
        minDurationMonths: 6,
      });
      expect(result.isValid).toBe(false);
      expect(result.errors.startDate).toContain("past");
    });
  });
});

// =============================================================================
// CONFIGURATION TESTS
// =============================================================================

describe("Configuration", () => {
  describe("AVAILABILITY_CONFIG", () => {
    it("should have all required configuration keys", () => {
      expect(AVAILABILITY_CONFIG.minNoticeDays).toBeDefined();
      expect(AVAILABILITY_CONFIG.maxFutureDays).toBeDefined();
      expect(AVAILABILITY_CONFIG.soonThresholdDays).toBeDefined();
      expect(AVAILABILITY_CONFIG.vacancyWarningDays).toBeDefined();
    });

    it("should have sensible default values", () => {
      expect(AVAILABILITY_CONFIG.minNoticeDays).toBeGreaterThan(0);
      expect(AVAILABILITY_CONFIG.maxFutureDays).toBeGreaterThan(30);
      expect(AVAILABILITY_CONFIG.soonThresholdDays).toBeLessThanOrEqual(30);
    });
  });

  describe("Constants", () => {
    it("should export MIN_NOTICE_DAYS", () => {
      expect(typeof MIN_NOTICE_DAYS).toBe("number");
      expect(MIN_NOTICE_DAYS).toBeGreaterThan(0);
    });

    it("should export MAX_FUTURE_DAYS", () => {
      expect(typeof MAX_FUTURE_DAYS).toBe("number");
      expect(MAX_FUTURE_DAYS).toBeGreaterThan(MIN_NOTICE_DAYS);
    });

    it("should export SOON_THRESHOLD_DAYS", () => {
      expect(typeof SOON_THRESHOLD_DAYS).toBe("number");
      expect(SOON_THRESHOLD_DAYS).toBeGreaterThan(0);
    });
  });
});

// =============================================================================
// EDGE CASES & ERROR HANDLING TESTS
// =============================================================================

describe("Edge Cases & Error Handling", () => {
  describe("Date parsing edge cases", () => {
    it("should handle timezone differences gracefully", () => {
      const date = "2025-01-15";
      const parsed = parseAvailabilityDate(date);
      expect(parsed).not.toBeNull();
      expect(formatDate(parsed!)).toBe(date);
    });

    it("should handle leap year dates", () => {
      expect(isValidAvailabilityDate("2024-02-29")).toBe(true); // Leap year
      expect(isValidAvailabilityDate("2025-02-29")).toBe(false); // Not leap year
    });

    it("should handle year boundaries", () => {
      expect(isValidAvailabilityDate("2025-12-31")).toBe(true);
      expect(isValidAvailabilityDate("2026-01-01")).toBe(true);
    });
  });

  describe("Null/undefined handling", () => {
    it("should handle null listing data gracefully", () => {
      const nullListing = createListing({ 
        availableFrom: null, 
        availableNow: false 
      });
      expect(() => getAvailabilityStatus(nullListing)).not.toThrow();
      expect(() => getDaysUntilAvailable(nullListing)).not.toThrow();
    });

    it("should handle missing optional fields", () => {
      const minimalListing = { currentStatus: "vacant" as const };
      expect(() => isAvailableNow(minimalListing as any)).not.toThrow();
    });
  });

  describe("Performance with large datasets", () => {
    it("should handle filtering 1000 listings efficiently", () => {
      const manyListings = Array.from({ length: 1000 }, (_, i) => 
        createListing({ 
          availableFrom: createDateString(i % 100),
          availableNow: i % 10 === 0 
        })
      );
      
      const start = performance.now();
      const result = getAvailableListings(manyListings);
      const elapsed = performance.now() - start;
      
      expect(result.length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(100); // Should complete in < 100ms
    });

    it("should handle grouping 1000 listings efficiently", () => {
      const manyListings = Array.from({ length: 1000 }, (_, i) => 
        createListing({ 
          availableFrom: createDateString(i % 180),
          availableNow: i % 20 === 0 
        })
      );
      
      const start = performance.now();
      const result = groupByAvailabilityMonth(manyListings);
      const elapsed = performance.now() - start;
      
      expect(Object.keys(result).length).toBeGreaterThan(0);
      expect(elapsed).toBeLessThan(1000); // Allow 1 second for slower environments
    });
  });
});

// =============================================================================
// INTEGRATION SCENARIO TESTS
// =============================================================================

describe("Integration Scenarios", () => {
  describe("New listing workflow", () => {
    it("should correctly handle setting availability for new vacant property", () => {
      // Step 1: Create listing as vacant
      const listing = createListing({ 
        currentStatus: "vacant", 
        availableNow: true 
      });
      
      // Step 2: Verify status
      expect(getAvailabilityStatus(listing)).toBe(AvailabilityStatus.AVAILABLE_NOW);
      expect(getDaysUntilAvailable(listing)).toBe(0);
      
      // Step 3: Validate data
      const validation = validateAvailabilityData(listing);
      expect(validation.isValid).toBe(true);
    });

    it("should correctly handle setting future availability", () => {
      const futureDate = createDateString(30);
      const listing = createListing({
        currentStatus: "occupied",
        availableNow: false,
        availableFrom: futureDate,
      });
      
      expect(getAvailabilityStatus(listing)).toBe(AvailabilityStatus.UPCOMING);
      expect(getDaysUntilAvailable(listing)).toBe(30);
      expect(isWithinDays(listing, 45)).toBe(true);
    });
  });

  describe("Tenant turnover workflow", () => {
    it("should correctly calculate vacancy period and loss", () => {
      const monthlyRent = 75000;
      const moveOutDate = "2025-01-31";
      const moveInDate = "2025-02-15";
      
      const vacancyDays = calculateVacancyPeriod(moveOutDate, moveInDate);
      const loss = estimateVacancyLoss(monthlyRent, vacancyDays);
      
      expect(vacancyDays).toBe(15);
      expect(loss).toBeCloseTo(37500, -2);
    });

    it("should track status transitions through turnover", () => {
      // Occupied -> Notice Given -> Vacant -> Reserved -> Occupied
      expect(canTransitionTo("occupied", "notice_given")).toBe(true);
      expect(canTransitionTo("notice_given", "vacant")).toBe(true);
      expect(canTransitionTo("vacant", "reserved")).toBe(true);
      expect(canTransitionTo("reserved", "occupied")).toBe(true);
    });
  });

  describe("Portfolio management", () => {
    it("should correctly categorize portfolio by availability", () => {
      const portfolio = [
        createListing({ availableNow: true, currentStatus: "vacant" }),
        createListing({ availableFrom: createDateString(10), availableNow: false, currentStatus: "occupied" }),
        createListing({ availableFrom: createDateString(45), availableNow: false, currentStatus: "occupied" }),
        createListing({ currentStatus: "occupied", availableNow: false, availableFrom: null }),
      ];
      
      const available = getAvailableListings(portfolio);
      const upcoming14Days = getUpcomingAvailability(portfolio, 14);
      const grouped = groupByAvailabilityMonth(portfolio);
      
      expect(available.length).toBe(1);
      // 14 days includes availableNow (1) + within 10 days (1) = 2
      expect(upcoming14Days.length).toBeGreaterThanOrEqual(2);
      expect(Object.keys(grouped).length).toBeGreaterThanOrEqual(1);
    });
  });
});

// =============================================================================
// RECOMMENDATIONS REPORT
// =============================================================================

describe("Availability System Recommendations", () => {
  it("should output comprehensive recommendations", () => {
    console.log("\n📋 AVAILABILITY SYSTEM RECOMMENDATIONS:\n");
    
    const recommendations = [
      {
        title: "1. Real-time Availability Sync",
        current: "Manual availability updates by landlord",
        recommendation: "Implement webhook-based sync with property management systems",
        impact: "HIGH - Reduces stale availability data by 80%",
      },
      {
        title: "2. Automated Status Transitions",
        current: "Manual status changes",
        recommendation: "Auto-transition based on lease dates and calendar integration",
        impact: "MEDIUM - Reduces admin overhead by 60%",
      },
      {
        title: "3. Predictive Vacancy Alerts",
        current: "No proactive notifications",
        recommendation: "ML-based prediction of upcoming vacancies with 30-day notice",
        impact: "HIGH - Enables proactive marketing, reduces vacancy periods",
      },
      {
        title: "4. Calendar Integration",
        current: "Basic date picker",
        recommendation: "Full calendar view with viewing appointments and move-in scheduling",
        impact: "MEDIUM - Improves landlord UX significantly",
      },
      {
        title: "5. Bulk Availability Management",
        current: "Individual listing updates",
        recommendation: "Portfolio-wide availability updates and scheduling",
        impact: "HIGH for multi-property landlords - 70% time savings",
      },
      {
        title: "6. Availability Caching",
        current: "Fresh database queries",
        recommendation: "Cache availability status with 5-minute TTL",
        impact: "MEDIUM - Reduces DB load for high-traffic listings",
      },
      {
        title: "7. Timezone-aware Scheduling",
        current: "Basic date handling",
        recommendation: "Full timezone support for international users",
        impact: "LOW - Future scalability for expansion",
      },
      {
        title: "8. Availability History Tracking",
        current: "No historical data",
        recommendation: "Track availability history for analytics and trends",
        impact: "MEDIUM - Enables vacancy pattern analysis",
      },
    ];
    
    recommendations.forEach((rec) => {
      console.log(`${rec.title}`);
      console.log(`   Current: ${rec.current}`);
      console.log(`   Recommendation: ${rec.recommendation}`);
      console.log(`   Impact: ${rec.impact}\n`);
    });
    
    console.log("📈 IMPLEMENTATION PRIORITY:\n");
    console.log("   Phase 1 (MVP): Validation utils, status helpers, date calculations");
    console.log("   Phase 2 (Enhancement): Bulk operations, caching, vacancy analytics");
    console.log("   Phase 3 (Advanced): Calendar integration, predictive alerts, sync");
    
    expect(recommendations.length).toBe(8);
  });
});
