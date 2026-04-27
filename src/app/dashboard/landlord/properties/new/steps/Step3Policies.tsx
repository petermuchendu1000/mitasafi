/**
 * Step 3: Building Policies
 * 
 * Collects building rules and regulations:
 * - Pet policy
 * - Smoking policy
 * - Business use policy
 * - Airbnb/short-term rentals
 * - Quiet hours
 * - Access instructions
 */

"use client";

import { useEffect, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  Scale,
  PawPrint,
  Cigarette,
  Briefcase,
  Home,
  Clock,
  DoorOpen,
} from "lucide-react";
import { useWizard } from "../context";
import { 
  type StepValidation,
  PET_POLICY_OPTIONS,
  SMOKING_POLICY_OPTIONS,
  BUSINESS_POLICY_OPTIONS,
} from "../types";

export function Step3Policies() {
  const { state, updateFormData, dispatch } = useWizard();
  const { formData, validation } = state;

  // Validation - Step 3 is always valid (all fields have defaults)
  const validate = useCallback((): StepValidation => {
    return {
      isValid: true,
      errors: {},
      touched: validation[3]?.touched || {},
    };
  }, [validation]);

  useEffect(() => {
    const stepValidation = validate();
    dispatch({ 
      type: "SET_VALIDATION", 
      payload: { step: 3, validation: stepValidation } 
    });
  }, [formData, validate, dispatch]);

  const updatePolicies = (key: string, value: unknown) => {
    updateFormData({
      policies: { ...formData.policies, [key]: value }
    });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Building Policies</h2>
        <p className="mt-1 text-gray-500">
          Set the rules and regulations for your building
        </p>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex gap-3">
          <Scale className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm text-blue-800 font-medium">Why policies matter</p>
            <p className="text-sm text-blue-700 mt-1">
              Clear policies help attract the right tenants and prevent conflicts.
              These will be shown to potential tenants when viewing your property.
            </p>
          </div>
        </div>
      </div>

      {/* Pet Policy */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <PawPrint className="w-5 h-5 text-amber-600" />
          <label className="text-sm font-semibold text-gray-900">Pet Policy</label>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PET_POLICY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updatePolicies("pets", option.id)}
              className={cn(
                "px-4 py-3 rounded-xl border-2 text-sm font-medium",
                "transition-all",
                formData.policies.pets === option.id
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Smoking Policy */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Cigarette className="w-5 h-5 text-red-500" />
          <label className="text-sm font-semibold text-gray-900">Smoking Policy</label>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {SMOKING_POLICY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updatePolicies("smoking", option.id)}
              className={cn(
                "px-4 py-3 rounded-xl border-2 text-sm font-medium",
                "transition-all",
                formData.policies.smoking === option.id
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Business Use Policy */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Briefcase className="w-5 h-5 text-indigo-600" />
          <label className="text-sm font-semibold text-gray-900">Home Business Use</label>
        </div>
        <p className="text-sm text-gray-500">
          Can tenants run a business from their unit? (e.g., work from home, online business)
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {BUSINESS_POLICY_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => updatePolicies("business_use", option.id)}
              className={cn(
                "px-4 py-3 rounded-xl border-2 text-sm font-medium",
                "transition-all",
                formData.policies.business_use === option.id
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Airbnb Policy */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Home className="w-5 h-5 text-pink-600" />
          <label className="text-sm font-semibold text-gray-900">Short-term Rentals (Airbnb)</label>
        </div>
        <p className="text-sm text-gray-500">
          Can tenants sublet on Airbnb or other short-term rental platforms?
        </p>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => updatePolicies("airbnb", true)}
            className={cn(
              "px-4 py-3 rounded-xl border-2 text-sm font-medium",
              "transition-all",
              formData.policies.airbnb === true
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            Allowed
          </button>
          <button
            type="button"
            onClick={() => updatePolicies("airbnb", false)}
            className={cn(
              "px-4 py-3 rounded-xl border-2 text-sm font-medium",
              "transition-all",
              formData.policies.airbnb === false
                ? "border-teal-600 bg-teal-50 text-teal-700"
                : "border-gray-200 text-gray-600 hover:border-gray-300"
            )}
          >
            Not Allowed
          </button>
        </div>
      </div>

      {/* Quiet Hours */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Clock className="w-5 h-5 text-violet-600" />
          <label className="text-sm font-semibold text-gray-900">Quiet Hours</label>
          <span className="text-xs text-gray-400">(optional)</span>
        </div>
        <input
          type="text"
          value={formData.policies.quiet_hours || ""}
          onChange={(e) => updatePolicies("quiet_hours", e.target.value)}
          placeholder="e.g. 10:00 PM - 6:00 AM"
          className={cn(
            "block w-full max-w-sm px-4 py-3 rounded-xl border",
            "text-gray-900 placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
            "border-gray-200 hover:border-gray-300"
          )}
        />
        <p className="text-xs text-gray-500">
          Specify the hours when noise should be kept to a minimum
        </p>
      </div>

      {/* Access Instructions */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <DoorOpen className="w-5 h-5 text-cyan-600" />
          <label className="text-sm font-semibold text-gray-900">Access Instructions</label>
          <span className="text-xs text-gray-400">(optional)</span>
        </div>
        <textarea
          value={formData.access_instructions || ""}
          onChange={(e) => updateFormData({ access_instructions: e.target.value })}
          rows={3}
          placeholder="e.g. Use the back gate after 10pm. Visitors must register at the security desk."
          className={cn(
            "block w-full px-4 py-3 rounded-xl border",
            "text-gray-900 placeholder:text-gray-400",
            "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
            "border-gray-200 hover:border-gray-300",
            "resize-none"
          )}
        />
        <p className="text-xs text-gray-500">
          Instructions for tenants and visitors on how to access the building
        </p>
      </div>
    </div>
  );
}
