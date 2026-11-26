"use client";

/**
 * Where your rent is collected.
 *
 * MitaSafi is a gateway: it tells the tenant exactly where to send the money
 * and records what arrived. The money goes from them to you. MitaSafi never
 * receives it, holds no float and owes you no payout — which is why there is
 * no balance on this page and no "withdraw" button.
 *
 * THE PREVIEW IS THE POINT
 *   Everything below the form shows the instruction a tenant will actually
 *   read, built by the same function the tenant-facing view uses. A landlord
 *   should never discover a wrong paybill from a tenant.
 */

import { useMemo, useState, useTransition } from "react";
import { Plus, Pencil, Trash2, Star, AlertTriangle } from "lucide-react";
import {
  PAYOUT_METHODS,
  REFERENCE_MODES,
  buildInstruction,
  describeDestination,
  type PayoutDestination,
} from "@/lib/landlord/payment-instructions";
import { Card, Radio } from "./parts";
import { savePayoutMethod, deletePayoutMethod } from "./actions";

export interface BuildingRef {
  id: string;
  name: string;
}

interface Draft {
  label: string;
  method: string;
  paybillNumber: string;
  tillNumber: string;
  mpesaPhone: string;
  accountReferenceMode: string;
  accountReference: string;
  bankName: string;
  bankAccountName: string;
  bankAccountNumber: string;
  bankBranch: string;
  instructions: string;
  isDefault: boolean;
  allProperties: boolean;
  buildingIds: string[];
}

const BLANK: Draft = {
  label: "",
  method: "mpesa_paybill",
  paybillNumber: "",
  tillNumber: "",
  mpesaPhone: "",
  accountReferenceMode: "unit_number",
  accountReference: "",
  bankName: "",
  bankAccountName: "",
  bankAccountNumber: "",
  bankBranch: "",
  instructions: "",
  isDefault: false,
  allProperties: true,
  buildingIds: [],
};

function toDraft(d: PayoutDestination): Draft {
  return {
    label: d.label,
    method: d.method,
    paybillNumber: d.paybill_number ?? "",
    tillNumber: d.till_number ?? "",
    mpesaPhone: d.mpesa_phone ?? "",
    accountReferenceMode: d.account_reference_mode,
    accountReference: d.account_reference ?? "",
    bankName: d.bank_name ?? "",
    bankAccountName: d.bank_account_name ?? "",
    bankAccountNumber: d.bank_account_number ?? "",
    bankBranch: d.bank_branch ?? "",
    instructions: d.instructions ?? "",
    isDefault: d.is_default,
    allProperties: d.all_properties,
    buildingIds: d.building_ids,
  };
}

function toDestination(d: Draft): PayoutDestination {
  return {
    id: "preview",
    label: d.label,
    method: d.method,
    paybill_number: d.paybillNumber || null,
    till_number: d.tillNumber || null,
    mpesa_phone: d.mpesaPhone || null,
    account_reference_mode: d.accountReferenceMode,
    account_reference: d.accountReference || null,
    bank_name: d.bankName || null,
    bank_account_name: d.bankAccountName || null,
    bank_account_number: d.bankAccountNumber || null,
    bank_branch: d.bankBranch || null,
    instructions: d.instructions || null,
    is_default: d.isDefault,
    all_properties: d.allProperties,
    building_ids: d.buildingIds,
  };
}

export function BankTab({
  destinations,
  buildings,
  sampleUnit,
}: {
  destinations: PayoutDestination[];
  buildings: BuildingRef[];
  sampleUnit: string | null;
}) {
  const [editing, setEditing] = useState<string | null>(null);
  const [d, setD] = useState<Draft>(BLANK);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();

  const preview = useMemo(
    () =>
      buildInstruction(toDestination(d), {
        unitNumber: sampleUnit,
        tenantPhone: "+254712345678",
      }),
    [d, sampleUnit],
  );

  const nameOf = (id: string) =>
    buildings.find((b) => b.id === id)?.name ?? "a block you no longer own";

  function save() {
    setError(null);
    setFieldErrors({});
    start(async () => {
      const r = await savePayoutMethod({
        id: editing === "new" ? null : editing,
        ...d,
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

  return (
    <div className="space-y-6">
      <Card title="Where your rent is collected">
        <p className="text-sm text-gray-700">
          MitaSafi tells your tenants where to pay and records what arrives. The
          money goes from them straight to you — MitaSafi never receives it,
          holds no float and owes you no payout. That is why there is no balance
          on this page.
        </p>

        {destinations.length === 0 ? (
          <p className="mt-4 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            You have not said where rent should be sent, so MitaSafi cannot tell
            anyone. Add a destination and every tenant gets the same unambiguous
            instruction.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-gray-100">
            {destinations.map((x) => (
              <li key={x.id} className="py-4 first:pt-0">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {x.label}
                      {x.is_default && (
                        <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-teal-50 text-teal-700 border border-teal-200">
                          <Star aria-hidden="true" className="w-3 h-3" />
                          Default
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-gray-700 mt-0.5">
                      {describeDestination(x)}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {x.all_properties
                        ? "All properties"
                        : x.building_ids.length === 0
                          ? "No blocks assigned — this destination is used by nobody."
                          : x.building_ids.map(nameOf).join(", ")}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => {
                        setEditing(x.id);
                        setD(toDraft(x));
                        setError(null);
                        setFieldErrors({});
                      }}
                      aria-label={`Edit ${x.label}`}
                      className="p-2 rounded-lg hover:bg-gray-100 text-gray-600"
                    >
                      <Pencil aria-hidden="true" className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        start(async () => {
                          await deletePayoutMethod(x.id);
                        })
                      }
                      aria-label={`Remove ${x.label}`}
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
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium"
          >
            <Plus aria-hidden="true" className="w-4 h-4" />
            Add a destination
          </button>
        )}
      </Card>

      {editing !== null && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 items-start">
          <Card
            title={editing === "new" ? "New destination" : "Edit destination"}
          >
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="pm-label"
                  className="block text-sm font-medium text-gray-700"
                >
                  Name it {req}
                </label>
                <input
                  id="pm-label"
                  placeholder="Main paybill"
                  value={d.label}
                  onChange={(e) => setD({ ...d, label: e.target.value })}
                  aria-invalid={fieldErrors.label ? true : undefined}
                  className={input}
                />
                {fieldErrors.label && (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {fieldErrors.label}
                  </p>
                )}
              </div>

              <div>
                <label
                  htmlFor="pm-method"
                  className="block text-sm font-medium text-gray-700"
                >
                  How you collect
                </label>
                <select
                  id="pm-method"
                  value={d.method}
                  onChange={(e) => setD({ ...d, method: e.target.value })}
                  className={input}
                >
                  {PAYOUT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {PAYOUT_METHODS.find((m) => m.value === d.method)?.blurb}
                </p>
              </div>

              {d.method === "mpesa_paybill" && (
                <div>
                  <label
                    htmlFor="pm-paybill"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Paybill number {req}
                  </label>
                  <input
                    id="pm-paybill"
                    inputMode="numeric"
                    value={d.paybillNumber}
                    onChange={(e) =>
                      setD({ ...d, paybillNumber: e.target.value })
                    }
                    aria-invalid={fieldErrors.paybillNumber ? true : undefined}
                    className={input}
                  />
                  {fieldErrors.paybillNumber && (
                    <p role="alert" className="mt-1 text-sm text-red-700">
                      {fieldErrors.paybillNumber}
                    </p>
                  )}
                </div>
              )}

              {d.method === "mpesa_till" && (
                <div>
                  <label
                    htmlFor="pm-till"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Till number {req}
                  </label>
                  <input
                    id="pm-till"
                    inputMode="numeric"
                    value={d.tillNumber}
                    onChange={(e) => setD({ ...d, tillNumber: e.target.value })}
                    aria-invalid={fieldErrors.tillNumber ? true : undefined}
                    className={input}
                  />
                  {fieldErrors.tillNumber && (
                    <p role="alert" className="mt-1 text-sm text-red-700">
                      {fieldErrors.tillNumber}
                    </p>
                  )}
                </div>
              )}

              {d.method === "mpesa_send_money" && (
                <div>
                  <label
                    htmlFor="pm-phone"
                    className="block text-sm font-medium text-gray-700"
                  >
                    Your M-Pesa number {req}
                  </label>
                  <input
                    id="pm-phone"
                    inputMode="tel"
                    placeholder="0722123456"
                    value={d.mpesaPhone}
                    onChange={(e) => setD({ ...d, mpesaPhone: e.target.value })}
                    aria-invalid={fieldErrors.mpesaPhone ? true : undefined}
                    className={input}
                  />
                  {fieldErrors.mpesaPhone && (
                    <p role="alert" className="mt-1 text-sm text-red-700">
                      {fieldErrors.mpesaPhone}
                    </p>
                  )}
                </div>
              )}

              {d.method === "bank" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="pm-bank"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Bank {req}
                      </label>
                      <input
                        id="pm-bank"
                        value={d.bankName}
                        onChange={(e) =>
                          setD({ ...d, bankName: e.target.value })
                        }
                        aria-invalid={fieldErrors.bankName ? true : undefined}
                        className={input}
                      />
                      {fieldErrors.bankName && (
                        <p role="alert" className="mt-1 text-sm text-red-700">
                          {fieldErrors.bankName}
                        </p>
                      )}
                    </div>
                    <div>
                      <label
                        htmlFor="pm-branch"
                        className="block text-sm font-medium text-gray-700"
                      >
                        Branch
                      </label>
                      <input
                        id="pm-branch"
                        value={d.bankBranch}
                        onChange={(e) =>
                          setD({ ...d, bankBranch: e.target.value })
                        }
                        className={input}
                      />
                    </div>
                  </div>
                  <div>
                    <label
                      htmlFor="pm-acctname"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Account name {req}
                    </label>
                    <input
                      id="pm-acctname"
                      value={d.bankAccountName}
                      onChange={(e) =>
                        setD({ ...d, bankAccountName: e.target.value })
                      }
                      aria-invalid={
                        fieldErrors.bankAccountName ? true : undefined
                      }
                      aria-describedby="pm-acctname-hint"
                      className={input}
                    />
                    {fieldErrors.bankAccountName ? (
                      <p role="alert" className="mt-1 text-sm text-red-700">
                        {fieldErrors.bankAccountName}
                      </p>
                    ) : (
                      <p
                        id="pm-acctname-hint"
                        className="mt-1 text-xs text-gray-500"
                      >
                        A transfer to the wrong name is rejected, so this has to
                        match the bank exactly.
                      </p>
                    )}
                  </div>
                  <div>
                    <label
                      htmlFor="pm-acctno"
                      className="block text-sm font-medium text-gray-700"
                    >
                      Account number {req}
                    </label>
                    <input
                      id="pm-acctno"
                      inputMode="numeric"
                      value={d.bankAccountNumber}
                      onChange={(e) =>
                        setD({ ...d, bankAccountNumber: e.target.value })
                      }
                      aria-invalid={
                        fieldErrors.bankAccountNumber ? true : undefined
                      }
                      className={input}
                    />
                    {fieldErrors.bankAccountNumber && (
                      <p role="alert" className="mt-1 text-sm text-red-700">
                        {fieldErrors.bankAccountNumber}
                      </p>
                    )}
                  </div>
                </div>
              )}

              {d.method !== "bank" && (
                <fieldset>
                  <legend className="text-sm font-medium text-gray-700">
                    What should the tenant reference?
                  </legend>
                  <div className="mt-2 flex flex-col gap-2">
                    {REFERENCE_MODES.map((m) => (
                      <span key={m.value}>
                        <Radio
                          name="pm-ref"
                          value={m.value}
                          current={d.accountReferenceMode}
                          onChange={(v) =>
                            setD({ ...d, accountReferenceMode: v })
                          }
                          label={m.label}
                        />
                        <span className="block ml-6 text-xs text-gray-500">
                          {m.blurb}
                        </span>
                      </span>
                    ))}
                  </div>
                  {d.accountReferenceMode === "custom" && (
                    <input
                      aria-label="Fixed reference"
                      value={d.accountReference}
                      onChange={(e) =>
                        setD({ ...d, accountReference: e.target.value })
                      }
                      placeholder="RENT"
                      className={`${input} w-48`}
                    />
                  )}
                </fieldset>
              )}

              <div>
                <label
                  htmlFor="pm-note"
                  className="block text-sm font-medium text-gray-700"
                >
                  Anything else the tenant should know
                </label>
                <textarea
                  id="pm-note"
                  rows={2}
                  value={d.instructions}
                  onChange={(e) => setD({ ...d, instructions: e.target.value })}
                  placeholder="Pay by the 5th to avoid a late fee."
                  className={input}
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-800">
                <input
                  type="checkbox"
                  checked={d.isDefault}
                  onChange={() => setD({ ...d, isDefault: !d.isDefault })}
                  className="w-4 h-4"
                />
                Use this by default
              </label>

              <fieldset>
                <legend className="text-sm font-medium text-gray-700">
                  Which blocks pay here
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
                  All properties
                </label>
                {!d.allProperties &&
                  (buildings.length === 0 ? (
                    <p className="mt-2 text-sm text-gray-500">
                      You have no blocks yet.
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

          <Card
            title="What your tenant will see"
            description={
              sampleUnit
                ? `Shown for unit ${sampleUnit}.`
                : "Shown once you have a unit."
            }
          >
            <p className="text-sm font-semibold text-gray-900">
              {preview.headline}
            </p>
            <ol className="mt-3 space-y-2 list-decimal list-inside">
              {preview.steps.map((s) => (
                <li key={s} className="text-sm text-gray-700">
                  {s}
                </li>
              ))}
            </ol>
            {preview.note && (
              <p className="mt-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                {preview.note}
              </p>
            )}
            {preview.referenceMissing && (
              <p
                role="alert"
                className="mt-3 flex gap-2 text-sm text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0 mt-0.5"
                />
                This payment arrives with nothing tying it to a lease, so you
                will have to match it by hand. A paybill with the unit number as
                the account is the only option here that reconciles itself.
              </p>
            )}
          </Card>
        </div>
      )}
    </div>
  );
}
