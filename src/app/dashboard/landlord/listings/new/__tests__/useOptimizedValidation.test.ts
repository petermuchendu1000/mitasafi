/**
 * useOptimizedValidation — touched-field staleness.
 *
 * WHY THIS EXISTS
 *   ESLint (react-hooks/refs) reported, twice, at hooks/useOptimizedValidation.ts:165:
 *       "Passing a ref to a function may read its value during render"
 *   for `touchedRef.current.getTouched()` inside the `touchedErrors` useMemo.
 *
 *   That is not a style complaint. The memo's dependencies are
 *   [formData, type, subtype, lazyValidation, errors] — the touched set is NOT among
 *   them, because it lives in a ref. touchField() mutates the ref and then calls
 *   forceUpdate({}) to re-render, but a re-render does not invalidate a useMemo whose
 *   dependencies are unchanged. So the memo keeps returning the value computed from the
 *   PREVIOUS touched set.
 *
 *   The visible consequence comes from validateTouchedFields' own contract
 *   (validation-cache.ts:283): with an empty touched set it returns EVERY error, and
 *   once a field is touched it returns only touched fields' errors. So the first
 *   touchField() should NARROW the error set. While the memo is stale it does not, and
 *   lazy validation keeps showing errors for fields the user has never visited.
 *
 * WHAT MAKES THIS CHECK ABLE TO FAIL (L5)
 *   The assertion is on the SIZE and CONTENT of touchedErrors after a touch. Against the
 *   unfixed hook the set stays wide; against the fixed hook it narrows to one field.
 *   Fake timers are installed and never advanced, so the debounced validator never fires
 *   and cannot change `errors` — which would invalidate the memo for an unrelated reason
 *   and let this test pass against the defect (G8.1: passing for the wrong reason).
 *
 * NOTE: this hook currently has NO consumer anywhere in the 960 tracked files; it is
 * exported from hooks/index.ts and imported by nothing. The defect is latent.
 */

import { renderHook, act } from "@testing-library/react";
import { useOptimizedValidation } from "../hooks/useOptimizedValidation";
import { DEFAULT_COMMERCIAL_FORM_DATA } from "../commercial-types";
import { clearValidationCache } from "../validation-cache";

describe("useOptimizedValidation touched-field tracking", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    clearValidationCache();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    clearValidationCache();
  });

  it("reports every required-field error before anything is touched", () => {
    const { result } = renderHook(() =>
      useOptimizedValidation(DEFAULT_COMMERCIAL_FORM_DATA, "office", null),
    );

    const keys = Object.keys(result.current.touchedErrors);
    // An empty office form is missing several required fields.
    expect(keys.length).toBeGreaterThan(1);
    expect(keys).toContain("sizeSqm");
  });

  it("narrows touchedErrors to the touched field once one is touched", () => {
    const { result } = renderHook(() =>
      useOptimizedValidation(DEFAULT_COMMERCIAL_FORM_DATA, "office", null),
    );

    const before = Object.keys(result.current.touchedErrors);
    expect(before).toContain("sizeSqm");
    expect(before.length).toBeGreaterThan(1);

    act(() => {
      result.current.touchField("sizeSqm");
    });

    // validateTouchedFields filters to touched fields, so exactly one should remain.
    const after = Object.keys(result.current.touchedErrors);
    expect(after).toEqual(["sizeSqm"]);
  });

  it("resetTouched returns the set to the untouched, show-everything state", () => {
    const { result } = renderHook(() =>
      useOptimizedValidation(DEFAULT_COMMERCIAL_FORM_DATA, "office", null),
    );

    act(() => {
      result.current.touchField("sizeSqm");
    });
    expect(Object.keys(result.current.touchedErrors)).toEqual(["sizeSqm"]);

    act(() => {
      result.current.resetTouched();
    });
    expect(Object.keys(result.current.touchedErrors).length).toBeGreaterThan(1);
  });
});
