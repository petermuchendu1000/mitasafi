/**
 * Payout Request Page
 *
 * Allows providers to withdraw from their wallet to M-Pesa.
 *
 * URL: /dashboard/provider/earnings/payout
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
import { getProviderEarnings } from "@/lib/services/payments";
import { PayoutForm } from "./PayoutForm";

export const metadata: Metadata = {
  title: "Request Payout | MitaSafi Provider",
  description: "Withdraw your earnings via M-Pesa.",
};

export default async function PayoutRequestPage() {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) {
    redirect("/login?redirectTo=/dashboard/provider/earnings/payout");
  }

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) redirect("/dashboard/provider");

  const { summary } = await getProviderEarnings();

  // Redirect if no balance
  if (summary.walletBalance < 100) {
    redirect("/dashboard/provider/earnings");
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard/provider/earnings"
          className="text-gray-400 hover:text-gray-600 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-lg font-semibold text-gray-900">
            Request Payout
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Withdraw earnings to your M-Pesa account.
          </p>
        </div>
      </div>

      {/* Balance Card */}
      <div className="bg-teal-50 border border-teal-200 rounded-xl px-5 py-4">
        <p className="text-xs font-medium text-teal-600 uppercase tracking-wider">
          Available Balance
        </p>
        <p className="text-2xl font-bold text-teal-900 mt-1">
          KES {summary.walletBalance.toLocaleString()}
        </p>
      </div>

      {/* Payout Form (Client Component) */}
      <PayoutForm
        walletBalance={summary.walletBalance}
        defaultPhone={user.phone || ""}
      />
    </div>
  );
}
