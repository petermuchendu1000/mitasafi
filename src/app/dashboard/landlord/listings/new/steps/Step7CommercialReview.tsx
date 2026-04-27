/**
 * Step 7: Commercial Review & Publish
 * 
 * Final review for commercial listings with:
 * - Title and description
 * - Commercial details summary
 * - Pricing summary
 * - Preview and publish
 * 
 * Uses dynamic content from content-config.ts.
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  MapPin, 
  Maximize,
  Check,
  Edit3,
  AlertCircle,
  Calendar,
  Building2,
  DollarSign,
} from "lucide-react";
import { useWizard } from "../context";
import { NAIROBI_AREAS } from "../types";
import { useStep7Content } from "../useWizardContent";
import { 
  COMMERCIAL_CATEGORIES, 
  COMMERCIAL_SUBTYPES,
  COMMERCIAL_AMENITY_CATEGORIES,
  type CommercialType,
} from "../commercial-types";

// Format number with commas
const formatAmount = (value: number | null | undefined): string => {
  if (value === null || value === undefined) return "0";
  return value.toLocaleString("en-KE");
};

export function Step7CommercialReview() {
  const { state, updateFormData, setValidation, goToStep } = useWizard();
  const content = useStep7Content();
  const { 
    title,
    description,
    commercialType,
    commercialSubtype,
    address,
    area,
    photos,
    currency,
    availableFrom,
    commercial,
  } = state.formData;

  const {
    sizeSqm,
    fitoutLevel,
    floorLevel,
    rentPerSqm,
    pricingModel,
    serviceChargeMonthly,
    depositMonthsCommercial,
    minLeaseMonths,
    rentEscalationPercent,
    commercialAmenities,
    operatingHours,
  } = commercial;

  // Validation
  useEffect(() => {
    const errors: Record<string, string> = {};
    
    if (!title || title.trim().length < 10) {
      errors.title = "Title must be at least 10 characters";
    } else if (title.trim().length > 80) {
      errors.title = "Title must be 80 characters or less";
    }

    if (!description || description.trim().length < 50) {
      errors.description = "Description must be at least 50 characters";
    }

    setValidation(7, {
      isValid: Object.keys(errors).length === 0,
      errors,
      touched: {},
    });
  }, [title, description, setValidation]);

  // Get commercial type label
  const commercialTypeLabel = COMMERCIAL_CATEGORIES.find((c) => c.id === commercialType)?.label || commercialType || "Not selected";

  // Get subtype label
  const getSubtypeLabel = () => {
    if (!commercialType || !commercialSubtype) return "";
    const subtypes = COMMERCIAL_SUBTYPES[commercialType as CommercialType];
    if (!subtypes) return commercialSubtype;
    const found = subtypes.find((s) => s.id === commercialSubtype);
    return found?.label || commercialSubtype;
  };

  // Get area label
  const areaLabel = (() => {
    for (const categoryData of Object.values(NAIROBI_AREAS)) {
      const found = categoryData.areas.find((a: { id: string; name: string }) => a.id === area);
      if (found) return found.name;
    }
    return area || "";
  })();

  // Get cover photo
  const coverPhoto = (photos || []).find((p) => p.category === "cover") 
    || (photos || []).find((p) => p.isCover) 
    || photos?.[0];

  // Get selected amenities labels
  const selectedAmenities = (commercialAmenities || []).map((amenityId) => {
    for (const category of Object.values(COMMERCIAL_AMENITY_CATEGORIES)) {
      const found = category.amenities.find((a) => a.id === amenityId);
      if (found) return found.label;
    }
    return amenityId;
  });

  // Currency symbol
  const currencySymbol = currency === "USD" ? "$" : "KSh";

  // Calculate monthly rent
  const monthlyRent = pricingModel === "per_sqm" && rentPerSqm && sizeSqm 
    ? rentPerSqm * sizeSqm 
    : rentPerSqm || 0;

  // Format date
  const formatDate = (dateString: string | null) => {
    if (!dateString) return "Not set";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-KE", { 
      day: "numeric", 
      month: "long", 
      year: "numeric" 
    });
  };

  // Generate auto title
  const generateTitle = () => {
    const sizeLabel = sizeSqm ? `${sizeSqm} sqm` : "";
    const subtypeLabel = getSubtypeLabel();
    const typeLabel = subtypeLabel || commercialTypeLabel;
    
    let generatedTitle = `${sizeLabel} ${typeLabel}`.trim();
    
    if (areaLabel && (generatedTitle.length + areaLabel.length + 4) <= 80) {
      generatedTitle += ` in ${areaLabel}`;
    }

    if (fitoutLevel && (generatedTitle.length + 15) <= 80) {
      const fitoutLabels: Record<string, string> = {
        shell: "Shell & Core",
        warm_shell: "Warm Shell",
        fitted: "Fitted",
        fully_fitted: "Fully Fitted",
      };
      generatedTitle += ` - ${fitoutLabels[fitoutLevel] || fitoutLevel}`;
    }
    
    return generatedTitle.slice(0, 80);
  };

  // Generate auto description
  const generateDescription = () => {
    const parts: string[] = [];
    const subtypeLabel = getSubtypeLabel();
    const typeLabel = subtypeLabel || commercialTypeLabel;
    
    // Opening sentence with size and type
    if (sizeSqm) {
      parts.push(`This ${sizeSqm} sqm ${typeLabel.toLowerCase()} is available for rent${areaLabel ? ` in ${areaLabel}` : ""}.`);
    } else {
      parts.push(`This ${typeLabel.toLowerCase()} is available for rent${areaLabel ? ` in ${areaLabel}` : ""}.`);
    }

    // Fitout and floor level
    const fitoutLabels: Record<string, string> = {
      shell: "shell and core condition",
      warm_shell: "warm shell condition",
      semi_fitted: "semi-fitted condition",
      fully_fitted: "fully fitted and ready for occupancy",
    };
    if (fitoutLevel && fitoutLabels[fitoutLevel]) {
      parts.push(`The space is ${fitoutLabels[fitoutLevel]}${floorLevel ? ` and located on ${floorLevel}` : ""}.`);
    } else if (floorLevel) {
      parts.push(`Located on ${floorLevel}.`);
    }

    // Commercial-specific details based on type
    const details: string[] = [];
    
    if (commercialType === "office") {
      if (commercial.workstationCapacity) details.push(`capacity for ${commercial.workstationCapacity} workstations`);
      if (commercial.privateOffices > 0) details.push(`${commercial.privateOffices} private office${commercial.privateOffices > 1 ? 's' : ''}`);
      if (commercial.meetingRooms > 0) details.push(`${commercial.meetingRooms} meeting room${commercial.meetingRooms > 1 ? 's' : ''}`);
      if (commercial.hasReception) details.push("dedicated reception area");
      if (commercial.hasFiberReady) details.push("fiber-ready connectivity");
    } else if (commercialType === "retail") {
      if (commercial.frontageWidthM) details.push(`${commercial.frontageWidthM}m street frontage`);
      if (commercial.hasDisplayWindows) details.push("display windows");
      if (commercial.footTraffic === "high" || commercial.footTraffic === "very_high") details.push("high foot traffic location");
    } else if (commercialType === "food_beverage") {
      if (commercial.seatingCapacity) details.push(`seating for ${commercial.seatingCapacity} guests`);
      if (commercial.kitchenAreaSqm) details.push(`${commercial.kitchenAreaSqm} sqm kitchen`);
      if (commercial.exhaustSystem) details.push("commercial exhaust system");
      if (commercial.outdoorSeating) details.push("outdoor seating available");
    } else if (commercialType === "warehouse") {
      if (commercial.warehouseAreaSqm) details.push(`${commercial.warehouseAreaSqm} sqm warehouse space`);
      if (commercial.clearHeightM) details.push(`${commercial.clearHeightM}m clear height`);
      if (commercial.loadingDocks > 0) details.push(`${commercial.loadingDocks} loading dock${commercial.loadingDocks > 1 ? 's' : ''}`);
      if (commercial.coldStorage) details.push("cold storage facilities");
    } else if (commercialType === "automotive") {
      if (commercial.workBays > 0) details.push(`${commercial.workBays} work bay${commercial.workBays > 1 ? 's' : ''}`);
      if (commercial.vehicleLiftCount > 0) details.push(`${commercial.vehicleLiftCount} vehicle lift${commercial.vehicleLiftCount > 1 ? 's' : ''}`);
      if (commercial.carWashType) details.push(`${commercial.carWashType.replace('_', ' ')} car wash`);
      if (commercial.inspectionPit) details.push("inspection pit");
      if (commercial.parkingSpacesCount && commercial.parkingSpacesCount > 0) details.push(`parking for ${commercial.parkingSpacesCount} vehicles`);
      if (commercial.evChargingStations > 0) details.push(`${commercial.evChargingStations} EV charging station${commercial.evChargingStations > 1 ? 's' : ''}`);
    } else if (commercialType === "commercial_land") {
      if (commercial.plotSizeSqm) details.push(`${commercial.plotSizeSqm} sqm plot`);
      if (commercial.zoningType) details.push(`${commercial.zoningType.replace('_', ' ')} zoning`);
      if (commercial.roadFrontageM) details.push(`${commercial.roadFrontageM}m road frontage`);
      if (commercial.hasUtilities) details.push("utilities available");
      if (commercial.isTitled) details.push("titled property");
      if (commercial.isFenced) details.push("fully fenced");
    } else if (commercialType === "hospitality") {
      if (commercial.roomCount) details.push(`${commercial.roomCount} rooms`);
      if (commercial.eventCapacitySeated) details.push(`capacity for ${commercial.eventCapacitySeated} guests`);
      if (commercial.hasConferenceRooms) details.push("conference facilities");
    } else if (commercialType === "healthcare") {
      if (commercial.consultationRooms > 0) details.push(`${commercial.consultationRooms} consultation rooms`);
      if (commercial.treatmentRooms > 0) details.push(`${commercial.treatmentRooms} treatment rooms`);
      if (commercial.wheelchairAccessible) details.push("wheelchair accessible");
    } else if (commercialType === "educational") {
      if (commercial.classroomCount > 0) details.push(`${commercial.classroomCount} classrooms`);
      if (commercial.totalStudentCapacity) details.push(`capacity for ${commercial.totalStudentCapacity} students`);
      if (commercial.hasComputerLab) details.push("computer lab");
    } else if (commercialType === "specialized") {
      // Specialized subtypes
      if (commercialSubtype === "data_center") {
        if (commercial.rackCapacity) details.push(`${commercial.rackCapacity} rack capacity`);
        if (commercial.powerCapacityKva) details.push(`${commercial.powerCapacityKva} kVA power`);
        if (commercial.uptimeTier) details.push(`Tier ${commercial.uptimeTier.replace('tier_', '')} uptime`);
      } else if (commercialSubtype === "gym_fitness") {
        if (commercial.gymFloorSqm) details.push(`${commercial.gymFloorSqm} sqm main floor`);
        if (commercial.lockerRooms > 0) details.push(`${commercial.lockerRooms} locker rooms`);
        if (commercial.swimmingPool) details.push("swimming pool");
      } else if (commercialSubtype === "salon_spa") {
        if (commercial.stylingStations > 0) details.push(`${commercial.stylingStations} styling stations`);
        if (commercial.treatmentRoomsSpa > 0) details.push(`${commercial.treatmentRoomsSpa} treatment rooms`);
      } else if (commercialSubtype === "bank_branch") {
        if (commercial.tellerCounterPositions > 0) details.push(`${commercial.tellerCounterPositions} teller positions`);
        if (commercial.vaultRoom) details.push("vault room");
        if (commercial.atmLocations > 0) details.push(`${commercial.atmLocations} ATM locations`);
      }
    }

    if (details.length > 0) {
      parts.push(`Features include ${details.slice(0, -1).join(', ')}${details.length > 1 ? ` and ${details[details.length - 1]}` : details[0]}.`);
    }

    // Amenities
    if (selectedAmenities.length > 0) {
      const amenityList = selectedAmenities.slice(0, 5);
      parts.push(`Building amenities include ${amenityList.join(', ')}.`);
    }

    // Pricing info
    if (monthlyRent > 0) {
      parts.push(`Monthly rent is ${currencySymbol} ${formatAmount(monthlyRent)}${serviceChargeMonthly ? ` plus ${currencySymbol} ${formatAmount(serviceChargeMonthly)} service charge` : ""}.`);
    }

    // Lease terms
    if (minLeaseMonths && minLeaseMonths > 0) {
      parts.push(`Minimum lease period is ${minLeaseMonths} months.`);
    }

    // Availability
    if (availableFrom) {
      parts.push(`Available from ${formatDate(availableFrom)}.`);
    }

    // Closing
    parts.push("Contact us to schedule a viewing.");

    return parts.join(' ');
  };

  // Auto-generate title if empty
  useEffect(() => {
    if (!title && commercialType && sizeSqm) {
      updateFormData({ title: generateTitle() });
    }
  }, []);

  return (
    <div className="max-w-3xl mx-auto">
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
        {/* Title & Description */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{content.title.sectionLabel}</h3>
          </div>
          
          <div className="p-5 space-y-5">
            {/* Title */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">
                  {content.title.label} <span className="text-orange-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => updateFormData({ title: generateTitle() })}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  Auto-generate
                </button>
              </div>
              <input
                type="text"
                value={title}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder={content.title.placeholder}
                maxLength={80}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  {content.title.helper}
                </span>
                <span className={cn(
                  "text-xs",
                  (title?.length || 0) > 70 ? "text-orange-500" : "text-gray-400"
                )}>
                  {title?.length || 0}/80
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm font-medium text-gray-700">
                  {content.description.label} <span className="text-orange-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => updateFormData({ description: generateDescription() })}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  Auto-generate
                </button>
              </div>
              <textarea
                value={description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                rows={5}
                placeholder={content.description.placeholder}
                className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-500 resize-none"
              />
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">
                  Minimum 50 characters
                </span>
                <span className={cn(
                  "text-xs",
                  (description?.length || 0) < 50 ? "text-orange-500" : "text-gray-400"
                )}>
                  {description?.length || 0} characters
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Preview Card */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-gray-900">Preview</h3>
          </div>
          
          <div className="p-5">
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              {/* Property Image */}
              <div className="aspect-[16/9] relative bg-gray-200">
                {coverPhoto?.url ? (
                  <img
                    src={coverPhoto.url}
                    alt="Property preview"
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Building2 className="w-16 h-16 text-gray-300" />
                  </div>
                )}
                {/* Type Badge */}
                <div className="absolute top-3 left-3">
                  <span className="px-3 py-1 bg-teal-600 text-white text-sm font-medium rounded-full">
                    {commercialTypeLabel}
                  </span>
                </div>
              </div>

              {/* Property Info */}
              <div className="p-4">
                <h4 className="font-semibold text-gray-900 text-lg mb-2 line-clamp-2">
                  {title || "Your listing title will appear here"}
                </h4>
                
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-3">
                  <MapPin className="w-4 h-4" />
                  <span>{address || areaLabel || "Location not set"}</span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600 mb-4">
                  <div className="flex items-center gap-1">
                    <Maximize className="w-4 h-4" />
                    <span>{sizeSqm ? `${sizeSqm} sqm` : "Size not set"}</span>
                  </div>
                  {fitoutLevel && (
                    <span className="text-gray-400">|</span>
                  )}
                  {fitoutLevel && (
                    <span className="capitalize">{fitoutLevel.replace("_", " ")}</span>
                  )}
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-gray-200">
                  <div>
                    <span className="text-2xl font-bold text-gray-900">
                      {currencySymbol} {formatAmount(monthlyRent)}
                    </span>
                    <span className="text-gray-500 text-sm">/month</span>
                    {serviceChargeMonthly && serviceChargeMonthly > 0 && (
                      <span className="text-xs text-gray-500 block">
                        + {currencySymbol} {formatAmount(serviceChargeMonthly)} service charge
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Summary Sections */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Listing Summary</h3>
          </div>
          
          <div className="divide-y divide-gray-100">
            {/* Space Details */}
            <SummaryRow
              label="Space Type"
              value={`${getSubtypeLabel() || commercialTypeLabel}`}
              stepIndex={1}
              onEdit={() => goToStep(1)}
            />
            <SummaryRow
              label="Location"
              value={`${address ? address + ", " : ""}${areaLabel}`}
              stepIndex={2}
              onEdit={() => goToStep(2)}
            />
            <SummaryRow
              label="Size"
              value={sizeSqm ? `${sizeSqm} sqm` : "Not specified"}
              stepIndex={3}
              onEdit={() => goToStep(3)}
            />
            <SummaryRow
              label="Fit-out Level"
              value={fitoutLevel ? fitoutLevel.replace("_", " ").replace(/\b\w/g, l => l.toUpperCase()) : "Not specified"}
              stepIndex={3}
              onEdit={() => goToStep(3)}
            />
            <SummaryRow
              label="Floor Level"
              value={floorLevel || "Not specified"}
              stepIndex={3}
              onEdit={() => goToStep(3)}
            />
            <SummaryRow
              label="Building Amenities"
              value={selectedAmenities.length > 0 
                ? `${selectedAmenities.slice(0, 3).join(", ")}${selectedAmenities.length > 3 ? ` +${selectedAmenities.length - 3} more` : ""}`
                : "None selected"
              }
              stepIndex={4}
              onEdit={() => goToStep(4)}
            />
            <SummaryRow
              label="Photos"
              value={`${photos?.length || 0} photo${(photos?.length || 0) !== 1 ? "s" : ""}`}
              stepIndex={5}
              onEdit={() => goToStep(5)}
            />
            <SummaryRow
              label="Monthly Rent"
              value={`${currencySymbol} ${formatAmount(monthlyRent)}${pricingModel === "per_sqm" ? ` (${currencySymbol} ${formatAmount(rentPerSqm)}/sqm)` : ""}`}
              stepIndex={6}
              onEdit={() => goToStep(6)}
            />
            <SummaryRow
              label="Service Charge"
              value={serviceChargeMonthly ? `${currencySymbol} ${formatAmount(serviceChargeMonthly)}/month` : "Not specified"}
              stepIndex={6}
              onEdit={() => goToStep(6)}
            />
            <SummaryRow
              label="Deposit"
              value={`${depositMonthsCommercial} month${depositMonthsCommercial !== 1 ? "s" : ""} (${currencySymbol} ${formatAmount(monthlyRent * depositMonthsCommercial)})`}
              stepIndex={6}
              onEdit={() => goToStep(6)}
            />
            <SummaryRow
              label="Minimum Lease"
              value={minLeaseMonths ? `${minLeaseMonths} months` : "Not specified"}
              stepIndex={6}
              onEdit={() => goToStep(6)}
            />
            <SummaryRow
              label="Rent Escalation"
              value={rentEscalationPercent ? `${rentEscalationPercent}% annually` : "None"}
              stepIndex={6}
              onEdit={() => goToStep(6)}
            />
            <SummaryRow
              label="Available From"
              value={formatDate(availableFrom)}
              stepIndex={6}
              onEdit={() => goToStep(6)}
            />
          </div>
        </section>

        {/* Validation Warnings */}
        {(!title || title.length < 10 || !description || description.length < 50) && (
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex gap-3">
            <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-orange-700">
              <p className="font-medium">Complete before publishing:</p>
              <ul className="mt-1 space-y-1">
                {(!title || title.length < 10) && (
                  <li>• Add a title (at least 10 characters)</li>
                )}
                {(!description || description.length < 50) && (
                  <li>• Add a description (at least 50 characters)</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Summary row component
interface SummaryRowProps {
  label: string;
  value: string;
  stepIndex: number;
  onEdit: () => void;
}

function SummaryRow({ label, value, stepIndex, onEdit }: SummaryRowProps) {
  return (
    <div className="px-5 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors">
      <div className="min-w-0 flex-1">
        <span className="text-sm text-gray-500">{label}</span>
        <p className="font-medium text-gray-900 truncate">{value}</p>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="ml-4 p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors flex-shrink-0"
      >
        <Edit3 className="w-4 h-4" />
      </button>
    </div>
  );
}
