/**
 * Reliability Utilities
 *
 * Comprehensive reliability infrastructure including:
 * - Safe execution wrappers
 * - Retry mechanisms with exponential backoff
 * - Circuit breaker pattern
 * - Graceful degradation
 * - Data validation and recovery
 * - Error classification and tracking
 * - Input sanitization
 */

import { CommercialFormData, DEFAULT_COMMERCIAL_FORM_DATA, CommercialType, CommercialSubtype } from './commercial-types';
import { getRequiredFields, areRequiredFieldsComplete } from './required-fields-config';

// =============================================================================
// TYPE DEFINITIONS
// =============================================================================

/**
 * Safe execution result wrapper
 */
export interface SafeResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
}

/**
 * Validation result with optional errors
 */
export interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string>;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  exponentialBackoff?: boolean;
  maxDelayMs?: number;
  onRetry?: (attempt: number, error: Error) => void;
}

/**
 * Circuit breaker states
 */
export enum CircuitBreakerState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

/**
 * Circuit breaker configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenRequests?: number;
}

/**
 * Error severity levels
 */
export enum ErrorSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL',
}

/**
 * Error categories
 */
export enum ErrorCategory {
  VALIDATION = 'VALIDATION',
  NETWORK = 'NETWORK',
  SYSTEM = 'SYSTEM',
  USER_INPUT = 'USER_INPUT',
  TIMEOUT = 'TIMEOUT',
  UNKNOWN = 'UNKNOWN',
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  category: ErrorCategory;
  severity: ErrorSeverity;
  recoverable: boolean;
  message: string;
}

/**
 * Error metrics
 */
export interface ReliabilityMetrics {
  total: number;
  byCategory: Record<string, number>;
  bySeverity: Record<string, number>;
  recentErrors: Array<{
    error: Error;
    category: ErrorCategory;
    severity: ErrorSeverity;
    timestamp: Date;
  }>;
}

/**
 * Data recovery result
 */
export interface RecoveryResult {
  data: CommercialFormData;
  recovered: boolean;
  recoveredFields: string[];
}

/**
 * Input validation schema
 */
export interface InputValidationSchema {
  [key: string]: {
    required?: boolean;
    type?: 'string' | 'number' | 'boolean' | 'array' | 'object';
    min?: number;
    max?: number;
    pattern?: RegExp;
    validator?: (value: unknown) => boolean;
  };
}

/**
 * Sanitization options for strings
 */
export interface StringSanitizeOptions {
  maxLength?: number;
  allowHtml?: boolean;
  trim?: boolean;
}

/**
 * Sanitization options for numbers
 */
export interface NumberSanitizeOptions {
  default?: number;
  min?: number;
  max?: number;
  allowNaN?: boolean;
}

/**
 * Sanitization options for arrays
 */
export interface ArraySanitizeOptions<T> {
  maxLength?: number;
  itemValidator?: (item: T) => boolean;
  removeEmpty?: boolean;
}

// =============================================================================
// CONSTANTS
// =============================================================================

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 100,
  exponentialBackoff: true,
  maxDelayMs: 5000,
};

export const DEFAULT_CIRCUIT_BREAKER_CONFIG: CircuitBreakerConfig = {
  failureThreshold: 5,
  resetTimeoutMs: 30000,
  halfOpenRequests: 1,
};

// =============================================================================
// ERROR METRICS STORAGE
// =============================================================================

let errorMetrics: ReliabilityMetrics = {
  total: 0,
  byCategory: {},
  bySeverity: {},
  recentErrors: [],
};

const MAX_RECENT_ERRORS = 100;

// =============================================================================
// SAFE EXECUTION
// =============================================================================

/**
 * Safely execute a synchronous function, catching errors
 */
export function safeExecute<T>(fn: () => T): SafeResult<T> {
  try {
    const data = fn();
    return { success: true, data };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error };
  }
}

/**
 * Safely execute an async function, catching errors
 */
export async function safeExecuteAsync<T>(fn: () => Promise<T>): Promise<SafeResult<T>> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    return { success: false, error };
  }
}

/**
 * Create a safe wrapper for a validation function
 */
export function createSafeValidator(
  validator: (data: CommercialFormData) => ValidationResult
): (data: CommercialFormData) => ValidationResult {
  return (data: CommercialFormData): ValidationResult => {
    try {
      return validator(data);
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      return {
        isValid: false,
        errors: {
          _system: `Validation error: ${error.message}`,
        },
      };
    }
  };
}

// =============================================================================
// RETRY MECHANISMS
// =============================================================================

/**
 * Execute a function with retry logic
 */
export function withRetry<T>(fn: () => T, config: RetryConfig): T {
  const { maxAttempts, delayMs, exponentialBackoff, maxDelayMs, onRetry } = config;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        // Calculate delay
        let delay = delayMs;
        if (exponentialBackoff) {
          delay = Math.min(delayMs * Math.pow(2, attempt - 1), maxDelayMs || Infinity);
        }

        // Synchronous delay (blocking)
        const start = Date.now();
        while (Date.now() - start < delay) {
          // Busy wait (not ideal but necessary for sync)
        }
      }
    }
  }

  throw lastError!;
}

/**
 * Execute an async function with retry logic
 */
export async function withRetryAsync<T>(
  fn: () => Promise<T>,
  config: RetryConfig
): Promise<T> {
  const { maxAttempts, delayMs, exponentialBackoff, maxDelayMs, onRetry } = config;
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxAttempts) {
        if (onRetry) {
          onRetry(attempt, lastError);
        }

        // Calculate delay with exponential backoff
        let delay = delayMs;
        if (exponentialBackoff) {
          delay = Math.min(delayMs * Math.pow(2, attempt - 1), maxDelayMs || Infinity);
        }

        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError!;
}

/**
 * Create a reusable retryable operation
 */
export function createRetryableOperation<T>(
  fn: () => T,
  config: RetryConfig
): { execute: () => T; config: RetryConfig } {
  return {
    execute: () => withRetry(fn, config),
    config,
  };
}

// =============================================================================
// GRACEFUL DEGRADATION
// =============================================================================

/**
 * Execute with fallback value
 */
export function withFallback<T>(fn: () => T, fallback: T | (() => T)): T {
  try {
    return fn();
  } catch {
    return typeof fallback === 'function' ? (fallback as () => T)() : fallback;
  }
}

/**
 * Execute async with fallback value
 */
export async function withFallbackAsync<T>(
  fn: () => Promise<T>,
  fallback: T | (() => T) | (() => Promise<T>)
): Promise<T> {
  try {
    return await fn();
  } catch {
    if (typeof fallback === 'function') {
      const result = (fallback as () => T | Promise<T>)();
      return result instanceof Promise ? await result : result;
    }
    return fallback;
  }
}

/**
 * Create a chain of fallback functions
 */
export function createFallbackChain<T>(fns: Array<() => T>): {
  execute: () => T;
  getStats: () => { totalExecutions: number; fallbacksUsed: number };
} {
  let totalExecutions = 0;
  let fallbacksUsed = 0;

  return {
    execute: (): T => {
      totalExecutions++;
      const errors: Error[] = [];

      for (let i = 0; i < fns.length; i++) {
        try {
          const result = fns[i]();
          if (i > 0) fallbacksUsed++;
          return result;
        } catch (err) {
          errors.push(err instanceof Error ? err : new Error(String(err)));
        }
      }

      throw new Error(
        `All fallback options failed: ${errors.map((e) => e.message).join('; ')}`
      );
    },
    getStats: () => ({ totalExecutions, fallbacksUsed }),
  };
}

// =============================================================================
// DATA RECOVERY
// =============================================================================

/**
 * Recovery defaults - sensible defaults for required fields
 * These are different from form defaults (which may be null)
 */
const RECOVERY_DEFAULTS: Partial<Record<keyof CommercialFormData, unknown>> = {
  sizeSqm: 0,
  fitoutLevel: 'shell',
  buildingGrade: 'B',
  clearHeightM: 3,
  loadingDocks: 0,
  operatingHours: 'business_hours',
  fuelTanks: [],
  vehicleAccess: [],
  permittedUses: [],
  utilitiesAvailable: [],
  networkConnectivity: [],
  approvedCurriculum: [],
};

/**
 * Validate data and attempt recovery for missing/invalid fields
 */
export function validateAndRecover(
  data: CommercialFormData,
  propertyType: string,
  propertySubtype: string | null
): RecoveryResult {
  const recoveredFields: string[] = [];
  const sanitized = { ...data };

  // Get required fields for this property type
  const requiredFieldConfigs = getRequiredFields(propertyType as CommercialType, propertySubtype as CommercialSubtype | null);

  // Check each required field
  requiredFieldConfigs.forEach((fieldConfig) => {
    const fieldName = fieldConfig.field;
    const value = sanitized[fieldName as keyof CommercialFormData];

    if (value === undefined || value === null || value === '') {
      // Attempt to recover with recovery default (not form default which may be null)
      const recoveryValue = RECOVERY_DEFAULTS[fieldName as keyof CommercialFormData];
      if (recoveryValue !== undefined) {
        (sanitized as Record<string, unknown>)[fieldName] = recoveryValue;
        recoveredFields.push(fieldName);
      }
    }
  });

  return {
    data: sanitized,
    recovered: recoveredFields.length > 0,
    recoveredFields,
  };
}

/**
 * Sanitize form data, cleaning up invalid values
 */
export function sanitizeFormData(data: CommercialFormData | null | undefined): CommercialFormData {
  if (!data) {
    return { ...DEFAULT_COMMERCIAL_FORM_DATA };
  }

  const sanitized = { ...data };

  // Sanitize string fields (must be valid CommercialFormData keys)
  const stringFields: Array<keyof CommercialFormData> = [
    'fitoutLevel',
    'hvacType',
    'zoningType',
    'floorLevel',
    'flooringType',
    'carWashType',
  ];

  stringFields.forEach((field) => {
    const value = sanitized[field];
    if (typeof value === 'string') {
      (sanitized as Record<string, unknown>)[field] = value.trim();
    }
  });

  // Sanitize numeric fields - including type conversion
  const numericRanges: Record<string, { min: number; max: number }> = {
    sizeSqm: { min: 0, max: 1000000 },
    ceilingHeightM: { min: 0, max: 50 },
    clearHeightM: { min: 0, max: 100 },
    loadingDocks: { min: 0, max: 100 },
    plotSizeSqm: { min: 0, max: 10000000 },
    workstationCapacity: { min: 0, max: 10000 },
    seatingCapacity: { min: 0, max: 10000 },
    roomCount: { min: 0, max: 1000 },
    classroomCount: { min: 0, max: 500 },
  };

  Object.entries(numericRanges).forEach(([field, { min, max }]) => {
    const value = sanitized[field as keyof CommercialFormData];
    if (typeof value === 'number' && !isNaN(value)) {
      (sanitized as Record<string, unknown>)[field] = Math.max(min, Math.min(max, value));
    } else if (typeof value === 'string') {
      // Try to convert string to number
      const parsed = parseFloat(value);
      if (!isNaN(parsed)) {
        (sanitized as Record<string, unknown>)[field] = Math.max(min, Math.min(max, parsed));
      } else {
        // Invalid string - set to null to allow recovery
        (sanitized as Record<string, unknown>)[field] = null;
      }
    }
  });

  // Sanitize arrays (must be valid CommercialFormData array keys)
  const arrayFields: Array<keyof CommercialFormData> = [
    'vehicleAccess',
    'permittedUses',
    'utilitiesAvailable',
    'approvedCurriculum',
    'networkConnectivity',
  ];

  arrayFields.forEach((field) => {
    const value = sanitized[field];
    if (Array.isArray(value)) {
      (sanitized as Record<string, unknown>)[field] = value.filter(
        (item) => item !== null && item !== undefined && item !== ''
      );
    } else if (value === undefined || value === null) {
      (sanitized as Record<string, unknown>)[field] = [];
    }
  });

  return sanitized;
}

/**
 * Attempt to repair corrupted data by converting types
 */
export function repairCorruptedData(data: Partial<CommercialFormData>): CommercialFormData {
  const repaired = { ...DEFAULT_COMMERCIAL_FORM_DATA };

  Object.entries(data).forEach(([key, value]) => {
    const defaultValue = DEFAULT_COMMERCIAL_FORM_DATA[key as keyof CommercialFormData];
    const recoveryDefault = RECOVERY_DEFAULTS[key as keyof CommercialFormData];
    const defaultType = typeof defaultValue;

    try {
      if (value === null || value === undefined) {
        // Use recovery default if available, otherwise keep default
        if (recoveryDefault !== undefined) {
          (repaired as Record<string, unknown>)[key] = recoveryDefault;
        }
        return;
      }

      if (defaultType === 'number' || (defaultValue === null && key in RECOVERY_DEFAULTS && typeof RECOVERY_DEFAULTS[key as keyof CommercialFormData] === 'number')) {
        // Handle numeric fields (including those with null defaults)
        const parsed = Number(value);
        if (!isNaN(parsed)) {
          (repaired as Record<string, unknown>)[key] = parsed;
        } else if (recoveryDefault !== undefined) {
          (repaired as Record<string, unknown>)[key] = recoveryDefault;
        }
      } else if (defaultType === 'boolean') {
        (repaired as Record<string, unknown>)[key] = Boolean(value);
      } else if (defaultType === 'string') {
        (repaired as Record<string, unknown>)[key] = String(value);
      } else if (Array.isArray(defaultValue)) {
        if (Array.isArray(value)) {
          (repaired as Record<string, unknown>)[key] = value.filter(
            (v) => v !== null && v !== undefined
          );
        } else {
          (repaired as Record<string, unknown>)[key] = [];
        }
      } else if (key === 'fuelTanks' && Array.isArray(value)) {
        // Special handling for fuelTanks array of objects
        (repaired as Record<string, unknown>)[key] = value.filter(
          (item) => item !== null && item !== undefined && typeof item === 'object'
        );
      } else if (defaultValue === null && typeof value === 'string' && key in RECOVERY_DEFAULTS) {
        // Field has null default but we got a string - try to parse it
        const parsed = Number(value);
        if (!isNaN(parsed)) {
          (repaired as Record<string, unknown>)[key] = parsed;
        } else if (recoveryDefault !== undefined) {
          (repaired as Record<string, unknown>)[key] = recoveryDefault;
        }
      } else {
        (repaired as Record<string, unknown>)[key] = value;
      }
    } catch {
      // Keep default or recovery default on error
      if (recoveryDefault !== undefined) {
        (repaired as Record<string, unknown>)[key] = recoveryDefault;
      }
    }
  });

  return repaired;
}

// =============================================================================
// CIRCUIT BREAKER
// =============================================================================

export interface CircuitBreaker {
  canExecute(): boolean;
  execute<T>(fn: () => T): T;
  executeAsync<T>(fn: () => Promise<T>): Promise<T>;
  recordSuccess(): void;
  recordFailure(): void;
  getState(): CircuitBreakerState;
  reset(): void;
}

/**
 * Create a circuit breaker instance
 */
export function createCircuitBreaker(config: CircuitBreakerConfig): CircuitBreaker {
  let state = CircuitBreakerState.CLOSED;
  let failureCount = 0;
  let lastFailureTime: number | null = null;
  let successCountInHalfOpen = 0;

  const checkState = (): void => {
    if (state === CircuitBreakerState.OPEN && lastFailureTime) {
      const elapsed = Date.now() - lastFailureTime;
      if (elapsed >= config.resetTimeoutMs) {
        state = CircuitBreakerState.HALF_OPEN;
        successCountInHalfOpen = 0;
      }
    }
  };

  return {
    canExecute(): boolean {
      checkState();
      return state !== CircuitBreakerState.OPEN;
    },

    execute<T>(fn: () => T): T {
      checkState();

      if (state === CircuitBreakerState.OPEN) {
        throw new Error('Circuit breaker is open');
      }

      try {
        const result = fn();
        this.recordSuccess();
        return result;
      } catch (err) {
        this.recordFailure();
        throw err;
      }
    },

    async executeAsync<T>(fn: () => Promise<T>): Promise<T> {
      checkState();

      if (state === CircuitBreakerState.OPEN) {
        throw new Error('Circuit breaker is open');
      }

      try {
        const result = await fn();
        this.recordSuccess();
        return result;
      } catch (err) {
        this.recordFailure();
        throw err;
      }
    },

    recordSuccess(): void {
      checkState(); // Check state first to transition to HALF_OPEN if needed
      
      if (state === CircuitBreakerState.HALF_OPEN) {
        successCountInHalfOpen++;
        if (successCountInHalfOpen >= (config.halfOpenRequests || 1)) {
          state = CircuitBreakerState.CLOSED;
          failureCount = 0;
          successCountInHalfOpen = 0;
        }
      } else if (state === CircuitBreakerState.CLOSED) {
        failureCount = Math.max(0, failureCount - 1);
      }
    },

    recordFailure(): void {
      checkState(); // Check state first
      
      failureCount++;
      lastFailureTime = Date.now();

      if (state === CircuitBreakerState.HALF_OPEN) {
        // Failure in half-open goes back to open
        state = CircuitBreakerState.OPEN;
      } else if (failureCount >= config.failureThreshold) {
        state = CircuitBreakerState.OPEN;
      }
    },

    getState(): CircuitBreakerState {
      checkState();
      return state;
    },

    reset(): void {
      state = CircuitBreakerState.CLOSED;
      failureCount = 0;
      lastFailureTime = null;
      successCountInHalfOpen = 0;
    },
  };
}

// =============================================================================
// ERROR CLASSIFICATION
// =============================================================================

/**
 * Classify an error by category and severity
 */
export function classifyError(error: Error): ErrorClassification {
  const message = error.message.toLowerCase();
  const name = error.name.toLowerCase();

  // Validation errors
  if (
    name.includes('validation') ||
    message.includes('required') ||
    message.includes('invalid') ||
    message.includes('field')
  ) {
    return {
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.LOW,
      recoverable: true,
      message: error.message,
    };
  }

  // Network errors
  if (
    name.includes('network') ||
    name.includes('fetch') ||
    message.includes('network') ||
    message.includes('connection') ||
    message.includes('offline')
  ) {
    return {
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      message: error.message,
    };
  }

  // Timeout errors
  if (name.includes('timeout') || message.includes('timeout') || message.includes('timed out')) {
    return {
      category: ErrorCategory.TIMEOUT,
      severity: ErrorSeverity.MEDIUM,
      recoverable: true,
      message: error.message,
    };
  }

  // System errors
  if (
    name.includes('range') ||
    name.includes('type') ||
    name.includes('reference') ||
    message.includes('memory') ||
    message.includes('stack')
  ) {
    return {
      category: ErrorCategory.SYSTEM,
      severity: ErrorSeverity.HIGH,
      recoverable: false,
      message: error.message,
    };
  }

  // User input errors
  if (
    message.includes('user') ||
    message.includes('input') ||
    message.includes('format')
  ) {
    return {
      category: ErrorCategory.USER_INPUT,
      severity: ErrorSeverity.LOW,
      recoverable: true,
      message: error.message,
    };
  }

  // Unknown/default
  return {
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    recoverable: true,
    message: error.message,
  };
}

/**
 * Check if an error is recoverable
 */
export function isRecoverable(error: Error): boolean {
  const name = error.name.toLowerCase();

  // Explicitly non-recoverable errors
  if (name.includes('fatal') || name.includes('critical')) {
    return false;
  }

  // Classification-based check
  const classification = classifyError(error);
  return classification.recoverable;
}

// =============================================================================
// ERROR TRACKING & METRICS
// =============================================================================

/**
 * Track an error for metrics
 */
export function trackError(
  error: Error,
  category: ErrorCategory = ErrorCategory.UNKNOWN,
  severity: ErrorSeverity = ErrorSeverity.MEDIUM
): void {
  errorMetrics.total++;
  errorMetrics.byCategory[category] = (errorMetrics.byCategory[category] || 0) + 1;
  errorMetrics.bySeverity[severity] = (errorMetrics.bySeverity[severity] || 0) + 1;

  errorMetrics.recentErrors.push({
    error,
    category,
    severity,
    timestamp: new Date(),
  });

  // Limit recent errors
  if (errorMetrics.recentErrors.length > MAX_RECENT_ERRORS) {
    errorMetrics.recentErrors = errorMetrics.recentErrors.slice(-MAX_RECENT_ERRORS);
  }
}

/**
 * Get error metrics
 */
export function getErrorMetrics(): ReliabilityMetrics {
  return { ...errorMetrics };
}

/**
 * Reset error metrics
 */
export function resetMetrics(): void {
  errorMetrics = {
    total: 0,
    byCategory: {},
    bySeverity: {},
    recentErrors: [],
  };
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate input against a schema
 */
export function validateInput(
  input: Record<string, unknown>,
  schema: InputValidationSchema
): { isValid: boolean; errors: Record<string, string> } {
  const errors: Record<string, string> = {};

  Object.entries(schema).forEach(([field, rules]) => {
    const value = input[field];

    // Required check
    if (rules.required && (value === undefined || value === null || value === '')) {
      errors[field] = `${field} is required`;
      return;
    }

    // Skip further validation if not present and not required
    if (value === undefined || value === null) {
      return;
    }

    // Type check
    if (rules.type) {
      const actualType = Array.isArray(value) ? 'array' : typeof value;
      if (actualType !== rules.type) {
        errors[field] = `${field} must be of type ${rules.type}`;
        return;
      }
    }

    // Min/max for numbers
    if (rules.type === 'number' && typeof value === 'number') {
      if (rules.min !== undefined && value < rules.min) {
        errors[field] = `${field} must be at minimum ${rules.min}`;
      }
      if (rules.max !== undefined && value > rules.max) {
        errors[field] = `${field} must be at maximum ${rules.max}`;
      }
    }

    // Pattern check
    if (rules.pattern && typeof value === 'string' && !rules.pattern.test(value)) {
      errors[field] = `${field} format is invalid`;
    }

    // Custom validator
    if (rules.validator && !rules.validator(value)) {
      errors[field] = `${field} validation failed`;
    }
  });

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  };
}

/**
 * Sanitize a string value
 */
export function sanitizeString(
  value: unknown,
  options: StringSanitizeOptions = {}
): string {
  if (value === null || value === undefined) {
    return '';
  }

  let str = String(value);

  // Remove control characters
  str = str.replace(/[\x00-\x1F\x7F]/g, '');

  // Trim whitespace
  if (options.trim !== false) {
    str = str.trim();
  }

  // Strip HTML if not allowed
  if (!options.allowHtml) {
    str = str.replace(/<[^>]*>/g, '');
  }

  // Truncate to max length
  if (options.maxLength && str.length > options.maxLength) {
    str = str.slice(0, options.maxLength);
  }

  return str;
}

/**
 * Sanitize a number value
 */
export function sanitizeNumber(
  value: unknown,
  options: NumberSanitizeOptions = {}
): number {
  let num: number;

  if (typeof value === 'number') {
    num = value;
  } else if (typeof value === 'string') {
    num = parseFloat(value);
  } else {
    num = NaN;
  }

  // Handle NaN
  if (isNaN(num)) {
    if (!options.allowNaN && options.default !== undefined) {
      return options.default;
    }
    return NaN;
  }

  // Clamp to range
  if (options.min !== undefined && num < options.min) {
    num = options.min;
  }
  if (options.max !== undefined && num > options.max) {
    num = options.max;
  }

  return num;
}

/**
 * Sanitize an array
 */
export function sanitizeArray<T>(
  value: unknown,
  options: ArraySanitizeOptions<T> = {}
): T[] {
  if (!Array.isArray(value)) {
    return [];
  }

  let result = value.filter((item): item is T => {
    // Remove null/undefined
    if (item === null || item === undefined) {
      return false;
    }

    // Remove empty strings if removeEmpty isn't false
    if (options.removeEmpty !== false && item === '') {
      return false;
    }
    if (options.removeEmpty !== false && typeof item === 'string' && item.trim() === '') {
      return false;
    }

    // Custom validator
    if (options.itemValidator && !options.itemValidator(item as T)) {
      return false;
    }

    return true;
  });

  // Limit length
  if (options.maxLength && result.length > options.maxLength) {
    result = result.slice(0, options.maxLength);
  }

  return result;
}
