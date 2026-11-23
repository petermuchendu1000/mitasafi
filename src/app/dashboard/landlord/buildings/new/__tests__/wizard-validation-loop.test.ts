/**
 * The Add Building wizard's validation loop.
 *
 * MEASURED BEFORE THE FIX
 *   Loading /dashboard/landlord/buildings/new in a real browser produced 47
 *   "Maximum update depth exceeded" errors in 2.5 seconds. React was bailing
 *   out of the render rather than the page settling.
 *
 * THE CYCLE
 *   Each step runs an effect that calls its validate() and dispatches
 *   SET_VALIDATION. Each step's validate() is a useCallback with `validation`
 *   in its dependency array. SET_VALIDATION used to return a brand-new
 *   `validation` object every time, so a dispatch gave validate() a new
 *   identity, which changed the effect's dependencies, which dispatched again.
 *
 * THE PROPERTY THAT STOPS IT
 *   Re-validating to the same result must return the IDENTICAL state object.
 *   React bails out of a re-render when a reducer returns the state it was
 *   given, and with no re-render the dependency never changes and there is no
 *   next iteration. `toBe` below, not `toEqual`, is the whole point: an equal
 *   but distinct object would keep the loop running.
 */

import { wizardReducer, sameStepValidation } from "../context";
import type { WizardState, StepValidation } from "../types";

const baseState = (): WizardState =>
  ({
    currentStep: 1,
    totalSteps: 5,
    formData: {} as WizardState["formData"],
    validation: {},
    isDirty: false,
    isSaving: false,
    isSubmitting: false,
    lastSaved: null,
    draftId: null,
  }) as WizardState;

const setValidation = (step: number, validation: StepValidation) =>
  ({ type: "SET_VALIDATION", payload: { step, validation } }) as const;

const invalid: StepValidation = {
  isValid: false,
  errors: { name: "Give the building a name." },
  touched: {},
};

describe("sameStepValidation", () => {
  it("is true for two identical results built separately", () => {
    expect(
      sameStepValidation(
        { isValid: false, errors: { a: "x" }, touched: { a: true } },
        { isValid: false, errors: { a: "x" }, touched: { a: true } },
      ),
    ).toBe(true);
  });

  it("is false when validity flips", () => {
    expect(
      sameStepValidation(
        { isValid: true, errors: {}, touched: {} },
        { isValid: false, errors: {}, touched: {} },
      ),
    ).toBe(false);
  });

  it("is false when an error message changes", () => {
    expect(
      sameStepValidation(
        { isValid: false, errors: { a: "x" }, touched: {} },
        { isValid: false, errors: { a: "y" }, touched: {} },
      ),
    ).toBe(false);
  });

  it("is false when an error is added or removed", () => {
    const one = { isValid: false, errors: { a: "x" }, touched: {} };
    const two = { isValid: false, errors: { a: "x", b: "y" }, touched: {} };
    expect(sameStepValidation(one, two)).toBe(false);
    expect(sameStepValidation(two, one)).toBe(false);
  });

  it("is false when a field becomes touched", () => {
    expect(
      sameStepValidation(
        { isValid: false, errors: {}, touched: {} },
        { isValid: false, errors: {}, touched: { a: true } },
      ),
    ).toBe(false);
  });

  it("does not confuse same-sized records with different keys", () => {
    expect(
      sameStepValidation(
        { isValid: false, errors: { a: "x" }, touched: {} },
        { isValid: false, errors: { b: "x" }, touched: {} },
      ),
    ).toBe(false);
  });
});

describe("SET_VALIDATION does not re-render when nothing changed", () => {
  it("returns the IDENTICAL state object on a repeat dispatch", () => {
    const first = wizardReducer(baseState(), setValidation(1, invalid));
    const second = wizardReducer(first, setValidation(1, { ...invalid }));
    // toBe, not toEqual: an equal-but-new object is what caused the loop.
    expect(second).toBe(first);
  });

  it("is still identical after many repeats — the loop has no next iteration", () => {
    let state = wizardReducer(baseState(), setValidation(1, invalid));
    const settled = state;
    for (let i = 0; i < 25; i++) {
      state = wizardReducer(
        state,
        setValidation(1, { ...invalid, errors: { ...invalid.errors } }),
      );
    }
    expect(state).toBe(settled);
  });

  it("still produces new state when the result actually changes", () => {
    const first = wizardReducer(baseState(), setValidation(1, invalid));
    const second = wizardReducer(
      first,
      setValidation(1, { isValid: true, errors: {}, touched: {} }),
    );
    expect(second).not.toBe(first);
    expect(second.validation[1].isValid).toBe(true);
    expect(second.validation[1].errors).toEqual({});
  });

  it("stores the first validation for a step it has not seen", () => {
    const next = wizardReducer(baseState(), setValidation(3, invalid));
    expect(next).not.toBe(baseState());
    expect(next.validation[3].errors).toEqual(invalid.errors);
  });

  it("keeps the steps independent", () => {
    let state = wizardReducer(baseState(), setValidation(1, invalid));
    state = wizardReducer(state, setValidation(2, invalid));
    expect(Object.keys(state.validation).sort()).toEqual(["1", "2"]);
  });

  it("still merges touched flags set earlier", () => {
    // SET_FIELD_TOUCHED marks a field; a later re-validation must not wipe it,
    // or an error would stop being shown the moment the field revalidates.
    let state = wizardReducer(baseState(), setValidation(1, invalid));
    state = wizardReducer(state, {
      type: "SET_FIELD_TOUCHED",
      payload: { step: 1, field: "name" },
    });
    expect(state.validation[1].touched.name).toBe(true);

    const after = wizardReducer(state, setValidation(1, invalid));
    expect(after.validation[1].touched.name).toBe(true);
    // And having merged to the same thing, it must settle again.
    expect(after).toBe(state);
  });
});
