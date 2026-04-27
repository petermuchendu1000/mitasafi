/**
 * Step 4: Building Photos
 * 
 * Collects building photos:
 * - Exterior photos
 * - Entrance/lobby
 * - Common areas
 * - Amenity photos
 */

"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  Camera,
  Upload,
  X,
  Star,
  Image as ImageIcon,
  AlertCircle,
} from "lucide-react";
import { useWizard } from "../context";
import { type StepValidation } from "../types";

const MAX_PHOTOS = 20;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const PHOTO_SUGGESTIONS = [
  "Building exterior (front view)",
  "Building entrance",
  "Lobby/reception area",
  "Parking area",
  "Swimming pool (if available)",
  "Gym (if available)",
  "Garden/common areas",
  "Security features",
];

export function Step4Photos() {
  const { state, updateFormData, dispatch } = useWizard();
  const { formData, validation } = state;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Validation
  const validate = useCallback((): StepValidation => {
    const errors: Record<string, string> = {};

    // Photos are optional but recommended
    if (formData.photos.length === 0) {
      // Just a warning, not blocking
    }

    return {
      isValid: true, // Photos are optional
      errors,
      touched: validation[4]?.touched || {},
    };
  }, [formData.photos.length, validation]);

  useEffect(() => {
    const stepValidation = validate();
    dispatch({ 
      type: "SET_VALIDATION", 
      payload: { step: 4, validation: stepValidation } 
    });
  }, [formData.photos, validate, dispatch]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const processFiles = useCallback((files: FileList | null) => {
    if (!files) return;
    
    setError(null);
    const newPhotos: string[] = [];
    const totalPhotos = formData.photos.length + files.length;

    if (totalPhotos > MAX_PHOTOS) {
      setError(`Maximum ${MAX_PHOTOS} photos allowed. You can add ${MAX_PHOTOS - formData.photos.length} more.`);
      return;
    }

    Array.from(files).forEach((file) => {
      if (!file.type.startsWith("image/")) {
        setError("Please upload only image files (JPEG, PNG, WebP)");
        return;
      }

      if (file.size > MAX_FILE_SIZE) {
        setError("Each image must be under 5MB");
        return;
      }

      // Create a preview URL (in production, upload to storage)
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPhotos.push(e.target.result as string);
          if (newPhotos.length === files.length) {
            const updatedPhotos = [...formData.photos, ...newPhotos];
            updateFormData({ 
              photos: updatedPhotos,
              // Set first photo as cover if none set
              cover_photo: formData.cover_photo || updatedPhotos[0],
            });
          }
        }
      };
      reader.readAsDataURL(file);
    });
  }, [formData.photos, formData.cover_photo, updateFormData]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    processFiles(e.dataTransfer.files);
  }, [processFiles]);

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    processFiles(e.target.files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, [processFiles]);

  const removePhoto = useCallback((index: number) => {
    const photoToRemove = formData.photos[index];
    const updatedPhotos = formData.photos.filter((_, i) => i !== index);
    
    // Update cover photo if the removed one was the cover
    const newCoverPhoto = formData.cover_photo === photoToRemove 
      ? updatedPhotos[0] || undefined
      : formData.cover_photo;
    
    updateFormData({ 
      photos: updatedPhotos,
      cover_photo: newCoverPhoto,
    });
  }, [formData.photos, formData.cover_photo, updateFormData]);

  const setCoverPhoto = useCallback((photo: string) => {
    updateFormData({ cover_photo: photo });
  }, [updateFormData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Building Photos</h2>
        <p className="mt-1 text-gray-500">
          Add photos to showcase your building to potential tenants
        </p>
      </div>

      {/* Upload Area */}
      <div
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-xl p-8",
          "transition-colors duration-200",
          dragActive 
            ? "border-teal-500 bg-teal-50" 
            : "border-gray-300 hover:border-gray-400",
          formData.photos.length >= MAX_PHOTOS && "opacity-50 pointer-events-none"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          className="hidden"
          disabled={formData.photos.length >= MAX_PHOTOS}
        />

        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center mb-4">
            <Upload className="w-8 h-8 text-gray-400" />
          </div>
          <p className="text-lg font-medium text-gray-900">
            Drag photos here or{" "}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-teal-600 hover:text-teal-700"
            >
              browse
            </button>
          </p>
          <p className="text-sm text-gray-500 mt-1">
            Upload up to {MAX_PHOTOS} photos • Max 5MB each • JPEG, PNG, WebP
          </p>
          <p className="text-xs text-gray-400 mt-2">
            {formData.photos.length} / {MAX_PHOTOS} photos uploaded
          </p>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Photo Grid */}
      {formData.photos.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-gray-700 mb-3">
            Uploaded Photos
            <span className="text-gray-400 font-normal ml-2">
              (Click star to set as cover photo)
            </span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {formData.photos.map((photo, index) => {
              const isCover = photo === formData.cover_photo;
              return (
                <div
                  key={index}
                  className={cn(
                    "relative aspect-[4/3] rounded-xl overflow-hidden group",
                    "border-2 transition-all",
                    isCover ? "border-teal-500" : "border-transparent"
                  )}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo}
                    alt={`Building photo ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Overlay */}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors">
                    {/* Cover Badge */}
                    {isCover && (
                      <div className="absolute top-2 left-2 bg-teal-600 text-white text-xs px-2 py-1 rounded-md font-medium">
                        Cover
                      </div>
                    )}

                    {/* Actions */}
                    <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => setCoverPhoto(photo)}
                        className={cn(
                          "p-1.5 rounded-lg transition-colors",
                          isCover 
                            ? "bg-teal-600 text-white" 
                            : "bg-white/90 text-gray-600 hover:bg-white"
                        )}
                        title="Set as cover"
                      >
                        <Star className={cn("w-4 h-4", isCover && "fill-current")} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="p-1.5 rounded-lg bg-white/90 text-red-600 hover:bg-white transition-colors"
                        title="Remove"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Suggestions */}
      <div className="bg-gray-50 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <Camera className="w-5 h-5 text-gray-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-gray-700">Suggested photos</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {PHOTO_SUGGESTIONS.map((suggestion, index) => (
                <span
                  key={index}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white border border-gray-200 text-xs text-gray-600"
                >
                  <ImageIcon className="w-3 h-3" />
                  {suggestion}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Tips */}
      {formData.photos.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Photos help attract better tenants
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Buildings with photos get 3x more views. You can add photos now or later.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
