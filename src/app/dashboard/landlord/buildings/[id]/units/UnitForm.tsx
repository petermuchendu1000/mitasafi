"use client";

/**
 * The unit form, shared by Add Unit and Edit Unit.
 *
 * The unit detail page has always rendered an "Edit Unit" link pointing at
 * .../units/<id>/edit, and that route did not exist — a 404 from two places on
 * that page. Rather than build a second form for it, the add form takes a
 * `mode` and an initial value.
 *
 * Validation is the same function the server action runs, so the two cannot
 * disagree about what the CHECK constraints allow.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Loader2, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildUnitUpsert,
  UNIT_TYPE_VALUES,
  UNIT_STATUS_VALUES,
  FURNISHING_VALUES,
  UNIT_FEATURES,
  BEDROOMS_FOR_TYPE,
  type UnitFormValues,
  type UnitFormErrors,
} from "@/lib/landlord/unit-form";
import {
  unitTypeLabels,
  unitStatusLabels,
  labelFor,
} from "@/lib/landlord/labels";

const FURNISHING_LABELS: Record<string, string> = {
  unfurnished: "Unfurnished",
  partial: "Part furnished",
  fully_furnished: "Fully furnished",
};

function Field({
  label,
  htmlFor,
  error,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {label}
      </label>
      {children}
      {error ? (
        <p id={`${htmlFor}-error`} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}

const inputClass = (invalid: boolean) =>
  cn(
    "w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2",
    invalid
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
      : "border-gray-200 focus:border-teal-500 focus:ring-teal-500/20",
  );

export function UnitForm({
  mode,
  buildingId,
  buildingName,
  initial,
  onSubmit,
  cancelHref,
}: {
  mode: "create" | "edit";
  buildingId: string;
  buildingName: string;
  initial: UnitFormValues;
  onSubmit: (values: UnitFormValues) => Promise<{
    ok: boolean;
    unitId?: string;
    errors?: UnitFormErrors;
    message?: string;
  }>;
  cancelHref: string;
}) {
  const router = useRouter();
  const [values, setValues] = useState<UnitFormValues>(initial);
  const [errors, setErrors] = useState<UnitFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const set =
    (field: keyof UnitFormValues) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const next = e.target.value;
      setValues((v) => ({ ...v, [field]: next }));
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    };

  /** Picking "2 Bedroom" should fill in 2 bedrooms unless they said otherwise. */
  const onTypeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const type = e.target.value;
    setValues((v) => {
      const impliedBefore = BEDROOMS_FOR_TYPE[v.unit_type];
      const untouched =
        v.bedrooms === "" ||
        (impliedBefore !== undefined && v.bedrooms === String(impliedBefore));
      const implied = BEDROOMS_FOR_TYPE[type];
      return {
        ...v,
        unit_type: type,
        bedrooms:
          untouched && implied !== undefined ? String(implied) : v.bedrooms,
      };
    });
    setErrors((prev) => ({ ...prev, unit_type: undefined }));
  };

  const toggleFeature = (id: string) => {
    setValues((v) => ({
      ...v,
      features: v.features.includes(id)
        ? v.features.filter((f) => f !== id)
        : [...v.features, id],
    }));
  };

  const dirty = (Object.keys(initial) as (keyof UnitFormValues)[]).some((k) =>
    k === "features"
      ? initial.features.slice().sort().join() !==
        values.features.slice().sort().join()
      : initial[k] !== values[k],
  );

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const local = buildUnitUpsert(values);
    if (!local.values) {
      setErrors(local.errors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await onSubmit(values);
      if (result.ok) {
        router.push(
          result.unitId
            ? `/dashboard/landlord/buildings/${buildingId}/units/${result.unitId}`
            : cancelHref,
        );
        router.refresh();
        return;
      }
      if (result.errors) setErrors(result.errors);
      if (result.message) setMessage(result.message);
    });
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={cancelHref}
          aria-label="Back"
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">
            {mode === "create" ? "Add a unit" : "Edit unit"}
          </h1>
          <p className="text-sm text-gray-500">{buildingName}</p>
        </div>
      </div>

      <form onSubmit={submit} noValidate>
        {message && (
          <div
            role="alert"
            className="mb-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          >
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <p>{message}</p>
          </div>
        )}

        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">The unit</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Unit number or name"
              htmlFor="unit_number"
              error={errors.unit_number}
              hint="However you refer to it — A101, Shop 3, Garden House."
            >
              <input
                id="unit_number"
                type="text"
                value={values.unit_number}
                onChange={set("unit_number")}
                aria-invalid={Boolean(errors.unit_number)}
                className={inputClass(Boolean(errors.unit_number))}
              />
            </Field>

            <Field label="Type" htmlFor="unit_type" error={errors.unit_type}>
              <select
                id="unit_type"
                value={values.unit_type}
                onChange={onTypeChange}
                aria-invalid={Boolean(errors.unit_type)}
                className={inputClass(Boolean(errors.unit_type))}
              >
                <option value="">Choose a type…</option>
                {UNIT_TYPE_VALUES.map((t) => (
                  <option key={t} value={t}>
                    {labelFor(unitTypeLabels, t)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Floor"
              htmlFor="floor_level"
              error={errors.floor_level}
              hint="Ground, G, 1, Mezzanine — whatever it is called here."
            >
              <input
                id="floor_level"
                type="text"
                value={values.floor_level}
                onChange={set("floor_level")}
                className={inputClass(Boolean(errors.floor_level))}
              />
            </Field>

            <Field
              label="Wing or block"
              htmlFor="wing_block"
              error={errors.wing_block}
            >
              <input
                id="wing_block"
                type="text"
                value={values.wing_block}
                onChange={set("wing_block")}
                className={inputClass(Boolean(errors.wing_block))}
              />
            </Field>

            <Field label="Bedrooms" htmlFor="bedrooms" error={errors.bedrooms}>
              <input
                id="bedrooms"
                type="text"
                inputMode="numeric"
                value={values.bedrooms}
                onChange={set("bedrooms")}
                aria-invalid={Boolean(errors.bedrooms)}
                className={inputClass(Boolean(errors.bedrooms))}
              />
            </Field>

            <Field
              label="Bathrooms"
              htmlFor="bathrooms"
              error={errors.bathrooms}
              hint="1.5 means one full bathroom and a toilet."
            >
              <input
                id="bathrooms"
                type="text"
                inputMode="decimal"
                value={values.bathrooms}
                onChange={set("bathrooms")}
                aria-invalid={Boolean(errors.bathrooms)}
                className={inputClass(Boolean(errors.bathrooms))}
              />
            </Field>

            <Field
              label="Size"
              htmlFor="size_sqm"
              error={errors.size_sqm}
              hint="Square metres."
            >
              <input
                id="size_sqm"
                type="text"
                inputMode="decimal"
                value={values.size_sqm}
                onChange={set("size_sqm")}
                aria-invalid={Boolean(errors.size_sqm)}
                className={inputClass(Boolean(errors.size_sqm))}
              />
            </Field>

            <Field
              label="Furnishing"
              htmlFor="furnishing"
              error={errors.furnishing}
            >
              <select
                id="furnishing"
                value={values.furnishing}
                onChange={set("furnishing")}
                className={inputClass(Boolean(errors.furnishing))}
              >
                {FURNISHING_VALUES.map((f) => (
                  <option key={f} value={f}>
                    {FURNISHING_LABELS[f]}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Money</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Field
              label="Monthly rent"
              htmlFor="monthly_rent"
              error={errors.monthly_rent}
              hint="KES"
            >
              <input
                id="monthly_rent"
                type="text"
                inputMode="decimal"
                value={values.monthly_rent}
                onChange={set("monthly_rent")}
                aria-invalid={Boolean(errors.monthly_rent)}
                className={inputClass(Boolean(errors.monthly_rent))}
              />
            </Field>
            <Field
              label="Deposit"
              htmlFor="deposit_amount"
              error={errors.deposit_amount}
              hint="Leave blank if not set."
            >
              <input
                id="deposit_amount"
                type="text"
                inputMode="decimal"
                value={values.deposit_amount}
                onChange={set("deposit_amount")}
                aria-invalid={Boolean(errors.deposit_amount)}
                className={inputClass(Boolean(errors.deposit_amount))}
              />
            </Field>
            <Field
              label="Service charge"
              htmlFor="service_charge"
              error={errors.service_charge}
              hint="Per month, if charged separately."
            >
              <input
                id="service_charge"
                type="text"
                inputMode="decimal"
                value={values.service_charge}
                onChange={set("service_charge")}
                aria-invalid={Boolean(errors.service_charge)}
                className={inputClass(Boolean(errors.service_charge))}
              />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-1">Features</h2>
          <p className="text-xs text-gray-500 mb-4">
            Anything not ticked is recorded as absent, not as unknown.
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {UNIT_FEATURES.map((f) => {
              const on = values.features.includes(f.id);
              return (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => toggleFeature(f.id)}
                  aria-pressed={on}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition-colors",
                    on
                      ? "border-teal-500 bg-teal-50 text-teal-800"
                      : "border-gray-200 text-gray-700 hover:bg-gray-50",
                  )}
                >
                  <span
                    className={cn(
                      "w-4 h-4 rounded border flex items-center justify-center shrink-0",
                      on ? "bg-teal-600 border-teal-600" : "border-gray-300",
                    )}
                  >
                    {on && <Check className="w-3 h-3 text-white" />}
                  </span>
                  {f.label}
                </button>
              );
            })}
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Status and notes</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Status"
              htmlFor="status"
              error={errors.status}
              hint="Occupied is set for you when you add a tenant."
            >
              <select
                id="status"
                value={values.status}
                onChange={set("status")}
                className={inputClass(Boolean(errors.status))}
              >
                {UNIT_STATUS_VALUES.map((s) => (
                  <option key={s} value={s}>
                    {labelFor(unitStatusLabels, s)}
                  </option>
                ))}
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field
                label="Notes"
                htmlFor="description"
                error={errors.description}
                hint="Anything worth remembering about this unit."
              >
                <textarea
                  id="description"
                  rows={3}
                  value={values.description}
                  onChange={set("description")}
                  className={inputClass(false)}
                />
              </Field>
            </div>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || (mode === "edit" && !dirty)}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {pending
              ? "Saving…"
              : mode === "create"
                ? "Add unit"
                : "Save changes"}
          </button>
          <Link
            href={cancelHref}
            className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          {mode === "edit" && !dirty && !pending && (
            <span className="text-sm text-gray-400">Nothing changed yet</span>
          )}
        </div>
      </form>
    </div>
  );
}
