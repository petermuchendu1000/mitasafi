/**
 * Building Wizard Navigation
 *
 * Bottom navigation bar with Back/Continue buttons.
 * Handles step validation and progression logic.
 */

"use client";

import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Loader2, Building2 } from "lucide-react";
import { useWizard } from "./context";
import { TOTAL_STEPS } from "./types";

interface WizardNavigationProps {
  onSave?: () => Promise<void>;
  /**
   * What the submit is doing right now ("Uploading photos… 2 of 4"). Saving a
   * building uploads photos first, which on a slow connection is long enough
   * that a bare spinner reads as a hang.
   */
  progressLabel?: string | null;
}

export function WizardNavigation({
  onSave,
  progressLabel,
}: WizardNavigationProps) {
  const { state, nextStep, prevStep, canProceed } = useWizard();
  const { currentStep, isSubmitting } = state;

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;
  const canContinue = canProceed();

  const handleContinue = () => {
    if (canContinue) {
      nextStep();
    }
  };

  const handleBack = () => {
    prevStep();
  };

  const handleSave = async () => {
    if (onSave && canContinue) {
      await onSave();
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
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
              )}
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>
          )}
        </div>

        {/*
          A "Save draft" button used to live here. It called a handler that
          waited 1000ms and alerted "Draft saved successfully!" without writing
          anything. There is nowhere for a draft to go — buildings_status_check
          is (active | inactive | archived), there is no drafts table, and Step
          4 keeps photos as base64 so the browser's storage quota is not an
          option either. It is removed rather than left lying; giving drafts a
          real home is a schema change.
        */}
        <div className="flex-1 flex justify-center">
          {isSubmitting && progressLabel && (
            <span className="inline-flex items-center gap-2 text-xs text-gray-500">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {progressLabel}
            </span>
          )}
        </div>

        {/* Right: Continue/Save Button */}
        <div className="w-32 flex justify-end">
          {isLastStep ? (
            <button
              onClick={handleSave}
              disabled={!canContinue || isSubmitting}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg",
                "text-sm font-semibold transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                canContinue && !isSubmitting
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving…
                </>
              ) : (
                <>
                  <Building2 className="w-4 h-4" />
                  Save Building
                </>
              )}
            </button>
          ) : (
            <button
              onClick={handleContinue}
              disabled={!canContinue}
              className={cn(
                "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg",
                "text-sm font-semibold transition-all",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                canContinue
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed",
              )}
            >
              Continue
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
