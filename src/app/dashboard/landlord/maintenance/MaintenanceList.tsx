"use client";

/**
 * The portfolio maintenance list — filtering and search.
 *
 * The cards are the same component the building detail page uses, with the
 * building name turned on, because here a unit number alone does not say where
 * the job is.
 */

import { useMemo, useState } from "react";
import Link from "next/link";
import { Wrench, Search, Plus, Building2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterPills } from "@/components/dashboard/landlord/FilterPills";
import {
  MaintenanceRequestCard,
  type MaintenanceCardItem,
} from "@/components/dashboard/landlord/MaintenanceRequestCard";
import { formatKesCompact } from "@/lib/landlord/labels";

type StatusFilter = "open" | "urgent" | "closed" | "all";

const FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "open", label: "Open" },
  { id: "urgent", label: "Urgent" },
  { id: "closed", label: "Closed" },
  { id: "all", label: "All" },
];

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

export function MaintenanceList({
  items,
  buildings,
}: {
  items: MaintenanceCardItem[];
  buildings: { id: string; name: string }[];
}) {
  const [filter, setFilter] = useState<StatusFilter>("open");
  const [buildingId, setBuildingId] = useState<string>("all");
  const [query, setQuery] = useState("");

  const open = useMemo(() => items.filter((m) => m.isOpen), [items]);
  const urgent = useMemo(
    () => open.filter((m) => m.urgency === "emergency" || m.urgency === "high"),
    [open],
  );
  const closed = useMemo(() => items.filter((m) => !m.isOpen), [items]);

  const visible = useMemo(() => {
    const base =
      filter === "open"
        ? open
        : filter === "urgent"
          ? urgent
          : filter === "closed"
            ? closed
            : items;
    const q = query.trim().toLowerCase();
    return base.filter((m) => {
      if (buildingId !== "all" && m.buildingId !== buildingId) return false;
      if (!q) return true;
      return (
        m.title.toLowerCase().includes(q) ||
        m.description.toLowerCase().includes(q) ||
        m.unitNumber.toLowerCase().includes(q) ||
        (m.assignedTo?.toLowerCase().includes(q) ?? false)
      );
    });
  }, [filter, buildingId, query, items, open, urgent, closed]);

  const committed = open.reduce((s, m) => s + (m.estimatedCost ?? 0), 0);
  const spent = closed.reduce((s, m) => s + (m.actualCost ?? 0), 0);

  const counts: Record<StatusFilter, number> = {
    open: open.length,
    urgent: urgent.length,
    closed: closed.length,
    all: items.length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Maintenance</h1>
          <p className="text-gray-500 mt-1">
            Every request across your buildings.
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

      {items.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <Wrench className="w-8 h-8 text-gray-400" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">
            No maintenance requests
          </h2>
          <p className="text-gray-500 max-w-md mx-auto mb-6">
            Nothing has been reported on any of your units. Requests raised by
            tenants, and jobs you log yourself, appear here with their cost and
            who is handling them.
          </p>
          <Link
            href="/dashboard/landlord/buildings"
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Go to your buildings
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard
              label="Open"
              value={String(open.length)}
              tone={open.length > 0 ? "text-red-600" : "text-gray-900"}
            />
            <StatCard
              label="Urgent"
              value={String(urgent.length)}
              tone="text-orange-600"
              hint="high or emergency"
            />
            <StatCard
              label="Committed cost"
              value={formatKesCompact(committed)}
              hint="estimates on open jobs"
            />
            <StatCard
              label="Spent, closed jobs"
              value={formatKesCompact(spent)}
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
                  placeholder="Job, unit or contractor"
                  aria-label="Search maintenance requests"
                  className="w-full pl-10 pr-4 min-h-[44px] border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm"
                />
              </div>

              <FilterPills
                label="Filter repairs"
                value={filter}
                onChange={setFilter}
                options={FILTERS.map((f) => ({ ...f, count: counts[f.id] }))}
              />

              {buildings.length > 1 && (
                <select
                  value={buildingId}
                  onChange={(e) => setBuildingId(e.target.value)}
                  aria-label="Filter by building"
                  className="px-3 min-h-[44px] border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500"
                >
                  <option value="all">All buildings</option>
                  {buildings.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              )}
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
            <div className="space-y-3">
              {visible.map((item) => (
                <MaintenanceRequestCard
                  key={item.id}
                  item={item}
                  buildingId={item.buildingId ?? null}
                  showBuilding
                />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
