/**
 * Step 6: Review & Publish
 * 
 * Pure review screen — shows summary of all selections.
 * Includes image thumbnails to confirm uploads.
 * Submission is handled exclusively by ServiceWizardContent's footer button.
 */

"use client";

import Image from "next/image";
import { Check, MapPin, DollarSign, ImageIcon } from "lucide-react";
import { useWizard } from "../context";

export function Step6Review() {
  const { state } = useWizard();
  const { formData } = state;

  const { selectedServices, serviceAreas, serviceImages } = formData;

  // Get area names from IDs (simplified - in production would fetch from DB)
  const getAreaNames = () => {
    if (!serviceAreas) return "Not set";
    
    const areaIds = serviceAreas.bulk || [];
    if (areaIds.length === 0) return "Not set";
    
    return `${areaIds.length} ${areaIds.length === 1 ? "area" : "areas"} selected`;
  };

  const formatPrice = (price: number | null, priceType: string) => {
    if (priceType === "quote") return "Request a quote";
    if (!price) return "Not set";
    return `KES ${price.toLocaleString()}`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Review your services
        </h2>
        <p className="mt-2 text-gray-600">
          Check everything looks good before publishing
        </p>
      </div>

      {/* Services Summary */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-gray-900">
          Services ({selectedServices.length})
        </h3>

        {selectedServices.map((service, index) => {
          const description = service.description || "";
          const imageUrls = serviceImages?.[service.serviceId]?.imageUrls || [];

          return (
            <div
              key={service.serviceId}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden"
            >
              {/* Image strip — show uploaded thumbnails */}
              {imageUrls.length > 0 && (
                <div className="flex gap-px bg-gray-100">
                  {imageUrls.map((url, i) => (
                    <div key={i} className="relative flex-1 aspect-[16/9]">
                      <Image
                        src={url}
                        alt={`${service.serviceName} photo ${i + 1}`}
                        fill
                        sizes="33vw"
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="p-5">
                {/* Service name & category */}
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="font-semibold text-gray-900">
                      {service.serviceName}
                    </h4>
                    <p className="text-sm text-gray-600 mt-1">
                      {service.subcategoryName} • {service.categoryName}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 text-teal-600">
                    <Check className="w-4 h-4" />
                    <span className="text-xs font-semibold">Ready</span>
                  </div>
                </div>

                {/* Details grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-gray-100">
                  {/* Pricing */}
                  <div className="flex items-start gap-2.5">
                    <DollarSign className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Pricing</p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">
                        {formatPrice(service.customPrice, service.priceType)}
                      </p>
                      {service.priceType === "starting_from" && (
                        <p className="text-[10px] text-gray-500">Starting from</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  <div className="flex items-start gap-2.5">
                    <div className="w-4 h-4 flex items-center justify-center text-gray-400 mt-0.5 flex-shrink-0">
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h7" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Description</p>
                      <p className="text-sm text-gray-900 mt-0.5">
                        {description ? (
                          <span className="line-clamp-2">{description}</span>
                        ) : (
                          <span className="text-gray-400">None</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Photos */}
                  <div className="flex items-start gap-2.5">
                    <ImageIcon className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">Photos</p>
                      <p className="text-sm font-medium text-gray-900 mt-0.5">
                        {imageUrls.length} photo{imageUrls.length !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Service Areas Summary */}
      <div className="bg-teal-50 border border-teal-200 rounded-lg p-5">
        <div className="flex items-start gap-3">
          <MapPin className="w-5 h-5 text-teal-600 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-gray-900">Service Areas</h4>
            <p className="text-sm text-gray-700 mt-1">
              {getAreaNames()}
            </p>
            {serviceAreas?.canTravelOutside && (
              <p className="text-sm text-gray-600 mt-2">
                ✓ Can travel outside selected areas (extra charge)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Important note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-xs font-bold mt-0.5">
            i
          </div>
          <div className="text-sm text-gray-700">
            <p className="font-medium mb-1">Before you publish:</p>
            <ul className="space-y-1 text-gray-600">
              <li>• Your services will be visible to customers immediately</li>
              <li>• You can edit or pause services anytime from your dashboard</li>
              <li>• Customers can request quotes or contact you directly</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
