/**
 * Add Building — the wizard shell.
 *
 * WHAT THIS REPLACES
 *   `handleSave` was a 1500ms setTimeout, a console.log, an alert reading
 *   "Building saved successfully! 🎉" and a redirect to the buildings list,
 *   which would not contain the building because nothing had been written.
 *   Five steps of input — name, address, amenities, policies, photos, bank
 *   details — were discarded and the user was congratulated. `handleSaveDraft`
 *   did the same thing with a different alert.
 *
 *   It now uploads the photos, creates the row, and sends the landlord to the
 *   building it just made.
 *
 * SAVE DRAFT IS GONE, NOT REWIRED
 *   There is nowhere to put a draft. buildings_status_check is
 *   (active | inactive | archived) — there is no draft status — and no drafts
 *   table exists. Saving to the browser is not an option either: Step 4 holds
 *   photos as base64, so one photo can exceed the whole localStorage quota.
 *   A button that says "Draft saved successfully!" and saves nothing is worse
 *   than no button, so it is removed rather than left lying. Giving it
 *   somewhere real to go is a schema change, noted and not smuggled in here.
 *
 * THE CHROME WAS DOUBLED
 *   This page rendered `min-h-screen bg-gray-50`, its own sticky `<header>` and
 *   its own `<main>` — all three of which LandlordDashboardShell already
 *   provides around it. Two `<main>` landmarks on one page is invalid and
 *   leaves a screen reader with no single main region; the second full-height
 *   box added a dead viewport of scroll; and a second sticky header sat
 *   underneath the shell's own. Same defect as the building detail page, same
 *   fix.
 */

"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Building2, X } from "lucide-react";
import Link from "next/link";
import { WizardProvider, useWizard } from "./context";
import { WizardProgress } from "./WizardProgress";
import { WizardNavigation } from "./WizardNavigation";
import { createBuilding } from "./actions";
import { uploadWizardPhotos } from "./uploadWizardPhotos";
import { buildBuildingInsert } from "@/lib/landlord/building-submission";
import { WizardSubmitError } from "./WizardSubmitError";
import {
  Step1Basics,
  Step2Amenities,
  Step3Policies,
  Step4Photos,
  Step5Financials,
} from "./steps";

const STEP_COMPONENTS: Record<number, React.ComponentType> = {
  1: Step1Basics,
  2: Step2Amenities,
  3: Step3Policies,
  4: Step4Photos,
  5: Step5Financials,
};

/** Which step a field belongs to, so an error can point back at it. */
const FIELD_STEP: Record<string, number> = {
  name: 1,
  building_type: 1,
  address: 1,
  area: 1,
  city: 1,
  total_floors: 1,
  total_units: 1,
  year_built: 1,
  latitude: 1,
  longitude: 1,
  photos: 4,
  service_charge: 5,
  management_type: 5,
};

function WizardContent() {
  const router = useRouter();
  const { state, dispatch, updateFormData, goToStep } = useWizard();
  const { currentStep, formData } = state;

  const [problem, setProblem] = useState<{
    message: string;
    details: string[];
    step: number | null;
  } | null>(null);
  const [progress, setProgress] = useState<string | null>(null);

  const StepComponent = STEP_COMPONENTS[currentStep];

  const handleSave = async () => {
    setProblem(null);
    dispatch({ type: "SET_SUBMITTING", payload: true });

    try {
      // 1. Photos first. buildBuildingInsert refuses data: URLs, so this has to
      //    succeed before the row can be written.
      let photos = formData.photos;
      let coverPhoto = formData.cover_photo;

      if (photos.some((p) => p.startsWith("data:"))) {
        setProgress("Uploading photos…");
        const outcome = await uploadWizardPhotos(
          photos,
          coverPhoto,
          (done, total) => setProgress(`Uploading photos… ${done} of ${total}`),
        );
        photos = outcome.photos;
        coverPhoto = outcome.coverPhoto;

        // Keep whatever did upload, so a retry does not redo it.
        updateFormData({ photos, cover_photo: coverPhoto });

        if (outcome.failures.length > 0) {
          setProblem({
            message:
              "Some photos could not be uploaded, so the building was not created.",
            details: outcome.failures,
            step: 4,
          });
          return;
        }
      }

      // 2. Check locally before the round trip, so a bad field points at its step.
      const nextForm = { ...formData, photos, cover_photo: coverPhoto };
      const local = buildBuildingInsert(nextForm, "local-check");
      const localFieldErrors = Object.entries(local.errors).filter(
        ([field]) => field !== "landlord",
      );
      if (localFieldErrors.length > 0) {
        const firstStep = FIELD_STEP[localFieldErrors[0][0]] ?? null;
        setProblem({
          message: "Some details still need fixing.",
          details: localFieldErrors.map(([, msg]) => msg),
          step: firstStep,
        });
        return;
      }

      // 3. Create it.
      setProgress("Saving the building…");
      const result = await createBuilding(nextForm);

      if (!result.ok) {
        const fieldErrors = Object.entries(result.errors ?? {});
        setProblem({
          message:
            result.message ??
            "Some details still need fixing before this can be saved.",
          details: fieldErrors.map(([, msg]) => msg),
          step: fieldErrors.length
            ? (FIELD_STEP[fieldErrors[0][0]] ?? null)
            : null,
        });
        return;
      }

      // 4. Straight to the building, not to the list: the next thing to do is
      //    add its units, and that is on the building's own page.
      dispatch({ type: "SET_DIRTY", payload: false });
      router.push(`/dashboard/landlord/buildings/${result.buildingId}`);
      router.refresh();
    } catch (error) {
      console.error("[AddBuilding] submit failed:", error);
      setProblem({
        message:
          "Something went wrong while saving. Nothing was created — your answers are still here.",
        details: [],
        step: null,
      });
    } finally {
      setProgress(null);
      dispatch({ type: "SET_SUBMITTING", payload: false });
    }
  };

  return (
    <div className="-m-4 lg:-m-6">
      {/* The shell supplies min-h-screen, the <main> landmark and the page
          padding; this page used to supply all three again. The negative
          margin lets the wizard's own header and footer run full width inside
          that padding without a second scroll container. */}
      <div className="flex flex-col min-h-[calc(100vh-4rem)]">
        <div className="bg-white border-b border-gray-200 px-4 py-3">
          <div className="max-w-4xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/landlord/buildings"
                aria-label="Back to buildings"
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-teal-600" />
                </div>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900">
                    Add Building
                  </h1>
                  <p className="text-xs text-gray-500 hidden sm:block">
                    Create a new multi-unit property
                  </p>
                </div>
              </div>
            </div>

            <Link
              href="/dashboard/landlord/buildings"
              aria-label="Cancel and go back"
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </Link>
          </div>
        </div>

        <div className="bg-white border-b border-gray-200 px-4 py-4">
          <div className="max-w-4xl mx-auto">
            <WizardProgress />
          </div>
        </div>

        <div className="flex-1 px-4 py-6">
          <div className="max-w-4xl mx-auto space-y-4">
            {problem && (
              <WizardSubmitError
                message={problem.message}
                details={problem.details}
                step={problem.step}
                onGoToStep={(step) => {
                  setProblem(null);
                  goToStep(step);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
                onDismiss={() => setProblem(null)}
              />
            )}

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 md:p-8">
              <StepComponent />
            </div>
          </div>
        </div>

        <div className="sticky bottom-0">
          <WizardNavigation onSave={handleSave} progressLabel={progress} />
        </div>
      </div>
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
