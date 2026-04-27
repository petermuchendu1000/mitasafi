/**
 * ReviewForm Component (M7)
 *
 * Multi-step review form for customers to rate completed bookings.
 * Features:
 *   - 1-5 star overall rating (required)
 *   - Optional dimension ratings (quality, communication, timeliness, professionalism, value)
 *   - Optional title and text review
 *   - Optional photo uploads (max 5, max 5MB each)
 *   - Client-side validation before submit
 *   - Optimistic loading states
 */

"use client";

import { useState, useTransition, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  Camera,
  X,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui";
import { submitReview, uploadReviewPhoto } from "@/lib/services/reviews";
import { getRatingLabel } from "@/types/reviews";

// =============================================================================
// TYPES
// =============================================================================

interface ReviewFormProps {
  bookingId: string;
  providerName: string;
  serviceName: string;
}

interface PhotoPreview {
  file: File;
  preview: string;
}

// =============================================================================
// DIMENSION RATINGS CONFIG
// =============================================================================

const DIMENSIONS = [
  { key: "quality", label: "Quality of work", description: "How well was the job done?" },
  { key: "communication", label: "Communication", description: "Was the provider responsive and clear?" },
  { key: "timeliness", label: "Timeliness", description: "Was the provider on time and efficient?" },
  { key: "professionalism", label: "Professionalism", description: "Was the provider professional and courteous?" },
  { key: "value", label: "Value for money", description: "Was the price fair for what was delivered?" },
] as const;

type DimensionKey = (typeof DIMENSIONS)[number]["key"];

// =============================================================================
// SUB-COMPONENT: Interactive Star Rating
// =============================================================================

function StarRating({
  value,
  onChange,
  size = "lg",
  readonly = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  size?: "sm" | "lg";
  readonly?: boolean;
}) {
  const [hovered, setHovered] = useState(0);
  const displayValue = hovered || value;

  const starSize = size === "lg" ? "w-8 h-8" : "w-5 h-5";

  return (
    <div
      className="flex items-center gap-1"
      onMouseLeave={() => !readonly && setHovered(0)}
    >
      {Array.from({ length: 5 }).map((_, i) => {
        const starValue = i + 1;
        return (
          <button
            key={i}
            type="button"
            disabled={readonly}
            onClick={() => onChange?.(starValue)}
            onMouseEnter={() => !readonly && setHovered(starValue)}
            className={cn(
              "transition-colors focus:outline-none",
              !readonly && "cursor-pointer hover:scale-110 transition-transform",
              readonly && "cursor-default"
            )}
            aria-label={`${starValue} star${starValue !== 1 ? "s" : ""}`}
          >
            <Star
              className={cn(
                starSize,
                starValue <= displayValue
                  ? "text-amber-400 fill-amber-400"
                  : "text-gray-200"
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export function ReviewForm({
  bookingId,
  providerName,
  serviceName,
}: ReviewFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { success: showSuccess, error: showError } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [reviewText, setReviewText] = useState("");
  const [dimensionRatings, setDimensionRatings] = useState<Record<DimensionKey, number>>({
    quality: 0,
    communication: 0,
    timeliness: 0,
    professionalism: 0,
    value: 0,
  });
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [showDimensions, setShowDimensions] = useState(false);
  const [uploadingPhotos, setUploadingPhotos] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  // ── Handlers ──

  const handleDimensionChange = useCallback((key: DimensionKey, value: number) => {
    setDimensionRatings((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handlePhotoAdd = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files || []);
      if (files.length === 0) return;

      const remaining = 5 - photos.length;
      if (remaining <= 0) {
        showError("Maximum photos", "You can upload up to 5 photos.");
        return;
      }

      const toAdd = files.slice(0, remaining);
      const validFiles: PhotoPreview[] = [];

      for (const file of toAdd) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          showError("Invalid format", `${file.name}: Only JPEG, PNG, and WebP are allowed.`);
          continue;
        }
        if (file.size > 5 * 1024 * 1024) {
          showError("File too large", `${file.name}: Must be under 5MB.`);
          continue;
        }
        validFiles.push({
          file,
          preview: URL.createObjectURL(file),
        });
      }

      setPhotos((prev) => [...prev, ...validFiles]);

      // Reset input so the same file can be re-selected
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    },
    [photos.length, showError]
  );

  const handlePhotoRemove = useCallback((index: number) => {
    setPhotos((prev) => {
      const removed = prev[index];
      if (removed) URL.revokeObjectURL(removed.preview);
      return prev.filter((_, i) => i !== index);
    });
  }, []);

  const handleSubmit = () => {
    setError(null);

    // Client-side validation
    if (rating === 0) {
      setError("Please select an overall rating.");
      return;
    }

    startTransition(async () => {
      try {
        // Upload photos first (if any)
        let photoUrls: string[] = [];
        if (photos.length > 0) {
          setUploadingPhotos(true);
          const uploadResults = await Promise.all(
            photos.map(async (photo) => {
              const formData = new FormData();
              formData.append("file", photo.file);
              return uploadReviewPhoto(formData);
            })
          );
          setUploadingPhotos(false);

          const failed = uploadResults.filter((r) => !r.success);
          if (failed.length > 0) {
            setError(`Failed to upload ${failed.length} photo(s). Please try again.`);
            return;
          }
          photoUrls = uploadResults
            .filter((r): r is { success: true; url: string } => r.success && !!r.url)
            .map((r) => r.url);
        }

        // Build dimension ratings — only send non-zero
        const dims = {
          qualityRating: dimensionRatings.quality || null,
          communicationRating: dimensionRatings.communication || null,
          timelinessRating: dimensionRatings.timeliness || null,
          professionalismRating: dimensionRatings.professionalism || null,
          valueRating: dimensionRatings.value || null,
        };

        const result = await submitReview(bookingId, {
          rating,
          title: title.trim() || undefined,
          reviewText: reviewText.trim() || undefined,
          ...dims,
          photoUrls: photoUrls.length > 0 ? photoUrls : undefined,
        });

        if (result.success) {
          setSubmitted(true);
          showSuccess("Review submitted!", "Thank you for your feedback.");
          // Redirect back to booking after brief delay
          setTimeout(() => {
            router.push(`/dashboard/bookings/${bookingId}`);
            router.refresh();
          }, 1500);
        } else {
          setError(result.error || "Failed to submit review.");
          showError("Submission failed", result.error || "Please try again.");
        }
      } catch (err) {
        console.error("[ReviewForm] Submit error:", err);
        setError("An unexpected error occurred.");
        setUploadingPhotos(false);
      }
    });
  };

  // ── Success state ──

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
        <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-gray-900 mb-2">
          Review submitted!
        </h2>
        <p className="text-sm text-gray-500">
          Thank you for reviewing {providerName}. Your feedback helps other
          customers make informed decisions.
        </p>
      </div>
    );
  }

  // ── Form ──

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Overall Rating */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-900 mb-1">
          How was your experience?
        </h2>
        <p className="text-sm text-gray-500 mb-4">
          Rate {providerName}&apos;s {serviceName} service
        </p>

        <div className="flex flex-col items-center gap-2">
          <StarRating value={rating} onChange={setRating} size="lg" />
          {rating > 0 && (
            <span className="text-sm font-medium text-gray-700">
              {getRatingLabel(rating)}
            </span>
          )}
        </div>
      </div>

      {/* Dimension Ratings (collapsible) */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <button
          type="button"
          onClick={() => setShowDimensions(!showDimensions)}
          className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
        >
          <div>
            <h3 className="text-sm font-semibold text-gray-900">
              Rate specific areas
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">Optional — helps providers improve</p>
          </div>
          {showDimensions ? (
            <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" />
          ) : (
            <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
          )}
        </button>

        {showDimensions && (
          <div className="px-6 pb-6 space-y-5 border-t border-gray-100 pt-4">
            {DIMENSIONS.map((dim) => (
              <div key={dim.key}>
                <div className="flex items-center justify-between mb-1.5">
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {dim.label}
                    </p>
                    <p className="text-xs text-gray-400">{dim.description}</p>
                  </div>
                </div>
                <StarRating
                  value={dimensionRatings[dim.key]}
                  onChange={(v) => handleDimensionChange(dim.key, v)}
                  size="sm"
                />
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Title + Text */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div>
          <label
            htmlFor="review-title"
            className="block text-sm font-medium text-gray-900 mb-1.5"
          >
            Review title
            <span className="text-xs text-gray-400 font-normal ml-1">
              (optional)
            </span>
          </label>
          <input
            id="review-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g., Great plumbing service"
            maxLength={100}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {title.length}/100
          </p>
        </div>

        <div>
          <label
            htmlFor="review-text"
            className="block text-sm font-medium text-gray-900 mb-1.5"
          >
            Your review
            <span className="text-xs text-gray-400 font-normal ml-1">
              (optional)
            </span>
          </label>
          <textarea
            id="review-text"
            value={reviewText}
            onChange={(e) => setReviewText(e.target.value)}
            placeholder="Share details about the service quality, provider punctuality, and overall experience..."
            rows={4}
            maxLength={2000}
            className="w-full px-3 py-2.5 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
          />
          <p className="text-xs text-gray-400 mt-1 text-right">
            {reviewText.length}/2,000
          </p>
        </div>
      </div>

      {/* Photo Upload */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-sm font-semibold text-gray-900 mb-1">
          Add photos
          <span className="text-xs text-gray-400 font-normal ml-1">
            (optional, max 5)
          </span>
        </h3>
        <p className="text-xs text-gray-400 mb-4">
          Show the completed work to help others
        </p>

        {/* Photo preview grid */}
        {photos.length > 0 && (
          <div className="grid grid-cols-5 gap-2 mb-4">
            {photos.map((photo, index) => (
              <div
                key={index}
                className="relative aspect-square rounded-lg overflow-hidden bg-gray-100"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.preview}
                  alt={`Review photo ${index + 1}`}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => handlePhotoRemove(index)}
                  className="absolute top-1 right-1 w-5 h-5 bg-black/60 rounded-full flex items-center justify-center hover:bg-black/80 transition-colors"
                >
                  <X className="w-3 h-3 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Upload button */}
        {photos.length < 5 && (
          <label className="inline-flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-lg text-sm font-medium text-gray-600 cursor-pointer hover:bg-gray-50 hover:border-gray-400 transition-colors">
            <Camera className="w-4 h-4" />
            Add photo{photos.length > 0 ? "s" : ""}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              multiple
              onChange={handlePhotoAdd}
              className="sr-only"
            />
          </label>
        )}
      </div>

      {/* Submit */}
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isPending || rating === 0}
        className={cn(
          "w-full flex items-center justify-center gap-2 px-4 py-3.5 text-sm font-semibold rounded-xl transition-colors",
          rating > 0
            ? "bg-teal-600 text-white hover:bg-teal-700"
            : "bg-gray-100 text-gray-400 cursor-not-allowed",
          isPending && "opacity-60 cursor-not-allowed"
        )}
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            {uploadingPhotos ? "Uploading photos…" : "Submitting review…"}
          </>
        ) : (
          "Submit review"
        )}
      </button>
    </div>
  );
}
