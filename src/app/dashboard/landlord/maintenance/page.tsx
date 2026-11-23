/**
 * Maintenance across the whole portfolio.
 *
 * WHY THIS EXISTS
 *   The sidebar and the overview both linked to /dashboard/landlord/maintenance
 *   — from six places between them, including the "urgent requests" alert — and
 *   the route did not exist. Every one of those was a 404.
 *
 * The building detail page already shows one building's requests; this is the
 * same records across all of them, which is what the alert on the overview is
 * actually pointing at. The card is shared, so the two cannot drift.
 */

import { createClient } from "@/lib/supabase/server";
import { MaintenanceList } from "./MaintenanceList";
import type { MaintenanceCardItem } from "@/components/dashboard/landlord/MaintenanceRequestCard";
import { OPEN_MAINTENANCE_STATUSES } from "@/lib/landlord/portfolio";

function num(value: number | string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

export default async function LandlordMaintenancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const [
    { data: requestRows, error },
    { data: unitRows },
    { data: buildingRows },
  ] = await Promise.all([
    supabase
      .from("maintenance_requests")
      // prettier-ignore
      .select(
        "id, unit_id, category, title, description, urgency, status, assigned_to, assigned_phone, estimated_cost, actual_cost, cost_paid_by, reported_at, due_date, completed_at",
      )
      .eq("landlord_id", landlordId)
      .order("reported_at", { ascending: false })
      .limit(500),
    supabase
      .from("units")
      .select("id, unit_number, building_id")
      .eq("landlord_id", landlordId),
    supabase.from("buildings").select("id, name").eq("landlord_id", landlordId),
  ]);

  if (error) {
    console.error("[Maintenance] query failed:", error.message);
  }

  const unitById = new Map((unitRows ?? []).map((u) => [u.id, u]));
  const buildingName = new Map((buildingRows ?? []).map((b) => [b.id, b.name]));

  const items: MaintenanceCardItem[] = (requestRows ?? []).map((m) => {
    const unit = unitById.get(m.unit_id);
    const buildingId = unit?.building_id ?? null;
    return {
      id: m.id,
      unitId: m.unit_id,
      unitNumber: unit?.unit_number ?? "—",
      buildingId,
      buildingName: buildingId ? (buildingName.get(buildingId) ?? null) : null,
      category: m.category,
      title: m.title,
      description: m.description,
      urgency: m.urgency ?? "normal",
      status: m.status ?? "open",
      assignedTo: m.assigned_to,
      assignedPhone: m.assigned_phone,
      estimatedCost: m.estimated_cost === null ? null : num(m.estimated_cost),
      actualCost: m.actual_cost === null ? null : num(m.actual_cost),
      costPaidBy: m.cost_paid_by,
      reportedAt: m.reported_at ?? "",
      dueDate: m.due_date,
      completedAt: m.completed_at,
      isOpen: OPEN_MAINTENANCE_STATUSES.includes(m.status ?? "open"),
    };
  });

  const buildings = (buildingRows ?? []).map((b) => ({
    id: b.id,
    name: b.name,
  }));

  return <MaintenanceList items={items} buildings={buildings} />;
}
