"use client";

/**
 * The statement as the tenant will read it.
 *
 * TWO THINGS ON SCREEN THAT USUALLY ARE NOT
 *   Money that could not be placed in a month, and a note saying where the
 *   ledger starts. Both exist because this page is handed to the person
 *   being asked to pay: a payment they made and cannot find on the
 *   statement, or a charge for a month before anyone was keeping records,
 *   are the two things that turn a bill into an argument.
 *
 * `print:` classes rather than a PDF library: a landlord's browser already
 * prints to PDF, and the statement is plain enough to survive it.
 */

import { Printer, Download, AlertTriangle, Info } from "lucide-react";
import { formatKes } from "@/lib/landlord/labels";
import { toCsv } from "@/lib/landlord/reports";
import type { Statement, StatementLease } from "@/lib/landlord/statement";

interface Entry {
  lease: StatementLease;
  status: string;
  statement: Statement;
}

/** Owed by the tenant, in credit, or square — said in words, not a sign. */
function balanceLabel(n: number): { text: string; tone: string } {
  if (n > 0) return { text: `${formatKes(n)} owing`, tone: "text-amber-900" };
  if (n < 0)
    return { text: `${formatKes(-n)} in credit`, tone: "text-teal-800" };
  return { text: "Nothing owing", tone: "text-gray-700" };
}

export function StatementView({
  tenantName,
  tenantPhone,
  tenantEmail,
  generatedOn,
  statements,
}: {
  tenantName: string;
  tenantPhone: string | null;
  tenantEmail: string | null;
  generatedOn: string;
  statements: Entry[];
}) {
  function download(e: Entry) {
    const rows: (string | number)[][] = e.statement.lines.map((l) => [
      l.period,
      l.charged,
      l.paid,
      l.balance,
    ]);
    for (const u of e.statement.unallocated) {
      rows.push([`Unallocated ${u.date}`, 0, u.amount, ""]);
    }
    const csv = toCsv(["Month", "Charged", "Paid", "Balance"], rows);
    const blob = new Blob(["﻿" + csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `statement-${e.lease.unit_label}-${generatedOn}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Statement for {tenantName}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {[tenantPhone, tenantEmail].filter(Boolean).join(" · ") || "—"}
            {" · as at "}
            {generatedOn}
          </p>
        </div>
        <div className="flex gap-2 print:hidden">
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700"
          >
            <Printer aria-hidden="true" className="w-4 h-4" />
            Print or save as PDF
          </button>
        </div>
      </div>

      {statements.map((e) => {
        const s = e.statement;
        const closing = balanceLabel(s.closingBalance);
        return (
          <section
            key={e.lease.id}
            className="bg-white rounded-xl border border-gray-200 overflow-hidden break-inside-avoid"
          >
            <div className="px-5 py-4 border-b border-gray-200 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-gray-900">
                  {e.lease.unit_label}
                  {e.lease.building_label ? `, ${e.lease.building_label}` : ""}
                </h2>
                <p className="text-sm text-gray-500 mt-0.5">
                  {formatKes(e.lease.monthly_rent)} a month, due on day{" "}
                  {e.lease.rent_due_day} · lease {e.lease.start_date} to{" "}
                  {e.lease.end_date || "open"} · {e.status}
                </p>
              </div>
              <button
                type="button"
                onClick={() => download(e)}
                disabled={s.lines.length === 0}
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 disabled:opacity-50 print:hidden"
              >
                <Download aria-hidden="true" className="w-3.5 h-3.5" />
                CSV
              </button>
            </div>

            {s.lines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                No rent has been recorded against this lease, so there is
                nothing to state. This is a gap in the records, not a tenant who
                owes nothing.
              </p>
            ) : (
              <>
                <p className="flex gap-2 px-5 py-3 text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
                  <Info
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0 mt-0.5"
                  />
                  <span>
                    From {s.from} to {s.to}. The statement begins at the first
                    month rent was recorded against this lease — earlier months
                    have no records, which is not the same as rent unpaid, so
                    nothing is charged for them.
                  </span>
                </p>

                <table className="w-full text-sm">
                  <caption className="sr-only">
                    Rent charged and paid each month, with a running balance
                  </caption>
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th scope="col" className="px-5 py-2 font-medium">
                        Month
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2 font-medium text-right"
                      >
                        Rent charged
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2 font-medium text-right"
                      >
                        Paid
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2 font-medium text-right"
                      >
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {s.lines.map((l) => (
                      <tr key={l.key}>
                        <td className="px-5 py-2.5 text-gray-700">
                          {l.period}
                        </td>
                        <td className="px-5 py-2.5 text-right text-gray-600">
                          {formatKes(l.charged)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-gray-900">
                          {l.paid > 0 ? formatKes(l.paid) : "—"}
                        </td>
                        <td
                          className={`px-5 py-2.5 text-right font-medium ${
                            l.balance > 0
                              ? "text-amber-900"
                              : l.balance < 0
                                ? "text-teal-800"
                                : "text-gray-500"
                          }`}
                        >
                          {l.balance === 0
                            ? "—"
                            : l.balance > 0
                              ? formatKes(l.balance)
                              : `(${formatKes(-l.balance)})`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium text-gray-900">
                    <tr>
                      <td className="px-5 py-2.5">Total</td>
                      <td className="px-5 py-2.5 text-right">
                        {formatKes(s.totalCharged)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {formatKes(s.totalPaid)}
                      </td>
                      <td className={`px-5 py-2.5 text-right ${closing.tone}`}>
                        {closing.text}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}

            {/* ---- money that could not be placed in a month ---- */}
            {s.unallocated.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-200 bg-amber-50">
                <p className="flex gap-2 text-sm font-medium text-amber-900">
                  <AlertTriangle
                    aria-hidden="true"
                    className="w-4 h-4 shrink-0 mt-0.5"
                  />
                  {formatKes(s.unallocatedTotal)} received but not yet applied
                  to a month
                </p>
                <p className="mt-1 text-xs text-amber-900">
                  This money has been received and is NOT counted in the balance
                  above. Assign it to a month and the balance will change.
                </p>
                <ul className="mt-2 space-y-1">
                  {s.unallocated.map((u) => (
                    <li key={u.id} className="text-sm text-amber-900">
                      {u.date} · {formatKes(u.amount)}
                      {u.reference && (
                        <span className="font-mono text-xs">
                          {" "}
                          · {u.reference}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* ---- everything else ---- */}
            {(s.other.length > 0 ||
              s.depositHeld > 0 ||
              s.depositPayments.length > 0) && (
              <div className="px-5 py-4 border-t border-gray-200">
                <h3 className="text-sm font-semibold text-gray-900">
                  Other amounts
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Not rent, and never applied to the rent balance above.
                </p>

                {(s.depositHeld > 0 || s.depositPayments.length > 0) && (
                  <div className="mt-2">
                    <p className="text-sm text-gray-700">
                      Deposit held · {formatKes(s.depositHeld)} — refundable at
                      the end of the tenancy
                    </p>
                    {/* The payments are EVIDENCE for the figure above, nested
                        beneath it. Listed as siblings they read as a second
                        deposit, and the tenant adds the two together. */}
                    {s.depositPayments.length > 0 && (
                      <ul className="mt-1 ml-4 space-y-0.5">
                        {s.depositPayments.map((d) => (
                          <li key={d.id} className="text-xs text-gray-500">
                            received {d.date} · {formatKes(d.amount)}
                            {d.reference && (
                              <span className="font-mono">
                                {" "}
                                · {d.reference}
                              </span>
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                    {s.depositPaid !== s.depositHeld && (
                      <p className="mt-1 ml-4 text-xs text-amber-900">
                        The lease says {formatKes(s.depositHeld)} but{" "}
                        {formatKes(s.depositPaid)} has been recorded as
                        received. Worth reconciling before the tenancy ends.
                      </p>
                    )}
                  </div>
                )}

                {s.other.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {s.other.map((o) => (
                      <li key={o.id} className="text-sm text-gray-700">
                        {o.date} · {o.label} · {formatKes(o.amount)}
                        {o.reference && (
                          <span className="font-mono text-xs">
                            {" "}
                            · {o.reference}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}

            {s.unconfirmedCount > 0 && (
              <p className="px-5 py-3 border-t border-gray-200 text-xs text-gray-500">
                {s.unconfirmedCount} payment
                {s.unconfirmedCount === 1 ? " is" : "s are"} recorded but not
                confirmed, and {s.unconfirmedCount === 1 ? "is" : "are"} not
                counted anywhere above.
              </p>
            )}
          </section>
        );
      })}

      <p className="text-xs text-gray-500">
        Produced by MitaSafi from the payments your landlord has recorded.
        MitaSafi never receives or holds rent.
      </p>
    </div>
  );
}
