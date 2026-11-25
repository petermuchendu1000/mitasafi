"use client";

/**
 * Add Tenant — three steps, two tables.
 *
 * The step structure is kept from the page this replaces, because filling in a
 * tenant, their emergency contact and their lease terms in one scroll is worse.
 * What changed is that it writes, that the fields match the columns, and that
 * the two enums it offered are the ones the database permits.
 *
 * Validation is the same function the server action runs. The per-step check
 * is a filter over its errors rather than a second rule set, so a step cannot
 * pass here and fail there.
 */

import {
  cloneElement,
  isValidElement,
  useMemo,
  useState,
  useTransition,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  AlertCircle,
  Loader2,
  UserPlus,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildTenancy,
  ID_TYPE_VALUES,
  ID_TYPE_LABELS,
  LEASE_PAYMENT_METHODS,
  RELATIONSHIPS,
  type TenancyFormValues,
  type TenancyErrors,
} from "@/lib/landlord/tenancy-form";
import {
  paymentMethodLabels,
  labelFor,
  formatKes,
} from "@/lib/landlord/labels";
import { createTenancy } from "../actions";

/** Which step owns each field, so an error can be shown on the right one. */
const FIELD_STEP: Record<keyof TenancyFormValues, number> = {
  first_name: 1,
  last_name: 1,
  phone: 1,
  email: 1,
  id_type: 1,
  id_number: 1,
  occupation: 1,
  employer: 1,
  emergency_name: 2,
  emergency_phone: 2,
  emergency_relationship: 2,
  start_date: 3,
  end_date: 3,
  monthly_rent: 3,
  deposit_amount: 3,
  deposit_paid: 3,
  rent_due_day: 3,
  payment_method: 3,
  notes: 3,
};

const STEPS = [
  { number: 1, title: "The tenant" },
  { number: 2, title: "Emergency contact" },
  { number: 3, title: "Lease terms" },
];

const inputClass = (invalid: boolean) =>
  cn(
    "w-full px-3 py-2.5 border rounded-lg text-sm focus:outline-none focus:ring-2",
    invalid
      ? "border-red-300 focus:border-red-500 focus:ring-red-500/20"
      : "border-gray-200 focus:border-teal-500 focus:ring-teal-500/20",
  );

/**
 * A labelled control and whatever it has to say for itself.
 *
 * WHY THE ARIA IS INJECTED HERE AND NOT WRITTEN AT EACH CALL SITE
 *   Measured: this form displayed its errors in red and told a screen reader
 *   nothing. Rejecting a National ID left #id_number with aria-invalid=null
 *   and no aria-describedby, so the message existed only for sighted users --
 *   the same defect fixed in the two wizards, which did not cover this form.
 *
 *   All eighteen fields pass their control as the direct child, and every
 *   control's id already equals the htmlFor given here (both verified before
 *   writing this). So the message id can be DERIVED from htmlFor and injected,
 *   rather than hand-written eighteen times -- which is where wrong pairings
 *   come from. One source of truth, and nothing for a call site to get wrong.
 *
 *   It clones only a valid element, and only the direct child, so a future
 *   field that wraps its control in a div gets nothing rather than aria on the
 *   wrapper. That is the failure this is most likely to meet, and silence is
 *   the safe answer to it: the guard test below catches it instead.
 */
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
  const messageId = error
    ? `${htmlFor}-error`
    : hint
      ? `${htmlFor}-hint`
      : undefined;

  const control = isValidElement(children)
    ? cloneElement(children as React.ReactElement<Record<string, unknown>>, {
        "aria-invalid": error ? true : undefined,
        "aria-describedby": messageId,
      })
    : children;

  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700 mb-1.5"
      >
        {label}
      </label>
      {control}
      {error ? (
        <p id={messageId} className="mt-1.5 text-sm text-red-600">
          {error}
        </p>
      ) : hint ? (
        <p id={messageId} className="mt-1.5 text-xs text-gray-500">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** One year on from a date, which is what a Kenyan lease usually runs. */
function oneYearOn(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return "";
  const d = new Date(
    Date.UTC(Number(m[1]) + 1, Number(m[2]) - 1, Number(m[3])),
  );
  // A lease running to the same date next year ends the day before it.
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function AddTenantForm({
  buildingId,
  buildingName,
  unitId,
  unitNumber,
  defaultRent,
  defaultDeposit,
  alreadyLet,
}: {
  buildingId: string;
  buildingName: string;
  unitId: string;
  unitNumber: string;
  defaultRent: number;
  defaultDeposit: number;
  alreadyLet: boolean;
}) {
  const router = useRouter();
  const unitHref = `/dashboard/landlord/buildings/${buildingId}/units/${unitId}`;
  const todayIso = useMemo(
    () =>
      new Intl.DateTimeFormat("en-CA", {
        timeZone: "Africa/Nairobi",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date()),
    [],
  );

  const [step, setStep] = useState(1);
  const [values, setValues] = useState<TenancyFormValues>({
    first_name: "",
    last_name: "",
    phone: "",
    email: "",
    id_type: "national_id",
    id_number: "",
    occupation: "",
    employer: "",
    emergency_name: "",
    emergency_phone: "",
    emergency_relationship: "",
    start_date: todayIso,
    end_date: oneYearOn(todayIso),
    monthly_rent: defaultRent ? String(defaultRent) : "",
    deposit_amount: defaultDeposit ? String(defaultDeposit) : "",
    deposit_paid: false,
    rent_due_day: "5",
    payment_method: "mpesa",
    notes: "",
  });
  const [errors, setErrors] = useState<TenancyErrors>({});
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const today = {
    year: Number(todayIso.slice(0, 4)),
    month: Number(todayIso.slice(5, 7)),
    day: Number(todayIso.slice(8, 10)),
  };

  const set =
    (field: keyof TenancyFormValues) =>
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

  /** Moving the start date drags a year-long lease with it, unless edited. */
  const onStartChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const next = e.target.value;
    setValues((v) => ({
      ...v,
      start_date: next,
      end_date:
        v.end_date === "" || v.end_date === oneYearOn(v.start_date)
          ? oneYearOn(next)
          : v.end_date,
    }));
    setErrors((prev) => ({ ...prev, start_date: undefined }));
  };

  /** Errors belonging to one step, from the single shared rule set. */
  const errorsForStep = (n: number): TenancyErrors => {
    const all = buildTenancy(values, today).errors;
    const out: TenancyErrors = {};
    for (const [field, msg] of Object.entries(all)) {
      if (FIELD_STEP[field as keyof TenancyFormValues] === n) {
        out[field as keyof TenancyFormValues] = msg;
      }
    }
    return out;
  };

  const next = () => {
    const stepErrors = errorsForStep(step);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      return;
    }
    setErrors({});
    setStep((s) => Math.min(s + 1, 3));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const back = () => {
    setErrors({});
    setStep((s) => Math.max(s - 1, 1));
  };

  function submit(e: React.FormEvent) {
    e.preventDefault();

    // A submit can only mean the last step.
    //
    // MEASURED: without this, clicking "Continue" on step 2 CREATED THE
    // TENANCY. React reuses one <button> DOM node for the Continue/submit
    // pair because they sit in the same conditional slot, so setStep(3) flips
    // that node's type to "submit" while the browser is still processing the
    // click — and the activation behaviour that runs afterwards submits the
    // form. Two harness runs each wrote a tenant and a lease with the step-3
    // defaults the user had not seen yet.
    //
    // The distinct `key`s on those two buttons stop the node being reused and
    // are the actual fix. This guard is here because the cost of being wrong
    // about that is a tenancy created behind the user's back.
    if (step !== 3) {
      setStep(3);
      return;
    }

    setMessage(null);

    const local = buildTenancy(values, today);
    if (!local.tenant) {
      setErrors(local.errors);
      const firstField = Object.keys(local.errors)[0] as
        | keyof TenancyFormValues
        | undefined;
      if (firstField) setStep(FIELD_STEP[firstField] ?? 1);
      return;
    }
    setErrors({});

    startTransition(async () => {
      const result = await createTenancy(unitId, values);
      if (result.ok) {
        router.push(unitHref);
        router.refresh();
        return;
      }
      if (result.errors) {
        setErrors(result.errors);
        const firstField = Object.keys(result.errors)[0] as
          | keyof TenancyFormValues
          | undefined;
        if (firstField) setStep(FIELD_STEP[firstField] ?? 1);
      }
      if (result.message) setMessage(result.message);
    });
  }

  if (alreadyLet) {
    return (
      <div className="max-w-xl">
        <div className="mb-6 flex items-center gap-3">
          <Link
            href={unitHref}
            aria-label="Back to unit"
            className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <h1 className="text-xl font-semibold text-gray-900">Add a tenant</h1>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-full bg-amber-50 flex items-center justify-center">
            <AlertCircle className="w-7 h-7 text-amber-500" />
          </div>
          <h2 className="font-semibold text-gray-900 mb-2">
            Unit {unitNumber} already has a live lease
          </h2>
          <p className="text-gray-500 mb-6 max-w-sm mx-auto">
            Two live leases on one unit would double the rent it is counted as
            owing. End the current one before starting another.
          </p>
          <Link
            href={unitHref}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700"
          >
            Back to the unit
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex items-center gap-3">
        <Link
          href={unitHref}
          aria-label="Back to unit"
          className="p-2 -ml-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Add a tenant</h1>
          <p className="text-sm text-gray-500">
            Unit {unitNumber} · {buildingName}
          </p>
        </div>
      </div>

      {/* Steps */}
      <ol className="flex items-center gap-2 mb-6">
        {STEPS.map((s, i) => (
          <li key={s.number} className="flex items-center gap-2 flex-1">
            <div
              className={cn(
                "w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold shrink-0",
                step > s.number
                  ? "bg-teal-600 text-white"
                  : step === s.number
                    ? "bg-teal-50 text-teal-700 ring-2 ring-teal-500"
                    : "bg-gray-100 text-gray-400",
              )}
              aria-current={step === s.number ? "step" : undefined}
            >
              {step > s.number ? <Check className="w-4 h-4" /> : s.number}
            </div>
            <span
              className={cn(
                "text-sm whitespace-nowrap hidden sm:inline",
                step === s.number
                  ? "font-medium text-gray-900"
                  : "text-gray-500",
              )}
            >
              {s.title}
            </span>
            {i < STEPS.length - 1 && (
              <span className="flex-1 h-px bg-gray-200 ml-1" />
            )}
          </li>
        ))}
      </ol>

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

        <div className="bg-white rounded-xl border border-gray-200 p-5 mb-6">
          {step === 1 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="First name"
                htmlFor="first_name"
                error={errors.first_name}
              >
                <input
                  id="first_name"
                  type="text"
                  value={values.first_name}
                  onChange={set("first_name")}
                  aria-invalid={Boolean(errors.first_name)}
                  className={inputClass(Boolean(errors.first_name))}
                />
              </Field>
              <Field
                label="Last name"
                htmlFor="last_name"
                error={errors.last_name}
              >
                <input
                  id="last_name"
                  type="text"
                  value={values.last_name}
                  onChange={set("last_name")}
                  aria-invalid={Boolean(errors.last_name)}
                  className={inputClass(Boolean(errors.last_name))}
                />
              </Field>
              <Field
                label="Phone"
                htmlFor="phone"
                error={errors.phone}
                hint="0712345678 or +254712345678 — both are fine."
              >
                <input
                  id="phone"
                  type="tel"
                  value={values.phone}
                  onChange={set("phone")}
                  aria-invalid={Boolean(errors.phone)}
                  className={inputClass(Boolean(errors.phone))}
                />
              </Field>
              <Field
                label="Email"
                htmlFor="email"
                error={errors.email}
                hint="Optional."
              >
                <input
                  id="email"
                  type="email"
                  value={values.email}
                  onChange={set("email")}
                  aria-invalid={Boolean(errors.email)}
                  className={inputClass(Boolean(errors.email))}
                />
              </Field>
              <Field label="ID type" htmlFor="id_type" error={errors.id_type}>
                <select
                  id="id_type"
                  value={values.id_type}
                  onChange={set("id_type")}
                  className={inputClass(Boolean(errors.id_type))}
                >
                  {ID_TYPE_VALUES.map((t) => (
                    <option key={t} value={t}>
                      {ID_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </Field>
              <Field
                label="ID number"
                htmlFor="id_number"
                error={errors.id_number}
                hint="Optional, but worth having."
              >
                <input
                  id="id_number"
                  type="text"
                  value={values.id_number}
                  onChange={set("id_number")}
                  className={inputClass(Boolean(errors.id_number))}
                />
              </Field>
              <Field
                label="Occupation"
                htmlFor="occupation"
                error={errors.occupation}
              >
                <input
                  id="occupation"
                  type="text"
                  value={values.occupation}
                  onChange={set("occupation")}
                  className={inputClass(false)}
                />
              </Field>
              <Field
                label="Employer"
                htmlFor="employer"
                error={errors.employer}
              >
                <input
                  id="employer"
                  type="text"
                  value={values.employer}
                  onChange={set("employer")}
                  className={inputClass(false)}
                />
              </Field>
            </div>
          )}

          {step === 2 && (
            <>
              <p className="text-sm text-gray-500 mb-4">
                Who to call if something happens and the tenant cannot be
                reached. All of this is optional.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field
                  label="Name"
                  htmlFor="emergency_name"
                  error={errors.emergency_name}
                >
                  <input
                    id="emergency_name"
                    type="text"
                    value={values.emergency_name}
                    onChange={set("emergency_name")}
                    className={inputClass(false)}
                  />
                </Field>
                <Field
                  label="Relationship"
                  htmlFor="emergency_relationship"
                  error={errors.emergency_relationship}
                >
                  <select
                    id="emergency_relationship"
                    value={values.emergency_relationship}
                    onChange={set("emergency_relationship")}
                    className={inputClass(false)}
                  >
                    <option value="">—</option>
                    {RELATIONSHIPS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field
                  label="Phone"
                  htmlFor="emergency_phone"
                  error={errors.emergency_phone}
                >
                  <input
                    id="emergency_phone"
                    type="tel"
                    value={values.emergency_phone}
                    onChange={set("emergency_phone")}
                    aria-invalid={Boolean(errors.emergency_phone)}
                    className={inputClass(Boolean(errors.emergency_phone))}
                  />
                </Field>
              </div>
            </>
          )}

          {step === 3 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                label="Tenancy starts"
                htmlFor="start_date"
                error={errors.start_date}
              >
                <input
                  id="start_date"
                  type="date"
                  value={values.start_date}
                  onChange={onStartChange}
                  aria-invalid={Boolean(errors.start_date)}
                  className={inputClass(Boolean(errors.start_date))}
                />
              </Field>
              <Field
                label="Tenancy ends"
                htmlFor="end_date"
                error={errors.end_date}
                hint="Leave blank for a month-to-month tenancy."
              >
                <input
                  id="end_date"
                  type="date"
                  value={values.end_date}
                  onChange={set("end_date")}
                  aria-invalid={Boolean(errors.end_date)}
                  className={inputClass(Boolean(errors.end_date))}
                />
              </Field>
              <Field
                label="Monthly rent"
                htmlFor="monthly_rent"
                error={errors.monthly_rent}
                hint={
                  defaultRent
                    ? `The unit is set at ${formatKes(defaultRent)}.`
                    : "KES"
                }
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
                label="Rent due on"
                htmlFor="rent_due_day"
                error={errors.rent_due_day}
                hint="Day of the month, 1 to 28."
              >
                <input
                  id="rent_due_day"
                  type="text"
                  inputMode="numeric"
                  value={values.rent_due_day}
                  onChange={set("rent_due_day")}
                  aria-invalid={Boolean(errors.rent_due_day)}
                  className={inputClass(Boolean(errors.rent_due_day))}
                />
              </Field>
              <Field
                label="Deposit"
                htmlFor="deposit_amount"
                error={errors.deposit_amount}
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
                label="Paying by"
                htmlFor="payment_method"
                error={errors.payment_method}
              >
                <select
                  id="payment_method"
                  value={values.payment_method}
                  onChange={set("payment_method")}
                  className={inputClass(Boolean(errors.payment_method))}
                >
                  {LEASE_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {labelFor(paymentMethodLabels, m)}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="sm:col-span-2">
                <label className="flex items-start gap-3 p-3 rounded-lg border border-gray-200 cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={values.deposit_paid}
                    onChange={(e) =>
                      setValues((v) => ({
                        ...v,
                        deposit_paid: e.target.checked,
                      }))
                    }
                    className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-gray-900">
                      The deposit has been paid
                    </span>
                    <span className="block text-gray-500 text-xs mt-0.5">
                      Only tick this once the money is in. Deposits marked as
                      held are counted in your portfolio total.
                    </span>
                  </span>
                </label>
              </div>

              <div className="sm:col-span-2">
                <Field label="Notes" htmlFor="notes" error={errors.notes}>
                  <textarea
                    id="notes"
                    rows={3}
                    value={values.notes}
                    onChange={set("notes")}
                    className={inputClass(false)}
                  />
                </Field>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3">
          <div>
            {step > 1 && (
              <button
                type="button"
                onClick={back}
                className="inline-flex items-center gap-2 px-4 py-2.5 text-gray-700 font-medium rounded-xl border border-gray-200 hover:bg-gray-50"
              >
                <ArrowLeft className="w-4 h-4" />
                Back
              </button>
            )}
          </div>
          <div className="flex items-center gap-3">
            <Link
              href={unitHref}
              className="px-4 py-2.5 text-gray-600 hover:text-gray-900 text-sm"
            >
              Cancel
            </Link>
            {step < 3 ? (
              <button
                key="wizard-continue"
                type="button"
                onClick={next}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700"
              >
                Continue
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                key="wizard-submit"
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white font-medium rounded-xl hover:bg-teal-700 disabled:opacity-50"
              >
                {pending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <UserPlus className="w-4 h-4" />
                )}
                {pending ? "Saving…" : "Add tenant"}
              </button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
