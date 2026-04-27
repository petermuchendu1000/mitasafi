"use client";

// =============================================================================
// MITASAFI: JOB PHOTOS COMPONENT (M5)
// =============================================================================
// Allows providers to upload before/during/after photos for a booking.
// Customers can view the photos grouped by stage.
//
// Uses: booking_media table with `stage` column (before/during/after/proof/issue).
// Storage: Supabase bucket `booking-media`.
// =============================================================================

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import {
  Camera,
  ImagePlus,
  Loader2,
  Trash2,
  X,
} from "lucide-react";
import type { BookingMedia } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

type MediaStage = BookingMedia["stage"];

interface JobPhotosProps {
  bookingId: string;
  /** Existing media items for this booking. */
  media: BookingMedia[];
  /** Whether the current user can upload (i.e., they are the provider). */
  canUpload: boolean;
  /** Current booking status — determines which upload stages are available. */
  bookingStatus: string;
}

interface StageConfig {
  label: string;
  description: string;
  color: string;
  bgColor: string;
}

// =============================================================================
// CONSTANTS
// =============================================================================

const STAGE_CONFIG: Record<MediaStage, StageConfig> = {
  before: {
    label: "Before",
    description: "Photos of the area before work begins",
    color: "text-blue-700",
    bgColor: "bg-blue-50 border-blue-200",
  },
  during: {
    label: "During",
    description: "Progress photos while working",
    color: "text-amber-700",
    bgColor: "bg-amber-50 border-amber-200",
  },
  after: {
    label: "After",
    description: "Photos showing the completed work",
    color: "text-green-700",
    bgColor: "bg-green-50 border-green-200",
  },
  proof: {
    label: "Proof",
    description: "Evidence of work completion",
    color: "text-purple-700",
    bgColor: "bg-purple-50 border-purple-200",
  },
  issue: {
    label: "Issue",
    description: "Photos documenting a problem",
    color: "text-red-700",
    bgColor: "bg-red-50 border-red-200",
  },
};

/** Map booking status → which media stages the provider can upload to. */
function getAvailableStages(bookingStatus: string): MediaStage[] {
  switch (bookingStatus) {
    case "confirmed":
    case "scheduled":
      return ["before"];
    case "in_progress":
      return ["before", "during"];
    case "partially_completed":
      return ["before", "during", "after"];
    case "completed":
      return ["before", "during", "after", "proof"];
    case "disputed":
    case "rework_required":
      return ["before", "during", "after", "proof", "issue"];
    default:
      return [];
  }
}

const MAX_FILE_SIZE_MB = 5;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// =============================================================================
// COMPONENT
// =============================================================================

export function JobPhotos({
  bookingId,
  media,
  canUpload,
  bookingStatus,
}: JobPhotosProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [uploadingStage, setUploadingStage] = useState<MediaStage | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const availableStages = canUpload ? getAvailableStages(bookingStatus) : [];
  const groupedMedia = groupByStage(media);

  const handleFileSelect = useCallback(
    async (stage: MediaStage, file: File) => {
      setError(null);

      // Validate file
      if (!ACCEPTED_TYPES.includes(file.type)) {
        setError("Please select a JPEG, PNG, or WebP image.");
        return;
      }
      if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        setError(`File size must be under ${MAX_FILE_SIZE_MB}MB.`);
        return;
      }

      setUploadingStage(stage);

      startTransition(async () => {
        try {
          const formData = new FormData();
          formData.append("file", file);
          formData.append("bookingId", bookingId);
          formData.append("stage", stage);

          const response = await fetch(`/api/services/jobs/${bookingId}/media`, {
            method: "POST",
            body: formData,
          });

          if (!response.ok) {
            const data = await response.json().catch(() => ({}));
            setError(data.error ?? "Failed to upload photo.");
            return;
          }

          router.refresh();
        } catch {
          setError("Upload failed. Please try again.");
        } finally {
          setUploadingStage(null);
        }
      });
    },
    [bookingId, router, startTransition]
  );

  const handleDelete = useCallback(
    (mediaId: string) => {
      setError(null);
      startTransition(async () => {
        try {
          const response = await fetch(
            `/api/services/jobs/${bookingId}/media?mediaId=${mediaId}`,
            { method: "DELETE" }
          );
          if (!response.ok) {
            setError("Failed to delete photo.");
            return;
          }
          router.refresh();
        } catch {
          setError("Delete failed. Please try again.");
        }
      });
    },
    [bookingId, router, startTransition]
  );

  // If no media and no upload ability, show nothing
  if (media.length === 0 && availableStages.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Camera className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-900">Job Photos</h3>
        </div>
      </div>

      <div className="p-5 space-y-5">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Render each stage that has photos or allows upload */}
        {(Object.keys(STAGE_CONFIG) as MediaStage[]).map((stage) => {
          const stageMedia = groupedMedia[stage] ?? [];
          const canUploadToStage = availableStages.includes(stage);

          if (stageMedia.length === 0 && !canUploadToStage) return null;

          const config = STAGE_CONFIG[stage];

          return (
            <div key={stage}>
              <div className="flex items-center gap-2 mb-2">
                <span
                  className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold ${config.color} ${config.bgColor} border`}
                >
                  {config.label}
                </span>
                <span className="text-xs text-gray-400">
                  {config.description}
                </span>
              </div>

              <div className="flex flex-wrap gap-3">
                {/* Existing photos */}
                {stageMedia.map((item) => (
                  <div
                    key={item.id}
                    className="relative group w-24 h-24 rounded-lg overflow-hidden border border-gray-200 bg-gray-50"
                  >
                    <Image
                      src={item.media_url}
                      alt={item.caption ?? `${stage} photo`}
                      fill
                      className="object-cover cursor-pointer"
                      sizes="96px"
                      onClick={() => setPreviewUrl(item.media_url)}
                    />
                    {canUpload && (
                      <button
                        onClick={() => handleDelete(item.id)}
                        disabled={isPending}
                        className="absolute top-1 right-1 p-1 bg-black/60 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity disabled:opacity-50"
                        title="Delete photo"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                    {item.caption && (
                      <div className="absolute bottom-0 left-0 right-0 bg-black/50 px-1 py-0.5">
                        <p className="text-[10px] text-white truncate">
                          {item.caption}
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {/* Upload button */}
                {canUploadToStage && (
                  <label
                    className={`w-24 h-24 rounded-lg border-2 border-dashed border-gray-300 flex flex-col items-center justify-center cursor-pointer hover:border-gray-400 hover:bg-gray-50 transition-colors ${
                      uploadingStage === stage
                        ? "opacity-60 cursor-not-allowed"
                        : ""
                    }`}
                  >
                    {uploadingStage === stage ? (
                      <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
                    ) : (
                      <>
                        <ImagePlus className="w-5 h-5 text-gray-400 mb-1" />
                        <span className="text-[10px] text-gray-400">Add</span>
                      </>
                    )}
                    <input
                      type="file"
                      accept={ACCEPTED_TYPES.join(",")}
                      className="hidden"
                      disabled={isPending || uploadingStage !== null}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileSelect(stage, file);
                        e.target.value = "";
                      }}
                    />
                  </label>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lightbox preview */}
      {previewUrl && (
        <div
          className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
          onClick={() => setPreviewUrl(null)}
        >
          <button
            className="absolute top-4 right-4 p-2 text-white/80 hover:text-white"
            onClick={() => setPreviewUrl(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <Image
            src={previewUrl}
            alt="Photo preview"
            width={800}
            height={600}
            sizes="(max-width: 768px) 100vw, 800px"
            className="max-w-full max-h-[85vh] object-contain rounded-lg"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

// =============================================================================
// HELPERS
// =============================================================================

function groupByStage(
  media: BookingMedia[]
): Partial<Record<MediaStage, BookingMedia[]>> {
  const groups: Partial<Record<MediaStage, BookingMedia[]>> = {};
  for (const item of media) {
    const stage = item.stage;
    if (!groups[stage]) {
      groups[stage] = [];
    }
    groups[stage]!.push(item);
  }
  return groups;
}
