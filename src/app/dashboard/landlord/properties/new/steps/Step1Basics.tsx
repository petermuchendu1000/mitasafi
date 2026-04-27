/**
 * Step 1: Building Basics
 * 
 * Collects basic building information:
 * - Building name
 * - Building type
 * - Location (with Google Places)
 * - Basic details (floors, units, year built)
 */

"use client";

import { useEffect, useCallback, useRef, useState } from "react";
import { cn } from "@/lib/utils";
// Google Maps types are in src/types/global.d.ts
import { 
  Building2, 
  MapPin, 
  Calendar,
  Layers,
  Hash,
  Search,
  Building,
  Warehouse,
  Shield,
  Users,
  Store,
  MoreHorizontal,
} from "lucide-react";
import { useWizard } from "../context";
import { 
  BUILDING_TYPES, 
  type BuildingType,
  type StepValidation,
} from "../types";

// Type for Google Places Autocomplete instance
type GoogleAutocomplete = ReturnType<NonNullable<typeof window.google>["maps"]["places"]["Autocomplete"]["prototype"]["constructor"]> | null;

// Icon mapping for building types
const BUILDING_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  building: Building,
  building2: Building2,
  warehouse: Warehouse,
  shield: Shield,
  users: Users,
  store: Store,
  "more-horizontal": MoreHorizontal,
};

export function Step1Basics() {
  const { state, updateFormData, dispatch, setFieldTouched } = useWizard();
  const { formData, validation } = state;
  const addressInputRef = useRef<HTMLInputElement>(null);
  const autocompleteRef = useRef<GoogleAutocomplete>(null);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);

  // Initialize Google Places Autocomplete
  useEffect(() => {
    const initAutocomplete = () => {
      if (!window.google?.maps?.places || !addressInputRef.current) return;
      
      setIsGoogleLoaded(true);
      
      const autocomplete = new window.google.maps.places.Autocomplete(
        addressInputRef.current,
        {
          componentRestrictions: { country: "ke" },
          types: ["establishment", "geocode"],
          fields: ["formatted_address", "geometry", "name", "address_components"],
        }
      );
      
      autocompleteRef.current = autocomplete as unknown as GoogleAutocomplete;

      autocomplete.addListener("place_changed", () => {
        const place = autocomplete.getPlace();
        if (!place?.geometry?.location) return;

        // Extract area from address components
        let area = "";
        let city = "Nairobi";
        
        place.address_components?.forEach((component: { long_name: string; short_name: string; types: string[] }) => {
          if (component.types.includes("sublocality") || component.types.includes("neighborhood")) {
            area = component.long_name;
          }
          if (component.types.includes("locality")) {
            city = component.long_name;
          }
        });

        updateFormData({
          address: place.formatted_address || "",
          area: area || formData.area,
          city,
          latitude: place.geometry.location.lat(),
          longitude: place.geometry.location.lng(),
        });
      });
    };

    // Load Google Maps script if not already loaded
    if (!window.google?.maps?.places) {
      const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
      if (!apiKey) {
        console.warn("Google Maps API key not found");
        return;
      }

      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      script.onload = initAutocomplete;
      document.head.appendChild(script);
    } else {
      initAutocomplete();
    }

    return () => {
      if (autocompleteRef.current && window.google?.maps?.event) {
        window.google.maps.event.clearInstanceListeners(autocompleteRef.current);
      }
    };
  }, [updateFormData, formData.area]);

  // Validation
  const validate = useCallback((): StepValidation => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Building name is required";
    }

    if (!formData.building_type) {
      errors.building_type = "Please select a building type";
    }

    if (!formData.address.trim()) {
      errors.address = "Address is required";
    }

    if (!formData.area.trim()) {
      errors.area = "Area/Neighborhood is required";
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      touched: validation[1]?.touched || {},
    };
  }, [formData, validation]);

  // Update validation on form changes
  useEffect(() => {
    const stepValidation = validate();
    dispatch({ 
      type: "SET_VALIDATION", 
      payload: { step: 1, validation: stepValidation } 
    });
  }, [formData.name, formData.building_type, formData.address, formData.area, validate, dispatch]);

  const currentValidation = validation[1] || { errors: {}, touched: {} };
  const showError = (field: string) => 
    currentValidation.touched[field] && currentValidation.errors[field];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Building Details</h2>
        <p className="mt-1 text-gray-500">
          Let&apos;s start with the basic information about your building
        </p>
      </div>

      {/* Building Name */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Building Name <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Building2 className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => updateFormData({ name: e.target.value })}
            onBlur={() => setFieldTouched(1, "name")}
            placeholder="e.g. GG Heights, Pearl Apartments"
            className={cn(
              "block w-full pl-10 pr-4 py-3 rounded-xl border",
              "text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
              "transition-colors",
              showError("name") 
                ? "border-red-300 bg-red-50" 
                : "border-gray-200 hover:border-gray-300"
            )}
          />
        </div>
        {showError("name") && (
          <p className="mt-1.5 text-sm text-red-600">{currentValidation.errors.name}</p>
        )}
      </div>

      {/* Building Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Building Type <span className="text-red-500">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {BUILDING_TYPES.map((type) => {
            const Icon = BUILDING_ICONS[type.icon] || Building2;
            const isSelected = formData.building_type === type.id;
            
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => {
                  updateFormData({ building_type: type.id as BuildingType });
                  setFieldTouched(1, "building_type");
                }}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border-2 text-left",
                  "transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                  isSelected
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-teal-300 hover:bg-gray-50"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  isSelected ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    isSelected ? "text-teal-900" : "text-gray-900"
                  )}>
                    {type.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
                    {type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
        {showError("building_type") && (
          <p className="mt-2 text-sm text-red-600">{currentValidation.errors.building_type}</p>
        )}
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Address <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            ref={addressInputRef}
            type="text"
            value={formData.address}
            onChange={(e) => updateFormData({ address: e.target.value })}
            onBlur={() => setFieldTouched(1, "address")}
            placeholder="Search address or building name..."
            className={cn(
              "block w-full pl-10 pr-4 py-3 rounded-xl border",
              "text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
              "transition-colors",
              showError("address") 
                ? "border-red-300 bg-red-50" 
                : "border-gray-200 hover:border-gray-300"
            )}
          />
        </div>
        {!isGoogleLoaded && (
          <p className="mt-1.5 text-xs text-gray-500">
            💡 Tip: Enter address manually or wait for location search to load
          </p>
        )}
        {showError("address") && (
          <p className="mt-1.5 text-sm text-red-600">{currentValidation.errors.address}</p>
        )}
      </div>

      {/* Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Area / Neighborhood <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <MapPin className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            value={formData.area}
            onChange={(e) => updateFormData({ area: e.target.value })}
            onBlur={() => setFieldTouched(1, "area")}
            placeholder="e.g. Kilimani, Westlands, Kileleshwa"
            className={cn(
              "block w-full pl-10 pr-4 py-3 rounded-xl border",
              "text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
              "transition-colors",
              showError("area") 
                ? "border-red-300 bg-red-50" 
                : "border-gray-200 hover:border-gray-300"
            )}
          />
        </div>
        {showError("area") && (
          <p className="mt-1.5 text-sm text-red-600">{currentValidation.errors.area}</p>
        )}
      </div>

      {/* Optional Fields - Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Floors */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Floors
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Layers className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              min="1"
              max="100"
              value={formData.total_floors || ""}
              onChange={(e) => updateFormData({ total_floors: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="e.g. 10"
              className={cn(
                "block w-full pl-10 pr-4 py-3 rounded-xl border",
                "text-gray-900 placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                "border-gray-200 hover:border-gray-300"
              )}
            />
          </div>
        </div>

        {/* Total Units */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Total Units
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Hash className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              min="1"
              max="1000"
              value={formData.total_units || ""}
              onChange={(e) => updateFormData({ total_units: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="e.g. 24"
              className={cn(
                "block w-full pl-10 pr-4 py-3 rounded-xl border",
                "text-gray-900 placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                "border-gray-200 hover:border-gray-300"
              )}
            />
          </div>
        </div>

        {/* Year Built */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Year Built
          </label>
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Calendar className="h-5 w-5 text-gray-400" />
            </div>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.year_built || ""}
              onChange={(e) => updateFormData({ year_built: e.target.value ? parseInt(e.target.value) : undefined })}
              placeholder="e.g. 2020"
              className={cn(
                "block w-full pl-10 pr-4 py-3 rounded-xl border",
                "text-gray-900 placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                "border-gray-200 hover:border-gray-300"
              )}
            />
          </div>
        </div>
      </div>

      {/* Landmarks (optional) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Nearby Landmarks <span className="text-gray-400 text-xs">(optional)</span>
        </label>
        <input
          type="text"
          value={formData.landmarks || ""}
          onChange={(e) => updateFormData({ landmarks: e.target.value })}
          placeholder="e.g. Near Yaya Centre, opposite Shell Petrol Station"
          className={cn(
            "block w-full px-4 py-3 rounded-xl border",
            "text-gray-900 placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
            "border-gray-200 hover:border-gray-300"
          )}
        />
        <p className="mt-1.5 text-xs text-gray-500">
          Helps tenants and visitors find the building easily
        </p>
      </div>
    </div>
  );
}
