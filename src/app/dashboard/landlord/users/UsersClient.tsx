"use client";

/**
 * Users: the people who work on your portfolio, and exactly what each can see.
 *
 * THE ACCESS TABLE IS NOT DECORATION
 *   Every level is enforced by a row-level policy, or it is marked "Recorded
 *   only" with the reason. The enforced ones were proven by 36 behavioural
 *   assertions running as the staff member's own role — which is how a draft
 *   was caught where "all properties" meant every building in the database,
 *   another landlord's included.
 *
 * THE WARNINGS ARE COMPUTED, NOT WRITTEN
 *   Two combinations produce a person who sees nothing: tenants scoped to
 *   specific blocks, and invoices without leases. Both follow from the schema,
 *   both are explained in place, both are tested. A silent empty list is the
 *   failure this prevents.
 *
 * A ROLE MUST BE CHOSEN
 *   The form opens on "Select role" and refuses to save without one, so the
 *   access decision is made deliberately rather than inherited from a default
 *   nobody looked at.
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
  ROLE_PRESETS,
  CATEGORY_MODES,
  MAINTENANCE_CATEGORIES,
  accessWarnings,
  choicesFor,
  type AccessLevel,
} from "@/lib/landlord/settings-schema";
import {
  saveStaffMember,
  setStaffStatus,
  removeStaffMember,
} from "../settings/actions";

export interface StaffRow {
  id: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string;
  email: string | null;
  staffRole: string;
  status: string;
  buildingIds: string[];
  allProperties: boolean;
  levels: Record<string, string>;
  categoryMode: string;
  allowCustomCategory: boolean;
  maintenanceCategories: string[];
  linked: boolean;
}

export interface BuildingRef {
  id: string;
  name: string;
}

function emptyLevels(): Record<string, AccessLevel> {
  const l: Record<string, AccessLevel> = {};
  for (const m of ACCESS_MODULES) l[m.key] = "none";
  return l;
}

interface Draft {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  staffRole: string;
  allProperties: boolean;
  buildingIds: string[];
  levels: Record<string, AccessLevel>;
  categoryMode: string;
  allowCustomCategory: boolean;
  maintenanceCategories: string[];
}

const EMPTY: Draft = {
  firstName: "",
  lastName: "",
  phone: "",
  email: "",
  staffRole: "",
  allProperties: false,
  buildingIds: [],
  levels: emptyLevels(),
  categoryMode: "all",
  allowCustomCategory: false,
  maintenanceCategories: [],
};

/** Innago shows the preset matrix side by side so you can compare before picking. */
function RoleComparison({ current }: { current: string }) {
  const presets = ROLE_PRESETS.filter((r) => r.levels);
  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
        <h2 className="text-sm font-semibold text-gray-900">Access levels</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          What each role gets. Choose Custom to set them yourself.
        </p>
      </div>
      {/* Five role columns do not fit a sidebar; scroll rather than clip. */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-xs">
          <caption className="sr-only">
            Access each role is given, by module
          </caption>
          <thead className="bg-gray-50 text-gray-600">
            <tr>
              <th scope="col" className="text-left font-medium px-4 py-2">
                Feature
              </th>
              {presets.map((p) => (
                <th
                  key={p.value}
                  scope="col"
                  className={`text-left font-medium px-3 py-2 ${
                    p.value === current ? "bg-teal-50 text-teal-800" : ""
                  }`}
                >
                  {p.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {ACCESS_MODULES.map((m) => (
              <tr key={m.key}>
                <th
                  scope="row"
                  className="text-left font-normal text-gray-700 px-4 py-2"
                >
                  {m.label}
                  {!m.enforced && (
                    <span className="block text-[10px] text-amber-700">
                      recorded only
                    </span>
                  )}
                </th>
                {presets.map((p) => {
                  const v = p.levels![m.key] ?? "none";
                  return (
                    <td
                      key={p.value}
                      className={`px-3 py-2 capitalize ${
                        p.value === current ? "bg-teal-50 font-medium" : ""
                      } ${v === "none" ? "text-gray-400" : "text-gray-900"}`}
                    >
                      {v}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <dl className="px-4 py-3 border-t border-gray-200 text-xs text-gray-600 space-y-1">
        <div>
          <dt className="inline font-medium">All — </dt>
          <dd className="inline">view, edit and delete.</dd>
        </div>
        <div>
          <dt className="inline font-medium">View — </dt>
          <dd className="inline">can look, cannot change.</dd>
        </div>
        <div>
          <dt className="inline font-medium">Limited — </dt>
          <dd className="inline">part of the module only.</dd>
        </div>
        <div>
          <dt className="inline font-medium">None — </dt>
          <dd className="inline">no access at all.</dd>
        </div>
      </dl>
    </div>
  );
}

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
    // Clear the Required badge the moment the thing it asked for is supplied;
    // leaving it up tells the landlord they still have a problem they fixed.
    if (value !== "") {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next.staffRole;
        return next;
      });
    }
    const p = ROLE_PRESETS.find((r) => r.value === value);
    setD((prev) => ({
      ...prev,
      staffRole: value,
      levels: p?.levels
        ? { ...(p.levels as Record<string, AccessLevel>) }
        : prev.levels,
      allProperties: p?.allProperties ?? prev.allProperties,
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
      firstName: s.firstName,
      lastName: s.lastName,
      phone: s.phone,
      email: s.email ?? "",
      staffRole: s.staffRole,
      allProperties: s.allProperties,
      buildingIds: s.buildingIds,
      levels: {
        ...emptyLevels(),
        ...(s.levels as Record<string, AccessLevel>),
      },
      categoryMode: s.categoryMode,
      allowCustomCategory: s.allowCustomCategory,
      maintenanceCategories: s.maintenanceCategories,
    });
    setError(null);
    setFieldErrors({});
  }

  function save() {
    setError(null);
    setFieldErrors({});
    // Checked here as well as on the server so the landlord sees "Required"
    // against the control rather than a sentence at the bottom.
    if (d.staffRole === "") {
      setFieldErrors({ staffRole: "Required" });
      return;
    }
    start(async () => {
      const r = await saveStaffMember(editing === "new" ? null : editing, {
        firstName: d.firstName,
        lastName: d.lastName,
        phone: d.phone,
        email: d.email,
        staffRole: d.staffRole,
        buildingIds: d.buildingIds,
        allProperties: d.allProperties,
        levels: d.levels,
        categoryMode: d.categoryMode,
        allowCustomCategory: d.allowCustomCategory,
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
  const req = <span className="text-red-600">*</span>;

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
                        {s.levels.access_maintenance !== "none" &&
                          s.categoryMode === "specific" && (
                            <p className="text-xs text-gray-600 mt-1">
                              Categories:{" "}
                              {s.maintenanceCategories.length === 0
                                ? "none chosen, so no jobs at all"
                                : s.maintenanceCategories
                                    .map((c) => c.replace(/_/g, " "))
                                    .join(", ")}
                            </p>
                          )}
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
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_34rem] gap-6 items-start">
          <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
            <h2 className="text-base font-semibold text-gray-900">
              {editing === "new" ? "New user" : "Edit user"}
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="u-first"
                  className="block text-sm font-medium text-gray-700"
                >
                  First name {req}
                </label>
                <input
                  id="u-first"
                  value={d.firstName}
                  onChange={(e) => setD({ ...d, firstName: e.target.value })}
                  aria-invalid={fieldErrors.firstName ? true : undefined}
                  className={input}
                />
                {fieldErrors.firstName && (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.firstName}
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="u-last"
                  className="block text-sm font-medium text-gray-700"
                >
                  Last name {req}
                </label>
                <input
                  id="u-last"
                  value={d.lastName}
                  onChange={(e) => setD({ ...d, lastName: e.target.value })}
                  aria-invalid={fieldErrors.lastName ? true : undefined}
                  className={input}
                />
                {fieldErrors.lastName && (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="u-email"
                  className="block text-sm font-medium text-gray-700"
                >
                  Email {req}
                </label>
                <input
                  id="u-email"
                  type="email"
                  value={d.email}
                  onChange={(e) => setD({ ...d, email: e.target.value })}
                  aria-invalid={fieldErrors.email ? true : undefined}
                  aria-describedby="u-email-hint"
                  className={input}
                />
                {fieldErrors.email ? (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.email}
                  </p>
                ) : (
                  <p id="u-email-hint" className="mt-1 text-xs text-gray-500">
                    The only way to reach someone who has no account yet.
                  </p>
                )}
              </div>
              <div>
                <label
                  htmlFor="u-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone {req}
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
                htmlFor="u-role"
                className="block text-sm font-medium text-gray-700"
              >
                Role {req}
              </label>
              <select
                id="u-role"
                value={d.staffRole}
                onChange={(e) => applyPreset(e.target.value)}
                aria-invalid={fieldErrors.staffRole ? true : undefined}
                aria-describedby={
                  fieldErrors.staffRole ? "u-role-error" : undefined
                }
                className={input}
              >
                <option value="">Select role</option>
                {ROLE_PRESETS.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
              {fieldErrors.staffRole ? (
                <p
                  id="u-role-error"
                  role="alert"
                  className="mt-1 inline-block rounded bg-red-600 px-2 py-0.5 text-xs font-medium text-white"
                >
                  {fieldErrors.staffRole}
                </p>
              ) : (
                <p className="mt-1 text-xs text-gray-500">
                  {ROLE_PRESETS.find((r) => r.value === d.staffRole)?.blurb ??
                    "Pick a role to set the access levels, or choose Custom."}
                </p>
              )}
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                Assign properties
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
                <div
                  role="group"
                  aria-label="Maintenance category scope"
                  className="mt-2 inline-flex rounded-lg border border-gray-300 overflow-hidden"
                >
                  {CATEGORY_MODES.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      aria-pressed={d.categoryMode === m.value}
                      onClick={() => setD({ ...d, categoryMode: m.value })}
                      className={`px-3 py-1.5 text-xs font-medium border-r last:border-r-0 border-gray-300 ${
                        d.categoryMode === m.value
                          ? "bg-teal-600 text-white"
                          : "bg-white text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {d.categoryMode === "specific" && (
                  <>
                    <div className="mt-3 flex flex-wrap gap-2">
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
                                    ? d.maintenanceCategories.filter(
                                        (x) => x !== c,
                                      )
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
                    {d.maintenanceCategories.length === 0 && (
                      <p className="mt-2 text-xs text-amber-700">
                        No category chosen, so they will see no maintenance at
                        all. That is what &ldquo;specific&rdquo; means here — it
                        is not read as &ldquo;everything&rdquo;.
                      </p>
                    )}
                  </>
                )}

                <label className="mt-3 flex items-center gap-2 text-sm text-gray-800">
                  <input
                    type="checkbox"
                    checked={d.allowCustomCategory}
                    onChange={() =>
                      setD({
                        ...d,
                        allowCustomCategory: !d.allowCustomCategory,
                      })
                    }
                    className="w-4 h-4"
                  />
                  Allow custom category
                </label>
                <p className="text-xs text-amber-700 mt-1">
                  Recorded only: maintenance categories are a fixed list today,
                  so this changes nothing yet.
                </p>
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

          {/* Comparison while picking a preset; the editable matrix for Custom. */}
          {d.staffRole !== "custom" ? (
            <RoleComparison current={d.staffRole} />
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="px-5 py-3 bg-gray-50 border-b border-gray-200">
                <h2 className="text-sm font-semibold text-gray-900">
                  Access levels — Custom
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
                        {choicesFor(m).map((c) => (
                          <button
                            key={c.value}
                            type="button"
                            aria-pressed={d.levels[m.key] === c.value}
                            onClick={() =>
                              setD({
                                ...d,
                                levels: {
                                  ...d.levels,
                                  [m.key]: c.value as AccessLevel,
                                },
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
          )}
        </div>
      )}
    </div>
  );
}
