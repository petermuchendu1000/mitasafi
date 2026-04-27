/**
 * Food & Beverage Space Details
 * 
 * Captures F&B-specific information:
 * - Kitchen and equipment
 * - Seating capacity
 * - Licensing requirements
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
} from "../../commercial-types";

export function FoodBeverageDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired } = useCommercialForm();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Food & Beverage Space Details
        </h2>
        <p className="text-gray-500">
          Kitchen, seating, and infrastructure
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
                  Total Size <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.sizeSqm || ""}
                    onChange={(e) => updateCommercial({ sizeSqm: parseInt(e.target.value) || null })}
                    placeholder="e.g., 150"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    sqm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kitchen Area {isRequired("kitchenAreaSqm") && <span className="text-orange-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.kitchenAreaSqm || ""}
                    onChange={(e) => updateCommercial({ kitchenAreaSqm: parseInt(e.target.value) || null })}
                    placeholder="e.g., 40"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    sqm
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Frontage Width
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={commercial.frontageWidthM || ""}
                    onChange={(e) => updateCommercial({ frontageWidthM: parseFloat(e.target.value) || null })}
                    placeholder="e.g., 6.0"
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    m
                  </span>
                </div>
              </div>

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
                    placeholder="e.g., 3.5"
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    m
                  </span>
                </div>
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

        {/* Kitchen Infrastructure */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Kitchen Infrastructure</h3>
          </div>

          <div className="p-5 space-y-5">
            {/* Kitchen Features */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.exhaustSystem
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.exhaustSystem || false}
                  onChange={(e) => updateCommercial({ exhaustSystem: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Kitchen Exhaust System {isRequired("exhaustSystem") && <span className="text-orange-500">*</span>}
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.exhaustDuctingToRoof
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.exhaustDuctingToRoof || false}
                  onChange={(e) => updateCommercial({ exhaustDuctingToRoof: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Exhaust Ducting to Roof
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.greaseTrap
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.greaseTrap || false}
                  onChange={(e) => updateCommercial({ greaseTrap: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Grease Trap Installed
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.gasConnection
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.gasConnection || false}
                  onChange={(e) => updateCommercial({ gasConnection: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Gas Connection Available
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.walkInCooler
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.walkInCooler || false}
                  onChange={(e) => updateCommercial({ walkInCooler: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Walk-in Cooler / Freezer
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.barCounter
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.barCounter || false}
                  onChange={(e) => updateCommercial({ barCounter: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Bar Counter
                </span>
              </label>
            </div>

            {/* Water Points */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Water Points / Sinks
              </label>
              <div className="flex items-center gap-3 w-48">
                <button
                  type="button"
                  onClick={() => updateCommercial({ waterPoints: Math.max(0, (commercial.waterPoints || 0) - 1) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="flex-1 text-center font-semibold text-gray-900">
                  {commercial.waterPoints || 0}
                </span>
                <button
                  type="button"
                  onClick={() => updateCommercial({ waterPoints: Math.min(20, (commercial.waterPoints || 0) + 1) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Seating Capacity */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Seating Capacity</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Indoor Seating Capacity {isRequired("seatingCapacity") && <span className="text-orange-500">*</span>}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCommercial({ seatingCapacity: Math.max(0, (commercial.seatingCapacity || 0) - 5) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.seatingCapacity || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCommercial({ seatingCapacity: Math.min(500, (commercial.seatingCapacity || 0) + 5) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Outdoor Seating Capacity
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCommercial({ outdoorSeatingCapacity: Math.max(0, (commercial.outdoorSeatingCapacity || 0) - 5) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    disabled={!commercial.outdoorSeating}
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.outdoorSeatingCapacity || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCommercial({ outdoorSeatingCapacity: Math.min(200, (commercial.outdoorSeatingCapacity || 0) + 5) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    disabled={!commercial.outdoorSeating}
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <label
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                commercial.outdoorSeating
                  ? "border-teal-600 bg-teal-50"
                  : "border-gray-200 hover:border-gray-300"
              )}
            >
              <input
                type="checkbox"
                checked={commercial.outdoorSeating || false}
                onChange={(e) => updateCommercial({ outdoorSeating: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <span className="text-sm font-medium text-gray-700">
                Outdoor Seating Available
              </span>
            </label>
          </div>
        </section>

        {/* Licensing & Operations */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Licensing & Operations</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.liquorLicenseEligible
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.liquorLicenseEligible || false}
                  onChange={(e) => updateCommercial({ liquorLicenseEligible: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Liquor License Eligible
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.deliveryReady
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.deliveryReady || false}
                  onChange={(e) => updateCommercial({ deliveryReady: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Delivery Operations Ready
                </span>
              </label>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
