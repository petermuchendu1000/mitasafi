/**
 * Step 5: Commercial Photos Upload
 * 
 * Category-based photo upload tailored for commercial properties.
 * Shows relevant photo categories based on commercial type/subtype.
 * 
 * Uses dynamic content from content-config.ts for accurate
 * tips and messaging based on listing type.
 */

"use client";

import { useEffect, useCallback, useState, useRef, useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  Plus, 
  X, 
  Star, 
  AlertCircle,
  MoreHorizontal,
  Camera,
  Loader2,
  Building2,
  DoorOpen,
  Monitor,
  Users,
  Armchair,
  Coffee,
  Bath,
  Store,
  ShoppingBag,
  Package,
  CreditCard,
  UtensilsCrossed,
  ChefHat,
  Wine,
  TreePine,
  Warehouse,
  Truck,
  Layers,
  ParkingCircle,
  Wrench,
  Car,
  Settings,
  Plane,
  MapPin,
  Square,
  Mountain,
  BedDouble,
  Sparkles,
  Presentation,
  Sofa,
  Stethoscope,
  Activity,
  Pill,
  GraduationCap,
  Maximize,
  Ruler,
  Eye,
  Server,
  Fan,
  Zap,
  Shield,
  Network,
  Mic,
  Sliders,
  VolumeX,
  Radio,
  Lightbulb,
  Heart,
  Dumbbell,
  Lock,
  Scissors,
  Droplet,
  Snowflake,
  Thermometer,
  Mic2,
  PartyPopper,
  Building,
  Briefcase,
  Church,
  Book,
  LucideIcon,
} from "lucide-react";
import { useWizard } from "../context";
import { usePhotoUpload } from "../usePhotoUpload";
import { getPhotoCategories, getMinPhotos, type PhotoCategory } from "../commercial-flow-config";
import { useStep5Content } from "../useWizardContent";

const MAX_PHOTOS = 20;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

// Icon mapping from string names to Lucide components
const ICON_MAP: Record<string, LucideIcon> = {
  Star,
  Building2,
  DoorOpen,
  Monitor,
  Users,
  Armchair,
  Coffee,
  Bath,
  Store,
  ShoppingBag,
  Package,
  CreditCard,
  UtensilsCrossed,
  ChefHat,
  Wine,
  TreePine,
  Warehouse,
  Truck,
  Layers,
  ParkingCircle,
  Wrench,
  Car,
  Settings,
  Plane,
  MapPin,
  Square,
  Mountain,
  BedDouble,
  Sparkles,
  Presentation,
  Sofa,
  Stethoscope,
  Activity,
  Pill,
  GraduationCap,
  Maximize,
  Ruler,
  Eye,
  Server,
  Fan,
  Zap,
  Shield,
  Network,
  Mic,
  Sliders,
  VolumeX,
  Radio,
  Lightbulb,
  Heart,
  Dumbbell,
  Lock,
  Scissors,
  Droplet,
  Snowflake,
  Thermometer,
  Mic2,
  PartyPopper,
  Building,
  Briefcase,
  Church,
  Book,
  Camera,
  MoreHorizontal,
};

interface CategoryPhoto {
  id: string;
  category: string;
  preview: string;
  url?: string;
  path?: string;
  isUploading?: boolean;
}

export function Step5CommercialPhotos() {
  const { state, updateFormData, setValidation } = useWizard();
  const { photos, commercialType, commercialSubtype } = state.formData;
  const { uploadPhoto, deletePhoto, isUploading, errors: uploadErrors, clearErrors } = usePhotoUpload();
  
  // Get dynamic content based on listing type
  const content = useStep5Content();
  
  const [localErrors, setLocalErrors] = useState<string[]>([]);
  const [uploadingSlots, setUploadingSlots] = useState<Record<string, boolean>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const additionalInputRef = useRef<HTMLInputElement>(null);

  // Get photo categories based on commercial type/subtype
  const photoCategories = useMemo(() => 
    getPhotoCategories(commercialType, commercialSubtype),
    [commercialType, commercialSubtype]
  );
  
  const minPhotos = useMemo(() => 
    getMinPhotos(commercialType, commercialSubtype),
    [commercialType, commercialSubtype]
  );

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
  const categoryIds = photoCategories.map(c => c.id);
  const additionalPhotosList = (photos || []).filter(
    (p) => p.category && !categoryIds.includes(p.category)
  );

  // Validation
  useEffect(() => {
    const photoCount = photos?.length || 0;
    const hasCover = photos?.some(p => p.category === "cover");
    const errors: Record<string, string> = {};
    
    if (!hasCover && photoCount > 0) {
      errors.cover = "Please add a cover photo";
    }
    
    // Photos are optional but we track the minimum recommendation
    setValidation(5, {
      isValid: true, // Always valid - photos are optional
      errors,
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
        preview: result.url,
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
        
        updatedPhotos = updatedPhotos.map((p) =>
          p.id === tempPhoto.id
            ? { ...p, preview: result.url, url: result.url, path: result.path, isUploading: false }
            : p
        );
      } else {
        URL.revokeObjectURL(tempPhoto.preview);
        updatedPhotos = updatedPhotos.filter((p) => p.id !== tempPhoto.id);
      }
      
      updateFormData({ photos: updatedPhotos });
    }
  }, [photos, uploadPhoto, updateFormData, clearErrors]);

  // Remove photo
  const removePhoto = useCallback(async (photoId: string) => {
    const currentPhotos = photos || [];
    const photoToRemove = currentPhotos.find((p) => p.id === photoId);
    
    if (photoToRemove?.path) {
      await deletePhoto(photoToRemove.path);
    }
    
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
  const hasEnoughPhotos = photoCount >= minPhotos;

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {content.header.title}
        </h2>
        <p className="text-gray-500">
          {content.header.subtitle}
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
        {photoCategories.map((category) => {
          const photo = photosByCategory[category.id];
          const IconComponent = ICON_MAP[category.icon] || Camera;
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
                    ? "border-teal-300 bg-teal-50/50" 
                    : "border-gray-200 bg-gray-50 hover:border-gray-300"
              )}
            >
              {photo ? (
                // Photo uploaded
                <>
                  <img
                    src={photo.preview}
                    alt={category.label}
                    className="w-full h-full object-cover"
                  />
                  
                  {/* Loading overlay */}
                  {isSlotUploading && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="w-8 h-8 text-white animate-spin" />
                    </div>
                  )}
                  
                  {/* Cover badge */}
                  {isCover && !isSlotUploading && (
                    <div className="absolute top-2 left-2 flex items-center gap-1 px-2 py-1 bg-teal-600 text-white text-xs font-medium rounded-lg">
                      <Star className="w-3 h-3 fill-current" />
                      Cover
                    </div>
                  )}
                  
                  {/* Remove button */}
                  {!isSlotUploading && (
                    <button
                      type="button"
                      onClick={() => removePhoto(photo.id)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </>
              ) : (
                // Empty slot
                <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group">
                  <input
                    ref={(el) => { fileInputRefs.current[category.id] = el; }}
                    type="file"
                    accept={ACCEPTED_TYPES.join(",")}
                    onChange={(e) => handleFileChange(category.id, e)}
                    className="hidden"
                  />
                  <IconComponent className={cn(
                    "w-8 h-8 mb-2 transition-colors",
                    isCover ? "text-teal-400 group-hover:text-teal-500" : "text-gray-300 group-hover:text-gray-400"
                  )} />
                  <span className={cn(
                    "text-sm font-medium",
                    isCover ? "text-teal-600" : "text-gray-600"
                  )}>
                    {category.label}
                  </span>
                  <span className={cn(
                    "text-xs mt-0.5",
                    isCover ? "text-teal-500" : "text-gray-400"
                  )}>
                    + Add
                  </span>
                </label>
              )}
            </div>
          );
        })}

        {/* Additional Photos Slot */}
        {photoCount < MAX_PHOTOS && (
          <div
            className={cn(
              "relative aspect-square rounded-xl overflow-hidden",
              "border-2 border-dashed border-gray-200 bg-gray-50",
              "hover:border-gray-300 transition-colors"
            )}
          >
            <label className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer group">
              <input
                ref={additionalInputRef}
                type="file"
                accept={ACCEPTED_TYPES.join(",")}
                multiple
                onChange={handleAdditionalFileChange}
                className="hidden"
              />
              <MoreHorizontal className="w-8 h-8 text-gray-300 mb-2 group-hover:text-gray-400 transition-colors" />
              <span className="text-sm font-medium text-gray-600">+ More</span>
              <span className="text-xs text-gray-400 mt-0.5">
                {MAX_PHOTOS - photoCount} left
              </span>
            </label>
          </div>
        )}
      </div>

      {/* Additional Photos Grid */}
      {additionalPhotosList.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Additional photos</p>
          <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
            {additionalPhotosList.map((photo) => (
              <div
                key={photo.id}
                className="relative aspect-square rounded-lg overflow-hidden"
              >
                <img
                  src={photo.preview}
                  alt="Additional"
                  className="w-full h-full object-cover"
                />
                {photo.isUploading ? (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
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
        "flex items-center justify-center gap-2 py-3 px-4 rounded-lg",
        hasEnoughPhotos 
          ? "bg-teal-50 text-teal-700" 
          : "bg-orange-50 text-orange-700"
      )}>
        <Camera className="w-4 h-4" />
        <span className="text-sm font-medium">
          {photoCount} of {MAX_PHOTOS} photos
          {!hasEnoughPhotos && ` (${minPhotos}+ recommended)`}
        </span>
      </div>

      {/* Tips */}
      <div className="mt-6 bg-gray-50 rounded-xl p-4">
        <p className="text-sm font-medium text-gray-700 mb-2">{content.tips.title}</p>
        <ul className="text-sm text-gray-500 space-y-1">
          {content.tips.items?.map((tip, idx) => (
            <li key={idx}>• {tip}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}
