/**
 * Property Wizard Navigation
 * 
 * Bottom navigation bar with Back/Continue buttons.
 * Uses orange for primary action buttons.
 */

"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Save, Loader2 } from "lucide-react";
import { useWizard } from "./context";
import { TOTAL_STEPS, WIZARD_STEPS } from "./types";

interface WizardNavigationProps {
  onSaveDraft?: () => Promise<void>;
  onPublish?: () => Promise<void>;
}

export function WizardNavigation({ onSaveDraft, onPublish }: WizardNavigationProps) {
  const { state, nextStep, prevStep, canProceed, isEditMode, goToReview } = useWizard();
  const { currentStep, isSaving, isSubmitting, isDirty, lastSaved } = state;

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;
  const canContinue = canProceed();
  
  // Get next step label - in edit mode, show "Save & Review" except on step 7
  const currentStepConfig = WIZARD_STEPS.find(s => s.id === currentStep);
  const nextButtonLabel = isEditMode && !isLastStep 
    ? "Save & Review" 
    : (currentStepConfig?.nextLabel || "Continue");

  const handleContinue = () => {
    if (canContinue) {
      // In edit mode, go back to review instead of next step
      if (isEditMode && !isLastStep) {
        goToReview();
      } else {
        nextStep();
      }
      // Scroll to top of page
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };
  
  const handleBack = () => {
    // In edit mode, "Back" returns to review (unless already on review)
    if (isEditMode && !isLastStep) {
      goToReview();
    } else {
      prevStep();
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handlePublish = async () => {
    if (onPublish && canContinue) {
      await onPublish();
    }
  };

  const handleSaveDraft = async () => {
    if (onSaveDraft) {
      await onSaveDraft();
    }
  };

  return (
    <div className="border-t border-gray-200 bg-white px-6 py-4">
      <div className="flex items-center justify-between max-w-4xl mx-auto">
        {/* Left: Back Button */}
        <div className="w-32">
          {!isFirstStep && (
            <button
              onClick={handleBack}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
                "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
                "transition-colors text-sm font-medium",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500"
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              {isEditMode && !isLastStep ? "Cancel" : "Back"}
            </button>
          )}
        </div>

        {/* Center: Save Status */}
        <div className="flex-1 flex justify-center">
          {isDirty && !isSaving && (
            <button
              onClick={handleSaveDraft}
              className={cn(
                "inline-flex items-center gap-2 px-3 py-1.5 rounded-md",
                "text-gray-500 hover:text-gray-700 hover:bg-gray-100",
                "transition-colors text-xs font-medium"
              )}
            >
              <Save className="w-3.5 h-3.5" />
              Save draft
            </button>
          )}
          {isSaving && (
            <span className="inline-flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              Saving...
            </span>
          )}
          {lastSaved && !isDirty && !isSaving && (
            <span className="text-xs text-gray-400">
              Draft saved
            </span>
          )}
        </div>

        {/* Right: Continue/Publish Button */}
        <div className="w-40 flex justify-end">
          {isLastStep ? (
            <button
              onClick={handlePublish}
              disabled={!canContinue || isSubmitting}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg",
                "text-white font-semibold text-sm transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                canContinue && !isSubmitting
                  ? "bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500 shadow-sm hover:shadow"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {isEditMode ? "Updating..." : "Publishing..."}
                </>
              ) : (
                isEditMode ? "Update Listing" : "Publish"
              )}
            </button>
          ) : (
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg",
                "text-white font-semibold text-sm transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
                canContinue
                  ? "bg-orange-500 hover:bg-orange-600 focus-visible:ring-orange-500 shadow-sm hover:shadow"
                  : "bg-gray-300 cursor-not-allowed"
              )}
            >
              {nextButtonLabel}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
