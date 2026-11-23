"use client";

/**
 * One tenant's profile — the interactive half.
 *
 * The tabs are the only client state; everything rendered was resolved on the
 * server. The blacklist banner is deliberately unmissable: `blacklisted` is a
 * label a landlord acts on, and burying it in a badge would be the wrong call.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  Mail,
  Home,
  Building2,
  Calendar,
  Wallet,
  Wrench,
  ShieldCheck,
  ShieldAlert,
  Briefcase,
  Users,
  FileText,
  CheckCircle,
  Clock,
  TrendingUp,
  Receipt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  leaseStatusLabels,
  paymentMethodLabels,
  verificationLevelLabels,
  labelFor,
  formatKes,
  formatKesCompact,
} from "@/lib/landlord/labels";
import { PAYMENT_TYPE_LABELS } from "@/lib/landlord/payment-form";
import { ID_TYPE_LABELS } from "@/lib/landlord/tenancy-form";
import { TENANT_STATUS_LABELS } from "@/lib/landlord/tenant-directory";
import type { RentStatus } from "@/lib/landlord/rent-status";
import {
  MaintenanceRequestCard,
  formatShortDate,
} from "@/components/dashboard/landlord/MaintenanceRequestCard";
import type { TenantProfileData } from "./types";

const rentStatusStyle: Record<
  RentStatus,
  { label: string; bg: string; text: string }
> = {
  paid: { label: "Paid", bg: "bg-green-50", text: "text-green-700" },
  partial: { label: "Part paid", bg: "bg-amber-50", text: "text-amber-700" },
  pending: { label: "Not due yet", bg: "bg-gray-100", text: "text-gray-600" },
  overdue: { label: "Overdue", bg: "bg-red-50", text: "text-red-700" },
};

type TabId = "overview" | "leases" | "payments" | "maintenance";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-1.5">
      <span className="text-gray-500 shrink-0">{label}</span>
      <span className="font-medium text-gray-900 text-right">{value}</span>
    </div>
  );
}

export function TenantProfile({ data }: { data: TenantProfileData }) {
  const { tenant, leases, payments, maintenance, rent, months } = data;
  const [activeTab, setActiveTab] = useState<TabId>("overview");

  const liveLeases = useMemo(() => leases.filter((l) => l.isLive), [leases]);
  const pastLeases = useMemo(() => leases.filter((l) => !l.isLive), [leases]);
  const openMaintenance = useMemo(
    () => maintenance.filter((m) => m.isOpen),
    [maintenance],
  );

  const maxMonth = Math.max(
    1,
    ...months.map((m) => Math.max(m.expected, m.collected)),
  );

  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: "overview", label: "Overview" },
    { id: "leases", label: "Leases", count: leases.length },
    { id: "payments", label: "Payments", count: payments.length },
    { id: "maintenance", label: "Maintenance", count: openMaintenance.length },
  ];

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-xl">
        <div className="px-4 sm:px-5 py-4 flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 min-w-0">
            <Link
              href="/dashboard/landlord/tenants"
              aria-label="Back to tenants"
              className="p-2 -ml-2 mt-0.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div
              className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center text-lg font-semibold shrink-0",
                tenant.status === "blacklisted"
                  ? "bg-red-50 text-red-700"
                  : "bg-teal-50 text-teal-700",
              )}
            >
              {tenant.initial}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-semibold text-gray-900">
                  {tenant.name}
                </h1>
                {tenant.status !== "active" && (
                  <span
                    className={cn(
                      "px-2 py-0.5 text-xs font-medium rounded-full",
                      tenant.status === "blacklisted"
                        ? "bg-red-100 text-red-800"
                        : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {labelFor(TENANT_STATUS_LABELS, tenant.status)}
                  </span>
                )}
                {liveLeases.length === 0 && (
                  <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-600">
                    {leases.length > 0 ? "Former tenant" : "No lease yet"}
                  </span>
                )}
              </div>
              <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                {labelFor(verificationLevelLabels, tenant.verificationLevel)}
                {tenant.idNumber && (
                  <>
                    <span className="text-gray-300">·</span>
                    {labelFor(ID_TYPE_LABELS, tenant.idType)} {tenant.idNumber}
                  </>
                )}
              </p>
              {(tenant.occupation || tenant.employer) && (
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1.5">
                  <Briefcase className="w-3 h-3 shrink-0" />
                  {[tenant.occupation, tenant.employer]
                    .filter(Boolean)
                    .join(" · ")}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`tel:${tenant.phone}`}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
            >
              <Phone className="w-4 h-4" />
              <span className="hidden sm:inline">Call</span>
            </a>
            {tenant.email && (
              <a
                href={`mailto:${tenant.email}`}
                className="inline-flex items-center gap-2 px-3 py-2 text-sm text-gray-700 border border-gray-200 hover:bg-gray-50 rounded-lg transition-colors"
              >
                <Mail className="w-4 h-4" />
                <span className="hidden sm:inline">Email</span>
              </a>
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

      {tenant.status === "blacklisted" && (
        <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <ShieldAlert className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">
              This tenant is marked blacklisted on your records
            </p>
            <p className="mt-0.5">
              {tenant.blacklistReason ?? "No reason was recorded."}
            </p>
          </div>
        </div>
      )}

      <div className="pt-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-2 space-y-6">
              {/* Rent position */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex items-start justify-between gap-4 mb-3">
                  <h2 className="font-semibold text-gray-900">
                    Rent, {data.periodLabel}
                  </h2>
                  {rent && (
                    <span
                      className={cn(
                        "px-2 py-1 text-xs font-medium rounded-full",
                        rentStatusStyle[rent.status].bg,
                        rentStatusStyle[rent.status].text,
                      )}
                    >
                      {rentStatusStyle[rent.status].label}
                      {rent.daysLate > 0 ? ` · ${rent.daysLate}d late` : ""}
                    </span>
                  )}
                </div>

                {rent ? (
                  <>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl font-bold text-gray-900">
                        {formatKes(rent.paid)}
                      </span>
                      <span className="text-gray-500">
                        of {formatKes(rent.due)}
                      </span>
                    </div>
                    {rent.balance > 0 && (
                      <p className="text-sm text-red-600 mt-1">
                        {formatKes(rent.balance)} still outstanding
                      </p>
                    )}
                    {liveLeases.length > 1 && (
                      <p className="text-xs text-gray-400 mt-2">
                        Across {liveLeases.length} live leases.
                      </p>
                    )}
                  </>
                ) : (
                  <p className="text-sm text-gray-500">
                    {leases.length === 0
                      ? "No lease has ever been recorded for this tenant, so nothing is due."
                      : liveLeases.length === 0
                        ? "No live lease, so nothing is due this month."
                        : "The lease does not cover this month."}
                  </p>
                )}
              </div>

              {/* Six-month history */}
              {months.some((m) => m.expected > 0 || m.collected > 0) && (
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-4 h-4 text-gray-400" />
                    <h2 className="font-semibold text-gray-900">
                      Their last 6 months
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
                          <span className="w-56 shrink-0 text-xs text-gray-600 text-right tabular-nums">
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
                    Grey is what their leases said was due that month; coloured
                    is what was confirmed against it. Deposits are not rent.
                  </p>
                </div>
              )}

              {/* Where they live */}
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">
                  {liveLeases.length > 0
                    ? "Where they live"
                    : "Last known unit"}
                </h2>
                {leases.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No unit on record. Adding this tenant to a unit records a
                    lease and starts tracking rent.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {(liveLeases.length > 0
                      ? liveLeases
                      : pastLeases.slice(0, 1)
                    ).map((l) => (
                      <div
                        key={l.id}
                        className="flex items-start justify-between gap-4 flex-wrap"
                      >
                        <div>
                          {l.buildingId ? (
                            <Link
                              href={`/dashboard/landlord/buildings/${l.buildingId}/units/${l.unitId}`}
                              className="font-medium text-gray-900 hover:text-teal-600 inline-flex items-center gap-1.5"
                            >
                              <Home className="w-4 h-4 text-gray-400" />
                              Unit {l.unitNumber}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">
                              Unit {l.unitNumber}
                            </span>
                          )}
                          <p className="text-sm text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <Building2 className="w-3.5 h-3.5" />
                            {l.buildingName ?? "—"}
                            {l.buildingArea ? ` · ${l.buildingArea}` : ""}
                          </p>
                          <p className="text-xs text-gray-400 mt-1 flex items-center gap-1.5">
                            <Calendar className="w-3 h-3" />
                            {formatShortDate(l.startDate)} →{" "}
                            {l.endDate
                              ? formatShortDate(l.endDate)
                              : "open ended"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatKes(l.monthlyRent)}
                          </p>
                          <p className="text-xs text-gray-500">
                            due day {l.rentDueDay}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">Contact</h2>
                <div className="text-sm space-y-2">
                  <a
                    href={`tel:${tenant.phone}`}
                    className="flex items-center gap-2 text-gray-700 hover:text-teal-600"
                  >
                    <Phone className="w-4 h-4 text-gray-400" />
                    {tenant.phone}
                  </a>
                  {tenant.phoneSecondary && (
                    <a
                      href={`tel:${tenant.phoneSecondary}`}
                      className="flex items-center gap-2 text-gray-700 hover:text-teal-600"
                    >
                      <Phone className="w-4 h-4 text-gray-400" />
                      {tenant.phoneSecondary}
                      <span className="text-xs text-gray-400">alt</span>
                    </a>
                  )}
                  {tenant.email && (
                    <a
                      href={`mailto:${tenant.email}`}
                      className="flex items-center gap-2 text-gray-700 hover:text-teal-600 break-all"
                    >
                      <Mail className="w-4 h-4 text-gray-400 shrink-0" />
                      {tenant.email}
                    </a>
                  )}
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

                {(tenant.occupants.adults !== null ||
                  tenant.occupants.children !== null) && (
                  <div className="mt-4 pt-4 border-t border-gray-100 text-sm">
                    <p className="text-gray-500 mb-1 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5" />
                      Household
                    </p>
                    <p className="text-gray-900">
                      {[
                        tenant.occupants.adults !== null
                          ? `${tenant.occupants.adults} ${tenant.occupants.adults === 1 ? "adult" : "adults"}`
                          : null,
                        tenant.occupants.children
                          ? `${tenant.occupants.children} ${tenant.occupants.children === 1 ? "child" : "children"}`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h2 className="font-semibold text-gray-900 mb-3">On record</h2>
                <div className="text-sm divide-y divide-gray-100">
                  <Row
                    label="Deposits held"
                    value={formatKesCompact(data.depositsHeld)}
                  />
                  <Row label="Leases" value={leases.length} />
                  <Row label="Payments" value={payments.length} />
                  <Row
                    label="Added"
                    value={formatShortDate(tenant.createdAt)}
                  />
                  {tenant.employerPhone && (
                    <Row label="Employer phone" value={tenant.employerPhone} />
                  )}
                </div>
                {tenant.notes && (
                  <p className="mt-4 pt-4 border-t border-gray-100 text-sm text-gray-600">
                    {tenant.notes}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {activeTab === "leases" && (
          <div className="space-y-3">
            {leases.length === 0 ? (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <FileText className="w-10 h-10 mx-auto mb-4 text-gray-400" />
                <p className="font-medium text-gray-900 mb-1">
                  No leases on record
                </p>
                <p className="text-sm text-gray-500">
                  This tenant exists on your records but has never been given a
                  unit.
                </p>
              </div>
            ) : (
              leases.map((l) => (
                <div
                  key={l.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <div className="flex items-start justify-between gap-4 flex-wrap">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        {l.buildingId ? (
                          <Link
                            href={`/dashboard/landlord/buildings/${l.buildingId}/units/${l.unitId}`}
                            className="font-medium text-gray-900 hover:text-teal-600"
                          >
                            Unit {l.unitNumber}
                          </Link>
                        ) : (
                          <span className="font-medium text-gray-900">
                            Unit {l.unitNumber}
                          </span>
                        )}
                        <span
                          className={cn(
                            "px-2 py-0.5 text-xs font-medium rounded-full",
                            l.isLive
                              ? "bg-teal-50 text-teal-700"
                              : "bg-gray-100 text-gray-600",
                          )}
                        >
                          {labelFor(leaseStatusLabels, l.status)}
                        </span>
                        {l.leaseType && (
                          <span className="text-xs text-gray-400">
                            {l.leaseType.replace(/_/g, " ")}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-500">
                        {l.buildingName ?? "—"} · {formatShortDate(l.startDate)}{" "}
                        →{" "}
                        {l.endDate ? formatShortDate(l.endDate) : "open ended"}
                      </p>
                      <div className="flex items-center gap-x-4 gap-y-1 flex-wrap text-xs text-gray-500 mt-1.5">
                        <span>Rent day {l.rentDueDay}</span>
                        {l.paymentMethod && (
                          <span>
                            {labelFor(paymentMethodLabels, l.paymentMethod)}
                          </span>
                        )}
                        {l.depositAmount !== null && (
                          <span>
                            Deposit {formatKes(l.depositAmount)}
                            {l.depositStatus
                              ? ` · ${l.depositStatus.replace(/_/g, " ")}`
                              : ""}
                          </span>
                        )}
                        {l.terminatedAt && (
                          <span className="text-red-600">
                            Ended {formatShortDate(l.terminatedAt)}
                            {l.terminatedBy ? ` by ${l.terminatedBy}` : ""}
                            {l.terminationReason
                              ? ` — ${l.terminationReason}`
                              : ""}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900">
                        {formatKes(l.monthlyRent)}
                      </p>
                      <p className="text-xs text-gray-500">per month</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-200 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-gray-400" />
              <h2 className="font-semibold text-gray-900">
                Everything they have paid
              </h2>
            </div>
            {payments.length === 0 ? (
              <div className="p-12 text-center">
                <Wallet className="w-10 h-10 mx-auto mb-4 text-gray-400" />
                <p className="font-medium text-gray-900 mb-1">
                  No payments recorded
                </p>
                <p className="text-sm text-gray-500">
                  Payments are recorded from the unit this tenant occupies.
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
                          {p.periodLabel ? ` · ${p.periodLabel}` : ""}
                        </p>
                        <p className="text-sm text-gray-500">
                          {formatShortDate(p.date)} ·{" "}
                          {labelFor(paymentMethodLabels, p.method)}
                          {p.unitNumber ? ` · ${p.unitNumber}` : ""}
                          {p.reference ? ` · ${p.reference}` : ""}
                        </p>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-semibold text-gray-900 tabular-nums">
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
                  Nothing reported by this tenant
                </p>
                <p className="text-sm text-gray-500">
                  Requests they raise appear here with their cost and who is
                  handling them.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {maintenance.map((m) => (
                  <MaintenanceRequestCard
                    key={m.id}
                    item={m}
                    buildingId={m.buildingId ?? null}
                    showBuilding
                  />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
