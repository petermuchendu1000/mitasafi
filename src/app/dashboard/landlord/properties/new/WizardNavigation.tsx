/**
 * Building Wizard Navigation
 * 
 * Bottom navigation bar with Back/Continue buttons.
 * Handles step validation and progression logic.
 */

"use client";

import { cn } from "@/lib/utils";
import { ArrowLeft, ArrowRight, Save, Loader2, Building2 } from "lucide-react";
import { useWizard } from "./context";
import { TOTAL_STEPS, WIZARD_STEPS } from "./types";

interface WizardNavigationProps {
  onSaveDraft?: () => Promise<void>;
  onSave?: () => Promise<void>;
}

export function WizardNavigation({ onSaveDraft, onSave }: WizardNavigationProps) {
  const { state, nextStep, prevStep, canProceed } = useWizard();
  const { currentStep, isSaving, isSubmitting, isDirty, lastSaved } = state;

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
              Back
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
              Saved {formatRelativeTime(lastSaved)}
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
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
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
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
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

// Helper function for relative time
function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  
  if (diffMins < 1) return "just now";
  if (diffMins === 1) return "1 min ago";
  if (diffMins < 60) return `${diffMins} mins ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours === 1) return "1 hour ago";
  if (diffHours < 24) return `${diffHours} hours ago`;
  
  return date.toLocaleDateString();
}
