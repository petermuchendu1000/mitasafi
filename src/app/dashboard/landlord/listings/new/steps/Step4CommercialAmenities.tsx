/**
 * Step 4: Commercial Amenities & Features
 * 
 * Commercial-specific amenity selection organized by category.
 * Dynamically filters amenity categories based on commercial type/subtype.
 * 
 * Design: Clean, professional. Teal primary, orange accents.
 */

"use client";

import { useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { 
  Shield, 
  Car,
  ChevronDown,
  Check,
  Zap,
  Building2,
  Wifi,
  Coffee,
  Info,
} from "lucide-react";
import { useWizard } from "../context";
import { COMMERCIAL_AMENITY_CATEGORIES } from "../commercial-types";
import { getAmenityCategories, shouldSkipAmenities } from "../commercial-flow-config";

// Icon mapping for commercial amenity categories
const COMMERCIAL_CATEGORY_ICONS: Record<string, React.ReactNode> = {
  building: <Building2 className="w-5 h-5" />,
  building_services: <Building2 className="w-5 h-5" />,
  connectivity: <Wifi className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
  parking: <Car className="w-5 h-5" />,
  facilities: <Coffee className="w-5 h-5" />,
  utilities: <Zap className="w-5 h-5" />,
};

export function Step4CommercialAmenities() {
  const { state, updateFormData, setValidation } = useWizard();
  const { commercial, commercialType, commercialSubtype } = state.formData;
  const { commercialAmenities } = commercial;

  // Get relevant amenity categories based on commercial type/subtype
  const relevantCategories = useMemo(() => {
    return getAmenityCategories(commercialType, commercialSubtype);
  }, [commercialType, commercialSubtype]);

  // Check if we should show minimal UI
  const showMinimalAmenities = relevantCategories.length === 0;
  const skipAmenities = shouldSkipAmenities(commercialType, commercialSubtype);

  // Track which categories are expanded - only relevant ones
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(relevantCategories)
  );

  // Amenities are optional - always valid
  useEffect(() => {
    setValidation(4, {
      isValid: true,
      errors: {},
      touched: {},
    });
  }, [setValidation]);

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const toggleAmenity = (amenityId: string) => {
    const currentAmenities = commercialAmenities || [];
    const isSelected = currentAmenities.includes(amenityId);
    
    updateFormData({
      commercial: {
        ...commercial,
        commercialAmenities: isSelected
          ? currentAmenities.filter((a) => a !== amenityId)
          : [...currentAmenities, amenityId],
      },
    });
  };

  const isAmenitySelected = (amenityId: string) => {
    return (commercialAmenities || []).includes(amenityId);
  };

  // Filter categories to only show relevant ones
  const filteredCategories = useMemo(() => {
    return Object.entries(COMMERCIAL_AMENITY_CATEGORIES).filter(
      ([categoryId]) => relevantCategories.includes(categoryId)
    );
  }, [relevantCategories]);

  // If this property type doesn't need amenities, show simplified view
  if (showMinimalAmenities || skipAmenities) {
    return (
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Space Features
          </h2>
          <p className="text-gray-500">
            Basic features for this space type
          </p>
        </div>

        <div className="space-y-4">
          {/* Info Banner */}
          <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 flex gap-3">
            <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-teal-800 font-medium">
                Specialized space type detected
              </p>
              <p className="text-sm text-teal-700 mt-0.5">
                This property type has specific features defined in the details step. 
                Standard building amenities may not apply.
              </p>
            </div>
          </div>

          {/* Operating Hours - still relevant */}
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-900">Operating Hours</h3>
              <p className="text-sm text-gray-500 mt-0.5">
                Access schedule
              </p>
            </div>
            
            <div className="p-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: "24_7", label: "24/7 Access" },
                  { id: "business_hours", label: "Business Hours" },
                  { id: "extended", label: "Extended Hours" },
                  { id: "custom", label: "Custom" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({
                      commercial: {
                        ...commercial,
                        operatingHours: option.id as "24_7" | "business_hours" | "extended" | "custom",
                      },
                    })}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border-2 text-center transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      commercial.operatingHours === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Building Amenities
        </h2>
        <p className="text-gray-500">
          What's included with this commercial space?
        </p>
      </div>

      <div className="space-y-4">
        {/* Amenity Categories - filtered */}
        {filteredCategories.map(([categoryId, category]) => {
          const isExpanded = expandedCategories.has(categoryId);
          const selectedCount = category.amenities.filter(
            (a) => isAmenitySelected(a.id)
          ).length;

          return (
            <section 
              key={categoryId}
              className="bg-white rounded-xl border border-gray-200 overflow-hidden"
            >
              {/* Category Header */}
              <button
                type="button"
                onClick={() => toggleCategory(categoryId)}
                className={cn(
                  "w-full px-5 py-4 flex items-center justify-between",
                  "hover:bg-gray-50 transition-colors",
                  "focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal-500"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    selectedCount > 0 
                      ? "bg-teal-100 text-teal-600" 
                      : "bg-gray-100 text-gray-500"
                  )}>
                    {COMMERCIAL_CATEGORY_ICONS[categoryId] || <Building2 className="w-5 h-5" />}
                  </div>
                  <div className="text-left">
                    <h3 className="font-semibold text-gray-900">
                      {category.title}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {selectedCount > 0 
                        ? `${selectedCount} selected`
                        : "None selected"
                      }
                    </p>
                  </div>
                </div>
                <ChevronDown 
                  className={cn(
                    "w-5 h-5 text-gray-400 transition-transform",
                    isExpanded && "rotate-180"
                  )} 
                />
              </button>

              {/* Amenities Grid */}
              {isExpanded && (
                <div className="px-5 pb-5 pt-1">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {category.amenities.map((amenity) => {
                      const selected = isAmenitySelected(amenity.id);
                      return (
                        <button
                          key={amenity.id}
                          type="button"
                          onClick={() => toggleAmenity(amenity.id)}
                          className={cn(
                            "px-3 py-2.5 rounded-lg border text-left transition-all",
                            "flex items-center gap-2",
                            "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
                            selected
                              ? "border-teal-600 bg-teal-50 text-teal-700"
                              : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                          )}
                        >
                          <div className={cn(
                            "w-5 h-5 rounded flex-shrink-0 flex items-center justify-center",
                            selected 
                              ? "bg-teal-600 text-white"
                              : "border-2 border-gray-300"
                          )}>
                            {selected && <Check className="w-3.5 h-3.5" />}
                          </div>
                          <span className="text-sm font-medium truncate">
                            {amenity.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </section>
          );
        })}

        {/* Operating Hours */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Operating Hours</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Building access schedule
            </p>
          </div>
          
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { id: "24_7", label: "24/7 Access" },
                { id: "business_hours", label: "Business Hours" },
                { id: "extended", label: "Extended Hours" },
                { id: "custom", label: "Custom Schedule" },
              ].map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateFormData({
                    commercial: {
                      ...commercial,
                      operatingHours: option.id as "24_7" | "business_hours" | "extended" | "custom",
                    },
                  })}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border-2 text-center transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                    commercial.operatingHours === option.id
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  )}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Lease Terms */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Lease Preferences</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Terms and flexibility
            </p>
          </div>
          
          <div className="p-5 space-y-4">
            {/* Minimum Lease Term */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">
                Minimum Lease Term
              </label>
              <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
                {[
                  { id: "monthly", label: "Monthly" },
                  { id: "6_months", label: "6 Months" },
                  { id: "1_year", label: "1 Year" },
                  { id: "2_years", label: "2 Years" },
                  { id: "negotiable", label: "Negotiable" },
                ].map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({
                      commercial: {
                        ...commercial,
                        minimumLease: option.id,
                      },
                    })}
                    className={cn(
                      "px-3 py-2 rounded-lg border-2 text-center transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      commercial.minimumLease === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="text-xs font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "fitoutAllowed", label: "Fit-out Negotiable", desc: "Tenant can customize" },
                { key: "subleaseAllowed", label: "Sublease Allowed", desc: "Can sublet space" },
              ].map((option) => (
                <label
                  key={option.key}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all",
                    commercial[option.key as keyof typeof commercial]
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <input
                    type="checkbox"
                    checked={commercial[option.key as keyof typeof commercial] as boolean}
                    onChange={(e) => updateFormData({
                      commercial: {
                        ...commercial,
                        [option.key]: e.target.checked,
                      },
                    })}
                    className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <div>
                    <span className="text-sm font-medium text-gray-700 block">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.desc}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
