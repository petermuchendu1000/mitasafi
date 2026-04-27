/**
 * Retail Space Details
 * 
 * Captures retail-specific information:
 * - Frontage and visibility
 * - Customer access and parking
 * - Display and signage
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 * 
 * REFACTORED: Uses useCommercialForm hook for standardized state/validation
 */

"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useCommercialForm } from "../../hooks";
import {
  FITOUT_LEVELS,
  type FitoutLevel,
  type FootTrafficType,
} from "../../commercial-types";

const FOOT_TRAFFIC_LEVELS = [
  { id: "low", label: "Low", description: "Quiet area" },
  { id: "medium", label: "Medium", description: "Steady flow" },
  { id: "high", label: "High", description: "Busy area" },
  { id: "very_high", label: "Very High", description: "Prime location" },
];

const VISIBILITY_RATINGS = [
  { rating: 1, label: "Limited" },
  { rating: 2, label: "Moderate" },
  { rating: 3, label: "Good" },
  { rating: 4, label: "Excellent" },
];

export function RetailDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired } = useCommercialForm();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Retail Space Details
        </h2>
        <p className="text-gray-500">
          Frontage, visibility, and customer access
        </p>
      </div>

      <div className="space-y-6">
        {/* Space Metrics */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Space Metrics</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Total Size {isRequired("sizeSqm") && <span className="text-orange-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.sizeSqm || ""}
                    onChange={(e) => updateCommercial({ sizeSqm: parseInt(e.target.value) || null })}
                    placeholder="e.g., 80"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    sqm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Street Frontage Width {isRequired("frontageWidthM") && <span className="text-orange-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={commercial.frontageWidthM || ""}
                    onChange={(e) => updateCommercial({ frontageWidthM: parseFloat(e.target.value) || null })}
                    placeholder="e.g., 8.5"
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    m
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ceiling Height
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={commercial.ceilingHeightM || ""}
                    onChange={(e) => updateCommercial({ ceilingHeightM: parseFloat(e.target.value) || null })}
                    placeholder="e.g., 4.0"
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    m
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Display Window Size
                </label>
                <input
                  type="text"
                  value={commercial.displayWindowSize || ""}
                  onChange={(e) => updateCommercial({ displayWindowSize: e.target.value })}
                  placeholder="e.g., Large floor-to-ceiling"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>

            {/* Fit-out Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fit-out Level <span className="text-orange-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FITOUT_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => updateCommercial({ fitoutLevel: level.id as FitoutLevel })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      commercial.fitoutLevel === level.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className={cn(
                      "block text-sm font-medium",
                      commercial.fitoutLevel === level.id ? "text-teal-700" : "text-gray-900"
                    )}>
                      {level.label}
                    </span>
                    <span className="text-xs text-gray-500">{level.description}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Location & Traffic */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Location & Traffic</h3>
          </div>

          <div className="p-5 space-y-5">
            {/* Foot Traffic */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Foot Traffic Level {isRequired("footTraffic") && <span className="text-orange-500">*</span>}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {FOOT_TRAFFIC_LEVELS.map((level) => (
                  <button
                    key={level.id}
                    type="button"
                    onClick={() => updateCommercial({ footTraffic: level.id as FootTrafficType })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      commercial.footTraffic === level.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className={cn(
                      "block text-sm font-medium",
                      commercial.footTraffic === level.id ? "text-teal-700" : "text-gray-900"
                    )}>
                      {level.label}
                    </span>
                    <span className="text-xs text-gray-500">{level.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Visibility Rating */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Visibility Rating
              </label>
              <div className="flex flex-wrap gap-3">
                {VISIBILITY_RATINGS.map((rating) => (
                  <button
                    key={rating.rating}
                    type="button"
                    onClick={() => updateCommercial({ visibilityRating: rating.rating })}
                    className={cn(
                      "px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                      commercial.visibilityRating === rating.rating
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    )}
                  >
                    {rating.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Parking Spaces Count */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Dedicated Parking Spaces
              </label>
              <div className="flex items-center gap-3 w-48">
                <button
                  type="button"
                  onClick={() => updateCommercial({ parkingSpacesCount: Math.max(0, (commercial.parkingSpacesCount || 0) - 1) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="flex-1 text-center font-semibold text-gray-900">
                  {commercial.parkingSpacesCount || 0}
                </span>
                <button
                  type="button"
                  onClick={() => updateCommercial({ parkingSpacesCount: Math.min(100, (commercial.parkingSpacesCount || 0) + 1) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Signage & Features */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Signage & Features</h3>
          </div>

          <div className="p-5 space-y-5">
            {/* Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasDisplayWindows
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasDisplayWindows || false}
                  onChange={(e) => updateCommercial({ hasDisplayWindows: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Display Windows
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasFiberReady
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasFiberReady || false}
                  onChange={(e) => updateCommercial({ hasFiberReady: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Fiber Internet Ready
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasServerRoom
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasServerRoom || false}
                  onChange={(e) => updateCommercial({ hasServerRoom: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Storage / Back Room
                </span>
              </label>
            </div>

            {/* Mall Name (if applicable) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Mall / Shopping Center Name {isRequired("mallName") ? <span className="text-orange-500">*</span> : "(if applicable)"}
              </label>
              <input
                type="text"
                value={commercial.mallName || ""}
                onChange={(e) => updateCommercial({ mallName: e.target.value })}
                placeholder="e.g., The Hub Karen"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            {/* Anchor Tenant */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nearby Anchor Tenant
              </label>
              <input
                type="text"
                value={commercial.anchorTenantNearby || ""}
                onChange={(e) => updateCommercial({ anchorTenantNearby: e.target.value })}
                placeholder="e.g., Carrefour, Java House"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
