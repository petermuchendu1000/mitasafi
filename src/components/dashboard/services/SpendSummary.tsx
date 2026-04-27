/**
 * SpendSummary
 *
 * Shows the customer's spending stats: this month's total, payment count,
 * pending payments, and all-time total. Clean card design.
 */

import { DollarSign, TrendingUp, Clock, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import type { SpendSummary as SpendSummaryData } from "@/lib/services/dashboard";

interface SpendSummaryProps {
  data: SpendSummaryData;
}

export function SpendSummary({ data }: SpendSummaryProps) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="font-medium text-gray-900 mb-4">Spending Summary</h2>

      <div className="space-y-4">
        {/* This Month */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-50 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-brand-600" />
            </div>
            <div>
              <p className="text-xs text-gray-500">This month</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(data.spent_this_month)}
              </p>
            </div>
          </div>
          {data.payments_this_month > 0 && (
            <span className="text-xs text-gray-400">
              {data.payments_this_month} payment{data.payments_this_month !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {/* Pending */}
        {data.pending_payments > 0 && (
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-gray-500">Pending</p>
                <p className="text-sm font-semibold text-amber-600">
                  {data.pending_payments} payment{data.pending_payments !== 1 ? "s" : ""}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* All-time */}
        <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center">
              <Wallet className="w-4 h-4 text-gray-500" />
            </div>
            <div>
              <p className="text-xs text-gray-500">All-time total</p>
              <p className="text-sm font-semibold text-gray-900">
                {formatCurrency(data.total_spent)}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
