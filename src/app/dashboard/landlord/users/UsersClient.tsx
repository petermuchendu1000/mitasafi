"use client";

/**
 * Users: the people who work on your portfolio, and exactly what each can see.
 *
 * THE ACCESS TABLE IS NOT DECORATION
 *   Every level here is enforced by a row-level policy, or it is marked
 *   "Recorded only" and says why. The ones that are enforced were proven by
 *   28 behavioural assertions running as the staff member's own role — the
 *   suite caught a draft where "all properties" meant every building in the
 *   database, another landlord's included.
 *
 * THE WARNINGS ARE COMPUTED, NOT WRITTEN
 *   Two combinations produce a person who sees nothing: tenants scoped to
 *   specific blocks, and invoices without leases. Both are consequences of
 *   the schema rather than choices, both are explained in place, and both are
 *   tested. A silent empty list is the failure this prevents.
 */

import { useMemo, useState, useTransition } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
  AlertTriangle,
} from "lucide-react";
import {
  ACCESS_MODULES,
  ACCESS_CHOICES,
  ROLE_PRESETS,
  accessWarnings,
  type AccessLevel,
} from "@/lib/landlord/settings-schema";
import {
  saveStaffMember,
  setStaffStatus,
  removeStaffMember,
} from "../settings/actions";

export interface StaffRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  staffRole: string;
  status: string;
  buildingIds: string[];
  allProperties: boolean;
  levels: Record<string, string>;
  maintenanceCategories: string[];
  linked: boolean;
}

export interface BuildingRef {
  id: string;
  name: string;
}

const MAINTENANCE_CATEGORIES = [
  "plumbing",
  "electrical",
  "appliances",
  "structural",
  "pest_control",
  "cleaning",
  "other",
];

function emptyLevels(): Record<string, AccessLevel> {
  const l: Record<string, AccessLevel> = {};
  for (const m of ACCESS_MODULES) l[m.key] = "none";
  return l;
}

interface Draft {
  fullName: string;
  phone: string;
  email: string;
  staffRole: string;
  allProperties: boolean;
  buildingIds: string[];
  levels: Record<string, AccessLevel>;
  maintenanceCategories: string[];
}

const EMPTY: Draft = {
  fullName: "",
  phone: "",
  email: "",
  staffRole: "caretaker",
  allProperties: false,
  buildingIds: [],
  levels: { ...emptyLevels(), access_maintenance: "all" },
  maintenanceCategories: [],
};

export function UsersClient({
  staff,
  buildings,
  staffEnabled,
}: {
  staff: StaffRow[];
  buildings: BuildingRef[];
  staffEnabled: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [d, setD] = useState<Draft>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();

  const warnings = useMemo(
    () => accessWarnings(d.levels, d.allProperties),
    [d.levels, d.allProperties],
  );

  const nameOf = (id: string) =>
    buildings.find((b) => b.id === id)?.name ?? "a block you no longer own";

  function applyPreset(value: string) {
    const p = ROLE_PRESETS.find((r) => r.value === value);
    if (!p) return;
    setD((prev) => ({
      ...prev,
      staffRole: value,
      // Custom keeps whatever is already set; a preset replaces it outright,
      // so choosing one twice always lands on the same thing.
      levels: p.levels
        ? { ...(p.levels as Record<string, AccessLevel>) }
        : prev.levels,
      allProperties: p.allProperties ?? prev.allProperties,
    }));
  }

  function openNew() {
    setEditing("new");
    setD(EMPTY);
    setError(null);
    setFieldErrors({});
  }

  function openEdit(s: StaffRow) {
    setEditing(s.id);
    setD({
      fullName: s.fullName,
      phone: s.phone,
      email: s.email ?? "",
      staffRole: s.staffRole,
      allProperties: s.allProperties,
      buildingIds: s.buildingIds,
      levels: {
        ...emptyLevels(),
        ...(s.levels as Record<string, AccessLevel>),
      },
      maintenanceCategories: s.maintenanceCategories,
    });
    setError(null);
    setFieldErrors({});
  }

  function save() {
    setError(null);
    setFieldErrors({});
    start(async () => {
      const r = await saveStaffMember(editing === "new" ? null : editing, {
        fullName: d.fullName,
        phone: d.phone,
        email: d.email || null,
        staffRole: d.staffRole,
        buildingIds: d.buildingIds,
        allProperties: d.allProperties,
        levels: d.levels,
        maintenanceCategories: d.maintenanceCategories,
      });
      if (r.success) setEditing(null);
      else {
        setFieldErrors((r.fieldErrors ?? {}) as Record<string, string>);
        if (r.error) setError(r.error);
      }
    });
  }

  const input =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  if (!staffEnabled) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-gray-500">
            Caretakers, managers and anyone else who works on your portfolio
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-700">
            Staff access is switched off. Turn on{" "}
            <span className="font-medium">Caretakers and staff</span> under
            Settings → General to add someone.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Users</h1>
          <p className="mt-1 text-gray-500">
            Caretakers, managers and anyone else who works on your portfolio
          </p>
        </div>
        {editing === null && (
          <button
            type="button"
            onClick={openNew}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium"
          >
            <UserPlus aria-hidden="true" className="w-4 h-4" />
            New user
          </button>
        )}
      </div>

      {editing === null ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          {staff.length === 0 ? (
            <p className="px-5 py-12 text-center text-gray-500">
              Nobody yet. Add the caretaker for a block and they will be able to
              see its maintenance.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {staff.map((s) => {
                const granted = ACCESS_MODULES.filter(
                  (m) => s.levels[m.key] && s.levels[m.key] !== "none",
                );
                return (
                  <li key={s.id} className="p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {s.fullName}
                          <span className="ml-2 text-xs font-normal text-gray-500">
                            {ROLE_PRESETS.find((r) => r.value === s.staffRole)
                              ?.label ?? s.staffRole}
                          </span>
                          <span
                            className={`ml-2 px-2 py-0.5 rounded-full text-xs font-medium ${
                              s.status === "active"
                                ? "bg-teal-50 text-teal-700 border border-teal-200"
                                : s.status === "suspended"
                                  ? "bg-gray-100 text-gray-600"
                                  : "bg-amber-50 text-amber-800 border border-amber-200"
                            }`}
                          >
                            {s.status === "invited"
                              ? "No account yet"
                              : s.status}
                          </span>
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {s.phone}
                          {s.email && <> · {s.email}</>}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {s.allProperties
                            ? "All properties"
                            : s.buildingIds.length === 0
                              ? "No blocks assigned — they can see nothing."
                              : `Blocks: ${s.buildingIds.map(nameOf).join(", ")}`}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {granted.length === 0 ? (
                            <span className="text-amber-700">
                              Nothing granted.
                            </span>
                          ) : (
                            granted
                              .map((m) => `${m.label}: ${s.levels[m.key]}`)
                              .join(" · ")
                          )}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEdit(s)}
                          aria-label={`Edit ${s.fullName}`}
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        >
                          <Pencil aria-hidden="true" className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            start(async () => {
                              await setStaffStatus(
                                s.id,
                                s.status === "suspended"
                                  ? "active"
                                  : "suspended",
                              );
                            })
                          }
                          aria-label={
                            s.status === "suspended"
                              ? `Restore ${s.fullName}`
                              : `Suspend ${s.fullName}`
                          }
                          className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                        >
                          {s.status === "suspended" ? (
                            <PlayCircle
                              aria-hidden="true"
                              className="w-4 h-4"
                            />
                          ) : (
                            <PauseCircle
                              aria-hidden="true"
                              className="w-4 h-4"
                            />
                          )}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() =>
                            start(async () => {
                              await removeStaffMember(s.id);
                            })
                          }
                          aria-label={`Remove ${s.fullName}`}
                          className="p-2 rounded-lg hover:bg-red-50 text-red-600"
                        >
                          <Trash2 aria-hidden="true" className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_28rem] gap-6 items-start">
          {/* ---- who they are ------------------------------------------- */}
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              {editing === "new" ? "New user" : "Edit user"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="u-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id="u-name"
                  value={d.fullName}
                  onChange={(e) => setD({ ...d, fullName: e.target.value })}
                  aria-invalid={fieldErrors.fullName ? true : undefined}
                  className={input}
                />
                {fieldErrors.fullName && (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.fullName}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="u-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone
                </label>
                <input
                  id="u-phone"
                  inputMode="tel"
                  placeholder="0712345678"
                  value={d.phone}
                  onChange={(e) => setD({ ...d, phone: e.target.value })}
                  aria-invalid={fieldErrors.phone ? true : undefined}
                  aria-describedby="u-phone-hint"
                  className={input}
                />
                {fieldErrors.phone ? (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.phone}
                  </p>
                ) : (
                  <p id="u-phone-hint" className="mt-1 text-xs text-gray-500">
                    Their access attaches to the MitaSafi account on this
                    number.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="u-email"
                className="block text-sm font-medium text-gray-700"
              >
                Email (optional)
              </label>
              <input
                id="u-email"
                type="email"
                value={d.email}
                onChange={(e) => setD({ ...d, email: e.target.value })}
                className={input}
              />
            </div>

            <div>
              <label
                htmlFor="u-role"
                className="block text-sm font-medium text-gray-700"
              >
                Role
              </label>
              <select
                id="u-role"
                value={d.staffRole}
                onChange={(e) => applyPreset(e.target.value)}
                className={input}
              >
                {ROLE_PRESETS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-gray-500">
                {ROLE_PRESETS.find((r) => r.value === d.staffRole)?.blurb}
              </p>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                Which blocks
              </legend>
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={d.allProperties}
                  onChange={() =>
                    setD({ ...d, allProperties: !d.allProperties })
                  }
                  className="w-4 h-4"
                />
                All properties, including ones added later
              </label>

              {!d.allProperties &&
                (buildings.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    You have no blocks yet. Add a property first.
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {buildings.map((b) => {
                      const on = d.buildingIds.includes(b.id);
                      return (
                        <label
                          key={b.id}
                          className="flex items-center gap-2 text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2"
                        >
                          <input
                            type="checkbox"
                            checked={on}
                            onChange={() =>
                              setD({
                                ...d,
                                buildingIds: on
                                  ? d.buildingIds.filter((x) => x !== b.id)
                                  : [...d.buildingIds, b.id],
                              })
                            }
                            className="w-4 h-4"
                          />
                          {b.name}
                        </label>
                      );
                    })}
                  </div>
                ))}
            </fieldset>

            {d.levels.access_maintenance !== "none" && (
              <fieldset>
                <legend className="text-sm font-medium text-gray-700">
                  Maintenance categories
                </legend>
                <p className="text-xs text-gray-500">
                  Leave all unticked for every category.
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {MAINTENANCE_CATEGORIES.map((c) => {
                    const on = d.maintenanceCategories.includes(c);
                    return (
                      <label
                        key={c}
                        className={`flex items-center gap-1.5 text-xs border rounded-full px-3 py-1.5 ${
                          on
                            ? "bg-teal-50 border-teal-300 text-teal-800"
                            : "border-gray-200 text-gray-700"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setD({
                              ...d,
                              maintenanceCategories: on
                                ? d.maintenanceCategories.filter((x) => x !== c)
                                : [...d.maintenanceCategories, c],
                            })
                          }
                          className="w-3 h-3"
                        />
                        {c.replace(/_/g, " ")}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            )}

            {warnings.length > 0 && (
              <div
                role="alert"
                className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 space-y-2"
              >
                {warnings.map((w) => (
                  <p key={w} className="flex gap-2 text-sm text-amber-900">
                    <AlertTriangle
                      aria-hidden="true"
                      className="w-4 h-4 shrink-0 mt-0.5"
                    />
                    {w}
                  </p>
                ))}
              </div>
            )}

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3 pt-1">
              <button
                type="button"
                onClick={save}
                disabled={busy}
                className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-60"
              >
                {busy ? "Saving…" : "Save"}
              </button>
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700"
              >
                Cancel
              </button>
            </div>
          </div>

          {/* ---- what they may do --------------------------------------- */}
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
              <h2 className="text-sm font-semibold text-gray-900">
                Access levels
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                All: view, edit and delete · View: look only · None: no access
              </p>
            </div>
            <ul className="divide-y divide-gray-100">
              {ACCESS_MODULES.map((m) => (
                <li key={m.key} className="px-5 py-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-800">
                        {m.label}
                      </p>
                      <p className="text-xs text-gray-500">{m.blurb}</p>
                    </div>
                    <div
                      role="group"
                      aria-label={`${m.label} access`}
                      className="shrink-0 inline-flex rounded-lg border border-gray-300 overflow-hidden"
                    >
                      {ACCESS_CHOICES.map((c) => (
                        <button
                          key={c.value}
                          type="button"
                          aria-pressed={d.levels[m.key] === c.value}
                          onClick={() =>
                            setD({
                              ...d,
                              staffRole: "custom",
                              levels: { ...d.levels, [m.key]: c.value },
                            })
                          }
                          className={`px-3 py-1.5 text-xs font-medium border-r last:border-r-0 border-gray-300 ${
                            d.levels[m.key] === c.value
                              ? "bg-teal-600 text-white"
                              : "bg-white text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {c.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  {!m.enforced && (
                    <p className="mt-1.5 text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded px-2 py-1">
                      {m.notYet}
                    </p>
                  )}
                  {m.portfolioWideOnly && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      Cannot be limited to selected blocks.
                    </p>
                  )}
                  {m.requires && (
                    <p className="mt-1.5 text-xs text-gray-500">
                      {m.requires.why}
                    </p>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
