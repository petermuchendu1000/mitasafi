/**
 * Add Tenant Page
 * 
 * Form for adding a new tenant and creating a lease for a unit.
 * Combines tenant info + lease creation in one flow.
 */

"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  CreditCard,
  Calendar,
  DollarSign,
  FileText,
  Home,
  AlertCircle,
  CheckCircle,
  Save,
  ChevronDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface TenantFormData {
  // Personal Info
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  id_type: "national_id" | "passport" | "military_id";
  id_number: string;
  
  // Emergency Contact
  emergency_name: string;
  emergency_phone: string;
  emergency_relationship: string;
  
  // Lease Details
  start_date: string;
  end_date: string;
  rent_amount: string;
  deposit_amount: string;
  deposit_paid: boolean;
  payment_day: string;
  
  // Notes
  notes: string;
}

const ID_TYPES = [
  { value: "national_id", label: "National ID" },
  { value: "passport", label: "Passport" },
  { value: "military_id", label: "Military ID" },
];

const RELATIONSHIPS = [
  "Parent",
  "Spouse",
  "Sibling",
  "Child",
  "Friend",
  "Colleague",
  "Other",
];

// Mock unit data
const mockUnit = {
  unit_number: "A101",
  rent_amount: 35000,
  deposit_amount: 35000,
};

export default function AddTenantPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id: buildingId, unitId } = use(params);
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Initialize with unit's default rent
  const [formData, setFormData] = useState<TenantFormData>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    id_type: "national_id",
    id_number: "",
    emergency_name: "",
    emergency_phone: "",
    emergency_relationship: "",
    start_date: new Date().toISOString().split("T")[0],
    end_date: "",
    rent_amount: mockUnit.rent_amount.toString(),
    deposit_amount: mockUnit.deposit_amount.toString(),
    deposit_paid: false,
    payment_day: "5",
    notes: "",
  });

  const [errors, setErrors] = useState<Partial<Record<keyof TenantFormData, string>>>({});

  // Update form field
  const updateField = <K extends keyof TenantFormData>(field: K, value: TenantFormData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Auto-calculate end date (1 year from start)
  const handleStartDateChange = (date: string) => {
    updateField("start_date", date);
    if (date) {
      const start = new Date(date);
      start.setFullYear(start.getFullYear() + 1);
      updateField("end_date", start.toISOString().split("T")[0]);
    }
  };

  // Validate current step
  const validateStep = (step: number): boolean => {
    const newErrors: Partial<Record<keyof TenantFormData, string>> = {};

    if (step === 1) {
      if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
      if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
      if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
      if (formData.phone && !/^0[17]\d{8}$/.test(formData.phone.replace(/\s/g, ""))) {
        newErrors.phone = "Enter a valid Kenyan phone number";
      }
      if (!formData.id_number.trim()) newErrors.id_number = "ID number is required";
    }

    if (step === 2) {
      if (!formData.emergency_name.trim()) newErrors.emergency_name = "Emergency contact name is required";
      if (!formData.emergency_phone.trim()) newErrors.emergency_phone = "Emergency phone is required";
      if (!formData.emergency_relationship) newErrors.emergency_relationship = "Relationship is required";
    }

    if (step === 3) {
      if (!formData.start_date) newErrors.start_date = "Start date is required";
      if (!formData.end_date) newErrors.end_date = "End date is required";
      if (!formData.rent_amount || parseFloat(formData.rent_amount) <= 0) {
        newErrors.rent_amount = "Valid rent amount is required";
      }
      if (!formData.deposit_amount || parseFloat(formData.deposit_amount) <= 0) {
        newErrors.deposit_amount = "Valid deposit amount is required";
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle next step
  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(prev + 1, 3));
    }
  };

  // Handle back
  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validateStep(3)) return;

    setIsSubmitting(true);

    try {
      // Simulate API call - replace with Supabase integration
      await new Promise((resolve) => setTimeout(resolve, 1500));

      console.log("Saving tenant:", formData);

      // Success - redirect back to unit
      router.push(`/dashboard/landlord/buildings/${buildingId}/units/${unitId}`);
    } catch (error) {
      console.error("Error saving tenant:", error);
      alert("Failed to add tenant. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { number: 1, title: "Personal Info" },
    { number: 2, title: "Emergency Contact" },
    { number: 3, title: "Lease Details" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href={`/dashboard/landlord/buildings/${buildingId}/units/${unitId}`}
              className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">Add Tenant</h1>
              <p className="text-sm text-gray-500">Unit {mockUnit.unit_number}</p>
            </div>
          </div>
        </div>

        {/* Progress Steps */}
        <div className="max-w-2xl mx-auto px-4 pb-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.number} className="flex items-center">
                <button
                  onClick={() => currentStep > step.number && setCurrentStep(step.number)}
                  className={cn(
                    "flex items-center gap-2",
                    currentStep >= step.number ? "text-teal-600" : "text-gray-400",
                    currentStep > step.number && "cursor-pointer"
                  )}
                  disabled={currentStep < step.number}
                >
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium",
                      currentStep > step.number
                        ? "bg-teal-600 text-white"
                        : currentStep === step.number
                        ? "bg-teal-100 text-teal-700 border-2 border-teal-600"
                        : "bg-gray-100 text-gray-500"
                    )}
                  >
                    {currentStep > step.number ? <CheckCircle className="w-5 h-5" /> : step.number}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                </button>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      "w-12 sm:w-24 h-0.5 mx-2 sm:mx-4",
                      currentStep > step.number ? "bg-teal-600" : "bg-gray-200"
                    )}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        {/* Step 1: Personal Info */}
        {currentStep === 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Personal Information</h2>
            <p className="text-sm text-gray-500 mb-6">
              Enter the tenant's personal details
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    First Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => updateField("first_name", e.target.value)}
                    placeholder="John"
                    className={cn(
                      "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                      errors.first_name ? "border-red-300" : "border-gray-200"
                    )}
                  />
                  {errors.first_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.first_name}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Last Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => updateField("last_name", e.target.value)}
                    placeholder="Mwangi"
                    className={cn(
                      "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                      errors.last_name ? "border-red-300" : "border-gray-200"
                    )}
                  />
                  {errors.last_name && (
                    <p className="mt-1 text-sm text-red-600">{errors.last_name}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => updateField("phone", e.target.value)}
                    placeholder="0712 345 678"
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                      errors.phone ? "border-red-300" : "border-gray-200"
                    )}
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => updateField("email", e.target.value)}
                    placeholder="john@email.com (optional)"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    ID Type <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <select
                      value={formData.id_type}
                      onChange={(e) => updateField("id_type", e.target.value as TenantFormData["id_type"])}
                      className="w-full appearance-none px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                    >
                      {ID_TYPES.map((type) => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    ID Number <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={formData.id_number}
                      onChange={(e) => updateField("id_number", e.target.value)}
                      placeholder="12345678"
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                        errors.id_number ? "border-red-300" : "border-gray-200"
                      )}
                    />
                  </div>
                  {errors.id_number && (
                    <p className="mt-1 text-sm text-red-600">{errors.id_number}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Emergency Contact */}
        {currentStep === 2 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Emergency Contact</h2>
            <p className="text-sm text-gray-500 mb-6">
              Someone we can contact in case of emergencies
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Contact Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.emergency_name}
                  onChange={(e) => updateField("emergency_name", e.target.value)}
                  placeholder="Full name"
                  className={cn(
                    "w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                    errors.emergency_name ? "border-red-300" : "border-gray-200"
                  )}
                />
                {errors.emergency_name && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergency_name}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="tel"
                    value={formData.emergency_phone}
                    onChange={(e) => updateField("emergency_phone", e.target.value)}
                    placeholder="0712 345 678"
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                      errors.emergency_phone ? "border-red-300" : "border-gray-200"
                    )}
                  />
                </div>
                {errors.emergency_phone && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergency_phone}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Relationship <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={formData.emergency_relationship}
                    onChange={(e) => updateField("emergency_relationship", e.target.value)}
                    className={cn(
                      "w-full appearance-none px-4 py-2.5 border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                      errors.emergency_relationship ? "border-red-300" : "border-gray-200"
                    )}
                  >
                    <option value="">Select relationship</option>
                    {RELATIONSHIPS.map((rel) => (
                      <option key={rel} value={rel.toLowerCase()}>
                        {rel}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                {errors.emergency_relationship && (
                  <p className="mt-1 text-sm text-red-600">{errors.emergency_relationship}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Lease Details */}
        {currentStep === 3 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-1">Lease Details</h2>
            <p className="text-sm text-gray-500 mb-6">
              Set up the rental agreement details
            </p>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.start_date}
                      onChange={(e) => handleStartDateChange(e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                        errors.start_date ? "border-red-300" : "border-gray-200"
                      )}
                    />
                  </div>
                  {errors.start_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.start_date}</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="date"
                      value={formData.end_date}
                      onChange={(e) => updateField("end_date", e.target.value)}
                      className={cn(
                        "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                        errors.end_date ? "border-red-300" : "border-gray-200"
                      )}
                    />
                  </div>
                  {errors.end_date && (
                    <p className="mt-1 text-sm text-red-600">{errors.end_date}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Deposit (KES) <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                      KES
                    </span>
                    <input
                      type="number"
                      value={formData.deposit_amount}
                      onChange={(e) => updateField("deposit_amount", e.target.value)}
                      className={cn(
                        "w-full pl-12 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                        errors.deposit_amount ? "border-red-300" : "border-gray-200"
                      )}
                    />
                  </div>
                  {errors.deposit_amount && (
                    <p className="mt-1 text-sm text-red-600">{errors.deposit_amount}</p>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Rent Due Day
                </label>
                <div className="relative">
                  <select
                    value={formData.payment_day}
                    onChange={(e) => updateField("payment_day", e.target.value)}
                    className="w-full appearance-none px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    {[1, 5, 10, 15, 20, 25, 28].map((day) => (
                      <option key={day} value={day.toString()}>
                        {day}{day === 1 ? "st" : day === 5 ? "th" : day === 15 ? "th" : day === 28 ? "th" : "th"} of each month
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>

              <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-lg">
                <input
                  type="checkbox"
                  id="deposit_paid"
                  checked={formData.deposit_paid}
                  onChange={(e) => updateField("deposit_paid", e.target.checked)}
                  className="w-5 h-5 text-teal-600 rounded border-gray-300 focus:ring-teal-500"
                />
                <label htmlFor="deposit_paid" className="text-sm text-gray-700">
                  Deposit has been paid
                </label>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Notes (Optional)
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  rows={3}
                  placeholder="Any special agreements or notes..."
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
                />
              </div>
            </div>

            {/* Summary */}
            <div className="mt-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-teal-600 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-teal-900">Lease Summary</p>
                  <p className="text-sm text-teal-700 mt-1">
                    {formData.first_name || "Tenant"} {formData.last_name} will pay{" "}
                    <strong>KES {parseInt(formData.rent_amount || "0").toLocaleString()}</strong>/month
                    from {formData.start_date ? new Date(formData.start_date).toLocaleDateString("en-KE") : "—"}{" "}
                    to {formData.end_date ? new Date(formData.end_date).toLocaleDateString("en-KE") : "—"}.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="mt-6 flex items-center justify-between">
          {currentStep > 1 ? (
            <button
              onClick={handleBack}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-900 font-medium"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {currentStep < 3 ? (
            <button
              onClick={handleNext}
              className="px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
            >
              Continue
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Save className="w-4 h-4" />
              {isSubmitting ? "Saving..." : "Add Tenant"}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
