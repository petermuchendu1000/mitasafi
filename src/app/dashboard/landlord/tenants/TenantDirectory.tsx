"use client";

/**
 * The tenant directory — search, filter, sort.
 *
 * Four things changed beyond swapping mock data for real rows, and all four
 * were defects rather than content:
 *
 *   The page rendered `min-h-screen`, its own sticky <header> and its own
 *   <main> inside LandlordDashboardShell, which supplies all three. Two <main>
 *   landmarks on one page is invalid and leaves a screen reader with no single
 *   main region.
 *
 *   `new Date()` was read during render to compute "N days left", and dates
 *   went through toLocaleDateString("en-KE"). Both differ between the SSR pass
 *   and hydration. Today's date now arrives from the server, which is also the
 *   only place that knows it is Nairobi's today, and dates are formatted from
 *   a fixed month list.
 *
 *   `tenant.first_name[0]` indexed a string the real column can make empty.
 *
 *   A tenant with no lease, or whose lease has ended, could not be represented
 *   at all — the mock gave every row a `lease` object. Those are the states a
 *   real directory mostly contains.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Users,
  Search,
  Phone,
  Mail,
  Home,
  Building2,
  ChevronDown,
  ChevronRight,
  ShieldAlert,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  tenantMatches,
  TENANT_STATUS_LABELS,
  type DirectoryTenant,
  type DirectoryStats,
  type TenancyState,
} from "@/lib/landlord/tenant-directory";
import {
  verificationLevelLabels,
  labelFor,
  formatKes,
  formatKesCompact,
} from "@/lib/landlord/labels";
import type { RentStatus } from "@/lib/landlord/rent-status";

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

/** "23 Nov 2026", from a fixed list — see the note on hydration above. */
function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "—";
  return `${Number(m[3])} ${MONTH_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}

const rentStatusStyle: Record<
  RentStatus,
  { label: string; bg: string; text: string }
> = {
  paid: { label: "Paid", bg: "bg-green-50", text: "text-green-700" },
  partial: { label: "Part paid", bg: "bg-amber-50", text: "text-amber-700" },
  pending: { label: "Not due yet", bg: "bg-gray-100", text: "text-gray-600" },
  overdue: { label: "Overdue", bg: "bg-red-50", text: "text-red-700" },
};

const stateStyle: Record<
  TenancyState,
  { label: string; bg: string; text: string; hint: string }
> = {
  housed: {
    label: "Housed",
    bg: "bg-teal-50",
    text: "text-teal-700",
    hint: "has a live lease",
  },
  former: {
    label: "Former",
    bg: "bg-gray-100",
    text: "text-gray-600",
    hint: "leases on record, none live",
  },
  prospective: {
    label: "No lease yet",
    bg: "bg-blue-50",
    text: "text-blue-700",
    hint: "on record, never housed",
  },
};

type StateFilter = "all" | TenancyState;
type RentFilter = "any" | "owing" | RentStatus;
type SortKey = "name" | "rent" | "balance" | "since";

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

export function TenantDirectory({
  tenants,
  stats,
  periodLabel,
}: {
  tenants: DirectoryTenant[];
  stats: DirectoryStats;
  periodLabel: string;
}) {
  const [query, setQuery] = useState("");
  const [stateFilter, setStateFilter] = useState<StateFilter>("all");
  const [rentFilter, setRentFilter] = useState<RentFilter>("any");
  const [sortBy, setSortBy] = useState<SortKey>("name");

  const visible = useMemo(() => {
    const rows = tenants.filter((t) => {
      if (stateFilter !== "all" && t.state !== stateFilter) return false;
      if (rentFilter === "owing") {
        if (!t.rent || t.rent.balance <= 0) return false;
      } else if (rentFilter !== "any") {
        if (t.rent?.status !== rentFilter) return false;
      }
      return tenantMatches(t, query);
    });

    return rows.sort((a, b) => {
      switch (sortBy) {
        case "rent":
          return (b.rent?.due ?? 0) - (a.rent?.due ?? 0);
        case "balance":
          return (b.rent?.balance ?? 0) - (a.rent?.balance ?? 0);
        case "since":
          // Nulls last: a tenant who has never had a lease has no start date,
          // and sorting them as "1970" would put them at one end by accident.
          if (!a.since && !b.since) return a.name.localeCompare(b.name);
          if (!a.since) return 1;
          if (!b.since) return -1;
          return b.since.localeCompare(a.since);
        default:
          return a.name.localeCompare(b.name);
      }
    });
  }, [tenants, stateFilter, rentFilter, query, sortBy]);

  const stateFilters: { id: StateFilter; label: string; count: number }[] = [
    { id: "all", label: "All", count: stats.onRecord },
    { id: "housed", label: "Housed", count: stats.housed },
    { id: "former", label: "Former", count: stats.former },
    { id: "prospective", label: "No lease", count: stats.prospective },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenants</h1>
          <p className="text-gray-500 mt-1">
            {stats.onRecord === 0
              ? "Nobody on record yet."
              : `${stats.onRecord} on record · ${stats.housed} currently housed`}
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

      {stats.onRecord === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Users className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No tenants yet
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            A tenant is added to a unit, which records their lease and starts
            tracking the rent. Open a building, pick a vacant unit, and add one.
          </p>
          <Link
            href="/dashboard/landlord/buildings"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
          >
            <UserPlus className="w-4 h-4" />
            Go to your buildings
          </Link>
        </div>
      ) : (
        <>
          {stats.blacklisted > 0 && (
            <div className="flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
              <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
              <p>
                {stats.blacklisted}{" "}
                {stats.blacklisted === 1 ? "tenant is" : "tenants are"} marked
                blacklisted on your records.
              </p>
            </div>
          )}

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Housed"
              value={String(stats.housed)}
              hint={`of ${stats.onRecord} on record`}
            />
            <StatCard
              label={`Due in ${periodLabel}`}
              value={formatKesCompact(stats.rentDue)}
              hint="across live leases"
            />
            <StatCard
              label="Outstanding"
              value={formatKesCompact(stats.rentOutstanding)}
              tone={
                stats.rentOutstanding > 0 ? "text-red-600" : "text-gray-900"
              }
              /*
                The hint has to add up to the figure above it. Outstanding is
                due minus collected across live leases, so a tenant whose rent
                is not payable until later in the month contributes to it too.
                Naming only the overdue and part-paid buckets left 95,000 of
                165,000 unexplained on the seeded data.
              */
              hint={
                [
                  stats.overdue > 0 ? `${stats.overdue} overdue` : null,
                  stats.partial > 0 ? `${stats.partial} part paid` : null,
                  stats.pending > 0 ? `${stats.pending} not due yet` : null,
                ]
                  .filter(Boolean)
                  .join(" · ") || "nothing owed"
              }
            />
            <StatCard
              label="Deposits held"
              value={formatKesCompact(stats.depositsHeld)}
              hint="refundable, on live leases"
            />
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, phone, ID, unit, building…"
                  aria-label="Search tenants"
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
                />
              </div>

              <div className="flex items-center gap-1 flex-wrap">
                {stateFilters.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setStateFilter(f.id)}
                    aria-pressed={stateFilter === f.id}
                    className={cn(
                      "px-3 py-2 text-sm rounded-lg transition-colors",
                      stateFilter === f.id
                        ? "bg-teal-50 text-teal-700 font-medium"
                        : "text-gray-600 hover:bg-gray-100",
                    )}
                  >
                    {f.label}
                    <span className="ml-1.5 text-xs text-gray-400">
                      {f.count}
                    </span>
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <div className="relative">
                  <select
                    value={rentFilter}
                    onChange={(e) =>
                      setRentFilter(e.target.value as RentFilter)
                    }
                    aria-label="Filter by rent position"
                    className="appearance-none pl-3 pr-9 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="any">Any rent position</option>
                    <option value="owing">Owing anything</option>
                    <option value="overdue">Overdue</option>
                    <option value="partial">Part paid</option>
                    <option value="pending">Not due yet</option>
                    <option value="paid">Paid</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
                <div className="relative">
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortKey)}
                    aria-label="Sort tenants"
                    className="appearance-none pl-3 pr-9 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="name">Sort by name</option>
                    <option value="rent">Sort by rent</option>
                    <option value="balance">Sort by balance owed</option>
                    <option value="since">Sort by newest tenancy</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {visible.length === 0 ? (
            <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Nothing matches that
              </h2>
              <p className="text-gray-500">
                Try another filter, or clear the search box.
              </p>
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
              <table className="w-full min-w-[860px]">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      "Tenant",
                      "Standing",
                      "Unit",
                      "Rent",
                      `${periodLabel}`,
                      "Lease ends",
                      "Contact",
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
                <tbody className="divide-y divide-gray-100">
                  {visible.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div
                            className={cn(
                              "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                              t.status === "blacklisted"
                                ? "bg-red-50 text-red-700"
                                : "bg-teal-50 text-teal-700",
                            )}
                          >
                            {t.initial}
                          </div>
                          <div className="min-w-0">
                            <Link
                              href={`/dashboard/landlord/tenants/${t.id}`}
                              className="font-medium text-gray-900 hover:text-teal-600 inline-flex items-center gap-1"
                            >
                              {t.name}
                              <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                            </Link>
                            <p className="text-xs text-gray-500">
                              {labelFor(
                                verificationLevelLabels,
                                t.verificationLevel,
                              )}
                              {t.occupation ? ` · ${t.occupation}` : ""}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded-full",
                            stateStyle[t.state].bg,
                            stateStyle[t.state].text,
                          )}
                          title={stateStyle[t.state].hint}
                        >
                          {stateStyle[t.state].label}
                        </span>
                        {t.status !== "active" && (
                          <span
                            className={cn(
                              "ml-1.5 px-2 py-1 text-xs font-medium rounded-full",
                              t.status === "blacklisted"
                                ? "bg-red-50 text-red-700"
                                : "bg-gray-100 text-gray-600",
                            )}
                          >
                            {labelFor(TENANT_STATUS_LABELS, t.status)}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap">
                        {t.places.length === 0 ? (
                          <span className="text-gray-400">—</span>
                        ) : (
                          <div className="space-y-0.5">
                            {t.places.map((p) => (
                              <div key={p.unitId}>
                                {p.buildingId ? (
                                  <Link
                                    href={`/dashboard/landlord/buildings/${p.buildingId}/units/${p.unitId}`}
                                    className="font-medium text-gray-900 hover:text-teal-600 inline-flex items-center gap-1.5"
                                  >
                                    <Home className="w-3.5 h-3.5 text-gray-400" />
                                    {p.unitNumber}
                                  </Link>
                                ) : (
                                  <span className="font-medium text-gray-900">
                                    {p.unitNumber}
                                  </span>
                                )}
                                <p className="text-xs text-gray-500 pl-5">
                                  {p.buildingName ?? "—"}
                                </p>
                              </div>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm whitespace-nowrap tabular-nums">
                        {t.rent ? (
                          <span className="font-medium text-gray-900">
                            {formatKes(t.rent.due)}
                          </span>
                        ) : (
                          <span className="text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {t.rent ? (
                          <>
                            <span
                              className={cn(
                                "px-2 py-1 text-xs font-medium rounded-full",
                                rentStatusStyle[t.rent.status].bg,
                                rentStatusStyle[t.rent.status].text,
                              )}
                            >
                              {rentStatusStyle[t.rent.status].label}
                            </span>
                            {/*
                              Only where money is actually owed. A `pending`
                              row has paid nothing by definition, so its
                              balance always equals the Rent column and the
                              badge already says "Not due yet" — repeating the
                              figure said nothing, and calling it "owed" said
                              something false.
                            */}
                            {t.rent.balance > 0 &&
                              t.rent.status !== "pending" && (
                                <p className="text-xs text-gray-500 mt-1 tabular-nums">
                                  {formatKes(t.rent.balance)} owed
                                  {t.rent.daysLate > 0
                                    ? ` · ${t.rent.daysLate}d late`
                                    : ""}
                                </p>
                              )}
                          </>
                        ) : (
                          <span className="text-gray-400 text-sm">
                            Nothing due
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {t.leaseEnds ? formatDate(t.leaseEnds) : "—"}
                      </td>
                      <td className="px-4 py-3 text-sm">
                        <a
                          href={`tel:${t.phone}`}
                          className="flex items-center gap-1.5 text-gray-600 hover:text-teal-600 w-fit"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          {t.phone}
                        </a>
                        {t.email && (
                          <a
                            href={`mailto:${t.email}`}
                            className="flex items-center gap-1.5 text-gray-500 hover:text-teal-600 text-xs mt-1 w-fit"
                          >
                            <Mail className="w-3 h-3" />
                            {t.email}
                          </a>
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
