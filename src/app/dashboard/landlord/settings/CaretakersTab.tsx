"use client";

/**
 * Caretakers, managers and bookkeepers.
 *
 * THE THING THIS SCREEN IS REALLY DOING
 *   It hands another person sight of other people's homes. So it shows, on
 *   every row and before every save, exactly which blocks that is and exactly
 *   what they may do — and it marks the permissions that are recorded but not
 *   yet granted, because a tick-box that reads "See tenants" while tenants
 *   stay invisible is worse than no tick-box at all.
 *
 *   Scope defaults to nothing. A caretaker with no block assigned sees
 *   nothing, which is the safe direction to fail in.
 */

import { useState, useTransition } from "react";
import {
  UserPlus,
  Pencil,
  Trash2,
  PauseCircle,
  PlayCircle,
} from "lucide-react";
import { STAFF_ROLES, STAFF_PERMISSIONS } from "@/lib/landlord/settings-schema";
import { Card } from "./parts";
import {
  saveStaffMember,
  setStaffStatus,
  removeStaffMember,
  type StaffInput,
} from "./actions";

export interface StaffRow {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  staffRole: string;
  status: string;
  buildingIds: string[];
  canManageMaintenance: boolean;
  canViewTenants: boolean;
  canRecordPayments: boolean;
  linked: boolean;
}

export interface BuildingRef {
  id: string;
  name: string;
}

const EMPTY: StaffInput = {
  fullName: "",
  phone: "",
  email: null,
  staffRole: "caretaker",
  buildingIds: [],
  canManageMaintenance: true,
  canViewTenants: false,
  canRecordPayments: false,
};

export function CaretakersTab({
  staff,
  buildings,
  enabled,
}: {
  staff: StaffRow[];
  buildings: BuildingRef[];
  enabled: boolean;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [draft, setDraft] = useState<StaffInput>(EMPTY);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();

  const nameOf = (id: string) =>
    buildings.find((b) => b.id === id)?.name ?? "a block you no longer own";

  function openNew() {
    setEditing("new");
    setDraft(EMPTY);
    setError(null);
    setFieldErrors({});
  }

  function openEdit(s: StaffRow) {
    setEditing(s.id);
    setDraft({
      fullName: s.fullName,
      phone: s.phone,
      email: s.email,
      staffRole: s.staffRole,
      buildingIds: s.buildingIds,
      canManageMaintenance: s.canManageMaintenance,
      canViewTenants: s.canViewTenants,
      canRecordPayments: s.canRecordPayments,
    });
    setError(null);
    setFieldErrors({});
  }

  function save() {
    setError(null);
    setFieldErrors({});
    start(async () => {
      const r = await saveStaffMember(
        editing === "new" ? null : editing,
        draft,
      );
      if (r.success) setEditing(null);
      else {
        setFieldErrors((r.fieldErrors ?? {}) as Record<string, string>);
        if (r.error) setError(r.error);
      }
    });
  }

  const input =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  if (!enabled) {
    return (
      <Card title="Caretakers and staff">
        <p className="text-sm text-gray-700">
          Staff access is switched off. Turn on{" "}
          <span className="font-medium">Caretakers and staff</span> under
          General to add someone.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card
        title="Who looks after your blocks"
        description="Each person sees only the blocks you assign. Assign none and they see nothing."
      >
        {staff.length === 0 ? (
          <p className="text-sm text-gray-500">
            Nobody yet. Add the caretaker for a block and they will be able to
            see its maintenance.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {staff.map((s) => (
              <li key={s.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {s.fullName}
                      <span className="ml-2 text-xs font-normal text-gray-500">
                        {STAFF_ROLES.find((r) => r.value === s.staffRole)
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
                        {s.status === "invited" ? "No account yet" : s.status}
                      </span>
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {s.phone}
                      {s.email && <> · {s.email}</>}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {s.buildingIds.length === 0 ? (
                        <span className="text-amber-700">
                          No blocks assigned — they can see nothing.
                        </span>
                      ) : (
                        <>Sees: {s.buildingIds.map(nameOf).join(", ")}</>
                      )}
                    </p>
                    {!s.linked && (
                      <p className="text-xs text-gray-500 mt-1">
                        They have no MitaSafi account on this number yet. The
                        moment they sign up with it, this access begins.
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
                            s.status === "suspended" ? "active" : "suspended",
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
                        <PlayCircle aria-hidden="true" className="w-4 h-4" />
                      ) : (
                        <PauseCircle aria-hidden="true" className="w-4 h-4" />
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
            ))}
          </ul>
        )}

        {editing === null && (
          <button
            type="button"
            onClick={openNew}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium"
          >
            <UserPlus aria-hidden="true" className="w-4 h-4" />
            Add someone
          </button>
        )}
      </Card>

      {editing !== null && (
        <Card title={editing === "new" ? "Add someone" : "Edit"}>
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="staff-name"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name
                </label>
                <input
                  id="staff-name"
                  value={draft.fullName}
                  onChange={(e) =>
                    setDraft({ ...draft, fullName: e.target.value })
                  }
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
                  htmlFor="staff-phone"
                  className="block text-sm font-medium text-gray-700"
                >
                  Phone
                </label>
                <input
                  id="staff-phone"
                  inputMode="tel"
                  placeholder="0712345678"
                  value={draft.phone}
                  onChange={(e) =>
                    setDraft({ ...draft, phone: e.target.value })
                  }
                  aria-invalid={fieldErrors.phone ? true : undefined}
                  aria-describedby="staff-phone-hint"
                  className={input}
                />
                {fieldErrors.phone ? (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.phone}
                  </p>
                ) : (
                  <p
                    id="staff-phone-hint"
                    className="mt-1 text-xs text-gray-500"
                  >
                    This is how their access is matched to their account.
                  </p>
                )}
              </div>
            </div>

            <div>
              <label
                htmlFor="staff-role"
                className="block text-sm font-medium text-gray-700"
              >
                Role
              </label>
              <select
                id="staff-role"
                value={draft.staffRole}
                onChange={(e) =>
                  setDraft({ ...draft, staffRole: e.target.value })
                }
                className={input}
              >
                {STAFF_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label} — {r.blurb}
                  </option>
                ))}
              </select>
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                Blocks they look after
              </legend>
              {buildings.length === 0 ? (
                <p className="mt-1 text-sm text-gray-500">
                  You have no blocks yet. Add a property first.
                </p>
              ) : (
                <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {buildings.map((b) => {
                    const on = draft.buildingIds.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 text-sm text-gray-800 border border-gray-200 rounded-lg px-3 py-2"
                      >
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setDraft({
                              ...draft,
                              buildingIds: on
                                ? draft.buildingIds.filter((x) => x !== b.id)
                                : [...draft.buildingIds, b.id],
                            })
                          }
                          className="w-4 h-4"
                        />
                        {b.name}
                      </label>
                    );
                  })}
                </div>
              )}
              {draft.buildingIds.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  With no block selected this person will see nothing at all.
                </p>
              )}
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                What they may do
              </legend>
              <div className="mt-2 space-y-2">
                {STAFF_PERMISSIONS.map((p) => {
                  const key = p.key as keyof StaffInput;
                  const on = draft[key] as boolean;
                  return (
                    <div key={p.key}>
                      <label className="flex items-start gap-2 text-sm text-gray-800">
                        <input
                          type="checkbox"
                          checked={on}
                          onChange={() =>
                            setDraft({ ...draft, [p.key]: !on } as StaffInput)
                          }
                          className="w-4 h-4 mt-0.5"
                        />
                        <span>
                          {p.label}
                          <span className="block text-xs text-gray-500">
                            {p.blurb}
                          </span>
                          {!p.inForce && (
                            <span className="block text-xs text-amber-700 mt-1">
                              {"notYet" in p ? p.notYet : null}
                            </span>
                          )}
                        </span>
                      </label>
                    </div>
                  );
                })}
              </div>
            </fieldset>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex items-center gap-3">
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
        </Card>
      )}
    </div>
  );
}
