/**
 * Record Payment Modal
 * 
 * Modal for recording a rent payment manually.
 * Used in unit detail and tenant detail pages.
 */

"use client";

import { useState, useEffect } from "react";
import {
  X,
  Calendar,
  DollarSign,
  CreditCard,
  FileText,
  CheckCircle,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (payment: PaymentData) => Promise<void>;
  tenantName: string;
  unitNumber: string;
  expectedAmount: number;
  forMonth?: string; // e.g., "January 2025"
}

interface PaymentData {
  amount: number;
  payment_date: string;
  payment_method: "mpesa" | "bank_transfer" | "cash" | "cheque";
  reference: string;
  for_month: string;
  notes: string;
}

const PAYMENT_METHODS = [
  { value: "mpesa", label: "M-Pesa", description: "Mobile money transfer" },
  { value: "bank_transfer", label: "Bank Transfer", description: "Direct bank deposit" },
  { value: "cash", label: "Cash", description: "Cash payment" },
  { value: "cheque", label: "Cheque", description: "Bank cheque" },
];

// Generate month options for the last 3 months and current month
function getMonthOptions(): { value: string; label: string }[] {
  const options = [];
  const now = new Date();
  
  for (let i = 0; i < 4; i++) {
    const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: date.toISOString().slice(0, 7), // YYYY-MM format
      label: date.toLocaleDateString("en-KE", { month: "long", year: "numeric" }),
    });
  }
  
  return options;
}

export function RecordPaymentModal({
  isOpen,
  onClose,
  onSubmit,
  tenantName,
  unitNumber,
  expectedAmount,
  forMonth,
}: RecordPaymentModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState<PaymentData>({
    amount: expectedAmount,
    payment_date: new Date().toISOString().split("T")[0],
    payment_method: "mpesa",
    reference: "",
    for_month: forMonth || getMonthOptions()[0].value,
    notes: "",
  });
  const [errors, setErrors] = useState<Partial<Record<keyof PaymentData, string>>>({});

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setFormData({
        amount: expectedAmount,
        payment_date: new Date().toISOString().split("T")[0],
        payment_method: "mpesa",
        reference: "",
        for_month: forMonth || getMonthOptions()[0].value,
        notes: "",
      });
      setErrors({});
    }
  }, [isOpen, expectedAmount, forMonth]);

  // Update field
  const updateField = <K extends keyof PaymentData>(field: K, value: PaymentData[K]) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Validate
  const validate = (): boolean => {
    const newErrors: Partial<Record<keyof PaymentData, string>> = {};

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = "Enter a valid amount";
    }
    if (!formData.payment_date) {
      newErrors.payment_date = "Payment date is required";
    }
    if (!formData.payment_method) {
      newErrors.payment_method = "Select a payment method";
    }
    if (!formData.reference.trim()) {
      newErrors.reference = "Reference/confirmation code is required";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle submit
  const handleSubmit = async () => {
    if (!validate()) return;

    setIsSubmitting(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (error) {
      console.error("Error recording payment:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const monthOptions = getMonthOptions();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Record Payment</h3>
            <p className="text-sm text-gray-500">
              {tenantName} • Unit {unitNumber}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Amount (KES) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-gray-500">
                KES
              </span>
              <input
                type="number"
                value={formData.amount}
                onChange={(e) => updateField("amount", parseFloat(e.target.value) || 0)}
                className={cn(
                  "w-full pl-12 pr-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-lg font-semibold",
                  errors.amount ? "border-red-300" : "border-gray-200"
                )}
              />
            </div>
            {errors.amount && <p className="mt-1 text-sm text-red-600">{errors.amount}</p>}
            {formData.amount !== expectedAmount && (
              <p className="mt-1 text-xs text-yellow-600">
                Expected: KES {expectedAmount.toLocaleString()}
              </p>
            )}
          </div>

          {/* For Month */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Payment For
            </label>
            <select
              value={formData.for_month}
              onChange={(e) => updateField("for_month", e.target.value)}
              className="w-full appearance-none px-4 py-2.5 border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
            >
              {monthOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Payment Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Payment Date <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="date"
                value={formData.payment_date}
                onChange={(e) => updateField("payment_date", e.target.value)}
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                  errors.payment_date ? "border-red-300" : "border-gray-200"
                )}
              />
            </div>
            {errors.payment_date && (
              <p className="mt-1 text-sm text-red-600">{errors.payment_date}</p>
            )}
          </div>

          {/* Payment Method */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Payment Method <span className="text-red-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              {PAYMENT_METHODS.map((method) => (
                <button
                  key={method.value}
                  type="button"
                  onClick={() => updateField("payment_method", method.value as PaymentData["payment_method"])}
                  className={cn(
                    "p-3 text-left border rounded-xl transition-all",
                    formData.payment_method === method.value
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  )}
                >
                  <span className="text-sm font-medium text-gray-900">{method.label}</span>
                </button>
              ))}
            </div>
            {errors.payment_method && (
              <p className="mt-1 text-sm text-red-600">{errors.payment_method}</p>
            )}
          </div>

          {/* Reference */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Reference / Confirmation Code <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={formData.reference}
                onChange={(e) => updateField("reference", e.target.value.toUpperCase())}
                placeholder={
                  formData.payment_method === "mpesa"
                    ? "e.g., RGD456XYZA"
                    : formData.payment_method === "bank_transfer"
                    ? "e.g., Bank reference number"
                    : "e.g., Receipt number"
                }
                className={cn(
                  "w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500",
                  errors.reference ? "border-red-300" : "border-gray-200"
                )}
              />
            </div>
            {errors.reference && (
              <p className="mt-1 text-sm text-red-600">{errors.reference}</p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Notes (Optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => updateField("notes", e.target.value)}
              rows={2}
              placeholder="Any additional notes..."
              className="w-full px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isSubmitting}
              className="flex-1 px-4 py-2.5 text-gray-600 font-medium hover:text-gray-900 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Record Payment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
