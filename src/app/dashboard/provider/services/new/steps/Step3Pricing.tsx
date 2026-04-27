/**
 * Step 3: Pricing & Review
 * 
 * Provider sets custom pricing for each selected service.
 * Final review before submission.
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { useWizard } from "../context";
import { PRICE_TYPES, type PriceType } from "../types";

export function Step3Pricing() {
  const { state, updateService } = useWizard();
  const { formData, errors } = state;
  const [showBulkOption, setShowBulkOption] = useState(formData.selectedServices.length > 3);
  const [bulkPriceType, setBulkPriceType] = useState<PriceType | null>(null);
  const [bulkPrice, setBulkPrice] = useState<string>("");

  const handlePriceChange = (serviceId: string, price: string) => {
    const numericPrice = price === "" ? null : parseFloat(price);
    updateService(serviceId, { customPrice: numericPrice });
  };

  const handlePriceTypeChange = (serviceId: string, priceType: PriceType) => {
    updateService(serviceId, { 
      priceType,
      // Clear price if switching to quote
      customPrice: priceType === "quote" ? null : formData.selectedServices.find(s => s.serviceId === serviceId)?.customPrice || null,
    });
  };

  const applyBulkPricing = () => {
    if (!bulkPriceType) return;
    
    formData.selectedServices.forEach(service => {
      updateService(service.serviceId, {
        priceType: bulkPriceType,
        customPrice: bulkPriceType === "quote" ? null : (bulkPrice ? parseFloat(bulkPrice) : null),
      });
    });
    
    setShowBulkOption(false);
  };

  if (formData.selectedServices.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No services selected. Please go back and select services.</p>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-1">
          Set your prices
        </h2>
        <p className="text-gray-500 text-sm">
          Customers will see this before they contact you.
        </p>
      </div>

      {/* Bulk Pricing Option */}
      {showBulkOption && formData.selectedServices.length > 3 && (
        <div className="mb-6 p-4 bg-teal-50 border border-teal-200 rounded-lg">
          <p className="text-sm font-medium text-gray-900 mb-3">
            Use the same pricing style for all services?
          </p>
          <div className="flex flex-wrap gap-2 mb-3">
            {PRICE_TYPES.map((type) => (
              <button
                key={type.id}
                onClick={() => setBulkPriceType(type.id)}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md border transition-colors",
                  bulkPriceType === type.id
                    ? "border-teal-600 bg-teal-100 text-teal-700"
                    : "border-gray-300 bg-white text-gray-600 hover:border-gray-400"
                )}
              >
                {type.label}
              </button>
            ))}
          </div>
          {bulkPriceType && bulkPriceType !== "quote" && (
            <input
              type="number"
              min="0"
              step="100"
              placeholder="e.g. 3,000"
              value={bulkPrice}
              onChange={(e) => setBulkPrice(e.target.value)}
              className="w-full max-w-xs px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3 focus:outline-none focus:ring-2 focus:ring-teal-500"
            />
          )}
          <div className="flex gap-2">
            <button
              onClick={applyBulkPricing}
              disabled={!bulkPriceType}
              className={cn(
                "px-4 py-2 text-sm font-medium rounded-lg transition-colors",
                bulkPriceType
                  ? "bg-teal-600 text-white hover:bg-teal-700"
                  : "bg-gray-200 text-gray-400 cursor-not-allowed"
              )}
            >
              Apply to all
            </button>
            <button
              onClick={() => setShowBulkOption(false)}
              className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
            >
              No, set one by one
            </button>
          </div>
        </div>
      )}

      {/* Services Pricing List */}
      <div className="space-y-4">
        {formData.selectedServices.map((service, index) => {
          const priceError = errors[`price_${index}`];
          return (
            <div
              key={service.serviceId}
              className="p-4 border border-gray-200 rounded-lg bg-white"
            >
              {/* Service Header */}
              <div className="mb-4">
                <h3 className="font-medium text-gray-900">{service.serviceName}</h3>
                <p className="text-xs text-gray-500">
                  {service.categoryName} → {service.subcategoryName}
                </p>
              </div>

              {/* Price Type Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Pricing Type
                </label>
                <div className="space-y-2">
                  {PRICE_TYPES.map((type) => {
                    const isSelected = service.priceType === type.id;
                    return (
                      <label
                        key={type.id}
                        className={cn(
                          "flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all",
                          "hover:border-gray-300",
                          isSelected
                            ? "border-teal-600 bg-teal-50"
                            : "border-gray-200 bg-white"
                        )}
                      >
                        <input
                          type="radio"
                          name={`pricing-${service.serviceId}`}
                          checked={isSelected}
                          onChange={() => handlePriceTypeChange(service.serviceId, type.id)}
                          className="mt-0.5 w-4 h-4 text-teal-600 border-gray-300 focus:ring-teal-500"
                        />
                        <div className="ml-3 flex-1">
                          <p className={cn(
                            "font-medium text-sm",
                            isSelected ? "text-teal-900" : "text-gray-900"
                          )}>
                            {type.label}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {type.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Price Input (hidden for quote type) */}
              {service.priceType !== "quote" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (KES)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="e.g. 3,000"
                    value={service.customPrice ?? ""}
                    onChange={(e) => handlePriceChange(service.serviceId, e.target.value)}
                    className={cn(
                      "w-full max-w-xs px-3 py-2 border rounded-lg text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent",
                      priceError ? "border-red-300" : "border-gray-300"
                    )}
                  />
                  {priceError && (
                    <p className="mt-1 text-sm text-red-600">{priceError}</p>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-8 p-4 bg-gray-50 rounded-lg">
        <h4 className="font-medium text-gray-900 mb-2">Summary</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>
            <span className="font-medium">{formData.selectedServices.length}</span> service{formData.selectedServices.length !== 1 ? "s" : ""} will be added to your profile
          </li>
          <li>
            Category: <span className="font-medium">{formData.selectedServices[0]?.categoryName}</span>
          </li>
          <li>
            Subcategory: <span className="font-medium">{formData.selectedServices[0]?.subcategoryName}</span>
          </li>
        </ul>
      </div>
    </div>
  );
}
