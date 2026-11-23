"use client";

/**
 * What went wrong when the wizard tried to save.
 *
 * This replaces `alert("Failed to save building. Please try again.")`, which
 * said nothing about which of five steps the problem was on and blocked the
 * page until dismissed. A landlord who has filled in five steps and hit a
 * validation error needs to know which field and get taken to it.
 */

import { AlertCircle, ArrowRight, X } from "lucide-react";
import { WIZARD_STEPS } from "./types";

export function WizardSubmitError({
  message,
  details,
  step,
  onGoToStep,
  onDismiss,
}: {
  message: string;
  details: string[];
  /** The step to send them to, when the problem belongs to one. */
  step: number | null;
  onGoToStep: (step: number) => void;
  onDismiss: () => void;
}) {
  const stepTitle = step
    ? WIZARD_STEPS.find((s) => s.number === step)?.title
    : null;

  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4"
    >
      <AlertCircle className="w-5 h-5 shrink-0 mt-0.5 text-red-500" />
      <div className="flex-1 min-w-0">
        <p className="font-medium text-red-900">{message}</p>
        {details.length > 0 && (
          <ul className="mt-1.5 space-y-0.5 text-sm text-red-800 list-disc list-inside">
            {details.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ul>
        )}
        {step !== null && (
          <button
            type="button"
            onClick={() => onGoToStep(step)}
            className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-red-700 hover:text-red-900"
          >
            Go to {stepTitle ?? `step ${step}`}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Dismiss"
        className="p-1 -m-1 text-red-400 hover:text-red-600 shrink-0"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
