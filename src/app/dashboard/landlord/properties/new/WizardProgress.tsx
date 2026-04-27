/**
 * Building Wizard Progress Bar
 * 
 * Visual indicator showing current step and progress through the wizard.
 * Follows MitaSafi brand colors with teal accents.
 */

"use client";

import { cn } from "@/lib/utils";
import { Check } from "lucide-react";
import { WIZARD_STEPS, TOTAL_STEPS } from "./types";
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
            const isCompleted = currentStep > step.number;
            const isCurrent = currentStep === step.number;
            const isClickable = step.number < currentStep || validation[step.number]?.isValid;

            return (
              <div key={step.number} className="flex items-center flex-1">
                {/* Step Circle & Label */}
                <button
                  onClick={() => isClickable && goToStep(step.number)}
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
                      isClickable && !isCurrent && "group-hover:border-teal-400 group-hover:text-teal-600"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" strokeWidth={2.5} />
                    ) : (
                      step.number
                    )}
                  </div>
                  <div className="text-center">
                    <span
                      className={cn(
                        "text-xs font-medium transition-colors block",
                        isCurrent 
                          ? "text-teal-600" 
                          : isCompleted 
                          ? "text-gray-700"
                          : "text-gray-400",
                        isClickable && !isCurrent && "group-hover:text-teal-600"
                      )}
                    >
                      {step.title}
                    </span>
                  </div>
                </button>

                {/* Connector Line */}
                {index < WIZARD_STEPS.length - 1 && (
                  <div className="flex-1 mx-3 h-0.5 mt-[-20px]">
                    <div
                      className={cn(
                        "h-full rounded-full transition-colors duration-300",
                        currentStep > step.number ? "bg-teal-600" : "bg-gray-200"
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
            Step {currentStep} of {TOTAL_STEPS}
          </span>
          <span className="text-sm text-gray-500">
            {WIZARD_STEPS[currentStep - 1].title}
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-teal-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(currentStep / TOTAL_STEPS) * 100}%` }}
          />
        </div>
        <p className="text-xs text-gray-500 mt-2">
          {WIZARD_STEPS[currentStep - 1].description}
        </p>
      </div>
    </div>
  );
}
