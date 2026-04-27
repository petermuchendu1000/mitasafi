/**
 * Property Wizard Progress Bar
 * 
 * Visual indicator showing current step and progress through the wizard.
 * Teal-dominant: current and completed steps use teal for consistency.
 */

"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { WIZARD_STEPS } from "./types";
import { useWizard } from "./context";

export function WizardProgress() {
  const { state, goToStep } = useWizard();
  const { currentStep, validation } = state;

  return (
    <div className="w-full">
      {/* Desktop Progress */}
      <div className="hidden md:block">
        <div className="flex items-center justify-between">
          {WIZARD_STEPS.map((step, index) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            const isClickable = step.id < currentStep || validation[step.id]?.isValid;

            return (
              <div key={step.id} className="flex items-center flex-1">
                {/* Step Circle & Label */}
                <button
                  onClick={() => isClickable && goToStep(step.id)}
                  disabled={!isClickable}
                  className={cn(
                    "flex flex-col items-center gap-2 group",
                    isClickable ? "cursor-pointer" : "cursor-default"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      "text-sm font-semibold transition-all duration-200",
                      "border-2",
                      isCompleted 
                        ? "bg-teal-600 border-teal-600 text-white" 
                        : isCurrent
                        ? "bg-white border-teal-600 text-teal-600 ring-4 ring-teal-100"
                        : "bg-white border-gray-200 text-gray-400",
                      isClickable && !isCurrent && !isCompleted && "group-hover:border-teal-400 group-hover:text-teal-600"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" strokeWidth={2.5} />
                    ) : (
                      step.id
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium transition-colors",
                      isCurrent 
                        ? "text-teal-600" 
                        : isCompleted 
                        ? "text-teal-600"
                        : "text-gray-400",
                      isClickable && !isCurrent && !isCompleted && "group-hover:text-teal-600"
                    )}
                  >
                    {step.shortTitle}
                  </span>
                </button>

                {/* Connector Line */}
                {index < WIZARD_STEPS.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 mt-[-20px]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-colors duration-300",
                        currentStep > step.id ? "bg-teal-600" : "bg-gray-200"
                      )}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile Progress */}
      <div className="md:hidden">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-900">
            Step {currentStep} of {WIZARD_STEPS.length}
          </span>
          <span className="text-sm text-gray-500">
            {WIZARD_STEPS[currentStep - 1].shortTitle}
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-teal-600 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / WIZARD_STEPS.length) * 100}%` }}
          />
        </div>

        {/* Step Dots */}
        <div className="flex justify-between mt-2 px-1">
          {WIZARD_STEPS.map((step) => {
            const isCompleted = currentStep > step.id;
            const isCurrent = currentStep === step.id;
            
            return (
              <button
                key={step.id}
                onClick={() => step.id < currentStep && goToStep(step.id)}
                disabled={step.id >= currentStep}
                className={cn(
                  "w-2 h-2 rounded-full transition-colors",
                  isCompleted 
                    ? "bg-teal-600" 
                    : isCurrent 
                    ? "bg-teal-600"
                    : "bg-gray-300",
                  step.id < currentStep && "cursor-pointer hover:bg-teal-500"
                )}
                aria-label={`Go to step ${step.id}: ${step.shortTitle}`}
              />
            );
          })}
        </div>
      </div>
    </div>
  );
}
