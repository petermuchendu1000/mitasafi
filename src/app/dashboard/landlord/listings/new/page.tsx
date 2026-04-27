/**
 * Property Wizard Page
 * 
 * Multi-step wizard for adding a new property listing.
 * Uses React Context for state management across steps.
 * Supports both residential and commercial listings.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { WizardProvider, useWizard } from "./context";
import { WizardProgress } from "./WizardProgress";
import { WizardNavigation } from "./WizardNavigation";
import { useToast, SuccessModal } from "@/components/ui";
import { saveDraft, publishListing } from "./listing-service";
import { useSuccessModalContent } from "./useWizardContent";
import {
  Step1PropertyType,
  Step2Location,
  Step3Details,
  Step3Commercial,
  Step4Amenities,
  Step4CommercialAmenities,
  Step5Photos,
  Step5CommercialPhotos,
  Step6Pricing,
  Step6CommercialPricing,
  Step7Review,
  Step7CommercialReview,
} from "./steps";

// Step components mapped by step number - residential flow
const RESIDENTIAL_STEPS: Record<number, React.ComponentType> = {
  1: Step1PropertyType,
  2: Step2Location,
  3: Step3Details,
  4: Step4Amenities,
  5: Step5Photos,
  6: Step6Pricing,
  7: Step7Review,
};

// Step components mapped by step number - commercial flow
const COMMERCIAL_STEPS: Record<number, React.ComponentType> = {
  1: Step1PropertyType,
  2: Step2Location,
  3: Step3Commercial,
  4: Step4CommercialAmenities,
  5: Step5CommercialPhotos,
  6: Step6CommercialPricing,
  7: Step7CommercialReview,
};

function WizardContent() {
  const router = useRouter();
  const { state, dispatch } = useWizard();
  const { currentStep, formData, draftId } = state;
  const { success, error: showError } = useToast();
  const [isPublishing, setIsPublishing] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [publishedListingId, setPublishedListingId] = useState<string | null>(null);
  
  // Select step component based on listing category
  const isCommercial = formData.listingCategory === "commercial";
  const STEP_COMPONENTS = isCommercial ? COMMERCIAL_STEPS : RESIDENTIAL_STEPS;
  const StepComponent = STEP_COMPONENTS[currentStep];

  // Handle save draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    dispatch({ type: "SET_SAVING", payload: true });
    
    try {
      const result = await saveDraft(formData, draftId);
      
      if (result.success && result.listingId) {
        // Update draft ID in state if this was a new draft
        if (!draftId) {
          dispatch({ type: "SAVE_SUCCESS", payload: { draftId: result.listingId, savedAt: new Date() } });
        } else {
          dispatch({ type: "SET_LAST_SAVED", payload: new Date().toISOString() });
        }
        dispatch({ type: "SET_DIRTY", payload: false });
        success("Draft saved", "Your listing has been saved as a draft");
      } else {
        showError("Save failed", result.error || "Failed to save draft");
      }
    } catch (err) {
      console.error("Error saving draft:", err);
      showError("Save failed", "An unexpected error occurred");
    } finally {
      setIsSavingDraft(false);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  };

  // Handle publish
  const handlePublish = async () => {
    setIsPublishing(true);
    dispatch({ type: "SET_SUBMITTING", payload: true });
    
    try {
      const result = await publishListing(formData, draftId);
      
      if (result.success && result.listingId) {
        setPublishedListingId(result.listingId);
        setShowSuccessModal(true);
      } else {
        showError("Publish failed", result.error || "Failed to publish listing");
      }
    } catch (err) {
      console.error("Error publishing:", err);
      showError("Publish failed", "An unexpected error occurred");
    } finally {
      setIsPublishing(false);
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  // Handle success modal close
  const handleSuccessClose = () => {
    setShowSuccessModal(false);
    router.push("/dashboard/landlord/listings");
  };

  // Get dynamic success modal content based on listing type
  const successContent = useSuccessModalContent();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with Progress */}
      <header className="sticky top-0 z-40 bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <WizardProgress />
        </div>
      </header>

      {/* Main Content */}
      <main className="py-8 px-4 sm:px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          {StepComponent && <StepComponent />}
        </div>
      </main>

      {/* Bottom Navigation */}
      <WizardNavigation 
        onSaveDraft={handleSaveDraft}
        onPublish={handlePublish}
      />

      {/* Success Modal */}
      <SuccessModal
        isOpen={showSuccessModal}
        onClose={handleSuccessClose}
        title={successContent.title || "Your listing is live! 🎉"}
        message={successContent.message || "Your listing is now visible to potential clients."}
        primaryAction={{
          label: successContent.primaryLabel || "View My Listings",
          href: "/dashboard/landlord/listings",
        }}
        secondaryAction={{
          label: successContent.secondaryLabel || "Create Another",
          onClick: () => {
            setShowSuccessModal(false);
            dispatch({ type: "RESET_FORM" });
          },
        }}
      />
    </div>
  );
}

export default function NewPropertyPage() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
