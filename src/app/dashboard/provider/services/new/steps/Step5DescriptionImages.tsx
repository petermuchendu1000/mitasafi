/**
 * Step 5: Description + Images
 * 
 * Provider adds optional description and photos for each service.
 * Images are uploaded immediately on selection (Supabase Storage via server action).
 * Data syncs to formData on every change so the footer's Continue works correctly.
 */

"use client";

import { useState, useCallback, useEffect } from "react";
import { Image as ImageIcon, X, Upload, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { useWizard } from "../context";
import { uploadServiceImage } from "../../actions";

interface ServiceImageData {
  description: string;
  imageUrls: string[];
}

export function Step5DescriptionImages() {
  const { state, updateFormData } = useWizard();
  const { formData, errors } = state;
  const [currentServiceIndex, setCurrentServiceIndex] = useState(0);
  const [uploading, setUploading] = useState(false);

  // Local state for all services' descriptions and uploaded image URLs
  const [serviceData, setServiceData] = useState<Record<string, ServiceImageData>>(() => {
    const initial: Record<string, ServiceImageData> = {};
    formData.selectedServices.forEach(service => {
      const existing = formData.serviceImages?.[service.serviceId];
      initial[service.serviceId] = {
        description: existing?.description || service.description || "",
        imageUrls: existing?.imageUrls || [],
      };
    });
    return initial;
  });

  const currentService = formData.selectedServices[currentServiceIndex];
  const totalServices = formData.selectedServices.length;
  const currentData = serviceData[currentService?.serviceId] || { description: "", imageUrls: [] };

  // Sync to formData whenever serviceData changes
  const syncToForm = useCallback(
    (data: Record<string, ServiceImageData>) => {
      // Update descriptions on each selected service
      const updatedServices = formData.selectedServices.map(service => ({
        ...service,
        description: data[service.serviceId]?.description || "",
      }));

      updateFormData({
        selectedServices: updatedServices,
        serviceImages: data,
      });
    },
    [formData.selectedServices, updateFormData]
  );

  // Sync on every change
  useEffect(() => {
    syncToForm(serviceData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceData]);

  // Update description
  const handleDescriptionChange = (value: string) => {
    setServiceData(prev => ({
      ...prev,
      [currentService.serviceId]: {
        ...prev[currentService.serviceId],
        description: value,
      },
    }));
  };

  // Handle image selection — upload immediately
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const available = 3 - currentData.imageUrls.length;
    const toUpload = files.slice(0, available);
    if (!toUpload.length) return;

    setUploading(true);

    for (const file of toUpload) {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("serviceId", currentService.serviceId);

      const result = await uploadServiceImage(fd);
      if (result.success && result.data?.url) {
        setServiceData(prev => ({
          ...prev,
          [currentService.serviceId]: {
            ...prev[currentService.serviceId],
            imageUrls: [...(prev[currentService.serviceId]?.imageUrls || []), result.data!.url],
          },
        }));
      }
    }

    setUploading(false);
    // Reset input so same file can be re-selected
    e.target.value = "";
  };

  // Remove image URL
  const handleImageRemove = (index: number) => {
    setServiceData(prev => ({
      ...prev,
      [currentService.serviceId]: {
        ...prev[currentService.serviceId],
        imageUrls: prev[currentService.serviceId].imageUrls.filter((_, i) => i !== index),
      },
    }));
  };

  // Navigate between services within this step
  const handlePrevService = () => {
    if (currentServiceIndex > 0) {
      setCurrentServiceIndex(currentServiceIndex - 1);
    }
  };

  const handleNextService = () => {
    if (currentServiceIndex < totalServices - 1) {
      setCurrentServiceIndex(currentServiceIndex + 1);
    }
  };

  if (!currentService) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No services selected. Please go back and select services.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Add details for your services
        </h2>
        <p className="mt-2 text-gray-600">
          Each service needs at least one photo. Descriptions are optional but help you stand out.
        </p>
      </div>

      {/* Service selector (if multiple services) */}
      {totalServices > 1 && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">
                Service {currentServiceIndex + 1} of {totalServices}
              </p>
              <p className="font-medium text-gray-900 mt-1">
                {currentService.serviceName}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrevService}
                disabled={currentServiceIndex === 0}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>
              <button
                onClick={handleNextService}
                disabled={currentServiceIndex === totalServices - 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Single service view */}
      {totalServices === 1 && (
        <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
          <p className="font-medium text-gray-900">{currentService.serviceName}</p>
          <p className="text-sm text-gray-600 mt-1">
            {currentService.subcategoryName} • {currentService.categoryName}
          </p>
        </div>
      )}

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Service Description <span className="text-gray-400">(optional)</span>
        </label>
        <p className="text-sm text-gray-600 mb-3">
          Briefly explain what&apos;s included or not included in this service (2-3 lines)
        </p>
        <textarea
          value={currentData.description}
          onChange={(e) => handleDescriptionChange(e.target.value)}
          placeholder="Example: Assembly of wardrobes and cupboards. Price depends on size and number of doors."
          rows={3}
          maxLength={200}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent resize-none"
        />
        <p className="text-xs text-gray-500 mt-1">
          {currentData.description.length}/200 characters
        </p>
      </div>

      {/* Images */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Photos of Past Work <span className="text-red-500">*</span>
        </label>
        <p className="text-sm text-gray-600 mb-3">
          At least 1 photo required per service. Phone photos are fine. (Max 3 per service)
        </p>

        {/* Image preview grid */}
        <div className="grid grid-cols-3 gap-3 mb-3">
          {currentData.imageUrls.map((url, index) => (
            <div
              key={url}
              className="relative aspect-square rounded-lg border-2 border-gray-200 overflow-hidden bg-gray-50"
            >
              <img
                src={url}
                alt={`Photo ${index + 1}`}
                className="w-full h-full object-cover"
              />
              <button
                onClick={() => handleImageRemove(index)}
                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {/* Upload button (show if less than 3 images and not uploading) */}
          {currentData.imageUrls.length < 3 && (
            <label className={cn(
              "aspect-square rounded-lg border-2 border-dashed cursor-pointer flex flex-col items-center justify-center transition-colors",
              uploading
                ? "border-teal-400 bg-teal-50 cursor-wait"
                : currentData.imageUrls.length === 0 && errors[`images_${currentService.serviceId}`]
                  ? "border-red-300 hover:border-red-400 bg-red-50 hover:bg-red-50"
                  : "border-gray-300 hover:border-teal-500 bg-gray-50 hover:bg-teal-50"
            )}>
              {uploading ? (
                <>
                  <Loader2 className="w-6 h-6 text-teal-500 mb-1 animate-spin" />
                  <span className="text-xs text-teal-600">Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-gray-400 mb-1" />
                  <span className="text-xs text-gray-500">Add photo</span>
                </>
              )}
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageSelect}
                className="hidden"
                disabled={uploading}
              />
            </label>
          )}
        </div>

        {currentData.imageUrls.length === 3 && (
          <p className="text-xs text-gray-500">
            Maximum 3 photos per service. Remove one to add another.
          </p>
        )}

        {/* Validation error */}
        {currentData.imageUrls.length === 0 && errors[`images_${currentService.serviceId}`] && (
          <p className="text-sm text-red-600 font-medium mt-1">
            Upload at least one photo for this service
          </p>
        )}
      </div>

      {/* Helper text */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <ImageIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Tips for better listings:</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Show completed work, not stock photos</li>
              <li>• Clear photos work better than perfect lighting</li>
              <li>• You can add more photos after publishing</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Progress indicator (if multiple services) */}
      {totalServices > 1 && (
        <div className="flex gap-1">
          {formData.selectedServices.map((svc, index) => {
            const hasImage = (serviceData[svc.serviceId]?.imageUrls?.length || 0) > 0;
            const hasError = !hasImage && Object.keys(errors).some(k => k === `images_${svc.serviceId}`);
            return (
              <button
                key={index}
                onClick={() => setCurrentServiceIndex(index)}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors cursor-pointer",
                  hasError
                    ? "bg-red-400"
                    : hasImage
                      ? "bg-teal-600"
                      : index <= currentServiceIndex
                        ? "bg-teal-400"
                        : "bg-gray-200"
                )}
                title={svc.serviceName}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
