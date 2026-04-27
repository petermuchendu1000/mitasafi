/**
 * Healthcare Space Details
 * 
 * Captures healthcare-specific information:
 * - Consultation and treatment rooms
 * - Medical infrastructure
 * - Licensing and compliance
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 * 
 * REFACTORED: Uses useCommercialForm hook for standardized state/validation
 */

"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useCommercialForm, useCommercialSubtype } from "../../hooks";

export function HealthcareDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired } = useCommercialForm();
  const { isDentalClinic, isLab } = useCommercialSubtype();

  const isDental = isDentalClinic;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Healthcare Space Details
        </h2>
        <p className="text-gray-500">
          Medical facilities and infrastructure
        </p>
      </div>

      <div className="space-y-6">
        {/* Space Metrics */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Space Metrics</h3>
          </div>

          <div className="p-5 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Size <span className="text-orange-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={commercial.sizeSqm || ""}
                  onChange={(e) => updateCommercial({ sizeSqm: parseInt(e.target.value) || null })}
                  placeholder="e.g., 200"
                  className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sqm</span>
              </div>
            </div>
          </div>
        </section>

        {/* Room Configuration */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Room Configuration</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Consultation Rooms {isRequired("consultationRooms") && <span className="text-orange-500">*</span>}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCommercial({ consultationRooms: Math.max(0, (commercial.consultationRooms || 0) - 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.consultationRooms || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCommercial({ consultationRooms: Math.min(20, (commercial.consultationRooms || 0) + 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Treatment Rooms {isRequired("treatmentRooms") && <span className="text-orange-500">*</span>}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCommercial({ treatmentRooms: Math.max(0, (commercial.treatmentRooms || 0) - 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.treatmentRooms || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCommercial({ treatmentRooms: Math.min(20, (commercial.treatmentRooms || 0) + 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Waiting Area Capacity
              </label>
              <div className="flex items-center gap-3 w-48">
                <button
                  type="button"
                  onClick={() => updateCommercial({ waitingAreaCapacity: Math.max(0, (commercial.waitingAreaCapacity || 0) - 5) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="flex-1 text-center font-semibold text-gray-900">
                  {commercial.waitingAreaCapacity || 0}
                </span>
                <button
                  type="button"
                  onClick={() => updateCommercial({ waitingAreaCapacity: Math.min(100, (commercial.waitingAreaCapacity || 0) + 5) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parking Spaces
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

        {/* Medical Infrastructure */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Medical Infrastructure</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.medicalWasteDisposal
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.medicalWasteDisposal || false}
                  onChange={(e) => updateCommercial({ medicalWasteDisposal: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Medical Waste Disposal
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.wheelchairAccessible
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.wheelchairAccessible || false}
                  onChange={(e) => updateCommercial({ wheelchairAccessible: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Wheelchair Accessible
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasElevator
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasElevator || false}
                  onChange={(e) => updateCommercial({ hasElevator: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Elevator Available
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.backupPowerMedical
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.backupPowerMedical || false}
                  onChange={(e) => updateCommercial({ backupPowerMedical: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Medical-Grade Backup Power {isRequired("backupPowerMedical") && <span className="text-orange-500">*</span>}
                </span>
              </label>

              {isDental && (
                <label
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    commercial.dentalChairPlumbing
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={commercial.dentalChairPlumbing || false}
                    onChange={(e) => updateCommercial({ dentalChairPlumbing: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Dental Chair Plumbing {isRequired("dentalChairPlumbing") && <span className="text-orange-500">*</span>}
                  </span>
                </label>
              )}

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.xrayShielding
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.xrayShielding || false}
                  onChange={(e) => updateCommercial({ xrayShielding: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  X-ray Shielding Installed
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Licenses */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Licensing</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasPharmacyLicense
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasPharmacyLicense || false}
                  onChange={(e) => updateCommercial({ hasPharmacyLicense: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Pharmacy License Eligible
                </span>
              </label>

              {isLab && (
                <label
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    commercial.hasLabLicense
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={commercial.hasLabLicense || false}
                    onChange={(e) => updateCommercial({ hasLabLicense: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    Lab License Eligible
                  </span>
                </label>
              )}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
