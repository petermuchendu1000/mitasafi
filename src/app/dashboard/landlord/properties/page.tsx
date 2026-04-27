/**
 * Buildings List Page
 * 
 * Shows all buildings owned by the landlord.
 * Allows filtering, sorting, and navigating to individual buildings.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  Filter,
  MoreVertical,
  MapPin,
  Home,
  Users,
  ChevronDown,
  ArrowLeft,
  Building,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// Mock data - will be replaced with Supabase queries
const mockBuildings = [
  {
    id: "1",
    name: "Sunset Apartments",
    building_type: "apartment_block",
    address: {
      formatted: "123 Ngong Road, Nairobi",
      area: "Kilimani",
    },
    total_units: 24,
    occupied_units: 20,
    vacant_units: 4,
    status: "active",
    photos: [{ url: "/images/properties/apartment-1.jpg" }],
    monthly_revenue: 480000,
    occupancy_rate: 83,
    created_at: "2024-01-15",
  },
  {
    id: "2",
    name: "Green Gardens",
    building_type: "gated_compound",
    address: {
      formatted: "45 Riverside Drive, Nairobi",
      area: "Westlands",
    },
    total_units: 12,
    occupied_units: 12,
    vacant_units: 0,
    status: "active",
    photos: [{ url: "/images/properties/compound-1.jpg" }],
    monthly_revenue: 720000,
    occupancy_rate: 100,
    created_at: "2023-11-20",
  },
  {
    id: "3",
    name: "Kileleshwa Heights",
    building_type: "apartment_block",
    address: {
      formatted: "78 Othaya Road, Nairobi",
      area: "Kileleshwa",
    },
    total_units: 36,
    occupied_units: 28,
    vacant_units: 8,
    status: "active",
    photos: [],
    monthly_revenue: 840000,
    occupancy_rate: 78,
    created_at: "2024-03-01",
  },
  {
    id: "4",
    name: "New Project - Lavington",
    building_type: "apartment_block",
    address: {
      formatted: "Lavington, Nairobi",
      area: "Lavington",
    },
    total_units: 0,
    occupied_units: 0,
    vacant_units: 0,
    status: "draft",
    photos: [],
    monthly_revenue: 0,
    occupancy_rate: 0,
    created_at: "2024-06-10",
  },
];

const buildingTypeLabels: Record<string, string> = {
  apartment_block: "Apartment Block",
  gated_compound: "Gated Compound",
  townhouse_complex: "Townhouse Complex",
  commercial_building: "Commercial",
  mixed_use: "Mixed Use",
};

const statusConfig: Record<string, { label: string; dot: string }> = {
  active: {
    label: "Active",
    dot: "bg-teal-500",
  },
  draft: {
    label: "Draft",
    dot: "bg-amber-500",
  },
  inactive: {
    label: "Inactive",
    dot: "bg-gray-400",
  },
};

export default function BuildingsListPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "created" | "units" | "occupancy">("name");
  const [filterStatus, setFilterStatus] = useState<"all" | "active" | "draft">("all");

  // Filter and sort buildings
  const filteredBuildings = mockBuildings
    .filter((b) => {
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (
        searchQuery &&
        !b.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !b.address.area.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "created":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "units":
          return b.total_units - a.total_units;
        case "occupancy":
          return b.occupancy_rate - a.occupancy_rate;
        default:
          return 0;
      }
    });

  // Calculate stats
  const totalBuildings = mockBuildings.length;
  const totalUnits = mockBuildings.reduce((sum, b) => sum + b.total_units, 0);
  const totalOccupied = mockBuildings.reduce((sum, b) => sum + b.occupied_units, 0);
  const totalRevenue = mockBuildings.reduce((sum, b) => sum + b.monthly_revenue, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Link
                href="/dashboard/landlord/properties"
                className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <div>
                <h1 className="text-xl font-semibold text-gray-900">My Buildings</h1>
                <p className="text-sm text-gray-500">
                  Manage your multi-unit properties
                </p>
              </div>
            </div>

            <Link
              href="/dashboard/landlord/buildings/new"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Building</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalBuildings}</p>
                <p className="text-sm text-gray-500">Buildings</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Home className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalUnits}</p>
                <p className="text-sm text-gray-500">Total Units</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center">
                <Users className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-900">{totalOccupied}</p>
                <p className="text-sm text-gray-500">Occupied</p>
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
                  {(totalRevenue / 1000000).toFixed(1)}M
                </p>
                <p className="text-sm text-gray-500">Monthly Revenue</p>
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
                placeholder="Search by name or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
              />
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setFilterStatus("all")}
                className={cn(
                  "px-3 py-2 text-sm rounded-lg transition-colors",
                  filterStatus === "all"
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                All
              </button>
              <button
                onClick={() => setFilterStatus("active")}
                className={cn(
                  "px-3 py-2 text-sm rounded-lg transition-colors",
                  filterStatus === "active"
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                Active
              </button>
              <button
                onClick={() => setFilterStatus("draft")}
                className={cn(
                  "px-3 py-2 text-sm rounded-lg transition-colors",
                  filterStatus === "draft"
                    ? "bg-teal-50 text-teal-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100"
                )}
              >
                Drafts
              </button>
            </div>

            {/* Sort */}
            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="name">Sort by Name</option>
                <option value="created">Sort by Date Added</option>
                <option value="units">Sort by Units</option>
                <option value="occupancy">Sort by Occupancy</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* Buildings List */}
        {filteredBuildings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBuildings.map((building) => (
              <Link
                key={building.id}
                href={`/dashboard/landlord/buildings/${building.id}`}
                className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all"
              >
                {/* Image */}
                <div className="aspect-[16/10] bg-gray-100 relative">
                  {building.photos.length > 0 ? (
                    <img
                      src={building.photos[0].url}
                      alt={building.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                      <Building2 className="w-12 h-12 text-gray-300" />
                    </div>
                  )}
                  
                  {/* Status Badge */}
                  <div className="absolute top-3 left-3">
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                      <span className={cn("w-1.5 h-1.5 rounded-full", statusConfig[building.status].dot)} />
                      {statusConfig[building.status].label}
                    </span>
                  </div>

                  {/* Menu Button */}
                  <button
                    onClick={(e) => {
                      e.preventDefault();
                      // TODO: Show dropdown menu
                    }}
                    className="absolute top-3 right-3 p-1.5 bg-white/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white"
                  >
                    <MoreVertical className="w-4 h-4 text-gray-600" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4">
                  <div className="mb-3">
                    <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                      {building.name}
                    </h3>
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {building.address.area}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                    <span className="flex items-center gap-1">
                      <Building className="w-3.5 h-3.5" />
                      {buildingTypeLabels[building.building_type]}
                    </span>
                  </div>

                  {building.status === "active" && building.total_units > 0 && (
                    <>
                      {/* Occupancy Bar */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between text-xs mb-1.5">
                          <span className="text-gray-500">Occupancy</span>
                          <span className="font-medium text-gray-900">
                            {building.occupancy_rate}%
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              building.occupancy_rate >= 90
                                ? "bg-green-500"
                                : building.occupancy_rate >= 70
                                ? "bg-teal-500"
                                : building.occupancy_rate >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                            )}
                            style={{ width: `${building.occupancy_rate}%` }}
                          />
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="font-semibold text-gray-900">
                            {building.occupied_units}
                          </span>
                          <span className="text-gray-500">/{building.total_units} occupied</span>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold text-gray-900">
                            KES {(building.monthly_revenue / 1000).toFixed(0)}k
                          </span>
                          <span className="text-gray-500">/mo</span>
                        </div>
                      </div>
                    </>
                  )}

                  {building.status === "draft" && (
                    <div className="flex items-center gap-2 text-sm text-yellow-700 bg-yellow-50 rounded-lg px-3 py-2">
                      <Clock className="w-4 h-4" />
                      <span>Continue setup</span>
                    </div>
                  )}
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No buildings found</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              {searchQuery || filterStatus !== "all"
                ? "Try adjusting your search or filters"
                : "Start by adding your first multi-unit property"}
            </p>
            {!searchQuery && filterStatus === "all" && (
              <Link
                href="/dashboard/landlord/buildings/new"
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add Your First Building
              </Link>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
