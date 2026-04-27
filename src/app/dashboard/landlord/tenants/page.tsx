/**
 * Tenants List Page
 * 
 * Shows all tenants across all buildings.
 * Allows searching, filtering, and quick access to tenant details.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Users,
  Search,
  Filter,
  Phone,
  Mail,
  Home,
  Calendar,
  DollarSign,
  MoreVertical,
  ChevronDown,
  CheckCircle,
  Clock,
  AlertCircle,
  Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Type definitions
type RentStatus = "paid" | "pending" | "overdue";

// Mock data
const mockTenants = [
  {
    id: "t1",
    first_name: "John",
    last_name: "Mwangi",
    phone: "0712345678",
    email: "john.mwangi@email.com",
    unit: { id: "u1", number: "A101", building_id: "1", building_name: "Sunset Apartments" },
    lease: { end_date: "2025-06-30", status: "active" },
    rent_status: "paid" as RentStatus,
    rent_amount: 25000,
    move_in_date: "2024-01-01",
  },
  {
    id: "t2",
    first_name: "Sarah",
    last_name: "Wanjiku",
    phone: "0723456789",
    email: "sarah.w@email.com",
    unit: { id: "u2", number: "A102", building_id: "1", building_name: "Sunset Apartments" },
    lease: { end_date: "2025-03-15", status: "active" },
    rent_status: "overdue" as RentStatus,
    rent_amount: 35000,
    move_in_date: "2024-01-01",
  },
  {
    id: "t3",
    first_name: "Peter",
    last_name: "Otieno",
    phone: "0734567890",
    email: null,
    unit: { id: "u4", number: "A201", building_id: "1", building_name: "Sunset Apartments" },
    lease: { end_date: "2025-08-31", status: "active" },
    rent_status: "paid" as RentStatus,
    rent_amount: 25000,
    move_in_date: "2024-02-15",
  },
  {
    id: "t4",
    first_name: "Grace",
    last_name: "Akinyi",
    phone: "0745678901",
    email: "grace.akinyi@email.com",
    unit: { id: "u5", number: "A202", building_id: "1", building_name: "Sunset Apartments" },
    lease: { end_date: "2025-04-30", status: "active" },
    rent_status: "pending" as RentStatus,
    rent_amount: 35000,
    move_in_date: "2024-03-01",
  },
  {
    id: "t5",
    first_name: "Mary",
    last_name: "Njeri",
    phone: "0756789012",
    email: "mary.njeri@email.com",
    unit: { id: "u8", number: "B102", building_id: "1", building_name: "Sunset Apartments" },
    lease: { end_date: "2025-09-30", status: "active" },
    rent_status: "paid" as RentStatus,
    rent_amount: 42000,
    move_in_date: "2024-04-01",
  },
  {
    id: "t6",
    first_name: "David",
    last_name: "Kimani",
    phone: "0767890123",
    email: null,
    unit: { id: "u10", number: "G1", building_id: "2", building_name: "Green Gardens" },
    lease: { end_date: "2025-12-31", status: "active" },
    rent_status: "paid" as RentStatus,
    rent_amount: 60000,
    move_in_date: "2024-01-01",
  },
];

const rentStatusConfig: Record<RentStatus, { label: string; dot: string }> = {
  paid: {
    label: "Paid",
    dot: "bg-teal-500",
  },
  pending: {
    label: "Pending",
    dot: "bg-amber-500",
  },
  overdue: {
    label: "Overdue",
    dot: "bg-red-500",
  },
};

type RentStatusFilter = "all" | "paid" | "pending" | "overdue";

export default function TenantsListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterRentStatus, setFilterRentStatus] = useState<RentStatusFilter>("all");
  const [sortBy, setSortBy] = useState<"name" | "rent" | "move_in">("name");

  // Filter and sort tenants
  const filteredTenants = mockTenants
    .filter((tenant) => {
      if (filterRentStatus !== "all" && tenant.rent_status !== filterRentStatus) {
        return false;
      }
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          tenant.first_name.toLowerCase().includes(query) ||
          tenant.last_name.toLowerCase().includes(query) ||
          tenant.phone.includes(query) ||
          tenant.unit.number.toLowerCase().includes(query) ||
          tenant.unit.building_name.toLowerCase().includes(query)
        );
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return `${a.first_name} ${a.last_name}`.localeCompare(`${b.first_name} ${b.last_name}`);
        case "rent":
          return b.rent_amount - a.rent_amount;
        case "move_in":
          return new Date(b.move_in_date).getTime() - new Date(a.move_in_date).getTime();
        default:
          return 0;
      }
    });

  // Stats
  const totalTenants = mockTenants.length;
  const paidCount = mockTenants.filter((t) => t.rent_status === "paid").length;
  const pendingCount = mockTenants.filter((t) => t.rent_status === "pending").length;
  const overdueCount = mockTenants.filter((t) => t.rent_status === "overdue").length;
  const totalRent = mockTenants.reduce((sum, t) => sum + t.rent_amount, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/landlord"
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">All Tenants</h1>
                <p className="text-sm text-gray-500">
                  {totalTenants} tenants across all properties
                </p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalTenants}</p>
                <p className="text-sm text-gray-500">Total</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{paidCount}</p>
                <p className="text-sm text-gray-500">Paid</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Clock className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{pendingCount}</p>
                <p className="text-sm text-gray-500">Pending</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <AlertCircle className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{overdueCount}</p>
                <p className="text-sm text-gray-500">Overdue</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <span className="text-gray-500 font-semibold text-sm">KES</span>
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">
                  {(totalRent / 1000).toFixed(0)}k
                </p>
                <p className="text-sm text-gray-500">Monthly</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name, phone, or unit..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
              />
            </div>

            {/* Rent Status Filter */}
            <div className="flex items-center gap-2">
              {(["all", "paid", "pending", "overdue"] as RentStatusFilter[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterRentStatus(status)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg transition-colors capitalize",
                    filterRentStatus === status
                      ? "bg-teal-50 text-teal-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100"
                  )}
                >
                  {status}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="name">Sort by Name</option>
                <option value="rent">Sort by Rent</option>
                <option value="move_in">Sort by Move-in</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Tenants List */}
        {filteredTenants.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Tenant
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Unit
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Rent
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Lease Ends
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredTenants.map((tenant) => {
                    const statusConfig = rentStatusConfig[tenant.rent_status];
                    const leaseEndDate = new Date(tenant.lease.end_date);
                    const daysUntilEnd = Math.ceil(
                      (leaseEndDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );

                    return (
                      <tr key={tenant.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-gray-600">
                                {tenant.first_name[0]}
                                {tenant.last_name[0]}
                              </span>
                            </div>
                            <div>
                              <Link
                                href={`/dashboard/landlord/tenants/${tenant.id}`}
                                className="font-medium text-gray-900 hover:text-teal-600"
                              >
                                {tenant.first_name} {tenant.last_name}
                              </Link>
                              <div className="flex items-center gap-2 text-sm text-gray-500">
                                <Phone className="w-3.5 h-3.5" />
                                {tenant.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <Link
                            href={`/dashboard/landlord/buildings/${tenant.unit.building_id}/units/${tenant.unit.id}`}
                            className="hover:text-teal-600"
                          >
                            <div className="flex items-center gap-2">
                              <Home className="w-4 h-4 text-gray-400" />
                              <span className="font-medium text-gray-900">
                                {tenant.unit.number}
                              </span>
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-500 mt-0.5">
                              <Building2 className="w-3 h-3" />
                              {tenant.unit.building_name}
                            </div>
                          </Link>
                        </td>
                        <td className="px-4 py-4">
                          <span className="font-semibold text-gray-900">
                            KES {tenant.rent_amount.toLocaleString()}
                          </span>
                          <span className="text-gray-500 text-sm">/mo</span>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700"
                          >
                            <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig.dot)} />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <div
                            className={cn(
                              "text-sm",
                              daysUntilEnd <= 30
                                ? "text-red-600 font-medium"
                                : daysUntilEnd <= 90
                                ? "text-yellow-600"
                                : "text-gray-600"
                            )}
                          >
                            {leaseEndDate.toLocaleDateString("en-KE", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </div>
                          {daysUntilEnd <= 90 && daysUntilEnd > 0 && (
                            <div className="text-xs text-gray-500">
                              {daysUntilEnd} days left
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <a
                              href={`tel:${tenant.phone}`}
                              className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                            >
                              <Phone className="w-4 h-4" />
                            </a>
                            {tenant.email && (
                              <a
                                href={`mailto:${tenant.email}`}
                                className="p-2 text-gray-400 hover:text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                              >
                                <Mail className="w-4 h-4" />
                              </a>
                            )}
                            <button className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Users className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No tenants found</h3>
            <p className="text-gray-500">
              {searchQuery || filterRentStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Add tenants to your units to see them here"}
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
