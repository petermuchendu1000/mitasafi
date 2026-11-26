"use client";

/**
 * What the tenant actually reads before they send money.
 *
 * The instruction is built by the same function the landlord's preview uses,
 * so the two can never disagree. If they could, a landlord would be checking
 * one thing and their tenant following another.
 *
 * THE EMPTY STATE IS THE IMPORTANT ONE
 *   When the landlord has set no destination this page says so and names what
 *   to do about it. The alternative — a blank panel, or worse a plausible
 *   looking number — is how rent goes to the wrong account.
 */

import { useState } from "react";
import { Copy, Check, AlertTriangle, Receipt } from "lucide-react";
import { formatKes } from "@/lib/landlord/labels";
import {
  buildInstruction,
  type PayoutDestination,
} from "@/lib/landlord/payment-instructions";

export interface RentPayment {
  id: string;
  amount: number;
  type: string;
  status: string;
  date: string | null;
  receipt: string | null;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => {
        // Browser storage and clipboard both fail in some contexts; a failed
        // copy must not break the page the tenant is reading.
        navigator.clipboard?.writeText(value).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          },
          () => {},
        );
      }}
      className="inline-flex items-center gap-1 rounded border border-gray-300 px-2 py-0.5 text-xs text-gray-700 hover:bg-gray-50"
    >
      {done ? (
        <Check aria-hidden="true" className="w-3 h-3" />
      ) : (
        <Copy aria-hidden="true" className="w-3 h-3" />
      )}
      {done ? "Copied" : "Copy"}
    </button>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <main className="max-w-3xl mx-auto px-4 py-10 space-y-6">{children}</main>
    </div>
  );
}

export function RentClient(
  props:
    | { state: "not-a-tenant" }
    | { state: "no-lease" }
    | {
        state: "ok";
        tenantName: string;
        tenantPhone: string | null;
        unitNumber: string | null;
        buildingName: string | null;
        monthlyRent: number;
        rentDueDay: number | null;
        destination: PayoutDestination | null;
        payments: RentPayment[];
      },
) {
  if (props.state === "not-a-tenant") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">My rent</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-700">
            This account is not attached to a tenancy. If you rent through
            MitaSafi, ask your landlord to add you with the phone number on this
            account and it will appear here.
          </p>
        </div>
      </Shell>
    );
  }

  if (props.state === "no-lease") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">My rent</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-700">
            You have no current lease on MitaSafi. Past records stay with your
            landlord.
          </p>
        </div>
      </Shell>
    );
  }

  const {
    unitNumber,
    buildingName,
    monthlyRent,
    rentDueDay,
    destination,
    payments,
    tenantPhone,
  } = props;

  const instruction = destination
    ? buildInstruction(destination, { unitNumber, tenantPhone })
    : null;

  return (
    <Shell>
      <div>
        <h1 className="text-2xl font-bold text-gray-900">My rent</h1>
        <p className="mt-1 text-gray-500">
          {unitNumber ? `Unit ${unitNumber}` : "Your unit"}
          {buildingName && ` · ${buildingName}`}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Monthly rent
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {formatKes(monthlyRent)}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">
            Due each month
          </p>
          <p className="mt-1 text-2xl font-semibold text-gray-900">
            {rentDueDay ? `Day ${rentDueDay}` : "—"}
          </p>
          {!rentDueDay && (
            <p className="mt-1 text-xs text-gray-500">
              Your lease does not record a due day.
            </p>
          )}
        </div>
      </div>

      {/* ---- the instruction ---- */}
      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900">
          How to pay your rent
        </h2>

        {instruction === null ? (
          <div
            role="alert"
            className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
          >
            <AlertTriangle
              aria-hidden="true"
              className="w-4 h-4 shrink-0 mt-0.5 text-amber-700"
            />
            <p className="text-sm text-amber-900">
              Your landlord has not told MitaSafi where rent should be sent, so
              there is nothing to show you here. Ask them directly — do not use
              a number from anywhere else.
            </p>
          </div>
        ) : (
          <>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {instruction.headline}
            </p>

            <ol className="mt-3 space-y-2 list-decimal list-inside">
              {instruction.steps.map((s) => (
                <li key={s} className="text-sm text-gray-700">
                  {s}
                </li>
              ))}
            </ol>

            {instruction.reference && (
              <p className="mt-4 flex flex-wrap items-center gap-2 text-sm text-gray-800">
                <span className="text-gray-600">Account number to type:</span>
                <span className="font-mono font-semibold">
                  {instruction.reference}
                </span>
                <CopyButton
                  value={instruction.reference}
                  label="account number"
                />
              </p>
            )}

            {instruction.note && (
              <p className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3 text-sm text-gray-700">
                {instruction.note}
              </p>
            )}

            {instruction.referenceMissing && (
              <p
                role="alert"
                className="mt-3 flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0 mt-0.5"
                />
                This way of paying carries nothing that identifies you, so send
                your landlord the M-Pesa confirmation code once you have paid.
                Otherwise it may not be matched to your account.
              </p>
            )}

            <p className="mt-4 text-xs text-gray-500">
              You are paying your landlord directly. MitaSafi does not receive
              or hold your rent — it records what was paid.
            </p>
          </>
        )}
      </section>

      {/* ---- what has been recorded ---- */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="px-5 py-3 text-base font-semibold text-gray-900 border-b border-gray-200">
          Payments recorded
        </h2>
        {payments.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            Nothing recorded yet. A payment appears here once your landlord
            records it.
          </p>
        ) : (
          <table className="w-full text-sm">
            <caption className="sr-only">
              Payments your landlord has recorded against this lease
            </caption>
            <thead className="bg-gray-50 text-left text-gray-600">
              <tr>
                <th scope="col" className="px-5 py-2 font-medium">
                  Date
                </th>
                <th scope="col" className="px-5 py-2 font-medium">
                  For
                </th>
                <th scope="col" className="px-5 py-2 font-medium">
                  Code
                </th>
                <th scope="col" className="px-5 py-2 font-medium text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-2.5 text-gray-700">{p.date ?? "—"}</td>
                  <td className="px-5 py-2.5 text-gray-700 capitalize">
                    {p.type.replace(/_/g, " ")}
                    {p.status !== "confirmed" && (
                      <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-200">
                        {p.status}
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">
                    {p.receipt ?? "—"}
                  </td>
                  <td className="px-5 py-2.5 text-right text-gray-900">
                    {formatKes(p.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="px-5 py-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500">
          <Receipt aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          This is what your landlord has recorded. If a payment you made is
          missing, send them the confirmation code — you cannot add it here, and
          neither can anyone else pretending to be you.
        </p>
      </section>
    </Shell>
  );
}
