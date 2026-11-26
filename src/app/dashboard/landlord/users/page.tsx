/**
 * Users — the people who work on this landlord's portfolio.
 *
 * Its own top-level page rather than a settings tab, because managing who can
 * see other people's homes is not a preference.
 */

import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ACCESS_MODULES } from "@/lib/landlord/settings-schema";
import { UsersClient } from "./UsersClient";

export const metadata: Metadata = { title: "Users | MitaSafi" };

const MISSING_TABLE = new Set(["42P01", "PGRST205", "PGRST106"]);

export default async function UsersPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const userId = user?.id ?? "";

  const [{ data: staff, error }, { data: buildings }, { data: settings }] =
    await Promise.all([
      supabase
        .from("property_staff")
        .select("*")
        .eq("landlord_id", userId)
        .order("created_at", { ascending: true }),
      supabase
        .from("buildings")
        .select("id, name")
        .eq("landlord_id", userId)
        .order("name"),
      supabase
        .from("landlord_settings")
        .select("enable_staff_access")
        .eq("landlord_id", userId)
        .maybeSingle(),
    ]);

  if (MISSING_TABLE.has(error?.code ?? "")) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-700">
            User management is not switched on in this environment yet — the
            database change that stores it has not been applied.
          </p>
        </div>
      </div>
    );
  }

  const rows = (staff ?? []) as Record<string, unknown>[];

  return (
    <UsersClient
      staffEnabled={settings?.enable_staff_access ?? false}
      buildings={(buildings ?? []).map((b) => ({ id: b.id, name: b.name }))}
      staff={rows.map((s) => {
        const levels: Record<string, string> = {};
        for (const m of ACCESS_MODULES) {
          levels[m.key] = (s[m.key] as string) ?? "none";
        }
        return {
          id: s.id as string,
          firstName: (s.first_name as string) ?? "",
          lastName: (s.last_name as string) ?? "",
          fullName: s.full_name as string,
          phone: s.phone as string,
          email: (s.email as string | null) ?? null,
          staffRole: s.staff_role as string,
          status: s.status as string,
          buildingIds: (s.building_ids as string[]) ?? [],
          allProperties: Boolean(s.all_properties),
          categoryMode: (s.maintenance_category_mode as string) ?? "all",
          allowCustomCategory: Boolean(s.allow_custom_category),
          maintenanceCategories: (s.maintenance_categories as string[]) ?? [],
          levels,
          linked: s.user_id !== null,
        };
      })}
    />
  );
}
