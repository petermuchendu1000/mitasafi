"use client";

/**
 * Every figure here comes from summariseExpenses, which reads maintenance rows.
 * The page states its own limit, because a total that looks complete and is
 * not is worse than no page.
 */

import { formatKes, labelFor } from "@/lib/landlord/labels";
import { maintenanceCategoryLabels } from "@/lib/landlord/labels";
import type { ExpenseSummary } from "@/lib/landlord/finance";
import { MonthBars } from "@/components/dashboard/landlord/MonthBars";

export function ExpenseReport({ summary }: { summary: ExpenseSummary }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Expenses</h1>
        <p className="mt-1 text-gray-500">
          Maintenance spend across your portfolio
        </p>
      </div>

      {/* Not a footnote. Someone reading a total needs to know what it leaves
          out, and maintenance is the only outgoing this system records. */}
      <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
        This covers maintenance costs, which is the only spending MitaSafi
        records. Rates, insurance, utilities paid by you and management fees are
        not tracked anywhere yet, so they are not included here.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Spent</p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatKes(summary.spent)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {summary.jobsWithCost} job{summary.jobsWithCost === 1 ? "" : "s"}{" "}
            with a final cost
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Committed
          </p>
          <p className="mt-1 text-2xl font-semibold text-amber-700">
            {formatKes(summary.committed)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Quoted, not yet paid — not counted as spent
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Borne by others
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatKes(summary.borneByOthers)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            Paid by a tenant, warranty or the building
          </p>
        </div>
      </div>

      {summary.jobsWithoutCost > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {summary.jobsWithoutCost} maintenance job
          {summary.jobsWithoutCost === 1 ? " has" : "s have"} no cost recorded
          at all, so the totals above are lower than what you have really spent.
        </p>
      )}

      <MonthBars title="Spent by month" months={summary.months} tone="amber" />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="px-5 py-3 text-sm font-semibold text-gray-900 border-b border-gray-200">
          By category
        </h2>
        {summary.byCategory.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-500">
            No maintenance costs recorded yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">Maintenance spend by category</caption>
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">
                  Category
                </th>
                <th scope="col" className="px-5 py-2 font-medium text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.byCategory.map((r) => (
                <tr key={r.category}>
                  <td className="px-5 py-2.5 text-gray-700">
                    {labelFor(maintenanceCategoryLabels, r.category)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-gray-900">
                    {formatKes(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
