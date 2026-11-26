"use client";

/**
 * Rent collection, the interactive half.
 *
 * One row per lease in force this month. The rows arrive sorted by how much
 * chasing they need; the filters here narrow rather than reorder, so the
 * worst case stays at the top whichever filter is on.
 *
 * WHAT THE MOBILE PASS CHANGED, AND WHY EACH ONE MATTERED
 *   The six-month chart had no bars on a phone. Its row was a fixed w-20
 *   label, a flex-1 bar and a fixed w-60 figure: 80px + 240px of fixed width
 *   in a 328px row, so the bar was squeezed to nothing and the figures still
 *   ran off the edge. That is what made the whole page 381px wide in a 360px
 *   viewport. The row is two lines now and has no fixed widths at all.
 *
 *   The table is min-w-[760px]. On a phone it showed Unit, Tenant and half of
 *   "DUE": the balance and the status, the two things the page exists for,
 *   were off screen behind a sideways scroll inside a card. It is still a
 *   table from sm: up, because six columns of money is what a table is for,
 *   and a list of cards below that.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wallet, Search, Phone, CheckCircle, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatKes, formatKesCompact } from "@/lib/landlord/labels";
import type { RentStatus } from "@/lib/landlord/rent-status";

export interface RentRow {
  leaseId: string;
  unitId: string;
  unitNumber: string;
  buildingId: string | null;
  buildingName: string | null;
  tenantName: string;
  tenantPhone: string | null;
  due: number;
  paid: number;
  balance: number;
  status: RentStatus;
  daysLate: number;
  dueDay: number;
}

export interface MonthRow {
  label: string;
  expected: number;
  collected: number;
}

const statusStyle: Record<
  RentStatus,
  { label: string; bg: string; text: string }
> = {
  paid: { label: "Paid", bg: "bg-green-50", text: "text-green-700" },
  partial: { label: "Part paid", bg: "bg-amber-50", text: "text-amber-700" },
  pending: { label: "Not due yet", bg: "bg-gray-100", text: "text-gray-600" },
  overdue: { label: "Overdue", bg: "bg-red-50", text: "text-red-700" },
};

type Filter = "outstanding" | "overdue" | "paid" | "all";

/** The percentage colour, shared by the chart and nothing else so far. */
function rateTone(rate: number): string {
  if (rate >= 100) return "text-green-600";
  if (rate >= 80) return "text-amber-600";
  return "text-red-600";
}

function StatCard({
  label,
  value,
  tone,
  hint,
}: {
  label: string;
  value: string;
  tone?: string;
  hint?: string;
}) {
  return (
    <div className="min-w-0 bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p
        className={cn(
          "text-xl sm:text-2xl font-bold tabular-nums",
          tone ?? "text-gray-900",
        )}
      >
        {value}
      </p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
  );
}

function StatusBadge({ status }: { status: RentStatus }) {
  const s = statusStyle[status];
  return (
    <span
      className={cn(
        "px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap",
        s.bg,
        s.text,
      )}
    >
      {s.label}
    </span>
  );
}

export function RentCollection({
  periodLabel,
  expected,
  collected,
  outstanding,
  collectionRate,
  depositsHeld,
  rows,
  months,
  buildings,
}: {
  periodLabel: string;
  expected: number;
  collected: number;
  outstanding: number;
  collectionRate: number | null;
  depositsHeld: number;
  rows: RentRow[];
  months: MonthRow[];
  buildings: { id: string; name: string }[];
}) {
  const [filter, setFilter] = useState<Filter>("outstanding");
  const [buildingId, setBuildingId] = useState("all");
  const [query, setQuery] = useState("");

  const counts: Record<Filter, number> = {
    outstanding: rows.filter((r) => r.balance > 0).length,
    overdue: rows.filter((r) => r.status === "overdue").length,
    paid: rows.filter((r) => r.status === "paid").length,
    all: rows.length,
  };

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (filter === "outstanding" && r.balance <= 0) return false;
      if (filter === "overdue" && r.status !== "overdue") return false;
      if (filter === "paid" && r.status !== "paid") return false;
      if (buildingId !== "all" && r.buildingId !== buildingId) return false;
      if (!q) return true;
      return (
        r.unitNumber.toLowerCase().includes(q) ||
        r.tenantName.toLowerCase().includes(q) ||
        (r.buildingName?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [rows, filter, buildingId, query]);

  const maxMonth = Math.max(
    1,
    ...months.map((m) => Math.max(m.expected, m.collected)),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        {/* The subtitle here read "Every lease in force in Nov 2026, across
            your buildings." The first stat card already says the month and
            the lease count, so it was two lines saying it again. */}
        <h1 className="text-2xl font-bold text-gray-900">Rent</h1>
        <Link
          href="/dashboard/landlord/buildings"
          className="shrink-0 inline-flex items-center gap-2 px-4 min-h-[44px] text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Building2 className="w-4 h-4 shrink-0" />
          Buildings
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Wallet className="w-7 h-7 text-gray-400" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-1">
            Nothing due in {periodLabel}
          </h2>
          <p className="text-sm text-gray-500 max-w-xs mx-auto">
            No lease is in force. Add a tenant and a lease to a unit and the
            figures appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label={`Due in ${periodLabel}`}
              value={formatKesCompact(expected)}
              hint={`${rows.length} ${rows.length === 1 ? "lease" : "leases"}`}
            />
            <StatCard
              label="Collected"
              value={formatKesCompact(collected)}
              tone="text-green-600"
              hint={
                collectionRate === null
                  ? undefined
                  : `${collectionRate}% of due`
              }
            />
            <StatCard
              label="Outstanding"
              value={formatKesCompact(outstanding)}
              tone={outstanding > 0 ? "text-red-600" : "text-gray-900"}
              hint={
                counts.outstanding > 0
                  ? `${counts.outstanding} ${
                      counts.outstanding === 1 ? "unit" : "units"
                    }`
                  : "Nothing owed"
              }
            />
            <StatCard
              label="Deposits"
              value={formatKesCompact(depositsHeld)}
              hint="Held, refundable"
            />
          </div>

          {/* Last six months.
              No fixed widths. The label and the figure sit on one line and
              the bar gets the full width underneath, which is the only way
              a bar survives a 320px screen. */}
          <div className="bg-white rounded-xl border border-gray-200 p-4 sm:p-5">
            <h2 className="font-semibold text-gray-900">Last 6 months</h2>
            <div className="mt-4 space-y-3">
              {months.map((m) => {
                const rate =
                  m.expected === 0
                    ? null
                    : Math.round((m.collected / m.expected) * 100);
                return (
                  <div key={m.label}>
                    <div className="flex items-baseline justify-between gap-2 text-xs">
                      <span className="text-gray-500 whitespace-nowrap">
                        {m.label}
                      </span>
                      <span className="text-gray-600 tabular-nums text-right">
                        {formatKesCompact(m.collected)} of{" "}
                        {formatKesCompact(m.expected)}
                        {rate !== null && (
                          <span
                            className={cn("ml-1.5 font-medium", rateTone(rate))}
                          >
                            {rate}%
                          </span>
                        )}
                      </span>
                    </div>
                    <div className="mt-1 h-2.5 bg-gray-100 rounded-full overflow-hidden relative">
                      <div
                        className="h-full bg-gray-200"
                        style={{ width: `${(m.expected / maxMonth) * 100}%` }}
                      />
                      <div
                        className={cn(
                          "h-full absolute left-0 top-0",
                          rate !== null && rate >= 100
                            ? "bg-green-500"
                            : "bg-teal-500",
                        )}
                        style={{ width: `${(m.collected / maxMonth) * 100}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            {/* The old note explained the grey bar, the coloured bar and the
                deposit rule in four lines. The bars explain themselves once
                they are visible. The deposit rule does not, so it stays. */}
            <p className="text-xs text-gray-400 mt-4">
              Deposits are not counted as rent.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search unit, tenant or building"
                aria-label="Search rent rows"
                className="w-full pl-10 pr-4 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
              />
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              {/* Two by two on a phone. As a flex row these four wrapped
                  onto two uneven lines, and each was a 36px target. */}
              <div className="grid grid-cols-2 sm:flex gap-1">
                {(
                  [
                    ["outstanding", "Outstanding"],
                    ["overdue", "Overdue"],
                    ["paid", "Paid"],
                    ["all", "All"],
                  ] as [Filter, string][]
                ).map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFilter(id)}
                    aria-pressed={filter === id}
                    className={cn(
                      "px-3 min-h-[44px] text-sm rounded-lg transition-colors",
                      filter === id
                        ? "bg-teal-50 text-teal-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100",
                    )}
                  >
                    {label}
                    <span className="ml-1.5 text-xs text-gray-400">
                      {counts[id]}
                    </span>
                  </button>
                ))}
              </div>
              {buildings.length > 1 && (
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  aria-label="Filter by building"
                  className="sm:ml-auto px-3 min-h-[44px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="all">All buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              {filter === "outstanding" && counts.outstanding === 0 ? (
                <>
                  <CheckCircle className="w-10 h-10 mx-auto mb-3 text-green-500" />
                  <h2 className="font-semibold text-gray-900 mb-1">
                    All paid up
                  </h2>
                  <p className="text-sm text-gray-500">
                    Every lease is settled for {periodLabel}.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="font-semibold text-gray-900 mb-1">
                    Nothing matches
                  </h2>
                  <p className="text-sm text-gray-500">
                    Try another filter, or clear the search.
                  </p>
                </>
              )}
            </div>
          ) : (
            <>
              {/* Phone: one card per lease. */}
              <div className="sm:hidden space-y-3">
                {visible.map((r) => (
                  <div
                    key={r.leaseId}
                    className="bg-white rounded-xl border border-gray-200 p-4"
                  >
                    {/* The link wraps the unit number AND the building name,
                        so the target is the whole 44px block rather than the
                        21px of text the unit number occupies on its own. */}
                    <div className="flex items-start justify-between gap-2">
                      {r.buildingId ? (
                        <Link
                          href={`/dashboard/landlord/buildings/${r.buildingId}/units/${r.unitId}`}
                          className="min-w-0 block min-h-[44px] hover:text-teal-600"
                        >
                          <span className="font-semibold text-gray-900">
                            {r.unitNumber}
                          </span>
                          {r.buildingName && (
                            <span className="block text-xs text-gray-500 truncate">
                              {r.buildingName}
                            </span>
                          )}
                        </Link>
                      ) : (
                        <div className="min-w-0">
                          <span className="font-semibold text-gray-900">
                            {r.unitNumber}
                          </span>
                          {r.buildingName && (
                            <span className="block text-xs text-gray-500 truncate">
                              {r.buildingName}
                            </span>
                          )}
                        </div>
                      )}
                      <StatusBadge status={r.status} />
                    </div>

                    <p className="mt-2 text-sm text-gray-700 truncate">
                      {r.tenantName}
                    </p>

                    {/* "Owes" and red are for money that is actually late.
                        A lease with a due day still ahead of it has a
                        balance, but the tenant does not owe it yet, and the
                        first draft of this card said "Owes KES 95,000" in
                        red next to a badge reading "Not due yet". */}
                    <div className="mt-3 flex items-end justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-xs text-gray-500">
                          {r.balance <= 0
                            ? "Paid"
                            : r.daysLate > 0
                              ? "Owes"
                              : "Due"}
                        </p>
                        <p
                          className={cn(
                            "text-lg font-bold tabular-nums",
                            r.daysLate > 0 ? "text-red-600" : "text-gray-900",
                          )}
                        >
                          {formatKes(r.balance > 0 ? r.balance : r.paid)}
                        </p>
                      </div>
                      <div className="text-xs text-gray-500 text-right shrink-0 tabular-nums">
                        <p>
                          {formatKes(r.paid)} of {formatKes(r.due)}
                        </p>
                        <p>
                          {r.daysLate > 0
                            ? `${r.daysLate} ${
                                r.daysLate === 1 ? "day" : "days"
                              } late`
                            : `Due day ${r.dueDay}`}
                        </p>
                      </div>
                    </div>

                    {r.tenantPhone && (
                      <a
                        href={`tel:${r.tenantPhone}`}
                        aria-label={`Call ${r.tenantName}`}
                        className="mt-3 min-h-[44px] flex items-center justify-center gap-2 rounded-lg border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <Phone className="w-4 h-4 shrink-0" />
                        Call
                      </a>
                    )}
                  </div>
                ))}
              </div>

              {/* sm: and up: the table. Six columns of money is what a table
                  is for, and from 640px there is room for it. */}
              <div className="hidden sm:block bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[760px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        "Unit",
                        "Tenant",
                        "Due",
                        "Paid",
                        "Balance",
                        "Status",
                      ].map((h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {visible.map((r) => (
                      <tr key={r.leaseId} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          {r.buildingId ? (
                            <Link
                              href={`/dashboard/landlord/buildings/${r.buildingId}/units/${r.unitId}`}
                              className="font-medium text-gray-900 hover:text-teal-600"
                            >
                              {r.unitNumber}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">
                              {r.unitNumber}
                            </span>
                          )}
                          {r.buildingName && (
                            <p className="text-xs text-gray-500">
                              {r.buildingName}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <p className="font-medium text-gray-900">
                            {r.tenantName}
                          </p>
                          {r.tenantPhone && (
                            <a
                              href={`tel:${r.tenantPhone}`}
                              className="text-xs text-gray-500 hover:text-teal-600 inline-flex items-center gap-1"
                            >
                              <Phone className="w-3 h-3" />
                              {r.tenantPhone}
                            </a>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap tabular-nums">
                          {formatKes(r.due)}
                          <p className="text-xs text-gray-500">
                            due day {r.dueDay}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap tabular-nums">
                          {formatKes(r.paid)}
                        </td>
                        {/* Same rule as the card above: red means late, not
                            merely unpaid. A balance on a lease whose due day
                            has not arrived was being shown in red beside a
                            "Not due yet" badge. */}
                        <td
                          className={cn(
                            "px-4 py-3 text-sm font-semibold whitespace-nowrap tabular-nums",
                            r.daysLate > 0
                              ? "text-red-600"
                              : r.balance > 0
                                ? "text-gray-900"
                                : "text-gray-400",
                          )}
                        >
                          {formatKes(r.balance)}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <StatusBadge status={r.status} />
                          {r.daysLate > 0 && (
                            <p className="text-xs text-gray-500 mt-1">
                              {r.daysLate} {r.daysLate === 1 ? "day" : "days"}{" "}
                              late
                            </p>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
