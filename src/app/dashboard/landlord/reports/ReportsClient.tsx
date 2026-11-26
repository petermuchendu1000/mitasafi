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
 *
 * WHY THE REPORTS ARE DATA RATHER THAN MARKUP
 *   Each one hands DataTable a list of columns and a list of rows. That is
 *   not tidiness: at 360px these tables measured up to 749px inside a 326px
 *   box whose parent was overflow-hidden, so every column past the third was
 *   unreachable, with no scrollbar and no gesture to get at it. DataTable
 *   renders a card list below sm: and the table above it, and it can only do
 *   that if it knows which header belongs to which cell.
 */

import { useState } from "react";
import { Download, AlertTriangle, Info } from "lucide-react";
import { DataTable } from "@/components/dashboard/landlord/DataTable";
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

// Th lived here. DataTable renders the header row from the same column
// array the cells come from, so there is nothing left for it to do.

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
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-bold text-gray-900">Reports</h1>
          {/* Was "Everything below is computed from your records as they
              stand on 2026-11-27": two lines on a phone, and an ISO date
              nobody reads aloud. */}
          <p className="mt-1 text-sm text-gray-500">
            As at {asAt(generatedOn)}
          </p>
        </div>
        <button
          type="button"
          onClick={exporters[tab]}
          disabled={rowCount[tab] === 0}
          className="shrink-0 inline-flex items-center gap-2 px-4 min-h-[44px] rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
        >
          <Download aria-hidden="true" className="w-4 h-4 shrink-0" />
          CSV
        </button>
      </div>

      {/* The six tabs wrapped onto three rows at 360px, each 38px tall. One
          scrolling row is the phone pattern, and from sm: there is room for
          them all anyway. */}
      <div
        role="tablist"
        aria-label="Reports"
        className="flex gap-1 overflow-x-auto border-b border-gray-200 sm:flex-wrap sm:overflow-visible"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`shrink-0 whitespace-nowrap px-4 min-h-[44px] text-sm font-medium border-b-2 -mb-px ${
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
              Every live lease this month. A lease that has not started is
              listed but adds nothing to the total. Balance is rent not yet
              received, which inside the grace period is not arrears.
            </Note>
            {rentRoll.rows.length === 0 ? (
              <Empty>No live leases yet.</Empty>
            ) : (
              <DataTable
                caption="Rent roll: every live lease with its rent, deposit and current status"
                titleAt={0}
                subtitleAt={1}
                columns={[
                  { label: "Unit" },
                  { label: "Building" },
                  { label: "Tenant" },
                  { label: "Rent", right: true },
                  { label: "Due day" },
                  { label: "Ends" },
                  { label: "Deposit", right: true },
                  { label: "Status" },
                  { label: "Balance", right: true },
                ]}
                rows={rentRoll.rows.map((r, i) => ({
                  key: `${r.building}-${r.unit}-${i}`,
                  cells: [
                    r.unit,
                    r.building,
                    r.tenant,
                    formatKes(r.monthlyRent),
                    `Day ${r.dueDay}`,
                    shortDate(r.end) || "Open",
                    formatKes(r.deposit),
                    <span key="s" className="capitalize">
                      {r.status}
                    </span>,
                    formatKes(r.balance),
                  ],
                }))}
                totals={[
                  {
                    label: `${rentRoll.rows.length} lease${
                      rentRoll.rows.length === 1 ? "" : "s"
                    }`,
                    value: "",
                  },
                  { label: "Rent due", value: formatKes(rentRoll.totalRent) },
                  {
                    label: "Deposits",
                    value: formatKes(rentRoll.totalDeposit),
                  },
                ]}
              />
            )}
          </>
        )}

        {/* ---------------- arrears ---------------- */}
        {tab === "arrears" && (
          <>
            <Note>
              Rent owed over the last {arrears.monthsConsidered} months, counted
              from the first month rent was recorded against each lease. Months
              with no records are missing records, not debt. Money inside its
              grace period is not listed.
              {arrears.leasesWithNoLedger > 0 && (
                <>
                  {" "}
                  <strong>
                    {arrears.leasesWithNoLedger} lease
                    {arrears.leasesWithNoLedger === 1 ? " has" : "s have"} no
                    recorded rent at all
                  </strong>{" "}
                  and {arrears.leasesWithNoLedger === 1 ? "is" : "are"} left
                  out. That is a gap in your records, not a tenant who owes
                  nothing.
                </>
              )}
            </Note>
            {arrears.rows.length === 0 ? (
              <Empty>Nothing overdue.</Empty>
            ) : (
              <DataTable
                caption="Arrears by lease and month, oldest debt first"
                titleAt={0}
                subtitleAt={2}
                columns={[
                  { label: "Unit" },
                  { label: "Tenant" },
                  { label: "Month" },
                  { label: "Due", right: true },
                  { label: "Paid", right: true },
                  { label: "Owed", right: true },
                  { label: "Days late", right: true },
                ]}
                rows={arrears.rows.map((r, i) => ({
                  key: `${r.unit}-${r.period}-${i}`,
                  cells: [
                    r.unit,
                    r.tenant,
                    r.period,
                    formatKes(r.due),
                    formatKes(r.paid),
                    <span key="o" className="font-medium text-amber-900">
                      {formatKes(r.balance)}
                    </span>,
                    r.daysLate,
                  ],
                }))}
                totals={[
                  { label: "Total owed", value: formatKes(arrears.total) },
                ]}
              />
            )}
          </>
        )}

        {/* ---------------- collections ---------------- */}
        {tab === "collections" && (
          <>
            <Note>
              What was due each month against what was confirmed. A terminated
              lease still counts for the months it was in force. A lease counts
              only from the first month rent was recorded against it.
            </Note>
            <DataTable
              caption="Rent expected against rent collected, by month"
              titleAt={0}
              columns={[
                { label: "Month" },
                { label: "Expected", right: true },
                { label: "Collected", right: true },
                { label: "Rate", right: true },
                { label: "Not recorded", right: true },
              ]}
              rows={collections.map((r) => ({
                key: r.period,
                cells: [
                  r.period,
                  formatKes(r.expected),
                  formatKes(r.collected),
                  // Not 0%. Nothing was due, so there was no collection to
                  // fail at. This used to print an em dash.
                  r.rate === null ? "Nothing due" : `${r.rate}%`,
                  r.leasesNotYetRecorded > 0
                    ? `${r.leasesNotYetRecorded} lease${
                        r.leasesNotYetRecorded === 1 ? "" : "s"
                      }`
                    : "None",
                ],
              }))}
            />
          </>
        )}

        {/* ---------------- deposits ---------------- */}
        {tab === "deposits" && (
          <>
            <Note>
              Money you hold and owe back at the end of each tenancy. A
              liability, never counted as income.
            </Note>
            {deposits.rows.length === 0 ? (
              <Empty>No deposits recorded on live leases.</Empty>
            ) : (
              <DataTable
                caption="Deposits held, by tenant, with the total owed back"
                titleAt={0}
                subtitleAt={1}
                columns={[
                  { label: "Unit" },
                  { label: "Building" },
                  { label: "Tenant" },
                  { label: "Status" },
                  { label: "Amount", right: true },
                ]}
                rows={deposits.rows.map((r, i) => ({
                  key: `${r.unit}-${i}`,
                  cells: [
                    r.unit,
                    r.building,
                    r.tenant,
                    <span key="s" className="capitalize">
                      {r.status}
                    </span>,
                    formatKes(r.amount),
                  ],
                }))}
                totals={[
                  { label: "Total held", value: formatKes(deposits.total) },
                ]}
              />
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
                  </strong>
                  . Renew or close them.
                </>
              )}
            </Note>
            {expiries.rows.length === 0 ? (
              <Empty>
                Nothing ending in the next {expiries.withinDays} days.
              </Empty>
            ) : (
              <DataTable
                caption="Leases ending soon, nearest first"
                titleAt={0}
                columns={[
                  { label: "Unit" },
                  { label: "Tenant" },
                  { label: "Phone" },
                  { label: "Ends" },
                  { label: "Days left", right: true },
                ]}
                rows={expiries.rows.map((r, i) => ({
                  key: `${r.unit}-${i}`,
                  cells: [
                    r.unit,
                    r.tenant,
                    r.phone || "No phone",
                    shortDate(r.end),
                    r.daysLeft < 0 ? (
                      <span
                        key="d"
                        className="inline-flex items-center gap-1 text-red-700"
                      >
                        <AlertTriangle
                          aria-hidden="true"
                          className="w-3.5 h-3.5 shrink-0"
                        />
                        {Math.abs(r.daysLeft)} days ago
                      </span>
                    ) : (
                      r.daysLeft
                    ),
                  ],
                }))}
              />
            )}
          </>
        )}

        {/* ---------------- occupancy ---------------- */}
        {tab === "occupancy" && (
          <>
            <Note>
              Units by status, per building. Other means it exists but cannot be
              let today: under maintenance, or reserved.
            </Note>
            {occupancy.rows.length === 0 ? (
              <Empty>No buildings yet.</Empty>
            ) : (
              <DataTable
                caption="Occupancy by building, with the portfolio total"
                titleAt={0}
                columns={[
                  { label: "Building" },
                  { label: "Units", right: true },
                  { label: "Occupied", right: true },
                  { label: "Vacant", right: true },
                  { label: "Other", right: true },
                  { label: "Rate", right: true },
                ]}
                rows={occupancy.rows.map((r) => ({
                  key: r.building,
                  cells: [
                    r.building,
                    r.total,
                    r.occupied,
                    r.vacant,
                    r.other,
                    r.rate === null ? "No units" : `${r.rate}%`,
                  ],
                }))}
                totals={[
                  { label: "Portfolio", value: `${occupancy.total} units` },
                  { label: "Occupied", value: occupancy.occupied },
                  {
                    label: "Rate",
                    value:
                      occupancy.rate === null
                        ? "No units"
                        : `${occupancy.rate}%`,
                  },
                ]}
              />
            )}
          </>
        )}
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
        <h2 className="text-base font-semibold text-gray-900">
          No profit and loss here
        </h2>
        <p className="mt-2 text-sm text-gray-600">
          MitaSafi holds no general expenses, only maintenance cost. Rent minus
          maintenance would read as profit and is not. Income and maintenance
          each have their own page.
        </p>
      </section>
    </div>
  );
}

/**
 * "31 Jan 2027" from "2027-01-31".
 *
 * The CSV keeps the ISO form, because a spreadsheet sorts it and a person
 * does not read it. On screen it is the other way round.
 */
function shortDate(iso: string): string {
  if (!iso) return "";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** "27 Nov 2026" from the "2026-11-27" the server hands over. */
function asAt(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}
