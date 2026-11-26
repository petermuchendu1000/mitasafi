"use client";

/**
 * The leases list, its filters and its search.
 *
 * Every figure here comes from buildLeaseDirectory, which reads rows. Nothing
 * on this page is written by hand — the overview page once showed KES 285,000
 * collected against an empty database, and that is the mistake this whole
 * directory exists to avoid repeating.
 *
 * The shell supplies min-h-screen, the <main> landmark and the page padding,
 * so this renders none of them.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { FileText, AlertTriangle, Search } from "lucide-react";
import { DataTable } from "@/components/dashboard/landlord/DataTable";
import { FilterPills } from "@/components/dashboard/landlord/FilterPills";
import { formatKes } from "@/lib/landlord/labels";
import {
  leaseMatches,
  EXPIRING_WINDOW_DAYS,
  type DirectoryLease,
  type LeaseStats,
} from "@/lib/landlord/lease-directory";

type Filter = "all" | "live" | "expiring" | "ended" | "undocumented";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "live", label: "Live" },
  { id: "expiring", label: "Ending soon" },
  { id: "ended", label: "Ended" },
  { id: "undocumented", label: "No document" },
];

function Tile({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "warn";
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p
        className={`mt-1 text-xl sm:text-2xl font-semibold tabular-nums ${
          tone === "warn" ? "text-amber-700" : "text-gray-900"
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function StateBadge({ lease }: { lease: DirectoryLease }) {
  if (lease.state === "expiring") {
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
        <AlertTriangle aria-hidden="true" className="w-3 h-3" />
        {lease.daysToEnd === 0
          ? "Ends today"
          : lease.daysToEnd === 1
            ? "Ends tomorrow"
            : `Ends in ${lease.daysToEnd} days`}
      </span>
    );
  }
  if (lease.state === "ended") {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
        {lease.statusLabel}
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-teal-50 text-teal-700 border border-teal-200">
      {lease.statusLabel}
    </span>
  );
}

export function LeaseDirectory({
  leases,
  stats,
}: {
  leases: DirectoryLease[];
  stats: LeaseStats;
}) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const shown = useMemo(
    () =>
      leases
        .filter((l) =>
          filter === "all"
            ? true
            : filter === "undocumented"
              ? l.state !== "ended" && l.documentCount === 0
              : filter === "live"
                ? l.state !== "ended"
                : l.state === filter,
        )
        .filter((l) => leaseMatches(l, query)),
    [leases, filter, query],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Leases</h1>
        <p className="mt-1 text-sm text-gray-500">
          Every agreement, and what each one still needs
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
        <Tile label="Leases" value={String(stats.total)} />
        <Tile label="Live" value={String(stats.live)} />
        <Tile
          label={`Ending in ${EXPIRING_WINDOW_DAYS}d`}
          value={String(stats.expiring)}
          tone={stats.expiring > 0 ? "warn" : undefined}
        />
        <Tile label="Rent roll" value={formatKes(stats.monthlyRentRoll)} />
        <Tile label="Deposits" value={formatKes(stats.depositsHeld)} />
      </div>

      {stats.withoutDocument > 0 && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
          {stats.withoutDocument === 1
            ? "One live lease has no signed document filed against it."
            : `${stats.withoutDocument} live leases have no signed document filed against them.`}
        </p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <FilterPills
          label="Filter leases"
          value={filter}
          onChange={setFilter}
          options={FILTERS}
        />

        <div className="relative sm:w-72">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            type="search"
            aria-label="Search leases"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Tenant, unit or building"
            className="w-full pl-9 pr-3 min-h-[44px] rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {shown.length === 0 ? (
          <p className="px-5 py-10 text-center text-gray-500">
            {leases.length === 0
              ? "No leases yet. One is created when you add a tenant to a unit."
              : "No lease matches that."}
          </p>
        ) : (
          <DataTable
            caption="Leases, soonest to end first"
            titleAt={1}
            subtitleAt={0}
            columns={[
              { label: "Tenant" },
              { label: "Unit" },
              { label: "Term" },
              { label: "Rent", right: true },
              { label: "Deposit", right: true },
              { label: "Status" },
              { label: "Document" },
            ]}
            rows={shown.map((l) => ({
              key: l.id,
              cells: [
                <span key="t">
                  {l.tenantId ? (
                    <Link
                      href={`/dashboard/landlord/tenants/${l.tenantId}`}
                      className="font-medium text-gray-900 hover:text-teal-700"
                    >
                      {l.tenantName}
                    </Link>
                  ) : (
                    <span className="text-gray-500">{l.tenantName}</span>
                  )}
                  {l.tenantPhone && (
                    <span className="block text-xs text-gray-500">
                      {l.tenantPhone}
                    </span>
                  )}
                </span>,
                <span key="u">
                  {l.unitId && l.buildingId ? (
                    <Link
                      href={`/dashboard/landlord/buildings/${l.buildingId}/units/${l.unitId}`}
                      className="text-gray-900 hover:text-teal-700"
                    >
                      {l.unitNumber}
                    </Link>
                  ) : (
                    <span className="text-gray-500">{l.unitNumber}</span>
                  )}
                  <span className="block text-xs text-gray-500">
                    {l.buildingName}
                  </span>
                </span>,
                <span key="term">
                  {l.term}
                  {l.endDate && (
                    <span className="block text-xs text-gray-500">
                      to {shortDate(l.endDate)}
                    </span>
                  )}
                </span>,
                formatKes(l.monthlyRent),
                // Was an em dash when there is no deposit. "None" says the
                // same thing and reads aloud.
                l.depositAmount === 0 ? (
                  <span key="d" className="text-gray-400">
                    None
                  </span>
                ) : (
                  <span key="d">
                    {formatKes(l.depositAmount)}
                    <span
                      className={`block text-xs ${
                        l.depositHeld ? "text-gray-500" : "text-amber-700"
                      }`}
                    >
                      {l.depositHeld ? "Held" : "Not held"}
                    </span>
                  </span>
                ),
                <StateBadge key="s" lease={l} />,
                l.documentCount > 0 ? (
                  <span
                    key="doc"
                    className="inline-flex items-center gap-1 text-gray-700"
                  >
                    <FileText aria-hidden="true" className="w-4 h-4" />
                    {l.documentCount}
                  </span>
                ) : (
                  <span key="doc" className="text-amber-700">
                    None filed
                  </span>
                ),
              ],
            }))}
          />
        )}
      </div>
    </div>
  );
}

/**
 * "31 Jan 2027" from "2027-01-31".
 *
 * Parsed by hand rather than with Date, because this component renders on
 * the server and again in the browser, and toLocaleDateString can disagree
 * between the two. The ISO form stays in the data.
 */
const MONTH_SHORT = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function shortDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${Number(m[3])} ${MONTH_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}
