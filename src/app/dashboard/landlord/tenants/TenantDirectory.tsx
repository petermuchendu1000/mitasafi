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
import { DataTable } from "@/components/dashboard/landlord/DataTable";
import { FilterPills } from "@/components/dashboard/landlord/FilterPills";
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
  // Returns "" rather than an em dash. The caller decides what an absent
  // date means: on the lease-ends column it means the lease is open.
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "";
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
    // min-w-0 is what stopped the page scrolling sideways. A grid item
    // defaults to min-width: auto, so the hint "1 part paid, 1 not due yet"
    // sized its own column to its widest unbreakable run and pushed the
    // whole page to 407px in a 360px viewport.
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
          className="shrink-0 inline-flex items-center gap-2 px-4 min-h-[44px] text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Building2 className="w-4 h-4 shrink-0" />
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
            Open a building, pick a vacant unit and add one. That records the
            lease and starts tracking the rent.
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

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
              hint="Held, refundable"
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
                  placeholder="Name, phone, ID, unit or building"
                  aria-label="Search tenants"
                  className="w-full pl-10 pr-4 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
                />
              </div>

              <FilterPills
                label="Filter tenants"
                value={stateFilter}
                onChange={setStateFilter}
                options={stateFilters}
              />

              <div className="grid grid-cols-2 gap-2 lg:flex lg:items-center">
                <div className="relative">
                  <select
                    value={rentFilter}
                    onChange={(e) =>
                      setRentFilter(e.target.value as RentFilter)
                    }
                    aria-label="Filter by rent position"
                    className="w-full appearance-none pl-3 pr-9 min-h-[44px] border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                  >
                    <option value="any">Any rent</option>
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
                    className="w-full appearance-none pl-3 pr-9 min-h-[44px] border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
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
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <DataTable
                caption="Tenants, with their unit, rent and standing"
                titleAt={0}
                columns={[
                  { label: "Tenant" },
                  { label: "Standing" },
                  { label: "Unit" },
                  { label: "Rent", right: true },
                  { label: periodLabel },
                  { label: "Lease ends" },
                  { label: "Contact" },
                ]}
                rows={visible.map((t) => ({
                  key: t.id,
                  cells: [
                    <span key="who" className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className={cn(
                          "w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold shrink-0",
                          t.status === "blacklisted"
                            ? "bg-red-50 text-red-700"
                            : "bg-teal-50 text-teal-700",
                        )}
                      >
                        {t.initial}
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`/dashboard/landlord/tenants/${t.id}`}
                          className="font-medium text-gray-900 hover:text-teal-600 inline-flex items-center gap-1"
                        >
                          {t.name}
                          <ChevronRight className="w-3.5 h-3.5 text-gray-300" />
                        </Link>
                        <span className="block text-xs text-gray-500 font-normal">
                          {labelFor(
                            verificationLevelLabels,
                            t.verificationLevel,
                          )}
                          {t.occupation ? `, ${t.occupation}` : ""}
                        </span>
                      </span>
                    </span>,
                    <span key="standing" className="whitespace-nowrap">
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
                    </span>,
                    t.places.length === 0 ? (
                      // Was an em dash in all three of these.
                      <span key="unit" className="text-gray-400">
                        No unit
                      </span>
                    ) : (
                      <span key="unit" className="block space-y-0.5">
                        {t.places.map((p) => (
                          <span key={p.unitId} className="block">
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
                            {p.buildingName && (
                              <span className="block text-xs text-gray-500">
                                {p.buildingName}
                              </span>
                            )}
                          </span>
                        ))}
                      </span>
                    ),
                    t.rent ? (
                      <span key="rent" className="font-medium text-gray-900">
                        {formatKes(t.rent.due)}
                      </span>
                    ) : (
                      <span key="rent" className="text-gray-400">
                        No lease
                      </span>
                    ),
                    t.rent ? (
                      <span key="pos" className="whitespace-nowrap">
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
                          Only where money is actually owed. A `pending` row
                          has paid nothing by definition, so its balance
                          always equals the Rent column and the badge already
                          says "Not due yet". Repeating the figure said
                          nothing, and calling it "owed" said something false.
                        */}
                        {t.rent.balance > 0 && t.rent.status !== "pending" && (
                          <span className="block text-xs text-gray-500 mt-1 tabular-nums">
                            {formatKes(t.rent.balance)} owed
                            {t.rent.daysLate > 0
                              ? `, ${t.rent.daysLate}d late`
                              : ""}
                          </span>
                        )}
                      </span>
                    ) : (
                      <span key="pos" className="text-gray-400">
                        Nothing due
                      </span>
                    ),
                    formatDate(t.leaseEnds) || "Open",
                    <span key="contact" className="block">
                      <a
                        href={`tel:${t.phone}`}
                        aria-label={`Call ${t.name}`}
                        className="inline-flex items-center gap-1.5 min-h-[44px] text-gray-600 hover:text-teal-600"
                      >
                        <Phone className="w-3.5 h-3.5 shrink-0" />
                        {t.phone}
                      </a>
                      {t.email && (
                        <a
                          href={`mailto:${t.email}`}
                          aria-label={`Email ${t.name}`}
                          className="flex items-center gap-1.5 min-h-[44px] text-gray-500 hover:text-teal-600 text-xs"
                        >
                          <Mail className="w-3 h-3 shrink-0" />
                          <span className="truncate">{t.email}</span>
                        </a>
                      )}
                    </span>,
                  ],
                }))}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
