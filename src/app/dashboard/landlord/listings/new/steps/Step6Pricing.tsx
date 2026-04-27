/**
 * Step 6: Pricing & Availability
 * 
 * Comprehensive pricing setup including rent, deposit, fees,
 * lease terms, and Kenya-specific payment methods.
 * 
 * OPTIMIZED: Cleaner copy, teal accents
 * REFACTORED: Uses useResidentialForm hook for standardized validation
 */

"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { 
  ChevronDown, 
  Calendar,
  Info,
  CreditCard,
  Smartphone,
  Building,
  Plus,
  X,
  FileText,
  Banknote,
} from "lucide-react";
import { useResidentialForm } from "../hooks";
import { formatAmount, parseAmount } from "../utils";
import { 
  LEASE_TERMS, 
  PAYMENT_METHODS,
  type LeaseTermType,
  type CustomFee,
} from "../types";

const CURRENCY_OPTIONS = [
  { id: "KES", label: "KES", symbol: "KSh" },
  { id: "USD", label: "USD", symbol: "$" },
];

export function Step6Pricing() {
  // Use shared hook for standardized state management & validation
  const { formData, updateFields, isRequired } = useResidentialForm(6);
  const { 
    rentAmount,
    currency,
    depositMonths,
    depositAmount,
    agentFee,
    agentFeeType,
    leaseTerm,
    minLeaseDuration,
    availableFrom,
    paymentMethods,
    rentIncludes,
    customFees,
  } = formData;

  // Local state for UI-specific behavior
  const [showCustomDeposit, setShowCustomDeposit] = useState(false);
  const [rentInputValue, setRentInputValue] = useState(formatAmount(rentAmount));
  const [showAddFee, setShowAddFee] = useState(false);
  const [newFeeName, setNewFeeName] = useState("");
  const [newFeeAmount, setNewFeeAmount] = useState("");
  const [newFeeAmountType, setNewFeeAmountType] = useState<"fixed" | "percentage">("fixed");
  const [newFeeFrequency, setNewFeeFrequency] = useState<"monthly" | "once">("once");

  // Calculate deposit based on months
  const calculatedDeposit = rentAmount ? rentAmount * (depositMonths || 1) : 0;

  // Note: Validation is now handled automatically by useResidentialForm hook

  // Handle rent amount input with live formatting
  const handleRentChange = (value: string) => {
    const parsed = parseAmount(value);
    updateFields({ rentAmount: parsed });
    // Format as user types
    if (parsed !== null) {
      setRentInputValue(formatAmount(parsed));
    } else {
      setRentInputValue("");
    }
  };

  const togglePaymentMethod = (methodId: string) => {
    const current = paymentMethods || [];
    const isSelected = current.includes(methodId);
    
    updateFields({
      paymentMethods: isSelected
        ? current.filter((m) => m !== methodId)
        : [...current, methodId],
    });
  };

  const toggleRentIncludes = (item: string) => {
    const current = rentIncludes || [];
    const isSelected = current.includes(item);
    
    updateFields({
      rentIncludes: isSelected
        ? current.filter((i) => i !== item)
        : [...current, item],
    });
  };

  // Add custom fee
  const handleAddFee = () => {
    if (!newFeeName.trim() || !newFeeAmount) return;
    
    const amount = parseAmount(newFeeAmount);
    if (!amount) return;

    const newFee: CustomFee = {
      id: `fee-${Date.now()}`,
      name: newFeeName.trim(),
      amount,
      amountType: newFeeAmountType,
      frequency: newFeeFrequency,
    };

    updateFields({
      customFees: [...(customFees || []), newFee],
    });

    // Reset form
    setNewFeeName("");
    setNewFeeAmount("");
    setNewFeeAmountType("fixed");
    setNewFeeFrequency("once");
    setShowAddFee(false);
  };

  // Remove custom fee
  const handleRemoveFee = (feeId: string) => {
    updateFields({
      customFees: (customFees || []).filter((f) => f.id !== feeId),
    });
  };

  // What's NOT included (opposite of rentIncludes)
  const UTILITY_OPTIONS = [
    { id: "water", label: "Water", description: "Tenant pays separately" },
    { id: "electricity", label: "Electricity", description: "Tenant pays KPLC directly" },
    { id: "internet", label: "Internet", description: "Tenant arranges own connection" },
    { id: "garbage", label: "Garbage Collection", description: "Included in service charge or paid separately" },
    { id: "security", label: "Security Levy", description: "Monthly security contribution" },
    { id: "parking", label: "Parking", description: "Separate parking fee applies" },
  ];

  const currencySymbol = CURRENCY_OPTIONS.find((c) => c.id === currency)?.symbol || "KSh";

  // Get min date for availability (today)
  const today = new Date().toISOString().split("T")[0];

  // Get payment method icon
  const getPaymentIcon = (methodId: string) => {
    switch (methodId) {
      case "mpesa":
      case "airtel":
        return <Smartphone className="w-5 h-5" />;
      case "bank":
        return <Building className="w-5 h-5" />;
      case "cheque":
        return <FileText className="w-5 h-5" />;
      case "cash":
        return <Banknote className="w-5 h-5" />;
      default:
        return <CreditCard className="w-5 h-5" />;
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Set your price
        </h2>
        <p className="text-gray-500">
          Rent, deposit, and when it's available
        </p>
      </div>

      <div className="space-y-6">
        {/* Monthly Rent Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Monthly Rent</h3>
          </div>
          
          <div className="p-5 space-y-6">
            {/* Rent Amount */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Rent Amount <span className="text-orange-500">*</span>
              </label>
              <div className="flex">
                {/* Currency Selector */}
                <div className="relative">
                  <select
                    value={currency}
                    onChange={(e) => updateFields({ currency: e.target.value })}
                    className={cn(
                      "h-full px-3 py-2.5 rounded-l-lg border border-r-0 border-gray-300 bg-gray-50",
                      "text-gray-700 font-medium appearance-none pr-8",
                      "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent focus:z-10"
                    )}
                  >
                    {CURRENCY_OPTIONS.map((c) => (
                      <option key={c.id} value={c.id}>{c.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>

                {/* Amount Input */}
                <input
                  type="text"
                  inputMode="numeric"
                  value={rentInputValue}
                  onChange={(e) => handleRentChange(e.target.value)}
                  placeholder="e.g., 45,000"
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-r-lg border border-gray-300 bg-white",
                    "text-gray-900 placeholder:text-gray-400 text-lg font-medium",
                    "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  )}
                />
              </div>
              {rentAmount && (
                <p className="text-sm text-gray-500 mt-1.5">
                  {currencySymbol} {formatAmount(rentAmount)} per month
                </p>
              )}
            </div>

            {/* What's Included/Not Included */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                What&apos;s included in rent?
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Select utilities that are included. Unselected items will be paid separately by tenant.
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {UTILITY_OPTIONS.map((item) => {
                  const isIncluded = (rentIncludes || []).includes(item.label);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => toggleRentIncludes(item.label)}
                      className={cn(
                        "px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                        "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1",
                        isIncluded
                          ? "bg-teal-100 text-teal-700 border-2 border-teal-400"
                          : "bg-gray-100 text-gray-600 border-2 border-transparent hover:bg-gray-200"
                      )}
                    >
                      <span className="block">{item.label}</span>
                      <span className={cn(
                        "text-xs mt-0.5 block",
                        isIncluded ? "text-teal-600" : "text-gray-400"
                      )}>
                        {isIncluded ? "Included" : "Not included"}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* Deposit & Fees Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Deposit & Fees</h3>
          </div>
          
          <div className="p-5 space-y-6">
            {/* Security Deposit */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Security Deposit
              </label>
              
              {/* Deposit Months */}
              <div className="grid grid-cols-4 gap-2 mb-3">
                {[1, 2, 3].map((months) => (
                  <button
                    key={months}
                    type="button"
                    onClick={() => {
                      updateFields({ depositMonths: months });
                      setShowCustomDeposit(false);
                    }}
                    className={cn(
                      "px-3 py-2.5 rounded-lg border-2 text-center transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1",
                      depositMonths === months && !showCustomDeposit
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="text-sm font-medium">{months} Month{months > 1 ? "s" : ""}</span>
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => setShowCustomDeposit(true)}
                  className={cn(
                    "px-3 py-2.5 rounded-lg border-2 text-center transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1",
                    showCustomDeposit
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  )}
                >
                  <span className="text-sm font-medium">Custom</span>
                </button>
              </div>

              {/* Custom Deposit Input */}
              {showCustomDeposit ? (
                <div className="flex items-center gap-2">
                  <span className="text-gray-600">{currencySymbol}</span>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={depositAmount ? formatAmount(depositAmount) : ""}
                    onChange={(e) => updateFields({ 
                      depositAmount: parseAmount(e.target.value)
                    })}
                    placeholder="Enter custom amount"
                    className={cn(
                      "flex-1 px-4 py-2 rounded-lg border border-gray-300 bg-white",
                      "text-gray-900 placeholder:text-gray-400",
                      "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                    )}
                  />
                </div>
              ) : rentAmount ? (
                <p className="text-sm text-gray-600">
                  = {currencySymbol} {formatAmount(calculatedDeposit)}
                </p>
              ) : null}
            </div>

            {/* Agent/Service Fee */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Agent/Service Fee
                <span className="text-gray-400 font-normal ml-1">(Optional)</span>
              </label>
              <div className="flex gap-3">
                <input
                  type="text"
                  inputMode="numeric"
                  value={agentFee ? formatAmount(agentFee) : ""}
                  onChange={(e) => updateFields({ 
                    agentFee: parseAmount(e.target.value)
                  })}
                  placeholder="Amount"
                  className={cn(
                    "flex-1 px-4 py-2.5 rounded-lg border border-gray-300 bg-white",
                    "text-gray-900 placeholder:text-gray-400",
                    "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                  )}
                />
                <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                  <button
                    type="button"
                    onClick={() => updateFields({ agentFeeType: "fixed" })}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium transition-colors",
                      agentFeeType === "fixed"
                        ? "bg-teal-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    {currencySymbol}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateFields({ agentFeeType: "percentage" })}
                    className={cn(
                      "px-4 py-2.5 text-sm font-medium transition-colors border-l border-gray-300",
                      agentFeeType === "percentage"
                        ? "bg-teal-600 text-white"
                        : "bg-white text-gray-600 hover:bg-gray-50"
                    )}
                  >
                    %
                  </button>
                </div>
              </div>
              {agentFee && agentFeeType === "percentage" && rentAmount && (
                <p className="text-sm text-gray-500 mt-1.5">
                  = {currencySymbol} {formatAmount(Math.round(rentAmount * agentFee / 100))}
                </p>
              )}
            </div>

            {/* Custom Fees */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Other Fees
                  <span className="text-gray-400 font-normal ml-1">(Optional)</span>
                </label>
                <button
                  type="button"
                  onClick={() => setShowAddFee(true)}
                  className="text-sm text-teal-600 hover:text-teal-700 font-medium flex items-center gap-1"
                >
                  <Plus className="w-4 h-4" />
                  Add Fee
                </button>
              </div>

              {/* Existing Custom Fees */}
              {(customFees || []).length > 0 && (
                <div className="space-y-2 mb-3">
                  {(customFees || []).map((fee) => {
                    const displayAmount = fee.amountType === "percentage" && rentAmount
                      ? Math.round(rentAmount * fee.amount / 100)
                      : fee.amount;
                    
                    return (
                      <div 
                        key={fee.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                      >
                        <div>
                          <span className="font-medium text-gray-900">{fee.name}</span>
                          <span className="text-sm text-gray-500 ml-2">
                            ({fee.frequency === "monthly" ? "Monthly" : "One-time"})
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <span className="font-medium text-gray-900">
                              {fee.amountType === "percentage" 
                                ? `${fee.amount}% of rent`
                                : `${currencySymbol} ${formatAmount(fee.amount)}`
                              }
                            </span>
                            {fee.amountType === "percentage" && rentAmount && (
                              <span className="text-sm text-gray-500 block">
                                = {currencySymbol} {formatAmount(displayAmount)}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveFee(fee.id)}
                            className="text-gray-400 hover:text-red-500 transition-colors"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Add Fee Form */}
              {showAddFee && (
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
                  <input
                    type="text"
                    value={newFeeName}
                    onChange={(e) => setNewFeeName(e.target.value)}
                    placeholder="Fee name (e.g., Service Charge, Legal Fee)"
                    className={cn(
                      "w-full px-3 py-2 rounded-lg border border-gray-300 bg-white",
                      "text-gray-900 placeholder:text-gray-400 text-sm",
                      "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                    )}
                  />
                  <div className="flex gap-2">
                    <div className="flex-1 flex gap-2">
                      <input
                        type="text"
                        inputMode="numeric"
                        value={newFeeAmount}
                        onChange={(e) => setNewFeeAmount(e.target.value)}
                        placeholder={newFeeAmountType === "percentage" ? "e.g., 10" : "Amount"}
                        className={cn(
                          "flex-1 px-3 py-2 rounded-lg border border-gray-300 bg-white",
                          "text-gray-900 placeholder:text-gray-400 text-sm",
                          "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                        )}
                      />
                      {/* Fixed / Percentage Toggle */}
                      <div className="flex rounded-lg border border-gray-300 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => setNewFeeAmountType("fixed")}
                          className={cn(
                            "px-3 py-2 text-sm font-medium transition-colors",
                            newFeeAmountType === "fixed"
                              ? "bg-teal-600 text-white"
                              : "bg-white text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          {currencySymbol}
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewFeeAmountType("percentage")}
                          className={cn(
                            "px-3 py-2 text-sm font-medium transition-colors border-l border-gray-300",
                            newFeeAmountType === "percentage"
                              ? "bg-teal-600 text-white"
                              : "bg-white text-gray-600 hover:bg-gray-50"
                          )}
                        >
                          %
                        </button>
                      </div>
                    </div>
                    <select
                      value={newFeeFrequency}
                      onChange={(e) => setNewFeeFrequency(e.target.value as "monthly" | "once")}
                      className="px-3 py-2 rounded-lg border border-gray-300 bg-white text-sm"
                    >
                      <option value="once">One-time</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  {/* Preview calculated amount for percentage */}
                  {newFeeAmountType === "percentage" && newFeeAmount && rentAmount && (
                    <p className="text-sm text-gray-500">
                      = {currencySymbol} {formatAmount(Math.round(rentAmount * parseAmount(newFeeAmount)! / 100))} ({newFeeAmount}% of {currencySymbol} {formatAmount(rentAmount)})
                    </p>
                  )}
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleAddFee}
                      disabled={!newFeeName.trim() || !newFeeAmount}
                      className={cn(
                        "px-4 py-2 rounded-lg text-sm font-medium transition-colors",
                        newFeeName.trim() && newFeeAmount
                          ? "bg-teal-600 text-white hover:bg-teal-700"
                          : "bg-gray-200 text-gray-400 cursor-not-allowed"
                      )}
                    >
                      Add
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowAddFee(false);
                        setNewFeeName("");
                        setNewFeeAmount("");
                        setNewFeeAmountType("fixed");
                      }}
                      className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Lease Terms Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">Lease Terms</h3>
          </div>
          
          <div className="p-5 space-y-6">
            {/* Lease Type */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Lease Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                {LEASE_TERMS.map((term) => (
                  <button
                    key={term.id}
                    type="button"
                    onClick={() => updateFields({ leaseTerm: term.id as LeaseTermType })}
                    className={cn(
                      "px-4 py-3 rounded-lg border-2 text-center transition-all",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1",
                      leaseTerm === term.id
                        ? "border-teal-600 bg-teal-50 text-teal-700"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    )}
                  >
                    <span className="block font-medium text-sm">{term.label}</span>
                    <span className="text-xs text-gray-500">{term.description}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Min Lease Duration */}
            {leaseTerm === "fixed" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Minimum Lease Duration
                </label>
                <div className="relative w-48">
                  <select
                    value={minLeaseDuration || 12}
                    onChange={(e) => updateFields({ 
                      minLeaseDuration: parseInt(e.target.value) 
                    })}
                    className={cn(
                      "w-full px-4 py-2.5 rounded-lg border border-gray-300 bg-white appearance-none",
                      "text-gray-900",
                      "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent"
                    )}
                  >
                    <option value={6}>6 months</option>
                    <option value={12}>12 months (1 year)</option>
                    <option value={18}>18 months</option>
                    <option value={24}>24 months (2 years)</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
            )}

            {/* Available From */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Available From <span className="text-orange-500">*</span>
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => updateFields({ availableFrom: today })}
                  className={cn(
                    "px-4 py-2.5 rounded-lg border-2 transition-all",
                    "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1",
                    availableFrom === today
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                  )}
                >
                  <span className="font-medium text-sm">Immediately</span>
                </button>
                
                <div className="relative flex-1 max-w-xs">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                  <input
                    type="date"
                    value={availableFrom && availableFrom !== today ? availableFrom : ""}
                    onChange={(e) => updateFields({ availableFrom: e.target.value })}
                    min={today}
                    className={cn(
                      "w-full pl-10 pr-4 py-2.5 rounded-lg border-2 bg-white",
                      "text-gray-900",
                      "focus:outline-none focus:ring-2 focus:ring-teal-600 focus:border-transparent",
                      availableFrom && availableFrom !== today
                        ? "border-teal-600"
                        : "border-gray-200"
                    )}
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Payment Methods Section */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 bg-gray-50 border-b border-gray-200">
            <h3 className="font-semibold text-gray-900">
              Accepted Payment Methods <span className="text-orange-500">*</span>
            </h3>
          </div>
          
          <div className="p-5">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              {PAYMENT_METHODS.map((method) => {
                const isSelected = (paymentMethods || []).includes(method.id);
                
                return (
                  <button
                    key={method.id}
                    type="button"
                    onClick={() => togglePaymentMethod(method.id)}
                    className={cn(
                      "px-3 py-3 rounded-lg border-2 text-center transition-all",
                      "flex flex-col items-center gap-2",
                      "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 focus-visible:ring-offset-1",
                      isSelected
                        ? "border-teal-600 bg-teal-50"
                        : "border-gray-200 bg-white hover:border-gray-300"
                    )}
                  >
                    <span className={cn(
                      isSelected ? "text-teal-600" : "text-gray-400"
                    )}>
                      {getPaymentIcon(method.id)}
                    </span>
                    <span className={cn(
                      "text-sm font-medium",
                      isSelected ? "text-teal-700" : "text-gray-700"
                    )}>
                      {method.label}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* M-Pesa Info */}
            {(paymentMethods || []).includes("mpesa") && (
              <div className="mt-4 p-3 bg-green-50 rounded-lg flex gap-2">
                <Info className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-green-700">
                  M-Pesa is the most popular payment method in Kenya. 
                  MitaSafi can help automate rent collection via M-Pesa.
                </p>
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
