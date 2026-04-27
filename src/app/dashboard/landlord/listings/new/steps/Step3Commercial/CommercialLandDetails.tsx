/**
 * Commercial Land Details
 * 
 * Captures land-specific information:
 * - Plot size and dimensions
 * - Zoning and permitted uses
 * - Utilities and access
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 * 
 * REFACTORED: Uses useCommercialForm hook for standardized state/validation
 */

"use client";

import { cn } from "@/lib/utils";
import { useCommercialForm, useCommercialSubtype } from "../../hooks";
import { type ZoningType, type TitleType } from "../../commercial-types";

const ZONING_TYPES = [
  { id: "commercial", label: "Commercial", description: "Retail/office" },
  { id: "industrial", label: "Industrial", description: "Manufacturing" },
  { id: "mixed_use", label: "Mixed Use", description: "Multi-purpose" },
  { id: "agricultural", label: "Agricultural", description: "Farm/rural" },
];

const TITLE_TYPES = [
  { id: "freehold", label: "Freehold" },
  { id: "leasehold", label: "Leasehold" },
  { id: "community_land", label: "Community Land" },
  { id: "government_lease", label: "Government Lease" },
];

export function CommercialLandDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired } = useCommercialForm();
  const { isBillboardSite, isDevelopmentPlot } = useCommercialSubtype();

  const isBillboard = isBillboardSite;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {isBillboard ? "Billboard Site Details" : "Commercial Land Details"}
        </h2>
        <p className="text-gray-500">
          {isBillboard ? "Billboard location and specifications" : "Plot size, zoning, and utilities"}
        </p>
      </div>

      <div className="space-y-6">
        {/* Plot Size */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Plot Size</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size (Square Meters) {isRequired("plotSizeSqm") && <span className="text-orange-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.plotSizeSqm || ""}
                    onChange={(e) => {
                      const sqm = parseFloat(e.target.value) || null;
                      updateCommercial({ 
                        plotSizeSqm: sqm,
                        plotSizeAcres: sqm ? parseFloat((sqm / 4047).toFixed(2)) : null
                      });
                    }}
                    placeholder="e.g., 2000"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    sqm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Size (Acres)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={commercial.plotSizeAcres || ""}
                    onChange={(e) => {
                      const acres = parseFloat(e.target.value) || null;
                      updateCommercial({ 
                        plotSizeAcres: acres,
                        plotSizeSqm: acres ? Math.round(acres * 4047) : null
                      });
                    }}
                    placeholder="e.g., 0.5"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    acres
                  </span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Road Frontage
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.1"
                  value={commercial.roadFrontageM || ""}
                  onChange={(e) => updateCommercial({ roadFrontageM: parseFloat(e.target.value) || null })}
                  placeholder="e.g., 30"
                  className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                  m
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Zoning & Title */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Zoning & Title</h3>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Zoning Type <span className="text-orange-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {ZONING_TYPES.map((zone) => (
                  <button
                    key={zone.id}
                    type="button"
                    onClick={() => updateCommercial({ zoningType: zone.id as ZoningType })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      commercial.zoningType === zone.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className={cn(
                      "block text-sm font-medium",
                      commercial.zoningType === zone.id ? "text-teal-700" : "text-gray-900"
                    )}>
                      {zone.label}
                    </span>
                    <span className="text-xs text-gray-500">{zone.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Title Type
              </label>
              <div className="flex flex-wrap gap-3">
                {TITLE_TYPES.map((title) => (
                  <button
                    key={title.id}
                    type="button"
                    onClick={() => updateCommercial({ titleType: title.id as TitleType })}
                    className={cn(
                      "px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                      commercial.titleType === title.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    )}
                  >
                    {title.label}
                  </button>
                ))}
              </div>
            </div>

            <label
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                commercial.isTitled
                  ? "border-teal-600 bg-teal-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <input
                type="checkbox"
                checked={commercial.isTitled || false}
                onChange={(e) => updateCommercial({ isTitled: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Title Deed Available
              </span>
            </label>
          </div>
        </section>

        {/* Development Plot Specifications */}
        {isDevelopmentPlot && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Development Specifications</h3>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Plot Ratio {isRequired("maxPlotRatio") && <span className="text-orange-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={commercial.maxPlotRatio || ""}
                    onChange={(e) => updateCommercial({ maxPlotRatio: parseFloat(e.target.value) || null })}
                    placeholder="e.g., 2.5"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  Maximum buildable floor area divided by plot size
                </p>
              </div>
            </div>
          </section>
        )}

        {/* Utilities & Features */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Utilities & Features</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasUtilities
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasUtilities || false}
                  onChange={(e) => updateCommercial({ hasUtilities: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Utilities Available
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.isFenced
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.isFenced || false}
                  onChange={(e) => updateCommercial({ isFenced: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Fenced / Secured
                </span>
              </label>
            </div>

            {commercial.titleType === "leasehold" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Remaining Lease Years
                </label>
                <input
                  type="number"
                  value={commercial.leaseRemainingYears || ""}
                  onChange={(e) => updateCommercial({ leaseRemainingYears: parseInt(e.target.value) || null })}
                  placeholder="e.g., 50"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>
        </section>

        {/* Billboard Specific */}
        {isBillboard && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Billboard Specifications</h3>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billboard Size {isRequired("billboardSize") && <span className="text-orange-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={commercial.billboardSize || ""}
                    onChange={(e) => updateCommercial({ billboardSize: e.target.value })}
                    placeholder="e.g., 12m x 6m"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Billboard Facing {isRequired("billboardFacing") && <span className="text-orange-500">*</span>}
                  </label>
                  <input
                    type="text"
                    value={commercial.billboardFacing || ""}
                    onChange={(e) => updateCommercial({ billboardFacing: e.target.value })}
                    placeholder="e.g., East-bound traffic"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Daily Impressions {isRequired("dailyImpressions") && <span className="text-orange-500">*</span>}
                </label>
                <input
                  type="number"
                  value={commercial.dailyImpressions || ""}
                  onChange={(e) => updateCommercial({ dailyImpressions: parseInt(e.target.value) || null })}
                  placeholder="e.g., 50000"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    commercial.billboardIlluminated
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={commercial.billboardIlluminated || false}
                    onChange={(e) => updateCommercial({ billboardIlluminated: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Illuminated
                  </span>
                </label>

                <label
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    commercial.billboardDigital
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={commercial.billboardDigital || false}
                    onChange={(e) => updateCommercial({ billboardDigital: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Digital Display
                  </span>
                </label>
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
