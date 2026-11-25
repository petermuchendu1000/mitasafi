"use client";

/**
 * Every figure here comes from summariseIncome, which reads payment rows.
 * The shell supplies the <main> landmark and the page padding.
 */

import { formatKes, labelFor } from "@/lib/landlord/labels";
import { INCOME_TYPE_LABELS, type IncomeSummary } from "@/lib/landlord/finance";
import { MonthBars } from "@/components/dashboard/landlord/MonthBars";

export function IncomeReport({ summary }: { summary: IncomeSummary }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Income</h1>
        <p className="mt-1 text-gray-500">
          Payments confirmed against your leases
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Received
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatKes(summary.received)}
          </p>
          <p className="mt-1 text-xs text-gray-500">
            {summary.countedPayments} confirmed payment
            {summary.countedPayments === 1 ? "" : "s"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Deposits held
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatKes(summary.depositsHeld)}
          </p>
          {/* The whole point of the separation, said out loud. */}
          <p className="mt-1 text-xs text-gray-500">
            Owed back at the end of the tenancy — not income
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Refunded
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatKes(summary.refunded)}
          </p>
          <p className="mt-1 text-xs text-gray-500">Deposits returned</p>
        </div>
      </div>

      {summary.unconfirmed > 0 && (
        <p className="text-sm text-gray-600 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          {summary.unconfirmed} payment
          {summary.unconfirmed === 1 ? " is" : "s are"} recorded but not
          confirmed, so {summary.unconfirmed === 1 ? "it is" : "they are"} not
          counted above.
        </p>
      )}

      <MonthBars title="Received by month" months={summary.months} />

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="px-5 py-3 text-sm font-semibold text-gray-900 border-b border-gray-200">
          Received by type
        </h2>
        {summary.byType.length === 0 ? (
          <p className="px-5 py-8 text-center text-gray-500">
            No confirmed payments yet.
          </p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">
              Received by type. Deposits are not listed here because they are
              not earnings; they are shown separately above.
            </caption>
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">
                  Type
                </th>
                <th scope="col" className="px-5 py-2 font-medium text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {summary.byType.map((r) => (
                <tr key={r.type}>
                  <td className="px-5 py-2.5 text-gray-700">
                    {labelFor(INCOME_TYPE_LABELS, r.type)}
                  </td>
                  <td className="px-5 py-2.5 text-right text-gray-900">
                    {formatKes(r.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
            {/* The total is rendered so a reader can see the rows add to the
                Received tile, rather than having to add them up and wonder. */}
            <tfoot className="border-t-2 border-gray-200">
              <tr>
                <th
                  scope="row"
                  className="px-5 py-2.5 text-left font-semibold text-gray-900"
                >
                  Total received
                </th>
                <td className="px-5 py-2.5 text-right font-semibold text-gray-900">
                  {formatKes(summary.received)}
                </td>
              </tr>
            </tfoot>
          </table>
        )}
      </div>
    </div>
  );
}
