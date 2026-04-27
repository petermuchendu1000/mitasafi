/**
 * Step 1: Property Type Selection
 * 
 * First step in the property wizard where landlord selects:
 * 1. Listing category (Residential or Commercial)
 * 2. Property type or commercial category
 * 3. Sub-type (for commercial)
 * 
 * Design: Teal 60%, Orange 40% accents. Clean and professional.
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Building2, 
  Home, 
  Warehouse, 
  Castle, 
  BedDouble, 
  Square,
  Check,
  Crown,
  Store,
  Utensils,
  Car,
  Map,
  Hotel,
  HeartPulse,
  GraduationCap,
  Cog,
  ChevronRight,
} from "lucide-react";
import { useWizard } from "../context";
import { 
  PROPERTY_TYPES, 
  LISTING_CATEGORIES,
  COMMERCIAL_CATEGORIES,
  COMMERCIAL_SUBTYPES,
  type PropertyType,
  type ListingCategory,
  type CommercialType,
  type CommercialSubtype,
} from "../types";

// Map residential property type IDs to icons
const residentialIconMap: Record<string, React.ElementType> = {
  bedsitter: BedDouble,
  studio: Square,
  apartment: Building2,
  house: Home,
  townhouse: Warehouse,
  maisonette: Castle,
  villa: Crown,
};

// Map commercial category IDs to icons
const commercialIconMap: Record<string, React.ElementType> = {
  office: Building2,
  retail: Store,
  food_beverage: Utensils,
  warehouse: Warehouse,
  automotive: Car,
  commercial_land: Map,
  hospitality: Hotel,
  healthcare: HeartPulse,
  educational: GraduationCap,
  specialized: Cog,
};

export function Step1PropertyType() {
  const { state, updateFormData, setValidation } = useWizard();
  const { 
    listingCategory, 
    propertyType, 
    commercialType,
    commercialSubtype,
  } = state.formData;

  // Track if subtype selection is shown
  const [showSubtypes, setShowSubtypes] = useState(false);

  // Update validation when selection changes
  useEffect(() => {
    let isValid = false;
    const errors: Record<string, string> = {};

    if (listingCategory === "residential") {
      isValid = propertyType !== null;
      if (!isValid) errors.propertyType = "Please select a property type";
    } else if (listingCategory === "commercial") {
      isValid = commercialType !== null && commercialSubtype !== null;
      if (!commercialType) errors.commercialType = "Please select a category";
      if (!commercialSubtype) errors.commercialSubtype = "Please select a sub-type";
    }

    setValidation(1, {
      isValid,
      errors,
      touched: { listingCategory: true },
    });
  }, [listingCategory, propertyType, commercialType, commercialSubtype, setValidation]);

  // Handle category toggle
  const handleCategoryChange = (category: ListingCategory) => {
    updateFormData({ 
      listingCategory: category,
      // Reset selections when switching
      propertyType: null,
      commercialType: null,
      commercialSubtype: null,
    });
    setShowSubtypes(false);
  };

  // Handle residential property type selection
  const handleResidentialSelect = (type: PropertyType) => {
    const defaultBedrooms: Record<PropertyType, number> = {
      bedsitter: 0,
      studio: 0,
      apartment: 1,
      house: 3,
      townhouse: 3,
      maisonette: 3,
      villa: 4,
    };
    
    updateFormData({ 
      propertyType: type,
      bedrooms: defaultBedrooms[type],
    });
  };

  // Handle commercial category selection
  const handleCommercialCategorySelect = (type: CommercialType) => {
    updateFormData({ 
      commercialType: type,
      commercialSubtype: null,
    });
    setShowSubtypes(true);
  };

  // Handle commercial subtype selection
  const handleCommercialSubtypeSelect = (subtype: CommercialSubtype) => {
    updateFormData({ commercialSubtype: subtype });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What are you listing?
        </h2>
        <p className="text-gray-500">
          Choose the category and type of property
        </p>
      </div>

      {/* Category Toggle */}
      <div className="flex justify-center mb-8">
        <div className="inline-flex p-1 bg-gray-100 rounded-lg">
          {LISTING_CATEGORIES.map((category) => {
            const isSelected = listingCategory === category.id;
            return (
              <button
                key={category.id}
                onClick={() => handleCategoryChange(category.id as ListingCategory)}
                className={cn(
                  "px-6 py-2.5 rounded-md text-sm font-medium transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                  isSelected
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-600 hover:text-gray-900"
                )}
              >
                {category.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Residential Selection */}
      {listingCategory === "residential" && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {PROPERTY_TYPES.map((type) => {
            const Icon = residentialIconMap[type.id] || Building2;
            const isSelected = propertyType === type.id;

            return (
              <button
                key={type.id}
                onClick={() => handleResidentialSelect(type.id)}
                className={cn(
                  "relative flex flex-col items-center gap-3 p-5 rounded-xl",
                  "border-2 transition-all duration-200",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                  isSelected
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 bg-white hover:border-gray-300"
                )}
              >
                {isSelected && (
                  <div className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-teal-600 flex items-center justify-center">
                    <Check className="w-3 h-3 text-white" strokeWidth={3} />
                  </div>
                )}
                <div
                  className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center",
                    isSelected ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500"
                  )}
                >
                  <Icon className="w-6 h-6" strokeWidth={1.5} />
                </div>
                <div className="text-center">
                  <span className={cn(
                    "block font-semibold text-sm",
                    isSelected ? "text-teal-700" : "text-gray-900"
                  )}>
                    {type.label}
                  </span>
                  <span className="text-xs text-gray-500 mt-0.5 block">
                    {type.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Commercial Selection */}
      {listingCategory === "commercial" && (
        <div className="space-y-6">
          {/* Commercial Categories */}
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-3">
              Select category
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
              {COMMERCIAL_CATEGORIES.map((category) => {
                const Icon = commercialIconMap[category.id] || Building2;
                const isSelected = commercialType === category.id;

                return (
                  <button
                    key={category.id}
                    onClick={() => handleCommercialCategorySelect(category.id)}
                    className={cn(
                      "relative flex flex-col items-center gap-2 p-4 rounded-xl",
                      "border-2 transition-all duration-200",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-2",
                      isSelected
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    {isSelected && (
                      <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                      </div>
                    )}
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center",
                        isSelected ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500"
                      )}
                    >
                      <Icon className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <span className={cn(
                      "text-xs font-medium text-center",
                      isSelected ? "text-teal-700" : "text-gray-700"
                    )}>
                      {category.label}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Commercial Sub-types */}
          {commercialType && (
            <div className="pt-4 border-t border-gray-200">
              <h3 className="text-sm font-medium text-gray-700 mb-3 flex items-center gap-2">
                <ChevronRight className="w-4 h-4 text-orange-500" />
                Select type
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                {COMMERCIAL_SUBTYPES[commercialType]?.map((subtype) => {
                  const isSelected = commercialSubtype === subtype.id;

                  return (
                    <button
                      key={subtype.id}
                      onClick={() => handleCommercialSubtypeSelect(subtype.id as CommercialSubtype)}
                      className={cn(
                        "relative flex flex-col items-start p-4 rounded-lg",
                        "border-2 transition-all duration-200 text-left",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 focus-visible:ring-offset-2",
                        isSelected
                          ? "border-orange-500 bg-orange-50"
                          : "border-gray-200 bg-white hover:border-gray-300"
                      )}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 w-4 h-4 rounded-full bg-orange-500 flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />
                        </div>
                      )}
                      <span className={cn(
                        "font-medium text-sm",
                        isSelected ? "text-orange-700" : "text-gray-900"
                      )}>
                        {subtype.label}
                      </span>
                      <span className="text-xs text-gray-500 mt-0.5">
                        {subtype.description}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Selection Summary */}
      {((listingCategory === "residential" && propertyType) || 
        (listingCategory === "commercial" && commercialType && commercialSubtype)) && (
        <div className="mt-8 p-4 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-teal-100 flex items-center justify-center">
              <Check className="w-5 h-5 text-teal-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">
                {listingCategory === "residential" 
                  ? PROPERTY_TYPES.find(t => t.id === propertyType)?.label
                  : `${COMMERCIAL_CATEGORIES.find(c => c.id === commercialType)?.label} - ${COMMERCIAL_SUBTYPES[commercialType!]?.find(s => s.id === commercialSubtype)?.label}`
                }
              </p>
              <p className="text-xs text-gray-500">
                {listingCategory === "residential" ? "Residential Property" : "Commercial Property"}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
