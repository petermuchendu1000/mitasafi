/**
 * Customer Booking Payment Page
 *
 * Allows the customer to initiate an M-Pesa payment for a confirmed booking.
 * Shows payment status (pending/processing/completed/failed) with live updates.
 *
 * URL: /dashboard/bookings/[id]/payment
 */

import { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Clock,
  AlertTriangle,
  XCircle,
  Smartphone,
  Shield,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getBookingById } from "@/lib/services/bookings";
import { getBookingPayments } from "@/lib/services/payments";
import { calculateCommission } from "@/lib/payments/commission";
import type { BookingStatus } from "@/types/bookings";
import { PaymentForm } from "./PaymentForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  return {
    title: `Payment — Booking ${id.slice(0, 8)} | MitaSafi`,
    description: "Make a payment for your booking.",
  };
}

function formatKES(amount: number): string {
  return `KES ${amount.toLocaleString()}`;
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-KE", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default async function BookingPaymentPage({ params }: PageProps) {
  const { id: bookingId } = await params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?redirectTo=${encodeURIComponent(`/dashboard/bookings/${bookingId}/payment`)}`
    );
  }

  const { booking, error } = await getBookingById(bookingId, user.id);
  if (error || !booking) notFound();

  // Only the customer can access the payment page
  if (booking.customer_id !== user.id) notFound();

  // Fetch existing payment attempts
  const { payments: existingPayments } = await getBookingPayments(bookingId);

  // Calculate commission breakdown
  const agreedPrice = booking.agreed_price || 0;
  const commission = calculateCommission(agreedPrice);

  // Determine current payment state
  const latestPayment = existingPayments?.[0] ?? null;
  const isPaymentCompleted = latestPayment?.status === "completed";
  const isPaymentPending = latestPayment?.status === "pending";
  const isPaymentFailed = latestPayment?.status === "failed";

  // Statuses that allow payment
  const payableStatuses: BookingStatus[] = [
    "customer_confirmed",
    "payment_failed",
    "payment_pending",
  ];
  const canPay =
    payableStatuses.includes(booking.status as BookingStatus) &&
    agreedPrice > 0 &&
    !isPaymentPending;

  const providerName =
    booking.provider?.business_name ?? "Service Provider";
  const serviceName = booking.service?.name ?? "Service";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 h-14 flex items-center gap-3">
          <Link
            href={`/dashboard/bookings/${bookingId}`}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-sm font-medium text-gray-900">Payment</h1>
            <p className="text-xs text-gray-500">
              Booking #{bookingId.slice(0, 8)}
            </p>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Payment Completed Banner */}
        {isPaymentCompleted && (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-emerald-900">
                  Payment completed
                </p>
                <p className="text-sm text-emerald-700 mt-0.5">
                  {latestPayment?.mpesa_receipt_number && (
                    <>M-Pesa Ref: {latestPayment.mpesa_receipt_number} · </>
                  )}
                  {formatDateTime(latestPayment?.confirmed_at)}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Pending Banner */}
        {isPaymentPending && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-amber-600 mt-0.5 shrink-0 animate-pulse" />
              <div>
                <p className="text-sm font-medium text-amber-900">
                  Waiting for M-Pesa confirmation
                </p>
                <p className="text-sm text-amber-700 mt-0.5">
                  Check your phone for the M-Pesa payment prompt. Enter your PIN
                  to complete payment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Payment Failed Banner */}
        {isPaymentFailed && !isPaymentCompleted && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-5 py-4">
            <div className="flex items-start gap-3">
              <XCircle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">
                  Payment failed
                </p>
                <p className="text-sm text-red-700 mt-0.5">
                  {latestPayment?.failure_reason ||
                    "The payment was not completed. You can try again below."}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Booking Summary */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-medium text-gray-900">Order Summary</h2>
          </div>
          <div className="px-5 py-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600">{serviceName}</span>
              <span className="text-sm font-medium text-gray-900">
                {formatKES(commission.totalAmount)}
              </span>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">Service by</span>
                <span className="text-sm text-gray-700">{providerName}</span>
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex justify-between items-center">
                <span className="text-base font-medium text-gray-900">
                  Total
                </span>
                <span className="text-base font-semibold text-gray-900">
                  {formatKES(commission.totalAmount)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Form (Client Component) */}
        {canPay && !isPaymentCompleted && (
          <PaymentForm
            bookingId={bookingId}
            amount={commission.totalAmount}
            defaultPhone={user.phone || ""}
          />
        )}

        {/* Payment pending — poll status (Client Component) */}
        {isPaymentPending && latestPayment && (
          <PaymentForm
            bookingId={bookingId}
            amount={commission.totalAmount}
            defaultPhone={latestPayment.mpesa_phone || user.phone || ""}
            pendingPaymentId={latestPayment.id}
          />
        )}

        {/* Payment History */}
        {existingPayments && existingPayments.length > 0 && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="px-5 py-4 border-b border-gray-100">
              <h2 className="font-medium text-gray-900">Payment History</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {existingPayments.map(
                (p: {
                  id: string;
                  status: string;
                  amount: number;
                  mpesa_receipt_number: string | null;
                  failure_reason: string | null;
                  created_at: string;
                  confirmed_at: string | null;
                }) => (
                  <div key={p.id} className="px-5 py-3 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {p.status === "completed" && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                      )}
                      {p.status === "pending" && (
                        <Clock className="w-4 h-4 text-amber-500" />
                      )}
                      {p.status === "failed" && (
                        <XCircle className="w-4 h-4 text-red-500" />
                      )}
                      {p.status === "cancelled" && (
                        <AlertTriangle className="w-4 h-4 text-gray-400" />
                      )}
                      <div>
                        <p className="text-sm text-gray-900">
                          {formatKES(p.amount)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {formatDateTime(
                            p.status === "completed" ? p.confirmed_at : p.created_at
                          )}
                          {p.mpesa_receipt_number && ` · ${p.mpesa_receipt_number}`}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-xs font-medium px-2 py-1 rounded-full ${
                        p.status === "completed"
                          ? "bg-emerald-50 text-emerald-700"
                          : p.status === "pending"
                            ? "bg-amber-50 text-amber-700"
                            : p.status === "failed"
                              ? "bg-red-50 text-red-700"
                              : "bg-gray-50 text-gray-500"
                      }`}
                    >
                      {p.status.charAt(0).toUpperCase() + p.status.slice(1)}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>
        )}

        {/* Security Note */}
        <div className="flex items-start gap-3 px-1">
          <Shield className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
          <p className="text-xs text-gray-400">
            Payments are processed securely via M-Pesa. Your money is held safely
            until the job is confirmed complete.
          </p>
        </div>
      </main>
    </div>
  );
}
