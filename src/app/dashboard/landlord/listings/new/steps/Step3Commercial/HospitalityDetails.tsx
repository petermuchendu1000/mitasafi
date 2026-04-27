/**
 * Hospitality Space Details
 * 
 * Captures hospitality-specific information:
 * - Room count and configuration
 * - Conference and event facilities
 * - Star rating and amenities
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 * 
 * REFACTORED: Uses useCommercialForm hook for standardized state/validation
 */

"use client";

import { cn } from "@/lib/utils";
import { Minus, Plus } from "lucide-react";
import { useCommercialForm, useCommercialSubtype } from "../../hooks";

const STAR_RATINGS = [
  { value: 0, label: "Unrated" },
  { value: 2, label: "2 Star" },
  { value: 3, label: "3 Star" },
  { value: 4, label: "4 Star" },
  { value: 5, label: "5 Star" },
];

export function HospitalityDetails() {
  // Use shared hook for standardized state management & validation
  const { commercial, updateCommercial, isRequired, commercialSubtype } = useCommercialForm();
  const { isHotel, isEventVenue, isConferenceCenter } = useCommercialSubtype();

  const isHotelOrGuest = isHotel || commercialSubtype === "guest_house";
  const isEventSpace = isEventVenue || isConferenceCenter || commercialSubtype === "wedding_venue";

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Hospitality Details
        </h2>
        <p className="text-gray-500">
          Rooms, facilities, and amenities
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
                  placeholder="e.g., 5000"
                  className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sqm</span>
              </div>
            </div>

            {isHotel && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Star Rating {isRequired("starRating") && <span className="text-orange-500">*</span>}
                </label>
                <div className="flex flex-wrap gap-3">
                  {STAR_RATINGS.map((rating) => (
                    <button
                      key={rating.value}
                      type="button"
                      onClick={() => updateCommercial({ starRating: rating.value })}
                      className={cn(
                        "px-4 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                        commercial.starRating === rating.value
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      )}
                    >
                      {rating.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Room Configuration */}
        {isHotel && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">Room Configuration</h3>
            </div>

            <div className="p-5 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Rooms <span className="text-orange-500">*</span>
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateCommercial({ roomCount: Math.max(0, (commercial.roomCount || 0) - 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="flex-1 text-center font-semibold text-gray-900">
                      {commercial.roomCount || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCommercial({ roomCount: Math.min(500, (commercial.roomCount || 0) + 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Beds {isRequired("bedCount") && <span className="text-orange-500">*</span>}
                  </label>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => updateCommercial({ bedCount: Math.max(0, (commercial.bedCount || 0) - 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Minus className="w-4 h-4 text-gray-600" />
                    </button>
                    <span className="flex-1 text-center font-semibold text-gray-900">
                      {commercial.bedCount || 0}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateCommercial({ bedCount: Math.min(1000, (commercial.bedCount || 0) + 1) })}
                      className="w-10 h-10 rounded-lg border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                    >
                      <Plus className="w-4 h-4 text-gray-600" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* Conference & Event Facilities */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Conference & Event Facilities</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasConferenceRooms
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasConferenceRooms || false}
                  onChange={(e) => updateCommercial({ hasConferenceRooms: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Conference Rooms Available
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasAvEquipment
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasAvEquipment || false}
                  onChange={(e) => updateCommercial({ hasAvEquipment: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  AV Equipment Included
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasStage
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasStage || false}
                  onChange={(e) => updateCommercial({ hasStage: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Stage / Platform
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasCateringKitchen
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasCateringKitchen || false}
                  onChange={(e) => updateCommercial({ hasCateringKitchen: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Catering Kitchen
                </span>
              </label>
            </div>

            {commercial.hasConferenceRooms && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Conference Capacity {isRequired("conferenceCapacity") && <span className="text-orange-500">*</span>}
                </label>
                <input
                  type="number"
                  value={commercial.conferenceCapacity || ""}
                  onChange={(e) => updateCommercial({ conferenceCapacity: parseInt(e.target.value) || null })}
                  placeholder="e.g., 200"
                  className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            )}

            {isEventVenue && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Seated Capacity {isRequired("eventCapacitySeated") && <span className="text-orange-500">*</span>}
                  </label>
                  <input
                    type="number"
                    value={commercial.eventCapacitySeated || ""}
                    onChange={(e) => updateCommercial({ eventCapacitySeated: parseInt(e.target.value) || null })}
                    placeholder="e.g., 300"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Standing Capacity
                  </label>
                  <input
                    type="number"
                    value={commercial.eventCapacityStanding || ""}
                    onChange={(e) => updateCommercial({ eventCapacityStanding: parseInt(e.target.value) || null })}
                    placeholder="e.g., 500"
                    className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Additional Amenities */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Additional Amenities</h3>
          </div>

          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasRestaurant
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasRestaurant || false}
                  onChange={(e) => updateCommercial({ hasRestaurant: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Restaurant
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.hasSwimmingPool
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.hasSwimmingPool || false}
                  onChange={(e) => updateCommercial({ hasSwimmingPool: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Swimming Pool
                </span>
              </label>

              <label
                className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                  commercial.tentedAllowed
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <input
                  type="checkbox"
                  checked={commercial.tentedAllowed || false}
                  onChange={(e) => updateCommercial({ tentedAllowed: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <span className="text-sm font-medium text-gray-700">
                  Tent Setup Allowed
                </span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Outdoor Space Area
              </label>
              <div className="relative">
                <input
                  type="number"
                  value={commercial.outdoorSpaceSqm || ""}
                  onChange={(e) => updateCommercial({ outdoorSpaceSqm: parseInt(e.target.value) || null })}
                  placeholder="e.g., 500"
                  className="w-full px-4 py-3 pr-16 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">sqm</span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
