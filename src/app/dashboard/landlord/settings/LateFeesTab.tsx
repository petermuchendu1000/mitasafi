"use client";

/**
 * Late fees, as a list rather than a single policy.
 *
 * A landlord charges 10% in town and a flat 1,000 in the suburbs, so one
 * policy per account was never the right shape. Each rule carries its own
 * assignment — all properties, or named blocks — and prints the one-line
 * summary above itself so the configuration can be read without decoding the
 * fields underneath it.
 *
 * Rules apply to leases created from now on. A lease already signed keeps the
 * terms it was signed with; changing a policy must not rewrite an agreement.
 */

import { useState, useTransition } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import {
  LATE_FEE_TYPES,
  LATE_FEE_APPLIES_TO,
  describeLateFeeRule,
} from "@/lib/landlord/settings-schema";
import { Card, Switch, NumberField, Radio } from "./parts";
import { saveLateFeeRule, deleteLateFeeRule } from "./actions";

export interface LateFeeRule {
  id: string;
  enabled: boolean;
  fee_type: string;
  amount: number | null;
  percentage: number | null;
  grace_period_days: number;
  applies_to: string;
  all_properties: boolean;
  building_ids: string[];
}

export interface BuildingRef {
  id: string;
  name: string;
}

const BLANK: LateFeeRule = {
  id: "",
  enabled: true,
  fee_type: "percentage",
  amount: null,
  percentage: 10,
  grace_period_days: 5,
  applies_to: "all_line_items",
  all_properties: true,
  building_ids: [],
};

export function LateFeesTab({
  rules,
  buildings,
}: {
  rules: LateFeeRule[];
  buildings: BuildingRef[];
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [d, setD] = useState<LateFeeRule>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();

  const nameOf = (id: string) =>
    buildings.find((b) => b.id === id)?.name ?? "a block you no longer own";

  function save() {
    setError(null);
    setFieldErrors({});
    start(async () => {
      const r = await saveLateFeeRule({
        id: editing === "new" ? null : editing,
        enabled: d.enabled,
        feeType: d.fee_type,
        amount: d.amount,
        percentage: d.percentage,
        gracePeriodDays: d.grace_period_days,
        appliesTo: d.applies_to,
        allProperties: d.all_properties,
        buildingIds: d.building_ids,
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

  return (
    <div className="space-y-6">
      <Card
        title="Late payment fees"
        description="Applied to leases you create from now on. A lease already signed keeps the terms it was signed with."
      >
        {rules.length === 0 ? (
          <p className="text-sm text-gray-500">
            No late fee. Rent is simply recorded as late.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {rules.map((r) => (
              <li key={r.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm text-gray-900">
                      {describeLateFeeRule(r)}
                      {!r.enabled && (
                        <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
                          off
                        </span>
                      )}
                    </p>
                    <p className="mt-1 inline-block text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded px-2 py-1">
                      Applied to:{" "}
                      {
                        LATE_FEE_APPLIES_TO.find(
                          (a) => a.value === r.applies_to,
                        )?.label
                      }
                    </p>
                    <p className="mt-1 text-xs text-gray-600">
                      Assigned to:{" "}
                      {r.all_properties
                        ? "All properties"
                        : r.building_ids.length === 0
                          ? "nothing yet — this rule applies to no lease"
                          : r.building_ids.map(nameOf).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(r.id);
                        setD(r);
                        setError(null);
                        setFieldErrors({});
                      }}
                      aria-label="Edit this late fee"
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      <Pencil aria-hidden="true" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        start(async () => {
                          await deleteLateFeeRule(r.id);
                        })
                      }
                      aria-label="Remove this late fee"
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
            onClick={() => {
              setEditing("new");
              setD(BLANK);
              setError(null);
              setFieldErrors({});
            }}
            className="mt-4 inline-flex items-center gap-2 text-sm font-medium text-teal-700 hover:underline"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            Add another late fee
          </button>
        )}
      </Card>

      {editing !== null && (
        <Card title={editing === "new" ? "New late fee" : "Edit late fee"}>
          <div className="space-y-4">
            <Switch
              id="lf-enabled"
              checked={d.enabled}
              onChange={(v) => setD({ ...d, enabled: v })}
              label="Charge this fee"
            />

            <div>
              <label
                htmlFor="lf-type"
                className="block text-sm font-medium text-gray-700"
              >
                How it is calculated
              </label>
              <select
                id="lf-type"
                value={d.fee_type}
                onChange={(e) => setD({ ...d, fee_type: e.target.value })}
                className={input}
              >
                {LATE_FEE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {d.fee_type === "percentage" ? (
              <div>
                <label
                  htmlFor="lf-pct"
                  className="block text-sm font-medium text-gray-700"
                >
                  Percentage
                </label>
                <input
                  id="lf-pct"
                  type="number"
                  min={0}
                  max={100}
                  value={d.percentage ?? ""}
                  onChange={(e) =>
                    setD({
                      ...d,
                      percentage:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  aria-invalid={fieldErrors.percentage ? true : undefined}
                  className={`${input} w-32`}
                />
                {fieldErrors.percentage && (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.percentage}
                  </p>
                )}
              </div>
            ) : (
              <div>
                <label
                  htmlFor="lf-amt"
                  className="block text-sm font-medium text-gray-700"
                >
                  Amount in KES
                </label>
                <input
                  id="lf-amt"
                  type="number"
                  min={0}
                  value={d.amount ?? ""}
                  onChange={(e) =>
                    setD({
                      ...d,
                      amount:
                        e.target.value === "" ? null : Number(e.target.value),
                    })
                  }
                  aria-invalid={fieldErrors.amount ? true : undefined}
                  className={`${input} w-40`}
                />
                {fieldErrors.amount && (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.amount}
                  </p>
                )}
              </div>
            )}

            <div>
              <p className="text-sm font-medium text-gray-700">Grace period</p>
              <p className="text-xs text-gray-500 mb-1">
                Days after the due date before the fee applies.
              </p>
              <NumberField
                id="lf-grace"
                label="Grace period in days"
                value={d.grace_period_days}
                onChange={(n) => setD({ ...d, grace_period_days: n })}
                suffix="days"
                min={0}
                max={60}
              />
            </div>

            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                Applied to
              </legend>
              <div className="mt-2 flex flex-col gap-2">
                {LATE_FEE_APPLIES_TO.map((a) => (
                  <Radio
                    key={a.value}
                    name="lf-applies"
                    value={a.value}
                    current={d.applies_to}
                    onChange={(v) => setD({ ...d, applies_to: v })}
                    label={a.label}
                  />
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="text-sm font-medium text-gray-700">
                Assigned to
              </legend>
              <label className="mt-2 flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={d.all_properties}
                  onChange={() =>
                    setD({ ...d, all_properties: !d.all_properties })
                  }
                  className="w-4 h-4"
                />
                All properties
              </label>
              {!d.all_properties &&
                (buildings.length === 0 ? (
                  <p className="mt-2 text-sm text-gray-500">
                    You have no blocks yet.
                  </p>
                ) : (
                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {buildings.map((b) => {
                      const on = d.building_ids.includes(b.id);
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
                                building_ids: on
                                  ? d.building_ids.filter((x) => x !== b.id)
                                  : [...d.building_ids, b.id],
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
              {!d.all_properties && d.building_ids.length === 0 && (
                <p className="mt-2 text-xs text-amber-700">
                  With nothing assigned this rule applies to no lease at all.
                </p>
              )}
            </fieldset>

            <p className="text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
              {describeLateFeeRule(d)}
            </p>

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
