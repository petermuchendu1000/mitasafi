"use client";

// =============================================================================
// MITASAFI: LOCATION PICKER COMPONENT
// =============================================================================
// Reusable component for selecting or creating a service location.
// Supports:
// - Selecting from saved locations
// - Entering a new address with area, access notes
// - Optionally saving the new location for future use
// =============================================================================

import { useState } from "react";
import {
  MapPin,
  Plus,
  Home,
  Briefcase,
  Building2,
} from "lucide-react";
import { marketplaceAreaNames } from "@/lib/site/marketplace";
import { townNames } from "@/lib/site/places";
import type { LocationType } from "@/types/bookings";

// =============================================================================
// TYPES
// =============================================================================

export interface SavedLocation {
  id: string;
  label: string | null;
  address_line1: string;
  area: string | null;
  city: string;
}

export interface LocationData {
  locationId?: string;
  addressLine1: string;
  addressLine2: string;
  area: string;
  city: string;
  accessNotes: string;
  locationType: LocationType | "";
  saveLocation: boolean;
  locationLabel: string;
}

interface LocationPickerProps {
  savedLocations: SavedLocation[];
  value: LocationData;
  onChange: (data: LocationData) => void;
}

// =============================================================================
// COMPONENT
// =============================================================================

export function LocationPicker({
  savedLocations,
  value,
  onChange,
}: LocationPickerProps) {
  // What the user last chose. Only meaningful while there are saved locations.
  const [preferredMode, setPreferredMode] = useState<"saved" | "new">(
    savedLocations.length > 0 ? "saved" : "new",
  );

  // Derived, not synchronised by an effect.
  //
  // This used to be plain state forced to "new" from a useEffect whenever
  // savedLocations emptied. That left one render in between where the state still
  // said "saved" and the list was already empty — and in that render NEITHER branch
  // below draws anything, because the saved list is guarded by
  // `savedLocations.length > 0` and the new-address form by `mode === "new"`. The
  // user saw an empty panel until the effect landed. Deriving removes the gap: there
  // is no render in which the two disagree.
  const mode = savedLocations.length === 0 ? "new" : preferredMode;

  function handleSelectSaved(locId: string) {
    const loc = savedLocations.find((l) => l.id === locId);
    if (!loc) return;
    onChange({
      ...value,
      locationId: loc.id,
      addressLine1: loc.address_line1,
      area: loc.area ?? "",
      city: loc.city,
    });
  }

  function handleFieldChange(
    field: keyof LocationData,
    fieldValue: string | boolean,
  ) {
    onChange({ ...value, locationId: undefined, [field]: fieldValue });
  }

  return (
    <div className="space-y-4">
      {/* Mode toggle (only if user has saved locations) */}
      {savedLocations.length > 0 && (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPreferredMode("saved")}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              mode === "saved"
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <Home className="w-4 h-4" />
            Saved locations
          </button>
          <button
            type="button"
            onClick={() => {
              setPreferredMode("new");
              onChange({
                ...value,
                locationId: undefined,
                addressLine1: "",
                area: "",
              });
            }}
            className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
              mode === "new"
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            }`}
          >
            <Plus className="w-4 h-4" />
            New address
          </button>
        </div>
      )}

      {/* Saved locations list */}
      {mode === "saved" && savedLocations.length > 0 && (
        <div className="space-y-2">
          {savedLocations.map((loc) => (
            <button
              key={loc.id}
              type="button"
              onClick={() => handleSelectSaved(loc.id)}
              className={`w-full text-left px-4 py-3 rounded-lg border transition-colors ${
                value.locationId === loc.id
                  ? "border-teal-600 bg-teal-50"
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  {loc.label && (
                    <p className="text-sm font-medium text-gray-900">
                      {loc.label}
                    </p>
                  )}
                  <p className="text-sm text-gray-600">{loc.address_line1}</p>
                  {loc.area && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      {loc.area}, {loc.city}
                    </p>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* New address form */}
      {mode === "new" && (
        <div className="space-y-3">
          {/* Address line 1 */}
          <div>
            <label
              htmlFor="loc-address"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Address / building name *
            </label>
            <input
              id="loc-address"
              type="text"
              value={value.addressLine1}
              onChange={(e) =>
                handleFieldChange("addressLine1", e.target.value)
              }
              placeholder="e.g. Riverside Apartments, Block C"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Address line 2 */}
          <div>
            <label
              htmlFor="loc-address2"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Floor / unit (optional)
            </label>
            <input
              id="loc-address2"
              type="text"
              value={value.addressLine2}
              onChange={(e) =>
                handleFieldChange("addressLine2", e.target.value)
              }
              placeholder="e.g. 3rd Floor, Unit 12"
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          <div>
            <label htmlFor="loc-city" className="mb-1 block text-sm font-medium text-gray-700">City or town *</label>
            <input
              id="loc-city"
              list="booking-towns"
              value={value.city}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <datalist id="booking-towns">{townNames.map((name) => <option key={name} value={name} />)}</datalist>
          </div>

          {/* Area */}
          <div>
            <label
              htmlFor="loc-area"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Estate or neighbourhood
            </label>
            <input
              id="loc-area"
              list="booking-areas"
              value={value.area}
              onChange={(e) => handleFieldChange("area", e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2.5 text-sm focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
            <datalist id="booking-areas">{marketplaceAreaNames.map((area) => <option key={area} value={area} />)}</datalist>
          </div>

          {/* Location type */}
          <div>
            <label
              htmlFor="loc-type"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Location type
            </label>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  { value: "home", label: "Home", icon: Home },
                  { value: "office", label: "Office", icon: Briefcase },
                  {
                    value: "public_place",
                    label: "Public Place",
                    icon: Building2,
                  },
                  { value: "other", label: "Other", icon: MapPin },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => handleFieldChange("locationType", opt.value)}
                  className={`flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border transition-colors ${
                    value.locationType === opt.value
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  <opt.icon className="w-4 h-4" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Access notes */}
          <div>
            <label
              htmlFor="loc-access"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Access instructions (optional)
            </label>
            <textarea
              id="loc-access"
              value={value.accessNotes}
              onChange={(e) => handleFieldChange("accessNotes", e.target.value)}
              placeholder="e.g. Gate code 1234, ask for the watchman at the blue gate"
              rows={2}
              className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>

          {/* Save for later */}
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
            <input
              type="checkbox"
              checked={value.saveLocation}
              onChange={(e) =>
                handleFieldChange("saveLocation", e.target.checked)
              }
              className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
            />
            Save this address for future bookings
          </label>

          {/* Label (shown when save is checked) */}
          {value.saveLocation && (
            <div>
              <label
                htmlFor="loc-label"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Label (optional)
              </label>
              <input
                id="loc-label"
                type="text"
                value={value.locationLabel}
                onChange={(e) =>
                  handleFieldChange("locationLabel", e.target.value)
                }
                placeholder='e.g. "Home", "Office"'
                className="w-full px-3 py-2.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
