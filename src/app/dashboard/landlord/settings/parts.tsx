"use client";

/**
 * Shared pieces for the settings tabs.
 *
 * `Switch` carries a `notYet` note rather than hiding or disabling the
 * control. Disabling it would tell the landlord they cannot express a
 * preference; hiding it would pretend the setting does not exist. Saying
 * "saved, but not in effect, because X" tells the truth and still records
 * what they want.
 */

import type { ReactNode } from "react";

export function Card({
  title,
  description,
  children,
}: {
  title?: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="bg-white rounded-xl border border-gray-200 p-5">
      {title && (
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      )}
      {description && (
        <p className="mt-1 text-sm text-gray-500">{description}</p>
      )}
      <div className={title || description ? "mt-4" : ""}>{children}</div>
    </section>
  );
}

export function Switch({
  id,
  checked,
  onChange,
  label,
  description,
  notYet,
  disabled,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
  description?: string;
  notYet?: string;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 py-3.5 border-t border-gray-100 first:border-t-0 first:pt-0">
      <div className="min-w-0">
        <label htmlFor={id} className="text-sm font-medium text-gray-800">
          {label}
        </label>
        {description && (
          <p className="text-xs text-gray-500 mt-0.5">{description}</p>
        )}
        {notYet && (
          <p className="text-xs text-amber-700 mt-1 bg-amber-50 border border-amber-200 rounded px-2 py-1 inline-block">
            {notYet}
          </p>
        )}
      </div>
      {/* Innago prints Off and On either side of the control. It costs two
          words and removes the guess about which way is which. */}
      <span className="shrink-0 mt-1 flex items-center gap-2">
        <span
          aria-hidden="true"
          className={`text-xs ${checked ? "text-gray-400" : "font-semibold text-gray-700"}`}
        >
          Off
        </span>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          disabled={disabled}
          onClick={() => onChange(!checked)}
          className={`shrink-0 w-11 h-6 rounded-full transition-colors disabled:opacity-50 ${
            checked ? "bg-teal-600" : "bg-gray-300"
          }`}
        >
          <span
            className={`block w-5 h-5 bg-white rounded-full shadow transform transition-transform ${
              checked ? "translate-x-5" : "translate-x-0.5"
            }`}
          />
        </button>
        <span
          aria-hidden="true"
          className={`text-xs ${checked ? "font-semibold text-teal-700" : "text-gray-400"}`}
        >
          On
        </span>
      </span>
    </div>
  );
}

export function NumberField({
  id,
  label,
  value,
  onChange,
  suffix,
  min,
  max,
}: {
  id: string;
  label: string;
  value: number;
  onChange: (n: number) => void;
  suffix?: string;
  min?: number;
  max?: number;
}) {
  return (
    <span className="inline-flex items-center gap-2">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        value={value}
        onChange={(e) => {
          // Number("") is 0 and finite — the empty box must not silently
          // become zero, so it is ignored until a real number is typed.
          const raw = e.target.value;
          if (raw.trim() === "") return;
          const n = Number(raw);
          if (Number.isInteger(n)) onChange(n);
        }}
        className="w-20 rounded-lg border border-gray-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
      />
      {suffix && <span className="text-xs text-gray-500">{suffix}</span>}
    </span>
  );
}

export function Radio({
  name,
  value,
  current,
  onChange,
  label,
}: {
  name: string;
  value: string;
  current: string;
  onChange: (v: string) => void;
  label: string;
}) {
  const id = `${name}-${value}`;
  return (
    <span className="inline-flex items-center gap-2">
      <input
        id={id}
        type="radio"
        name={name}
        checked={current === value}
        onChange={() => onChange(value)}
        className="w-4 h-4 text-teal-600"
      />
      <label htmlFor={id} className="text-sm text-gray-800">
        {label}
      </label>
    </span>
  );
}

export function SaveBar({
  dirty,
  saving,
  message,
  onSave,
}: {
  dirty: boolean;
  saving: boolean;
  message: string | null;
  onSave: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-2">
      <button
        type="button"
        onClick={onSave}
        disabled={!dirty || saving}
        className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
      >
        {saving ? "Saving…" : "Save changes"}
      </button>
      {message && (
        <p role="status" className="text-sm text-gray-600">
          {message}
        </p>
      )}
      {dirty && !message && (
        <p className="text-sm text-amber-700">Unsaved changes</p>
      )}
    </div>
  );
}

/** Shown in place of a tab whose storage is not deployed yet. */
export function NotEnabled({ what }: { what: string }) {
  return (
    <Card>
      <p className="text-sm text-gray-700">
        {what} is not switched on in this environment yet — the database change
        that stores it has not been applied. This is not an empty list; nothing
        can be saved until it is in place.
      </p>
    </Card>
  );
}
