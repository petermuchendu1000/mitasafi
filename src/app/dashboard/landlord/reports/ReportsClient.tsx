"use client";

/**
 * Six reports, each one downloadable.
 *
 * WHY THERE IS NO PROFIT AND LOSS STATEMENT HERE
 *   There is no expenses table on this project. A P&L assembled from rent
 *   minus maintenance would carry a bottom line that looks like profit and
 *   is not one — and unlike every other number on this page, that is the one
 *   a landlord would take to a bank. The gap is stated on screen rather than
 *   filled in with the nearest available figure.
 *
 * EVERY REPORT SAYS WHAT IT COUNTS
 *   A report's caption is not decoration. "Arrears" that silently excluded
 *   leases with no payment history, without saying so, would read as "these
 *   four tenants owe nothing" when the truth is "nothing has been recorded
 *   for them".
 */

import { useState } from "react";
import { Download, AlertTriangle, Info } from "lucide-react";
import { formatKes } from "@/lib/landlord/labels";
import {
  toCsv,
  type RentRoll,
  type ArrearsReport,
  type DepositRegister,
  type ExpiryReport,
  type OccupancyRow,
  type CollectionRow,
} from "@/lib/landlord/reports";

type TabId =
  | "rent-roll"
  | "arrears"
  | "collections"
  | "deposits"
  | "expiries"
  | "occupancy";

const TABS: { id: TabId; label: string }[] = [
  { id: "rent-roll", label: "Rent roll" },
  { id: "arrears", label: "Arrears" },
  { id: "collections", label: "Collections" },
  { id: "deposits", label: "Deposits held" },
  { id: "expiries", label: "Lease expiries" },
  { id: "occupancy", label: "Occupancy" },
];

function download(filename: string, csv: string) {
  // A BOM, so Excel reads UTF-8 and Kenyan names with accents survive.
  const blob = new Blob(["﻿" + csv], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function Th({
  children,
  right,
}: {
  children: React.ReactNode;
  right?: boolean;
}) {
  return (
    <th
      scope="col"
      className={`px-4 py-2 font-medium ${right ? "text-right" : "text-left"}`}
    >
      {children}
    </th>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-4 py-10 text-center text-sm text-gray-500">{children}</p>
  );
}

function Note({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex gap-2 px-4 py-3 text-xs text-gray-600 bg-gray-50 border-b border-gray-200">
      <Info aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
      <span>{children}</span>
    </p>
  );
}

export function ReportsClient({
  generatedOn,
  rentRoll,
  arrears,
  deposits,
  expiries,
  occupancy,
  collections,
}: {
  generatedOn: string;
  rentRoll: RentRoll;
  arrears: ArrearsReport;
  deposits: DepositRegister;
  expiries: ExpiryReport;
  occupancy: {
    rows: OccupancyRow[];
    total: number;
    occupied: number;
    rate: number | null;
  };
  collections: CollectionRow[];
}) {
  const [tab, setTab] = useState<TabId>("rent-roll");

  const exporters: Record<TabId, () => void> = {
    "rent-roll": () =>
      download(
        `rent-roll-${generatedOn}.csv`,
        toCsv(
          [
            "Building",
            "Unit",
            "Tenant",
            "Phone",
            "Monthly rent",
            "Due day",
            "Start",
            "End",
            "Deposit",
            "Status",
            "Balance",
          ],
          rentRoll.rows.map((r) => [
            r.building,
            r.unit,
            r.tenant,
            r.phone,
            r.monthlyRent,
            r.dueDay,
            r.start,
            r.end,
            r.deposit,
            r.status,
            r.balance,
          ]),
        ),
      ),
    arrears: () =>
      download(
        `arrears-${generatedOn}.csv`,
        toCsv(
          [
            "Building",
            "Unit",
            "Tenant",
            "Phone",
            "Month",
            "Due",
            "Paid",
            "Balance",
            "Days late",
          ],
          arrears.rows.map((r) => [
            r.building,
            r.unit,
            r.tenant,
            r.phone,
            r.period,
            r.due,
            r.paid,
            r.balance,
            r.daysLate,
          ]),
        ),
      ),
    collections: () =>
      download(
        `collections-${generatedOn}.csv`,
        toCsv(
          [
            "Month",
            "Expected",
            "Collected",
            "Rate %",
            "Leases with no record yet",
          ],
          collections.map((r) => [
            r.period,
            r.expected,
            r.collected,
            r.rate ?? "",
            r.leasesNotYetRecorded,
          ]),
        ),
      ),
    deposits: () =>
      download(
        `deposits-held-${generatedOn}.csv`,
        toCsv(
          ["Building", "Unit", "Tenant", "Amount", "Status"],
          deposits.rows.map((r) => [
            r.building,
            r.unit,
            r.tenant,
            r.amount,
            r.status,
          ]),
        ),
      ),
    expiries: () =>
      download(
        `lease-expiries-${generatedOn}.csv`,
        toCsv(
          ["Building", "Unit", "Tenant", "Phone", "Ends", "Days left"],
          expiries.rows.map((r) => [
            r.building,
            r.unit,
            r.tenant,
            r.phone,
            r.end,
            r.daysLeft,
          ]),
        ),
      ),
    occupancy: () =>
      download(
        `occupancy-${generatedOn}.csv`,
        toCsv(
          ["Building", "Units", "Occupied", "Vacant", "Other", "Rate %"],
          occupancy.rows.map((r) => [
            r.building,
            r.total,
            r.occupied,
            r.vacant,
            r.other,
            r.rate ?? "",
          ]),
        ),
      ),
  };

  const rowCount: Record<TabId, number> = {
    "rent-roll": rentRoll.rows.length,
    arrears: arrears.rows.length,
    collections: collections.length,
    deposits: deposits.rows.length,
    expiries: expiries.rows.length,
    occupancy: occupancy.rows.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          <p className="mt-1 text-gray-500">
            Everything below is computed from your records as they stand on{" "}
            {generatedOn}
          </p>
        </div>
        <button
          type="button"
          onClick={exporters[tab]}
          disabled={rowCount[tab] === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
        >
          <Download aria-hidden="true" className="w-4 h-4" />
          Download CSV
        </button>
      </div>

      <div
        role="tablist"
        aria-label="Reports"
        className="flex flex-wrap gap-1 border-b border-gray-200"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div
        role="tabpanel"
        id={`panel-${tab}`}
        aria-labelledby={`tab-${tab}`}
        className="bg-white rounded-xl border border-gray-200 overflow-hidden"
      >
        {/* ---------------- rent roll ---------------- */}
        {tab === "rent-roll" && (
          <>
            <Note>
              Every live lease, with this month&apos;s position. A lease that
              has not started yet is listed but contributes nothing to the rent
              total — it is not income you are owed in{" "}
              {monthOf(rentRoll.period)}. Balance is this month&apos;s rent not
              yet received; on a lease still inside its grace period that is not
              arrears yet, which is what the status column tells you.
            </Note>
            {rentRoll.rows.length === 0 ? (
              <Empty>No live leases yet.</Empty>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Rent roll: every live lease with its rent, deposit and current
                  status
                </caption>
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <Th>Building</Th>
                    <Th>Unit</Th>
                    <Th>Tenant</Th>
                    <Th right>Rent</Th>
                    <Th>Due</Th>
                    <Th>Ends</Th>
                    <Th right>Deposit</Th>
                    <Th>Status</Th>
                    <Th right>Balance</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {rentRoll.rows.map((r, i) => (
                    <tr key={`${r.building}-${r.unit}-${i}`}>
                      <td className="px-4 py-2.5 text-gray-600">
                        {r.building}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {r.unit}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{r.tenant}</td>
                      <td className="px-4 py-2.5 text-right text-gray-900">
                        {formatKes(r.monthlyRent)}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        Day {r.dueDay}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {r.end || "Open"}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {formatKes(r.deposit)}
                      </td>
                      <td className="px-4 py-2.5 capitalize text-gray-700">
                        {r.status}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-900">
                        {r.balance > 0 ? formatKes(r.balance) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium text-gray-900">
                  <tr>
                    <td className="px-4 py-2.5" colSpan={3}>
                      {rentRoll.rows.length} lease
                      {rentRoll.rows.length === 1 ? "" : "s"}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatKes(rentRoll.totalRent)}
                    </td>
                    <td className="px-4 py-2.5" colSpan={2}>
                      due this month
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatKes(rentRoll.totalDeposit)}
                    </td>
                    <td className="px-4 py-2.5" colSpan={2}>
                      deposits held
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </>
        )}

        {/* ---------------- arrears ---------------- */}
        {tab === "arrears" && (
          <>
            <Note>
              Rent still owed across the last {arrears.monthsConsidered} months,
              counted only from the first month rent was recorded against each
              lease — months with no records are an absence of records, not
              debt. Money still inside its grace period is not listed.
              {arrears.leasesWithNoLedger > 0 && (
                <>
                  {" "}
                  <strong>
                    {arrears.leasesWithNoLedger} lease
                    {arrears.leasesWithNoLedger === 1 ? " has" : "s have"} no
                    recorded rent at all
                  </strong>{" "}
                  and {arrears.leasesWithNoLedger === 1 ? "is" : "are"} left out
                  entirely — that is a gap in the records, not a tenant who owes
                  nothing.
                </>
              )}
            </Note>
            {arrears.rows.length === 0 ? (
              <Empty>Nothing overdue.</Empty>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Arrears by lease and month, oldest debt first
                </caption>
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <Th>Unit</Th>
                    <Th>Tenant</Th>
                    <Th>Month</Th>
                    <Th right>Due</Th>
                    <Th right>Paid</Th>
                    <Th right>Owed</Th>
                    <Th right>Days late</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {arrears.rows.map((r, i) => (
                    <tr key={`${r.unit}-${r.period}-${i}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {r.unit}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{r.tenant}</td>
                      <td className="px-4 py-2.5 text-gray-600">{r.period}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {formatKes(r.due)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {formatKes(r.paid)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-medium text-amber-900">
                        {formatKes(r.balance)}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-700">
                        {r.daysLate}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium text-gray-900">
                  <tr>
                    <td className="px-4 py-2.5" colSpan={5}>
                      Total owed
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatKes(arrears.total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            )}
          </>
        )}

        {/* ---------------- collections ---------------- */}
        {tab === "collections" && (
          <>
            <Note>
              What was due each month against what was confirmed. A terminated
              lease still counts for the months it was in force — dropping it
              would make past months look under-let and flatter the rate. A
              lease is counted only from the first month rent was recorded
              against it: before that there are no records, which is not the
              same as having collected nothing, and the month shows a dash.
            </Note>
            <table className="w-full text-sm">
              <caption className="sr-only">
                Rent expected against rent collected, by month
              </caption>
              <thead className="bg-gray-50 text-gray-600">
                <tr>
                  <Th>Month</Th>
                  <Th right>Expected</Th>
                  <Th right>Collected</Th>
                  <Th right>Rate</Th>
                  <Th right>Not recorded</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {collections.map((r) => (
                  <tr key={r.period}>
                    <td className="px-4 py-2.5 text-gray-700">{r.period}</td>
                    <td className="px-4 py-2.5 text-right text-gray-600">
                      {formatKes(r.expected)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-900">
                      {formatKes(r.collected)}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-700">
                      {/* A dash, not 0%. Nothing was due, so there was no
                          collection to fail at. */}
                      {r.rate === null ? "—" : `${r.rate}%`}
                    </td>
                    <td className="px-4 py-2.5 text-right text-gray-500">
                      {r.leasesNotYetRecorded > 0
                        ? `${r.leasesNotYetRecorded} lease${r.leasesNotYetRecorded === 1 ? "" : "s"}`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}

        {/* ---------------- deposits ---------------- */}
        {tab === "deposits" && (
          <>
            <Note>
              Money you hold and owe back at the end of each tenancy. It is a
              liability, not income, and is never counted as earnings anywhere
              in MitaSafi.
            </Note>
            {deposits.rows.length === 0 ? (
              <Empty>No deposits recorded on live leases.</Empty>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Deposits held, by tenant, with the total owed back
                </caption>
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <Th>Building</Th>
                    <Th>Unit</Th>
                    <Th>Tenant</Th>
                    <Th>Status</Th>
                    <Th right>Amount</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {deposits.rows.map((r, i) => (
                    <tr key={`${r.unit}-${i}`}>
                      <td className="px-4 py-2.5 text-gray-600">
                        {r.building}
                      </td>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {r.unit}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{r.tenant}</td>
                      <td className="px-4 py-2.5 capitalize text-gray-600">
                        {r.status}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-900">
                        {formatKes(r.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium text-gray-900">
                  <tr>
                    <td className="px-4 py-2.5" colSpan={4}>
                      Total held
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {formatKes(deposits.total)}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </>
        )}

        {/* ---------------- expiries ---------------- */}
        {tab === "expiries" && (
          <>
            <Note>
              Leases ending within {expiries.withinDays} days.
              {expiries.lapsed > 0 && (
                <>
                  {" "}
                  <strong>
                    {expiries.lapsed} {expiries.lapsed === 1 ? "is" : "are"}{" "}
                    already past the end date and still marked live
                  </strong>{" "}
                  — either renew or close them.
                </>
              )}
            </Note>
            {expiries.rows.length === 0 ? (
              <Empty>
                Nothing ending in the next {expiries.withinDays} days.
              </Empty>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Leases ending soon, nearest first
                </caption>
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <Th>Unit</Th>
                    <Th>Tenant</Th>
                    <Th>Phone</Th>
                    <Th>Ends</Th>
                    <Th right>Days left</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {expiries.rows.map((r, i) => (
                    <tr key={`${r.unit}-${i}`}>
                      <td className="px-4 py-2.5 font-medium text-gray-900">
                        {r.unit}
                      </td>
                      <td className="px-4 py-2.5 text-gray-700">{r.tenant}</td>
                      <td className="px-4 py-2.5 text-gray-600">
                        {r.phone || "—"}
                      </td>
                      <td className="px-4 py-2.5 text-gray-600">{r.end}</td>
                      <td className="px-4 py-2.5 text-right">
                        {r.daysLeft < 0 ? (
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <AlertTriangle
                              aria-hidden="true"
                              className="w-3.5 h-3.5"
                            />
                            {Math.abs(r.daysLeft)} days ago
                          </span>
                        ) : (
                          <span className="text-gray-900">{r.daysLeft}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}

        {/* ---------------- occupancy ---------------- */}
        {tab === "occupancy" && (
          <>
            <Note>
              Units by status, per building. &ldquo;Other&rdquo; is anything
              that exists but cannot be let today — under maintenance, or
              reserved.
            </Note>
            {occupancy.rows.length === 0 ? (
              <Empty>No buildings yet.</Empty>
            ) : (
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Occupancy by building, with the portfolio total
                </caption>
                <thead className="bg-gray-50 text-gray-600">
                  <tr>
                    <Th>Building</Th>
                    <Th right>Units</Th>
                    <Th right>Occupied</Th>
                    <Th right>Vacant</Th>
                    <Th right>Other</Th>
                    <Th right>Rate</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {occupancy.rows.map((r) => (
                    <tr key={r.building}>
                      <td className="px-4 py-2.5 text-gray-700">
                        {r.building}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-900">
                        {r.total}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {r.occupied}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {r.vacant}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {r.other}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-900">
                        {r.rate === null ? "—" : `${r.rate}%`}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium text-gray-900">
                  <tr>
                    <td className="px-4 py-2.5">Portfolio</td>
                    <td className="px-4 py-2.5 text-right">
                      {occupancy.total}
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {occupancy.occupied}
                    </td>
                    <td className="px-4 py-2.5" colSpan={2} />
                    <td className="px-4 py-2.5 text-right">
                      {occupancy.rate === null ? "—" : `${occupancy.rate}%`}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </>
        )}
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900">
          Why there is no profit and loss statement here
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          MitaSafi records no general expenses — the only landlord outgoing it
          holds anywhere is maintenance cost. A statement built from rent minus
          maintenance would show a bottom line that looks like profit and is not
          one. Income and maintenance spend each have their own page, and each
          says exactly what it covers.
        </p>
      </section>
    </div>
  );
}

function monthOf(p: { year: number; month: number }): string {
  return new Date(Date.UTC(p.year, p.month - 1, 1)).toLocaleString("en-GB", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}
