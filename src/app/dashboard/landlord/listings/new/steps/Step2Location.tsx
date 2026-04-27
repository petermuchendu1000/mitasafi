/**
 * Step 2: Location
 * 
 * Captures property address and location details.
 * Includes Google Places autocomplete for accurate addresses.
 * 
 * Uses dynamic content from content-config.ts for accurate
 * labels and placeholders based on listing type.
 */

"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { cn } from "@/lib/utils";
import { MapPin, Building, ChevronDown, Info, Search, Loader2 } from "lucide-react";
import { useWizard } from "../context";
import { NAIROBI_AREAS } from "../types";
import { useStep2Content } from "../useWizardContent";

// Define the area type for type safety
type AreaItem = { id: string; name: string; category: string };

// Google Places prediction type
interface PlacePrediction {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

export function Step2Location() {
  const { state, updateFormData, setValidation, setFieldTouched } = useWizard();
  const { 
    buildingName, 
    streetAddress, 
    area, 
    city, 
    unitNumber,
    hideExactAddress,
  } = state.formData;

  // Get dynamic content based on listing type
  const content = useStep2Content();

  const [isAreaDropdownOpen, setIsAreaDropdownOpen] = useState(false);
  const [areaSearch, setAreaSearch] = useState("");
  
  // Google Places state
  const [addressSearch, setAddressSearch] = useState(streetAddress);
  const [predictions, setPredictions] = useState<PlacePrediction[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showPredictions, setShowPredictions] = useState(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const addressInputRef = useRef<HTMLInputElement>(null);

  // Flatten areas for search - properly handle the new structure
  const allAreas: AreaItem[] = Object.entries(NAIROBI_AREAS).flatMap(
    ([categoryKey, categoryData]) =>
      categoryData.areas.map((a) => ({ 
        id: a.id, 
        name: a.name, 
        category: categoryData.label 
      }))
  );

  const filteredAreas = areaSearch
    ? allAreas.filter((a) => 
        a.name.toLowerCase().includes(areaSearch.toLowerCase())
      )
    : allAreas;

  // Get selected area display name
  const selectedAreaName = allAreas.find((a) => a.id === area)?.name || "";

  // Validation - building name is now mandatory
  useEffect(() => {
    const errors: Record<string, string> = {};
    
    if (!buildingName.trim()) {
      errors.buildingName = `${content.buildingName.label} is required`;
    }
    
    if (!streetAddress.trim()) {
      errors.streetAddress = `${content.streetAddress.label} is required`;
    }
    
    if (!area.trim()) {
      errors.area = `${content.area.label} is required`;
    }

    setValidation(2, {
      isValid: Object.keys(errors).length === 0,
      errors,
      touched: {},
    });
  }, [buildingName, streetAddress, area, setValidation, content]);

  const handleFieldChange = (field: string, value: string | boolean) => {
    updateFormData({ [field]: value });
    setFieldTouched(2, field);
  };

  const handleAreaSelect = (areaId: string) => {
    handleFieldChange("area", areaId);
    setIsAreaDropdownOpen(false);
    setAreaSearch("");
  };

  // Google Places autocomplete search
  const searchPlaces = useCallback(async (query: string) => {
    if (query.length < 2) {
      setPredictions([]);
      return;
    }

    setIsSearching(true);
    
    try {
      const response = await fetch(
        `/api/places/autocomplete?input=${encodeURIComponent(query)}`
      );
      
      if (response.ok) {
        const data = await response.json();
        setPredictions(data.predictions || []);
        
        // Log any API errors for debugging
        if (data.error) {
          console.warn("Places API:", data.error);
        }
      } else {
        setPredictions([]);
      }
    } catch (error) {
      console.error("Places search failed:", error);
      setPredictions([]);
    } finally {
      setIsSearching(false);
    }
  }, []);

  // Debounced search
  const handleAddressInputChange = (value: string) => {
    setAddressSearch(value);
    setShowPredictions(true);
    
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    searchTimeoutRef.current = setTimeout(() => {
      searchPlaces(value);
    }, 300);
  };

  // Handle prediction selection
  const handlePredictionSelect = async (prediction: PlacePrediction) => {
    setAddressSearch(prediction.description);
    handleFieldChange("streetAddress", prediction.description);
    setShowPredictions(false);
    setPredictions([]);
    
    // Try to auto-detect area from the address
    const addressLower = prediction.description.toLowerCase();
    for (const areaItem of allAreas) {
      if (addressLower.includes(areaItem.name.toLowerCase())) {
        handleFieldChange("area", areaItem.id);
        break;
      }
    }
  };

  // Handle manual address entry
  const handleAddressBlur = () => {
    // Delay to allow prediction click to register
    setTimeout(() => {
      if (addressSearch && addressSearch !== streetAddress) {
        handleFieldChange("streetAddress", addressSearch);
      }
      setShowPredictions(false);
    }, 200);
  };

  const touched = state.validation[2]?.touched || {};
  const errors = state.validation[2]?.errors || {};

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          {content.header.title}
        </h2>
        <p className="text-gray-500">
          {content.header.subtitle}
        </p>
      </div>

      <div className="space-y-6">
        {/* Building/Property Name - NOW MANDATORY */}
        <div>
          <label 
            htmlFor="buildingName" 
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {content.buildingName.label} <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <Building className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              id="buildingName"
              value={buildingName}
              onChange={(e) => handleFieldChange("buildingName", e.target.value)}
              placeholder={content.buildingName.placeholder}
              className={cn(
                "w-full pl-10 pr-4 py-3 rounded-lg border bg-white",
                "text-gray-900 placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                "transition-colors",
                touched.buildingName && errors.buildingName
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              )}
            />
          </div>
          {touched.buildingName && errors.buildingName ? (
            <p className="text-xs text-red-600 mt-1.5">{errors.buildingName}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1.5">
              {content.buildingName.helper}
            </p>
          )}
        </div>

        {/* Street Address with Google Places Autocomplete */}
        <div>
          <label 
            htmlFor="streetAddress" 
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {content.streetAddress.label} <span className="text-orange-500">*</span>
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              ref={addressInputRef}
              type="text"
              id="streetAddress"
              value={addressSearch}
              onChange={(e) => handleAddressInputChange(e.target.value)}
              onFocus={() => addressSearch.length >= 2 && setShowPredictions(true)}
              onBlur={handleAddressBlur}
              placeholder={content.streetAddress.placeholder}
              className={cn(
                "w-full pl-10 pr-10 py-3 rounded-lg border bg-white",
                "text-gray-900 placeholder:text-gray-400",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                "transition-colors",
                touched.streetAddress && errors.streetAddress
                  ? "border-red-300 bg-red-50"
                  : "border-gray-300"
              )}
            />
            {isSearching && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 animate-spin" />
            )}
            
            {/* Predictions Dropdown */}
            {showPredictions && (predictions.length > 0 || isSearching) && (
              <div className="absolute z-30 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {isSearching ? (
                  <div className="px-4 py-3 text-sm text-gray-500 flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Searching addresses...
                  </div>
                ) : predictions.length > 0 ? (
                  predictions.map((prediction) => (
                    <button
                      key={prediction.place_id}
                      type="button"
                      onClick={() => handlePredictionSelect(prediction)}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
                    >
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {prediction.structured_formatting.main_text}
                          </p>
                          <p className="text-xs text-gray-500">
                            {prediction.structured_formatting.secondary_text}
                          </p>
                        </div>
                      </div>
                    </button>
                  ))
                ) : null}
              </div>
            )}
          </div>
          {touched.streetAddress && errors.streetAddress ? (
            <p className="text-xs text-red-600 mt-1.5">{errors.streetAddress}</p>
          ) : (
            <p className="text-xs text-gray-500 mt-1.5">
              {content.streetAddress.helper}
            </p>
          )}
        </div>

        {/* Area & City Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Area/Neighborhood */}
          <div>
            <label 
              htmlFor="area" 
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {content.area.label} <span className="text-orange-500">*</span>
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsAreaDropdownOpen(!isAreaDropdownOpen)}
                className={cn(
                  "w-full flex items-center justify-between px-4 py-3 rounded-lg border bg-white",
                  "text-left focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                  "transition-colors",
                  touched.area && errors.area
                    ? "border-red-300 bg-red-50"
                    : "border-gray-300"
                )}
              >
                <span className={selectedAreaName ? "text-gray-900" : "text-gray-400"}>
                  {selectedAreaName || "Select area"}
                </span>
                <ChevronDown className={cn(
                  "w-5 h-5 text-gray-400 transition-transform",
                  isAreaDropdownOpen && "rotate-180"
                )} />
              </button>

              {/* Dropdown */}
              {isAreaDropdownOpen && (
                <div className="absolute z-20 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-hidden">
                  {/* Search */}
                  <div className="p-2 border-b border-gray-100">
                    <input
                      type="text"
                      value={areaSearch}
                      onChange={(e) => setAreaSearch(e.target.value)}
                      placeholder="Search areas..."
                      className="w-full px-3 py-2 text-sm border border-gray-200 rounded-md focus:outline-none focus:ring-1 focus:ring-teal-500"
                      autoFocus
                    />
                  </div>
                  
                  {/* Options */}
                  <div className="max-h-48 overflow-y-auto">
                    {areaSearch ? (
                      // Flat list when searching
                      filteredAreas.length > 0 ? (
                        filteredAreas.map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => handleAreaSelect(a.id)}
                            className={cn(
                              "w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50",
                              area === a.id && "bg-teal-50 text-teal-700"
                            )}
                          >
                            {a.name}
                            <span className="text-xs text-gray-400 ml-2">
                              {a.category}
                            </span>
                          </button>
                        ))
                      ) : (
                        <p className="px-4 py-3 text-sm text-gray-500">
                          No areas found
                        </p>
                      )
                    ) : (
                      // Grouped by category when not searching
                      Object.entries(NAIROBI_AREAS).map(([categoryKey, categoryData]) => (
                        <div key={categoryKey}>
                          <div className="px-4 py-2 bg-gray-50 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            {categoryData.label}
                          </div>
                          {categoryData.areas.map((a) => (
                            <button
                              key={a.id}
                              type="button"
                              onClick={() => handleAreaSelect(a.id)}
                              className={cn(
                                "w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50",
                                area === a.id && "bg-teal-50 text-teal-700"
                              )}
                            >
                              {a.name}
                            </button>
                          ))}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {touched.area && errors.area && (
              <p className="text-xs text-red-600 mt-1.5">{errors.area}</p>
            )}
          </div>

          {/* City */}
          <div>
            <label 
              htmlFor="city" 
              className="block text-sm font-medium text-gray-700 mb-1.5"
            >
              {content.city.label} <span className="text-orange-500">*</span>
            </label>
            <input
              type="text"
              id="city"
              value={city}
              onChange={(e) => handleFieldChange("city", e.target.value)}
              className={cn(
                "w-full px-4 py-3 rounded-lg border border-gray-300 bg-gray-50",
                "text-gray-900",
                "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              )}
              readOnly
            />
            <p className="text-xs text-gray-500 mt-1.5">
              {content.city.helper}
            </p>
          </div>
        </div>

        {/* Unit Number */}
        <div>
          <label 
            htmlFor="unitNumber" 
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {content.unitNumber.label}
            <span className="text-gray-400 font-normal ml-1">{content.unitNumber.optionalText}</span>
          </label>
          <input
            type="text"
            id="unitNumber"
            value={unitNumber}
            onChange={(e) => handleFieldChange("unitNumber", e.target.value)}
            placeholder={content.unitNumber.placeholder}
            className={cn(
              "w-full px-4 py-3 rounded-lg border border-gray-300 bg-white",
              "text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            )}
          />
        </div>

        {/* Landmarks */}
        <div>
          <label 
            htmlFor="landmarks" 
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {content.landmarks.label}
            <span className="text-gray-400 font-normal ml-1">{content.landmarks.optionalText}</span>
          </label>
          <input
            type="text"
            id="landmarks"
            value={state.formData.landmarks || ""}
            onChange={(e) => handleFieldChange("landmarks", e.target.value)}
            placeholder={content.landmarks.placeholder}
            className={cn(
              "w-full px-4 py-3 rounded-lg border border-gray-300 bg-white",
              "text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            )}
          />
          <p className="text-xs text-gray-500 mt-1.5">
            {content.landmarks.helper}
          </p>
        </div>

        {/* Plot Number */}
        <div>
          <label 
            htmlFor="plotNumber" 
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            {content.plotNumber.label}
            <span className="text-gray-400 font-normal ml-1">{content.plotNumber.optionalText}</span>
          </label>
          <input
            type="text"
            id="plotNumber"
            value={state.formData.plotNumber || ""}
            onChange={(e) => handleFieldChange("plotNumber", e.target.value)}
            placeholder={content.plotNumber.placeholder}
            className={cn(
              "w-full px-4 py-3 rounded-lg border border-gray-300 bg-white",
              "text-gray-900 placeholder:text-gray-400",
              "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
            )}
          />
          <p className="text-xs text-gray-500 mt-1.5">
            {content.plotNumber.helper}
          </p>
        </div>

        {/* Privacy Option */}
        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={hideExactAddress}
              onChange={(e) => handleFieldChange("hideExactAddress", e.target.checked)}
              className={cn(
                "mt-0.5 w-5 h-5 rounded border-gray-300",
                "text-teal-600 focus:ring-teal-500 focus:ring-offset-0"
              )}
            />
            <div>
              <span className="block text-sm font-medium text-gray-700">
                {content.privacyOption.label}
              </span>
              <span className="text-xs text-gray-500 mt-0.5 block">
                {content.privacyOption.helper}
              </span>
            </div>
          </label>
        </div>

        {/* Info Box */}
        <div className="flex gap-3 p-4 bg-teal-50 rounded-lg border border-teal-100">
          <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-teal-800">
            <p className="font-medium">{content.infoBox.title}</p>
            <p className="text-teal-700 mt-0.5">
              {content.infoBox.message}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

