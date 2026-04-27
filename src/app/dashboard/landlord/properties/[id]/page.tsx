/**
 * Building Detail Page
 * 
 * Shows building overview, units grid, and quick actions.
 * This is the main management hub for a single building.
 */

"use client";

import { useState, use } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Building2,
  Edit2,
  MoreVertical,
  MapPin,
  Plus,
  Grid3X3,
  List,
  Home,
  Users,
  Wallet,
  Settings,
  Calendar,
  Phone,
  Mail,
  CheckCircle,
  Clock,
  XCircle,
  AlertTriangle,
  ChevronDown,
  Search,
  Filter,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Type definitions
type UnitStatus = "occupied" | "vacant" | "maintenance";
type RentStatus = "paid" | "pending" | "overdue";

// Mock data - will be replaced with Supabase queries
const mockBuilding = {
  id: "1",
  name: "Sunset Apartments",
  building_type: "apartment_block",
  address: {
    formatted: "123 Ngong Road, Nairobi",
    area: "Kilimani",
  },
  floors: 6,
  total_units: 24,
  year_built: 2018,
  status: "active",
  photos: [
    { url: "/images/properties/apartment-1.jpg", is_cover: true },
    { url: "/images/properties/apartment-2.jpg", is_cover: false },
  ],
  amenities: {
    security: ["guard_24hr", "cctv", "intercom"],
    water: "borehole_backup",
    power: "backup_generator",
    parking: { type: "covered", spaces: 30 },
    common_areas: ["gym", "rooftop_terrace", "laundry_room"],
  },
  financials: {
    service_charge: { amount: 5000, frequency: "monthly" },
    management_type: "self",
    payment_collection: ["mpesa", "bank_transfer"],
  },
  created_at: "2024-01-15",
};

const mockUnits = [
  {
    id: "u1",
    unit_number: "A101",
    floor: 1,
    bedrooms: 1,
    bathrooms: 1,
    size_sqft: 450,
    rent_amount: 25000,
    status: "occupied" as UnitStatus,
    tenant: { name: "John Mwangi", phone: "0712345678" },
    lease_end: "2025-06-30",
    rent_status: "paid" as RentStatus,
  },
  {
    id: "u2",
    unit_number: "A102",
    floor: 1,
    bedrooms: 2,
    bathrooms: 1,
    size_sqft: 650,
    rent_amount: 35000,
    status: "occupied" as UnitStatus,
    tenant: { name: "Sarah Wanjiku", phone: "0723456789" },
    lease_end: "2025-03-15",
    rent_status: "overdue" as RentStatus,
  },
  {
    id: "u3",
    unit_number: "A103",
    floor: 1,
    bedrooms: 2,
    bathrooms: 2,
    size_sqft: 750,
    rent_amount: 40000,
    status: "vacant" as UnitStatus,
    tenant: null,
    lease_end: null,
    rent_status: null as RentStatus | null,
  },
  {
    id: "u4",
    unit_number: "A201",
    floor: 2,
    bedrooms: 1,
    bathrooms: 1,
    size_sqft: 450,
    rent_amount: 25000,
    status: "occupied" as UnitStatus,
    tenant: { name: "Peter Otieno", phone: "0734567890" },
    lease_end: "2025-08-31",
    rent_status: "paid" as RentStatus,
  },
  {
    id: "u5",
    unit_number: "A202",
    floor: 2,
    bedrooms: 2,
    bathrooms: 1,
    size_sqft: 650,
    rent_amount: 35000,
    status: "occupied" as UnitStatus,
    tenant: { name: "Grace Akinyi", phone: "0745678901" },
    lease_end: "2025-04-30",
    rent_status: "pending" as RentStatus,
  },
  {
    id: "u6",
    unit_number: "A203",
    floor: 2,
    bedrooms: 3,
    bathrooms: 2,
    size_sqft: 950,
    rent_amount: 55000,
    status: "maintenance" as UnitStatus,
    tenant: null,
    lease_end: null,
    rent_status: null as RentStatus | null,
  },
  {
    id: "u7",
    unit_number: "B101",
    floor: 1,
    bedrooms: 1,
    bathrooms: 1,
    size_sqft: 450,
    rent_amount: 25000,
    status: "vacant" as UnitStatus,
    tenant: null,
    lease_end: null,
    rent_status: null as RentStatus | null,
  },
  {
    id: "u8",
    unit_number: "B102",
    floor: 1,
    bedrooms: 2,
    bathrooms: 2,
    size_sqft: 750,
    rent_amount: 42000,
    status: "occupied" as UnitStatus,
    tenant: { name: "Mary Njeri", phone: "0756789012" },
    lease_end: "2025-09-30",
    rent_status: "paid" as RentStatus,
  },
];

const statusConfig: Record<UnitStatus, { label: string; color: string; bgColor: string; textColor: string; icon: React.ReactNode }> = {
  occupied: {
    label: "Occupied",
    color: "bg-green-500",
    bgColor: "bg-green-50",
    textColor: "text-green-700",
    icon: <CheckCircle className="w-4 h-4" />,
  },
  vacant: {
    label: "Vacant",
    color: "bg-blue-500",
    bgColor: "bg-blue-50",
    textColor: "text-blue-700",
    icon: <Home className="w-4 h-4" />,
  },
  maintenance: {
    label: "Maintenance",
    color: "bg-yellow-500",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-700",
    icon: <AlertTriangle className="w-4 h-4" />,
  },
};

const rentStatusConfig: Record<RentStatus, { label: string; color: string; bgColor: string }> = {
  paid: { label: "Paid", color: "text-green-600", bgColor: "bg-green-50" },
  pending: { label: "Pending", color: "text-yellow-600", bgColor: "bg-yellow-50" },
  overdue: { label: "Overdue", color: "text-red-600", bgColor: "bg-red-50" },
};

type TabType = "units" | "tenants" | "finances" | "maintenance";

export default function BuildingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const [activeTab, setActiveTab] = useState<TabType>("units");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [filterStatus, setFilterStatus] = useState<"all" | "occupied" | "vacant" | "maintenance">("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Filter units
  const filteredUnits = mockUnits.filter((unit) => {
    if (filterStatus !== "all" && unit.status !== filterStatus) return false;
    if (searchQuery && !unit.unit_number.toLowerCase().includes(searchQuery.toLowerCase())) {
      return false;
    }
    return true;
  });

  // Calculate stats
  const stats = {
    total: mockUnits.length,
    occupied: mockUnits.filter((u) => u.status === "occupied").length,
    vacant: mockUnits.filter((u) => u.status === "vacant").length,
    maintenance: mockUnits.filter((u) => u.status === "maintenance").length,
    monthlyRevenue: mockUnits
      .filter((u) => u.status === "occupied")
      .reduce((sum, u) => sum + u.rent_amount, 0),
    occupancyRate: Math.round(
      (mockUnits.filter((u) => u.status === "occupied").length / mockUnits.length) * 100
    ),
  };

  const tabs = [
    { id: "units" as const, label: "Units", icon: Grid3X3, count: stats.total },
    { id: "tenants" as const, label: "Tenants", icon: Users, count: stats.occupied },
    { id: "finances" as const, label: "Finances", icon: Wallet },
    { id: "maintenance" as const, label: "Maintenance", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/landlord/buildings"
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{mockBuilding.name}</h1>
                <p className="text-sm text-gray-500 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" />
                  {mockBuilding.address.area}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link
                href={`/dashboard/landlord/buildings/${id}/edit`}
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
          <div className="flex items-center gap-1 -mb-px overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap",
                  activeTab === tab.id
                    ? "border-teal-500 text-teal-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                )}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span
                    className={cn(
                      "px-1.5 py-0.5 text-xs rounded-full",
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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {activeTab === "units" && (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Occupancy Rate</p>
                <p className="text-2xl font-bold text-gray-900">{stats.occupancyRate}%</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Occupied</p>
                <p className="text-2xl font-bold text-green-600">{stats.occupied}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Vacant</p>
                <p className="text-2xl font-bold text-blue-600">{stats.vacant}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Maintenance</p>
                <p className="text-2xl font-bold text-yellow-600">{stats.maintenance}</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <p className="text-sm text-gray-500 mb-1">Monthly Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  KES {(stats.monthlyRevenue / 1000).toFixed(0)}k
                </p>
              </div>
            </div>

            {/* Filters & Actions */}
            <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search units..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-2">
                  {["all", "occupied", "vacant", "maintenance"].map((status) => (
                    <button
                      key={status}
                      onClick={() => setFilterStatus(status as typeof filterStatus)}
                      className={cn(
                        "px-3 py-2 text-sm rounded-lg transition-colors capitalize",
                        filterStatus === status
                          ? "bg-teal-50 text-teal-700 font-medium"
                          : "text-gray-600 hover:bg-gray-100"
                      )}
                    >
                      {status}
                    </button>
                  ))}
                </div>

                {/* View Toggle */}
                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      viewMode === "grid" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewMode("list")}
                    className={cn(
                      "p-2 rounded-md transition-colors",
                      viewMode === "list" ? "bg-white shadow-sm" : "text-gray-500 hover:text-gray-700"
                    )}
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>

                {/* Add Unit */}
                <Link
                  href={`/dashboard/landlord/buildings/${id}/units/new`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Unit</span>
                </Link>
              </div>
            </div>

            {/* Units Grid/List */}
            {viewMode === "grid" ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {filteredUnits.map((unit) => (
                  <Link
                    key={unit.id}
                    href={`/dashboard/landlord/buildings/${id}/units/${unit.id}`}
                    className="group bg-white rounded-xl border border-gray-200 p-4 hover:shadow-md hover:border-gray-300 transition-all"
                  >
                    {/* Header */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            statusConfig[unit.status].bgColor
                          )}
                        >
                          <Home className={cn("w-5 h-5", statusConfig[unit.status].textColor)} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                            {unit.unit_number}
                          </h3>
                          <p className="text-xs text-gray-500">Floor {unit.floor}</p>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "px-2 py-1 text-xs font-medium rounded-full",
                          statusConfig[unit.status].bgColor,
                          statusConfig[unit.status].textColor
                        )}
                      >
                        {statusConfig[unit.status].label}
                      </span>
                    </div>

                    {/* Details */}
                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-3">
                      <span>{unit.bedrooms} BR</span>
                      <span>•</span>
                      <span>{unit.bathrooms} BA</span>
                      <span>•</span>
                      <span>{unit.size_sqft} sqft</span>
                    </div>

                    {/* Rent */}
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="text-lg font-bold text-gray-900">
                          KES {unit.rent_amount.toLocaleString()}
                        </span>
                        <span className="text-sm text-gray-500">/mo</span>
                      </div>
                      {unit.rent_status && (
                        <span
                          className={cn(
                            "px-2 py-1 text-xs font-medium rounded-full",
                            rentStatusConfig[unit.rent_status].bgColor,
                            rentStatusConfig[unit.rent_status].color
                          )}
                        >
                          {rentStatusConfig[unit.rent_status].label}
                        </span>
                      )}
                    </div>

                    {/* Tenant (if occupied) */}
                    {unit.tenant && (
                      <div className="mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                            <Users className="w-4 h-4 text-gray-500" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{unit.tenant.name}</p>
                            <p className="text-xs text-gray-500">
                              Until {new Date(unit.lease_end!).toLocaleDateString("en-KE", {
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </Link>
                ))}
              </div>
            ) : (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Unit
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Type
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Tenant
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Rent
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                        Payment
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200">
                    {filteredUnits.map((unit) => (
                      <tr
                        key={unit.id}
                        className="hover:bg-gray-50 cursor-pointer"
                        onClick={() =>
                          (window.location.href = `/dashboard/landlord/buildings/${id}/units/${unit.id}`)
                        }
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div
                              className={cn(
                                "w-8 h-8 rounded-lg flex items-center justify-center",
                                statusConfig[unit.status].bgColor
                              )}
                            >
                              <Home className={cn("w-4 h-4", statusConfig[unit.status].textColor)} />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{unit.unit_number}</p>
                              <p className="text-xs text-gray-500">Floor {unit.floor}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">
                          {unit.bedrooms} BR / {unit.bathrooms} BA
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              "inline-flex items-center gap-1.5 px-2 py-1 text-xs font-medium rounded-full",
                              statusConfig[unit.status].bgColor,
                              statusConfig[unit.status].textColor
                            )}
                          >
                            {statusConfig[unit.status].icon}
                            {statusConfig[unit.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm">
                          {unit.tenant ? (
                            <div>
                              <p className="font-medium text-gray-900">{unit.tenant.name}</p>
                              <p className="text-xs text-gray-500">{unit.tenant.phone}</p>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">
                          KES {unit.rent_amount.toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          {unit.rent_status ? (
                            <span
                              className={cn(
                                "px-2 py-1 text-xs font-medium rounded-full",
                                rentStatusConfig[unit.rent_status].bgColor,
                                rentStatusConfig[unit.rent_status].color
                              )}
                            >
                              {rentStatusConfig[unit.rent_status].label}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {filteredUnits.length === 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                  <Home className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No units found</h3>
                <p className="text-gray-500 mb-6">
                  {searchQuery || filterStatus !== "all"
                    ? "Try adjusting your search or filters"
                    : "Start by adding units to this building"}
                </p>
                <Link
                  href={`/dashboard/landlord/buildings/${id}/units/new`}
                  className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add First Unit
                </Link>
              </div>
            )}
          </>
        )}

        {activeTab === "tenants" && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Users className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Tenant Management</h3>
            <p className="text-gray-500">
              View and manage tenants from the Units tab, or use the Tenants page for a full list.
            </p>
          </div>
        )}

        {activeTab === "finances" && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Wallet className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Finances</h3>
            <p className="text-gray-500">Financial overview and payment tracking coming soon.</p>
          </div>
        )}

        {activeTab === "maintenance" && (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <Settings className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Maintenance</h3>
            <p className="text-gray-500">Maintenance request tracking coming soon.</p>
          </div>
        )}
      </main>
    </div>
  );
}
