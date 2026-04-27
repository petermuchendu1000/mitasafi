/**
 * Building Wizard Context
 * 
 * Provides centralized state management for the multi-step building wizard.
 * Uses React Context with useReducer for predictable state updates.
 */

"use client";

import { 
  createContext, 
  useContext, 
  useReducer, 
  useCallback,
  type ReactNode,
  type Dispatch,
} from "react";
import {
  type BuildingFormData,
  type WizardState,
  type StepValidation,
  DEFAULT_FORM_DATA,
  TOTAL_STEPS,
} from "./types";

// =============================================================================
// ACTION TYPES
// =============================================================================

type WizardAction =
  | { type: "SET_STEP"; payload: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "UPDATE_FORM_DATA"; payload: Partial<BuildingFormData> }
  | { type: "SET_VALIDATION"; payload: { step: number; validation: StepValidation } }
  | { type: "SET_FIELD_TOUCHED"; payload: { step: number; field: string } }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_DIRTY"; payload: boolean }
  | { type: "SET_LAST_SAVED"; payload: string }
  | { type: "SAVE_SUCCESS"; payload: { draftId: string; savedAt: Date } }
  | { type: "RESET_FORM" }
  | { type: "LOAD_DRAFT"; payload: { formData: BuildingFormData; draftId: string } };

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: WizardState = {
  currentStep: 1,
  totalSteps: TOTAL_STEPS,
  formData: DEFAULT_FORM_DATA,
  validation: {},
  isDirty: false,
  isSaving: false,
  isSubmitting: false,
  lastSaved: null,
  draftId: null,
};

// =============================================================================
// REDUCER
// =============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  switch (action.type) {
    case "SET_STEP":
      return {
        ...state,
        currentStep: Math.max(1, Math.min(action.payload, TOTAL_STEPS)),
      };

    case "NEXT_STEP":
      return {
        ...state,
        currentStep: Math.min(state.currentStep + 1, TOTAL_STEPS),
      };

    case "PREV_STEP":
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 1),
      };

    case "UPDATE_FORM_DATA":
      return {
        ...state,
        formData: { ...state.formData, ...action.payload },
        isDirty: true,
      };

    case "SET_VALIDATION":
      const existingValidation = state.validation[action.payload.step];
      return {
        ...state,
        validation: {
          ...state.validation,
          [action.payload.step]: {
            ...action.payload.validation,
            touched: {
              ...(existingValidation?.touched || {}),
              ...action.payload.validation.touched,
            },
          },
        },
      };

    case "SET_FIELD_TOUCHED":
      const currentValidation = state.validation[action.payload.step] || {
        isValid: false,
        errors: {},
        touched: {},
      };
      return {
        ...state,
        validation: {
          ...state.validation,
          [action.payload.step]: {
            ...currentValidation,
            touched: {
              ...currentValidation.touched,
              [action.payload.field]: true,
            },
          },
        },
      };

    case "SET_SAVING":
      return {
        ...state,
        isSaving: action.payload,
      };

    case "SET_SUBMITTING":
      return {
        ...state,
        isSubmitting: action.payload,
      };

    case "SET_DIRTY":
      return {
        ...state,
        isDirty: action.payload,
      };

    case "SET_LAST_SAVED":
      return {
        ...state,
        lastSaved: new Date(action.payload),
        isDirty: false,
      };

    case "SAVE_SUCCESS":
      return {
        ...state,
        draftId: action.payload.draftId,
        lastSaved: action.payload.savedAt,
        isDirty: false,
        isSaving: false,
      };

    case "RESET_FORM":
      return {
        ...initialState,
        validation: {},
      };

    case "LOAD_DRAFT":
      return {
        ...state,
        formData: action.payload.formData,
        draftId: action.payload.draftId,
        isDirty: false,
      };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

interface WizardContextType {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  // Helper functions
  updateFormData: (data: Partial<BuildingFormData>) => void;
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  setFieldTouched: (step: number, field: string) => void;
  isStepValid: (step: number) => boolean;
  canProceed: () => boolean;
}

const WizardContext = createContext<WizardContextType | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface WizardProviderProps {
  children: ReactNode;
}

export function WizardProvider({ children }: WizardProviderProps) {
  const [state, dispatch] = useReducer(wizardReducer, initialState);

  const updateFormData = useCallback((data: Partial<BuildingFormData>) => {
    dispatch({ type: "UPDATE_FORM_DATA", payload: data });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
    // Scroll to top when changing steps
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
    // Scroll to top when changing steps
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const setFieldTouched = useCallback((step: number, field: string) => {
    dispatch({ type: "SET_FIELD_TOUCHED", payload: { step, field } });
  }, []);

  const isStepValid = useCallback((step: number) => {
    return state.validation[step]?.isValid ?? false;
  }, [state.validation]);

  const canProceed = useCallback(() => {
    return isStepValid(state.currentStep);
  }, [isStepValid, state.currentStep]);

  const value: WizardContextType = {
    state,
    dispatch,
    updateFormData,
    goToStep,
    nextStep,
    prevStep,
    setFieldTouched,
    isStepValid,
    canProceed,
  };

  return (
    <WizardContext.Provider value={value}>
      {children}
    </WizardContext.Provider>
  );
}

// =============================================================================
// HOOK
// =============================================================================

export function useWizard() {
  const context = useContext(WizardContext);
  if (!context) {
    throw new Error("useWizard must be used within a WizardProvider");
  }
  return context;
}
