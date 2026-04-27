/**
 * Step 7: Review & Publish
 * 
 * Final review with title, description, preview summary,
 * and publish controls.
 * 
 * Uses dynamic content from content-config.ts.
 */

"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  MapPin, 
  Bed, 
  Bath, 
  Maximize,
  Check,
  Edit3,
  Eye,
  AlertCircle,
  Star,
  Car,
  PawPrint,
  Cigarette,
  Calendar,
  CreditCard,
} from "lucide-react";
import { useWizard } from "../context";
import { useStep7Content } from "../useWizardContent";
import { PROPERTY_TYPES, NAIROBI_AREAS, AMENITY_CATEGORIES } from "../types";

export function Step7Review() {
  const { state, updateFormData, setValidation, goToStep } = useWizard();
  const content = useStep7Content();
  const { 
    title,
    description,
    propertyType,
    address,
    area,
    bedrooms,
    bathrooms,
    sizeSqft,
    sizeUnit,
    condition,
    furnishing,
    amenities,
    parking,
    parkingSpaces,
    // Enhanced policy fields
    petPolicy,
    smokingPolicy,
    // Legacy fields (fallback)
    petsAllowed,
    smokingAllowed,
    // Enhanced security & utilities
    securityGuard,
    cctv,
    accessControl,
    waterReliability,
    backupPower,
    internetReady,
    availableIsps,
    landmarks,
    photos,
    rentAmount,
    rentNegotiable,
    currency,
    depositMonths,
    availableFrom,
    paymentMethods,
    leaseTerm,
    rentIncludes,
  } = state.formData;

  const [showPreview, setShowPreview] = useState(false);

  // Validation
  useEffect(() => {
    const errors: Record<string, string> = {};
    
    if (!title || title.trim().length < 10) {
      errors.title = "Title must be at least 10 characters";
    } else if (title.trim().length > 60) {
      errors.title = "Title must be 60 characters or less";
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

  // Get property type label
  const propertyTypeLabel = PROPERTY_TYPES.find((t) => t.id === propertyType)?.label || propertyType || "Not selected";

  // Get area label - flatten the nested structure properly
  const areaLabel = (() => {
    for (const categoryData of Object.values(NAIROBI_AREAS)) {
      const found = categoryData.areas.find((a: { id: string; name: string }) => a.id === area);
      if (found) return found.name;
    }
    return area || "";
  })();

  // Get cover photo - check for category "cover" first, then isCover flag, then first photo
  const coverPhoto = (photos || []).find((p) => p.category === "cover") 
    || (photos || []).find((p) => p.isCover) 
    || photos?.[0];

  // Get selected amenities labels
  const selectedAmenities = (amenities || []).map((amenityId) => {
    for (const category of Object.values(AMENITY_CATEGORIES)) {
      const found = category.amenities.find((a) => a.id === amenityId);
      if (found) return found.label;
    }
    return amenityId;
  });

  // Currency symbol
  const currencySymbol = currency === "USD" ? "$" : "KSh";

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

  // Generate auto title (max 60 chars)
  const generateTitle = () => {
    const bedroomLabel = bedrooms === 0 ? "Studio" : `${bedrooms}BR`;
    const furnishLabel = furnishing === "fully_furnished" ? "Furnished " 
      : furnishing === "semi_furnished" ? "Semi-Furn " 
      : "";
    
    // Start with base: "3BR Apartment"
    let title = `${furnishLabel}${bedroomLabel} ${propertyTypeLabel}`;
    
    // Add area if it fits
    if (areaLabel && (title.length + areaLabel.length + 4) <= 60) {
      title += ` in ${areaLabel}`;
    }
    
    return title.slice(0, 60);
  };

  // Generate auto description - natural language with clear formatting
  const generateDescription = () => {
    const paragraphs: string[] = [];
    
    // Determine property characteristics
    const furnishingText = furnishing === "fully_furnished" 
      ? "fully furnished" 
      : furnishing === "semi_furnished" 
      ? "semi-furnished" 
      : "";
    
    const sizeText = sizeSqft ? `${sizeSqft.toLocaleString()} ${sizeUnit === "sqm" ? "square meters" : "square feet"}` : "";
    const bedroomText = bedrooms === 0 ? "studio" : `${bedrooms}-bedroom`;
    const propType = propertyTypeLabel?.toLowerCase() || "property";
    
    // Opening paragraph - warm and inviting
    let opening = `Looking for a place to call home? This ${furnishingText ? furnishingText + " " : ""}${bedroomText} ${propType}`;
    if (areaLabel) {
      opening += ` in ${areaLabel}`;
    }
    opening += ` might be exactly what you're looking for.`;
    if (sizeText) {
      opening += ` With ${sizeText} of living space, there's plenty of room to settle in and make it your own.`;
    }
    paragraphs.push(opening);
    
    // Condition and general feel
    if (condition) {
      const conditionText: Record<string, string> = {
        excellent: "The property has been exceptionally well-maintained and is in pristine condition — you can move in right away without lifting a finger.",
        good: "Everything is in great shape and well looked after. You'll find the space clean, functional, and ready for you to move in.",
        fair: "The property is solid and livable, with some character that comes with being a well-used home.",
        needs_work: "There's some work to be done here, but that also means an opportunity to shape it to your taste.",
      };
      if (conditionText[condition]) {
        paragraphs.push(conditionText[condition]);
      }
    }
    
    // Property features - use a list for clarity
    const features: string[] = [];
    if (bedrooms > 0) features.push(`${bedrooms} bedroom${bedrooms > 1 ? "s" : ""}`);
    if (bathrooms > 0) features.push(`${bathrooms} bathroom${bathrooms > 1 ? "s" : ""}`);
    if (parking && parking !== "none" && parkingSpaces) {
      const parkingType = parking.replace("_", " ");
      features.push(`${parkingType} parking (${parkingSpaces} space${parkingSpaces > 1 ? "s" : ""})`);
    }
    if (furnishing === "fully_furnished") features.push("Fully furnished and equipped");
    else if (furnishing === "semi_furnished") features.push("Semi-furnished with essentials");
    
    // Add amenities to features
    if (selectedAmenities.length > 0) {
      selectedAmenities.slice(0, 6).forEach(amenity => features.push(amenity));
    }
    
    if (features.length > 0) {
      let featureSection = "Here's what you get:\n";
      features.forEach(feature => {
        featureSection += `• ${feature}\n`;
      });
      paragraphs.push(featureSection.trim());
    }
    
    // Utilities and security - list format for scannability
    const utilities: string[] = [];
    if (waterReliability === "24_7") utilities.push("24/7 water supply");
    else if (waterReliability === "tank_backup") utilities.push("Reliable water with tank backup");
    if (backupPower === "full") utilities.push("Full backup generator");
    else if (backupPower === "common_areas") utilities.push("Backup power for common areas");
    if (securityGuard === "24_hour") utilities.push("24-hour security on-site");
    else if (securityGuard === "daytime") utilities.push("Daytime security");
    if (cctv && cctv !== "none") utilities.push("CCTV surveillance");
    if (accessControl && accessControl !== "none") utilities.push("Controlled access entry");
    if (internetReady && availableIsps && availableIsps.length > 0) {
      utilities.push(`Fibre internet ready (${availableIsps.slice(0, 2).join(", ")})`);
    }
    
    if (utilities.length > 0) {
      let utilitySection = "Security & utilities:\n";
      utilities.forEach(item => {
        utilitySection += `• ${item}\n`;
      });
      paragraphs.push(utilitySection.trim());
    }
    
    // What's included in rent - list format
    if (rentIncludes && rentIncludes.length > 0) {
      let includesSection = "The rent includes:\n";
      rentIncludes.forEach(item => {
        includesSection += `• ${item}\n`;
      });
      includesSection += "So you won't have to worry about those separately.";
      paragraphs.push(includesSection);
    }
    
    // Location - natural prose
    if (landmarks) {
      paragraphs.push(`Location-wise, you're close to ${landmarks}, which makes daily errands and getting around pretty convenient.`);
    }
    
    // Policies - only mention if noteworthy, conversational
    const effectivePetPolicy = petPolicy || (petsAllowed ? "all_allowed" : "not_allowed");
    const effectiveSmokingPolicy = smokingPolicy || (smokingAllowed ? "allowed" : "not_allowed");
    
    const policyNotes: string[] = [];
    if (effectivePetPolicy === "all_allowed") policyNotes.push("pets are welcome");
    else if (effectivePetPolicy === "small_only") policyNotes.push("small pets (cats, small dogs) are allowed");
    else if (effectivePetPolicy === "case_by_case") policyNotes.push("pets can be discussed");
    
    if (effectiveSmokingPolicy === "balcony_only") policyNotes.push("smoking is fine on the balcony");
    else if (effectiveSmokingPolicy === "allowed") policyNotes.push("smoking is permitted");
    
    if (policyNotes.length > 0) {
      paragraphs.push(`Good to know: ${policyNotes.join(", and ")}.`);
    }
    
    // Pricing - clear and upfront
    if (rentAmount) {
      let pricePara = `Rent: KES ${rentAmount.toLocaleString()}/month\nDeposit: ${depositMonths} month${depositMonths > 1 ? "s" : ""} rent`;
      if (rentNegotiable) {
        pricePara += "\n(Some flexibility for the right tenant)";
      }
      paragraphs.push(pricePara);
    }
    
    // Availability
    if (availableFrom) {
      const today = new Date().toISOString().split("T")[0];
      if (availableFrom <= today) {
        paragraphs.push("Available now — you could move in as soon as you're ready.");
      } else {
        paragraphs.push(`Available from ${formatDate(availableFrom)}.`);
      }
    }
    
    // Closing - warm invitation
    paragraphs.push("Interested? Get in touch to arrange a viewing. I'd be happy to show you around.");
    
    return paragraphs.join("\n\n");
  };

  // Auto-fill title if empty
  useEffect(() => {
    if (!title && propertyType && area) {
      updateFormData({ title: generateTitle() });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        {/* Title & Description Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">{content.title.sectionLabel}</h3>
          </div>
          
          <div className="p-5 space-y-5">
            {/* Title */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
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
                value={title || ""}
                onChange={(e) => updateFormData({ title: e.target.value })}
                placeholder={content.title.placeholder}
                maxLength={60}
                className={cn(
                  "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white",
                  "text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                  (title?.length || 0) > 60 && "border-red-300 focus:ring-red-500"
                )}
              />
              <div className="flex justify-between mt-1.5">
                <p className="text-xs text-gray-500">
                  {content.title.helper}
                </p>
                <span className={cn(
                  "text-xs",
                  (title?.length || 0) > 60 ? "text-red-500 font-medium" : "text-gray-400"
                )}>
                  {(title || "").length}/60
                </span>
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  {content.description.label} <span className="text-orange-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => updateFormData({ description: generateDescription() })}
                  className="text-xs text-teal-600 hover:text-teal-700 font-medium"
                >
                  ✨ Auto-generate
                </button>
              </div>
              <textarea
                value={description || ""}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder={content.description.placeholder}
                rows={6}
                maxLength={2000}
                className={cn(
                  "w-full px-4 py-3 rounded-lg border border-gray-300 bg-white",
                  "text-gray-900 placeholder:text-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                  "resize-y min-h-[150px] max-h-[400px]"
                )}
              />
              <div className="flex justify-between mt-1.5">
                <p className={cn(
                  "text-xs flex items-center gap-1",
                  (description || "").length < 50 ? "text-amber-600" : "text-gray-500"
                )}>
                  {content.description.helper}
                  <span className="text-gray-400">• Drag bottom edge to resize</span>
                </p>
                <span className="text-xs text-gray-400">
                  {(description || "").length}/2000
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Preview Card */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-semibold text-gray-900">Preview</h3>
            <button
              type="button"
              onClick={() => setShowPreview(!showPreview)}
              className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
            >
              <Eye className="w-4 h-4" />
              {showPreview ? "Hide" : "Show"} full preview
            </button>
          </div>
          
          <div className="p-5">
            {/* Property Card Preview */}
            <div className="border border-gray-200 rounded-xl overflow-hidden max-w-sm mx-auto">
              {/* Cover Photo */}
              <div className="aspect-[4/3] bg-gray-100 relative">
                {coverPhoto ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={coverPhoto.url || coverPhoto.preview}
                    alt="Cover"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    No cover photo
                  </div>
                )}
                {/* Photo count badge */}
                {(photos?.length || 0) > 1 && (
                  <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 text-white text-xs rounded-md">
                    +{(photos?.length || 1) - 1} photos
                  </div>
                )}
              </div>

              {/* Details */}
              <div className="p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h4 className="font-semibold text-gray-900 line-clamp-2">
                    {title || "Your property title"}
                  </h4>
                  <span className="text-lg font-bold text-teal-600 whitespace-nowrap">
                    {currencySymbol} {(rentAmount || 0).toLocaleString()}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                  <MapPin className="w-4 h-4" />
                  <span className="line-clamp-1">
                    {areaLabel || address || "Location not set"}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1">
                    <Bed className="w-4 h-4" /> {bedrooms}
                  </span>
                  <span className="flex items-center gap-1">
                    <Bath className="w-4 h-4" /> {bathrooms}
                  </span>
                  {sizeSqft && (
                    <span className="flex items-center gap-1">
                      <Maximize className="w-4 h-4" /> {sizeSqft} {sizeUnit}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Full Preview */}
            {showPreview && (
              <div className="mt-6 pt-6 border-t border-gray-200 space-y-4">
                {/* Summary Grid */}
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <SummaryItem
                    label="Property Type"
                    value={propertyTypeLabel}
                    onEdit={() => goToStep(1)}
                  />
                  <SummaryItem
                    label="Location"
                    value={areaLabel || address || "Not set"}
                    onEdit={() => goToStep(2)}
                  />
                  <SummaryItem
                    label="Condition"
                    value={condition ? condition.charAt(0).toUpperCase() + condition.slice(1) : "Not set"}
                    onEdit={() => goToStep(3)}
                  />
                  <SummaryItem
                    label="Furnishing"
                    value={
                      furnishing === "fully_furnished" ? "Fully Furnished" :
                      furnishing === "semi_furnished" ? "Semi-Furnished" : "Unfurnished"
                    }
                    onEdit={() => goToStep(3)}
                  />
                </div>

                {/* Amenities */}
                {selectedAmenities.length > 0 && (
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Amenities</span>
                      <button
                        type="button"
                        onClick={() => goToStep(4)}
                        className="text-xs text-teal-600 hover:text-teal-700"
                      >
                        <Edit3 className="w-3 h-3 inline mr-1" />
                        Edit
                      </button>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedAmenities.slice(0, 8).map((amenity) => (
                        <span
                          key={amenity}
                          className="px-2 py-1 bg-teal-50 text-teal-700 text-xs rounded-md"
                        >
                          {amenity}
                        </span>
                      ))}
                      {selectedAmenities.length > 8 && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md">
                          +{selectedAmenities.length - 8} more
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Policies */}
                <div className="flex flex-wrap gap-3 text-sm">
                  {parking && parking !== "none" && (
                    <span className="flex items-center gap-1 text-gray-600">
                      <Car className="w-4 h-4" />
                      {parkingSpaces} parking
                    </span>
                  )}
                  {petsAllowed && (
                    <span className="flex items-center gap-1 text-green-600">
                      <PawPrint className="w-4 h-4" />
                      Pets OK
                    </span>
                  )}
                  {smokingAllowed && (
                    <span className="flex items-center gap-1 text-amber-600">
                      <Cigarette className="w-4 h-4" />
                      Smoking OK
                    </span>
                  )}
                </div>

                {/* Pricing Summary */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Monthly Rent</span>
                    <span className="font-semibold text-gray-900">
                      {currencySymbol} {(rentAmount || 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Security Deposit</span>
                    <span className="font-medium text-gray-700">
                      {depositMonths} month{depositMonths !== 1 ? "s" : ""} rent
                    </span>
                  </div>
                  {rentIncludes && rentIncludes.length > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-600">Rent Includes</span>
                      <span className="font-medium text-gray-700">
                        {rentIncludes.join(", ")}
                      </span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
                    <span className="text-gray-600 flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      Available From
                    </span>
                    <span className="font-medium text-gray-700">
                      {formatDate(availableFrom)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <CreditCard className="w-4 h-4" />
                      Payment Methods
                    </span>
                    <span className="font-medium text-gray-700">
                      {(paymentMethods || []).map((m) => 
                        m === "mpesa" ? "M-Pesa" : 
                        m === "airtel" ? "Airtel Money" :
                        m.charAt(0).toUpperCase() + m.slice(1)
                      ).join(", ") || "Not set"}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Checklist */}
        <section className="bg-teal-50 border border-cta-200 rounded-xl p-5">
          <h4 className="font-semibold text-cta-800 mb-1">Before you publish</h4>
          <p className="text-sm text-teal-600 mb-3">
            Complete these items to make your listing visible to tenants
          </p>
          <div className="space-y-2">
            <ChecklistItem 
              checked={!!title && title.length >= 10} 
              label="Added a descriptive title"
              hint={!title || title.length < 10 ? "At least 10 characters needed" : undefined}
            />
            <ChecklistItem 
              checked={!!description && description.length >= 50} 
              label="Written a detailed description"
              hint={!description || description.length < 50 ? "At least 50 characters needed" : undefined}
            />
            <ChecklistItem 
              checked={(photos?.length || 0) >= 3} 
              label="Uploaded at least 3 photos"
              hint={(photos?.length || 0) < 3 ? `${3 - (photos?.length || 0)} more photos needed` : undefined}
            />
            <ChecklistItem 
              checked={!!rentAmount && rentAmount > 0} 
              label="Set the rent amount"
              hint={!rentAmount ? "Go to Pricing step" : undefined}
            />
            <ChecklistItem 
              checked={!!availableFrom} 
              label="Selected availability date"
              hint={!availableFrom ? "Go to Pricing step" : undefined}
            />
          </div>
        </section>

        {/* Warning for incomplete */}
        {(!title || title.length < 10 || !description || description.length < 50) && (
          <div className="flex gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
            <AlertCircle className="w-5 h-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800">
                Complete all required fields to publish
              </p>
              <p className="text-sm text-amber-700 mt-1">
                Add a title and description above, then click &quot;Publish Listing&quot; 
                to make your property visible to tenants.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Summary item component
interface SummaryItemProps {
  label: string;
  value: string;
  onEdit: () => void;
}

function SummaryItem({ label, value, onEdit }: SummaryItemProps) {
  return (
    <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
      <div>
        <span className="text-xs text-gray-500 block">{label}</span>
        <span className="font-medium text-gray-900">{value}</span>
      </div>
      <button
        type="button"
        onClick={onEdit}
        className="text-teal-600 hover:text-teal-700 p-1"
      >
        <Edit3 className="w-4 h-4" />
      </button>
    </div>
  );
}

// Checklist item component
interface ChecklistItemProps {
  checked: boolean;
  label: string;
  hint?: string;
}

function ChecklistItem({ checked, label, hint }: ChecklistItemProps) {
  return (
    <div className="flex items-start gap-2">
      <div className={cn(
        "w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5",
        checked 
          ? "bg-teal-600 text-white" 
          : "border-2 border-gray-300"
      )}>
        {checked && <Check className="w-3 h-3" />}
      </div>
      <div>
        <span className={cn(
          "text-sm",
          checked ? "text-teal-700" : "text-gray-600"
        )}>
          {label}
        </span>
        {!checked && hint && (
          <span className="text-xs text-amber-600 block">{hint}</span>
        )}
      </div>
    </div>
  );
}
