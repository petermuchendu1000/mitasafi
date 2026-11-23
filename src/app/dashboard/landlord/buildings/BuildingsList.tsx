/**
 * Buildings list — the interactive half.
 *
 * The search box, status filter and sort control need client state, so they stay
 * here; the data comes from the server component in page.tsx. Everything this
 * renders was previously driven by a hardcoded `mockBuildings` array in that file.
 *
 * Two things changed beyond swapping the data source, and both were defects:
 *
 *   The building-type labels were keyed on values the database cannot hold —
 *   "apartment_block", "gated_compound", "commercial_building". The column's CHECK
 *   constraint allows apartment, flat_block, townhouse_complex, gated_community,
 *   student_hostel, mixed_use, other. Every real row would have rendered an empty
 *   type, and `buildingTypeLabels[...]` returning undefined is also why the label
 *   line could not be trusted. The map now matches the constraint.
 *
 *   The status filter offered "Drafts", and buildings.status is
 *   CHECK (status IN ('active','inactive','archived')) — there is no draft. That
 *   filter could never match a row. It is now Active / Inactive, which is what the
 *   column can actually be, and the "Continue setup" card that keyed off it is gone
 *   with it.
 */

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Building2,
  Plus,
  Search,
  MoreVertical,
  MapPin,
  Home,
  Users,
  ChevronDown,
  Building,
} from "lucide-react";
import { cn } from "@/lib/utils";
// Shared with the detail page so the two cannot disagree about what a
// building_type value is called. See src/lib/landlord/labels.ts.
import { buildingTypeLabels } from "@/lib/landlord/labels";

export interface BuildingSummary {
  id: string;
  name: string;
  building_type: string;
  address: string;
  area: string;
  status: string;
  photos: string[];
  /** Units actually recorded against this building, not the stored counter. */
  total_units: number;
  occupied_units: number;
  vacant_units: number;
  /** Sum of monthly_rent over occupied units. */
  monthly_revenue: number;
  occupancy_rate: number;
  created_at: string;
}

/** Keys are exactly the values buildings_status_check permits. */
const statusConfig: Record<string, { label: string; dot: string }> = {
  active: { label: "Active", dot: "bg-teal-500" },
  inactive: { label: "Inactive", dot: "bg-gray-400" },
  archived: { label: "Archived", dot: "bg-gray-300" },
};

type SortKey = "name" | "created" | "units" | "occupancy";
type StatusFilter = "all" | "active" | "inactive";

export function BuildingsList({ buildings }: { buildings: BuildingSummary[] }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [filterStatus, setFilterStatus] = useState<StatusFilter>("all");

  const filteredBuildings = buildings
    .filter((b) => {
      if (filterStatus !== "all" && b.status !== filterStatus) return false;
      if (
        searchQuery &&
        !b.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !b.area.toLowerCase().includes(searchQuery.toLowerCase())
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
          return (
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
          );
        case "units":
          return b.total_units - a.total_units;
        case "occupancy":
          return b.occupancy_rate - a.occupancy_rate;
        default:
          return 0;
      }
    });

  // Portfolio totals are over EVERY building, not the filtered view: they describe
  // the portfolio, and changing with the search box would be misleading.
  const totalBuildings = buildings.length;
  const totalUnits = buildings.reduce((sum, b) => sum + b.total_units, 0);
  const totalOccupied = buildings.reduce((sum, b) => sum + b.occupied_units, 0);
  const totalRevenue = buildings.reduce((sum, b) => sum + b.monthly_revenue, 0);

  return (
    <div className="min-h-screen bg-gray-50">
      {/* top-16, not top-0 — the shell header is `sticky top-0 z-30 h-16`.
          This one is z-10, so it lost the stack and scrolled up BEHIND the
          shell header instead of over it: 64px of overlap either way. */}
      <header className="bg-white border-b border-gray-200 sticky top-16 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4 flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                My Buildings
              </h1>
              <p className="text-sm text-gray-500">
                Manage your multi-unit properties
              </p>
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

      {/* A <div>, not a <main>: the shell already provides the page's <main>
          landmark. This one was missed in the earlier sweep that fixed the
          building detail, add-building and tenants pages. className unchanged. */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {/* Portfolio totals */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {[
            {
              icon: <Building2 className="w-5 h-5 text-gray-500" />,
              value: String(totalBuildings),
              label: "Buildings",
            },
            {
              icon: <Home className="w-5 h-5 text-gray-500" />,
              value: String(totalUnits),
              label: "Total Units",
            },
            {
              icon: <Users className="w-5 h-5 text-gray-500" />,
              value: String(totalOccupied),
              label: "Occupied",
            },
            {
              icon: (
                <span className="text-gray-500 font-semibold text-sm">KES</span>
              ),
              value: totalRevenue.toLocaleString("en-KE"),
              label: "Monthly Revenue",
            },
          ].map((card) => (
            <div
              key={card.label}
              className="bg-white rounded-xl border border-gray-200 p-4"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-gray-100 flex items-center justify-center flex-shrink-0">
                  {card.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-2xl font-bold text-gray-900 truncate">
                    {card.value}
                  </p>
                  <p className="text-sm text-gray-500">{card.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search by name or area..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
              />
            </div>

            <div className="flex items-center gap-2">
              {(
                [
                  ["all", "All"],
                  ["active", "Active"],
                  ["inactive", "Inactive"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setFilterStatus(value)}
                  className={cn(
                    "px-3 py-2 text-sm rounded-lg transition-colors",
                    filterStatus === value
                      ? "bg-teal-50 text-teal-700 font-medium"
                      : "text-gray-600 hover:bg-gray-100",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="relative">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortKey)}
                aria-label="Sort buildings"
                className="appearance-none pl-4 pr-10 py-2.5 border border-gray-200 rounded-lg bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
              >
                <option value="name">Sort by Name</option>
                <option value="created">Sort by Date Added</option>
                <option value="units">Sort by Units</option>
                <option value="occupancy">Sort by Occupancy</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {filteredBuildings.length > 0 ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredBuildings.map((building) => {
              const status = statusConfig[building.status] ?? {
                label: building.status,
                dot: "bg-gray-400",
              };
              return (
                <Link
                  key={building.id}
                  href={`/dashboard/landlord/buildings/${building.id}`}
                  className="group bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-md hover:border-gray-300 transition-all"
                >
                  <div className="aspect-[16/10] bg-gray-100 relative">
                    {building.photos.length > 0 ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={building.photos[0]}
                        alt={building.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
                        <Building2 className="w-12 h-12 text-gray-300" />
                      </div>
                    )}

                    <div className="absolute top-3 left-3">
                      <span className="inline-flex items-center gap-1.5 px-2 py-1 bg-white/95 backdrop-blur-sm rounded-full text-xs font-medium text-gray-700 shadow-sm">
                        <span
                          className={cn("w-1.5 h-1.5 rounded-full", status.dot)}
                        />
                        {status.label}
                      </span>
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-3">
                      <h3 className="font-semibold text-gray-900 group-hover:text-teal-600 transition-colors">
                        {building.name}
                      </h3>
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5" />
                        {building.area}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-gray-600 mb-4">
                      <span className="flex items-center gap-1">
                        <Building className="w-3.5 h-3.5" />
                        {buildingTypeLabels[building.building_type] ??
                          building.building_type}
                      </span>
                    </div>

                    {building.total_units > 0 ? (
                      <>
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
                                      : "bg-red-500",
                              )}
                              style={{ width: `${building.occupancy_rate}%` }}
                            />
                          </div>
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <div>
                            <span className="font-semibold text-gray-900">
                              {building.occupied_units}
                            </span>
                            <span className="text-gray-500">
                              /{building.total_units} occupied
                            </span>
                          </div>
                          <div className="text-right">
                            <span className="font-semibold text-gray-900">
                              KES {(building.monthly_revenue / 1000).toFixed(0)}
                              k
                            </span>
                            <span className="text-gray-500">/mo</span>
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-2">
                        <Home className="w-4 h-4" />
                        <span>No units yet</span>
                      </div>
                    )}
                  </div>
                </Link>
              );
            })}
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No buildings found
            </h3>
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
      </div>
    </div>
  );
}
