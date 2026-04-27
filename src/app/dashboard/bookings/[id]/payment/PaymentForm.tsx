/**
 * PaymentForm — Client component for M-Pesa STK Push initiation & status polling.
 *
 * Two modes:
 *  1. Initiation mode (no pendingPaymentId) — shows phone input + "Pay" button
 *  2. Polling mode (pendingPaymentId provided) — polls status until terminal state
 */
"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Smartphone, RefreshCw } from "lucide-react";
import type {
  InitiatePaymentResult,
  PaymentStatusResult,
  PaymentTransactionStatus,
} from "@/types/payments";

interface PaymentFormProps {
  bookingId: string;
  amount: number;
  defaultPhone: string;
  /** When set, the form enters polling mode for an existing pending payment */
  pendingPaymentId?: string;
}

// ---------------------------------------------------------------------------
// Phone formatting helpers (client-side, mirrors server normalizePhoneNumber)
// ---------------------------------------------------------------------------

function cleanPhone(value: string): string {
  return value.replace(/[\s\-+]/g, "");
}

function isValidKenyanPhone(phone: string): boolean {
  const cleaned = cleanPhone(phone);
  return /^(?:254|0)?[17]\d{8}$/.test(cleaned);
}

function formatPhoneDisplay(raw: string): string {
  const cleaned = cleanPhone(raw);
  const match = cleaned.match(/^(?:254|0)?([17]\d{8})$/);
  if (!match) return raw;
  const n = match[1];
  return `+254 ${n.slice(0, 3)} ${n.slice(3, 6)} ${n.slice(6)}`;
}

// ---------------------------------------------------------------------------
// Polling configuration
// ---------------------------------------------------------------------------
const POLL_INTERVAL_MS = 3_000; // 3 seconds
const MAX_POLL_ATTEMPTS = 60; // 3 minutes max
const TERMINAL_STATUSES: PaymentTransactionStatus[] = [
  "completed",
  "failed",
  "cancelled",
  "refunded",
];

export function PaymentForm({
  bookingId,
  amount,
  defaultPhone,
  pendingPaymentId,
}: PaymentFormProps) {
  const router = useRouter();

  // Form state
  const [phone, setPhone] = useState(defaultPhone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Polling state
  const [paymentId, setPaymentId] = useState<string | null>(
    pendingPaymentId ?? null
  );
  const [isPolling, setIsPolling] = useState(!!pendingPaymentId);
  const [pollCount, setPollCount] = useState(0);
  const [statusMessage, setStatusMessage] = useState<string | null>(
    pendingPaymentId ? "Checking payment status…" : null
  );
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    };
  }, []);

  // ---------------------------------------------------------------------------
  // Poll for payment status
  // ---------------------------------------------------------------------------
  const pollStatus = useCallback(
    async (pId: string, attempt: number) => {
      if (attempt >= MAX_POLL_ATTEMPTS) {
        setIsPolling(false);
        setStatusMessage(null);
        setError(
          "Payment confirmation is taking longer than expected. " +
            "If you've already paid, it will be confirmed shortly. " +
            "You can refresh this page to check."
        );
        return;
      }

      try {
        const res = await fetch(
          `/api/payments/mpesa/query?paymentId=${pId}&poll=${attempt % 5 === 0 ? "true" : "false"}`
        );
        const data: PaymentStatusResult = await res.json();

        if (!data.success || !data.payment) {
          // Non-fatal: keep polling
          setPollCount(attempt + 1);
          pollTimerRef.current = setTimeout(
            () => pollStatus(pId, attempt + 1),
            POLL_INTERVAL_MS
          );
          return;
        }

        const status = data.payment.status as PaymentTransactionStatus;

        if (TERMINAL_STATUSES.includes(status)) {
          setIsPolling(false);
          setStatusMessage(null);

          if (status === "completed") {
            // Success — refresh the page to show server-rendered success state
            router.refresh();
          } else if (status === "failed") {
            setError(
              data.payment.failure_reason ||
                "Payment was not completed. You can try again."
            );
            setPaymentId(null);
          } else {
            setError("Payment was cancelled.");
            setPaymentId(null);
          }
          return;
        }

        // Still pending — update message and continue polling
        setStatusMessage(
          attempt < 5
            ? "Waiting for M-Pesa confirmation…"
            : attempt < 15
              ? "Still waiting — please check your phone for the M-Pesa prompt…"
              : "Payment is being processed. This may take a moment…"
        );
        setPollCount(attempt + 1);
        pollTimerRef.current = setTimeout(
          () => pollStatus(pId, attempt + 1),
          POLL_INTERVAL_MS
        );
      } catch {
        // Network error — retry
        setPollCount(attempt + 1);
        pollTimerRef.current = setTimeout(
          () => pollStatus(pId, attempt + 1),
          POLL_INTERVAL_MS
        );
      }
    },
    [router]
  );

  // Start polling when paymentId is set and isPolling is true
  useEffect(() => {
    if (isPolling && paymentId) {
      pollStatus(paymentId, pollCount);
    }
    // Only trigger when polling starts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPolling, paymentId]);

  // ---------------------------------------------------------------------------
  // Initiate STK Push
  // ---------------------------------------------------------------------------
  const handleInitiate = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidKenyanPhone(phone)) {
      setError("Please enter a valid Kenyan phone number (e.g. 0712 345 678)");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/payments/mpesa/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bookingId,
          phoneNumber: phone,
          paymentMethod: "mpesa",
        }),
      });

      const data: InitiatePaymentResult = await res.json();

      if (!data.success || !data.paymentId) {
        setError(data.error || "Failed to initiate payment. Please try again.");
        setIsSubmitting(false);
        return;
      }

      // Success — start polling
      setPaymentId(data.paymentId);
      setIsPolling(true);
      setPollCount(0);
      setStatusMessage(
        data.customerMessage || "Check your phone for the M-Pesa prompt…"
      );
      setIsSubmitting(false);
    } catch {
      setError("Something went wrong. Please check your connection and try again.");
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Render: Polling mode
  // ---------------------------------------------------------------------------
  if (isPolling && paymentId) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-6">
        <div className="flex flex-col items-center text-center space-y-4">
          <div className="relative">
            <Smartphone className="w-10 h-10 text-teal-600" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-amber-400 rounded-full animate-pulse" />
          </div>

          <div>
            <p className="text-sm font-medium text-gray-900">
              {statusMessage || "Waiting for confirmation…"}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              {formatPhoneDisplay(phone)}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>
              Checking… ({pollCount}/{MAX_POLL_ATTEMPTS})
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // Render: Initiation form
  // ---------------------------------------------------------------------------
  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-medium text-gray-900">Pay with M-Pesa</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          You&apos;ll receive an STK push on your phone to complete payment.
        </p>
      </div>

      <form onSubmit={handleInitiate} className="px-5 py-4 space-y-4">
        {/* Phone input */}
        <div>
          <label
            htmlFor="mpesa-phone"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            M-Pesa Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="mpesa-phone"
              type="tel"
              inputMode="numeric"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isSubmitting}
              className={`block w-full pl-10 pr-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                error && !isValidKenyanPhone(phone)
                  ? "border-red-300"
                  : "border-gray-300"
              }`}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            The M-Pesa prompt will be sent to this number.
          </p>
        </div>

        {/* Error */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isSubmitting || !phone.trim()}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white text-sm font-semibold rounded-xl py-3 hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Sending to M-Pesa…
            </>
          ) : (
            <>
              <Smartphone className="w-4 h-4" />
              Pay KES {amount.toLocaleString()} via M-Pesa
            </>
          )}
        </button>
      </form>
    </div>
  );
}
