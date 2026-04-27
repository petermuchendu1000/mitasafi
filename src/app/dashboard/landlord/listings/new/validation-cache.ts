/**
 * Validation Cache & Performance Utilities
 * 
 * Implements scalability improvements:
 * 1. Validation Caching - LRU cache for validation results
 * 2. Configuration Memoization - Stable references for config lookups
 * 3. Debounced Validation - Reduces validation calls during typing
 * 4. Lazy Field Validation - Only validates touched fields until submission
 */

import type { CommercialFormData, CommercialType, CommercialSubtype } from "./commercial-types";
import { validateRequiredFields, getRequiredFields, type RequiredFieldConfig } from "./required-fields-config";

// =============================================================================
// LRU CACHE IMPLEMENTATION
// =============================================================================

interface LRUCacheOptions {
  maxSize: number;
  ttlMs?: number;
}

interface CacheEntry<T> {
  value: T;
  timestamp: number;
}

class LRUCache<K, V> {
  private cache: Map<K, CacheEntry<V>>;
  private maxSize: number;
  private ttlMs: number;

  constructor(options: LRUCacheOptions) {
    this.cache = new Map();
    this.maxSize = options.maxSize;
    this.ttlMs = options.ttlMs || 60000; // Default 1 minute TTL
  }

  get(key: K): V | undefined {
    const entry = this.cache.get(key);
    if (!entry) return undefined;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttlMs) {
      this.cache.delete(key);
      return undefined;
    }

    // Move to end (most recently used)
    this.cache.delete(key);
    this.cache.set(key, entry);
    return entry.value;
  }

  set(key: K, value: V): void {
    // Delete existing to update position
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }

    // Evict oldest if at capacity
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, { value, timestamp: Date.now() });
  }

  clear(): void {
    this.cache.clear();
  }

  get size(): number {
    return this.cache.size;
  }
}

// =============================================================================
// VALIDATION CACHING
// =============================================================================

// Create a hash from form data for cache key
function hashFormData(formData: CommercialFormData): string {
  // Only hash fields that affect validation
  const relevantFields = [
    'sizeSqm', 'fitoutLevel', 'layoutType', 'buildingGrade',
    'clearHeightM', 'floorLoadCapacity', 'parkingSpacesCount',
    'totalRooms', 'totalBeds', 'seatingCapacity', 'classroomCount',
    'totalStudentCapacity', 'rackHeight', 'coldStorageCapacity',
    'rentPerSqm', 'rentAmount', 'pricingModel'
  ] as const;

  const subset: Record<string, unknown> = {};
  for (const field of relevantFields) {
    if (field in formData) {
      subset[field] = formData[field as keyof CommercialFormData];
    }
  }
  
  return JSON.stringify(subset);
}

// Validation results cache
const validationCache = new LRUCache<string, Record<string, string>>({
  maxSize: 100,
  ttlMs: 30000, // 30 seconds TTL - form data changes frequently
});

/**
 * Cached validation - returns cached result if available
 * Falls back to full validation if cache miss
 */
export function validateRequiredFieldsCached(
  formData: CommercialFormData,
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): Record<string, string> {
  if (!type) return {};

  const cacheKey = `${type}:${subtype || 'null'}:${hashFormData(formData)}`;
  
  // Check cache first
  const cached = validationCache.get(cacheKey);
  if (cached !== undefined) {
    return cached;
  }

  // Perform validation
  const result = validateRequiredFields(formData, type, subtype);
  
  // Cache result
  validationCache.set(cacheKey, result);
  
  return result;
}

/**
 * Clear the validation cache
 * Call this when form type changes or on significant updates
 */
export function clearValidationCache(): void {
  validationCache.clear();
}

/**
 * Get cache statistics for debugging
 */
export function getValidationCacheStats(): { size: number; maxSize: number } {
  return {
    size: validationCache.size,
    maxSize: 100,
  };
}

// =============================================================================
// CONFIGURATION MEMOIZATION
// =============================================================================

// Memoized configuration cache
const configCache = new Map<string, RequiredFieldConfig[]>();

/**
 * Memoized getRequiredFields - returns stable references
 * Useful for preventing unnecessary re-renders
 */
export function getRequiredFieldsMemoized(
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): RequiredFieldConfig[] {
  if (!type) return [];

  const cacheKey = `${type}:${subtype || 'null'}`;
  
  let cached = configCache.get(cacheKey);
  if (!cached) {
    cached = getRequiredFields(type, subtype);
    configCache.set(cacheKey, cached);
  }
  
  return cached;
}

/**
 * Clear configuration cache
 * Usually only needed for hot module reload or testing
 */
export function clearConfigCache(): void {
  configCache.clear();
}

// =============================================================================
// DEBOUNCED VALIDATION
// =============================================================================

type ValidateCallback = (errors: Record<string, string>) => void;

interface DebouncedValidator {
  validate: (
    formData: CommercialFormData,
    type: CommercialType | null,
    subtype: CommercialSubtype | null
  ) => void;
  cancel: () => void;
  flush: () => void;
}

/**
 * Create a debounced validator that waits before validating
 * Reduces validation calls during rapid typing
 * 
 * @param callback Function to call with validation errors
 * @param delayMs Delay in milliseconds (default: 200ms)
 */
export function createDebouncedValidator(
  callback: ValidateCallback,
  delayMs = 200
): DebouncedValidator {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;
  let lastArgs: {
    formData: CommercialFormData;
    type: CommercialType | null;
    subtype: CommercialSubtype | null;
  } | null = null;

  const validate = (
    formData: CommercialFormData,
    type: CommercialType | null,
    subtype: CommercialSubtype | null
  ) => {
    lastArgs = { formData, type, subtype };

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      const errors = validateRequiredFieldsCached(formData, type, subtype);
      callback(errors);
      timeoutId = null;
    }, delayMs);
  };

  const cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  const flush = () => {
    if (timeoutId && lastArgs) {
      clearTimeout(timeoutId);
      timeoutId = null;
      const errors = validateRequiredFieldsCached(
        lastArgs.formData,
        lastArgs.type,
        lastArgs.subtype
      );
      callback(errors);
    }
  };

  return { validate, cancel, flush };
}

// =============================================================================
// LAZY FIELD VALIDATION
// =============================================================================

/**
 * Validate only touched fields
 * Improves UX by not showing errors for untouched fields
 * 
 * @param formData The form data to validate
 * @param type Commercial type
 * @param subtype Commercial subtype
 * @param touchedFields Set of field names that have been touched
 * @param validateAll If true, validates all fields (e.g., on form submission)
 */
export function validateTouchedFields(
  formData: CommercialFormData,
  type: CommercialType | null,
  subtype: CommercialSubtype | null,
  touchedFields: Set<string>,
  validateAll = false
): Record<string, string> {
  // If validateAll is true or no touched fields tracking, validate everything
  if (validateAll || touchedFields.size === 0) {
    return validateRequiredFieldsCached(formData, type, subtype);
  }

  // Get all errors
  const allErrors = validateRequiredFieldsCached(formData, type, subtype);
  
  // Filter to only touched fields
  const touchedErrors: Record<string, string> = {};
  for (const [field, error] of Object.entries(allErrors)) {
    if (touchedFields.has(field)) {
      touchedErrors[field] = error;
    }
  }
  
  return touchedErrors;
}

/**
 * Create a touched field tracker
 */
export function createTouchedFieldTracker() {
  const touched = new Set<string>();

  return {
    /** Mark a field as touched */
    touch: (field: string) => {
      touched.add(field);
    },
    
    /** Check if a field is touched */
    isTouched: (field: string) => {
      return touched.has(field);
    },
    
    /** Get all touched fields */
    getTouched: () => {
      return new Set(touched);
    },
    
    /** Mark all fields as touched (e.g., on form submission) */
    touchAll: (fields: string[]) => {
      fields.forEach(f => touched.add(f));
    },
    
    /** Reset touched state */
    reset: () => {
      touched.clear();
    },
    
    /** Get count of touched fields */
    get size() {
      return touched.size;
    }
  };
}

// =============================================================================
// INCREMENTAL VALIDATION
// =============================================================================

/**
 * Validate a single field
 * Useful for inline validation as user types
 */
export function validateSingleField(
  field: keyof CommercialFormData,
  formData: CommercialFormData,
  type: CommercialType | null,
  subtype: CommercialSubtype | null
): string | null {
  const requiredFields = getRequiredFieldsMemoized(type, subtype);
  const fieldConfig = requiredFields.find(f => f.field === field);
  
  if (!fieldConfig) return null;
  
  // Check conditional requirement
  if (fieldConfig.when && !fieldConfig.when(formData)) {
    return null;
  }
  
  const value = formData[field];
  return fieldConfig.validate(value, formData);
}

// =============================================================================
// PERFORMANCE MONITORING
// =============================================================================

interface ValidationMetrics {
  totalValidations: number;
  cacheHits: number;
  cacheMisses: number;
  avgValidationTimeMs: number;
}

let metrics: ValidationMetrics = {
  totalValidations: 0,
  cacheHits: 0,
  cacheMisses: 0,
  avgValidationTimeMs: 0,
};

/**
 * Get validation performance metrics
 * Useful for debugging and optimization
 */
export function getValidationMetrics(): ValidationMetrics {
  return { ...metrics };
}

/**
 * Reset validation metrics
 */
export function resetValidationMetrics(): void {
  metrics = {
    totalValidations: 0,
    cacheHits: 0,
    cacheMisses: 0,
    avgValidationTimeMs: 0,
  };
}
