/**
 * Quote Form (Client Component)
 *
 * Multi-field form for creating or revising a booking quote.
 * Fields: total price, line-item breakdown, description, validity days.
 *
 * Key behaviors:
 * - Dynamic add/remove breakdown rows
 * - Auto-computes total from breakdown items
 * - Validates all fields before submission
 * - Shows pending state and error feedback
 */

"use client";

import { useCallback, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { QuoteBreakdownItem, QuoteFormData } from "@/types/bookings";
import { submitQuote } from "./actions";

// =============================================================================
// TYPES
// =============================================================================

interface QuoteFormProps {
  bookingId: string;
  isRevision: boolean;
  initialData?: QuoteFormData;
}

interface BreakdownRow extends QuoteBreakdownItem {
  /** Client-side ID for React keys. */
  _key: string;
}

// =============================================================================
// DEFAULTS
// =============================================================================

const DEFAULT_VALIDITY_DAYS = 7;

function createEmptyRow(): BreakdownRow {
  return {
    _key: crypto.randomUUID(),
    label: "",
    amount: 0,
    quantity: 1,
    note: "",
  };
}

// =============================================================================
// COMPONENT
// =============================================================================

export function QuoteForm({
  bookingId,
  isRevision,
  initialData,
}: QuoteFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // ── Breakdown rows ──
  const [breakdownRows, setBreakdownRows] = useState<BreakdownRow[]>(() => {
    if (initialData?.breakdown && initialData.breakdown.length > 0) {
      return initialData.breakdown.map((item) => ({
        ...item,
        _key: crypto.randomUUID(),
        quantity: item.quantity ?? 1,
        note: item.note ?? "",
      }));
    }
    return [createEmptyRow()];
  });

  // ── Form fields ──
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [validityDays, setValidityDays] = useState(
    initialData?.validityDays ?? DEFAULT_VALIDITY_DAYS
  );
  const [useManualTotal, setUseManualTotal] = useState(false);
  const [manualTotal, setManualTotal] = useState(
    initialData?.quotedPrice ?? 0
  );

  // ── Computed total from breakdown ──
  const computedTotal = breakdownRows.reduce((sum, row) => {
    const qty = row.quantity && row.quantity > 0 ? row.quantity : 1;
    return sum + row.amount * qty;
  }, 0);

  const displayTotal = useManualTotal ? manualTotal : computedTotal;

  // ── Row management ──
  const addRow = useCallback(() => {
    setBreakdownRows((prev) => [...prev, createEmptyRow()]);
  }, []);

  const removeRow = useCallback((key: string) => {
    setBreakdownRows((prev) => {
      if (prev.length <= 1) return prev; // Keep at least one row
      return prev.filter((r) => r._key !== key);
    });
  }, []);

  const updateRow = useCallback(
    (key: string, field: keyof QuoteBreakdownItem, value: string | number) => {
      setBreakdownRows((prev) =>
        prev.map((r) => (r._key === key ? { ...r, [field]: value } : r))
      );
    },
    []
  );

  // ── Validation ──
  const validate = (): string | null => {
    if (displayTotal <= 0) {
      return "Total price must be greater than zero.";
    }

    // Check that at least one breakdown row has a label
    const filledRows = breakdownRows.filter((r) => r.label.trim().length > 0);
    if (filledRows.length === 0) {
      return "Please add at least one line item.";
    }

    // Check that filled rows have positive amounts
    for (const row of filledRows) {
      if (row.amount <= 0) {
        return `Line item "${row.label}" must have a positive amount.`;
      }
    }

    if (validityDays < 1 || validityDays > 90) {
      return "Validity must be between 1 and 90 days.";
    }

    return null;
  };

  // ── Submit ──
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    // Build clean breakdown (only rows with labels)
    const cleanBreakdown: QuoteBreakdownItem[] = breakdownRows
      .filter((r) => r.label.trim().length > 0)
      .map(({ label, amount, quantity, note }) => ({
        label: label.trim(),
        amount,
        ...(quantity && quantity > 1 ? { quantity } : {}),
        ...(note?.trim() ? { note: note.trim() } : {}),
      }));

    const formData: QuoteFormData = {
      quotedPrice: displayTotal,
      breakdown: cleanBreakdown,
      description: description.trim(),
      validityDays,
    };

    startTransition(async () => {
      const result = await submitQuote(bookingId, formData);
      if (!result.success) {
        setError(result.error ?? "Failed to submit quote.");
      } else {
        // Navigate back to job detail
        router.push(`/dashboard/provider/jobs/${bookingId}`);
        router.refresh();
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Error display */}
      {error && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* ── Breakdown ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-900">
            Cost breakdown
          </h2>
          <button
            type="button"
            onClick={addRow}
            className="flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            Add item
          </button>
        </div>

        <div className="space-y-3">
          {breakdownRows.map((row, idx) => (
            <div
              key={row._key}
              className="grid grid-cols-12 gap-2 items-start"
            >
              {/* Label */}
              <div className="col-span-5">
                {idx === 0 && (
                  <label className="block text-xs text-gray-500 mb-1">
                    Item
                  </label>
                )}
                <input
                  type="text"
                  value={row.label}
                  onChange={(e) =>
                    updateRow(row._key, "label", e.target.value)
                  }
                  placeholder="e.g., Labour"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Amount */}
              <div className="col-span-3">
                {idx === 0 && (
                  <label className="block text-xs text-gray-500 mb-1">
                    Amount (KES)
                  </label>
                )}
                <input
                  type="number"
                  min={0}
                  step="0.01"
                  value={row.amount || ""}
                  onChange={(e) =>
                    updateRow(
                      row._key,
                      "amount",
                      parseFloat(e.target.value) || 0
                    )
                  }
                  placeholder="0"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Qty */}
              <div className="col-span-2">
                {idx === 0 && (
                  <label className="block text-xs text-gray-500 mb-1">
                    Qty
                  </label>
                )}
                <input
                  type="number"
                  min={1}
                  value={row.quantity ?? 1}
                  onChange={(e) =>
                    updateRow(
                      row._key,
                      "quantity",
                      parseInt(e.target.value, 10) || 1
                    )
                  }
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>

              {/* Remove */}
              <div className="col-span-2 flex justify-end">
                {idx === 0 && (
                  <span className="block text-xs text-transparent mb-1">
                    &nbsp;
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => removeRow(row._key)}
                  disabled={breakdownRows.length <= 1}
                  className="p-2 text-gray-400 hover:text-red-500 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  title="Remove item"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Note (below the row) */}
              {row.label.trim().length > 0 && (
                <div className="col-span-12">
                  <input
                    type="text"
                    value={row.note ?? ""}
                    onChange={(e) =>
                      updateRow(row._key, "note", e.target.value)
                    }
                    placeholder="Optional note for this item"
                    className="w-full px-3 py-1.5 border border-gray-200 rounded-md text-xs text-gray-600 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Subtotal from breakdown */}
        <div className="border-t border-gray-100 pt-3 flex items-center justify-between">
          <span className="text-sm text-gray-500">Subtotal</span>
          <span className="text-sm font-semibold text-gray-900">
            KES {computedTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Total override ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useManualTotal}
              onChange={(e) => setUseManualTotal(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span className="text-sm text-gray-700">
              Override total (different from breakdown sum)
            </span>
          </label>
        </div>

        {useManualTotal && (
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Manual total (KES)
            </label>
            <input
              type="number"
              min={1}
              step="0.01"
              value={manualTotal || ""}
              onChange={(e) =>
                setManualTotal(parseFloat(e.target.value) || 0)
              }
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        )}

        <div className="flex items-center justify-between bg-indigo-50 rounded-lg px-4 py-3">
          <span className="text-sm font-medium text-indigo-700">
            Quote total
          </span>
          <span className="text-lg font-bold text-indigo-900">
            KES {displayTotal.toLocaleString()}
          </span>
        </div>
      </div>

      {/* ── Description ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <label
          htmlFor="quote-description"
          className="block text-sm font-semibold text-gray-900"
        >
          Description
        </label>
        <textarea
          id="quote-description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what's included in this quote, materials, estimated time, any conditions…"
          rows={4}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
        />
      </div>

      {/* ── Validity ── */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-3">
        <label
          htmlFor="quote-validity"
          className="block text-sm font-semibold text-gray-900"
        >
          Quote valid for
        </label>
        <div className="flex items-center gap-2">
          <input
            id="quote-validity"
            type="number"
            min={1}
            max={90}
            value={validityDays}
            onChange={(e) =>
              setValidityDays(parseInt(e.target.value, 10) || DEFAULT_VALIDITY_DAYS)
            }
            className="w-20 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
          <span className="text-sm text-gray-500">days</span>
        </div>
        <p className="text-xs text-gray-400">
          The customer must respond within this period.
        </p>
      </div>

      {/* ── Submit ── */}
      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isPending}
          className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 text-white text-sm font-semibold rounded-xl hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {isRevision ? "Sending revised quote…" : "Sending quote…"}
            </>
          ) : isRevision ? (
            "Send Revised Quote"
          ) : (
            "Send Quote"
          )}
        </button>
        <Link
          href={`/dashboard/provider/jobs/${bookingId}`}
          className="flex items-center justify-center px-4 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-gray-50 transition-colors"
        >
          Cancel
        </Link>
      </div>
    </form>
  );
}
