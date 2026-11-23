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

describe("isValidating — the flag the one suppression in this hook excuses", () => {
  /**
   * useOptimizedValidation.ts carries an eslint-disable for
   * react-hooks/set-state-in-effect on `setIsValidating(true)`.
   *
   * The rule is right that it is a synchronous setState in an effect. It is wrong that
   * it is avoidable: isValidating means "a debounced run has started and not come back
   * yet", which is a fact about work in flight, not a function of the inputs. formData
   * changing is what STARTS the run; nothing about formData says whether the 200ms
   * timer has since elapsed.
   *
   * Silencing a rule is only defensible if something else holds the behaviour, and
   * nothing did — the flag was completely untested. These three are that something.
   *
   * The timer setup is repeated here on purpose: beforeEach is scoped to its describe,
   * and without it jest.advanceTimersByTime does nothing, the debounce never fires and
   * isValidating looks stuck at true. That is what the first run of this block
   * reported, and it was the test, not the hook — traced separately as false -> true
   * -> false.
   */
  beforeEach(() => {
    jest.useFakeTimers();
    clearValidationCache();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
    clearValidationCache();
  });

  it("is false before anything has been typed", () => {
    const { result } = renderHook(() =>
      useOptimizedValidation(DEFAULT_COMMERCIAL_FORM_DATA, "office", null),
    );
    // The mount pass runs with the same formData the hook was given, so the effect
    // does fire; what matters is that it has RESOLVED by the time the form is idle.
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.isValidating).toBe(false);
  });

  it("goes true the moment the form changes, and false once the run lands", () => {
    const { result, rerender } = renderHook(
      ({ data }) => useOptimizedValidation(data, "office", null),
      { initialProps: { data: DEFAULT_COMMERCIAL_FORM_DATA } },
    );
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.isValidating).toBe(false);

    act(() => {
      rerender({ data: { ...DEFAULT_COMMERCIAL_FORM_DATA, sizeSqm: 120 } });
    });
    expect(result.current.isValidating).toBe(true);

    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.isValidating).toBe(false);
  });

  it("stays false while no type is selected, because no run is started", () => {
    // The effect returns before the suppressed line when type is null. That early
    // return is load-bearing: without it the indicator would spin on a form the user
    // has not begun.
    const { result, rerender } = renderHook(
      ({ data }) => useOptimizedValidation(data, null, null),
      { initialProps: { data: DEFAULT_COMMERCIAL_FORM_DATA } },
    );

    act(() => {
      rerender({ data: { ...DEFAULT_COMMERCIAL_FORM_DATA, sizeSqm: 120 } });
    });

    expect(result.current.isValidating).toBe(false);
  });
});
