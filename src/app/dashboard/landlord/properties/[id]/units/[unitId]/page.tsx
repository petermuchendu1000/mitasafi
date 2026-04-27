/**
 * Unit Detail Page
 * 
 * Shows unit information, current tenant, lease details, and payment history.
 * Allows managing tenant, recording payments, and updating unit status.
 */

"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Home,
  Edit2,
  MoreVertical,
  Users,
  Calendar,
  Wallet,
  Phone,
  Mail,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  Plus,
  DollarSign,
  FileText,
  Trash2,
  UserPlus,
  ReceiptText,
  ArrowUpRight,
  ChevronRight,
  Shield,
  Key,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Type definitions
type UnitStatus = "occupied" | "vacant" | "maintenance";
type PaymentStatus = "confirmed" | "pending" | "failed";

// Mock data
const mockUnit = {
  id: "u1",
  unit_number: "A101",
  unit_type: "2br",
  floor: 1,
  bedrooms: 2,
  bathrooms: 1,
  size_sqft: 650,
  rent_amount: 35000,
  deposit_amount: 35000,
  features: ["balcony", "ensuite", "fitted_kitchen", "water_heater"],
  description: "Spacious 2-bedroom apartment with natural lighting and a nice balcony view.",
  status: "occupied" as UnitStatus,
  photos: [
    { url: "/images/properties/unit-1.jpg" },
    { url: "/images/properties/unit-2.jpg" },
  ],
  created_at: "2024-01-15",
};

const mockTenant = {
  id: "t1",
  first_name: "Sarah",
  last_name: "Wanjiku",
  phone: "0723456789",
  email: "sarah.wanjiku@email.com",
  id_number: "32456789",
  emergency_contact: {
    name: "James Wanjiku",
    phone: "0712345678",
    relationship: "Brother",
  },
  move_in_date: "2024-01-01",
  photo_url: null,
};

const mockLease = {
  id: "l1",
  start_date: "2024-01-01",
  end_date: "2025-03-15",
  rent_amount: 35000,
  deposit_amount: 35000,
  payment_day: 5,
  status: "active",
  signed_at: "2023-12-28",
};

const mockPayments = [
  {
    id: "p1",
    amount: 35000,
    payment_date: "2025-01-05",
    due_date: "2025-01-05",
    payment_method: "mpesa",
    reference: "RGD456XYZA",
    status: "confirmed" as PaymentStatus,
    month: "January 2025",
  },
  {
    id: "p2",
    amount: 35000,
    payment_date: "2024-12-04",
    due_date: "2024-12-05",
    payment_method: "mpesa",
    reference: "QWE123ABCD",
    status: "confirmed" as PaymentStatus,
    month: "December 2024",
  },
  {
    id: "p3",
    amount: 35000,
    payment_date: "2024-11-06",
    due_date: "2024-11-05",
    payment_method: "bank_transfer",
    reference: "BT202411001",
    status: "confirmed" as PaymentStatus,
    month: "November 2024",
  },
];

const statusConfig: Record<UnitStatus, { label: string; color: string; bgColor: string; textColor: string }> = {
  occupied: {
    label: "Occupied",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
  },
  vacant: {
    label: "Vacant",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
  },
  maintenance: {
    label: "Maintenance",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
  },
};

const paymentStatusConfig: Record<PaymentStatus, { label: string; color: string; bgColor: string }> = {
  confirmed: { label: "Confirmed", color: "text-green-600", bgColor: "bg-green-50" },
  pending: { label: "Pending", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  failed: { label: "Failed", color: "text-red-600", bgColor: "bg-red-50" },
};

const featureLabels: Record<string, string> = {
  balcony: "Balcony",
  ensuite: "En-suite Bathroom",
  storage: "Storage Room",
  ac: "Air Conditioning",
  water_heater: "Water Heater",
  fitted_kitchen: "Fitted Kitchen",
  parking: "Dedicated Parking",
  security_door: "Security Door",
};

type TabType = "overview" | "payments" | "documents";

export default function UnitDetailPage({
  params,
}: {
  params: Promise<{ id: string; unitId: string }>;
}) {
  const { id: buildingId, unitId } = use(params);
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [showAddPaymentModal, setShowAddPaymentModal] = useState(false);

  const unit = mockUnit;
  const tenant = mockTenant;
  const lease = mockLease;
  const payments = mockPayments;

  // Calculate days until lease ends
  const daysUntilLeaseEnd = lease
    ? Math.ceil(
        (new Date(lease.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
      )
    : null;

  const tabs = [
    { id: "overview" as const, label: "Overview" },
    { id: "payments" as const, label: "Payments", count: payments.length },
    { id: "documents" as const, label: "Documents" },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href={`/dashboard/landlord/buildings/${buildingId}`}
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div className="flex items-center gap-3">
                <div
                  className={cn(
                    "w-10 h-10 rounded-lg flex items-center justify-center",
                    statusConfig[unit.status].bgColor
                  )}
                >
                  <Home className={cn("w-5 h-5", statusConfig[unit.status].textColor)} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold text-gray-900">Unit {unit.unit_number}</h1>
                  <div className="flex items-center gap-2">
                    <span
                      className={cn(
                        "px-2 py-0.5 text-xs font-medium rounded-full",
                        statusConfig[unit.status].bgColor,
                        statusConfig[unit.status].textColor
                      )}
                    >
                      {statusConfig[unit.status].label}
                    </span>
                    <span className="text-sm text-gray-500">
                      {unit.bedrooms} BR • {unit.bathrooms} BA • Floor {unit.floor}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/landlord/buildings/${buildingId}/units/${unitId}/edit`}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Edit2 className="w-5 h-5" />
              </Link>
              <button className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors">
                <MoreVertical className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mt-4 -mb-px">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab.id
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "ml-1.5 px-1.5 py-0.5 text-xs rounded-full",
                      activeTab === tab.id
                        ? "bg-teal-100 text-teal-700"
                        : "bg-gray-100 text-gray-600"
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

      <main className="max-w-5xl mx-auto px-4 py-6">
        {activeTab === "overview" && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Rent Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Rent</h2>
                  {unit.status === "occupied" && (
                    <button
                      onClick={() => setShowAddPaymentModal(true)}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Record Payment
                    </button>
                  )}
                </div>

                <div className="flex items-baseline gap-2 mb-4">
                  <span className="text-3xl font-bold text-gray-900">
                    KES {unit.rent_amount.toLocaleString()}
                  </span>
                  <span className="text-gray-500">/month</span>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
                  <div>
                    <p className="text-sm text-gray-500">Deposit</p>
                    <p className="text-lg font-semibold text-gray-900">
                      KES {unit.deposit_amount.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Payment Day</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {lease ? `${lease.payment_day}th of month` : "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Tenant Card */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-lg font-semibold text-gray-900">Current Tenant</h2>
                  {!tenant && (
                    <Link
                      href={`/dashboard/landlord/buildings/${buildingId}/units/${unitId}/add-tenant`}
                      className="inline-flex items-center gap-2 px-3 py-1.5 bg-teal-600 text-white text-sm font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Tenant
                    </Link>
                  )}
                </div>

                {tenant ? (
                  <>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-full bg-gray-100 flex items-center justify-center">
                        <Users className="w-6 h-6 text-gray-400" />
                      </div>
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900">
                          {tenant.first_name} {tenant.last_name}
                        </h3>
                        <div className="flex flex-col gap-1 mt-2 text-sm text-gray-600">
                          <a
                            href={`tel:${tenant.phone}`}
                            className="flex items-center gap-2 hover:text-teal-600"
                          >
                            <Phone className="w-4 h-4" />
                            {tenant.phone}
                          </a>
                          {tenant.email && (
                            <a
                              href={`mailto:${tenant.email}`}
                              className="flex items-center gap-2 hover:text-teal-600"
                            >
                              <Mail className="w-4 h-4" />
                              {tenant.email}
                            </a>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/dashboard/landlord/tenants/${tenant.id}`}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                      >
                        <ChevronRight className="w-5 h-5" />
                      </Link>
                    </div>

                    {/* Lease Info */}
                    {lease && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                          <Calendar className="w-4 h-4" />
                          <span>
                            Lease: {new Date(lease.start_date).toLocaleDateString("en-KE")} →{" "}
                            {new Date(lease.end_date).toLocaleDateString("en-KE")}
                          </span>
                        </div>
                        {daysUntilLeaseEnd !== null && daysUntilLeaseEnd <= 90 && (
                          <div
                            className={cn(
                              "flex items-center gap-2 px-3 py-2 rounded-lg text-sm",
                              daysUntilLeaseEnd <= 30
                                ? "bg-red-50 text-red-700"
                                : "bg-yellow-50 text-yellow-700"
                            )}
                          >
                            <Clock className="w-4 h-4" />
                            <span>
                              {daysUntilLeaseEnd <= 0
                                ? "Lease expired!"
                                : `Lease expires in ${daysUntilLeaseEnd} days`}
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="text-center py-8">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <Users className="w-8 h-8 text-gray-400" />
                    </div>
                    <p className="text-gray-500 mb-4">No tenant assigned</p>
                    <Link
                      href={`/dashboard/landlord/buildings/${buildingId}/units/${unitId}/add-tenant`}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      Add Tenant
                    </Link>
                  </div>
                )}
              </div>

              {/* Recent Payments */}
              {tenant && payments.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-gray-900">Recent Payments</h2>
                    <button
                      onClick={() => setActiveTab("payments")}
                      className="text-sm text-teal-600 hover:text-teal-700 font-medium"
                    >
                      View All
                    </button>
                  </div>

                  <div className="space-y-3">
                    {payments.slice(0, 3).map((payment) => (
                      <div
                        key={payment.id}
                        className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-lg bg-green-50 flex items-center justify-center">
                            <CheckCircle className="w-5 h-5 text-green-600" />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">{payment.month}</p>
                            <p className="text-sm text-gray-500">
                              {new Date(payment.payment_date).toLocaleDateString("en-KE")}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            KES {payment.amount.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 uppercase">{payment.payment_method}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Unit Details */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Unit Details</h2>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Type</span>
                    <span className="font-medium text-gray-900 capitalize">
                      {unit.unit_type.replace("br", " Bedroom")}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Floor</span>
                    <span className="font-medium text-gray-900">{unit.floor}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Bedrooms</span>
                    <span className="font-medium text-gray-900">{unit.bedrooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Bathrooms</span>
                    <span className="font-medium text-gray-900">{unit.bathrooms}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500">Size</span>
                    <span className="font-medium text-gray-900">{unit.size_sqft} sq ft</span>
                  </div>
                </div>
              </div>

              {/* Features */}
              {unit.features.length > 0 && (
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Features</h2>

                  <div className="flex flex-wrap gap-2">
                    {unit.features.map((feature) => (
                      <span
                        key={feature}
                        className="px-3 py-1.5 bg-gray-100 text-gray-700 text-sm rounded-lg"
                      >
                        {featureLabels[feature] || feature}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Actions */}
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>

                <div className="space-y-2">
                  {tenant && (
                    <>
                      <button
                        onClick={() => setShowAddPaymentModal(true)}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <ReceiptText className="w-5 h-5 text-gray-400" />
                        <span>Record Payment</span>
                      </button>
                      <Link
                        href={`/dashboard/landlord/buildings/${buildingId}/units/${unitId}/renew-lease`}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                      >
                        <FileText className="w-5 h-5 text-gray-400" />
                        <span>Renew Lease</span>
                      </Link>
                      <button className="w-full flex items-center gap-3 px-4 py-3 text-left text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Key className="w-5 h-5" />
                        <span>End Tenancy</span>
                      </button>
                    </>
                  )}
                  {!tenant && unit.status === "vacant" && (
                    <Link
                      href={`/dashboard/landlord/buildings/${buildingId}/units/${unitId}/add-tenant`}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <UserPlus className="w-5 h-5 text-gray-400" />
                      <span>Add Tenant</span>
                    </Link>
                  )}
                  <Link
                    href={`/dashboard/landlord/buildings/${buildingId}/units/${unitId}/edit`}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-5 h-5 text-gray-400" />
                    <span>Edit Unit</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === "payments" && (
          <div className="bg-white rounded-xl border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-gray-900">Payment History</h2>
                <button
                  onClick={() => setShowAddPaymentModal(true)}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Record Payment
                </button>
              </div>
            </div>

            {payments.length > 0 ? (
              <div className="divide-y divide-gray-100">
                {payments.map((payment) => (
                  <div key={payment.id} className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "w-10 h-10 rounded-lg flex items-center justify-center",
                          paymentStatusConfig[payment.status].bgColor
                        )}
                      >
                        {payment.status === "confirmed" ? (
                          <CheckCircle
                            className={cn("w-5 h-5", paymentStatusConfig[payment.status].color)}
                          />
                        ) : (
                          <Clock
                            className={cn("w-5 h-5", paymentStatusConfig[payment.status].color)}
                          />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{payment.month}</p>
                        <p className="text-sm text-gray-500">
                          Paid {new Date(payment.payment_date).toLocaleDateString("en-KE")}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-gray-900">
                        KES {payment.amount.toLocaleString()}
                      </p>
                      <p className="text-xs text-gray-500">
                        {payment.payment_method.toUpperCase()} • {payment.reference}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center">
                <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <p className="text-gray-500">No payments recorded yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "documents" && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <FileText className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Documents</h3>
            <p className="text-gray-500">Lease agreements and documents coming soon.</p>
          </div>
        )}
      </main>

      {/* Add Payment Modal - Placeholder */}
      {showAddPaymentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Record Payment</h3>
            <p className="text-gray-500 mb-6">Payment recording form coming soon...</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="px-4 py-2 text-gray-600 hover:text-gray-900"
              >
                Cancel
              </button>
              <button
                onClick={() => setShowAddPaymentModal(false)}
                className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
