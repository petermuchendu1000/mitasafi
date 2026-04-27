/**
 * Provider Earnings Dashboard
 *
 * Shows wallet balance, earning stats, transaction history,
 * and payout request entry point.
 *
 * URL: /dashboard/provider/earnings
 */

import { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import {
  Wallet,
  TrendingUp,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  Banknote,
  ChevronRight,
  Receipt,
  XCircle,
} from "lucide-react";
import { getCachedUser, getCachedProviderId } from "@/lib/cache/queries";
import {
  getProviderEarnings,
  getProviderTransactions,
} from "@/lib/services/payments";
import type { EarningsTransaction } from "@/types/payments";

export const metadata: Metadata = {
  title: "Earnings | MitaSafi Provider",
  description: "View your earnings, wallet balance, and payout history.",
};

// =============================================================================
// HELPERS
// =============================================================================

function formatKES(amount: number): string {
  return `KES ${Math.abs(amount).toLocaleString()}`;
}

function calcGrowthPercent(current: number, previous: number): number | null {
  if (previous === 0 && current === 0) return null;
  if (previous === 0) return 100;
  return Math.round(((current - previous) / previous) * 100);
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-KE", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// =============================================================================
// STAT CARD
// =============================================================================

function StatCard({
  label,
  value,
  icon: Icon,
  growth,
  accent = false,
}: {
  label: string;
  value: string;
  icon: React.ElementType;
  growth?: number | null;
  accent?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border px-4 py-3 ${
        accent
          ? "bg-teal-50 border-teal-200"
          : "bg-white border-gray-200"
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className={`p-1.5 rounded-lg ${
            accent ? "bg-teal-100" : "bg-gray-100"
          }`}
        >
          <Icon
            className={`w-3.5 h-3.5 ${accent ? "text-teal-700" : "text-gray-500"}`}
          />
        </div>
        <span className="text-xs text-gray-500">{label}</span>
      </div>
      <p
        className={`text-lg font-semibold ${
          accent ? "text-teal-900" : "text-gray-900"
        }`}
      >
        {value}
      </p>
      {growth !== undefined && growth !== null && (
        <div className="flex items-center gap-1 mt-1">
          <span
            className={`text-xs font-medium ${
              growth >= 0 ? "text-emerald-600" : "text-red-500"
            }`}
          >
            {growth >= 0 ? "+" : ""}
            {growth}%
          </span>
          <span className="text-xs text-gray-400">vs last month</span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// TRANSACTION ROW
// =============================================================================

function TransactionRow({ tx }: { tx: EarningsTransaction }) {
  const isPayment = tx.type === "payment";

  return (
    <div className="flex items-center justify-between px-5 py-3">
      <div className="flex items-center gap-3 min-w-0">
        <div
          className={`p-1.5 rounded-lg shrink-0 ${
            isPayment ? "bg-emerald-50" : "bg-amber-50"
          }`}
        >
          {isPayment ? (
            <ArrowDownLeft className="w-3.5 h-3.5 text-emerald-600" />
          ) : (
            <ArrowUpRight className="w-3.5 h-3.5 text-amber-600" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-sm text-gray-900 truncate">{tx.description}</p>
          <p className="text-xs text-gray-500 truncate">
            {formatDate(tx.createdAt)}
            {tx.mpesaReceipt && ` · ${tx.mpesaReceipt}`}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0 ml-3">
        <span
          className={`text-sm font-medium tabular-nums ${
            isPayment ? "text-emerald-700" : "text-gray-900"
          }`}
        >
          {isPayment ? "+" : "−"} {formatKES(tx.amount)}
        </span>
        <TransactionStatusBadge status={tx.status} />
      </div>
    </div>
  );
}

function TransactionStatusBadge({ status }: { status: string }) {
  switch (status) {
    case "completed":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="w-3 h-3" /> Done
        </span>
      );
    case "pending":
    case "processing":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700">
          <Clock className="w-3 h-3" /> {status === "processing" ? "Processing" : "Pending"}
        </span>
      );
    case "failed":
      return (
        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-red-50 text-red-700">
          <XCircle className="w-3 h-3" /> Failed
        </span>
      );
    default:
      return (
        <span className="inline-flex text-xs font-medium px-2 py-0.5 rounded-full bg-gray-50 text-gray-500">
          {status}
        </span>
      );
  }
}

// =============================================================================
// PAGE
// =============================================================================

export default async function ProviderEarningsPage() {
  const { user, error: authError } = await getCachedUser();
  if (authError || !user) redirect("/login?redirectTo=/dashboard/provider/earnings");

  const { providerId, error: providerError } = await getCachedProviderId();
  if (providerError || !providerId) redirect("/dashboard/provider");

  const [{ summary }, { transactions, total }] = await Promise.all([
    getProviderEarnings(),
    getProviderTransactions({ page: 1, pageSize: 20, type: "all" }),
  ]);

  const earningsGrowth = calcGrowthPercent(
    summary.thisMonthEarnings,
    summary.lastMonthEarnings
  );

  const hasTransactions = transactions.length > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Earnings</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Track your income and manage payouts.
          </p>
        </div>
        {summary.walletBalance >= 100 && (
          <Link
            href="/dashboard/provider/earnings/payout"
            className="inline-flex items-center gap-1.5 bg-teal-600 text-white text-sm font-semibold rounded-xl px-4 py-2.5 hover:bg-teal-700 transition-colors"
          >
            <Banknote className="w-4 h-4" />
            Request Payout
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          label="Wallet Balance"
          value={formatKES(summary.walletBalance)}
          icon={Wallet}
          accent
        />
        <StatCard
          label="This Month"
          value={formatKES(summary.thisMonthEarnings)}
          icon={TrendingUp}
          growth={earningsGrowth}
        />
        <StatCard
          label="Total Earnings"
          value={formatKES(summary.totalEarnings)}
          icon={Receipt}
        />
        <StatCard
          label="Pending Payouts"
          value={formatKES(summary.pendingPayouts)}
          icon={Clock}
        />
      </div>

      {/* Commission Info */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-1 h-8 bg-gray-300 rounded-full" />
          <div>
            <p className="text-xs font-medium text-gray-600">
              Platform commission: 10% on each completed job
            </p>
            <p className="text-xs text-gray-400 mt-0.5">
              Total fees paid: {formatKES(summary.platformFeesTotal)} across{" "}
              {summary.totalTransactions} transaction
              {summary.totalTransactions !== 1 ? "s" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-medium text-gray-900">Recent Transactions</h2>
          {total > 20 && (
            <span className="text-xs text-gray-400">
              Showing 20 of {total}
            </span>
          )}
        </div>

        {hasTransactions ? (
          <div className="divide-y divide-gray-100">
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        ) : (
          <div className="px-5 py-12 text-center">
            <Wallet className="w-8 h-8 text-gray-300 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-500">
              No transactions yet
            </p>
            <p className="text-xs text-gray-400 mt-1">
              Earnings will appear here once customers pay for completed jobs.
            </p>
          </div>
        )}
      </div>

      {/* Payout Shortcut (if balance exists but below minimum) */}
      {summary.walletBalance > 0 && summary.walletBalance < 100 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <p className="text-xs text-amber-700">
            <span className="font-medium">Almost there!</span> You need at
            least KES 100 to request a payout. Current balance:{" "}
            {formatKES(summary.walletBalance)}.
          </p>
        </div>
      )}
    </div>
  );
}
