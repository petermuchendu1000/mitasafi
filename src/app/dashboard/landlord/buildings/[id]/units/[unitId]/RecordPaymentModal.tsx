"use client";

/**
 * Recording a payment against the lease.
 *
 * WHAT THIS REPLACES
 *   A modal reading "Payment recording form coming soon..." with a Save button
 *   that closed it and did nothing. Every rent figure on the landlord
 *   dashboard — the overview tile, the building Finances tab, the arrears
 *   table, the rent page — is computed from confirmed rent payments, and
 *   before this there was no way to create one through the product.
 *
 * THE MONTH FIELD IS NOT THE DATE FIELD
 *   `payment_date` is when the money arrived; the period is which month's rent
 *   it settles. They are routinely different, so the form asks for both and
 *   says why. A deposit has no period, so the field disappears for one.
 */

import { useState, useTransition } from "react";
import { X, AlertCircle, Loader2, Receipt } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildPayment,
  PAYMENT_TYPE_VALUES,
  PAYMENT_TYPE_LABELS,
  PAYMENT_METHOD_VALUES,
  PERIODIC_PAYMENT_TYPES,
  type PaymentFormValues,
  type PaymentErrors,
} from "@/lib/landlord/payment-form";
import { paymentMethodLabels, labelFor } from "@/lib/landlord/labels";
import { recordPayment } from "./actions";

const inputClass = (invalid: boolean) =>
  cn(
    "w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2",
    invalid
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
      : "border-gray-200 focus:border-teal-500 focus:ring-teal-500/20",
  );

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p className="mt-1.5 text-sm text-red-600">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

export function RecordPaymentModal({
  leaseId,
  defaultAmount,
  defaultPeriod,
  todayIso,
  onClose,
  onSaved,
}: {
  leaseId: string;
  defaultAmount: number;
  /** "2026-11" */
  defaultPeriod: string;
  todayIso: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [values, setValues] = useState<PaymentFormValues>({
    amount: defaultAmount ? String(defaultAmount) : "",
    payment_type: "rent",
    payment_date: todayIso,
    payment_method: "mpesa",
    reference_number: "",
    period: defaultPeriod,
    notes: "",
  });
  const [errors, setErrors] = useState<PaymentErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set =
    (field: keyof PaymentFormValues) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const next = e.target.value;
      setValues((v) => ({ ...v, [field]: next }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    };

  const needsPeriod = PERIODIC_PAYMENT_TYPES.includes(values.payment_type);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    // The same function the action runs; the client check only saves a trip.
    const local = buildPayment(values, {
      year: Number(todayIso.slice(0, 4)),
      month: Number(todayIso.slice(5, 7)),
      day: Number(todayIso.slice(8, 10)),
    });
    if (!local.payment) {
      setErrors(local.errors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await recordPayment(leaseId, values);
      if (result.ok) {
        onSaved();
        return;
      }
      if (result.errors) setErrors(result.errors);
      if (result.message) setMessage(result.message);
    });
  }

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="record-payment-title"
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-gray-400" />
            <h3
              id="record-payment-title"
              className="text-lg font-semibold text-gray-900"
            >
              Record a payment
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1.5 -mr-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={submit} noValidate className="p-5 space-y-4">
          {message && (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800"
            >
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <p>{message}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <Field
              label="Amount"
              htmlFor="amount"
              error={errors.amount}
              hint="KES"
            >
              <input
                id="amount"
                type="text"
                inputMode="decimal"
                value={values.amount}
                onChange={set("amount")}
                aria-invalid={Boolean(errors.amount)}
                className={inputClass(Boolean(errors.amount))}
              />
            </Field>

            <Field
              label="For"
              htmlFor="payment_type"
              error={errors.payment_type}
            >
              <select
                id="payment_type"
                value={values.payment_type}
                onChange={set("payment_type")}
                className={inputClass(Boolean(errors.payment_type))}
              >
                {PAYMENT_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {PAYMENT_TYPE_LABELS[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Date received"
              htmlFor="payment_date"
              error={errors.payment_date}
            >
              <input
                id="payment_date"
                type="date"
                max={todayIso}
                value={values.payment_date}
                onChange={set("payment_date")}
                aria-invalid={Boolean(errors.payment_date)}
                className={inputClass(Boolean(errors.payment_date))}
              />
            </Field>

            {needsPeriod ? (
              <Field
                label="Month it covers"
                htmlFor="period"
                error={errors.period}
                hint="Not always the month it arrived."
              >
                <input
                  id="period"
                  type="month"
                  value={values.period}
                  onChange={set("period")}
                  aria-invalid={Boolean(errors.period)}
                  className={inputClass(Boolean(errors.period))}
                />
              </Field>
            ) : (
              <div className="flex items-end pb-1">
                <p className="text-xs text-gray-500">
                  A {PAYMENT_TYPE_LABELS[values.payment_type]?.toLowerCase()} is
                  not tied to a particular month.
                </p>
              </div>
            )}

            <Field
              label="Paid by"
              htmlFor="payment_method"
              error={errors.payment_method}
            >
              <select
                id="payment_method"
                value={values.payment_method}
                onChange={set("payment_method")}
                className={inputClass(Boolean(errors.payment_method))}
              >
                {PAYMENT_METHOD_VALUES.map((m) => (
                  <option key={m} value={m}>
                    {labelFor(paymentMethodLabels, m)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Reference"
              htmlFor="reference_number"
              error={errors.reference_number}
              hint="M-Pesa code, slip number."
            >
              <input
                id="reference_number"
                type="text"
                value={values.reference_number}
                onChange={set("reference_number")}
                className={inputClass(Boolean(errors.reference_number))}
              />
            </Field>
          </div>

          <Field label="Notes" htmlFor="notes" error={errors.notes}>
            <textarea
              id="notes"
              rows={2}
              value={values.notes}
              onChange={set("notes")}
              className={inputClass(false)}
            />
          </Field>

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={pending}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50"
            >
              {pending && <Loader2 className="w-4 h-4 animate-spin" />}
              {pending ? "Saving…" : "Record payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
