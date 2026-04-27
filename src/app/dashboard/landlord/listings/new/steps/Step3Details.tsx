/**
 * Step 3: Property Details
 * 
 * Captures physical specifications: bedrooms, bathrooms, size,
 * condition, and furnishing level.
 * 
 * OPTIMIZED: Cleaner copy, teal accent colors for selection states
 * REFACTORED: Uses useResidentialForm hook for standardized validation
 */

"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { Minus, Plus, ChevronDown } from "lucide-react";
import { useResidentialForm, usePropertyType } from "../hooks";
import { 
  CONDITIONS, 
  FURNISHING_OPTIONS, 
  FLOOR_LEVELS,
  type PropertyCondition,
  type FurnishingType,
} from "../types";
import { getCurrentYear } from "../utils";

export function Step3Details() {
  // Use shared hook for standardized state management & validation
  const { formData, updateFields, isRequired } = useResidentialForm(3);
  const { propertyType, hasFixedBedrooms } = usePropertyType();
  
  const { 
    bedrooms, 
    bathrooms, 
    sizeSqft,
    sizeUnit,
    floorLevel,
    totalFloors,
    yearBuilt,
    condition,
    lastRenovated,
    furnishing,
  } = formData;

  // Determine if bedrooms are editable based on property type
  const isBedroomEditable = !hasFixedBedrooms;
  
  // Current year for validation (memoized)
  const currentYear = useMemo(() => getCurrentYear(), []);

  // Note: Validation is now handled automatically by useResidentialForm hook

  const handleNumberChange = (
    field: string, 
    value: number, 
    min: number, 
    max: number,
    step: number = 1
  ) => {
    const newValue = Math.max(min, Math.min(max, value));
    updateFields({ [field]: newValue });
  };

  const incrementBedrooms = () => {
    if (isBedroomEditable) {
      handleNumberChange("bedrooms", bedrooms + 1, 0, 20, 1);
    }
  };

  const decrementBedrooms = () => {
    if (isBedroomEditable) {
      handleNumberChange("bedrooms", bedrooms - 1, 0, 20, 1);
    }
  };

  const incrementBathrooms = () => {
    handleNumberChange("bathrooms", bathrooms + 1, 1, 10, 1);
  };

  const decrementBathrooms = () => {
    handleNumberChange("bathrooms", bathrooms - 1, 1, 10, 1);
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Tell us about the unit
        </h2>
        <p className="text-gray-500">
          Size, condition, and what's included
        </p>
      </div>

      <div className="space-y-8">
        {/* Basics Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Basics</h3>
          </div>
          
          <div className="p-5 space-y-6">
            {/* Bedrooms & Bathrooms Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bedrooms <span className="text-orange-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={decrementBedrooms}
                    disabled={!isBedroomEditable || bedrooms <= 0}
                    className={cn(
                      "w-10 h-10 rounded-lg border flex items-center justify-center transition-colors",
                      isBedroomEditable && bedrooms > 0
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                        : "border-gray-200 text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  
                  <div className={cn(
                    "flex-1 text-center py-2.5 rounded-lg border",
                    isBedroomEditable 
                      ? "border-gray-300 bg-white"
                      : "border-gray-200 bg-gray-50"
                  )}>
                    <span className="text-lg font-semibold text-gray-900">
                      {bedrooms === 0 ? "Studio" : bedrooms}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={incrementBedrooms}
                    disabled={!isBedroomEditable || bedrooms >= 20}
                    className={cn(
                      "w-10 h-10 rounded-lg border flex items-center justify-center transition-colors",
                      isBedroomEditable && bedrooms < 20
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                        : "border-gray-200 text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                {!isBedroomEditable && (
                  <p className="text-xs text-gray-500 mt-1.5">
                    Fixed for {propertyType} properties
                  </p>
                )}
              </div>

              {/* Bathrooms */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bathrooms <span className="text-orange-500">*</span>
                </label>
                <div className="flex items-center gap-4">
                  <button
                    type="button"
                    onClick={decrementBathrooms}
                    disabled={bathrooms <= 1}
                    className={cn(
                      "w-10 h-10 rounded-lg border flex items-center justify-center transition-colors",
                      bathrooms > 1
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                        : "border-gray-200 text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                  
                  <div className="flex-1 text-center py-2.5 rounded-lg border border-gray-300 bg-white">
                    <span className="text-lg font-semibold text-gray-900">
                      {bathrooms}
                    </span>
                  </div>
                  
                  <button
                    type="button"
                    onClick={incrementBathrooms}
                    disabled={bathrooms >= 10}
                    className={cn(
                      "w-10 h-10 rounded-lg border flex items-center justify-center transition-colors",
                      bathrooms < 10
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50 hover:border-gray-400"
                        : "border-gray-200 text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* Size & Floor Level Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Property Size
                  <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                </label>
                <div className="flex">
                  <input
                    type="number"
                    value={sizeSqft || ""}
                    onChange={(e) => updateFields({ 
                      sizeSqft: e.target.value ? parseInt(e.target.value) : null 
                    })}
                    placeholder="e.g., 1200"
                    className={cn(
                      "flex-1 px-4 py-2.5 rounded-l-lg border border-r-0 border-gray-300 bg-white",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent focus:z-10"
                    )}
                  />
                  <select
                    value={sizeUnit}
                    onChange={(e) => updateFields({ 
                      sizeUnit: e.target.value as "sqft" | "sqm" 
                    })}
                    className={cn(
                      "px-3 py-2.5 rounded-r-lg border border-gray-300 bg-gray-50",
                      "text-gray-700 font-medium",
                      "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    )}
                  >
                    <option value="sqft">sq ft</option>
                    <option value="sqm">sq m</option>
                  </select>
                </div>
              </div>

              {/* Floor Level */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Level
                  <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                </label>
                <div className="relative">
                  <select
                    value={floorLevel}
                    onChange={(e) => updateFields({ floorLevel: e.target.value })}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white appearance-none",
                      "text-gray-900",
                      "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                    )}
                  >
                    <option value="">Select floor</option>
                    {FLOOR_LEVELS.map((level) => (
                      <option key={level} value={level}>{level}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Property Condition Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Property Condition</h3>
          </div>
          
          <div className="p-5 space-y-6">
            {/* Condition */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Overall Condition <span className="text-orange-500">*</span>
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {CONDITIONS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => updateFields({ condition: c.id as PropertyCondition })}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 text-center transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                      condition === c.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block font-medium text-sm">{c.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Year Built & Last Renovated */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Year Built
                  <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                </label>
                <input
                  type="number"
                  value={yearBuilt || ""}
                  onChange={(e) => updateFields({ 
                    yearBuilt: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="e.g., 2015"
                  min={1900}
                  max={currentYear}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  )}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Renovated
                  <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                </label>
                <input
                  type="number"
                  value={lastRenovated || ""}
                  onChange={(e) => updateFields({ 
                    lastRenovated: e.target.value ? parseInt(e.target.value) : null 
                  })}
                  placeholder="e.g., 2022"
                  min={yearBuilt || 1900}
                  max={currentYear}
                  className={cn(
                    "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  )}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Furnishing Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Furnishing</h3>
          </div>
          
          <div className="p-5">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {FURNISHING_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => updateFields({ furnishing: opt.id as FurnishingType })}
                  className={cn(
                    "px-4 py-4 rounded-lg border-2 text-left transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                    furnishing === opt.id
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 bg-white hover:border-gray-300"
                  )}
                >
                  <span className={cn(
                    "block font-medium",
                    furnishing === opt.id ? "text-teal-700" : "text-gray-900"
                  )}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    {opt.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
