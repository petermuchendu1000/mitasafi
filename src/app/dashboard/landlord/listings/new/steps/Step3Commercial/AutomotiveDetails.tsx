/**
 * Automotive Space Details
 * 
 * Captures automotive-specific information:
 * - Parking spaces and type
 * - Service bays and equipment
 * - Car wash and fuel facilities
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 * 
 * REFACTORED: Uses useCommercialForm hook for standardized state/validation
 */

"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useCommercialForm, useCommercialSubtype } from "../../hooks";

const PARKING_TYPES = [
  { id: "open", label: "Open", description: "Surface parking" },
  { id: "covered", label: "Covered", description: "Sheltered parking" },
  { id: "basement", label: "Basement", description: "Underground" },
  { id: "multi_story", label: "Multi-Story", description: "Parking building" },
];

const CAR_WASH_TYPES = [
  { id: "manual", label: "Manual" },
  { id: "automatic", label: "Automatic" },
  { id: "self_service", label: "Self-Service" },
  { id: "tunnel", label: "Tunnel" },
];

export function AutomotiveDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired, commercialSubtype } = useCommercialForm();
  const { isParkingLot, isParkingBuilding, isGarage, isCarWash, isPetrolStation } = useCommercialSubtype();

  // Determine which fields to show based on subtype
  const isParking = commercialSubtype?.includes("parking");
  const isShowroom = commercialSubtype === "car_showroom";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Automotive Space Details
        </h2>
        <p className="text-gray-500">
          Parking, service, and facility information
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
                    placeholder="e.g., 500"
                    className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    sqm
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Road Frontage {isRequired("frontageWidthM") && <span className="text-orange-500">*</span>}
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

            {/* Parking Spaces */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Parking Spaces {isRequired("parkingSpacesCount") && <span className="text-orange-500">*</span>}
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
                  onClick={() => updateCommercial({ parkingSpacesCount: Math.min(1000, (commercial.parkingSpacesCount || 0) + 1) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>

            {/* Parking Type */}
            {isParking && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Parking Type
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {PARKING_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => updateCommercial({ parkingType: type.id as typeof commercial.parkingType })}
                      className={cn(
                        "p-3 rounded-lg border-2 text-left transition-all",
                        commercial.parkingType === type.id
                          ? "border-teal-600 bg-teal-50"
                          : "border-gray-200 hover:border-gray-300"
                      )}
                    >
                      <span className={cn(
                        "block text-sm font-medium",
                        commercial.parkingType === type.id ? "text-teal-700" : "text-gray-900"
                      )}>
                        {type.label}
                      </span>
                      <span className="text-xs text-gray-500">{type.description}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Number of Floors - for parking buildings */}
            {isParkingBuilding && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Floors {isRequired("floorLevel") && <span className="text-orange-500">*</span>}
                </label>
                <input
                  type="text"
                  value={commercial.floorLevel || ""}
                  onChange={(e) => updateCommercial({ floorLevel: e.target.value })}
                  placeholder="e.g., 5 floors"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}
          </div>
        </section>

        {/* Service Bay Details */}
        {(isGarage || isShowroom) && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Service Facilities</h3>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Work Bays {isRequired("workBays") && <span className="text-orange-500">*</span>}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateCommercial({ workBays: Math.max(0, (commercial.workBays || 0) - 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="flex-1 text-center font-semibold text-gray-900">
                      {commercial.workBays || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCommercial({ workBays: Math.min(30, (commercial.workBays || 0) + 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Vehicle Lifts
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateCommercial({ vehicleLiftCount: Math.max(0, (commercial.vehicleLiftCount || 0) - 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="flex-1 text-center font-semibold text-gray-900">
                      {commercial.vehicleLiftCount || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCommercial({ vehicleLiftCount: Math.min(20, (commercial.vehicleLiftCount || 0) + 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.inspectionPit
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.inspectionPit || false}
                  onChange={(e) => updateCommercial({ inspectionPit: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Inspection Pit
                </span>
              </label>
            </div>
          </section>
        )}

        {/* Car Wash Facilities */}
        {isCarWash && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Car Wash Facilities</h3>
            </div>

            <div className="p-5 space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Car Wash Type {isRequired("carWashType") && <span className="text-orange-500">*</span>}
                </label>
                <div className="flex flex-wrap gap-3">
                  {CAR_WASH_TYPES.map((type) => (
                    <button
                      key={type.id}
                      type="button"
                      onClick={() => updateCommercial({ carWashType: type.id as typeof commercial.carWashType })}
                      className={cn(
                        "px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                        commercial.carWashType === type.id
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      )}
                    >
                      {type.label}
                    </button>
                  ))}
                </div>
              </div>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.waterRecyclingSystem
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.waterRecyclingSystem || false}
                  onChange={(e) => updateCommercial({ waterRecyclingSystem: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Water Recycling System
                </span>
              </label>
            </div>
          </section>
        )}

        {/* Petrol Station Facilities */}
        {isPetrolStation && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Fuel Station Facilities</h3>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Pump Islands {isRequired("pumpIslands") && <span className="text-orange-500">*</span>}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateCommercial({ pumpIslands: Math.max(0, (commercial.pumpIslands || 0) - 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="flex-1 text-center font-semibold text-gray-900">
                      {commercial.pumpIslands || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCommercial({ pumpIslands: Math.min(20, (commercial.pumpIslands || 0) + 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Convenience Store Area
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={commercial.convenienceStoreSqm || ""}
                      onChange={(e) => updateCommercial({ convenienceStoreSqm: parseInt(e.target.value) || null })}
                      placeholder="e.g., 50"
                      className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                      sqm
                    </span>
                  </div>
                </div>
              </div>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.canopyCovered
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.canopyCovered || false}
                  onChange={(e) => updateCommercial({ canopyCovered: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Canopy Covered Forecourt
                </span>
              </label>
            </div>
          </section>
        )}

        {/* EV Charging */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Electric Vehicle Facilities</h3>
          </div>

          <div className="p-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                EV Charging Stations
              </label>
              <div className="flex items-center gap-3 w-48">
                <button
                  type="button"
                  onClick={() => updateCommercial({ evChargingStations: Math.max(0, (commercial.evChargingStations || 0) - 1) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Minus className="w-4 h-4 text-gray-600" />
                </button>
                <span className="flex-1 text-center font-semibold text-gray-900">
                  {commercial.evChargingStations || 0}
                </span>
                <button
                  type="button"
                  onClick={() => updateCommercial({ evChargingStations: Math.min(50, (commercial.evChargingStations || 0) + 1) })}
                  className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                >
                  <Plus className="w-4 h-4 text-gray-600" />
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
