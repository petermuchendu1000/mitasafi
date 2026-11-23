"use client";

/**
 * The building edit form.
 *
 * Validation runs in two places and that is on purpose: here, so a mistake is
 * pointed at the field that caused it without a round trip, and again inside the
 * server action, because a client can be bypassed and the columns it writes are
 * CHECK-constrained. The same function does both, so the two cannot disagree.
 *
 * There is no effect in this component. State changes come from the controls and
 * from the action's result, both of which are events.
 */

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  validateBuildingForm,
  managementTypeLabels,
  BUILDING_TYPES,
  BUILDING_STATUSES,
  MANAGEMENT_TYPES,
  type BuildingFormValues,
  type BuildingFormErrors,
} from "@/lib/landlord/building-form";
import {
  buildingTypeLabels,
  buildingStatusLabels,
  labelFor,
} from "@/lib/landlord/labels";
import { updateBuilding } from "./actions";

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

export function EditBuildingForm({
  buildingId,
  buildingName,
  initial,
}: {
  buildingId: string;
  buildingName: string;
  initial: BuildingFormValues;
}) {
  const router = useRouter();
  const [values, setValues] = useState<BuildingFormValues>(initial);
  const [errors, setErrors] = useState<BuildingFormErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const detailHref = `/dashboard/landlord/buildings/${buildingId}`;

  const set =
    (field: keyof BuildingFormValues) =>
    (
      e: React.ChangeEvent<
        HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
      >,
    ) => {
      const next = e.target.value;
      setValues((v) => ({ ...v, [field]: next }));
      // Clear the message for the field being corrected, so the form stops
      // shouting about something the user is in the middle of fixing.
      setErrors((prev) => {
        if (!prev[field]) return prev;
        const copy = { ...prev };
        delete copy[field];
        return copy;
      });
    };

  const dirty = (Object.keys(initial) as (keyof BuildingFormValues)[]).some(
    (k) => initial[k] !== values[k],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);

    const local = validateBuildingForm(values);
    if (!local.update) {
      setErrors(local.errors);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await updateBuilding(buildingId, values);
      if (result.ok) {
        router.push(detailHref);
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
          href={detailHref}
          aria-label="Back to building"
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Edit building</h1>
          <p className="text-sm text-gray-500">{buildingName}</p>
        </div>
      </div>

      <form onSubmit={onSubmit} noValidate>
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
          <h2 className="font-semibold text-gray-900 mb-4">The building</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Name" htmlFor="name" error={errors.name}>
                <input
                  id="name"
                  name="name"
                  type="text"
                  value={values.name}
                  onChange={set("name")}
                  aria-invalid={Boolean(errors.name)}
                  aria-describedby={errors.name ? "name-error" : undefined}
                  className={inputClass(Boolean(errors.name))}
                />
              </Field>
            </div>

            <Field
              label="Type"
              htmlFor="building_type"
              error={errors.building_type}
            >
              <select
                id="building_type"
                name="building_type"
                value={values.building_type}
                onChange={set("building_type")}
                aria-invalid={Boolean(errors.building_type)}
                className={inputClass(Boolean(errors.building_type))}
              >
                {!BUILDING_TYPES.includes(values.building_type) && (
                  <option value={values.building_type}>
                    {values.building_type === ""
                      ? "Choose a type…"
                      : `${values.building_type} (not a valid type)`}
                  </option>
                )}
                {BUILDING_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {labelFor(buildingTypeLabels, t)}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Floors"
              htmlFor="total_floors"
              error={errors.total_floors}
              hint="Leave blank if you would rather not say."
            >
              <input
                id="total_floors"
                name="total_floors"
                type="text"
                inputMode="numeric"
                value={values.total_floors}
                onChange={set("total_floors")}
                aria-invalid={Boolean(errors.total_floors)}
                className={inputClass(Boolean(errors.total_floors))}
              />
            </Field>

            <Field
              label="Year built"
              htmlFor="year_built"
              error={errors.year_built}
            >
              <input
                id="year_built"
                name="year_built"
                type="text"
                inputMode="numeric"
                value={values.year_built}
                onChange={set("year_built")}
                aria-invalid={Boolean(errors.year_built)}
                className={inputClass(Boolean(errors.year_built))}
              />
            </Field>

            <Field
              label="Plot number"
              htmlFor="plot_number"
              error={errors.plot_number}
            >
              <input
                id="plot_number"
                name="plot_number"
                type="text"
                value={values.plot_number}
                onChange={set("plot_number")}
                aria-invalid={Boolean(errors.plot_number)}
                className={inputClass(Boolean(errors.plot_number))}
              />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">Where it is</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Field label="Address" htmlFor="address" error={errors.address}>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={values.address}
                  onChange={set("address")}
                  aria-invalid={Boolean(errors.address)}
                  className={inputClass(Boolean(errors.address))}
                />
              </Field>
            </div>
            <Field
              label="Area or estate"
              htmlFor="area"
              error={errors.area}
              hint="This is what tenants search by."
            >
              <input
                id="area"
                name="area"
                type="text"
                value={values.area}
                onChange={set("area")}
                aria-invalid={Boolean(errors.area)}
                className={inputClass(Boolean(errors.area))}
              />
            </Field>
            <Field label="City" htmlFor="city" error={errors.city}>
              <input
                id="city"
                name="city"
                type="text"
                value={values.city}
                onChange={set("city")}
                aria-invalid={Boolean(errors.city)}
                className={inputClass(Boolean(errors.city))}
              />
            </Field>
          </div>
        </section>

        <section className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          <h2 className="font-semibold text-gray-900 mb-4">
            Management and status
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Field
              label="Managed by"
              htmlFor="management_type"
              error={errors.management_type}
            >
              <select
                id="management_type"
                name="management_type"
                value={values.management_type}
                onChange={set("management_type")}
                aria-invalid={Boolean(errors.management_type)}
                className={inputClass(Boolean(errors.management_type))}
              >
                {!MANAGEMENT_TYPES.includes(values.management_type) && (
                  <option value={values.management_type}>Choose…</option>
                )}
                {MANAGEMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {managementTypeLabels[t]}
                  </option>
                ))}
              </select>
            </Field>

            <Field
              label="Service charge"
              htmlFor="service_charge"
              error={errors.service_charge}
              hint="KES per month. Leave blank if there is none recorded."
            >
              <input
                id="service_charge"
                name="service_charge"
                type="text"
                inputMode="decimal"
                value={values.service_charge}
                onChange={set("service_charge")}
                aria-invalid={Boolean(errors.service_charge)}
                className={inputClass(Boolean(errors.service_charge))}
              />
            </Field>

            <Field
              label="Status"
              htmlFor="status"
              error={errors.status}
              hint="Archived buildings stay on record but drop out of your lists."
            >
              <select
                id="status"
                name="status"
                value={values.status}
                onChange={set("status")}
                aria-invalid={Boolean(errors.status)}
                className={inputClass(Boolean(errors.status))}
              >
                {!BUILDING_STATUSES.includes(values.status) && (
                  <option value={values.status}>Choose…</option>
                )}
                {BUILDING_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {labelFor(buildingStatusLabels, s)}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || !dirty}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {pending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            {pending ? "Saving…" : "Save changes"}
          </button>
          <Link
            href={detailHref}
            className="px-5 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </Link>
          {!dirty && !pending && (
            <span className="text-sm text-gray-400">Nothing changed yet</span>
          )}
        </div>
      </form>
    </div>
  );
}
