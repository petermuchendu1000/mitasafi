/**
 * Property Wizard Context
 * 
 * Provides centralized state management for the multi-step property wizard.
 * Uses React Context with useReducer for predictable state updates.
 * 
 * Performance optimizations:
 * - Uses immer for immutable state updates with minimal re-renders
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
import { produce } from "immer";
import {
  type PropertyFormData,
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
  | { type: "UPDATE_FORM_DATA"; payload: Partial<PropertyFormData> }
  | { type: "SET_VALIDATION"; payload: { step: number; validation: StepValidation } }
  | { type: "SET_FIELD_TOUCHED"; payload: { step: number; field: string } }
  | { type: "SET_SAVING"; payload: boolean }
  | { type: "SET_SUBMITTING"; payload: boolean }
  | { type: "SET_DIRTY"; payload: boolean }
  | { type: "SET_LAST_SAVED"; payload: string }
  | { type: "SAVE_SUCCESS"; payload: { draftId: string; savedAt: Date } }
  | { type: "RESET_FORM" }
  | { type: "LOAD_DRAFT"; payload: { formData: PropertyFormData; currentStep?: number; highestStepReached?: number; draftId: string } };

// =============================================================================
// INITIAL STATE
// =============================================================================

const initialState: WizardState = {
  currentStep: 1,
  highestStepReached: 1,
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
    case "SET_STEP": {
      const newStep = Math.max(1, Math.min(action.payload, TOTAL_STEPS));
      return {
        ...state,
        currentStep: newStep,
        highestStepReached: Math.max(state.highestStepReached, newStep),
      };
    }

    case "NEXT_STEP": {
      const newStep = Math.min(state.currentStep + 1, TOTAL_STEPS);
      return {
        ...state,
        currentStep: newStep,
        highestStepReached: Math.max(state.highestStepReached, newStep),
      };
    }

    case "PREV_STEP":
      return {
        ...state,
        currentStep: Math.max(state.currentStep - 1, 1),
      };

    case "UPDATE_FORM_DATA":
      // Use immer for efficient immutable updates
      return produce(state, (draft) => {
        Object.assign(draft.formData, action.payload);
        draft.isDirty = true;
      });

    case "SET_VALIDATION":
      // Use immer for efficient nested state updates
      return produce(state, (draft) => {
        const existingTouched = draft.validation[action.payload.step]?.touched || {};
        draft.validation[action.payload.step] = {
          ...action.payload.validation,
          touched: {
            ...existingTouched,
            ...action.payload.validation.touched,
          },
        };
      });

    case "SET_FIELD_TOUCHED":
      return produce(state, (draft) => {
        const step = action.payload.step;
        if (!draft.validation[step]) {
          draft.validation[step] = {
            isValid: false,
            errors: {},
            touched: {},
          };
        }
        draft.validation[step].touched[action.payload.field] = true;
      });

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
      };

    case "SAVE_SUCCESS":
      return {
        ...state,
        isSaving: false,
        isDirty: false,
        lastSaved: action.payload.savedAt,
        draftId: action.payload.draftId,
      };

    case "RESET_FORM":
      return initialState;

    case "LOAD_DRAFT": {
      const loadedStep = action.payload.currentStep || state.currentStep;
      const loadedHighest = action.payload.highestStepReached || loadedStep;
      return {
        ...state,
        formData: action.payload.formData,
        currentStep: loadedStep,
        highestStepReached: Math.max(loadedHighest, loadedStep),
        draftId: action.payload.draftId,
        isDirty: false,
      };
    }

    default:
      return state;
  }
}

// =============================================================================
// CONTEXT
// =============================================================================

interface WizardContextValue {
  state: WizardState;
  dispatch: Dispatch<WizardAction>;
  isEditMode: boolean;
  
  // Convenience methods
  goToStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  updateFormData: (data: Partial<PropertyFormData>) => void;
  setValidation: (step: number, validation: StepValidation) => void;
  setFieldTouched: (step: number, field: string) => void;
  canProceed: () => boolean;
  getStepProgress: () => number;
  goToReview: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface WizardProviderProps {
  children: ReactNode;
  initialData?: Partial<PropertyFormData>;
  draftId?: string | null;
  isEditMode?: boolean;
  initialStep?: number;
}

export function WizardProvider({ 
  children, 
  initialData,
  draftId,
  isEditMode = false,
  initialStep = 1,
}: WizardProviderProps) {
  const [state, dispatch] = useReducer(wizardReducer, {
    ...initialState,
    currentStep: initialStep,
    highestStepReached: isEditMode ? TOTAL_STEPS : initialStep,
    formData: initialData 
      ? { ...DEFAULT_FORM_DATA, ...initialData }
      : DEFAULT_FORM_DATA,
    draftId: draftId || null,
  });

  // Navigation methods
  const goToStep = useCallback((step: number) => {
    dispatch({ type: "SET_STEP", payload: step });
  }, []);

  const nextStep = useCallback(() => {
    dispatch({ type: "NEXT_STEP" });
  }, []);

  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  // Data methods
  const updateFormData = useCallback((data: Partial<PropertyFormData>) => {
    dispatch({ type: "UPDATE_FORM_DATA", payload: data });
  }, []);

  const setValidation = useCallback((step: number, validation: StepValidation) => {
    dispatch({ type: "SET_VALIDATION", payload: { step, validation } });
  }, []);

  const setFieldTouched = useCallback((step: number, field: string) => {
    dispatch({ type: "SET_FIELD_TOUCHED", payload: { step, field } });
  }, []);

  // Computed values
  const canProceed = useCallback(() => {
    const stepValidation = state.validation[state.currentStep];
    return stepValidation?.isValid ?? false;
  }, [state.validation, state.currentStep]);

  const getStepProgress = useCallback(() => {
    return ((state.currentStep - 1) / (TOTAL_STEPS - 1)) * 100;
  }, [state.currentStep]);

  // Go directly to review (step 7) - used in edit mode
  const goToReview = useCallback(() => {
    dispatch({ type: "SET_STEP", payload: TOTAL_STEPS });
  }, []);

  const value: WizardContextValue = {
    state,
    dispatch,
    isEditMode,
    goToStep,
    nextStep,
    prevStep,
    updateFormData,
    setValidation,
    setFieldTouched,
    canProceed,
    getStepProgress,
    goToReview,
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
