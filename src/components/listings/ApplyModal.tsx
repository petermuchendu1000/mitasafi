"use client";

/**
 * The tenant-facing application form.
 *
 * WHY EVERY FINANCIAL FIELD IS OPTIONAL
 *   Income, employer and household size are the fields a landlord most wants
 *   and the ones an applicant is least obliged to give. Making them required
 *   would turn "apply" into "disclose or leave", so they are optional and the
 *   form says who sees them. Only a name and a phone number are required,
 *   which is what the database requires too.
 *
 * Labels are associated by htmlFor/id — the same derived-id rule the landlord
 * wizards were fixed to follow — and the error is announced, not just coloured.
 */

import { useId, useState, useTransition } from "react";
import { X } from "lucide-react";
import {
  submitRentalApplication,
  type ApplicationInput,
} from "@/app/listings/[slug]/actions";

/**
 * Declared at module scope on purpose. Defined inside ApplyModal it would be a
 * NEW component type on every render, so React would unmount and remount every
 * input underneath it — losing focus on each keystroke in a form whose whole
 * job is typing. eslint caught this; the form looked fine until you typed.
 */
function Field({
  htmlFor,
  label,
  hint,
  children,
}: {
  htmlFor: string;
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label
        htmlFor={htmlFor}
        className="block text-sm font-medium text-gray-700"
      >
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1 text-xs text-gray-500">
          {hint}
        </p>
      )}
    </div>
  );
}

function toNumber(value: string): number | null {
  const t = value.trim();
  if (t === "") return null;
  const n = Number(t);
  // Number("") is 0 and finite; the empty case is handled above so this is safe.
  return Number.isFinite(n) && n >= 0 ? n : null;
}

export function ApplyModal({
  isOpen,
  onClose,
  listingId,
  listingTitle,
  isAuthenticated,
  userName,
  userEmail,
  userPhone,
}: {
  isOpen: boolean;
  onClose: () => void;
  listingId: string;
  listingTitle: string;
  isAuthenticated: boolean;
  userName?: string | null;
  userEmail?: string | null;
  userPhone?: string | null;
}) {
  const uid = useId();
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const [form, setForm] = useState({
    fullName: userName ?? "",
    email: userEmail ?? "",
    phone: userPhone ?? "",
    occupation: "",
    employer: "",
    monthlyIncome: "",
    householdSize: "",
    moveInDate: "",
    leaseMonths: "",
    message: "",
  });

  if (!isOpen) return null;

  const set = (k: keyof typeof form) => (v: string) =>
    setForm((f) => ({ ...f, [k]: v }));

  const id = (field: string) => `${uid}-${field}`;
  const errorId = `${uid}-error`;

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const payload: ApplicationInput = {
      listingId,
      fullName: form.fullName,
      email: form.email || null,
      phone: form.phone,
      occupation: form.occupation || null,
      employer: form.employer || null,
      monthlyIncome: toNumber(form.monthlyIncome),
      householdSize: toNumber(form.householdSize),
      moveInDate: form.moveInDate || null,
      leaseMonths: toNumber(form.leaseMonths),
      message: form.message || null,
    };
    startTransition(async () => {
      const r = await submitRentalApplication(payload);
      if (r.success) setDone(true);
      else setError(r.error ?? "Could not send your application.");
    });
  }

  const input =
    "mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`${uid}-title`}
    >
      <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between px-6 py-4 border-b border-gray-200">
          <div>
            <h2
              id={`${uid}-title`}
              className="text-lg font-semibold text-gray-900"
            >
              Apply for this home
            </h2>
            <p className="text-sm text-gray-500">{listingTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="min-w-11 min-h-11 grid place-items-center rounded-lg hover:bg-gray-100"
          >
            <X aria-hidden="true" className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {done ? (
          <div className="px-6 py-10 text-center">
            <p className="text-base font-semibold text-gray-900">
              Your application is with the landlord.
            </p>
            <p className="mt-2 text-sm text-gray-600">
              You can withdraw it at any time until they decide.
            </p>
            <button
              type="button"
              onClick={onClose}
              className="mt-6 px-4 min-h-11 rounded-lg bg-[#103f34] hover:bg-[#15604e] text-white text-sm font-medium"
            >
              Done
            </button>
          </div>
        ) : !isAuthenticated ? (
          <div className="px-6 py-10 text-center">
            <p className="text-sm text-gray-700">
              Sign in to send an application and see when the landlord responds.
            </p>
            <a
              href={`/login?redirectTo=${encodeURIComponent(`/listings/${listingId}`)}`}
              className="mt-6 inline-flex min-h-11 items-center px-4 rounded-lg bg-[#103f34] hover:bg-[#15604e] text-white text-sm font-medium"
            >
              Sign in to apply
            </a>
          </div>
        ) : (
          <form onSubmit={submit} className="px-6 py-5 space-y-4">
            <Field htmlFor={id("fullName")} label="Your name">
              <input
                id={id("fullName")}
                required
                value={form.fullName}
                onChange={(e) => set("fullName")(e.target.value)}
                className={input}
              />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field htmlFor={id("phone")} label="Phone">
                <input
                  id={id("phone")}
                  required
                  inputMode="tel"
                  value={form.phone}
                  onChange={(e) => set("phone")(e.target.value)}
                  className={input}
                />
              </Field>
              <Field htmlFor={id("email")} label="Email (optional)">
                <input
                  id={id("email")}
                  type="email"
                  value={form.email}
                  onChange={(e) => set("email")(e.target.value)}
                  className={input}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field htmlFor={id("occupation")} label="What you do (optional)">
                <input
                  id={id("occupation")}
                  value={form.occupation}
                  onChange={(e) => set("occupation")(e.target.value)}
                  className={input}
                />
              </Field>
              <Field htmlFor={id("employer")} label="Employer (optional)">
                <input
                  id={id("employer")}
                  value={form.employer}
                  onChange={(e) => set("employer")(e.target.value)}
                  className={input}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field
                htmlFor={id("monthlyIncome")}
                label="Monthly income (optional)"
                hint="Only this landlord sees it. It is not checked or scored."
              >
                <input
                  id={id("monthlyIncome")}
                  inputMode="numeric"
                  aria-describedby={`${id("monthlyIncome")}-hint`}
                  value={form.monthlyIncome}
                  onChange={(e) => set("monthlyIncome")(e.target.value)}
                  className={input}
                />
              </Field>
              <Field
                htmlFor={id("householdSize")}
                label="People moving in (optional)"
              >
                <input
                  id={id("householdSize")}
                  inputMode="numeric"
                  value={form.householdSize}
                  onChange={(e) => set("householdSize")(e.target.value)}
                  className={input}
                />
              </Field>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Field htmlFor={id("moveInDate")} label="Move in from (optional)">
                <input
                  id={id("moveInDate")}
                  type="date"
                  value={form.moveInDate}
                  onChange={(e) => set("moveInDate")(e.target.value)}
                  className={input}
                />
              </Field>
              <Field
                htmlFor={id("leaseMonths")}
                label="For how many months (optional)"
              >
                <input
                  id={id("leaseMonths")}
                  inputMode="numeric"
                  value={form.leaseMonths}
                  onChange={(e) => set("leaseMonths")(e.target.value)}
                  className={input}
                />
              </Field>
            </div>

            <Field
              htmlFor={id("message")}
              label="Anything you want them to know (optional)"
            >
              <textarea
                id={id("message")}
                rows={3}
                value={form.message}
                onChange={(e) => set("message")(e.target.value)}
                className={input}
              />
            </Field>

            {error && (
              <p id={errorId} role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={pending}
              aria-describedby={error ? errorId : undefined}
              className="w-full min-h-11 py-2.5 rounded-lg bg-[#103f34] hover:bg-[#15604e] text-white font-medium disabled:opacity-60"
            >
              {pending ? "Sending…" : "Send application"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
