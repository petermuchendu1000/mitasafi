/**
 * Profile Photo Upload Component
 * 
 * Handles profile photo upload with preview and compression.
 */

"use client";

import { useState, useRef, useTransition } from "react";
import Image from "next/image";
import { Camera, Upload, X, User } from "lucide-react";
import { uploadProfilePhoto } from "./actions";

interface ProfilePhotoUploadProps {
  initialPhotoUrl: string | null;
  onComplete: () => void;
  onSkip: () => void;
}

export function ProfilePhotoUpload({
  initialPhotoUrl,
  onComplete,
  onSkip,
}: ProfilePhotoUploadProps) {
  const [photoUrl, setPhotoUrl] = useState<string | null>(initialPhotoUrl);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Please upload a JPG, PNG, or WebP image");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be less than 5MB");
      return;
    }

    setError(null);
    setIsUploading(true);

    try {
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setPreviewUrl(e.target?.result as string);
      };
      reader.readAsDataURL(file);

      // Compress image if needed (basic resize)
      const compressedFile = await compressImage(file, 800, 800, 0.85);

      // Upload via server action (bypasses storage RLS)
      const formData = new FormData();
      formData.append("file", compressedFile);

      const result = await uploadProfilePhoto(formData);
      
      if (!result.success) {
        setError(result.error || "Failed to upload photo");
        setPreviewUrl(null);
        return;
      }

      setPhotoUrl(result.url || null);
      setPreviewUrl(null);
    } catch (err) {
      console.error("Upload error:", err);
      setError("Failed to upload image. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleRemove = () => {
    setPhotoUrl(null);
    setPreviewUrl(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleContinue = () => {
    if (photoUrl) {
      onComplete();
    } else {
      onSkip();
    }
  };

  const displayUrl = previewUrl || photoUrl;

  return (
    <div>
      <h2 className="text-lg font-semibold text-gray-900 mb-2">
        Add Your Profile Photo
      </h2>
      <p className="text-gray-500 text-sm mb-6">
        A professional photo helps clients trust you. Show your face clearly.
      </p>

      <div className="flex flex-col items-center">
        {/* Photo Preview */}
        <div className="relative mb-6">
          <div className="w-40 h-40 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
            {displayUrl ? (
              <Image
                src={displayUrl}
                alt="Profile photo"
                width={160}
                height={160}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <User className="w-20 h-20 text-gray-300" />
              </div>
            )}
          </div>

          {/* Upload/Change Button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            className="absolute bottom-0 right-0 w-10 h-10 bg-teal-600 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {isUploading ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <Camera className="w-5 h-5" />
            )}
          </button>

          {/* Remove Button */}
          {displayUrl && !isUploading && (
            <button
              onClick={handleRemove}
              className="absolute top-0 right-0 w-8 h-8 bg-red-500 text-white rounded-full flex items-center justify-center shadow hover:bg-red-600 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Error Message */}
        {error && (
          <p className="text-red-500 text-sm mb-4">{error}</p>
        )}

        {/* Tips */}
        <div className="text-sm text-gray-500 space-y-1 mb-6">
          <p>✓ Use a clear headshot showing your face</p>
          <p>✓ Good lighting, no sunglasses</p>
          <p>✓ Professional appearance</p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-3">
          {!photoUrl && (
            <button
              onClick={onSkip}
              className="px-6 py-2 text-gray-600 hover:text-gray-900 transition-colors"
            >
              Skip for now
            </button>
          )}
          <button
            onClick={handleContinue}
            disabled={isUploading}
            className="px-6 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {photoUrl ? "Continue" : "Upload Photo"}
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Compress/resize image before upload
 */
async function compressImage(
  file: File,
  maxWidth: number,
  maxHeight: number,
  quality: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.onload = () => {
      let { width, height } = img;

      // Calculate new dimensions
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height);
        width = Math.round(width * ratio);
        height = Math.round(height * ratio);
      }

      // Create canvas
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Draw image
      ctx.drawImage(img, 0, 0, width, height);

      // Convert to blob
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Could not create blob"));
          }
        },
        "image/jpeg",
        quality
      );
    };

    img.onerror = () => reject(new Error("Could not load image"));
    img.src = URL.createObjectURL(file);
  });
}
