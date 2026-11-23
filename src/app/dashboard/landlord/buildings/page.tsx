/**
 * Buildings List Page
 *
 * Every building this landlord owns, with its occupancy and rent roll derived from
 * the units recorded against it.
 *
 * WHAT THIS REPLACES
 *   A `"use client"` page whose entire contents came from a hardcoded
 *   `mockBuildings` array — four invented buildings with invented occupancy and
 *   invented monthly revenue. The tables it should have been reading
 *   (buildings, units) already existed in the schema and were queried by nothing:
 *   `grep -rn '.from("buildings")' src` returned zero call sites across the repo.
 *
 * WHY THE AGGREGATES ARE COMPUTED HERE AND NOT READ
 *   buildings.total_units is a stored counter with no trigger maintaining it, so it
 *   can disagree with the rows in `units`. The card shows occupancy and a rent roll,
 *   and those have to be true, so unit counts and revenue are derived from the unit
 *   rows themselves. monthly_revenue is the sum of monthly_rent over units whose
 *   status is 'occupied' — the rent actually being charged, not the asking rent of
 *   the whole building.
 *
 *   A vacant unit contributes 0 to revenue and counts against occupancy, which is
 *   the point of the figure.
 */

import { createClient } from "@/lib/supabase/server";
import { BuildingsList, type BuildingSummary } from "./BuildingsList";

interface BuildingRow {
  id: string;
  name: string;
  building_type: string;
  address: string;
  area: string;
  status: string;
  photos: string[] | null;
  created_at: string;
}

interface UnitRollupRow {
  building_id: string | null;
  status: string | null;
  monthly_rent: number | string | null;
}

export default async function BuildingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const landlordId = user?.id ?? "";

  const [{ data: buildingRows, error: buildingsError }, { data: unitRows }] =
    await Promise.all([
      supabase
        .from("buildings")
        .select(
          "id, name, building_type, address, area, status, photos, created_at",
        )
        .eq("landlord_id", landlordId)
        .order("created_at", { ascending: false }),
      supabase
        .from("units")
        .select("building_id, status, monthly_rent")
        .eq("landlord_id", landlordId),
    ]);

  if (buildingsError) {
    console.error("[Buildings] query failed:", buildingsError.message);
  }

  // Roll the units up per building in one pass.
  const rollup = new Map<
    string,
    { total: number; occupied: number; revenue: number }
  >();
  for (const unit of (unitRows ?? []) as UnitRollupRow[]) {
    if (!unit.building_id) continue;
    const entry = rollup.get(unit.building_id) ?? {
      total: 0,
      occupied: 0,
      revenue: 0,
    };
    entry.total += 1;
    if (unit.status === "occupied") {
      entry.occupied += 1;
      // numeric comes back as a string over PostgREST; Number() on null is 0,
      // which is why the null check comes first.
      entry.revenue +=
        unit.monthly_rent == null ? 0 : Number(unit.monthly_rent);
    }
    rollup.set(unit.building_id, entry);
  }

  const buildings: BuildingSummary[] = (
    (buildingRows ?? []) as BuildingRow[]
  ).map((b) => {
    const r = rollup.get(b.id) ?? { total: 0, occupied: 0, revenue: 0 };
    return {
      id: b.id,
      name: b.name,
      building_type: b.building_type,
      address: b.address,
      area: b.area,
      status: b.status,
      photos: b.photos ?? [],
      total_units: r.total,
      occupied_units: r.occupied,
      vacant_units: r.total - r.occupied,
      monthly_revenue: r.revenue,
      occupancy_rate:
        r.total === 0 ? 0 : Math.round((r.occupied / r.total) * 100),
      created_at: b.created_at,
    };
  });

  return <BuildingsList buildings={buildings} />;
}
