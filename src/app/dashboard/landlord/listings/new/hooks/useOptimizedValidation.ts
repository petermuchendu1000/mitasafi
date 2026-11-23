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
import type {
  CommercialFormData,
  CommercialType,
  CommercialSubtype,
} from "../commercial-types";
import {
  validateRequiredFieldsCached,
  createDebouncedValidator,
  validateTouchedFields,
  clearValidationCache,
} from "../validation-cache";

/** Stable identity, so `errors` does not change reference on every render. */
const EMPTY_ERRORS: Record<string, string> = Object.freeze({});

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
  options: UseOptimizedValidationOptions = {},
): UseOptimizedValidationReturn {
  const {
    debounceMs = 200,
    validateOnMount = false,
    lazyValidation = true,
  } = options;

  // Errors produced by a validation run. The debounced validator writes this from its
  // callback, which is a legitimate setState — it is a subscription to an external
  // timer, not a synchronous write during an effect body.
  //
  // validateOnMount used to be a second mount effect that ran the validator and called
  // setErrors, costing an extra render before the form could show anything. It is the
  // initial value, so it belongs in the initialiser. validateRequiredFieldsCached is a
  // pure function over its arguments; its only effect is populating a memo cache, which
  // is idempotent and safe to repeat under StrictMode's double invoke.
  const [validatedErrors, setValidatedErrors] = useState<
    Record<string, string>
  >(() =>
    validateOnMount && type
      ? validateRequiredFieldsCached(formData, type, subtype)
      : {},
  );
  const [isValidating, setIsValidating] = useState(false);

  // With no type selected there is nothing to validate, so there are no errors. That
  // was an effect calling setErrors({}) on every formData change while type was null —
  // a render, then a state write, then another render, to arrive at a constant.
  const errors = type ? validatedErrors : EMPTY_ERRORS;

  // Touched fields.
  //
  // This used to be a useRef holding a mutable tracker, with forceUpdate({}) to provoke
  // a re-render. That is what ESLint react-hooks/refs reported at the touchedErrors
  // memo below: the set was read during render but could not be a dependency of the
  // memo, so a re-render left the memo returning the value computed from the PREVIOUS
  // touched set. Because validateTouchedFields returns every error while the set is
  // empty and only touched fields' errors once it is not, the first touchField() was
  // supposed to narrow the list and did not — lazy validation went on showing errors
  // for fields the user had never visited. Reproduced in
  // __tests__/useOptimizedValidation.test.ts.
  //
  // The touched set decides what is rendered, so it is state, not a ref.
  const [touched, setTouched] = useState<Set<string>>(() => new Set());

  // Create debounced validator
  const validatorRef = useRef<ReturnType<
    typeof createDebouncedValidator
  > | null>(null);

  // Initialize debounced validator
  useEffect(() => {
    validatorRef.current = createDebouncedValidator((validationErrors) => {
      setValidatedErrors(validationErrors);
      setIsValidating(false);
    }, debounceMs);

    return () => {
      validatorRef.current?.cancel();
    };
  }, [debounceMs]);

  // Validate on form data change (debounced)
  //
  // SUPPRESSED DELIBERATELY, with the reasoning rather than a shrug.
  //
  // isValidating means "a debounced validation run has been started and has not come
  // back yet". That is a fact about work in flight, not a function of the inputs:
  // formData changing is what STARTS the run, and nothing about formData says whether
  // the 200ms timer has since elapsed. There is no render-time expression that
  // computes it, which is what every other fix in this sweep relied on.
  //
  // Note what is NOT suppressed. This same effect used to call setErrors({}) here as
  // well; that one WAS derivable — with no type selected there are no errors — and it
  // is now `const errors = type ? validatedErrors : EMPTY_ERRORS` above. Removing it
  // is what exposed this line, since the rule reports only the first synchronous
  // setState in an effect. The two were not the same kind of problem and have not
  // been given the same treatment.
  //
  // The escapes are the same three as in ListingMap and are no better here: deferring
  // the call hides the cascade without removing it, and starting out "validating" on
  // mount would spin the indicator for forms nobody has touched.
  //
  // Pinned instead by __tests__/useOptimizedValidation.test.ts, which asserts
  // isValidating goes true when the form changes and false once the run completes.
  useEffect(() => {
    if (!type) return;

    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsValidating(true);
    validatorRef.current?.validate(formData, type, subtype);
  }, [formData, type, subtype]);

  // Clear cache when type changes
  useEffect(() => {
    clearValidationCache();
  }, [type, subtype]);

  // Mark a field as touched
  const touchField = useCallback((field: string) => {
    setTouched((prev) => {
      if (prev.has(field)) return prev;
      const next = new Set(prev);
      next.add(field);
      return next;
    });
  }, []);

  // Reset touched state
  const resetTouched = useCallback(() => {
    setTouched(new Set());
  }, []);

  // Validate all fields (e.g., on submit)
  const validateAll = useCallback(() => {
    // Flush any pending validation
    validatorRef.current?.flush();

    // Get all required field names
    const allErrors = validateRequiredFieldsCached(formData, type, subtype);

    // Touch all fields with errors
    setTouched((prev) => {
      const next = new Set(prev);
      Object.keys(allErrors).forEach((field) => next.add(field));
      return next;
    });

    setValidatedErrors(allErrors);

    return allErrors;
  }, [formData, type, subtype]);

  // Compute touched errors
  const touchedErrors = useMemo(() => {
    if (!lazyValidation) return errors;

    return validateTouchedFields(formData, type, subtype, touched, false);
  }, [formData, type, subtype, lazyValidation, errors, touched]);

  // Check if valid
  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  // Get error for specific field
  const getFieldError = useCallback(
    (field: string) => {
      if (lazyValidation && !touched.has(field)) {
        return undefined;
      }
      return errors[field];
    },
    [errors, lazyValidation, touched],
  );

  // Check if field has error
  const hasFieldError = useCallback(
    (field: string) => {
      if (lazyValidation && !touched.has(field)) {
        return false;
      }
      return !!errors[field];
    },
    [errors, lazyValidation, touched],
  );

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
  subtype: CommercialSubtype | null,
) {
  const errors = useMemo(() => {
    if (!type) return {};
    return validateRequiredFieldsCached(formData, type, subtype);
  }, [formData, type, subtype]);

  const isValid = useMemo(() => {
    return Object.keys(errors).length === 0;
  }, [errors]);

  const getFieldError = useCallback(
    (field: string) => {
      return errors[field];
    },
    [errors],
  );

  return {
    errors,
    isValid,
    getFieldError,
  };
}
