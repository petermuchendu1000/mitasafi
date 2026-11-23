"use client";

/**
 * Rent collection — the interactive half.
 *
 * One row per lease in force this month. The rows arrive sorted by how much
 * chasing they need; the filters here narrow rather than reorder, so the
 * worst case stays at the top whichever filter is on.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Wallet,
  Search,
  Phone,
  CheckCircle,
  TrendingUp,
  Building2,
} from "lucide-react";
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
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-sm text-gray-500 mb-1">{label}</p>
      <p className={cn("text-2xl font-bold", tone ?? "text-gray-900")}>
        {value}
      </p>
      {hint && <p className="text-xs text-gray-400 mt-1">{hint}</p>}
    </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Rent collection</h1>
          <p className="text-gray-500 mt-1">
            Every lease in force in {periodLabel}, across your buildings.
          </p>
        </div>
        <Link
          href="/dashboard/landlord/buildings"
          className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Building2 className="w-4 h-4" />
          Buildings
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Wallet className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No rent is due this month
          </h2>
          <p className="text-gray-500 max-w-md mx-auto">
            Nothing here is a problem — there are no leases in force in{" "}
            {periodLabel}. Record a tenant and a lease against a unit, and what
            is owed and what has come in appear here.
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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
                  : `${collectionRate}% of what is due`
              }
            />
            <StatCard
              label="Outstanding"
              value={formatKesCompact(outstanding)}
              tone={outstanding > 0 ? "text-red-600" : "text-gray-900"}
              hint={
                counts.outstanding > 0
                  ? `across ${counts.outstanding} ${
                      counts.outstanding === 1 ? "unit" : "units"
                    }`
                  : "nothing owed"
              }
            />
            <StatCard
              label="Deposits held"
              value={formatKesCompact(depositsHeld)}
              hint="refundable, on live leases"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">
                Collection, last 6 months
              </h2>
            </div>
            <div className="space-y-3">
              {months.map((m) => {
                const rate =
                  m.expected === 0
                    ? null
                    : Math.round((m.collected / m.expected) * 100);
                return (
                  <div key={m.label} className="flex items-center gap-3">
                    <span className="w-20 shrink-0 text-xs text-gray-500">
                      {m.label}
                    </span>
                    <div className="flex-1 h-6 bg-gray-100 rounded-md overflow-hidden relative">
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
                    <span className="w-60 shrink-0 text-xs text-gray-600 text-right tabular-nums">
                      {formatKes(m.collected)} of {formatKes(m.expected)}
                      {rate !== null && (
                        <span
                          className={cn(
                            "ml-1.5 font-medium",
                            rate >= 100
                              ? "text-green-600"
                              : rate >= 80
                                ? "text-amber-600"
                                : "text-red-600",
                          )}
                        >
                          {rate}%
                        </span>
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-4">
              The grey bar is what the leases in force that month said was due;
              the coloured bar is what was confirmed against it. Deposits are
              not counted as rent.
            </p>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by unit, tenant or building…"
                  aria-label="Search rent rows"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
                />
              </div>
              <div className="flex items-center gap-1 flex-wrap">
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
                      "px-3 py-2 text-sm rounded-lg transition-colors",
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
                  className="px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              {filter === "outstanding" && counts.outstanding === 0 ? (
                <>
                  <CheckCircle className="w-10 h-10 mx-auto mb-4 text-green-500" />
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Everything is paid up
                  </h2>
                  <p className="text-gray-500">
                    Every lease in force is settled for {periodLabel}.
                  </p>
                </>
              ) : (
                <>
                  <h2 className="text-lg font-semibold text-gray-900 mb-2">
                    Nothing matches that
                  </h2>
                  <p className="text-gray-500">
                    Try another filter, or clear the search box.
                  </p>
                </>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[760px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {["Unit", "Tenant", "Due", "Paid", "Balance", "Status"].map(
                      (h) => (
                        <th
                          key={h}
                          className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ),
                    )}
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
                        <p className="text-xs text-gray-500">
                          {r.buildingName ?? "—"}
                        </p>
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
                      <td
                        className={cn(
                          "px-4 py-3 text-sm font-semibold whitespace-nowrap tabular-nums",
                          r.balance > 0 ? "text-red-600" : "text-gray-400",
                        )}
                      >
                        {r.balance > 0 ? formatKes(r.balance) : "—"}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded-full",
                            statusStyle[r.status].bg,
                            statusStyle[r.status].text,
                          )}
                        >
                          {statusStyle[r.status].label}
                        </span>
                        {r.daysLate > 0 && (
                          <p className="text-xs text-gray-500 mt-1">
                            {r.daysLate} days late
                          </p>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}
