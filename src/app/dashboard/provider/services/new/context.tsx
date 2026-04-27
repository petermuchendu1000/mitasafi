/**
 * Service Wizard Context
 * 
 * React Context + useReducer for managing wizard state.
 * Pattern borrowed from listings wizard.
 */

"use client";

import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  type ReactNode,
} from "react";
import { produce } from "immer";
import {
  type WizardState,
  type ServiceFormData,
  type SelectedService,
  DEFAULT_WIZARD_STATE,
  TOTAL_STEPS,
  validateStep,
} from "./types";

// =============================================================================
// ACTION TYPES
// =============================================================================

type WizardAction =
  | { type: "SET_STEP"; step: number }
  | { type: "NEXT_STEP" }
  | { type: "PREV_STEP" }
  | { type: "UPDATE_FORM_DATA"; data: Partial<ServiceFormData> }
  | { type: "ADD_SERVICE"; service: SelectedService }
  | { type: "REMOVE_SERVICE"; serviceId: string }
  | { type: "UPDATE_SERVICE"; serviceId: string; updates: Partial<SelectedService> }
  | { type: "SET_ERRORS"; errors: Record<string, string> }
  | { type: "CLEAR_ERRORS" }
  | { type: "SET_SUBMITTING"; isSubmitting: boolean }
  | { type: "RESET" };

// =============================================================================
// REDUCER
// =============================================================================

function wizardReducer(state: WizardState, action: WizardAction): WizardState {
  return produce(state, (draft) => {
    switch (action.type) {
      case "SET_STEP":
        draft.currentStep = Math.max(1, Math.min(action.step, TOTAL_STEPS));
        draft.errors = {};
        break;

      case "NEXT_STEP":
        if (draft.currentStep < TOTAL_STEPS) {
          draft.currentStep += 1;
          draft.errors = {};
        }
        break;

      case "PREV_STEP":
        if (draft.currentStep > 1) {
          draft.currentStep -= 1;
          draft.errors = {};
        }
        break;

      case "UPDATE_FORM_DATA":
        Object.assign(draft.formData, action.data);
        break;

      case "ADD_SERVICE":
        // Prevent duplicates
        if (!draft.formData.selectedServices.some(s => s.serviceId === action.service.serviceId)) {
          draft.formData.selectedServices.push(action.service);
        }
        break;

      case "REMOVE_SERVICE":
        draft.formData.selectedServices = draft.formData.selectedServices.filter(
          s => s.serviceId !== action.serviceId
        );
        break;

      case "UPDATE_SERVICE":
        const serviceIndex = draft.formData.selectedServices.findIndex(
          s => s.serviceId === action.serviceId
        );
        if (serviceIndex !== -1) {
          Object.assign(draft.formData.selectedServices[serviceIndex], action.updates);
        }
        break;

      case "SET_ERRORS":
        draft.errors = action.errors;
        break;

      case "CLEAR_ERRORS":
        draft.errors = {};
        break;

      case "SET_SUBMITTING":
        draft.isSubmitting = action.isSubmitting;
        break;

      case "RESET":
        return DEFAULT_WIZARD_STATE;
    }
  });
}

// =============================================================================
// CONTEXT
// =============================================================================

interface WizardContextValue {
  state: WizardState;
  
  // Navigation
  nextStep: () => boolean;
  prevStep: () => void;
  goToStep: (step: number) => void;
  canProceed: () => boolean;
  
  // Form Data
  updateFormData: (data: Partial<ServiceFormData>) => void;
  
  // Services
  addService: (service: SelectedService) => void;
  removeService: (serviceId: string) => void;
  updateService: (serviceId: string, updates: Partial<SelectedService>) => void;
  isServiceSelected: (serviceId: string) => boolean;
  
  // Submission
  setSubmitting: (isSubmitting: boolean) => void;
  reset: () => void;
}

const WizardContext = createContext<WizardContextValue | null>(null);

// =============================================================================
// PROVIDER
// =============================================================================

interface WizardProviderProps {
  children: ReactNode;
}

export function WizardProvider({ children }: WizardProviderProps) {
  const [state, dispatch] = useReducer(wizardReducer, DEFAULT_WIZARD_STATE);

  // Navigation
  const canProceed = useCallback(() => {
    const errors = validateStep(state.currentStep, state.formData);
    return Object.keys(errors).length === 0;
  }, [state.currentStep, state.formData]);

  const nextStep = useCallback(() => {
    const errors = validateStep(state.currentStep, state.formData);
    if (Object.keys(errors).length > 0) {
      dispatch({ type: "SET_ERRORS", errors });
      return false;
    }
    dispatch({ type: "NEXT_STEP" });
    return true;
  }, [state.currentStep, state.formData]);

  const prevStep = useCallback(() => {
    dispatch({ type: "PREV_STEP" });
  }, []);

  const goToStep = useCallback((step: number) => {
    dispatch({ type: "SET_STEP", step });
  }, []);

  // Form Data
  const updateFormData = useCallback((data: Partial<ServiceFormData>) => {
    dispatch({ type: "UPDATE_FORM_DATA", data });
  }, []);

  // Services
  const addService = useCallback((service: SelectedService) => {
    dispatch({ type: "ADD_SERVICE", service });
  }, []);

  const removeService = useCallback((serviceId: string) => {
    dispatch({ type: "REMOVE_SERVICE", serviceId });
  }, []);

  const updateService = useCallback((serviceId: string, updates: Partial<SelectedService>) => {
    dispatch({ type: "UPDATE_SERVICE", serviceId, updates });
  }, []);

  const isServiceSelected = useCallback((serviceId: string) => {
    return state.formData.selectedServices.some(s => s.serviceId === serviceId);
  }, [state.formData.selectedServices]);

  // Submission
  const setSubmitting = useCallback((isSubmitting: boolean) => {
    dispatch({ type: "SET_SUBMITTING", isSubmitting });
  }, []);

  const reset = useCallback(() => {
    dispatch({ type: "RESET" });
  }, []);

  const value: WizardContextValue = {
    state,
    nextStep,
    prevStep,
    goToStep,
    canProceed,
    updateFormData,
    addService,
    removeService,
    updateService,
    isServiceSelected,
    setSubmitting,
    reset,
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
