/**
 * useWizardContent Hook
 * 
 * Provides dynamic content based on the current listing context.
 * Automatically updates when listingCategory, commercialType, or commercialSubtype changes.
 * 
 * Usage:
 * ```tsx
 * const { step2, step5, step7, successModal } = useWizardContent();
 * // or for specific step:
 * const content = useWizardContent(2); // Returns Step2Content
 * ```
 */

import { useMemo } from "react";
import { useWizard } from "./context";
import {
  getWizardContent,
  getStep2Content,
  getStep5Content,
  getStep7Content,
  getSuccessModalContent,
  type WizardContent,
  type Step2Content,
  type Step5Content,
  type Step7Content,
  type SuccessModalContent,
} from "./content-config";

// Overloaded signatures for type-safe step-specific content
export function useWizardContent(): WizardContent;
export function useWizardContent(step: 2): Step2Content;
export function useWizardContent(step: 5): Step5Content;
export function useWizardContent(step: 7): Step7Content;
export function useWizardContent(step: "successModal"): SuccessModalContent;

/**
 * Hook to get wizard content based on current form state.
 * 
 * @param step - Optional step number or "successModal" to get specific content
 * @returns Content object for the wizard or specific step
 */
export function useWizardContent(
  step?: 2 | 5 | 7 | "successModal"
): WizardContent | Step2Content | Step5Content | Step7Content | SuccessModalContent {
  const { state } = useWizard();
  const { listingCategory, commercialType, commercialSubtype } = state.formData;

  return useMemo(() => {
    if (step === 2) {
      return getStep2Content(listingCategory, commercialType, commercialSubtype);
    }
    if (step === 5) {
      return getStep5Content(listingCategory, commercialType, commercialSubtype);
    }
    if (step === 7) {
      return getStep7Content(listingCategory, commercialType, commercialSubtype);
    }
    if (step === "successModal") {
      return getSuccessModalContent(listingCategory, commercialType, commercialSubtype);
    }
    return getWizardContent(listingCategory, commercialType, commercialSubtype);
  }, [listingCategory, commercialType, commercialSubtype, step]);
}

/**
 * Alternative hooks for direct step access (cleaner in some cases)
 */
export function useStep2Content(): Step2Content {
  return useWizardContent(2);
}

export function useStep5Content(): Step5Content {
  return useWizardContent(5);
}

export function useStep7Content(): Step7Content {
  return useWizardContent(7);
}

export function useSuccessModalContent(): SuccessModalContent {
  return useWizardContent("successModal");
}
