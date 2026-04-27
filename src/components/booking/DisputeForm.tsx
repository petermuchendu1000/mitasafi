/**
 * DisputeForm Component (SC-5)
 *
 * Multi-step form for customers to file a dispute on a completed booking.
 * Steps:
 *   1. Reason selection (dispute type)
 *   2. Description of the issue
 *   3. Photo evidence (optional, max 10)
 *   4. Desired resolution
 *   5. Review & submit
 *
 * Uses FormData to pass evidence files to the server action.
 */

"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  Loader2,
  ShieldAlert,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";
import { fileDispute } from "@/app/dashboard/bookings/[id]/dispute/actions";
import type { DisputeType, DesiredResolution } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

interface DisputeFormProps {
  bookingId: string;
  providerName: string;
  serviceName: string;
  agreedPrice: number | null;
}

interface EvidencePreview {
  file: File;
  preview: string;
}

// =============================================================================
// CONFIGURATION
// =============================================================================

const DISPUTE_REASONS: {
  value: DisputeType;
  label: string;
  description: string;
  icon: string;
}[] = [
  {
    value: "quality",
    label: "Quality Issue",
    description: "The work was not done properly or to an acceptable standard",
    icon: "🔧",
  },
  {
    value: "pricing",
    label: "Pricing Dispute",
    description: "The final charge is different from the agreed price",
    icon: "💰",
  },
  {
    value: "damage",
    label: "Property Damage",
    description: "The provider caused damage to your property during the service",
    icon: "🏚️",
  },
  {
    value: "safety",
    label: "Safety Concern",
    description: "There was a safety issue during the service",
    icon: "⚠️",
  },
  {
    value: "no_show",
    label: "Provider No-Show",
    description: "The provider did not show up for the scheduled service",
    icon: "🚫",
  },
  {
    value: "cancellation",
    label: "Unfair Cancellation",
    description: "The provider cancelled without proper notice or justification",
    icon: "❌",
  },
];

const RESOLUTION_OPTIONS: {
  value: DesiredResolution;
  label: string;
  description: string;
}[] = [
  {
    value: "full_refund",
    label: "Full refund",
    description: "I want a complete refund of the amount paid",
  },
  {
    value: "partial_refund",
    label: "Partial refund",
    description: "I want a partial refund for the unsatisfactory portion",
  },
  {
    value: "redo_service",
    label: "Redo the service",
    description: "I want the provider to redo the work at no extra cost",
  },
  {
    value: "provider_apology",
    label: "Acknowledgment & apology",
    description: "I want the provider to acknowledge and apologize for the issue",
  },
  {
    value: "other",
    label: "Other",
    description: "I have a different resolution in mind (describe in your message)",
  },
];

const MAX_EVIDENCE_FILES = 10;
const MAX_FILE_SIZE_MB = 5;
const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];
const MIN_DESCRIPTION_LENGTH = 20;
const MAX_DESCRIPTION_LENGTH = 2000;

const STEPS = ["Reason", "Details", "Evidence", "Resolution", "Review"] as const;
type Step = (typeof STEPS)[number];

// =============================================================================
// COMPONENT
// =============================================================================

export function DisputeForm({
  bookingId,
  providerName,
  serviceName,
  agreedPrice,
}: DisputeFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Step state ──
  const [currentStep, setCurrentStep] = useState(0);

  // ── Form state ──
  const [disputeType, setDisputeType] = useState<DisputeType | null>(null);
  const [description, setDescription] = useState("");
  const [evidence, setEvidence] = useState<EvidencePreview[]>([]);
  const [desiredResolution, setDesiredResolution] =
    useState<DesiredResolution | null>(null);

  // ── Validation ──
  const [formError, setFormError] = useState<string | null>(null);

  // ── Step validation ──
  const canProceed = useCallback((): boolean => {
    switch (currentStep) {
      case 0: // Reason
        return disputeType !== null;
      case 1: // Details
        return (
          description.trim().length >= MIN_DESCRIPTION_LENGTH &&
          description.trim().length <= MAX_DESCRIPTION_LENGTH
        );
      case 2: // Evidence (optional)
        return true;
      case 3: // Resolution
        return desiredResolution !== null;
      case 4: // Review
        return true;
      default:
        return false;
    }
  }, [currentStep, disputeType, description, desiredResolution]);

  // ── Navigation ──
  const goNext = () => {
    if (!canProceed()) return;
    setFormError(null);
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setFormError(null);
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  };

  // ── Evidence handlers ──
  const handleAddEvidence = useCallback(
    (files: FileList | null) => {
      if (!files) return;

      const newFiles: EvidencePreview[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        if (evidence.length + newFiles.length >= MAX_EVIDENCE_FILES) {
          setFormError(`Maximum ${MAX_EVIDENCE_FILES} photos allowed.`);
          break;
        }

        if (!ALLOWED_TYPES.includes(file.type)) {
          setFormError(
            `"${file.name}" is not supported. Use JPEG, PNG, or WebP.`
          );
          continue;
        }

        if (file.size > MAX_FILE_SIZE_BYTES) {
          setFormError(
            `"${file.name}" exceeds ${MAX_FILE_SIZE_MB} MB limit.`
          );
          continue;
        }

        newFiles.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }

      if (newFiles.length > 0) {
        setEvidence((prev) => [...prev, ...newFiles]);
        setFormError(null);
      }
    },
    [evidence.length]
  );

  const handleRemoveEvidence = useCallback((index: number) => {
    setEvidence((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  // ── Submit ──
  const handleSubmit = () => {
    if (!disputeType || !desiredResolution) return;

    setFormError(null);

    startTransition(async () => {
      const formData = new FormData();
      formData.set("bookingId", bookingId);
      formData.set("disputeType", disputeType);
      formData.set("description", description.trim());
      formData.set("desiredResolution", desiredResolution);

      // Append evidence files
      evidence.forEach((item, index) => {
        formData.set(`evidence_${index}`, item.file);
      });

      const result = await fileDispute(formData);

      if (result.success) {
        // Clean up preview URLs
        evidence.forEach((item) => URL.revokeObjectURL(item.preview));

        showSuccess(
          "Dispute Filed",
          "Your dispute has been submitted. We'll review it and get back to you."
        );
        router.push(`/dashboard/bookings/${bookingId}`);
        router.refresh();
      } else {
        showError("Failed", result.error || "Something went wrong.");
        setFormError(result.error || "Failed to file dispute.");
      }
    });
  };

  // ── Render current step ──
  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <StepReason
            selected={disputeType}
            onSelect={(v) => {
              setDisputeType(v);
              setFormError(null);
            }}
          />
        );
      case 1:
        return (
          <StepDescription
            value={description}
            onChange={(v) => {
              setDescription(v);
              setFormError(null);
            }}
            disputeType={disputeType}
          />
        );
      case 2:
        return (
          <StepEvidence
            evidence={evidence}
            onAdd={handleAddEvidence}
            onRemove={handleRemoveEvidence}
            fileInputRef={fileInputRef}
          />
        );
      case 3:
        return (
          <StepResolution
            selected={desiredResolution}
            onSelect={(v) => {
              setDesiredResolution(v);
              setFormError(null);
            }}
          />
        );
      case 4:
        return (
          <StepReview
            disputeType={disputeType!}
            description={description}
            evidence={evidence}
            desiredResolution={desiredResolution!}
            providerName={providerName}
            serviceName={serviceName}
            agreedPrice={agreedPrice}
          />
        );
      default:
        return null;
    }
  };

  const isLastStep = currentStep === STEPS.length - 1;

  return (
    <div className="space-y-6">
      {/* ── Progress indicator ── */}
      <div className="flex items-center gap-1">
        {STEPS.map((label, index) => (
          <div key={label} className="flex items-center flex-1">
            <div
              className={cn(
                "flex items-center justify-center w-7 h-7 rounded-full text-xs font-semibold shrink-0 transition-colors",
                index < currentStep
                  ? "bg-teal-600 text-white"
                  : index === currentStep
                    ? "bg-red-600 text-white"
                    : "bg-gray-200 text-gray-500"
              )}
            >
              {index < currentStep ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                index + 1
              )}
            </div>
            {index < STEPS.length - 1 && (
              <div
                className={cn(
                  "flex-1 h-0.5 mx-1 transition-colors",
                  index < currentStep ? "bg-teal-600" : "bg-gray-200"
                )}
              />
            )}
          </div>
        ))}
      </div>

      {/* ── Step label ── */}
      <div className="text-center">
        <p className="text-xs text-gray-400 uppercase tracking-wide">
          Step {currentStep + 1} of {STEPS.length}
        </p>
        <h2 className="text-lg font-semibold text-gray-900 mt-1">
          {STEPS[currentStep]}
        </h2>
      </div>

      {/* ── Error banner ── */}
      {formError && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{formError}</p>
        </div>
      )}

      {/* ── Step content ── */}
      <div className="min-h-[280px]">{renderStep()}</div>

      {/* ── Navigation buttons ── */}
      <div className="flex gap-3 pt-2">
        {currentStep > 0 && (
          <button
            onClick={goBack}
            disabled={isPending}
            className="flex items-center gap-2 px-4 py-2.5 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </button>
        )}

        {!isLastStep ? (
          <button
            onClick={goNext}
            disabled={!canProceed()}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl transition-colors",
              canProceed()
                ? "bg-gray-900 text-white hover:bg-gray-800"
                : "bg-gray-200 text-gray-400 cursor-not-allowed"
            )}
          >
            Continue
            <ArrowRight className="w-4 h-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={isPending || !canProceed()}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-red-600 text-white text-sm font-semibold rounded-xl hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isPending ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <ShieldAlert className="w-4 h-4" />
                Submit Dispute
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}

// =============================================================================
// STEP 1: REASON SELECTION
// =============================================================================

function StepReason({
  selected,
  onSelect,
}: {
  selected: DisputeType | null;
  onSelect: (v: DisputeType) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-4">
        Select the reason that best describes your issue.
      </p>
      {DISPUTE_REASONS.map((reason) => (
        <button
          key={reason.value}
          onClick={() => onSelect(reason.value)}
          className={cn(
            "w-full flex items-start gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors",
            selected === reason.value
              ? "border-red-500 bg-red-50 ring-1 ring-red-500"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          )}
        >
          <span className="text-xl leading-none mt-0.5">{reason.icon}</span>
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                selected === reason.value ? "text-red-900" : "text-gray-900"
              )}
            >
              {reason.label}
            </p>
            <p
              className={cn(
                "text-xs mt-0.5",
                selected === reason.value ? "text-red-600" : "text-gray-500"
              )}
            >
              {reason.description}
            </p>
          </div>
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 mt-0.5",
              selected === reason.value
                ? "border-red-500"
                : "border-gray-300"
            )}
          >
            {selected === reason.value && (
              <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// STEP 2: DESCRIPTION
// =============================================================================

function StepDescription({
  value,
  onChange,
  disputeType,
}: {
  value: string;
  onChange: (v: string) => void;
  disputeType: DisputeType | null;
}) {
  const charCount = value.trim().length;
  const isValid = charCount >= MIN_DESCRIPTION_LENGTH;
  const isOverLimit = charCount > MAX_DESCRIPTION_LENGTH;

  const placeholders: Record<DisputeType, string> = {
    quality:
      "Describe the quality issues you experienced. What was expected vs. what was delivered?",
    pricing:
      "Explain the pricing discrepancy. What was agreed upon and what were you charged?",
    damage:
      "Describe the damage caused. What was damaged, and when did you notice it?",
    safety:
      "Describe the safety concern. What happened and were there any injuries?",
    no_show:
      "When was the provider expected? How long did you wait? Were you given any notice?",
    cancellation:
      "When were you notified of the cancellation? What reason was given?",
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-500">
        Please provide a detailed description of what happened. The more detail
        you provide, the faster we can resolve your dispute.
      </p>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={
          disputeType
            ? placeholders[disputeType]
            : "Describe the issue in detail…"
        }
        rows={6}
        maxLength={MAX_DESCRIPTION_LENGTH + 50}
        className={cn(
          "w-full px-4 py-3 border rounded-xl text-sm text-gray-900 placeholder:text-gray-400 resize-none focus:outline-none focus:ring-2 focus:border-transparent transition-colors",
          isOverLimit
            ? "border-red-300 focus:ring-red-500"
            : "border-gray-300 focus:ring-teal-500"
        )}
      />
      <div className="flex items-center justify-between">
        <p
          className={cn(
            "text-xs",
            !isValid && charCount > 0 ? "text-amber-600" : "text-gray-400"
          )}
        >
          {charCount < MIN_DESCRIPTION_LENGTH
            ? `${MIN_DESCRIPTION_LENGTH - charCount} more characters needed`
            : "Good — enough detail provided"}
        </p>
        <p
          className={cn(
            "text-xs",
            isOverLimit ? "text-red-600 font-medium" : "text-gray-400"
          )}
        >
          {charCount}/{MAX_DESCRIPTION_LENGTH}
        </p>
      </div>
    </div>
  );
}

// =============================================================================
// STEP 3: EVIDENCE UPLOAD
// =============================================================================

function StepEvidence({
  evidence,
  onAdd,
  onRemove,
  fileInputRef,
}: {
  evidence: EvidencePreview[];
  onAdd: (files: FileList | null) => void;
  onRemove: (index: number) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      onAdd(e.dataTransfer.files);
    },
    [onAdd]
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-500">
        Upload photos as evidence to support your dispute. This is optional but
        helps us resolve issues faster.
      </p>

      {/* Upload area */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl px-6 py-8 text-center cursor-pointer transition-colors",
          evidence.length >= MAX_EVIDENCE_FILES
            ? "border-gray-200 bg-gray-50 cursor-not-allowed"
            : "border-gray-300 hover:border-teal-400 hover:bg-teal-50/30"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          onChange={(e) => {
            onAdd(e.target.files);
            e.target.value = "";
          }}
          className="hidden"
          disabled={evidence.length >= MAX_EVIDENCE_FILES}
        />
        <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
        <p className="text-sm font-medium text-gray-700">
          {evidence.length >= MAX_EVIDENCE_FILES
            ? "Maximum photos reached"
            : "Click or drag photos here"}
        </p>
        <p className="text-xs text-gray-400 mt-1">
          JPEG, PNG, or WebP • Max {MAX_FILE_SIZE_MB} MB each •{" "}
          {evidence.length}/{MAX_EVIDENCE_FILES} uploaded
        </p>
      </div>

      {/* Preview grid */}
      {evidence.length > 0 && (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
          {evidence.map((item, index) => (
            <div key={index} className="relative group aspect-square">
              <img
                src={item.preview}
                alt={`Evidence ${index + 1}`}
                className="w-full h-full object-cover rounded-lg border border-gray-200"
              />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove(index);
                }}
                className="absolute -top-1.5 -right-1.5 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded">
                {index + 1}
              </div>
            </div>
          ))}
        </div>
      )}

      {evidence.length === 0 && (
        <p className="text-xs text-gray-400 text-center italic">
          No photos uploaded yet. You can skip this step.
        </p>
      )}
    </div>
  );
}

// =============================================================================
// STEP 4: RESOLUTION
// =============================================================================

function StepResolution({
  selected,
  onSelect,
}: {
  selected: DesiredResolution | null;
  onSelect: (v: DesiredResolution) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-sm text-gray-500 mb-4">
        What outcome would you like from this dispute?
      </p>
      {RESOLUTION_OPTIONS.map((option) => (
        <button
          key={option.value}
          onClick={() => onSelect(option.value)}
          className={cn(
            "w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border text-left transition-colors",
            selected === option.value
              ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500"
              : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
          )}
        >
          <div className="flex-1 min-w-0">
            <p
              className={cn(
                "text-sm font-medium",
                selected === option.value ? "text-teal-900" : "text-gray-900"
              )}
            >
              {option.label}
            </p>
            <p
              className={cn(
                "text-xs mt-0.5",
                selected === option.value ? "text-teal-600" : "text-gray-500"
              )}
            >
              {option.description}
            </p>
          </div>
          <div
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0",
              selected === option.value
                ? "border-teal-500"
                : "border-gray-300"
            )}
          >
            {selected === option.value && (
              <div className="w-2.5 h-2.5 rounded-full bg-teal-500" />
            )}
          </div>
        </button>
      ))}
    </div>
  );
}

// =============================================================================
// STEP 5: REVIEW
// =============================================================================

function StepReview({
  disputeType,
  description,
  evidence,
  desiredResolution,
  providerName,
  serviceName,
  agreedPrice,
}: {
  disputeType: DisputeType;
  description: string;
  evidence: EvidencePreview[];
  desiredResolution: DesiredResolution;
  providerName: string;
  serviceName: string;
  agreedPrice: number | null;
}) {
  const reasonLabel =
    DISPUTE_REASONS.find((r) => r.value === disputeType)?.label ?? disputeType;
  const resolutionLabel =
    RESOLUTION_OPTIONS.find((r) => r.value === desiredResolution)?.label ??
    desiredResolution;

  return (
    <div className="space-y-4">
      <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3">
        <div className="flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <p className="text-sm text-amber-800">
            Please review your dispute details carefully before submitting. The
            provider and our support team will be notified.
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
        {/* Booking info */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Booking
          </p>
          <p className="text-sm font-medium text-gray-900">{serviceName}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            Provider: {providerName}
            {agreedPrice != null && (
              <span> • KES {agreedPrice.toLocaleString()}</span>
            )}
          </p>
        </div>

        {/* Reason */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Reason
          </p>
          <p className="text-sm text-gray-900">{reasonLabel}</p>
        </div>

        {/* Description */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Description
          </p>
          <p className="text-sm text-gray-700 whitespace-pre-wrap line-clamp-6">
            {description}
          </p>
        </div>

        {/* Evidence */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Evidence
          </p>
          {evidence.length > 0 ? (
            <div className="flex gap-2 mt-1.5">
              {evidence.slice(0, 5).map((item, i) => (
                <img
                  key={i}
                  src={item.preview}
                  alt={`Evidence ${i + 1}`}
                  className="w-12 h-12 rounded-lg object-cover border border-gray-200"
                />
              ))}
              {evidence.length > 5 && (
                <div className="w-12 h-12 rounded-lg bg-gray-100 border border-gray-200 flex items-center justify-center">
                  <span className="text-xs font-medium text-gray-500">
                    +{evidence.length - 5}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400 italic">No photos uploaded</p>
          )}
        </div>

        {/* Resolution */}
        <div className="px-4 py-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">
            Desired Resolution
          </p>
          <p className="text-sm text-gray-900">{resolutionLabel}</p>
        </div>
      </div>
    </div>
  );
}
