/**
 * Step 5: Building Financials
 * 
 * Collects financial and management setup:
 * - Service charge
 * - What service charge includes
 * - Payment collection preferences
 * - Bank/M-Pesa details
 * - Management type
 */

"use client";

import { useEffect, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { 
  Wallet,
  Check,
  CreditCard,
  Building2,
  User,
  Users,
  Phone,
  AlertCircle,
  Info,
} from "lucide-react";
import { useWizard } from "../context";
import { 
  type StepValidation,
  MANAGEMENT_TYPES,
  SERVICE_CHARGE_INCLUDES_OPTIONS,
  type ManagementType,
} from "../types";

export function Step5Financials() {
  const { state, updateFormData, dispatch, setFieldTouched } = useWizard();
  const { formData, validation } = state;
  const [serviceChargeDisplay, setServiceChargeDisplay] = useState(
    formData.service_charge ? formatNumber(formData.service_charge) : ""
  );

  // Validation
  const validate = useCallback((): StepValidation => {
    const errors: Record<string, string> = {};

    // If service charge is set, it should be valid
    if (formData.service_charge !== undefined && formData.service_charge < 0) {
      errors.service_charge = "Service charge cannot be negative";
    }

    // If collecting via MitaSafi, need payment details
    if (formData.collection_via_mitasafi) {
      const hasMpesa = formData.bank_details.mpesa_paybill || formData.bank_details.mpesa_till;
      const hasBank = formData.bank_details.account_number;
      
      if (!hasMpesa && !hasBank) {
        errors.payment_details = "Please provide M-Pesa or bank details for rent collection";
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors,
      touched: validation[5]?.touched || {},
    };
  }, [formData, validation]);

  useEffect(() => {
    const stepValidation = validate();
    dispatch({ 
      type: "SET_VALIDATION", 
      payload: { step: 5, validation: stepValidation } 
    });
  }, [formData, validate, dispatch]);

  // Format number with commas
  function formatNumber(num: number): string {
    return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  }

  // Parse number from formatted string
  function parseNumber(str: string): number | undefined {
    const cleaned = str.replace(/[^0-9]/g, "");
    const num = parseInt(cleaned);
    return isNaN(num) ? undefined : num;
  }

  const handleServiceChargeChange = (value: string) => {
    const digits = value.replace(/[^0-9]/g, "");
    if (digits) {
      const num = parseInt(digits);
      setServiceChargeDisplay(formatNumber(num));
      updateFormData({ service_charge: num });
    } else {
      setServiceChargeDisplay("");
      updateFormData({ service_charge: undefined });
    }
  };

  const updateBankDetails = (key: string, value: string) => {
    updateFormData({
      bank_details: { ...formData.bank_details, [key]: value }
    });
  };

  const toggleServiceChargeItem = (item: string) => {
    const current = formData.service_charge_includes || [];
    const updated = current.includes(item)
      ? current.filter(i => i !== item)
      : [...current, item];
    updateFormData({ service_charge_includes: updated });
  };

  const currentValidation = validation[5] || { errors: {}, touched: {} };
  const showError = (field: string) => 
    currentValidation.touched[field] && currentValidation.errors[field];

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Financial Setup</h2>
        <p className="mt-1 text-gray-500">
          Configure service charges and payment collection for your building
        </p>
      </div>

      {/* Management Type */}
      <div className="space-y-3">
        <label className="block text-sm font-semibold text-gray-900">
          How do you manage this building?
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {MANAGEMENT_TYPES.map((type) => {
            const isSelected = formData.management_type === type.id;
            const Icon = type.id === "self" ? User : type.id === "caretaker" ? Building2 : Users;
            
            return (
              <button
                key={type.id}
                type="button"
                onClick={() => updateFormData({ management_type: type.id as ManagementType })}
                className={cn(
                  "flex items-start gap-3 p-4 rounded-xl border-2 text-left",
                  "transition-all",
                  isSelected
                    ? "border-teal-600 bg-teal-50"
                    : "border-gray-200 hover:border-gray-300"
                )}
              >
                <div className={cn(
                  "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
                  isSelected ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"
                )}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <p className={cn(
                    "font-medium",
                    isSelected ? "text-teal-900" : "text-gray-900"
                  )}>
                    {type.label}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {type.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Service Charge */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <label className="block text-sm font-semibold text-gray-900">
            Monthly Service Charge
          </label>
          <span className="text-xs text-gray-500">(optional)</span>
        </div>

        <div className="relative max-w-xs">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
            KSh
          </span>
          <input
            type="text"
            inputMode="numeric"
            value={serviceChargeDisplay}
            onChange={(e) => handleServiceChargeChange(e.target.value)}
            onBlur={() => setFieldTouched(5, "service_charge")}
            placeholder="0"
            className={cn(
              "block w-full pl-14 pr-4 py-3 rounded-xl border",
              "text-gray-900 placeholder:text-gray-400 text-lg font-medium",
              "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
              showError("service_charge") 
                ? "border-red-300 bg-red-50" 
                : "border-gray-200 hover:border-gray-300"
            )}
          />
        </div>

        {/* Service Charge Includes */}
        {(formData.service_charge && formData.service_charge > 0) && (
          <div className="space-y-3">
            <label className="block text-sm font-medium text-gray-700">
              Service charge includes:
            </label>
            <div className="flex flex-wrap gap-2">
              {SERVICE_CHARGE_INCLUDES_OPTIONS.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => toggleServiceChargeItem(item.id)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-sm border-2 transition-all",
                    formData.service_charge_includes.includes(item.id)
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-gray-200 text-gray-600 hover:border-gray-300"
                  )}
                >
                  {formData.service_charge_includes.includes(item.id) && (
                    <Check className="w-3 h-3 inline mr-1" />
                  )}
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Payment Collection */}
      <div className="space-y-4">
        <label className="block text-sm font-semibold text-gray-900">
          Rent Collection
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => updateFormData({ collection_via_mitasafi: true })}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border-2 text-left",
              "transition-all",
              formData.collection_via_mitasafi
                ? "border-teal-600 bg-teal-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              formData.collection_via_mitasafi ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"
            )}>
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <p className={cn(
                "font-medium",
                formData.collection_via_mitasafi ? "text-teal-900" : "text-gray-900"
              )}>
                Collect via MitaSafi
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Track all payments automatically, send reminders, generate reports
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => updateFormData({ collection_via_mitasafi: false })}
            className={cn(
              "flex items-start gap-3 p-4 rounded-xl border-2 text-left",
              "transition-all",
              !formData.collection_via_mitasafi
                ? "border-teal-600 bg-teal-50"
                : "border-gray-200 hover:border-gray-300"
            )}
          >
            <div className={cn(
              "flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center",
              !formData.collection_via_mitasafi ? "bg-teal-600 text-white" : "bg-gray-100 text-gray-600"
            )}>
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <p className={cn(
                "font-medium",
                !formData.collection_via_mitasafi ? "text-teal-900" : "text-gray-900"
              )}>
                Collect Separately
              </p>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage payment collection outside MitaSafi
              </p>
            </div>
          </button>
        </div>
      </div>

      {/* Payment Details (if collecting via MitaSafi) */}
      {formData.collection_via_mitasafi && (
        <div className="space-y-6 p-6 bg-gray-50 rounded-xl">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-gray-900">Payment Details</p>
              <p className="text-sm text-gray-600 mt-0.5">
                Provide at least one payment method for tenants to pay rent
              </p>
            </div>
          </div>

          {/* M-Pesa Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-green-600" />
              <h4 className="text-sm font-semibold text-gray-900">M-Pesa</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Paybill Number
                </label>
                <input
                  type="text"
                  value={formData.bank_details.mpesa_paybill || ""}
                  onChange={(e) => updateBankDetails("mpesa_paybill", e.target.value)}
                  onBlur={() => setFieldTouched(5, "payment_details")}
                  placeholder="e.g. 247247"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number / Till
                </label>
                <input
                  type="text"
                  value={formData.bank_details.mpesa_account || ""}
                  onChange={(e) => updateBankDetails("mpesa_account", e.target.value)}
                  placeholder="Account number for paybill"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Bank Section */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h4 className="text-sm font-semibold text-gray-900">Bank Transfer</h4>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bank Name
                </label>
                <input
                  type="text"
                  value={formData.bank_details.bank_name || ""}
                  onChange={(e) => updateBankDetails("bank_name", e.target.value)}
                  placeholder="e.g. Equity Bank"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Name
                </label>
                <input
                  type="text"
                  value={formData.bank_details.account_name || ""}
                  onChange={(e) => updateBankDetails("account_name", e.target.value)}
                  placeholder="Account holder name"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Account Number
                </label>
                <input
                  type="text"
                  value={formData.bank_details.account_number || ""}
                  onChange={(e) => updateBankDetails("account_number", e.target.value)}
                  onBlur={() => setFieldTouched(5, "payment_details")}
                  placeholder="Bank account number"
                  className="block w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-900 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Error */}
          {showError("payment_details") && (
            <div className="flex items-center gap-2 text-red-600 text-sm">
              <AlertCircle className="w-4 h-4" />
              {currentValidation.errors.payment_details}
            </div>
          )}
        </div>
      )}

      {/* Summary Note */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
        <p className="text-sm text-teal-800">
          <strong>Next step:</strong> After saving this building, you&apos;ll be able to add 
          individual units with their specific details, photos, and pricing.
        </p>
      </div>
    </div>
  );
}
