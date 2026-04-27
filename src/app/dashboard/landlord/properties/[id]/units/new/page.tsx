/**
 * Add Unit Page
 * 
 * Form for adding a new unit to a building.
 * Simpler than building wizard - single page form.
 */

"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Home,
  X,
  Save,
  Bed,
  Bath,
  Maximize,
  DollarSign,
  Hash,
  Layers,
  Thermometer,
  Droplets,
  Sun,
  Wind,
  Shield,
  Car,
  ImagePlus,
  Camera,
  Trash2,
  ChevronDown,
  Check,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Unit types
const UNIT_TYPES = [
  { value: "studio", label: "Studio", description: "Open plan living" },
  { value: "1br", label: "1 Bedroom", description: "One bedroom apartment" },
  { value: "2br", label: "2 Bedroom", description: "Two bedroom apartment" },
  { value: "3br", label: "3 Bedroom", description: "Three bedroom apartment" },
  { value: "4br", label: "4+ Bedroom", description: "Large unit" },
  { value: "bedsitter", label: "Bedsitter", description: "Single room with bathroom" },
  { value: "single_room", label: "Single Room", description: "Shared facilities" },
  { value: "penthouse", label: "Penthouse", description: "Top floor luxury" },
  { value: "duplex", label: "Duplex", description: "Two-floor unit" },
  { value: "shop", label: "Shop/Commercial", description: "Commercial space" },
];

// Unit features
const UNIT_FEATURES = [
  { id: "balcony", label: "Balcony", icon: Sun },
  { id: "ensuite", label: "En-suite Bathroom", icon: Bath },
  { id: "storage", label: "Storage Room", icon: Layers },
  { id: "ac", label: "Air Conditioning", icon: Wind },
  { id: "water_heater", label: "Water Heater", icon: Thermometer },
  { id: "fitted_kitchen", label: "Fitted Kitchen", icon: Home },
  { id: "parking", label: "Dedicated Parking", icon: Car },
  { id: "security_door", label: "Security Door", icon: Shield },
];

interface FormData {
  unit_number: string;
  unit_type: string;
  floor: string;
  bedrooms: string;
  bathrooms: string;
  size_sqft: string;
  rent_amount: string;
  deposit_amount: string;
  features: string[];
  description: string;
  status: "vacant" | "occupied" | "maintenance";
  photos: File[];
}

export default function AddUnitPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: buildingId } = use(params);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [formData, setFormData] = useState<FormData>({
    unit_number: "",
    unit_type: "",
    floor: "",
    bedrooms: "",
    bathrooms: "",
    size_sqft: "",
    rent_amount: "",
    deposit_amount: "",
    features: [],
    description: "",
    status: "vacant",
    photos: [],
  });

  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  // Update form field
  const updateField = <K extends keyof FormData>(field: K, value: FormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Toggle feature
  const toggleFeature = (featureId: string) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.includes(featureId)
        ? prev.features.filter((f) => f !== featureId)
        : [...prev.features, featureId],
    }));
  };

  // Auto-fill bedrooms when unit type selected
  const handleUnitTypeChange = (type: string) => {
    updateField("unit_type", type);
    
    // Auto-set bedrooms based on type
    const bedroomMap: Record<string, string> = {
      studio: "0",
      bedsitter: "0",
      single_room: "0",
      "1br": "1",
      "2br": "2",
      "3br": "3",
      "4br": "4",
    };
    if (bedroomMap[type] !== undefined) {
      updateField("bedrooms", bedroomMap[type]);
    }
  };

  // Validate form
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};

    if (!formData.unit_number.trim()) {
      newErrors.unit_number = "Unit number is required";
    }
    if (!formData.unit_type) {
      newErrors.unit_type = "Please select a unit type";
    }
    if (!formData.rent_amount || parseFloat(formData.rent_amount) <= 0) {
      newErrors.rent_amount = "Valid rent amount is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);

    try {
      // Simulate API call - replace with Supabase integration
      await new Promise((resolve) => setTimeout(resolve, 1000));

      console.log("Saving unit:", formData);

      // Success - redirect back to building
      router.push(`/dashboard/landlord/buildings/${buildingId}`);
    } catch (error) {
      console.error("Error saving unit:", error);
      alert("Failed to save unit. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/landlord/buildings/${buildingId}`}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Add Unit</h1>
              <p className="text-sm text-gray-500">Add a new unit to this building</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/landlord/buildings/${buildingId}`}
              className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
            >
              Cancel
            </Link>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving..." : "Save Unit"}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-4 py-6">
        {/* Basic Info */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Unit Number */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Unit Number <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={formData.unit_number}
                  onChange={(e) => updateField("unit_number", e.target.value)}
                  placeholder="e.g., A101, B2, Unit 5"
                  className={cn(
                    "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                    errors.unit_number ? "border-red-300" : "border-gray-200"
                  )}
                />
              </div>
              {errors.unit_number && (
                <p className="mt-1 text-sm text-red-600">{errors.unit_number}</p>
              )}
            </div>

            {/* Floor */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Floor</label>
              <div className="relative">
                <Layers className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.floor}
                  onChange={(e) => updateField("floor", e.target.value)}
                  placeholder="e.g., 1, 2, G"
                  min="0"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Unit Type */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Unit Type <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {UNIT_TYPES.map((type) => (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => handleUnitTypeChange(type.value)}
                  className={cn(
                    "p-3 text-center border rounded-xl transition-all",
                    formData.unit_type === type.value
                      ? "border-teal-500 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-700 hover:border-gray-300 hover:bg-gray-50"
                  )}
                >
                  <span className="text-sm font-medium">{type.label}</span>
                </button>
              ))}
            </div>
            {errors.unit_type && (
              <p className="mt-1 text-sm text-red-600">{errors.unit_type}</p>
            )}
          </div>

          {/* Bedrooms, Bathrooms, Size */}
          <div className="grid grid-cols-3 gap-4 mt-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bedrooms</label>
              <div className="relative">
                <Bed className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.bedrooms}
                  onChange={(e) => updateField("bedrooms", e.target.value)}
                  placeholder="0"
                  min="0"
                  max="10"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Bathrooms</label>
              <div className="relative">
                <Bath className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.bathrooms}
                  onChange={(e) => updateField("bathrooms", e.target.value)}
                  placeholder="1"
                  min="0"
                  max="10"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Size (sq ft)
              </label>
              <div className="relative">
                <Maximize className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="number"
                  value={formData.size_sqft}
                  onChange={(e) => updateField("size_sqft", e.target.value)}
                  placeholder="e.g., 650"
                  min="0"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
            </div>
          </div>
        </section>

        {/* Pricing */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Pricing</h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Rent */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Monthly Rent (KES) <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  KES
                </span>
                <input
                  type="number"
                  value={formData.rent_amount}
                  onChange={(e) => updateField("rent_amount", e.target.value)}
                  placeholder="25,000"
                  min="0"
                  className={cn(
                    "w-full pl-12 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                    errors.rent_amount ? "border-red-300" : "border-gray-200"
                  )}
                />
              </div>
              {errors.rent_amount && (
                <p className="mt-1 text-sm text-red-600">{errors.rent_amount}</p>
              )}
            </div>

            {/* Deposit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Deposit Amount (KES)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                  KES
                </span>
                <input
                  type="number"
                  value={formData.deposit_amount}
                  onChange={(e) => updateField("deposit_amount", e.target.value)}
                  placeholder="Same as rent"
                  min="0"
                  className="w-full pl-12 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                />
              </div>
              <p className="mt-1 text-xs text-gray-500">Leave blank to use rent amount</p>
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Features & Amenities</h2>
          <p className="text-sm text-gray-500 mb-4">
            Select the features available in this unit (in addition to building amenities)
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {UNIT_FEATURES.map((feature) => (
              <button
                key={feature.id}
                type="button"
                onClick={() => toggleFeature(feature.id)}
                className={cn(
                  "flex items-center gap-2 p-3 border rounded-xl transition-all text-left",
                  formData.features.includes(feature.id)
                    ? "border-teal-500 bg-teal-50 text-teal-700"
                    : "border-gray-200 text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                )}
              >
                <feature.icon className="w-4 h-4" />
                <span className="text-sm font-medium">{feature.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Description */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Description</h2>
          
          <textarea
            value={formData.description}
            onChange={(e) => updateField("description", e.target.value)}
            rows={4}
            placeholder="Add any additional details about this unit (optional)..."
            className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
          />
        </section>

        {/* Status */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Status</h2>

          <div className="flex flex-wrap gap-3">
            {[
              { value: "vacant", label: "Vacant", description: "Available for rent" },
              { value: "occupied", label: "Occupied", description: "Currently has a tenant" },
              { value: "maintenance", label: "Under Maintenance", description: "Not available" },
            ].map((status) => (
              <button
                key={status.value}
                type="button"
                onClick={() => updateField("status", status.value as FormData["status"])}
                className={cn(
                  "flex items-center gap-3 px-4 py-3 border rounded-xl transition-all text-left",
                  formData.status === status.value
                    ? "border-teal-500 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div
                  className={cn(
                    "w-4 h-4 rounded-full border-2 flex items-center justify-center",
                    formData.status === status.value
                      ? "border-teal-500 bg-teal-500"
                      : "border-gray-300"
                  )}
                >
                  {formData.status === status.value && (
                    <Check className="w-3 h-3 text-white" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{status.label}</p>
                  <p className="text-xs text-gray-500">{status.description}</p>
                </div>
              </button>
            ))}
          </div>
        </section>

        {/* Tip for occupied */}
        {formData.status === "occupied" && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-blue-900">Add tenant details after saving</p>
              <p className="text-sm text-blue-700">
                After saving this unit, you can add the tenant and lease information from the unit
                details page.
              </p>
            </div>
          </div>
        )}

        {/* Submit Button (Mobile) */}
        <div className="sm:hidden sticky bottom-0 bg-white border-t border-gray-200 p-4 -mx-4 mt-6">
          <button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full py-3 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? "Saving..." : "Save Unit"}
          </button>
        </div>
      </main>
    </div>
  );
}
