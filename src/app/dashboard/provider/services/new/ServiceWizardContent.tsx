/**
 * Service Wizard Content
 * 
 * Client component that renders the wizard UI.
 * Includes progress indicator, step content, and navigation.
 */

"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { cn } from "@/lib/utils";
import { ArrowLeft, Loader2 } from "lucide-react";
import { useWizard } from "./context";
import { WIZARD_STEPS, TOTAL_STEPS } from "./types";
import { Step1Category } from "./steps/Step1Category";
import { Step2Services } from "./steps/Step2Services";
import { Step3Pricing } from "./steps/Step3Pricing";
import { Step4ServiceAreas } from "./steps/Step4ServiceAreas";
import { Step5DescriptionImages } from "./steps/Step5DescriptionImages";
import { Step6Review } from "./steps/Step6Review";
import { addProviderServices } from "../actions";

export function ServiceWizardContent() {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { state, nextStep, prevStep, canProceed, setSubmitting } = useWizard();
  const { currentStep, formData, isSubmitting } = state;

  const isFirstStep = currentStep === 1;
  const isLastStep = currentStep === TOTAL_STEPS;

  const handleBack = () => {
    if (isFirstStep) {
      router.push("/dashboard/provider/services");
    } else {
      prevStep();
    }
  };

  const handleContinue = () => {
    if (isLastStep) {
      handleSubmit();
    } else {
      nextStep();
    }
  };

  const handleSubmit = async () => {
    if (!canProceed()) return;

    setSubmitting(true);

    startTransition(async () => {
      const result = await addProviderServices({
        services: formData.selectedServices.map((s) => ({
          serviceId: s.serviceId,
          customPrice: s.customPrice,
          priceType: s.priceType,
          description: s.description,
          experienceYears: s.experienceYears,
          imageUrls: formData.serviceImages?.[s.serviceId]?.imageUrls || [],
        })),
        serviceAreas: formData.serviceAreas
          ? { bulk: formData.serviceAreas.bulk, canTravelOutside: formData.serviceAreas.canTravelOutside }
          : undefined,
      });

      if (result.success) {
        router.push("/dashboard/provider/services");
      } else {
        // Show error - in real app would use toast
        alert(result.error || "Failed to add services");
        setSubmitting(false);
      }
    });
  };

  // Render step content
  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <Step1Category />;
      case 2:
        return <Step2Services />;
      case 3:
        return <Step3Pricing />;
      case 4:
        return <Step4ServiceAreas />;
      case 5:
        return <Step5DescriptionImages />;
      case 6:
        return <Step6Review />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <h1 className="text-lg font-semibold text-gray-900">Add Services</h1>
          <button
            onClick={() => router.push("/dashboard/provider/services")}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Cancel
          </button>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          {/* Step indicators */}
          <div className="flex items-center justify-between mb-2">
            {WIZARD_STEPS.map((step, index) => {
              const isActive = step.id === currentStep;
              const isCompleted = step.id < currentStep;
              return (
                <div
                  key={step.id}
                  className="flex items-center gap-2"
                >
                  {/* Step number/check */}
                  <div
                    className={cn(
                      "w-7 h-7 rounded-full flex items-center justify-center text-sm font-medium",
                      isCompleted
                        ? "bg-teal-600 text-white"
                        : isActive
                        ? "bg-teal-600 text-white"
                        : "bg-gray-200 text-gray-500"
                    )}
                  >
                    {step.id}
                  </div>
                  {/* Step title */}
                  <span
                    className={cn(
                      "text-sm hidden sm:block",
                      isActive ? "font-medium text-gray-900" : "text-gray-500"
                    )}
                  >
                    {step.shortTitle}
                  </span>
                  {/* Connector line */}
                  {index < WIZARD_STEPS.length - 1 && (
                    <div
                      className={cn(
                        "flex-1 h-0.5 mx-2 min-w-[20px] sm:min-w-[40px]",
                        isCompleted ? "bg-teal-600" : "bg-gray-200"
                      )}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Step Content */}
      <main className="flex-1 px-6 py-8 overflow-auto">
        {renderStep()}
      </main>

      {/* Navigation Footer */}
      <footer className="bg-white border-t border-gray-200 px-6 py-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          {/* Back Button */}
          <button
            onClick={handleBack}
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-lg",
              "text-gray-600 hover:text-gray-900 hover:bg-gray-100",
              "transition-colors text-sm font-medium"
            )}
          >
            <ArrowLeft className="w-4 h-4" />
            {isFirstStep ? "Cancel" : "Back"}
          </button>

          {/* Continue/Submit Button */}
          <button
            onClick={handleContinue}
            disabled={!canProceed() || isSubmitting || isPending}
            className={cn(
              "inline-flex items-center gap-2 px-5 py-2.5 rounded-lg",
              "text-white font-medium text-sm transition-all",
              canProceed() && !isSubmitting && !isPending
                ? "bg-teal-600 hover:bg-teal-700"
                : "bg-gray-300 cursor-not-allowed"
            )}
          >
            {(isSubmitting || isPending) ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Saving...
              </>
            ) : isLastStep ? (
              "Add Services"
            ) : (
              "Continue"
            )}
          </button>
        </div>
      </footer>
    </div>
  );
}
