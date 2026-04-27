/**
 * useOptimizedValidation Hook
 * 
 * React hook for optimized form validation with:
 * - Debounced validation during typing
 * - Cached validation results
 * - Lazy field validation (only touched fields)
 * - Performance tracking
 * 
 * Usage:
 * ```tsx
 * const {
 *   errors,
 *   touchedErrors,
 *   touchField,
 *   validateAll,
 *   isValid,
 *   isValidating,
 * } = useOptimizedValidation(formData, type, subtype);
 * ```
 */

import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import type { CommercialFormData, CommercialType, CommercialSubtype } from "../commercial-types";
import {
  validateRequiredFieldsCached,
  createDebouncedValidator,
  validateTouchedFields,
  createTouchedFieldTracker,
  clearValidationCache,
} from "../validation-cache";

interface UseOptimizedValidationOptions {
  /** Debounce delay in ms (default: 200) */
  debounceMs?: number;
  /** Whether to validate on mount (default: false) */
  validateOnMount?: boolean;
  /** Whether to only show errors for touched fields (default: true) */
  lazyValidation?: boolean;
}

interface UseOptimizedValidationReturn {
  /** All validation errors */
  errors: Record<string, string>;
  /** Errors for touched fields only */
  touchedErrors: Record<string, string>;
  /** Mark a field as touched */
  touchField: (field: string) => void;
  /** Mark all fields as touched and validate */
  validateAll: () => Record<string, string>;
  /** Check if form is valid (no errors) */
  isValid: boolean;
  /** Check if validation is in progress */
  isValidating: boolean;
  /** Reset touched state */
  resetTouched: () => void;
  /** Get error for a specific field */
  getFieldError: (field: string) => string | undefined;
  /** Check if a specific field has an error */
  hasFieldError: (field: string) => boolean;
}

export function useOptimizedValidation(
  formData: CommercialFormData,
  type: CommercialType | null,
  subtype: CommercialSubtype | null,
  options: UseOptimizedValidationOptions = {}
): UseOptimizedValidationReturn {
  const {
    debounceMs = 200,
    validateOnMount = false,
    lazyValidation = true,
  } = options;

  // State
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  // Touched field tracker
  const touchedRef = useRef(createTouchedFieldTracker());

  // Force re-render when touched fields change
  const [, forceUpdate] = useState({});

  // Create debounced validator
  const validatorRef = useRef<ReturnType<typeof createDebouncedValidator> | null>(null);

  // Initialize debounced validator
  useEffect(() => {
    validatorRef.current = createDebouncedValidator((validationErrors) => {
      setErrors(validationErrors);
      setIsValidating(false);
    }, debounceMs);

    return () => {
      validatorRef.current?.cancel();
    };
  }, [debounceMs]);

  // Validate on form data change (debounced)
  useEffect(() => {
    if (!type) {
      setErrors({});
      return;
    }

    setIsValidating(true);
    validatorRef.current?.validate(formData, type, subtype);
  }, [formData, type, subtype]);

  // Validate on mount if requested
  useEffect(() => {
    if (validateOnMount && type) {
      const initialErrors = validateRequiredFieldsCached(formData, type, subtype);
      setErrors(initialErrors);
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Clear cache when type changes
  useEffect(() => {
    clearValidationCache();
  }, [type, subtype]);

  // Mark a field as touched
  const touchField = useCallback((field: string) => {
    touchedRef.current.touch(field);
    forceUpdate({});
  }, []);

  // Reset touched state
  const resetTouched = useCallback(() => {
    touchedRef.current.reset();
    forceUpdate({});
  }, []);

  // Validate all fields (e.g., on submit)
  const validateAll = useCallback(() => {
    // Flush any pending validation
    validatorRef.current?.flush();
    
    // Get all required field names
    const allErrors = validateRequiredFieldsCached(formData, type, subtype);
    
    // Touch all fields with errors
    Object.keys(allErrors).forEach(field => {
      touchedRef.current.touch(field);
    });
    
    setErrors(allErrors);
    forceUpdate({});
    
    return allErrors;
  }, [formData, type, subtype]);

  // Compute touched errors
  const touchedErrors = useMemo(() => {
    if (!lazyValidation) return errors;
    
    return validateTouchedFields(
      formData,
      type,
      subtype,
      touchedRef.current.getTouched(),
      false
    );
  }, [formData, type, subtype, lazyValidation, errors]);

  // Check if valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Get error for specific field
  const getFieldError = useCallback((field: string) => {
    if (lazyValidation && !touchedRef.current.isTouched(field)) {
      return undefined;
    }
    return errors[field];
  }, [errors, lazyValidation]);

  // Check if field has error
  const hasFieldError = useCallback((field: string) => {
    if (lazyValidation && !touchedRef.current.isTouched(field)) {
      return false;
    }
    return !!errors[field];
  }, [errors, lazyValidation]);

  return {
    errors,
    touchedErrors,
    touchField,
    validateAll,
    isValid,
    isValidating,
    resetTouched,
    getFieldError,
    hasFieldError,
  };
}

/**
 * Simpler hook for components that just need cached validation
 * without debouncing or touched field tracking
 */
export function useCachedValidation(
  formData: CommercialFormData,
  type: CommercialType | null,
  subtype: CommercialSubtype | null
) {
  const errors = useMemo(() => {
    if (!type) return {};
    return validateRequiredFieldsCached(formData, type, subtype);
  }, [formData, type, subtype]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const getFieldError = useCallback((field: string) => {
    return errors[field];
  }, [errors]);

  return {
    errors,
    isValid,
    getFieldError,
  };
}
