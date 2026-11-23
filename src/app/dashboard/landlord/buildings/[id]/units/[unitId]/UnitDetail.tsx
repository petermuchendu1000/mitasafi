"use client";

/**
 * Unit detail — the interactive half.
 *
 * Besides swapping the four mock objects for real rows, three things changed
 * that were defects rather than data:
 *
 *   The status map had three keys for a column with four, so a 'reserved' unit
 *   threw a TypeError on `statusConfig[unit.status].bgColor` and took the page
 *   down. It now covers all four with a fallback.
 *
 *   Two links went nowhere. "Edit Unit" (from the header and Quick Actions)
 *   pointed at a route that did not exist — that route is now built. "Renew
 *   Lease" pointed at another that still does not, and is removed rather than
 *   left as a 404; so is the chevron to /dashboard/landlord/tenants/<id>,
 *   which has no route either.
 *
 *   "Record Payment" opened a modal that saved nothing. It writes now.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Home,
  Edit2,
  Users,
  Calendar,
  Wallet,
  Phone,
  Mail,
  Clock,
  CheckCircle,
  Plus,
  Wrench,
  UserPlus,
  ShieldCheck,
  Building2,
  Briefcase,
  BadgeCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  unitTypeLabels,
  unitStatusLabels,
  unitListingStatusLabels,
  leaseStatusLabels,
  paymentMethodLabels,
  verificationLevelLabels,
  labelFor,
  formatKes,
} from "@/lib/landlord/labels";
import { PAYMENT_TYPE_LABELS } from "@/lib/landlord/payment-form";
import { ID_TYPE_LABELS } from "@/lib/landlord/tenancy-form";
import { UNIT_FEATURES } from "@/lib/landlord/unit-form";
import type { RentStatus } from "@/lib/landlord/rent-status";
import {
  MaintenanceRequestCard,
  formatShortDate,
} from "@/components/dashboard/landlord/MaintenanceRequestCard";
import { RecordPaymentModal } from "./RecordPaymentModal";
import type { UnitDetailData } from "./types";

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

/** Covers all four values of units_status_check, plus a fallback. */
const unitStatusStyle: Record<string, { bg: string; text: string }> = {
  occupied: { bg: "bg-green-50", text: "text-green-700" },
  vacant: { bg: "bg-blue-50", text: "text-blue-700" },
  maintenance: { bg: "bg-yellow-50", text: "text-yellow-700" },
  reserved: { bg: "bg-purple-50", text: "text-purple-700" },
};
const STATUS_FALLBACK = { bg: "bg-gray-100", text: "text-gray-700" };

const rentStatusStyle: Record<
  RentStatus,
  { label: string; bg: string; text: string }
> = {
  paid: { label: "Paid", bg: "bg-green-50", text: "text-green-700" },
  partial: { label: "Part paid", bg: "bg-amber-50", text: "text-amber-700" },
  pending: { label: "Not due yet", bg: "bg-gray-100", text: "text-gray-600" },
  overdue: { label: "Overdue", bg: "bg-red-50", text: "text-red-700" },
};

type TabId = "overview" | "payments" | "maintenance";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

export function UnitDetail({ data }: { data: UnitDetailData }) {
  const router = useRouter();
  const { unit, tenant, lease, rent, payments, maintenance } = data;
  const [activeTab, setActiveTab] = useState<TabId>("overview");
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const style = unitStatusStyle[unit.status] ?? STATUS_FALLBACK;
  const unitHref = `/dashboard/landlord/buildings/${data.buildingId}/units/${unit.id}`;

  const openMaintenance = useMemo(
    () => maintenance.filter((m) => m.isOpen),
    [maintenance],
  );

  /** The ticked features, read back out of the JSONB groups. */
  const features = useMemo(() => {
    const out: string[] = [];
    if (unit.balconies > 0) out.push("Balcony");
    for (const f of UNIT_FEATURES) {
      if (f.group === "layout") continue;
      const group = unit[f.group as keyof typeof unit] as
        | Record<string, boolean>
        | undefined;
      if (group?.[f.id]) out.push(f.label);
    }
    return out;
  }, [unit]);

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "payments", label: "Payments", count: payments.length },
    { id: "maintenance", label: "Maintenance", count: openMaintenance.length },
  ];

  const periodLabel = (y: number | null, m: number | null) =>
    y && m ? `${MONTH_SHORT[m - 1]} ${y}` : null;

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              href={`/dashboard/landlord/buildings/${data.buildingId}`}
              aria-label="Back to building"
              className="p-2 -ml-2 mt-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div
              className={cn(
                "w-10 h-10 rounded-lg flex items-center justify-center shrink-0 mt-0.5",
                style.bg,
              )}
            >
              <Home className={cn("w-5 h-5", style.text)} />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-gray-900">
                  Unit {unit.unit_number}
                </h1>
                <span
                  className={cn(
                    "px-2 py-0.5 text-xs font-medium rounded-full",
                    style.bg,
                    style.text,
                  )}
                >
                  {labelFor(unitStatusLabels, unit.status)}
                </span>
                {unit.listing_status && unit.listing_status !== "unlisted" && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-teal-50 text-teal-700">
                    {labelFor(unitListingStatusLabels, unit.listing_status)}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                <Building2 className="w-3.5 h-3.5 shrink-0" />
                <Link
                  href={`/dashboard/landlord/buildings/${data.buildingId}`}
                  className="hover:text-teal-600 truncate"
                >
                  {data.buildingName}
                </Link>
                <span className="text-gray-300">·</span>
                {data.buildingArea}
              </p>
              <p className="text-xs text-gray-400 mt-0.5">
                {labelFor(unitTypeLabels, unit.unit_type)}
                {unit.floor_level ? ` · Floor ${unit.floor_level}` : ""}
                {unit.wing_block ? ` · ${unit.wing_block}` : ""}
                {unit.size_sqm ? ` · ${unit.size_sqm} m²` : ""}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={`${unitHref}/edit`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-4 h-4" />
              <span className="hidden sm:inline">Edit</span>
            </Link>
            {lease ? (
              <button
                type="button"
                onClick={() => setShowPaymentModal(true)}
                className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Record payment</span>
              </button>
            ) : (
              <Link
                href={`${unitHref}/add-tenant`}
                className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
              >
                <UserPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Add tenant</span>
              </Link>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 px-4 sm:px-5 -mb-px overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              aria-current={activeTab === tab.id ? "page" : undefined}
              className={cn(
                "px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                activeTab === tab.id
                  ? "border-teal-500 text-teal-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "ml-1.5 px-1.5 py-0.5 text-xs rounded-full",
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

      <div className="pt-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              {/* Rent */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-4">
                  <h2 className="font-semibold text-gray-900">Rent</h2>
                  {rent && (
                    <span
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        rentStatusStyle[rent.status].bg,
                        rentStatusStyle[rent.status].text,
                      )}
                    >
                      {rentStatusStyle[rent.status].label}
                      {/* "Paid · 13d late" reads as a contradiction; lateness
                          is only worth flagging while money is still owed. */}
                      {rent.balance > 0 && rent.daysLate > 0
                        ? ` · ${rent.daysLate}d late`
                        : ""}
                    </span>
                  )}
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-gray-900">
                    {formatKes(lease?.monthly_rent ?? unit.monthly_rent)}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>

                {rent ? (
                  <p className="text-sm text-gray-500 mt-1">
                    {formatKes(rent.paid)} of {formatKes(rent.due)} received
                    this month
                    {rent.balance > 0
                      ? ` · ${formatKes(rent.balance)} outstanding`
                      : ""}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 mt-1">
                    {lease
                      ? "The lease does not cover this month."
                      : "No lease, so nothing is due."}
                  </p>
                )}

                <div className="grid grid-cols-3 gap-4 pt-4 mt-4 border-t border-gray-100 text-sm">
                  <div>
                    <p className="text-gray-500">Deposit</p>
                    <p className="font-semibold text-gray-900">
                      {lease?.deposit_amount !== null &&
                      lease?.deposit_amount !== undefined
                        ? formatKes(lease.deposit_amount)
                        : unit.deposit_amount !== null
                          ? formatKes(unit.deposit_amount)
                          : "—"}
                    </p>
                    {lease?.deposit_status && (
                      <p className="text-xs text-gray-400 capitalize">
                        {lease.deposit_status.replace(/_/g, " ")}
                      </p>
                    )}
                  </div>
                  <div>
                    <p className="text-gray-500">Rent day</p>
                    <p className="font-semibold text-gray-900">
                      {lease ? `${lease.rent_due_day} of the month` : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-500">Service charge</p>
                    <p className="font-semibold text-gray-900">
                      {unit.service_charge !== null
                        ? formatKes(unit.service_charge)
                        : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tenant */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-4">
                  Current tenant
                </h2>

                {tenant && lease ? (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 flex items-center justify-center text-lg font-semibold shrink-0">
                        {tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {tenant.name}
                        </h3>
                        <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                          <ShieldCheck className="w-3 h-3" />
                          {labelFor(
                            verificationLevelLabels,
                            tenant.verification_level,
                          )}
                          {tenant.id_number && (
                            <>
                              <span className="text-gray-300">·</span>
                              {labelFor(ID_TYPE_LABELS, tenant.id_type)}{" "}
                              {tenant.id_number}
                            </>
                          )}
                        </p>
                        <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                          <a
                            href={`tel:${tenant.phone}`}
                            className="flex items-center gap-2 hover:text-teal-600 w-fit"
                          >
                            <Phone className="w-4 h-4" />
                            {tenant.phone}
                          </a>
                          {tenant.email && (
                            <a
                              href={`mailto:${tenant.email}`}
                              className="flex items-center gap-2 hover:text-teal-600 w-fit"
                            >
                              <Mail className="w-4 h-4" />
                              {tenant.email}
                            </a>
                          )}
                          {(tenant.occupation || tenant.employer) && (
                            <span className="flex items-center gap-2 text-gray-500">
                              <Briefcase className="w-4 h-4" />
                              {[tenant.occupation, tenant.employer]
                                .filter(Boolean)
                                .join(" · ")}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {Object.keys(tenant.emergency).length > 0 && (
                      <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
                        <p className="text-gray-500 mb-1">Emergency contact</p>
                        <p className="text-gray-900">
                          {[
                            tenant.emergency.name,
                            tenant.emergency.relationship,
                            tenant.emergency.phone,
                          ]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 text-sm space-y-1">
                      <div className="flex items-center gap-2 text-gray-600">
                        <Calendar className="w-4 h-4 shrink-0" />
                        <span>
                          {formatShortDate(lease.start_date)} →{" "}
                          {lease.end_date
                            ? formatShortDate(lease.end_date)
                            : "open ended"}
                        </span>
                        <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 text-gray-600">
                          {labelFor(leaseStatusLabels, lease.status)}
                        </span>
                      </div>
                      {lease.payment_method && (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Wallet className="w-4 h-4 shrink-0" />
                          Paying by{" "}
                          {labelFor(
                            paymentMethodLabels,
                            lease.payment_method,
                          ).toLowerCase()}
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="font-medium text-gray-900 mb-1">
                      No tenant on this unit
                    </p>
                    <p className="text-sm text-gray-500 max-w-sm mx-auto mb-5">
                      Adding a tenant records their lease and marks the unit
                      occupied, and the rent position starts tracking.
                    </p>
                    <Link
                      href={`${unitHref}/add-tenant`}
                      className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add tenant
                    </Link>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">
                  Unit details
                </h2>
                <div className="text-sm divide-y divide-gray-100">
                  <Row
                    label="Type"
                    value={labelFor(unitTypeLabels, unit.unit_type)}
                  />
                  <Row label="Bedrooms" value={unit.bedrooms} />
                  <Row
                    label="Bathrooms"
                    value={unit.bathrooms === null ? "—" : unit.bathrooms}
                  />
                  <Row
                    label="Size"
                    value={unit.size_sqm === null ? "—" : `${unit.size_sqm} m²`}
                  />
                  <Row label="Floor" value={unit.floor_level ?? "—"} />
                  <Row
                    label="Furnishing"
                    value={
                      unit.furnishing ? unit.furnishing.replace(/_/g, " ") : "—"
                    }
                  />
                </div>
                {unit.description && (
                  <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                    {unit.description}
                  </p>
                )}
              </div>

              {features.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <h2 className="font-semibold text-gray-900 mb-3">Features</h2>
                  <div className="flex flex-wrap gap-2">
                    {features.map((f) => (
                      <span
                        key={f}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-gray-100 text-gray-700 text-xs rounded-lg"
                      >
                        <BadgeCheck className="w-3 h-3 text-teal-600" />
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">
                  Quick actions
                </h2>
                <div className="space-y-1">
                  {lease && (
                    <button
                      type="button"
                      onClick={() => setShowPaymentModal(true)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <Wallet className="w-4 h-4 text-gray-400" />
                      Record a payment
                    </button>
                  )}
                  {!lease && (
                    <Link
                      href={`${unitHref}/add-tenant`}
                      className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <UserPlus className="w-4 h-4 text-gray-400" />
                      Add a tenant
                    </Link>
                  )}
                  <Link
                    href={`${unitHref}/edit`}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-4 h-4 text-gray-400" />
                    Edit this unit
                  </Link>
                  {/*
                    "Renew lease" used to sit here pointing at a route that
                    does not exist, as did a chevron to
                    /dashboard/landlord/tenants/<id>. Both were 404s and both
                    are removed rather than left to fail.
                  */}
                </div>
                {data.pastLeaseCount > 0 && (
                  <p className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-400">
                    {data.pastLeaseCount} earlier{" "}
                    {data.pastLeaseCount === 1 ? "lease" : "leases"} on record.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center justify-between gap-4">
              <h2 className="font-semibold text-gray-900">Payment history</h2>
              {lease && (
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(true)}
                  className="inline-flex items-center gap-2 px-3 py-2 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700"
                >
                  <Plus className="w-4 h-4" />
                  Record payment
                </button>
              )}
            </div>

            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <Wallet className="w-10 h-10 mx-auto mb-4 text-gray-400" />
                <p className="font-medium text-gray-900 mb-1">
                  No payments recorded
                </p>
                <p className="text-sm text-gray-500">
                  {lease
                    ? "Record one and it appears here, and in the building's finances."
                    : "There is no lease on this unit to record a payment against."}
                </p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {payments.map((p) => (
                  <div
                    key={p.id}
                    className="p-4 flex items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                          p.status === "confirmed"
                            ? "bg-green-50"
                            : "bg-yellow-50",
                        )}
                      >
                        {p.status === "confirmed" ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <Clock className="w-5 h-5 text-yellow-600" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900">
                          {PAYMENT_TYPE_LABELS[p.type] ?? p.type}
                          {periodLabel(p.periodYear, p.periodMonth)
                            ? ` · ${periodLabel(p.periodYear, p.periodMonth)}`
                            : ""}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatShortDate(p.date)} ·{" "}
                          {labelFor(paymentMethodLabels, p.method)}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">
                        {formatKes(p.amount)}
                      </p>
                      {p.status !== "confirmed" && (
                        <p className="text-xs text-yellow-700 capitalize">
                          {p.status}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "maintenance" && (
          <>
            {maintenance.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <Wrench className="w-10 h-10 mx-auto mb-4 text-gray-400" />
                <p className="font-medium text-gray-900 mb-1">
                  Nothing reported on this unit
                </p>
                <p className="text-sm text-gray-500">
                  Requests raised by the tenant, and jobs you log yourself,
                  appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenance.map((m) => (
                  <MaintenanceRequestCard
                    key={m.id}
                    item={m}
                    buildingId={data.buildingId}
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>

      {showPaymentModal && lease && (
        <RecordPaymentModal
          leaseId={lease.id}
          defaultAmount={
            rent?.balance && rent.balance > 0
              ? rent.balance
              : lease.monthly_rent
          }
          defaultPeriod={data.currentPeriod}
          todayIso={data.todayIso}
          onClose={() => setShowPaymentModal(false)}
          onSaved={() => {
            setShowPaymentModal(false);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}
