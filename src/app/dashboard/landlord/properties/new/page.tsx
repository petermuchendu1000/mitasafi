/**
 * Building Wizard Page
 * 
 * Multi-step wizard for adding a new building (multi-unit property).
 * Uses React Context for state management across steps.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Building2, X } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { WizardProvider, useWizard } from "./context";
import { WizardProgress } from "./WizardProgress";
import { WizardNavigation } from "./WizardNavigation";
import {
  Step1Basics,
  Step2Amenities,
  Step3Policies,
  Step4Photos,
  Step5Financials,
} from "./steps";

// Step components mapped by step number
const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: Step1Basics,
  2: Step2Amenities,
  3: Step3Policies,
  4: Step4Photos,
  5: Step5Financials,
};

function WizardContent() {
  const router = useRouter();
  const { state, dispatch } = useWizard();
  const { currentStep, formData } = state;
  const [isSaving, setIsSaving] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  
  const StepComponent = STEP_COMPONENTS[currentStep];

  // Handle save draft
  const handleSaveDraft = async () => {
    setIsSavingDraft(true);
    dispatch({ type: "SET_SAVING", payload: true });
    
    try {
      // Simulate API call - replace with actual Supabase integration
      await new Promise((resolve) => setTimeout(resolve, 1000));
      
      // In production, this would:
      // 1. Upload photos to Supabase Storage
      // 2. Save building data to the buildings table with status='draft'
      
      console.log("Draft saved:", formData);
      
      dispatch({ type: "SET_LAST_SAVED", payload: new Date().toISOString() });
      dispatch({ type: "SET_DIRTY", payload: false });
      
      // Show success toast (would use a toast library in production)
      alert("Draft saved successfully!");
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("Failed to save draft. Please try again.");
    } finally {
      setIsSavingDraft(false);
      dispatch({ type: "SET_SAVING", payload: false });
    }
  };

  // Handle save building
  const handleSave = async () => {
    setIsSaving(true);
    dispatch({ type: "SET_SUBMITTING", payload: true });
    
    try {
      // Simulate API call - replace with actual Supabase integration
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      // In production, this would:
      // 1. Upload photos to Supabase Storage
      // 2. Save building data to the buildings table with status='active'
      // 3. Redirect to add units flow
      
      console.log("Saving building:", formData);
      
      // Show success and redirect to add units
      alert("Building saved successfully! 🎉\n\nNow let's add units to this building.");
      
      // TODO: Redirect to units management with building ID
      router.push("/dashboard/landlord/properties");
    } catch (error) {
      console.error("Error saving building:", error);
      alert("Failed to save building. Please try again.");
    } finally {
      setIsSaving(false);
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/dashboard/landlord/properties"
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                <Building2 className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-gray-900">Add Building</h1>
                <p className="text-xs text-gray-500 hidden sm:block">
                  Create a new multi-unit property
                </p>
              </div>
            </div>
          </div>
          
          <Link
            href="/dashboard/landlord/properties"
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </Link>
        </div>
      </header>

      {/* Progress */}
      <div className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-4xl mx-auto">
          <WizardProgress />
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
            <StepComponent />
          </div>
        </div>
      </main>

      {/* Navigation */}
      <footer className="sticky bottom-0">
        <WizardNavigation 
          onSaveDraft={handleSaveDraft}
          onSave={handleSave}
        />
      </footer>
    </div>
  );
}

export default function NewBuildingPage() {
  return (
    <WizardProvider>
      <WizardContent />
    </WizardProvider>
  );
}
