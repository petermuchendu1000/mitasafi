/**
 * Edit Property Page
 * 
 * Multi-step wizard for editing an existing property listing.
 * Loads the existing listing data and pre-populates the form.
 */

"use client";

import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { useState, useEffect } from "react";
import { WizardProvider, useWizard } from "../../new/context";
import { WizardProgress } from "../../new/WizardProgress";
import { WizardNavigation } from "../../new/WizardNavigation";
import { useToast, SuccessModal } from "@/components/ui";
import { saveDraft, publishListing, getListing } from "../../new/listing-service";
import { useSuccessModalContent } from "../../new/useWizardContent";
import { transformListingToFormData } from "./transform-listing";
import type { PropertyFormData } from "../../new/types";
import type { Database } from "@/types/database";
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
} from "../../new/steps";
import { Loader2, ArrowLeft } from "lucide-react";

type ListingRow = Database["public"]["Tables"]["listings"]["Row"];

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

  // Handle save (update)
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    dispatch({ type: "SET_SAVING", payload: true });
    
    try {
      const result = await saveDraft(formData, draftId);
      
      if (result.success && result.listingId) {
        dispatch({ type: "SET_LAST_SAVED", payload: new Date().toISOString() });
        dispatch({ type: "SET_DIRTY", payload: false });
        success("Changes saved", "Your listing has been updated");
      } else {
        showError("Save failed", result.error || "Failed to save changes");
      }
    } catch (err) {
      console.error("Error saving:", err);
      showError("Save failed", "An unexpected error occurred");
    } finally {
      setIsSavingDraft(false);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  };

  // Handle publish/update
  const handlePublish = async () => {
    setIsPublishing(true);
    dispatch({ type: "SET_SUBMITTING", payload: true });
    
    try {
      const result = await publishListing(formData, draftId);
      
      if (result.success && result.listingId) {
        setPublishedListingId(result.listingId);
        setShowSuccessModal(true);
      } else {
        showError("Update failed", result.error || "Failed to update listing");
      }
    } catch (err) {
      console.error("Error updating:", err);
      showError("Update failed", "An unexpected error occurred");
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
  
  // Truncate title for header display
  const displayTitle = formData.title 
    ? (formData.title.length > 40 ? formData.title.slice(0, 40) + "..." : formData.title)
    : "Untitled Listing";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Context Header - Shows which listing is being edited */}
      <div className="bg-gray-900 text-white py-2 px-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <Link 
            href="/dashboard/landlord/listings"
            className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Listings
          </Link>
          <span className="text-sm font-medium">
            Editing: <span className="text-teal-400">{displayTitle}</span>
          </span>
        </div>
      </div>

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
        title="Listing updated! ✅"
        message="Your changes have been saved and are now live."
        primaryAction={{
          label: "View My Listings",
          href: "/dashboard/landlord/listings",
        }}
        secondaryAction={{
          label: "Continue Editing",
          onClick: () => {
            setShowSuccessModal(false);
          },
        }}
      />
    </div>
  );
}

interface EditPageLoaderProps {
  listingId: string;
}

function EditPageLoader({ listingId }: EditPageLoaderProps) {
  const router = useRouter();
  const { error: showError } = useToast();
  const [loading, setLoading] = useState(true);
  const [listingData, setListingData] = useState<PropertyFormData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadListing() {
      try {
        const listing = await getListing(listingId) as ListingRow | null;
        
        if (!listing) {
          setErrorMessage("Listing not found");
          return;
        }

        const formData = transformListingToFormData(listing);
        setListingData(formData);
      } catch (err) {
        console.error("Error loading listing:", err);
        setErrorMessage("Failed to load listing");
      } finally {
        setLoading(false);
      }
    }

    loadListing();
  }, [listingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading listing...</p>
        </div>
      </div>
    );
  }

  if (errorMessage || !listingData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">❌</span>
          </div>
          <h1 className="text-xl font-semibold text-gray-900 mb-2">
            {errorMessage || "Listing not found"}
          </h1>
          <p className="text-gray-600 mb-6">
            The listing you&apos;re trying to edit could not be found or you don&apos;t have permission to edit it.
          </p>
          <button
            onClick={() => router.push("/dashboard/landlord/listings")}
            className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Back to Listings
          </button>
        </div>
      </div>
    );
  }

  return (
    <WizardProvider 
      initialData={listingData} 
      draftId={listingId}
      isEditMode={true}
      initialStep={7}
    >
      <WizardContent />
    </WizardProvider>
  );
}

export default function EditPropertyPage() {
  const params = useParams();
  const listingId = params.id as string;

  if (!listingId) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Invalid listing ID</p>
      </div>
    );
  }

  return <EditPageLoader listingId={listingId} />;
}
