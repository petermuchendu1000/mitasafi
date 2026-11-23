"use client";

/**
 * What is still outstanding on this step.
 *
 * THE DEFECT THIS REPLACES
 *   Every step of this wizard computes validation errors and pushes them into
 *   wizard state. Fourteen of them then rendered nothing at all: Step 1, the
 *   amenities steps, commercial pricing, both review steps, and all eight
 *   specialized commercial forms. Measured: 10 error messages computed in the
 *   step files alone and 0 displayed, plus whatever the shared
 *   validateRequiredFields produced for the specialized forms.
 *
 *   The Continue button meanwhile was `disabled={!canContinue}`. So a landlord
 *   on an incomplete step saw a dead button and no reason for it — and a
 *   screen-reader user saw nothing at all, because a disabled button is not
 *   focusable and is skipped entirely.
 *
 * WHY ONE COMPONENT RATHER THAN A MESSAGE PER FIELD
 *   The errors are already in shared state, keyed by step. Reading them in one
 *   place covers every step, including the eight specialized forms that contain
 *   no error markup of their own, without touching fourteen files and without
 *   risking the kind of wrong field/message pairing that per-field wiring
 *   invites.
 *
 * WHY IT IS A CHECKLIST, NOT AN ALERT
 *   The step is invalid from the moment it is opened, before the landlord has
 *   done anything wrong. Phrasing it as "to continue, complete these" is
 *   accurate then and still accurate after a failed attempt. aria-live is
 *   "polite" so items leaving the list as they are filled in are announced
 *   without interrupting typing.
 *
 * NO NEW RULES
 *   This only displays what the wizard already decided. It does not validate
 *   anything itself, so it cannot change which listings are accepted.
 */

import { AlertCircle } from "lucide-react";
import { useWizard } from "./context";

/** The id the Continue button points at, so it can say why it is unavailable. */
export const STEP_SUMMARY_ID = "step-validation-summary";

export function StepValidationSummary() {
  const { state } = useWizard();
  const { currentStep, validation } = state;

  const stepValidation = validation[currentStep];

  // Only when the step actually BLOCKS. Step5CommercialPhotos records a
  // "Please add a cover photo" error while setting isValid: true, because
  // photos are optional — and the first version of this component ignored
  // isValid, so that step announced "One thing left before you can continue"
  // next to a perfectly usable Continue button. The sentence was false.
  // An advisory message belongs beside its field, not in a blocking banner.
  const blocking = stepValidation?.isValid === false;

  const messages = (
    blocking ? Object.entries(stepValidation?.errors ?? {}) : []
  )
    // Guard against an empty or non-string message reaching the list.
    .filter(([, message]) => typeof message === "string" && message.trim())
    .map(([field, message]) => [field, message as string] as const);

  // The live region must exist in the DOM BEFORE it has content, or a screen
  // reader will not announce the first message that appears in it.
  return (
    <div
      id={STEP_SUMMARY_ID}
      aria-live="polite"
      className={messages.length ? "mb-6" : "sr-only"}
    >
      {messages.length > 0 && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertCircle
              aria-hidden="true"
              className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5"
            />
            <div>
              <p className="text-sm font-medium text-amber-900">
                {messages.length === 1
                  ? "One thing left before you can continue"
                  : `${messages.length} things left before you can continue`}
              </p>
              <ul className="mt-1.5 space-y-1">
                {messages.map(([field, message]) => (
                  <li key={field} className="text-sm text-amber-800">
                    {message}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
