/**
 * Landlord dashboard — the overview.
 *
 * WHAT THIS REPLACES
 *   The page opened with:
 *
 *     // In production, these would be real database queries
 *     // For now, we'll use placeholder data to demonstrate the UI
 *     const stats = { totalProperties: 3, totalUnits: 12, occupiedUnits: 10,
 *                     occupancyRate: 83, totalTenants: 10,
 *                     rentCollected: 285000, rentExpected: 350000,
 *                     collectionRate: 81, ... };
 *
 *   — ten invented numbers, plus three invented activity entries naming a
 *   "Sunrise Apartments" and a "John Mwangi" who do not exist, plus a hardcoded
 *   "+2 this month" on the tenants tile. Every landlord who had ever signed in
 *   saw the same fiction, including one with an empty account. It is the first
 *   screen after login, and it was the least true screen in the product.
 *
 *   The "Attention Needed" alerts keyed off those invented numbers too, so the
 *   page could warn a landlord about rent arrears they did not have.
 *
 * WHAT IT DOES NOW
 *   Seven queries, all scoped to this landlord, rolled up by
 *   src/lib/landlord/portfolio.ts — which shares its period rules with the
 *   building detail page so the two cannot disagree about what is due.
 *
 * TWO THINGS WORTH KNOWING ABOUT THE NUMBERS
 *   Occupancy is counted from the unit rows, not from buildings.total_units —
 *   that is a stored counter with no trigger maintaining it.
 *
 *   Collection rate is absent, not zero, when nothing is due. A landlord with
 *   buildings but no leases yet is not collecting 0% of their rent, and the
 *   arrears alert must not fire at them.
 *
 * STILL NOT REAL ON THIS PAGE
 *   Nothing. Every figure and every row below comes from a query. The one thing
 *   removed rather than wired is the "+2 this month" trend on the tenants tile:
 *   it was a literal string, and leases carry created_at but tenancies starting
 *   and ending in a month is a different question from rows inserted in it.
 *   Rather than compute something that looks like a trend and is not one, the
 *   tile now says how many units those tenants occupy.
 */

import { createClient } from "@/lib/supabase/server";
import {
  Building2,
  Users,
  Wallet,
  Clock,
  FileText,
  Wrench,
  AlertCircle,
  Plus,
  Megaphone,
  Home,
  MessageSquare,
  CalendarClock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { nairobiToday } from "@/lib/landlord/rent-status";
import {
  rollUpPortfolio,
  mergeActivity,
  relativeTime,
  endsWithin,
  LIVE_LEASE_STATUSES,
  type ActivityItem,
  type PortfolioLease,
} from "@/lib/landlord/portfolio";
import { formatKes } from "@/lib/landlord/labels";

/** PostgREST returns numeric as a string; null must not quietly become 0. */
function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

interface LeaseRow {
  id: string;
  unit_id: string;
  tenant_id: string;
  status: string;
  start_date: string;
  end_date: string | null;
  monthly_rent: number | string | null;
  created_at: string | null;
  tenants: { full_name: string } | null;
}

interface PaymentRow {
  id: string;
  lease_id: string;
  amount: number | string | null;
  payment_type: string;
  period_year: number | null;
  period_month: number | null;
  payment_date: string;
  confirmed_at: string | null;
}

export default async function LandlordDashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const [
    { data: profileData },
    { data: buildingRows },
    { data: unitRows },
    { data: maintenanceRows },
    { data: inquiryRows },
  ] = await Promise.all([
    supabase
      .from("profiles")
      // Filtered by `user.id` and not by the `landlordId` alias below on
      // purpose. src/__tests__/profile-read-scope.test.ts refuses a profiles
      // read scoped by anything but the caller's own identity, and it is right
      // to: `landlordId` is a name that could later be assigned from a route
      // param, at which point this becomes a cross-user read of a table that
      // holds email and phone. The alias is fine for the landlord's OWN rows
      // in the tables below; it is not fine here.
      .select("full_name")
      .eq("id", user?.id ?? "")
      .maybeSingle(),
    supabase
      .from("buildings")
      .select("id, name, status")
      .eq("landlord_id", landlordId),
    supabase
      .from("units")
      .select("id, building_id, unit_number, status")
      .eq("landlord_id", landlordId),
    supabase
      // prettier-ignore
      .from("maintenance_requests")
      .select("id, unit_id, title, status, urgency, reported_at")
      .eq("landlord_id", landlordId)
      .order("reported_at", { ascending: false })
      .limit(200),
    supabase
      .from("inquiries")
      .select("id, name, status, created_at, listing_id")
      .eq("landlord_id", landlordId)
      .order("created_at", { ascending: false })
      .limit(200),
  ]);

  const buildings = buildingRows ?? [];
  const units = unitRows ?? [];
  const maintenance = maintenanceRows ?? [];
  const inquiries = inquiryRows ?? [];

  const unitIds = units.map((u) => u.id);
  const { data: leaseRows } = unitIds.length
    ? await supabase
        .from("leases")
        // prettier-ignore
        .select(
          "id, unit_id, tenant_id, status, start_date, end_date, monthly_rent, created_at, tenants ( full_name )",
        )
        .eq("landlord_id", landlordId)
        .in("unit_id", unitIds)
    : { data: [] };

  const leases = (leaseRows ?? []) as unknown as LeaseRow[];
  const leaseIds = leases.map((l) => l.id);

  const { data: paymentRows } = leaseIds.length
    ? await supabase
        .from("payments")
        // prettier-ignore
        .select(
          "id, lease_id, amount, payment_type, period_year, period_month, payment_date, confirmed_at",
        )
        .in("lease_id", leaseIds)
        .eq("status", "confirmed")
        .order("payment_date", { ascending: false })
        .limit(500)
    : { data: [] };

  const payments = (paymentRows ?? []) as PaymentRow[];

  // ---------------------------------------------------------------- rollup

  const today = nairobiToday();
  const now = new Date();
  const period = { year: today.year, month: today.month };

  const portfolioLeases: PortfolioLease[] = leases.map((l) => ({
    id: l.id,
    tenant_id: l.tenant_id,
    unit_id: l.unit_id,
    status: l.status,
    start_date: l.start_date,
    end_date: l.end_date,
    monthly_rent: num(l.monthly_rent),
  }));

  const stats = rollUpPortfolio({
    buildingCount: buildings.filter((b) => b.status !== "archived").length,
    units: units.map((u) => ({
      id: u.id,
      building_id: u.building_id,
      status: u.status ?? "vacant",
    })),
    leases: portfolioLeases,
    payments: payments.map((p) => ({
      lease_id: p.lease_id,
      amount: num(p.amount),
      payment_type: p.payment_type,
      period_year: p.period_year,
      period_month: p.period_month,
    })),
    maintenance: maintenance.map((m) => ({
      status: m.status ?? "open",
      urgency: m.urgency ?? "normal",
    })),
    inquiryStatuses: inquiries.map((i) => i.status ?? "new"),
    period,
  });

  // ------------------------------------------------------------- lookups

  const buildingName = new Map(buildings.map((b) => [b.id, b.name]));
  const unitById = new Map(units.map((u) => [u.id, u]));
  const leaseById = new Map(leases.map((l) => [l.id, l]));

  /** "A101, Riverside Court" — as much of it as is actually known. */
  function whereIs(unitId: string | null | undefined): string {
    if (!unitId) return "";
    const unit = unitById.get(unitId);
    if (!unit) return "";
    const name = unit.building_id ? buildingName.get(unit.building_id) : null;
    return name ? `${unit.unit_number}, ${name}` : unit.unit_number;
  }

  function buildingHref(unitId: string | null | undefined): string | null {
    if (!unitId) return null;
    const unit = unitById.get(unitId);
    if (!unit?.building_id) return null;
    return `/dashboard/landlord/buildings/${unit.building_id}`;
  }

  // ------------------------------------------------------------ activity

  const paymentActivity: ActivityItem[] = payments.slice(0, 20).map((p) => {
    const lease = leaseById.get(p.lease_id);
    const place = whereIs(lease?.unit_id);
    const who = lease?.tenants?.full_name;
    return {
      id: `payment:${p.id}`,
      kind: "payment",
      title:
        p.payment_type === "rent"
          ? "Rent payment received"
          : `${p.payment_type.replace(/_/g, " ")} received`,
      description: [place, who, formatKes(num(p.amount))]
        .filter(Boolean)
        .join(" · "),
      at: p.confirmed_at ?? `${p.payment_date}T00:00:00Z`,
      href: buildingHref(lease?.unit_id),
    };
  });

  const maintenanceActivity: ActivityItem[] = maintenance
    .slice(0, 20)
    .map((m) => ({
      id: `maintenance:${m.id}`,
      kind: "maintenance" as const,
      title: "Maintenance request",
      description: [m.title, whereIs(m.unit_id)].filter(Boolean).join(" · "),
      at: m.reported_at ?? "",
      href: buildingHref(m.unit_id),
    }));

  const leaseActivity: ActivityItem[] = leases
    .filter((l) => LIVE_LEASE_STATUSES.includes(l.status))
    .map((l) => ({
      id: `lease:${l.id}`,
      kind: "lease" as const,
      title: "New lease",
      description: [l.tenants?.full_name, whereIs(l.unit_id)]
        .filter(Boolean)
        .join(" · "),
      at: l.created_at ?? "",
      href: buildingHref(l.unit_id),
    }));

  const inquiryActivity: ActivityItem[] = inquiries.slice(0, 20).map((i) => ({
    id: `inquiry:${i.id}`,
    kind: "inquiry" as const,
    title: "New inquiry",
    description: i.name,
    at: i.created_at ?? "",
    href: "/dashboard/inquiries",
  }));

  const activity = mergeActivity(
    [paymentActivity, maintenanceActivity, leaseActivity, inquiryActivity],
    8,
  );

  const activityStyle: Record<
    ActivityItem["kind"],
    { icon: typeof Wallet; bg: string; color: string }
  > = {
    payment: { icon: Wallet, bg: "bg-success-100", color: "text-success-600" },
    maintenance: {
      icon: Wrench,
      bg: "bg-orange-100",
      color: "text-orange-600",
    },
    lease: { icon: FileText, bg: "bg-blue-100", color: "text-blue-600" },
    inquiry: {
      icon: MessageSquare,
      bg: "bg-teal-100",
      color: "text-teal-600",
    },
  };

  // Leases ending inside the notice window a landlord can still act in.
  const expiring = leases
    .filter(
      (l) =>
        LIVE_LEASE_STATUSES.includes(l.status) &&
        endsWithin(l.end_date, today, 60),
    )
    .sort((a, b) => (a.end_date ?? "").localeCompare(b.end_date ?? ""));

  const firstName =
    (profileData as { full_name: string | null } | null)?.full_name?.split(
      " ",
    )[0] || "there";

  const hasNothing = buildings.length === 0 && units.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
            Welcome back, {firstName}!
          </h1>
          <p className="text-gray-500 mt-1">
            {hasNothing
              ? "Add your first building and the figures here start filling in."
              : "Here's what's happening with your properties today."}
          </p>
        </div>

        <div className="flex gap-3">
          <Link
            href="/dashboard/landlord/listings/new"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "bg-cta-500 hover:bg-cta-600 text-white font-semibold text-sm",
              "transition-colors shadow-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-cta-400 focus-visible:ring-offset-2",
            )}
          >
            <Megaphone className="w-5 h-5" />
            List a Vacancy
          </Link>
          <Link
            href="/dashboard/landlord/buildings/new"
            className={cn(
              "inline-flex items-center gap-2 px-4 py-2.5 rounded-lg",
              "bg-brand-500 hover:bg-brand-600 text-white font-semibold text-sm",
              "transition-colors shadow-sm",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-400 focus-visible:ring-offset-2",
            )}
          >
            <Home className="w-5 h-5" />
            Add Property
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Link
          href="/dashboard/landlord/buildings"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-teal-100 rounded-lg">
              <Building2 className="w-5 h-5 text-teal-600" />
            </div>
            <span className="text-sm font-medium text-gray-500">
              {stats.totalUnits === 0
                ? "no units yet"
                : `${stats.occupancyRate}% occupied`}
            </span>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">
              {stats.totalUnits}
            </p>
            <p className="text-sm text-gray-500">
              {stats.totalUnits === 1 ? "Unit" : "Units"} across{" "}
              {stats.buildings}{" "}
              {stats.buildings === 1 ? "building" : "buildings"}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-1 text-xs flex-wrap">
            <span className="text-success-600 font-medium">
              {stats.occupiedUnits}
            </span>
            <span className="text-gray-400">occupied</span>
            <span className="text-gray-300 mx-1">•</span>
            <span className="text-gray-500 font-medium">
              {stats.vacantUnits}
            </span>
            <span className="text-gray-400">vacant</span>
            {stats.unavailableUnits > 0 && (
              <>
                <span className="text-gray-300 mx-1">•</span>
                <span className="text-orange-600 font-medium">
                  {stats.unavailableUnits}
                </span>
                <span className="text-gray-400">out of service</span>
              </>
            )}
          </div>
        </Link>

        <Link
          href="/dashboard/landlord/tenants"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-blue-100 rounded-lg">
              <Users className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">
              {stats.activeTenants}
            </p>
            <p className="text-sm text-gray-500">Active tenants</p>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats.activeTenants === 0
              ? "No leases recorded yet"
              : `on ${stats.occupiedUnits} occupied ${
                  stats.occupiedUnits === 1 ? "unit" : "units"
                }`}
          </div>
        </Link>

        <Link
          href="/dashboard/landlord/rent"
          className="bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 hover:shadow-sm transition-all"
        >
          <div className="flex items-center justify-between">
            <div className="p-2 bg-success-100 rounded-lg">
              <Wallet className="w-5 h-5 text-success-600" />
            </div>
            {stats.collectionRate !== null && (
              <span
                className={cn(
                  "text-sm font-medium",
                  stats.collectionRate >= 80
                    ? "text-success-600"
                    : "text-orange-500",
                )}
              >
                {stats.collectionRate}% collected
              </span>
            )}
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">
              {stats.collectionRate === null
                ? "—"
                : formatKes(stats.rentCollected)}
            </p>
            <p className="text-sm text-gray-500">Rent this month</p>
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {stats.collectionRate === null
              ? "Nothing is due — no leases in force"
              : `of ${formatKes(stats.rentExpected)} due`}
          </div>
        </Link>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between">
            <div className="p-2 bg-orange-100 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
            </div>
          </div>
          <div className="mt-3">
            <p className="text-2xl font-bold text-gray-900">
              {stats.openMaintenance + stats.unansweredInquiries}
            </p>
            <p className="text-sm text-gray-500">Needs your attention</p>
          </div>
          <div className="mt-2 flex items-center gap-3 text-sm">
            {stats.openMaintenance > 0 && (
              <Link
                href="/dashboard/landlord/maintenance"
                className="flex items-center gap-1 text-orange-600 hover:underline"
              >
                <Wrench className="w-3.5 h-3.5" />
                {stats.openMaintenance} open
              </Link>
            )}
            {stats.unansweredInquiries > 0 && (
              <Link
                href="/dashboard/inquiries"
                className="flex items-center gap-1 text-teal-600 hover:underline"
              >
                <MessageSquare className="w-3.5 h-3.5" />
                {stats.unansweredInquiries} unanswered
              </Link>
            )}
            {stats.openMaintenance === 0 && stats.unansweredInquiries === 0 && (
              <span className="text-gray-400">Nothing outstanding</span>
            )}
          </div>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Recent activity */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Recent activity</h2>
          </div>
          {activity.length === 0 ? (
            <div className="px-5 py-12 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <Clock className="w-7 h-7 text-gray-400" />
              </div>
              <p className="font-medium text-gray-900 mb-1">Nothing yet</p>
              <p className="text-sm text-gray-500 max-w-sm mx-auto">
                Payments, maintenance requests, new leases and inquiries show up
                here as they happen.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {activity.map((item) => {
                const style = activityStyle[item.kind];
                const ActivityIcon = style.icon;
                const body = (
                  <>
                    <div className={cn("p-2 rounded-lg shrink-0", style.bg)}>
                      <ActivityIcon className={cn("w-4 h-4", style.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900">{item.title}</p>
                      <p className="text-sm text-gray-500 truncate">
                        {item.description}
                      </p>
                    </div>
                    <span className="text-xs text-gray-400 whitespace-nowrap">
                      {relativeTime(item.at, now)}
                    </span>
                  </>
                );
                return item.href ? (
                  <Link
                    key={item.id}
                    href={item.href}
                    className="px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors"
                  >
                    {body}
                  </Link>
                ) : (
                  <div
                    key={item.id}
                    className="px-5 py-4 flex items-start gap-4"
                  >
                    {body}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900">Quick actions</h2>
          </div>
          <div className="p-3 space-y-2">
            <Link
              href="/dashboard/landlord/listings/new"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-cta-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-cta-500",
              )}
            >
              <div className="p-2 bg-cta-100 rounded-lg">
                <Megaphone className="w-4 h-4 text-cta-600" />
              </div>
              <div>
                <span className="font-medium">List a vacancy</span>
                <p className="text-xs text-gray-500">
                  {stats.vacantUnits > 0
                    ? `${stats.vacantUnits} vacant ${
                        stats.vacantUnits === 1 ? "unit" : "units"
                      } to advertise`
                    : "Advertise an empty unit"}
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/landlord/buildings/new"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-brand-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-500",
              )}
            >
              <div className="p-2 bg-brand-100 rounded-lg">
                <Plus className="w-4 h-4 text-brand-600" />
              </div>
              <div>
                <span className="font-medium">Add a building</span>
                <p className="text-xs text-gray-500">
                  Register a property to manage
                </p>
              </div>
            </Link>

            <Link
              href="/dashboard/landlord/tenants"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-gray-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
              )}
            >
              <div className="p-2 bg-blue-100 rounded-lg">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <span className="font-medium">All tenants</span>
              {stats.activeTenants > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-600 rounded-full">
                  {stats.activeTenants}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/inquiries"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-orange-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-500",
              )}
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <MessageSquare className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <span className="font-medium">Inquiries</span>
                <p className="text-xs text-gray-500">View tenant leads</p>
              </div>
              {stats.unansweredInquiries > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-600 rounded-full">
                  {stats.unansweredInquiries}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/landlord/rent"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-gray-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
              )}
            >
              <div className="p-2 bg-success-100 rounded-lg">
                <Wallet className="w-4 h-4 text-success-600" />
              </div>
              <span className="font-medium">Rent collection</span>
              {stats.rentOutstanding > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-600 rounded-full">
                  {formatKes(stats.rentOutstanding)}
                </span>
              )}
            </Link>

            <Link
              href="/dashboard/landlord/maintenance"
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-lg",
                "text-gray-700 hover:bg-gray-50 transition-colors",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500",
              )}
            >
              <div className="p-2 bg-orange-100 rounded-lg">
                <Wrench className="w-4 h-4 text-orange-600" />
              </div>
              <span className="font-medium">Maintenance</span>
              {stats.openMaintenance > 0 && (
                <span className="ml-auto px-2 py-0.5 text-xs font-semibold bg-orange-100 text-orange-600 rounded-full">
                  {stats.openMaintenance}
                </span>
              )}
            </Link>
          </div>
        </div>
      </div>

      {/* Attention needed — each of these is derived, so none of them can fire
          at a landlord who does not have the problem. */}
      {(stats.rentOutstanding > 0 ||
        stats.urgentMaintenance > 0 ||
        expiring.length > 0) && (
        <div className="space-y-3">
          <h2 className="font-semibold text-gray-900">Attention needed</h2>

          {stats.rentOutstanding > 0 && (
            <div className="flex items-start gap-3 p-4 bg-orange-50 border border-orange-200 rounded-xl">
              <AlertCircle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-orange-800">
                  {formatKes(stats.rentOutstanding)} of this month&apos;s rent
                  is still outstanding
                </p>
                <p className="text-sm text-orange-700 mt-0.5">
                  {stats.collectionRate}% of {formatKes(stats.rentExpected)} has
                  been collected so far.
                </p>
              </div>
              <Link
                href="/dashboard/landlord/rent"
                className="text-sm font-medium text-orange-600 hover:text-orange-700 whitespace-nowrap"
              >
                View details →
              </Link>
            </div>
          )}

          {stats.urgentMaintenance > 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
              <Wrench className="w-5 h-5 text-blue-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-blue-800">
                  {stats.urgentMaintenance} urgent maintenance request
                  {stats.urgentMaintenance === 1 ? "" : "s"}
                </p>
                <p className="text-sm text-blue-700 mt-0.5">
                  {stats.openMaintenance} open in total. Urgent jobs are the
                  ones marked high or emergency.
                </p>
              </div>
              <Link
                href="/dashboard/landlord/maintenance"
                className="text-sm font-medium text-blue-600 hover:text-blue-700 whitespace-nowrap"
              >
                Review →
              </Link>
            </div>
          )}

          {expiring.length > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <CalendarClock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div className="flex-1">
                <p className="font-medium text-amber-900">
                  {expiring.length} lease{expiring.length === 1 ? "" : "s"} end
                  {expiring.length === 1 ? "s" : ""} within 60 days
                </p>
                <p className="text-sm text-amber-800 mt-0.5">
                  {expiring
                    .slice(0, 3)
                    .map(
                      (l) =>
                        `${whereIs(l.unit_id)}${
                          l.tenants?.full_name
                            ? ` (${l.tenants.full_name})`
                            : ""
                        } — ${l.end_date}`,
                    )
                    .join(" · ")}
                  {expiring.length > 3
                    ? ` · and ${expiring.length - 3} more`
                    : ""}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
