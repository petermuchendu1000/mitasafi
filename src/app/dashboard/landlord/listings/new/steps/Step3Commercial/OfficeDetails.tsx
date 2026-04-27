/**
 * Office Space Details
 * 
 * Captures office-specific information:
 * - Size and fit-out level
 * - Layout and configuration
 * - Infrastructure (power, HVAC, fiber)
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 * 
 * REFACTORED: Uses useCommercialForm hook for standardized state/validation
 */

"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus, ChevronDown, Info } from "lucide-react";
import { useCommercialForm } from "../../hooks";
import {
  FITOUT_LEVELS,
  OFFICE_LAYOUT_OPTIONS,
  HVAC_OPTIONS,
  BUILDING_GRADES,
  type FitoutLevel,
  type OfficeLayoutType,
  type HVACType,
  type BuildingGrade,
} from "../../commercial-types";

export function OfficeDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired } = useCommercialForm();

  // Number input handlers
  const handleNumberChange = (field: keyof typeof commercial, value: number, min: number, max: number) => {
    const newValue = Math.max(min, Math.min(max, value));
    updateCommercial({ [field]: newValue });
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Office Space Details
        </h2>
        <p className="text-gray-500">
          Size, layout, and infrastructure
        </p>
      </div>

      <div className="space-y-6">
        {/* Space Metrics Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Space Metrics</h3>
          </div>

          <div className="p-5 space-y-5">
            {/* Size */}
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
                    placeholder="e.g., 150"
                    className={cn(
                      "w-full px-4 py-3 pr-16 rounded-lg border transition-colors",
                      "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                      "border-gray-300"
                    )}
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    sqm
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
                    placeholder="e.g., 3.0"
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    m
                  </span>
                </div>
              </div>
            </div>

            {/* Floor Level & Building Grade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Floor Level
                </label>
                <input
                  type="text"
                  value={commercial.floorLevel}
                  onChange={(e) => updateCommercial({ floorLevel: e.target.value })}
                  placeholder="e.g., 5th Floor"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Building Grade
                </label>
                <div className="flex gap-2">
                  {BUILDING_GRADES.map((grade) => (
                    <button
                      key={grade.id}
                      type="button"
                      onClick={() => updateCommercial({ buildingGrade: grade.id as BuildingGrade })}
                      className={cn(
                        "flex-1 py-2.5 px-3 rounded-lg border-2 text-sm font-medium transition-all",
                        commercial.buildingGrade === grade.id
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      )}
                    >
                      {grade.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Fit-out Level */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fit-out Level {isRequired("fitoutLevel") && <span className="text-orange-500">*</span>}
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

        {/* Configuration Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Configuration</h3>
          </div>

          <div className="p-5 space-y-5">
            {/* Layout Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Layout {isRequired("layoutType") && <span className="text-orange-500">*</span>}
              </label>
              <div className="flex flex-wrap gap-3">
                {OFFICE_LAYOUT_OPTIONS.map((layout) => (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => updateCommercial({ layoutType: layout.id as OfficeLayoutType })}
                    className={cn(
                      "px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                      commercial.layoutType === layout.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    )}
                  >
                    {layout.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Capacity & Rooms */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Workstation Capacity
                </label>
                <input
                  type="number"
                  value={commercial.workstationCapacity || ""}
                  onChange={(e) => updateCommercial({ workstationCapacity: parseInt(e.target.value) || null })}
                  placeholder="e.g., 25"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Private Offices
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNumberChange("privateOffices", commercial.privateOffices - 1, 0, 50)}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.privateOffices}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNumberChange("privateOffices", commercial.privateOffices + 1, 0, 50)}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meeting Rooms
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => handleNumberChange("meetingRooms", commercial.meetingRooms - 1, 0, 20)}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.meetingRooms}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleNumberChange("meetingRooms", commercial.meetingRooms + 1, 0, 20)}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            {/* Pantry */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pantry / Kitchen
              </label>
              <div className="flex gap-3">
                {[
                  { id: "none", label: "None" },
                  { id: "shared", label: "Shared" },
                  { id: "private", label: "Private" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateCommercial({ hasPantry: option.id as "none" | "shared" | "private" })}
                    className={cn(
                      "px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                      commercial.hasPantry === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Infrastructure Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Infrastructure</h3>
          </div>

          <div className="p-5 space-y-5">
            {/* Power & HVAC */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Power Capacity
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.powerKva || ""}
                    onChange={(e) => updateCommercial({ powerKva: parseInt(e.target.value) || null })}
                    placeholder="e.g., 50"
                    className="w-full px-4 py-3 pr-14 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    kVA
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  HVAC / Air Conditioning
                </label>
                <div className="flex gap-2">
                  {HVAC_OPTIONS.map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => updateCommercial({ hvacType: option.id as HVACType })}
                      className={cn(
                        "flex-1 py-2.5 px-2 rounded-lg border-2 text-xs font-medium transition-all",
                        commercial.hvacType === option.id
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      )}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Features Checkboxes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Features
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {[
                  { key: "has3PhasePower", label: "3-Phase Power" },
                  { key: "hasFiberReady", label: "Fiber Internet Ready" },
                  { key: "hasServerRoom", label: "Server Room" },
                  { key: "hasReception", label: "Reception Area" },
                ].map((feature) => (
                  <label
                    key={feature.key}
                    className={cn(
                      "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                      commercial[feature.key as keyof typeof commercial]
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={commercial[feature.key as keyof typeof commercial] as boolean}
                      onChange={(e) => updateCommercial({ [feature.key]: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      {feature.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
