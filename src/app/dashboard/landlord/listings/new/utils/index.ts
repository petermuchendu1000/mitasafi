/**
 * Shared Utilities
 * 
 * Common formatting, parsing, and helper functions used across
 * the listing wizard. Centralizes logic to prevent duplication.
 */

// =============================================================================
// NUMBER FORMATTING
// =============================================================================

/**
 * Format a number with thousands separators (Kenyan locale)
 * @example formatAmount(1234567) → "1,234,567"
 */
export function formatAmount(value: number | null | undefined): string {
  if (value === null || value === undefined) return "";
  return value.toLocaleString("en-KE");
}

/**
 * Parse a formatted amount string back to number
 * @example parseAmount("1,234,567") → 1234567
 */
export function parseAmount(value: string): number | null {
  const cleaned = value.replace(/,/g, "").replace(/[^0-9.]/g, "");
  if (!cleaned) return null;
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * Parse integer from string (no decimals)
 * @example parseInteger("1,234") → 1234
 */
export function parseInteger(value: string): number | null {
  const cleaned = value.replace(/,/g, "").replace(/[^0-9]/g, "");
  if (!cleaned) return null;
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? null : num;
}

/**
 * Format currency with symbol
 * @example formatCurrency(50000, "KES") → "KSh 50,000"
 */
export function formatCurrency(
  value: number | null | undefined, 
  currency: string = "KES"
): string {
  if (value === null || value === undefined) return "";
  
  const symbols: Record<string, string> = {
    KES: "KSh",
    USD: "$",
    EUR: "€",
    GBP: "£",
  };
  
  const symbol = symbols[currency] || currency;
  return `${symbol} ${formatAmount(value)}`;
}

// =============================================================================
// SIZE FORMATTING
// =============================================================================

/**
 * Format area with unit
 * @example formatArea(1000, "sqm") → "1,000 sqm"
 */
export function formatArea(value: number | null | undefined, unit: string = "sqm"): string {
  if (value === null || value === undefined) return "";
  return `${formatAmount(value)} ${unit}`;
}

/**
 * Convert square meters to square feet
 */
export function sqmToSqft(sqm: number): number {
  return Math.round(sqm * 10.764);
}

/**
 * Convert square feet to square meters
 */
export function sqftToSqm(sqft: number): number {
  return Math.round(sqft / 10.764);
}

/**
 * Convert square meters to acres
 */
export function sqmToAcres(sqm: number): number {
  return parseFloat((sqm / 4047).toFixed(2));
}

/**
 * Convert acres to square meters
 */
export function acresToSqm(acres: number): number {
  return Math.round(acres * 4047);
}

// =============================================================================
// STRING UTILITIES
// =============================================================================

/**
 * Capitalize first letter of each word
 * @example titleCase("hello world") → "Hello World"
 */
export function titleCase(str: string): string {
  return str
    .toLowerCase()
    .split(" ")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

/**
 * Truncate string with ellipsis
 * @example truncate("Hello World", 8) → "Hello..."
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

/**
 * Format snake_case to human readable
 * @example humanize("parking_building") → "Parking Building"
 */
export function humanize(str: string): string {
  return titleCase(str.replace(/_/g, " "));
}

// =============================================================================
// DATE UTILITIES
// =============================================================================

/**
 * Get current year (memoized to prevent unnecessary recalculation)
 */
let _currentYear: number | null = null;
export function getCurrentYear(): number {
  if (_currentYear === null) {
    _currentYear = new Date().getFullYear();
  }
  return _currentYear;
}

/**
 * Format date for display
 * @example formatDate("2025-01-15") → "January 15, 2025"
 */
export function formatDate(dateString: string | null): string {
  if (!dateString) return "";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-KE", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/**
 * Format date for input[type="date"]
 * @example formatDateForInput(new Date()) → "2025-01-04"
 */
export function formatDateForInput(date: Date): string {
  return date.toISOString().split("T")[0];
}

// =============================================================================
// VALIDATION HELPERS
// =============================================================================

/**
 * Check if value is empty (null, undefined, empty string, or empty array)
 */
export function isEmpty(value: unknown): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "string") return value.trim() === "";
  if (Array.isArray(value)) return value.length === 0;
  return false;
}

/**
 * Check if value is a positive number
 */
export function isPositiveNumber(value: unknown): boolean {
  return typeof value === "number" && value > 0;
}

/**
 * Check if value is a non-negative number
 */
export function isNonNegativeNumber(value: unknown): boolean {
  return typeof value === "number" && value >= 0;
}

/**
 * Check if string is a valid URL
 */
export function isValidUrl(str: string): boolean {
  try {
    new URL(str);
    return true;
  } catch {
    return false;
  }
}

/**
 * Check if string is a valid email
 */
export function isValidEmail(str: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(str);
}

// =============================================================================
// ARRAY UTILITIES
// =============================================================================

/**
 * Toggle item in array (add if not present, remove if present)
 */
export function toggleArrayItem<T>(array: T[], item: T): T[] {
  const index = array.indexOf(item);
  if (index === -1) {
    return [...array, item];
  }
  return array.filter((_, i) => i !== index);
}

/**
 * Remove item from array by index
 */
export function removeAtIndex<T>(array: T[], index: number): T[] {
  return array.filter((_, i) => i !== index);
}

// =============================================================================
// CALCULATION HELPERS
// =============================================================================

/**
 * Calculate deposit amount from rent and months
 */
export function calculateDeposit(rent: number | null, months: number): number {
  if (!rent || rent <= 0) return 0;
  return rent * months;
}

/**
 * Calculate monthly rent from per-sqm rate and size
 */
export function calculateMonthlyRent(
  ratePerSqm: number | null, 
  sizeSqm: number | null
): number {
  if (!ratePerSqm || !sizeSqm) return 0;
  return ratePerSqm * sizeSqm;
}

/**
 * Calculate total student capacity from classrooms and per-class capacity
 */
export function calculateStudentCapacity(
  classrooms: number, 
  capacityPerClass: number
): number {
  return classrooms * capacityPerClass;
}
