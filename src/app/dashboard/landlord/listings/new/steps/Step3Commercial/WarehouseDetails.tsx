/**
 * Warehouse Space Details
 * 
 * Captures warehouse-specific information:
 * - Area and dimensions
 * - Loading facilities
 * - Cold storage and special handling
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 * 
 * REFACTORED: Uses useCommercialForm hook for standardized state/validation
 */

"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useCommercialForm } from "../../hooks";

export function WarehouseDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired } = useCommercialForm();

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Warehouse Details
        </h2>
        <p className="text-gray-500">
          Dimensions, loading facilities, and capabilities
        </p>
      </div>

      <div className="space-y-6">
        {/* Space Dimensions */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Space Dimensions</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Warehouse Area <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.warehouseAreaSqm || ""}
                    onChange={(e) => updateCommercial({ warehouseAreaSqm: parseInt(e.target.value) || null })}
                    placeholder="e.g., 2000"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sqm</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Office Area
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.officeAreaSqm || ""}
                    onChange={(e) => updateCommercial({ officeAreaSqm: parseInt(e.target.value) || null })}
                    placeholder="e.g., 100"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sqm</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Yard Area
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={commercial.yardAreaSqm || ""}
                    onChange={(e) => updateCommercial({ yardAreaSqm: parseInt(e.target.value) || null })}
                    placeholder="e.g., 500"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sqm</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Clear Height <span className="text-orange-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    value={commercial.clearHeightM || ""}
                    onChange={(e) => updateCommercial({ clearHeightM: parseFloat(e.target.value) || null })}
                    placeholder="e.g., 8.0"
                    className="w-full px-4 py-3 pr-12 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">m</span>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Floor Load Capacity {isRequired("floorLoadCapacity") && <span className="text-orange-500">*</span>}
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={commercial.floorLoadCapacity || ""}
                  onChange={(e) => updateCommercial({ floorLoadCapacity: parseInt(e.target.value) || null })}
                  placeholder="e.g., 3000"
                  className="w-full px-4 py-3 pr-20 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">kg/sqm</span>
              </div>
            </div>
          </div>
        </section>

        {/* Loading & Access */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Loading & Access</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Loading Docks {isRequired("loadingDocks") && <span className="text-orange-500">*</span>}
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCommercial({ loadingDocks: Math.max(0, (commercial.loadingDocks || 0) - 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.loadingDocks || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCommercial({ loadingDocks: Math.min(20, (commercial.loadingDocks || 0) + 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Drive-In Doors
                </label>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => updateCommercial({ driveInDoors: Math.max(0, (commercial.driveInDoors || 0) - 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Minus className="w-4 h-4 text-gray-600" />
                  </button>
                  <span className="flex-1 text-center font-semibold text-gray-900">
                    {commercial.driveInDoors || 0}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateCommercial({ driveInDoors: Math.min(20, (commercial.driveInDoors || 0) + 1) })}
                    className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                  >
                    <Plus className="w-4 h-4 text-gray-600" />
                  </button>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Drive-In Door Size
              </label>
              <input
                type="text"
                value={commercial.driveInDoorSize || ""}
                onChange={(e) => updateCommercial({ driveInDoorSize: e.target.value })}
                placeholder="e.g., 4m x 4m"
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasDockLevelers
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasDockLevelers || false}
                  onChange={(e) => updateCommercial({ hasDockLevelers: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Dock Levelers
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasWeighbridge
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasWeighbridge || false}
                  onChange={(e) => updateCommercial({ hasWeighbridge: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Weighbridge
                </span>
              </label>
            </div>
          </div>
        </section>

        {/* Special Capabilities */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Special Capabilities</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.coldStorage
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.coldStorage || false}
                  onChange={(e) => updateCommercial({ coldStorage: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Cold Storage / Refrigerated {isRequired("coldStorage") && <span className="text-orange-500">*</span>}
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hazmatApproved
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hazmatApproved || false}
                  onChange={(e) => updateCommercial({ hazmatApproved: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Hazmat Approved
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.eaccBonded
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.eaccBonded || false}
                  onChange={(e) => updateCommercial({ eaccBonded: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  EACC Bonded Facility
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasSprinklers
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasSprinklers || false}
                  onChange={(e) => updateCommercial({ hasSprinklers: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Fire Sprinkler System
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasCrane
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasCrane || false}
                  onChange={(e) => updateCommercial({ hasCrane: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Overhead Crane
                </span>
              </label>
            </div>

            {/* Cold Storage Temperature */}
            {commercial.coldStorage && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cold Storage Temperature Range {isRequired("coldStorageTempRange") && <span className="text-orange-500">*</span>}
                </label>
                <input
                  type="text"
                  value={commercial.coldStorageTempRange || ""}
                  onChange={(e) => updateCommercial({ coldStorageTempRange: e.target.value })}
                  placeholder="e.g., -18°C to 4°C"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            {/* Crane Capacity */}
            {commercial.hasCrane && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Crane Capacity
                </label>
                <input
                  type="text"
                  value={commercial.craneCapacity || ""}
                  onChange={(e) => updateCommercial({ craneCapacity: e.target.value })}
                  placeholder="e.g., 5 tons"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
