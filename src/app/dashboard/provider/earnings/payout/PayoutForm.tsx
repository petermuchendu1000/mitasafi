/**
 * PayoutForm — Client component for requesting a payout.
 *
 * Calls the requestPayout server action.
 * Validates amount (min KES 100, max wallet balance).
 */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Phone, Wallet, AlertCircle, CheckCircle2 } from "lucide-react";
import { requestPayout } from "@/lib/services/payments";

interface PayoutFormProps {
  walletBalance: number;
  defaultPhone: string;
}

function isValidKenyanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-+]/g, "");
  return /^(?:254|0)?[17]\d{8}$/.test(cleaned);
}

export function PayoutForm({ walletBalance, defaultPhone }: PayoutFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [amount, setAmount] = useState("");
  const [phone, setPhone] = useState(defaultPhone || "");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const parsedAmount = parseFloat(amount) || 0;
  const isValidAmount = parsedAmount >= 100 && parsedAmount <= walletBalance;
  const isValidPhone = isValidKenyanPhone(phone);
  const canSubmit = isValidAmount && isValidPhone && !isPending && !success;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isValidAmount) {
      setError(
        parsedAmount < 100
          ? "Minimum payout is KES 100."
          : `Maximum available is KES ${walletBalance.toLocaleString()}.`
      );
      return;
    }

    if (!isValidPhone) {
      setError("Please enter a valid Kenyan phone number.");
      return;
    }

    startTransition(async () => {
      const result = await requestPayout(parsedAmount, "mpesa", phone);

      if (!result.success) {
        setError(result.error || "Payout request failed. Please try again.");
        return;
      }

      setSuccess(true);
      // Brief delay then navigate back to earnings
      setTimeout(() => {
        router.push("/dashboard/provider/earnings");
        router.refresh();
      }, 2000);
    });
  };

  // Success state
  if (success) {
    return (
      <div className="bg-white rounded-xl border border-gray-200 px-5 py-8">
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="w-12 h-12 bg-emerald-50 rounded-full flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-900">
              Payout request submitted
            </p>
            <p className="text-xs text-gray-500 mt-1">
              KES {parsedAmount.toLocaleString()} will be sent to your M-Pesa
              account. This usually takes a few minutes.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="font-medium text-gray-900">Payout Details</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Funds will be sent to your M-Pesa within minutes.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="px-5 py-4 space-y-4">
        {/* Amount Input */}
        <div>
          <label
            htmlFor="payout-amount"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            Amount (KES)
          </label>
          <div className="relative">
            <Wallet className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="payout-amount"
              type="number"
              inputMode="numeric"
              min={100}
              max={walletBalance}
              step={1}
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isPending}
              className={`block w-full pl-10 pr-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                amount && !isValidAmount ? "border-red-300" : "border-gray-300"
              }`}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-gray-400">Min: KES 100</p>
            <button
              type="button"
              onClick={() => setAmount(String(walletBalance))}
              className="text-xs text-teal-600 hover:text-teal-700 font-medium"
            >
              Withdraw all
            </button>
          </div>
        </div>

        {/* Phone Input */}
        <div>
          <label
            htmlFor="payout-phone"
            className="block text-sm font-medium text-gray-700 mb-1.5"
          >
            M-Pesa Phone Number
          </label>
          <div className="relative">
            <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              id="payout-phone"
              type="tel"
              inputMode="numeric"
              placeholder="0712 345 678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={isPending}
              className={`block w-full pl-10 pr-4 py-2.5 border rounded-lg text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 ${
                phone && !isValidPhone ? "border-red-300" : "border-gray-300"
              }`}
            />
          </div>
          <p className="text-xs text-gray-400 mt-1">
            The payout will be sent to this M-Pesa number.
          </p>
        </div>

        {/* Summary */}
        {isValidAmount && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg px-4 py-3 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Payout amount</span>
              <span className="font-medium text-gray-900">
                KES {parsedAmount.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Remaining balance</span>
              <span className="text-gray-700">
                KES {(walletBalance - parsedAmount).toLocaleString()}
              </span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full flex items-center justify-center gap-2 bg-teal-600 text-white text-sm font-semibold rounded-xl py-3 hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isPending ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing…
            </>
          ) : (
            "Request Payout"
          )}
        </button>

        {/* Warning */}
        <p className="text-xs text-gray-400 text-center">
          Once submitted, the amount will be deducted from your wallet. Payouts
          are typically processed within a few minutes.
        </p>
      </form>
    </div>
  );
}
