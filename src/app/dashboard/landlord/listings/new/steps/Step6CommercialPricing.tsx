/**
 * Step 6: Commercial Pricing & Terms
 * 
 * Commercial-specific pricing including:
 * - Rent per sqm or fixed
 * - Service charges
 * - Revenue share options
 * - Deposit & lease terms
 * 
 * Dynamically shows pricing models based on commercial type/subtype.
 * Design: Clean, professional. Teal primary, orange accents.
 */

"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { 
  ChevronDown, 
  Calendar,
  Info,
  Plus,
  X,
} from "lucide-react";
import { useWizard } from "../context";
import { formatAmount, parseAmount } from "../utils";
import { 
  COMMERCIAL_PRICING_MODELS,
  COMMERCIAL_PAYMENT_FREQUENCIES,
  SERVICE_CHARGE_ITEMS,
  type PricingModelType,
  type CommercialPaymentFrequency,
  type CommercialSubtype,
} from "../commercial-types";
import { getFlowConfig, PRICING_MODEL_LABELS } from "../commercial-flow-config";
import { getPricingRequiredFields } from "../required-fields-config";

// Get label for per-unit pricing based on subtype
function getPricingUnitLabel(subtype: CommercialSubtype | null): string {
  switch (subtype) {
    case "parking_lot":
    case "parking_building":
      return "Per parking space";
    case "data_center":
      return "Per rack / month";
    case "hotel_building":
    case "guest_house":
    case "hostel":
      return "Per room / month";
    case "event_venue":
    case "conference_center":
    case "wedding_venue":
      return "Per event / day";
    default:
      return "Per unit";
  }
}

const CURRENCY_OPTIONS = [
  { id: "KES", label: "KES", symbol: "KSh" },
  { id: "USD", label: "USD", symbol: "$" },
];

export function Step6CommercialPricing() {
  const { state, updateFormData, setValidation } = useWizard();
  const { commercial, currency, availableFrom, commercialType, commercialSubtype } = state.formData;
  
  const {
    sizeSqm,
    rentPerSqm,
    pricingModel,
    serviceChargeMonthly,
    serviceChargePerSqm,
    serviceChargeIncludes,
    rentEscalationPercent,
    minLeaseMonths,
    maxLeaseYears,
    commercialPaymentFrequency,
    revenueSharePercent,
    baseRentPlusShare,
    depositMonthsCommercial,
    rentFreePeriodMonths,
    goodwillAmount,
  } = commercial;

  // Get flow configuration for this type/subtype
  const flowConfig = useMemo(() => {
    return getFlowConfig(commercialType, commercialSubtype);
  }, [commercialType, commercialSubtype]);

  // Build available pricing models based on flow config
  const availablePricingModels = useMemo(() => {
    const allowed = flowConfig?.availablePricingModels ?? ["per_sqm", "fixed"];
    
    // Build models list from allowed options
    const models: { id: string; label: string; description: string }[] = [];
    
    allowed.forEach((modelId) => {
      // Check if it's a standard model
      const standardModel = COMMERCIAL_PRICING_MODELS.find((m) => m.id === modelId);
      if (standardModel) {
        models.push({ ...standardModel });
      } else if (modelId === "per_unit") {
        // Add per_unit with dynamic description
        models.push({
          id: "per_unit",
          label: "Per Unit",
          description: getPricingUnitLabel(commercialSubtype),
        });
      }
    });
    
    return models;
  }, [flowConfig, commercialSubtype]);

  const [rentInputValue, setRentInputValue] = useState(
    formatAmount(pricingModel === "per_sqm" ? rentPerSqm : (rentPerSqm && sizeSqm ? rentPerSqm * sizeSqm : null))
  );

  // Calculate total monthly rent (memoized to prevent unnecessary recalculations)
  const monthlyRent = useMemo(() => {
    if (pricingModel === "per_sqm" && rentPerSqm && sizeSqm) {
      return rentPerSqm * sizeSqm;
    }
    return rentPerSqm || 0;
  }, [pricingModel, rentPerSqm, sizeSqm]);

  const totalMonthly = monthlyRent + (serviceChargeMonthly || 0);

  // Sync rentAmount with calculated monthly rent for fixed/per_unit pricing
  // This ensures the listing service has access to the rent value
  useEffect(() => {
    // Derive the calculated value inside the effect to avoid stale closure
    const calculatedRent = pricingModel === "per_sqm" && rentPerSqm && sizeSqm 
      ? rentPerSqm * sizeSqm 
      : rentPerSqm || 0;

    if (pricingModel === "fixed" || pricingModel === "per_unit") {
      // For fixed pricing, rentPerSqm is the actual fixed rent
      if (rentPerSqm && rentPerSqm > 0) {
        updateFormData({ rentAmount: rentPerSqm });
      }
    } else if (pricingModel === "per_sqm" && rentPerSqm && sizeSqm) {
      // For per_sqm, calculate total and store
      updateFormData({ rentAmount: calculatedRent });
    }
  }, [pricingModel, rentPerSqm, sizeSqm, updateFormData]);

  // Validation
  useEffect(() => {
    const errors: Record<string, string> = {};
    
    // Validate based on pricing model
    if (pricingModel === "revenue_share" || pricingModel === "turnover") {
      if (!revenueSharePercent || revenueSharePercent <= 0) {
        errors.revenueShare = "Please enter a valid revenue share percentage";
      }
    } else {
      if (!rentPerSqm || rentPerSqm <= 0) {
        errors.rentAmount = "Please enter a valid rent amount";
      }
    }

    if (!availableFrom) {
      errors.availableFrom = "Please select when the property is available";
    }

    setValidation(6, {
      isValid: Object.keys(errors).length === 0,
      errors,
      touched: {},
    });
  }, [rentPerSqm, revenueSharePercent, pricingModel, availableFrom, setValidation]);

  const updateCommercial = (data: Partial<typeof commercial>) => {
    updateFormData({
      commercial: { ...commercial, ...data },
    });
  };

  const toggleServiceChargeItem = (item: string) => {
    const current = serviceChargeIncludes || [];
    const isSelected = current.includes(item);
    
    updateCommercial({
      serviceChargeIncludes: isSelected
        ? current.filter((i) => i !== item)
        : [...current, item],
    });
  };

  const currencySymbol = CURRENCY_OPTIONS.find((c) => c.id === currency)?.symbol || "KSh";
  const today = new Date().toISOString().split("T")[0];

  // Get appropriate rent label based on pricing model
  const getRentLabel = () => {
    switch (pricingModel) {
      case "per_sqm":
        return "Rent per sqm";
      case "per_unit":
        return getPricingUnitLabel(commercialSubtype);
      case "revenue_share":
      case "turnover":
        return "Base Rent (if any)";
      default:
        return "Monthly Rent";
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Commercial Pricing
        </h2>
        <p className="text-gray-500">
          Rent, service charges, and lease terms
        </p>
      </div>

      <div className="space-y-6">
        {/* Pricing Model Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Rent</h3>
          </div>
          
          <div className="p-5 space-y-5">
            {/* Pricing Model Selection - Filtered based on type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Pricing Model
              </label>
              <div className={cn(
                "grid gap-2",
                availablePricingModels.length <= 2 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-4"
              )}>
                {availablePricingModels.map((model) => (
                  <button
                    key={model.id}
                    type="button"
                    onClick={() => updateCommercial({ pricingModel: model.id as PricingModelType })}
                    className={cn(
                      "p-3 rounded-lg border-2 text-left transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
                      pricingModel === model.id
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 hover:border-gray-300"
                    )}
                  >
                    <span className={cn(
                      "block text-sm font-medium",
                      pricingModel === model.id ? "text-teal-700" : "text-gray-900"
                    )}>
                      {model.label}
                    </span>
                    <span className="text-xs text-gray-500">{model.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Rent Amount */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {getRentLabel()} <span className="text-orange-500">*</span>
                </label>
                <div className="flex">
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => updateFormData({ currency: e.target.value })}
                      className="h-full px-3 py-2.5 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50 text-gray-700 font-medium appearance-none pr-8 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    >
                      {CURRENCY_OPTIONS.map((c) => (
                        <option key={c.id} value={c.id}>{c.label}</option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                  </div>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={rentInputValue}
                    onChange={(e) => {
                      const parsed = parseAmount(e.target.value);
                      updateCommercial({ rentPerSqm: parsed });
                      if (parsed !== null) {
                        setRentInputValue(formatAmount(parsed));
                      } else {
                        setRentInputValue("");
                      }
                    }}
                    placeholder={pricingModel === "per_sqm" ? "e.g., 1,500" : "e.g., 150,000"}
                    className="flex-1 px-4 py-2.5 rounded-r-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
                {pricingModel === "per_sqm" && (
                  <p className="text-xs text-gray-500 mt-1">
                    per sqm / month
                  </p>
                )}
              </div>

              {/* Calculated Total (for per sqm) */}
              {pricingModel === "per_sqm" && sizeSqm && rentPerSqm && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Total Monthly Rent
                  </label>
                  <div className="px-4 py-3 bg-teal-50 rounded-lg border border-teal-200">
                    <span className="text-lg font-semibold text-teal-700">
                      {currencySymbol} {formatAmount(monthlyRent)}
                    </span>
                    <span className="text-sm text-teal-600 ml-2">
                      ({sizeSqm} sqm × {currencySymbol} {formatAmount(rentPerSqm)})
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Revenue Share (for revenue_share model) */}
            {(pricingModel === "revenue_share" || pricingModel === "turnover") && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Revenue Share %
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      value={revenueSharePercent || ""}
                      onChange={(e) => updateCommercial({ revenueSharePercent: parseFloat(e.target.value) || null })}
                      placeholder="e.g., 8"
                      className="w-full px-4 py-2.5 pr-10 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">%</span>
                  </div>
                </div>
                <div className="flex items-end">
                  <label className={cn(
                    "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-all w-full",
                    baseRentPlusShare
                      ? "border-teal-600 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}>
                    <input
                      type="checkbox"
                      checked={baseRentPlusShare}
                      onChange={(e) => updateCommercial({ baseRentPlusShare: e.target.checked })}
                      className="w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Base Rent + % of Revenue
                    </span>
                  </label>
                </div>
              </div>
            )}

            {/* Payment Frequency */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Payment Frequency
              </label>
              <div className="flex flex-wrap gap-2">
                {COMMERCIAL_PAYMENT_FREQUENCIES.map((freq) => (
                  <button
                    key={freq.id}
                    type="button"
                    onClick={() => updateCommercial({ commercialPaymentFrequency: freq.id as CommercialPaymentFrequency })}
                    className={cn(
                      "px-4 py-2 rounded-lg border-2 text-sm font-medium transition-all",
                      commercialPaymentFrequency === freq.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    )}
                  >
                    {freq.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Service Charge Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Service Charge</h3>
          </div>
          
          <div className="p-5 space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Service Charge
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatAmount(serviceChargeMonthly)}
                    onChange={(e) => updateCommercial({ serviceChargeMonthly: parseAmount(e.target.value) })}
                    placeholder="e.g., 15,000"
                    className="w-full pl-14 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Or per sqm
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                    {currencySymbol}
                  </span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={formatAmount(serviceChargePerSqm)}
                    onChange={(e) => updateCommercial({ serviceChargePerSqm: parseAmount(e.target.value) })}
                    placeholder="e.g., 100"
                    className="w-full pl-14 pr-16 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 text-sm">
                    /sqm
                  </span>
                </div>
              </div>
            </div>

            {/* Service Charge Includes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Service Charge Includes
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {SERVICE_CHARGE_ITEMS.map((item) => {
                  const isSelected = (serviceChargeIncludes || []).includes(item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleServiceChargeItem(item.id)}
                      className={cn(
                        "px-3 py-2 rounded-lg border text-left text-sm transition-all",
                        isSelected
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      )}
                    >
                      {item.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Total Monthly Cost */}
            {(monthlyRent > 0 || (serviceChargeMonthly || 0) > 0) && (
              <div className="pt-4 border-t border-gray-200">
                <div className="flex justify-between items-center">
                  <span className="font-medium text-gray-700">Total Monthly Cost</span>
                  <span className="text-xl font-bold text-gray-900">
                    {currencySymbol} {formatAmount(totalMonthly)}
                  </span>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* Deposit & Terms Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Deposit & Lease Terms</h3>
          </div>
          
          <div className="p-5 space-y-5">
            {/* Deposit */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Security Deposit (months)
                </label>
                <div className="flex gap-2">
                  {[1, 2, 3, 6].map((months) => (
                    <button
                      key={months}
                      type="button"
                      onClick={() => updateCommercial({ depositMonthsCommercial: months })}
                      className={cn(
                        "flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                        depositMonthsCommercial === months
                          ? "border-teal-600 bg-teal-50 text-teal-700"
                          : "border-gray-200 hover:border-gray-300 text-gray-700"
                      )}
                    >
                      {months}
                    </button>
                  ))}
                </div>
                {monthlyRent > 0 && (
                  <p className="text-sm text-gray-500 mt-2">
                    Deposit: {currencySymbol} {formatAmount(monthlyRent * depositMonthsCommercial)}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rent-Free Period (months)
                </label>
                <input
                  type="number"
                  value={rentFreePeriodMonths || ""}
                  onChange={(e) => updateCommercial({ rentFreePeriodMonths: parseInt(e.target.value) || null })}
                  placeholder="e.g., 2"
                  min="0"
                  max="12"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
                <p className="text-xs text-gray-500 mt-1">For fit-out period</p>
              </div>
            </div>

            {/* Lease Duration */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Lease (months)
                </label>
                <input
                  type="number"
                  value={minLeaseMonths || ""}
                  onChange={(e) => updateCommercial({ minLeaseMonths: parseInt(e.target.value) || null })}
                  placeholder="e.g., 12"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Lease (years)
                </label>
                <input
                  type="number"
                  value={maxLeaseYears || ""}
                  onChange={(e) => updateCommercial({ maxLeaseYears: parseInt(e.target.value) || null })}
                  placeholder="e.g., 5"
                  className="w-full px-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>

            {/* Rent Escalation */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Annual Rent Escalation
              </label>
              <div className="flex gap-2">
                {[0, 5, 7.5, 10].map((percent) => (
                  <button
                    key={percent}
                    type="button"
                    onClick={() => updateCommercial({ rentEscalationPercent: percent })}
                    className={cn(
                      "flex-1 py-2.5 rounded-lg border-2 text-sm font-medium transition-all",
                      rentEscalationPercent === percent
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 hover:border-gray-300 text-gray-700"
                    )}
                  >
                    {percent === 0 ? "None" : `${percent}%`}
                  </button>
                ))}
              </div>
            </div>

            {/* Goodwill (for retail/F&B) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Goodwill / Key Money (if applicable)
              </label>
              <div className="relative max-w-sm">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 font-medium">
                  {currencySymbol}
                </span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={formatAmount(goodwillAmount)}
                  onChange={(e) => updateCommercial({ goodwillAmount: parseAmount(e.target.value) })}
                  placeholder="One-time payment"
                  className="w-full pl-14 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
              <p className="text-xs text-gray-500 mt-1">One-time fee for established location</p>
            </div>
          </div>
        </section>

        {/* Availability Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Availability</h3>
          </div>
          
          <div className="p-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available From <span className="text-orange-500">*</span>
              </label>
              <div className="relative max-w-xs">
                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="date"
                  value={availableFrom || ""}
                  onChange={(e) => updateFormData({ availableFrom: e.target.value })}
                  min={today}
                  className="w-full pl-12 pr-4 py-2.5 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-teal-600"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
