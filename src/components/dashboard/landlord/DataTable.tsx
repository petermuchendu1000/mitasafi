/**
 * One table, two shapes: a table from sm: up, a list of cards below it.
 *
 * WHY THIS EXISTS RATHER THAN SIX HAND-WRITTEN LISTS
 *   The reports page carries six tables of five to nine columns each, and
 *   the reconcile page carries a seventh. At 360px the widest of them
 *   measured 749px inside a 326px box whose parent was overflow-hidden, so
 *   the columns past "Tenant" were not merely awkward to reach, they were
 *   unreachable: no scrollbar, no gesture, nothing. On the rent roll that
 *   meant rent, deposit, status and balance.
 *
 *   Writing a separate card list per report would be seven near-identical
 *   blocks to keep in step with seven sets of columns. Taking the columns
 *   as data instead means the two shapes cannot disagree about what a row
 *   contains, because they read the same array.
 *
 * WHAT A CARD LOOKS LIKE
 *   The cell at `titleAt` becomes the card's heading and the one at
 *   `subtitleAt`, if given, sits beside it. Every other column becomes a
 *   label and a value, the label being the column header that would have
 *   sat above it in the table. That is what makes the card readable without
 *   the header row: "KES 85,000" alone says nothing, "Rent KES 85,000" does.
 *
 * ACCESSIBILITY
 *   Only one of the two is in the accessibility tree at a time, because
 *   `hidden` and `sm:hidden` resolve to display:none. The caption is on the
 *   table and repeated as a visually hidden heading on the card list, so a
 *   screen reader on a phone still hears what the list is.
 */

import { Fragment } from "react";
import { cn } from "@/lib/utils";

export interface DataColumn {
  /** The header text, and the label the card uses for this cell. */
  label: string;
  /** Right-align in the table. Card values are right-aligned regardless. */
  right?: boolean;
  /** Leave this column out of the card. For a value the heading repeats. */
  cardHidden?: boolean;
}

export interface DataRow {
  key: string;
  cells: React.ReactNode[];
}

export interface DataTotal {
  label: string;
  value: React.ReactNode;
}

export function DataTable({
  caption,
  columns,
  rows,
  totals,
  titleAt = 0,
  subtitleAt,
}: {
  /** Says what the table counts. Required: see the note in ReportsClient. */
  caption: string;
  columns: DataColumn[];
  rows: DataRow[];
  /** Footer pairs. Rendered as a tfoot row and as a card-list summary. */
  totals?: DataTotal[];
  /** Index of the cell that becomes the card heading. */
  titleAt?: number;
  /** Index of the cell that sits beside the heading, if any. */
  subtitleAt?: number;
}) {
  return (
    <>
      <div className="sm:hidden divide-y divide-gray-100">
        <h3 className="sr-only">{caption}</h3>
        {rows.map((row) => (
          // Every link in a card gets a 44px box. The cells come from the
          // callers and most of them hand over a bare text link, which on a
          // phone measured 15 to 24px tall: a tenant name, a unit number, a
          // phone number. Doing it here rather than in each caller is the
          // same argument as taking the columns as data, and it cannot be
          // forgotten by the next report added.
          <div
            key={row.key}
            className="px-4 py-3 [&_a]:min-h-[44px] [&_a]:inline-flex [&_a]:items-center"
          >
            <div className="flex items-baseline justify-between gap-2">
              <p className="min-w-0 font-medium text-gray-900 truncate">
                {row.cells[titleAt]}
              </p>
              {subtitleAt !== undefined && (
                <p className="shrink-0 text-xs text-gray-500">
                  {row.cells[subtitleAt]}
                </p>
              )}
            </div>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm">
              {columns.map((column, i) => {
                if (i === titleAt || i === subtitleAt || column.cardHidden) {
                  return null;
                }
                return (
                  <Fragment key={column.label}>
                    <dt className="text-gray-500">{column.label}</dt>
                    <dd className="text-right text-gray-900 tabular-nums">
                      {row.cells[i]}
                    </dd>
                  </Fragment>
                );
              })}
            </dl>
          </div>
        ))}
        {totals && totals.length > 0 && (
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 bg-gray-50 px-4 py-3 text-sm font-medium text-gray-900">
            {totals.map((total) => (
              <Fragment key={total.label}>
                <dt>{total.label}</dt>
                <dd className="text-right tabular-nums">{total.value}</dd>
              </Fragment>
            ))}
          </dl>
        )}
      </div>

      <div className="hidden sm:block overflow-x-auto">
        <table className="w-full text-sm">
          <caption className="sr-only">{caption}</caption>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              {columns.map((column) => (
                <th
                  key={column.label}
                  scope="col"
                  className={cn(
                    "px-4 py-2 font-medium whitespace-nowrap",
                    column.right ? "text-right" : "text-left",
                  )}
                >
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {rows.map((row) => (
              <tr key={row.key}>
                {columns.map((column, i) => (
                  <td
                    key={column.label}
                    className={cn(
                      "px-4 py-2.5 text-gray-700",
                      column.right && "text-right tabular-nums",
                    )}
                  >
                    {row.cells[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          {totals && totals.length > 0 && (
            <tfoot className="bg-gray-50 font-medium text-gray-900">
              <tr>
                {totals.length * 2 <= columns.length ? (
                  totals.map((total, i) => (
                    <Fragment key={total.label}>
                      <td
                        className="px-4 py-2.5 whitespace-nowrap"
                        // The FIRST label absorbs whatever columns are
                        // spare, which pushes the pairs right so the
                        // figures land under the money columns they total.
                        // N pairs is 2N cells; the spare is C - 2N + 1, and
                        // the row then spans exactly C.
                        colSpan={
                          i === 0 ? columns.length - totals.length * 2 + 1 : 1
                        }
                      >
                        {total.label}
                      </td>
                      <td className="px-4 py-2.5 text-right tabular-nums">
                        {total.value}
                      </td>
                    </Fragment>
                  ))
                ) : (
                  // More pairs than the table has room to lay out in
                  // columns. The first draft clamped the spare colSpan at 1
                  // and emitted a row one cell wider than the table, which
                  // a browser renders by growing the table past its own
                  // header. One spanning cell is the honest answer.
                  <td
                    colSpan={columns.length}
                    className="px-4 py-2.5 flex flex-wrap gap-x-6 gap-y-1"
                  >
                    {totals.map((total) => (
                      <span key={total.label} className="whitespace-nowrap">
                        {total.label}
                        {total.value === "" ? "" : " "}
                        <span className="tabular-nums">{total.value}</span>
                      </span>
                    ))}
                  </td>
                )}
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </>
  );
}
