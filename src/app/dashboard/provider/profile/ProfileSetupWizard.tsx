/**
 * Profile Setup Wizard
 * 
 * Multi-step wizard component for provider profile completion.
 * Tracks progress and saves data at each step.
 */

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  User,
  MapPin,
  Clock,
  CheckCircle,
  ChevronRight,
  ChevronLeft,
  Camera,
  Globe,
} from "lucide-react";
import type {
  ProviderProfileWithRelations,
  NeighborhoodCluster,
  SocialLinks,
} from "@/types/provider-profile";
import { ProfileBasicsForm } from "./ProfileBasicsForm";
import { SocialLinksForm } from "./SocialLinksForm";
import { ServiceAreasForm } from "./ServiceAreasForm";
import { WorkingHoursForm } from "./WorkingHoursForm";
import { ProfilePhotoUpload } from "./ProfilePhotoUpload";

interface ProfileSetupWizardProps {
  initialProfile: ProviderProfileWithRelations | null;
  neighborhoodClusters: NeighborhoodCluster[];
}

type Step = "photo" | "basics" | "socials" | "areas" | "hours" | "complete";

const STEPS: { id: Step; label: string; icon: typeof User }[] = [
  { id: "photo", label: "Photo", icon: Camera },
  { id: "basics", label: "About You", icon: User },
  { id: "areas", label: "Service Areas", icon: MapPin },
  { id: "hours", label: "Working Hours", icon: Clock },
  { id: "socials", label: "Online", icon: Globe },
];

export function ProfileSetupWizard({
  initialProfile,
  neighborhoodClusters,
}: ProfileSetupWizardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Determine starting step based on profile completion
  const getInitialStep = (): Step => {
    if (!initialProfile?.profile_photo_url) return "photo";
    if (!initialProfile?.headline || !initialProfile?.bio) return "basics";
    if (!initialProfile?.service_areas?.length) return "areas";
    if (!initialProfile?.working_hours?.some(h => h.is_available)) return "hours";
    // Social links step is always considered "done" (optional)
    return "complete";
  };

  const [currentStep, setCurrentStep] = useState<Step>(getInitialStep());
  const [completedSteps, setCompletedSteps] = useState<Set<Step>>(() => {
    const completed = new Set<Step>();
    if (initialProfile?.profile_photo_url) completed.add("photo");
    if (initialProfile?.headline && initialProfile?.bio) completed.add("basics");
    completed.add("socials"); // Always mark optional step as visitable
    if (initialProfile?.service_areas?.length) completed.add("areas");
    if (initialProfile?.working_hours?.some(h => h.is_available)) completed.add("hours");
    return completed;
  });

  const currentStepIndex = STEPS.findIndex((s) => s.id === currentStep);
  const isLastStep = currentStepIndex === STEPS.length - 1;
  const isFirstStep = currentStepIndex === 0;

  const handleStepComplete = (step: Step) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
    
    // Move to next step
    const nextIndex = currentStepIndex + 1;
    if (nextIndex < STEPS.length) {
      setCurrentStep(STEPS[nextIndex].id);
    } else {
      setCurrentStep("complete");
    }
  };

  const handleBack = () => {
    if (!isFirstStep) {
      setCurrentStep(STEPS[currentStepIndex - 1].id);
    }
  };

  const handleGoToStep = (step: Step) => {
    // Allow going back to completed steps or current step
    const stepIndex = STEPS.findIndex((s) => s.id === step);
    if (stepIndex <= currentStepIndex || completedSteps.has(step)) {
      setCurrentStep(step);
    }
  };

  const handleFinish = () => {
    startTransition(() => {
      router.push("/dashboard/provider");
    });
  };

  if (currentStep === "complete") {
    return (
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Profile Setup Complete
        </h2>
        <p className="text-gray-500 mb-6 max-w-md mx-auto">
          Your profile is now set up. Add your services to start receiving job requests from clients.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={() => router.push("/dashboard/provider/services/new")}
            className="px-6 py-3 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
          >
            Add Your Services
          </button>
          <button
            onClick={handleFinish}
            className="px-6 py-3 bg-gray-100 text-gray-700 font-medium rounded-lg hover:bg-gray-200 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h1 className="text-xl font-semibold text-gray-900 mb-6">
          Complete Your Profile
        </h1>

        {/* Step Progress */}
        <div className="flex items-center justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = completedSteps.has(step.id);
            const canClick = index <= currentStepIndex || isCompleted;

            return (
              <div key={step.id} className="flex items-center">
                <button
                  onClick={() => canClick && handleGoToStep(step.id)}
                  disabled={!canClick}
                  className={cn(
                    "flex flex-col items-center gap-2 group",
                    canClick ? "cursor-pointer" : "cursor-not-allowed"
                  )}
                >
                  <div
                    className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center transition-colors",
                      isActive
                        ? "bg-teal-600 text-white"
                        : isCompleted
                        ? "bg-teal-100 text-teal-600"
                        : "bg-gray-100 text-gray-400"
                    )}
                  >
                    {isCompleted && !isActive ? (
                      <CheckCircle className="w-5 h-5" />
                    ) : (
                      <Icon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium",
                      isActive
                        ? "text-teal-600"
                        : isCompleted
                        ? "text-gray-700"
                        : "text-gray-400"
                    )}
                  >
                    {step.label}
                  </span>
                </button>

                {index < STEPS.length - 1 && (
                  <div
                    className={cn(
                      "w-12 sm:w-20 h-0.5 mx-2",
                      completedSteps.has(step.id)
                        ? "bg-teal-300"
                        : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {currentStep === "photo" && (
          <ProfilePhotoUpload
            initialPhotoUrl={initialProfile?.profile_photo_url || null}
            onComplete={() => handleStepComplete("photo")}
            onSkip={() => handleStepComplete("photo")}
          />
        )}

        {currentStep === "basics" && (
          <ProfileBasicsForm
            initialData={{
              headline: initialProfile?.headline || "",
              bio: initialProfile?.bio || "",
              years_experience: initialProfile?.years_experience || "",
              languages: initialProfile?.languages || ["English", "Swahili"],
            }}
            onComplete={() => handleStepComplete("basics")}
            onBack={handleBack}
          />
        )}

        {currentStep === "socials" && (
          <SocialLinksForm
            initialData={(initialProfile as unknown as Record<string, unknown>)?.social_links as SocialLinks || {}}
            onComplete={() => handleStepComplete("socials")}
            onBack={handleBack}
          />
        )}

        {currentStep === "areas" && (
          <ServiceAreasForm
            clusters={neighborhoodClusters}
            initialBaseNeighborhoodId={initialProfile?.base_neighborhood_id || null}
            initialServiceAreaIds={
              initialProfile?.service_areas?.map((a) => a.neighborhood_id) || []
            }
            initialRadius={initialProfile?.service_radius_km || 10}
            onComplete={() => handleStepComplete("areas")}
            onBack={handleBack}
          />
        )}

        {currentStep === "hours" && (
          <WorkingHoursForm
            initialHours={initialProfile?.working_hours || []}
            initialEmergency={{
              available: initialProfile?.emergency_available || false,
              surchargeType: initialProfile?.emergency_surcharge_type || null,
              surchargeAmount: initialProfile?.emergency_surcharge_amount || null,
            }}
            initialResponseTime={initialProfile?.response_time || null}
            onComplete={() => handleStepComplete("hours")}
            onBack={handleBack}
          />
        )}
      </div>
    </div>
  );
}
