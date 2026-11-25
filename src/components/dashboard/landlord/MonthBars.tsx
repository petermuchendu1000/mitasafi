"use client";

/**
 * A plain bar chart of a money figure by month.
 *
 * WHY IT IS NOT A CHART LIBRARY
 *   Six bars and a scale. A charting dependency would be more code than this,
 *   and the thing that matters here is not the drawing — it is that the
 *   numbers are also available as text, because a bar whose height is its only
 *   content says nothing to a screen reader and nothing in a printout.
 *
 * SCALING
 *   Heights are relative to the largest month. When every month is zero the
 *   bars are all zero-height rather than all full, which is the bug you get
 *   from dividing by a max of 0.
 */

import { formatKes } from "@/lib/landlord/labels";

export interface MonthBar {
  year: number;
  month: number;
  label: string;
  amount: number;
}

export function MonthBars({
  title,
  months,
  tone = "teal",
}: {
  title: string;
  months: MonthBar[];
  tone?: "teal" | "amber";
}) {
  const max = months.reduce((m, b) => Math.max(m, b.amount), 0);
  const bar = tone === "amber" ? "bg-amber-500" : "bg-teal-600";

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <h2 className="text-sm font-semibold text-gray-900">{title}</h2>

      {max === 0 ? (
        <p className="mt-4 text-sm text-gray-500">
          Nothing recorded in these months.
        </p>
      ) : (
        <div className="mt-4 flex items-end gap-3 h-36">
          {months.map((b) => (
            <div
              key={`${b.year}-${b.month}`}
              className="flex-1 flex flex-col items-center justify-end h-full"
            >
              <span className="text-xs text-gray-600 mb-1">
                {b.amount > 0 ? formatKes(b.amount).replace("KES ", "") : ""}
              </span>
              <div
                className={`w-full rounded-t ${bar}`}
                // Zero stays visibly zero; a floor would imply money that is
                // not there.
                style={{ height: `${(b.amount / max) * 100}%` }}
              />
              <span className="mt-2 text-xs text-gray-500">{b.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* The same numbers, readable without seeing the bars. */}
      <table className="sr-only">
        <caption>{title}</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Amount</th>
          </tr>
        </thead>
        <tbody>
          {months.map((b) => (
            <tr key={`${b.year}-${b.month}-text`}>
              <th scope="row">{b.label}</th>
              <td>{formatKes(b.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
