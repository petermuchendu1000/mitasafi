/**
 * Step 4: Amenities & Features
 * 
 * Comprehensive amenity selection organized by category,
 * including Kenya-specific features like water supply and security.
 * 
 * OPTIMIZED: Teal accent colors for selections, cleaner copy
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Droplets, 
  Shield, 
  Sofa, 
  UtensilsCrossed, 
  Building2,
  Car,
  ChevronDown,
  Check,
  PawPrint,
  Cigarette,
  Users,
  Wifi,
  Zap,
  Home,
} from "lucide-react";
import { useWizard } from "../context";
import { 
  AMENITY_CATEGORIES, 
  PARKING_OPTIONS, 
  PET_POLICY_OPTIONS,
  SMOKING_POLICY_OPTIONS,
  SECURITY_GUARD_OPTIONS,
  CCTV_OPTIONS,
  ACCESS_CONTROL_OPTIONS,
  WATER_RELIABILITY_OPTIONS,
  BACKUP_POWER_OPTIONS,
  ISP_OPTIONS,
  type ParkingType,
  type PetPolicyType,
  type SmokingPolicyType,
  type SecurityGuardType,
  type CCTVType,
  type AccessControlType,
  type WaterReliabilityType,
  type BackupPowerType,
} from "../types";

// Icon mapping for amenity categories
const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  water: <Droplets className="w-5 h-5" />,
  security: <Shield className="w-5 h-5" />,
  indoor: <Sofa className="w-5 h-5" />,
  kitchen: <UtensilsCrossed className="w-5 h-5" />,
  building: <Building2 className="w-5 h-5" />,
};

export function Step4Amenities() {
  const { state, updateFormData, setValidation } = useWizard();
  const { 
    amenities, 
    parking,
    parkingSpaces,
    // Legacy fields
    petsAllowed, 
    smokingAllowed, 
    partyFriendly,
    // Enhanced fields
    petPolicy,
    smokingPolicy,
    airbnbAllowed,
    securityGuard,
    cctv,
    accessControl,
    waterReliability,
    hasWaterStorage,
    backupPower,
    internetReady,
    availableIsps,
  } = state.formData;

  // Track which categories are expanded (all expanded by default)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(AMENITY_CATEGORIES))
  );

  // No strict validation for amenities - all optional
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
    const currentAmenities = amenities || [];
    const isSelected = currentAmenities.includes(amenityId);
    
    updateFormData({
      amenities: isSelected
        ? currentAmenities.filter((a) => a !== amenityId)
        : [...currentAmenities, amenityId],
    });
  };

  const isAmenitySelected = (amenityId: string) => {
    return (amenities || []).includes(amenityId);
  };

  const toggleIsp = (ispId: string) => {
    const currentIsps = availableIsps || [];
    const isSelected = currentIsps.includes(ispId);
    
    updateFormData({
      availableIsps: isSelected
        ? currentIsps.filter((i) => i !== ispId)
        : [...currentIsps, ispId],
    });
  };

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          What's included?
        </h2>
        <p className="text-gray-500">
          Amenities that come with your unit
        </p>
      </div>

      <div className="space-y-4">
        {/* Amenity Categories */}
        {Object.entries(AMENITY_CATEGORIES).map(([categoryId, category]) => {
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
                    {CATEGORY_ICONS[categoryId]}
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

        {/* Parking Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-500 flex items-center justify-center">
              <Car className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Parking</h3>
              <p className="text-sm text-gray-500">Available parking options</p>
            </div>
          </div>
          
          <div className="p-5 space-y-4">
            {/* Parking Type */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {PARKING_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => updateFormData({ 
                    parking: option.id as ParkingType,
                    parkingSpaces: option.id === "none" ? 0 : parkingSpaces || 1,
                  })}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border-2 text-center transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
                    parking === option.id
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  )}
                >
                  <span className="text-sm font-medium">{option.label}</span>
                </button>
              ))}
            </div>

            {/* Parking Spaces */}
            {parking && parking !== "none" && (
              <div className="flex items-center gap-4 pt-2">
                <span className="text-sm text-gray-600">Number of spaces:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => updateFormData({ 
                      parkingSpaces: Math.max(1, (parkingSpaces || 1) - 1) 
                    })}
                    disabled={(parkingSpaces || 1) <= 1}
                    className={cn(
                      "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                      (parkingSpaces || 1) > 1
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                        : "border-gray-200 text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <span className="text-lg font-medium">−</span>
                  </button>
                  <span className="w-8 text-center font-semibold text-gray-900">
                    {parkingSpaces || 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => updateFormData({ 
                      parkingSpaces: Math.min(10, (parkingSpaces || 1) + 1) 
                    })}
                    disabled={(parkingSpaces || 1) >= 10}
                    className={cn(
                      "w-8 h-8 rounded-lg border flex items-center justify-center transition-colors",
                      (parkingSpaces || 1) < 10
                        ? "border-gray-300 text-gray-600 hover:bg-gray-50"
                        : "border-gray-200 text-gray-300 cursor-not-allowed"
                    )}
                  >
                    <span className="text-lg font-medium">+</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Policies Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">House Policies</h3>
            <p className="text-sm text-gray-500 mt-0.5">
              Let tenants know what&apos;s allowed
            </p>
          </div>
          
          <div className="p-5 space-y-6">
            {/* Pet Policy - Enhanced */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <PawPrint className="w-4 h-4" />
                Pet Policy
              </label>
              <div className="grid grid-cols-2 gap-2">
                {PET_POLICY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({ petPolicy: option.id as PetPolicyType })}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      petPolicy === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Smoking Policy - Enhanced */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Cigarette className="w-4 h-4" />
                Smoking Policy
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SMOKING_POLICY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({ smokingPolicy: option.id as SmokingPolicyType })}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      smokingPolicy === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Additional Policies */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Airbnb/Short-term */}
              <PolicyToggle
                icon={<Home className="w-5 h-5" />}
                label="Airbnb/Short-term"
                description="Subletting allowed"
                value={airbnbAllowed || false}
                onChange={(v) => updateFormData({ airbnbAllowed: v })}
              />

              {/* Party Policy */}
              <PolicyToggle
                icon={<Users className="w-5 h-5" />}
                label="Party Friendly"
                description="Events & gatherings"
                value={partyFriendly}
                onChange={(v) => updateFormData({ partyFriendly: v })}
              />
            </div>
          </div>
        </section>

        {/* Water & Power Section - NEW */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <Droplets className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Water & Power</h3>
              <p className="text-sm text-gray-500">Reliability information for tenants</p>
            </div>
          </div>
          
          <div className="p-5 space-y-5">
            {/* Water Reliability */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Water Supply Reliability
              </label>
              <div className="grid grid-cols-3 gap-2">
                {WATER_RELIABILITY_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({ waterReliability: option.id as WaterReliabilityType })}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      waterReliability === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    <span className="text-xs text-gray-500">{option.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Water Storage */}
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasWaterStorage || false}
                onChange={(e) => updateFormData({ hasWaterStorage: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700">
                  Water Tank/Storage Available
                </span>
                <span className="text-xs text-gray-500">
                  Building has water storage for backup
                </span>
              </div>
            </label>

            {/* Backup Power */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-3">
                <Zap className="w-4 h-4" />
                Backup Power
              </label>
              <div className="grid grid-cols-3 gap-2">
                {BACKUP_POWER_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({ backupPower: option.id as BackupPowerType })}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      backupPower === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500">{option.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Security Section - NEW */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-teal-100 text-teal-600 flex items-center justify-center">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Security Features</h3>
              <p className="text-sm text-gray-500">Building/compound security details</p>
            </div>
          </div>
          
          <div className="p-5 space-y-5">
            {/* Security Guard */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Security Guards
              </label>
              <div className="grid grid-cols-3 gap-2">
                {SECURITY_GUARD_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({ securityGuard: option.id as SecurityGuardType })}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      securityGuard === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500">{option.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* CCTV */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                CCTV Cameras
              </label>
              <div className="grid grid-cols-3 gap-2">
                {CCTV_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({ cctv: option.id as CCTVType })}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      cctv === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500">{option.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Access Control */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-3">
                Access Control
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {ACCESS_CONTROL_OPTIONS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => updateFormData({ accessControl: option.id as AccessControlType })}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      accessControl === option.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block text-sm font-medium">{option.label}</span>
                    {option.description && (
                      <span className="text-xs text-gray-500">{option.description}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Internet/ISP Section - NEW */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100">
            <div className="w-10 h-10 rounded-lg bg-purple-100 text-purple-600 flex items-center justify-center">
              <Wifi className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900">Internet Connectivity</h3>
              <p className="text-sm text-gray-500">Available internet service providers</p>
            </div>
          </div>
          
          <div className="p-5 space-y-4">
            {/* Internet Ready Toggle */}
            <label className="flex items-center gap-3 cursor-pointer p-3 rounded-lg border border-gray-200 hover:bg-gray-50">
              <input
                type="checkbox"
                checked={internetReady || false}
                onChange={(e) => updateFormData({ internetReady: e.target.checked })}
                className="w-5 h-5 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700">
                  Fibre/Internet Ready
                </span>
                <span className="text-xs text-gray-500">
                  Building has fibre cables installed
                </span>
              </div>
            </label>

            {/* ISP Options */}
            {internetReady && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Available ISPs (select all that apply)
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {ISP_OPTIONS.map((isp) => {
                    const isSelected = (availableIsps || []).includes(isp.id);
                    return (
                      <button
                        key={isp.id}
                        type="button"
                        onClick={() => toggleIsp(isp.id)}
                        className={cn(
                          "px-3 py-2.5 rounded-lg border flex items-center gap-2 transition-all",
                          "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                          isSelected
                            ? "border-teal-600 bg-teal-50 text-teal-700"
                            : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                        )}
                      >
                        <div className={cn(
                          "w-4 h-4 rounded flex-shrink-0 flex items-center justify-center",
                          isSelected 
                            ? "bg-teal-600 text-white"
                            : "border-2 border-gray-300"
                        )}>
                          {isSelected && <Check className="w-3 h-3" />}
                        </div>
                        <span className="text-sm font-medium">{isp.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

// Policy toggle component
interface PolicyToggleProps {
  icon: React.ReactNode;
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
}

function PolicyToggle({ icon, label, description, value, onChange }: PolicyToggleProps) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      className={cn(
        "px-4 py-3 rounded-lg border-2 text-left transition-all",
        "flex items-start gap-3",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500 focus-visible:ring-offset-1",
        value
          ? "border-teal-600 bg-teal-50"
          : "border-gray-200 bg-white hover:border-gray-300"
      )}
    >
      <div className={cn(
        "w-8 h-8 rounded-lg flex-shrink-0 flex items-center justify-center",
        value ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-500"
      )}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <span className={cn(
          "block font-medium text-sm",
          value ? "text-teal-700" : "text-gray-900"
        )}>
          {label}
        </span>
        <span className="text-xs text-gray-500">{description}</span>
      </div>
    </button>
  );
}
