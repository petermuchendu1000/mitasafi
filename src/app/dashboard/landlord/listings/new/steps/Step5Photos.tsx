/**
 * Step 5: Guided Photos Upload
 * 
 * Category-based photo upload with immediate upload to Supabase Storage.
 * Photos persist across page refreshes because URLs are stored, not blob URLs.
 * 
 * Uses dynamic content from content-config.ts.
 */

"use client";

import { useEffect, useCallback, useState, useRef } from "react";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  X, 
  Star, 
  AlertCircle,
  Lightbulb,
  Sofa,
  BedDouble,
  UtensilsCrossed,
  Bath,
  MoreHorizontal,
  Camera,
  Loader2,
} from "lucide-react";
import { useWizard } from "../context";
import { usePhotoUpload } from "../usePhotoUpload";
import { useStep5Content } from "../useWizardContent";

const MAX_PHOTOS = 15;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Photo categories with their icons and labels
const PHOTO_CATEGORIES = [
  { id: "cover", label: "Cover", icon: Star, description: "Main listing photo" },
  { id: "living", label: "Living Room", icon: Sofa, description: "" },
  { id: "bedroom", label: "Bedroom", icon: BedDouble, description: "" },
  { id: "kitchen", label: "Kitchen", icon: UtensilsCrossed, description: "" },
  { id: "bathroom", label: "Bathroom", icon: Bath, description: "" },
];

interface CategoryPhoto {
  id: string;
  category: string;
  preview: string;
  url?: string;
  path?: string;
  isUploading?: boolean;
}

export function Step5Photos() {
  const { state, updateFormData, setValidation } = useWizard();
  const { photos } = state.formData;
  const { uploadPhoto, deletePhoto, isUploading, errors: uploadErrors, clearErrors } = usePhotoUpload();
  
  // Get dynamic content
  const content = useStep5Content();
  
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const additionalInputRef = useRef<HTMLInputElement>(null);

  // Combine upload errors with local errors
  const allErrors = [
    ...localErrors,
    ...uploadErrors.map((e: { fileName: string; message: string }) => `${e.fileName}: ${e.message}`)
  ];

  // Convert photos array to category map for easier access
  const photosByCategory = (photos || []).reduce((acc, photo) => {
    if (photo.category) {
      acc[photo.category] = photo as CategoryPhoto;
    }
    return acc;
  }, {} as Record<string, CategoryPhoto>);

  // Get additional photos (those without predefined categories)
  const additionalPhotosList = (photos || []).filter(
    (p) => p.category && !PHOTO_CATEGORIES.find((c) => c.id === p.category)
  );

  // Validation - photos are optional (can skip)
  useEffect(() => {
    setValidation(5, {
      isValid: true, // Always valid - photos are optional
      errors: {},
      touched: {},
    });
  }, [photos, setValidation]);

  // Handle category photo upload
  const handleCategoryPhoto = useCallback(async (category: string, file: File) => {
    setLocalErrors([]);
    clearErrors();
    
    const currentPhotos = photos || [];
    const existingPhoto = currentPhotos.find((p) => p.category === category);
    
    // Create a temporary local preview while uploading
    const tempId = `photo-${category}-${Date.now()}`;
    const localPreview = URL.createObjectURL(file);
    
    // Show uploading state
    setUploadingSlots(prev => ({ ...prev, [category]: true }));
    
    // Add temporary photo with local preview
    const tempPhoto: CategoryPhoto = {
      id: tempId,
      category,
      preview: localPreview,
      isUploading: true,
    };
    
    // Remove existing photo for this category and add temp
    const photosWithTemp = [
      ...currentPhotos.filter((p) => p.category !== category),
      tempPhoto,
    ];
    updateFormData({ photos: photosWithTemp });
    
    // Delete old photo from storage if exists
    if (existingPhoto?.path) {
      await deletePhoto(existingPhoto.path);
    }
    
    // Upload to Supabase
    const result = await uploadPhoto(file, category);
    
    setUploadingSlots(prev => ({ ...prev, [category]: false }));
    
    if (result) {
      // Success - update with real URL
      const finalPhoto: CategoryPhoto = {
        id: tempId,
        category,
        preview: result.url, // Use the permanent URL
        url: result.url,
        path: result.path,
        isUploading: false,
      };
      
      // Clean up local preview
      URL.revokeObjectURL(localPreview);
      
      updateFormData({
        photos: [
          ...currentPhotos.filter((p) => p.category !== category),
          finalPhoto,
        ],
      });
    } else {
      // Failed - remove temp photo
      URL.revokeObjectURL(localPreview);
      updateFormData({
        photos: currentPhotos.filter((p) => p.category !== category),
      });
    }
  }, [photos, uploadPhoto, deletePhoto, updateFormData, clearErrors]);

  // Handle additional photos upload
  const handleAdditionalPhotos = useCallback(async (files: FileList | File[]) => {
    const fileArray = Array.from(files);
    const currentPhotos = photos || [];
    const currentCount = currentPhotos.length;
    const remainingSlots = MAX_PHOTOS - currentCount;
    
    if (fileArray.length > remainingSlots) {
      setLocalErrors([`You can only add ${remainingSlots} more photo${remainingSlots !== 1 ? "s" : ""}`]);
      return;
    }

    setLocalErrors([]);
    clearErrors();

    // Create all temp photos first with unique IDs
    const timestamp = Date.now();
    const tempPhotos: CategoryPhoto[] = fileArray.map((file, idx) => ({
      id: `photo-extra-${timestamp}-${idx}`,
      category: `extra-${timestamp}-${idx}`,
      preview: URL.createObjectURL(file),
      isUploading: true,
    }));

    // Add all temp photos at once to state
    let updatedPhotos = [...currentPhotos, ...tempPhotos];
    updateFormData({ photos: updatedPhotos });

    // Upload each file sequentially and update state after each
    for (let idx = 0; idx < fileArray.length; idx++) {
      const file = fileArray[idx];
      const tempPhoto = tempPhotos[idx];
      
      const result = await uploadPhoto(file, tempPhoto.category);
      
      if (result) {
        URL.revokeObjectURL(tempPhoto.preview);
        
        // Update local tracker and state
        updatedPhotos = updatedPhotos.map((p) =>
          p.id === tempPhoto.id
            ? { ...p, preview: result.url, url: result.url, path: result.path, isUploading: false }
            : p
        );
      } else {
        URL.revokeObjectURL(tempPhoto.preview);
        // Remove failed upload from local tracker
        updatedPhotos = updatedPhotos.filter((p) => p.id !== tempPhoto.id);
      }
      
      // Update state after each upload completes
      updateFormData({ photos: updatedPhotos });
    }
  }, [photos, uploadPhoto, updateFormData, clearErrors]);

  // Remove photo
  const removePhoto = useCallback(async (photoId: string) => {
    const currentPhotos = photos || [];
    const photoToRemove = currentPhotos.find((p) => p.id === photoId);
    
    // Delete from storage if it has a path
    if (photoToRemove?.path) {
      await deletePhoto(photoToRemove.path);
    }
    
    // Clean up local preview if exists
    if (photoToRemove?.preview?.startsWith("blob:")) {
      URL.revokeObjectURL(photoToRemove.preview);
    }

    updateFormData({ 
      photos: currentPhotos.filter((p) => p.id !== photoId) 
    });
  }, [photos, deletePhoto, updateFormData]);

  const handleFileChange = useCallback((category: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleCategoryPhoto(category, file);
    }
    // Reset input
    if (fileInputRefs.current[category]) {
      fileInputRefs.current[category]!.value = "";
    }
  }, [handleCategoryPhoto]);

  const handleAdditionalFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      handleAdditionalPhotos(e.target.files);
    }
    if (additionalInputRef.current) {
      additionalInputRef.current.value = "";
    }
  }, [handleAdditionalPhotos]);

  const photoCount = photos?.length || 0;
  const hasEnoughPhotos = photoCount >= 5;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {content.header.title}
        </h2>
        <p className="text-gray-500">
          {(content.header.subtitle || "Great photos get 3× more inquiries").split('3×')[0]}
          <span className="font-semibold text-teal-600">3× more inquiries</span>
        </p>
      </div>

      {/* Error Messages */}
      {allErrors.length > 0 && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              {allErrors.map((error, idx) => (
                <p key={idx} className="text-sm text-red-600">{error}</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Photo Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        {/* Category Slots */}
        {PHOTO_CATEGORIES.map((category) => {
          const photo = photosByCategory[category.id];
          const Icon = category.icon;
          const isCover = category.id === "cover";
          const isSlotUploading = uploadingSlots[category.id] || photo?.isUploading;
          
          return (
            <div
              key={category.id}
              className={cn(
                "relative aspect-square rounded-xl overflow-hidden",
                "border-2 border-dashed transition-all",
                photo 
                  ? "border-transparent" 
                  : isCover 
                  ? "border-teal-400 bg-teal-50 hover:border-teal-500" 
                  : "border-gray-300 bg-gray-50 hover:border-gray-400"
              )}
            >
              {photo ? (
                /* Photo Preview */
                <>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.url || photo.preview}
                    alt={category.label}
                    className={cn(
                      "w-full h-full object-cover",
                      isSlotUploading && "opacity-50"
                    )}
                  />
                  
                  {/* Uploading overlay */}
                  {isSlotUploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-8 h-8 text-white animate-spin" />
                        <span className="text-white text-sm font-medium">Uploading...</span>
                      </div>
                    </div>
                  )}
                  
                  {/* Cover badge */}
                  {isCover && !isSlotUploading && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-teal-600 text-white text-xs font-medium rounded-md flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-current" />
                      Cover
                    </div>
                  )}
                  
                  {/* Category label */}
                  {!isCover && !isSlotUploading && (
                    <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-xs font-medium rounded-md">
                      {category.label}
                    </div>
                  )}
                  
                  {/* Remove button */}
                  {!isSlotUploading && (
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white hover:bg-red-500 flex items-center justify-center transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                  
                  {/* Change photo overlay */}
                  {!isSlotUploading && (
                    <label className="absolute inset-0 flex items-center justify-center bg-black/0 hover:bg-black/40 transition-colors cursor-pointer group">
                      <span className="text-white text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Change
                      </span>
                      <input
                        ref={(el) => { fileInputRefs.current[category.id] = el; }}
                        type="file"
                        accept={ACCEPTED_TYPES.join(",")}
                        onChange={(e) => handleFileChange(category.id, e)}
                        className="hidden"
                      />
                    </label>
                  )}
                </>
              ) : (
                /* Empty Slot */
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group">
                  <div className={cn(
                    "w-12 h-12 rounded-full flex items-center justify-center mb-2 transition-colors",
                    isCover 
                      ? "bg-teal-100 text-teal-600 group-hover:bg-teal-200" 
                      : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"
                  )}>
                    {isCover ? (
                      <Star className="w-6 h-6" />
                    ) : (
                      <Icon className="w-6 h-6" />
                    )}
                  </div>
                  <span className={cn(
                    "font-medium text-sm",
                    isCover ? "text-teal-700" : "text-gray-700"
                  )}>
                    {isCover ? "★ Cover" : category.label}
                  </span>
                  <span className="text-xs text-gray-400 mt-0.5 flex items-center gap-1">
                    <Plus className="w-3 h-3" />
                    Add
                  </span>
                  <input
                    ref={(el) => { fileInputRefs.current[category.id] = el; }}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    onChange={(e) => handleFileChange(category.id, e)}
                    className="hidden"
                  />
                </label>
              )}
            </div>
          );
        })}

        {/* + More Slot */}
        <label
          className={cn(
            "relative aspect-square rounded-xl overflow-hidden cursor-pointer",
            "border-2 border-dashed border-gray-300 bg-gray-50",
            "hover:border-gray-400 hover:bg-gray-100 transition-all",
            "flex flex-col items-center justify-center",
            photoCount >= MAX_PHOTOS && "opacity-50 pointer-events-none"
          )}
        >
          <div className="w-12 h-12 rounded-full bg-gray-100 text-gray-400 flex items-center justify-center mb-2 group-hover:bg-gray-200">
            <MoreHorizontal className="w-6 h-6" />
          </div>
          <span className="font-medium text-sm text-gray-700">+ More</span>
          <span className="text-xs text-gray-400 mt-0.5">
            {MAX_PHOTOS - photoCount} left
          </span>
          <input
            ref={additionalInputRef}
            type="file"
            accept={ACCEPTED_TYPES.join(",")}
            multiple
            onChange={handleAdditionalFileChange}
            className="hidden"
            disabled={photoCount >= MAX_PHOTOS}
          />
        </label>
      </div>

      {/* Additional Photos Grid */}
      {additionalPhotosList.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">
            Additional photos ({additionalPhotosList.length})
          </p>
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {additionalPhotosList.map((photo, index) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden group"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url || photo.preview}
                  alt={`Additional photo ${index + 1}`}
                  className={cn(
                    "w-full h-full object-cover",
                    photo.isUploading && "opacity-50"
                  )}
                />
                {photo.isUploading ? (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-white animate-spin" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white hover:bg-red-500 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Photo Count Status */}
      <div className={cn(
        "flex items-center gap-2 p-3 rounded-lg mb-6",
        hasEnoughPhotos 
          ? "bg-teal-50 border border-teal-200" 
          : "bg-amber-50 border border-amber-200"
      )}>
        <Camera className={cn(
          "w-5 h-5",
          hasEnoughPhotos ? "text-teal-600" : "text-amber-600"
        )} />
        <span className={cn(
          "text-sm font-medium",
          hasEnoughPhotos ? "text-teal-700" : "text-amber-700"
        )}>
          {photoCount} of {MAX_PHOTOS} photos
          {!hasEnoughPhotos && photoCount > 0 && ` • Add ${5 - photoCount} more for better results`}
          {photoCount === 0 && " • Add photos to attract more tenants"}
          {hasEnoughPhotos && " • Great! You have enough photos"}
        </span>
      </div>

      {/* Tip */}
      <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
        <Lightbulb className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-gray-600">
          <span className="font-medium text-gray-700">{content.tips.title}</span>
          <ul className="mt-1 space-y-1">
            {(content.tips.items || []).map((tip, idx) => (
              <li key={idx}>• {tip}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Skip Option */}
      {photoCount === 0 && (
        <p className="text-center text-sm text-gray-500 mt-6">
          No photos ready?{" "}
          <span className="text-gray-700 font-medium">
            You can skip and add them later
          </span>
        </p>
      )}
    </div>
  );
}
