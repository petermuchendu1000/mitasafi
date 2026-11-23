/**
 * Building detail — the interactive half.
 *
 * The tab, the search box, the status filter and the grid/list toggle need client
 * state; every figure it renders was computed in page.tsx from the database.
 *
 * THREE DEFECTS FIXED BEYOND SWAPPING THE DATA SOURCE
 *   The unit status map had three entries — occupied, vacant, maintenance — for a
 *   column whose CHECK constraint allows four. `statusConfig[unit.status].bgColor`
 *   on a 'reserved' unit throws a TypeError and takes the page down. Lookups now
 *   go through a map covering all four, with a fallback for anything newer.
 *
 *   The list view navigated with `window.location.href = ...` inside a row
 *   onClick, which is a full document reload out of a client-side app, and is
 *   invisible to the keyboard. The unit number is now a real link.
 *
 *   The Tenants, Finances and Maintenance tabs said "coming soon" over an empty
 *   panel. All three render real records now, and the empty state of each says
 *   what is actually missing rather than implying the feature does not exist.
 */

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit2,
  MapPin,
  Plus,
  Grid3X3,
  List,
  Home,
  Users,
  Wallet,
  Wrench,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  AlertTriangle,
  Search,
  ShieldCheck,
  TrendingUp,
  Receipt,
  CircleDollarSign,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildingTypeLabels,
  buildingStatusLabels,
  unitTypeLabels,
  unitTypeShortLabels,
  unitStatusLabels,
  unitListingStatusLabels,
  paymentMethodLabels,
  verificationLevelLabels,
  labelFor,
  formatKes,
  formatKesCompact,
} from "@/lib/landlord/labels";
import type { RentStatus } from "@/lib/landlord/rent-status";
// The maintenance card is shared with /dashboard/landlord/maintenance, which
// shows the same records across every building.
import { MaintenanceRequestCard } from "@/components/dashboard/landlord/MaintenanceRequestCard";
import type { BuildingDetailData, UnitCard } from "./types";

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

/**
 * "23 Nov 2026", built from a fixed month list.
 *
 * toLocaleDateString would be read from the server's locale during SSR and the
 * browser's during hydration, which is a mismatch waiting to happen on a page
 * covered in dates.
 */
function formatShortDate(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return "—";
  return `${Number(m[3])} ${MONTH_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}

function formatMonthYear(iso: string | null): string {
  if (!iso) return "—";
  const m = /^(\d{4})-(\d{2})/.exec(iso);
  if (!m) return "—";
  return `${MONTH_SHORT[Number(m[2]) - 1]} ${m[1]}`;
}

/** Covers all four values of units_status_check, plus a fallback. */
const unitStatusStyle: Record<
  string,
  { bg: string; text: string; dot: string }
> = {
  occupied: { bg: "bg-green-50", text: "text-green-700", dot: "bg-green-500" },
  vacant: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500" },
  maintenance: {
    bg: "bg-yellow-50",
    text: "text-yellow-700",
    dot: "bg-yellow-500",
  },
  reserved: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    dot: "bg-purple-500",
  },
};

const UNIT_STATUS_FALLBACK = {
  bg: "bg-gray-100",
  text: "text-gray-700",
  dot: "bg-gray-400",
};

function statusStyle(status: string) {
  return unitStatusStyle[status] ?? UNIT_STATUS_FALLBACK;
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

type TabId = "units" | "tenants" | "finances" | "maintenance";
type StatusFilter = "all" | "occupied" | "vacant" | "maintenance" | "reserved";

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

function EmptyPanel({
  icon,
  title,
  body,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center text-gray-400">
        {icon}
      </div>
      <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
      <p className="text-gray-500 max-w-md mx-auto mb-6">{body}</p>
      {action}
    </div>
  );
}

export function BuildingDetail({ data }: { data: BuildingDetailData }) {
  const { building, units, stats, finances, maintenance, expiringLeases } =
    data;

  const [activeTab, setActiveTab] = useState<TabId>("units");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredUnits = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return units.filter((unit) => {
      if (filterStatus !== "all" && unit.status !== filterStatus) return false;
      if (!q) return true;
      // Searching a unit list by tenant name is the other thing a landlord does
      // with this box, so it matches both.
      return (
        unit.unit_number.toLowerCase().includes(q) ||
        (unit.tenant?.name.toLowerCase().includes(q) ?? false)
      );
    });
  }, [units, filterStatus, searchQuery]);

  const tenantRows = useMemo(
    () => units.filter((u) => u.tenant && u.lease),
    [units],
  );

  const openMaintenance = useMemo(
    () => maintenance.filter((m) => m.isOpen),
    [maintenance],
  );
  const closedMaintenance = useMemo(
    () => maintenance.filter((m) => !m.isOpen),
    [maintenance],
  );

  const tabs: {
    id: TabId;
    label: string;
    icon: typeof Grid3X3;
    count?: number;
  }[] = [
    { id: "units", label: "Units", icon: Grid3X3, count: stats.total },
    { id: "tenants", label: "Tenants", icon: Users, count: tenantRows.length },
    { id: "finances", label: "Finances", icon: Wallet },
    {
      id: "maintenance",
      label: "Maintenance",
      icon: Wrench,
      count: openMaintenance.length,
    },
  ];

  const maxMonth = Math.max(
    1,
    ...finances.months.map((m) => Math.max(m.expected, m.collected)),
  );

  return (
    <div>
      {/*
        The shell (LandlordDashboardShell) already provides `min-h-screen
        bg-gray-50`, the page's `<main>` landmark and its padding. The page this
        replaces supplied all three again: a second full-height box inside a
        full-height box, which added a dead viewport of scroll below the content,
        a `max-w-7xl` inset inside the shell's own padding, and a `<main>` nested
        in a `<main>` — two main landmarks on one page, which is invalid and
        leaves a screen reader with no single "main content" to jump to. Its
        header was `sticky top-0` as well, underneath the shell's own sticky top
        bar, so it would have scrolled up behind it.
      */}
      <header className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 sm:px-5">
          <div className="py-4 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 min-w-0">
              <Link
                href="/dashboard/landlord/buildings"
                aria-label="Back to buildings"
                className="p-2 -ml-2 mt-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-xl font-semibold text-gray-900 truncate">
                    {building.name}
                  </h1>
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full",
                      building.status === "active"
                        ? "bg-teal-50 text-teal-700"
                        : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {labelFor(buildingStatusLabels, building.status)}
                  </span>
                </div>
                <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">
                    {building.address}
                    {building.area ? `, ${building.area}` : ""}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {labelFor(buildingTypeLabels, building.building_type)}
                  {building.total_floors
                    ? ` · ${building.total_floors} floors`
                    : ""}
                  {building.year_built ? ` · built ${building.year_built}` : ""}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href={`/dashboard/landlord/buildings/${building.id}/edit`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Edit2 className="w-4 h-4" />
                <span className="hidden sm:inline">Edit</span>
              </Link>
              <Link
                href={`/dashboard/landlord/buildings/${building.id}/units/new`}
                className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add unit</span>
              </Link>
            </div>
          </div>

          <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                aria-current={activeTab === tab.id ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && tab.count > 0 && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-xs rounded-full",
                      activeTab === tab.id
                        ? "bg-teal-100 text-teal-700"
                        : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {tab.count}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </header>

      <div className="pt-6">
        {/* -------------------------------------------------------- UNITS */}
        {activeTab === "units" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <StatCard
                label="Occupancy"
                value={`${stats.occupancyRate}%`}
                hint={`${stats.occupied} of ${stats.total} units`}
              />
              <StatCard
                label="Occupied"
                value={String(stats.occupied)}
                tone="text-green-600"
              />
              <StatCard
                label="Vacant"
                value={String(stats.vacant)}
                tone="text-blue-600"
              />
              <StatCard
                label="Out of service"
                value={String(stats.maintenance + stats.reserved)}
                tone="text-yellow-600"
                hint={
                  stats.reserved > 0
                    ? `${stats.maintenance} maintenance, ${stats.reserved} reserved`
                    : "under maintenance"
                }
              />
              <StatCard
                label="Rent roll"
                value={formatKesCompact(stats.monthlyRevenue)}
                hint="occupied units, per month"
              />
            </div>

            {stats.total > 0 &&
              building.recorded_total_units !== null &&
              building.recorded_total_units !== stats.total && (
                <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                  <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5" />
                  <p>
                    This building records{" "}
                    <strong>{building.recorded_total_units}</strong> units, but{" "}
                    <strong>{stats.total}</strong>{" "}
                    {stats.total === 1 ? "is" : "are"} set up here. Every figure
                    on this page is counted from the units themselves, so the
                    stored total is the one to correct.
                  </p>
                </div>
              )}

            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex flex-col lg:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by unit or tenant…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    aria-label="Search units"
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
                  />
                </div>

                <div className="flex items-center gap-1 flex-wrap">
                  {(
                    [
                      "all",
                      "occupied",
                      "vacant",
                      "maintenance",
                      "reserved",
                    ] as StatusFilter[]
                  ).map((status) => (
                    <button
                      key={status}
                      type="button"
                      onClick={() => setFilterStatus(status)}
                      aria-pressed={filterStatus === status}
                      className={cn(
                        "px-3 py-2 text-sm rounded-lg transition-colors",
                        filterStatus === status
                          ? "bg-teal-50 text-teal-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100",
                      )}
                    >
                      {status === "all"
                        ? "All"
                        : unitStatusLabels[
                            status as keyof typeof unitStatusLabels
                          ]}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg self-start">
                  <button
                    type="button"
                    onClick={() => setViewMode("grid")}
                    aria-label="Grid view"
                    aria-pressed={viewMode === "grid"}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      viewMode === "grid"
                        ? "bg-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("list")}
                    aria-label="List view"
                    aria-pressed={viewMode === "list"}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      viewMode === "list"
                        ? "bg-white shadow-sm"
                        : "text-gray-500 hover:text-gray-700",
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {filteredUnits.length === 0 ? (
              <EmptyPanel
                icon={<Home className="w-8 h-8" />}
                title={
                  units.length === 0 ? "No units yet" : "No units match that"
                }
                body={
                  units.length === 0
                    ? "Add the units in this building and the occupancy, rent roll and arrears on this page start working."
                    : "Try a different status filter, or clear the search box."
                }
                action={
                  units.length === 0 ? (
                    <Link
                      href={`/dashboard/landlord/buildings/${building.id}/units/new`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Add first unit
                    </Link>
                  ) : undefined
                }
              />
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUnits.map((unit) => (
                  <UnitGridCard
                    key={unit.id}
                    unit={unit}
                    buildingId={building.id}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full min-w-[720px]">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        "Unit",
                        "Type",
                        "Status",
                        "Tenant",
                        "Rent",
                        "This month",
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
                    {filteredUnits.map((unit) => {
                      const style = statusStyle(unit.status);
                      return (
                        <tr key={unit.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div
                                className={cn(
                                  "w-8 h-8 rounded-lg flex items-center justify-center shrink-0",
                                  style.bg,
                                )}
                              >
                                <Home className={cn("w-4 h-4", style.text)} />
                              </div>
                              <div>
                                <Link
                                  href={`/dashboard/landlord/buildings/${building.id}/units/${unit.id}`}
                                  className="font-medium text-gray-900 hover:text-teal-600"
                                >
                                  {unit.unit_number}
                                </Link>
                                <p className="text-xs text-gray-500">
                                  {unit.floor_level
                                    ? `Floor ${unit.floor_level}`
                                    : "—"}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                            {labelFor(unitTypeShortLabels, unit.unit_type)}
                            {unit.size_sqm ? ` · ${unit.size_sqm} m²` : ""}
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap",
                                style.bg,
                                style.text,
                              )}
                            >
                              <span
                                className={cn(
                                  "w-1.5 h-1.5 rounded-full",
                                  style.dot,
                                )}
                              />
                              {labelFor(unitStatusLabels, unit.status)}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm">
                            {unit.tenant ? (
                              <div>
                                <p className="font-medium text-gray-900">
                                  {unit.tenant.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {unit.tenant.phone}
                                </p>
                              </div>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                            {formatKes(unit.monthly_rent)}
                          </td>
                          <td className="px-4 py-3">
                            {unit.rent ? (
                              <div className="whitespace-nowrap">
                                <span
                                  className={cn(
                                    "px-2 py-1 text-xs font-medium rounded-full",
                                    rentStatusStyle[unit.rent.status].bg,
                                    rentStatusStyle[unit.rent.status].text,
                                  )}
                                >
                                  {rentStatusStyle[unit.rent.status].label}
                                </span>
                                {unit.rent.balance > 0 && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    {formatKes(unit.rent.balance)} outstanding
                                  </p>
                                )}
                              </div>
                            ) : (
                              <span className="text-gray-400 text-sm">
                                No lease
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {/* ------------------------------------------------------ TENANTS */}
        {activeTab === "tenants" && (
          <>
            {expiringLeases.length > 0 && (
              <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <Calendar className="w-5 h-5 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">
                    {expiringLeases.length}{" "}
                    {expiringLeases.length === 1 ? "lease ends" : "leases end"}{" "}
                    within 60 days
                  </p>
                  <p className="mt-0.5">
                    {expiringLeases
                      .map(
                        (l) =>
                          `${l.unitNumber} (${l.tenantName}) — ${formatShortDate(
                            l.endDate,
                          )}`,
                      )
                      .join(" · ")}
                  </p>
                </div>
              </div>
            )}

            {tenantRows.length === 0 ? (
              <EmptyPanel
                icon={<Users className="w-8 h-8" />}
                title="No tenants on record here"
                body={
                  stats.occupied > 0
                    ? `${stats.occupied} ${
                        stats.occupied === 1 ? "unit is" : "units are"
                      } marked occupied but have no lease recorded, so there is no tenant, rent due date or payment history to show. Add a tenant to a unit to connect them.`
                    : "Once a unit has a tenant and a lease, they appear here with their rent position."
                }
              />
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      {[
                        "Tenant",
                        "Unit",
                        "Lease",
                        "Rent",
                        "This month",
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
                  <tbody className="divide-y divide-gray-200">
                    {tenantRows.map((unit) => (
                      <tr key={unit.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-sm font-semibold shrink-0">
                              {unit.tenant!.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">
                                {unit.tenant!.name}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <ShieldCheck className="w-3 h-3" />
                                {labelFor(
                                  verificationLevelLabels,
                                  unit.tenant!.verification_level,
                                )}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <Link
                            href={`/dashboard/landlord/buildings/${building.id}/units/${unit.id}`}
                            className="font-medium text-gray-900 hover:text-teal-600"
                          >
                            {unit.unit_number}
                          </Link>
                          <p className="text-xs text-gray-500">
                            {labelFor(unitTypeLabels, unit.unit_type)}
                          </p>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                          {formatMonthYear(unit.lease!.start_date)} —{" "}
                          {unit.lease!.end_date
                            ? formatShortDate(unit.lease!.end_date)
                            : "open ended"}
                        </td>
                        <td className="px-4 py-3 text-sm whitespace-nowrap">
                          <p className="font-medium text-gray-900">
                            {formatKes(unit.lease!.monthly_rent)}
                          </p>
                          <p className="text-xs text-gray-500">
                            due day {unit.lease!.rent_due_day}
                          </p>
                        </td>
                        <td className="px-4 py-3">
                          {unit.rent ? (
                            <div className="whitespace-nowrap">
                              <span
                                className={cn(
                                  "px-2 py-1 text-xs font-medium rounded-full",
                                  rentStatusStyle[unit.rent.status].bg,
                                  rentStatusStyle[unit.rent.status].text,
                                )}
                              >
                                {rentStatusStyle[unit.rent.status].label}
                              </span>
                              {unit.rent.balance > 0 && (
                                <p className="text-xs text-gray-500 mt-1">
                                  {formatKes(unit.rent.paid)} of{" "}
                                  {formatKes(unit.rent.due)}
                                  {unit.rent.daysLate > 0
                                    ? ` · ${unit.rent.daysLate}d late`
                                    : ""}
                                </p>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <a
                            href={`tel:${unit.tenant!.phone}`}
                            className="flex items-center gap-1.5 text-gray-600 hover:text-teal-600"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            {unit.tenant!.phone}
                          </a>
                          {unit.tenant!.email && (
                            <a
                              href={`mailto:${unit.tenant!.email}`}
                              className="flex items-center gap-1.5 text-gray-500 hover:text-teal-600 text-xs mt-1"
                            >
                              <Mail className="w-3 h-3" />
                              {unit.tenant!.email}
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

        {/* ----------------------------------------------------- FINANCES */}
        {activeTab === "finances" && (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <StatCard
                label={`Due in ${finances.currentLabel}`}
                value={formatKesCompact(finances.expected)}
                hint="leases in force this month"
              />
              <StatCard
                label="Collected"
                value={formatKesCompact(finances.collected)}
                tone="text-green-600"
                hint={`${finances.collectionRate}% of what is due`}
              />
              <StatCard
                label="Outstanding"
                value={formatKesCompact(finances.outstanding)}
                tone={
                  finances.outstanding > 0 ? "text-red-600" : "text-gray-900"
                }
                hint={
                  finances.arrears.length > 0
                    ? `across ${finances.arrears.length} ${
                        finances.arrears.length === 1 ? "unit" : "units"
                      }`
                    : "nothing owed"
                }
              />
              <StatCard
                label="Deposits held"
                value={formatKesCompact(finances.depositsHeld)}
                hint="refundable, on live leases"
              />
            </div>

            {finances.expected === 0 && finances.collected === 0 ? (
              <EmptyPanel
                icon={<CircleDollarSign className="w-8 h-8" />}
                title="No rent recorded for this building"
                body="Rent collection figures come from the leases on each unit and the payments confirmed against them. Record a lease, and this month's position appears here."
              />
            ) : (
              <>
                <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-900">
                      Collection, last 6 months
                    </h3>
                  </div>
                  <div className="space-y-3">
                    {finances.months.map((m) => {
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
                              style={{
                                width: `${(m.expected / maxMonth) * 100}%`,
                              }}
                            />
                            <div
                              className={cn(
                                "h-full absolute left-0 top-0",
                                rate !== null && rate >= 100
                                  ? "bg-green-500"
                                  : "bg-teal-500",
                              )}
                              style={{
                                width: `${(m.collected / maxMonth) * 100}%`,
                              }}
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
                    The grey bar is what the leases in force that month said was
                    due; the coloured bar is what was confirmed against it.
                    Deposits are not counted as rent.
                  </p>
                </div>

                {/* items-start: without it the grid stretches both panels to the taller
                    one, leaving a half-screen of empty card under a one-row
                    arrears list. */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">
                        Outstanding this month
                      </h3>
                    </div>
                    {finances.arrears.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-8 h-8 mx-auto mb-3 text-green-500" />
                        <p className="text-sm text-gray-600">
                          Every lease in force is paid up for{" "}
                          {finances.currentLabel}.
                        </p>
                      </div>
                    ) : (
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-200">
                          {finances.arrears.map((a) => (
                            <tr key={a.unitId}>
                              <td className="px-5 py-3">
                                <Link
                                  href={`/dashboard/landlord/buildings/${building.id}/units/${a.unitId}`}
                                  className="font-medium text-gray-900 hover:text-teal-600"
                                >
                                  {a.unitNumber}
                                </Link>
                                <p className="text-xs text-gray-500">
                                  {a.tenantName}
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right">
                                <p className="font-semibold text-gray-900">
                                  {formatKes(a.balance)}
                                </p>
                                <p
                                  className={cn(
                                    "text-xs",
                                    a.status === "overdue"
                                      ? "text-red-600"
                                      : "text-gray-500",
                                  )}
                                >
                                  {rentStatusStyle[a.status].label}
                                  {a.daysLate > 0
                                    ? ` · ${a.daysLate} days late`
                                    : ""}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                    <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-gray-400" />
                      <h3 className="font-semibold text-gray-900">
                        Recent payments
                      </h3>
                    </div>
                    {finances.recentPayments.length === 0 ? (
                      <div className="p-8 text-center text-sm text-gray-500">
                        No confirmed payments recorded yet.
                      </div>
                    ) : (
                      <table className="w-full">
                        <tbody className="divide-y divide-gray-200">
                          {finances.recentPayments.map((p) => (
                            <tr key={p.id}>
                              <td className="px-5 py-3">
                                <p className="text-sm font-medium text-gray-900">
                                  {p.unitNumber} · {p.tenantName}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {formatShortDate(p.date)} ·{" "}
                                  {labelFor(paymentMethodLabels, p.method)}
                                  {p.reference ? ` · ${p.reference}` : ""}
                                </p>
                              </td>
                              <td className="px-5 py-3 text-right whitespace-nowrap">
                                <p className="font-semibold text-gray-900">
                                  {formatKes(p.amount)}
                                </p>
                                <p className="text-xs text-gray-500 capitalize">
                                  {p.type === "rent"
                                    ? `rent · ${p.periodLabel ?? "—"}`
                                    : p.type.replace(/_/g, " ")}
                                </p>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </>
            )}
          </>
        )}

        {/* -------------------------------------------------- MAINTENANCE */}
        {activeTab === "maintenance" && (
          <>
            {maintenance.length === 0 ? (
              <EmptyPanel
                icon={<Wrench className="w-8 h-8" />}
                title="No maintenance requests"
                body="Nothing has been reported for any unit in this building. Requests raised by tenants, and jobs you log yourself, appear here with their cost and who is handling them."
              />
            ) : (
              <div className="space-y-6">
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  <StatCard
                    label="Open"
                    value={String(openMaintenance.length)}
                    tone={
                      openMaintenance.length > 0
                        ? "text-red-600"
                        : "text-gray-900"
                    }
                  />
                  <StatCard
                    label="Urgent"
                    value={String(
                      openMaintenance.filter(
                        (m) =>
                          m.urgency === "emergency" || m.urgency === "high",
                      ).length,
                    )}
                    tone="text-orange-600"
                  />
                  <StatCard
                    label="Committed cost"
                    value={formatKesCompact(
                      openMaintenance.reduce(
                        (s, m) => s + (m.estimatedCost ?? 0),
                        0,
                      ),
                    )}
                    hint="estimates on open jobs"
                  />
                  <StatCard
                    label="Spent, closed jobs"
                    value={formatKesCompact(
                      closedMaintenance.reduce(
                        (s, m) => s + (m.actualCost ?? 0),
                        0,
                      ),
                    )}
                  />
                </div>

                {[
                  { title: "Open", items: openMaintenance },
                  { title: "Closed", items: closedMaintenance },
                ]
                  .filter((group) => group.items.length > 0)
                  .map((group) => (
                    <div key={group.title}>
                      <h3 className="font-semibold text-gray-900 mb-3">
                        {group.title}
                        <span className="ml-2 text-sm font-normal text-gray-500">
                          {group.items.length}
                        </span>
                      </h3>
                      <div className="space-y-3">
                        {group.items.map((m) => (
                          <MaintenanceRequestCard
                            key={m.id}
                            item={m}
                            buildingId={building.id}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function UnitGridCard({
  unit,
  buildingId,
}: {
  unit: UnitCard;
  buildingId: string;
}) {
  const style = statusStyle(unit.status);
  return (
    <Link
      href={`/dashboard/landlord/buildings/${buildingId}/units/${unit.id}`}
      className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all block"
    >
      <div className="flex items-start justify-between mb-3 gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div
            className={cn(
              "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
              style.bg,
            )}
          >
            <Home className={cn("w-5 h-5", style.text)} />
          </div>
          <div className="min-w-0">
            <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors truncate">
              {unit.unit_number}
            </h3>
            <p className="text-xs text-gray-500">
              {unit.floor_level ? `Floor ${unit.floor_level}` : "Floor —"}
              {unit.wing_block ? ` · ${unit.wing_block}` : ""}
            </p>
          </div>
        </div>
        <span
          className={cn(
            "px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap shrink-0",
            style.bg,
            style.text,
          )}
        >
          {labelFor(unitStatusLabels, unit.status)}
        </span>
      </div>

      <div className="flex items-center gap-2 text-sm text-gray-600 mb-3 flex-wrap">
        <span>{labelFor(unitTypeShortLabels, unit.unit_type)}</span>
        <span>•</span>
        <span>
          {unit.bathrooms % 1 === 0
            ? unit.bathrooms
            : unit.bathrooms.toFixed(1)}{" "}
          BA
        </span>
        {unit.size_sqm !== null && (
          <>
            <span>•</span>
            <span>{unit.size_sqm} m²</span>
          </>
        )}
      </div>

      <div className="flex items-center justify-between gap-2">
        <div>
          <span className="text-lg font-bold text-gray-900">
            {formatKes(unit.monthly_rent)}
          </span>
          <span className="text-sm text-gray-500">/mo</span>
        </div>
        {unit.rent ? (
          <span
            className={cn(
              "px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap",
              rentStatusStyle[unit.rent.status].bg,
              rentStatusStyle[unit.rent.status].text,
            )}
          >
            {rentStatusStyle[unit.rent.status].label}
          </span>
        ) : (
          unit.listing_status && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-600 whitespace-nowrap">
              {labelFor(unitListingStatusLabels, unit.listing_status)}
            </span>
          )
        )}
      </div>

      {unit.rent && unit.rent.balance > 0 && (
        <p className="text-xs text-gray-500 mt-1">
          {formatKes(unit.rent.balance)} outstanding
          {unit.rent.daysLate > 0 ? ` · ${unit.rent.daysLate} days late` : ""}
        </p>
      )}

      {unit.openMaintenance > 0 && (
        <p className="text-xs text-yellow-700 mt-2 inline-flex items-center gap-1">
          <Wrench className="w-3 h-3" />
          {unit.openMaintenance} open{" "}
          {unit.openMaintenance === 1 ? "request" : "requests"}
        </p>
      )}

      {unit.tenant && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-xs font-semibold shrink-0">
              {unit.tenant.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {unit.tenant.name}
              </p>
              <p className="text-xs text-gray-500">
                {unit.lease?.end_date
                  ? `Until ${formatMonthYear(unit.lease.end_date)}`
                  : "Open-ended lease"}
              </p>
            </div>
          </div>
        </div>
      )}
    </Link>
  );
}
