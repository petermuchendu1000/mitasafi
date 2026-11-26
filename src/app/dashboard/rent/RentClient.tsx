"use client";

/**
 * The tenant's tenancy, in one place.
 *
 * COPY IS DELIBERATELY SHORT. A tenant comes here to answer "how much, by
 * when, where to send it" and leave. Labels, not sentences. The few places
 * that do carry a sentence are the ones where a short label would mislead:
 * no destination set, money received but not applied, and a payment the
 * landlord has not recorded.
 *
 * The instruction is built by the same function the landlord's preview uses,
 * so the two can never disagree — a landlord checking one thing while their
 * tenant follows another is how rent reaches the wrong account.
 */

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Copy,
  Check,
  AlertTriangle,
  Receipt,
  Home,
  FileText,
  Wrench,
  CalendarClock,
} from "lucide-react";
import { formatKes } from "@/lib/landlord/labels";
import {
  buildInstruction,
  type PayoutDestination,
} from "@/lib/landlord/payment-instructions";
import type { Statement } from "@/lib/landlord/statement";
import { duePhrase, type TenancySummary } from "@/lib/tenant/summary";
import { submitRepairRequest } from "./actions";
import {
  REPAIR_CATEGORIES,
  REPAIR_URGENCIES,
  CATEGORY_LABEL,
} from "@/lib/tenant/repairs";

export interface RentPayment {
  id: string;
  amount: number;
  type: string;
  status: string;
  date: string | null;
  receipt: string | null;
  method?: string | null;
  period?: string | null;
}

export interface TenantRepair {
  id: string;
  title: string | null;
  category: string | null;
  status: string | null;
  urgency: string | null;
  reportedAt: string | null;
  completedAt: string | null;
}

function CopyButton({ value, label }: { value: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      aria-label={`Copy ${label}`}
      onClick={() => {
        navigator.clipboard?.writeText(value).then(
          () => {
            setDone(true);
            setTimeout(() => setDone(false), 1500);
          },
          () => {},
        );
      }}
      // 44px tall. At 22px this was the smallest control on the page and
      // the most tapped one on it.
      className="inline-flex min-h-11 items-center gap-1.5 rounded-lg border border-gray-300 px-3 text-sm text-gray-700 hover:bg-gray-50"
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

/**
 * No <main> here. This renders INSIDE CustomerDashboardShell, which already
 * provides the main landmark — a second one gives the page two, and a screen
 * reader user then has to guess which is the content.
 */
/**
 * Reporting a repair.
 *
 * It asks for six things and sends none of the ids: the unit, the landlord
 * and the tenant are derived by the database from the reporter's own lease,
 * so this form cannot file a repair against anybody else.
 */
function RepairForm({ onDone }: { onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState("plumbing");
  const [urgency, setUrgency] = useState("normal");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  const [access, setAccess] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [busy, start] = useTransition();

  if (!open) {
    return (
      <div className="px-5 py-4 border-b border-gray-200">
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            setSent(false);
          }}
          className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium"
        >
          Report a repair
        </button>
        {sent && (
          <p role="status" className="mt-2 text-sm text-teal-800">
            Sent. Your landlord has been told.
          </p>
        )}
      </div>
    );
  }

  return (
    <form
      className="px-5 py-4 border-b border-gray-200 space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        setError(null);
        start(async () => {
          const r = await submitRepairRequest({
            category,
            title,
            description,
            urgency,
            preferredTime,
            accessInstructions: access,
          });
          if (r.success) {
            setOpen(false);
            setSent(true);
            setTitle("");
            setDescription("");
            setPreferredTime("");
            setAccess("");
            onDone();
          } else {
            setError(r.error ?? "Could not send that.");
          }
        });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="rp-cat" className="block text-xs text-gray-600">
            Category
          </label>
          <select
            id="rp-cat"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {REPAIR_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABEL[c] ?? c}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="rp-urg" className="block text-xs text-gray-600">
            Urgency
          </label>
          <select
            id="rp-urg"
            value={urgency}
            onChange={(e) => setUrgency(e.target.value)}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          >
            {REPAIR_URGENCIES.map((u) => (
              <option key={u} value={u}>
                {u === "emergency"
                  ? "Emergency"
                  : u[0].toUpperCase() + u.slice(1)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label htmlFor="rp-title" className="block text-xs text-gray-600">
          What is wrong
        </label>
        <input
          id="rp-title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={200}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="Kitchen tap drips"
        />
      </div>

      <div>
        <label htmlFor="rp-desc" className="block text-xs text-gray-600">
          Details
        </label>
        <textarea
          id="rp-desc"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={4000}
          className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
          placeholder="When it started, how bad it is."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label htmlFor="rp-time" className="block text-xs text-gray-600">
            Best time (optional)
          </label>
          <input
            id="rp-time"
            value={preferredTime}
            onChange={(e) => setPreferredTime(e.target.value)}
            maxLength={200}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Weekday mornings"
          />
        </div>
        <div>
          <label htmlFor="rp-acc" className="block text-xs text-gray-600">
            Access (optional)
          </label>
          <input
            id="rp-acc"
            value={access}
            onChange={(e) => setAccess(e.target.value)}
            maxLength={500}
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            placeholder="Spare key with the caretaker"
          />
        </div>
      </div>

      {error && (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
        >
          {busy ? "Sending…" : "Send"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700"
        >
          Cancel
        </button>
      </div>
      <p className="text-xs text-gray-500">
        No photos yet. For an emergency, call your landlord too.
      </p>
    </form>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="max-w-4xl space-y-6">{children}</div>;
}

/** A small fact. Three fit across a 360px screen without wrapping. */
function Fact({ k, v, sub }: { k: string; v: string; sub?: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white px-2 py-3">
      <dt className="text-[11px] uppercase tracking-wide text-gray-500">{k}</dt>
      <dd className="mt-0.5 text-sm font-semibold text-gray-900 break-words">
        {v}
      </dd>
      {sub && <dd className="text-[11px] text-gray-500">{sub}</dd>}
    </div>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex justify-between gap-4 py-2 border-b border-gray-100 last:border-0">
      <dt className="text-sm text-gray-500">{k}</dt>
      <dd className="text-sm text-gray-900 text-right">{v}</dd>
    </div>
  );
}

type TabId = "pay" | "statement" | "payments" | "lease" | "repairs";

export interface RentOkProps {
  state: "ok";
  tenantName: string;
  tenantPhone: string | null;
  unitNumber: string | null;
  buildingName: string | null;
  area: string | null;
  accessInstructions: string | null;
  bedrooms: number | null;
  bathrooms: number | null;
  monthlyRent: number;
  rentDueDay: number | null;
  gracePeriodDays: number;
  leaseStart: string;
  leaseEnd: string | null;
  leaseStatus: string;
  noticePeriodMonths: number | null;
  leaseDocumentUrl: string | null;
  depositStatus: string | null;
  destination: PayoutDestination | null;
  summary: TenancySummary;
  statement: Statement;
  payments: RentPayment[];
  maintenance: TenantRepair[];
  today: string;
}

export function RentClient(
  props: { state: "not-a-tenant" } | { state: "no-lease" } | RentOkProps,
) {
  const [tab, setTab] = useState<TabId>("pay");
  const router = useRouter();

  if (props.state === "not-a-tenant") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">My home</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-700">
            No tenancy on this account. Ask your landlord to add you using the
            phone number you signed up with.
          </p>
        </div>
      </Shell>
    );
  }

  if (props.state === "no-lease") {
    return (
      <Shell>
        <h1 className="text-2xl font-bold text-gray-900">My home</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-700">
            No current lease. Your landlord keeps the older records.
          </p>
        </div>
      </Shell>
    );
  }

  const {
    unitNumber,
    buildingName,
    area,
    accessInstructions,
    bedrooms,
    bathrooms,
    monthlyRent,
    rentDueDay,
    gracePeriodDays,
    leaseStart,
    leaseEnd,
    leaseStatus,
    noticePeriodMonths,
    leaseDocumentUrl,
    depositStatus,
    destination,
    summary,
    statement,
    payments,
    maintenance,
    tenantPhone,
    today,
  } = props;

  const instruction = destination
    ? buildInstruction(destination, { unitNumber, tenantPhone })
    : null;

  const owingTone =
    summary.status === "paid"
      ? "text-teal-700"
      : summary.daysLate > 0
        ? "text-red-700"
        : "text-amber-900";

  const TABS: { id: TabId; label: string; count?: number }[] = [
    { id: "pay", label: "Pay" },
    { id: "statement", label: "Statement" },
    { id: "payments", label: "Payments", count: payments.length },
    { id: "lease", label: "Lease" },
    { id: "repairs", label: "Repairs", count: maintenance.length },
  ];

  return (
    <Shell>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {unitNumber ? `Unit ${unitNumber}` : "My home"}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {[buildingName, area].filter(Boolean).join(" · ") || "-"}
            {bedrooms ? ` · ${bedrooms} bed` : ""}
            {bathrooms ? ` · ${bathrooms} bath` : ""}
          </p>
        </div>
        <span className="px-2.5 py-1 rounded-full text-xs border border-gray-300 text-gray-700 capitalize">
          {leaseStatus.replace(/_/g, " ")}
        </span>
      </div>

      {/* What they owe, then the rest small. On a phone one number should
          dominate; four equal tiles made every number wrap onto two lines. */}
      <div className="rounded-xl border border-gray-200 bg-white p-4">
        <p className="text-xs uppercase tracking-wide text-gray-500">
          This month
        </p>
        <p className={`mt-1 text-3xl font-semibold ${owingTone}`}>
          {summary.balance > 0 ? formatKes(summary.balance) : "Clear"}
        </p>
        <p className="mt-0.5 text-sm text-gray-600">{duePhrase(summary)}</p>
      </div>

      <dl className="grid grid-cols-3 gap-2 text-center">
        {/* No "KES" prefix here. At 360px it pushed the figure onto a
            second line in every one of these; the currency is obvious from
            the card above and exact on the Lease tab. */}
        <Fact
          k="Rent"
          v={formatKes(monthlyRent).replace("KES ", "")}
          sub={rentDueDay ? `Day ${rentDueDay}` : "No due day"}
        />
        <Fact
          k="Deposit"
          v={formatKes(summary.depositHeld).replace("KES ", "")}
          sub={depositStatus ?? "held"}
        />
        <Fact
          k="Lease ends"
          v={leaseEnd ?? "Open"}
          sub={
            summary.daysUntilEnd === null
              ? ""
              : summary.daysUntilEnd < 0
                ? `${Math.abs(summary.daysUntilEnd)}d ago`
                : `${summary.daysUntilEnd}d`
          }
        />
      </dl>

      {summary.daysUntilEnd !== null &&
        summary.daysUntilEnd >= 0 &&
        summary.daysUntilEnd <= 60 && (
          <p className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <CalendarClock
              aria-hidden="true"
              className="w-4 h-4 shrink-0 mt-0.5"
            />
            Lease ends in {summary.daysUntilEnd} days.
            {noticePeriodMonths
              ? ` Notice period ${noticePeriodMonths} month${noticePeriodMonths === 1 ? "" : "s"}.`
              : ""}
          </p>
        )}

      <div
        role="tablist"
        aria-label="My home"
        className="flex gap-1 overflow-x-auto border-b border-gray-200 -mx-4 px-4 sm:mx-0 sm:px-0"
      >
        {TABS.map((t) => (
          <button
            key={t.id}
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`shrink-0 whitespace-nowrap px-4 min-h-11 text-sm font-medium border-b-2 -mb-px ${
              tab === t.id
                ? "border-teal-600 text-teal-700"
                : "border-transparent text-gray-600 hover:text-gray-900"
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count > 0 && (
              <span className="ml-1.5 text-xs text-gray-400">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {/* ---------------- pay ---------------- */}
        {tab === "pay" && (
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            {instruction === null ? (
              <div
                role="alert"
                className="flex gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3"
              >
                <AlertTriangle
                  aria-hidden="true"
                  className="w-4 h-4 shrink-0 mt-0.5 text-amber-700"
                />
                <p className="text-sm text-amber-900">
                  Your landlord has not set where rent should be sent. Ask them.
                  Do not use a number from anywhere else.
                </p>
              </div>
            ) : (
              <>
                <p className="text-sm font-semibold text-gray-900">
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
                    <span className="text-gray-600">Account number:</span>
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
                    This way of paying carries nothing that identifies you. Send
                    your landlord the M-Pesa code once you have paid.
                  </p>
                )}
                <p className="mt-4 text-xs text-gray-500">
                  You pay your landlord directly. MitaSafi never receives or
                  holds your rent, and will never ask for your M-Pesa PIN.
                </p>
              </>
            )}
          </section>
        )}

        {/* ---------------- statement ---------------- */}
        {tab === "statement" && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {statement.lines.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                No rent recorded against this lease yet.
              </p>
            ) : (
              <>
                <p className="px-5 py-2.5 text-xs text-gray-500 bg-gray-50 border-b border-gray-200">
                  {statement.from} to {statement.to}. Starts at the first month
                  your landlord recorded rent.
                </p>
                {/* Phones: month and balance on one line, the detail
                    under it. The four column table clipped the balance. */}
                <ul className="divide-y divide-gray-100 sm:hidden">
                  {statement.lines.map((l) => (
                    <li key={l.key} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm text-gray-900">
                          {l.period}
                        </span>
                        <span
                          className={`text-sm font-medium ${
                            l.balance > 0
                              ? "text-amber-900"
                              : l.balance < 0
                                ? "text-teal-800"
                                : "text-gray-400"
                          }`}
                        >
                          {l.balance === 0
                            ? "Clear"
                            : l.balance > 0
                              ? formatKes(l.balance)
                              : `(${formatKes(-l.balance)})`}
                        </span>
                      </div>
                      <p className="mt-0.5 text-xs text-gray-500">
                        Charged {formatKes(l.charged)} · Paid{" "}
                        {l.paid > 0 ? formatKes(l.paid) : "nothing"}
                      </p>
                    </li>
                  ))}
                  <li className="px-4 py-3 bg-gray-50 flex items-baseline justify-between gap-3">
                    <span className="text-sm font-medium text-gray-900">
                      Total
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        statement.closingBalance > 0
                          ? "text-amber-900"
                          : "text-teal-800"
                      }`}
                    >
                      {statement.closingBalance > 0
                        ? `${formatKes(statement.closingBalance)} owing`
                        : statement.closingBalance < 0
                          ? `${formatKes(-statement.closingBalance)} in credit`
                          : "Clear"}
                    </span>
                  </li>
                </ul>

                <table className="hidden w-full text-sm sm:table">
                  <caption className="sr-only">
                    Rent charged and paid each month, with a running balance
                  </caption>
                  <thead className="bg-gray-50 text-left text-gray-600">
                    <tr>
                      <th scope="col" className="px-5 py-2 font-medium">
                        Month
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2 font-medium text-right"
                      >
                        Charged
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2 font-medium text-right"
                      >
                        Paid
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2 font-medium text-right"
                      >
                        Balance
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {statement.lines.map((l) => (
                      <tr key={l.key}>
                        <td className="px-5 py-2.5 text-gray-700">
                          {l.period}
                        </td>
                        <td className="px-5 py-2.5 text-right text-gray-600">
                          {formatKes(l.charged)}
                        </td>
                        <td className="px-5 py-2.5 text-right text-gray-900">
                          {l.paid > 0 ? formatKes(l.paid) : "-"}
                        </td>
                        <td
                          className={`px-5 py-2.5 text-right font-medium ${l.balance > 0 ? "text-amber-900" : l.balance < 0 ? "text-teal-800" : "text-gray-400"}`}
                        >
                          {l.balance === 0
                            ? "-"
                            : l.balance > 0
                              ? formatKes(l.balance)
                              : `(${formatKes(-l.balance)})`}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-medium text-gray-900">
                    <tr>
                      <td className="px-5 py-2.5">Total</td>
                      <td className="px-5 py-2.5 text-right">
                        {formatKes(statement.totalCharged)}
                      </td>
                      <td className="px-5 py-2.5 text-right">
                        {formatKes(statement.totalPaid)}
                      </td>
                      <td
                        className={`px-5 py-2.5 text-right ${statement.closingBalance > 0 ? "text-amber-900" : "text-teal-800"}`}
                      >
                        {statement.closingBalance > 0
                          ? `${formatKes(statement.closingBalance)} owing`
                          : statement.closingBalance < 0
                            ? `${formatKes(-statement.closingBalance)} in credit`
                            : "Clear"}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </>
            )}

            {statement.unallocated.length > 0 && (
              <div className="px-5 py-4 border-t border-gray-200 bg-amber-50">
                <p className="text-sm font-medium text-amber-900">
                  {formatKes(statement.unallocatedTotal)} received, not yet put
                  against a month
                </p>
                <ul className="mt-1 space-y-0.5">
                  {statement.unallocated.map((u) => (
                    <li key={u.id} className="text-xs text-amber-900">
                      {u.date} · {formatKes(u.amount)}
                      {u.reference && (
                        <span className="font-mono"> · {u.reference}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
        )}

        {/* ---------------- payments ---------------- */}
        {tab === "payments" && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            {payments.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                Nothing recorded yet.
              </p>
            ) : (
              <>
                {/* Phones: one card per payment. A five column table at
                    360px clipped the Code column and pushed Amount, the
                    number people come here for, off the screen entirely. */}
                <ul className="divide-y divide-gray-100 sm:hidden">
                  {payments.map((p) => (
                    <li key={p.id} className="px-4 py-3">
                      <div className="flex items-baseline justify-between gap-3">
                        <span className="text-sm font-medium text-gray-900">
                          {formatKes(p.amount)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {p.date ?? ""}
                        </span>
                      </div>
                      {/* capitalize only on the type. On the whole line it
                          also capitalised "for", giving "Rent For 2026-11". */}
                      <p className="mt-0.5 text-xs text-gray-600">
                        <span className="capitalize">
                          {p.type.replace(/_/g, " ")}
                        </span>
                        {p.period ? ` for ${p.period}` : ""}
                        {p.status !== "confirmed" ? ` (${p.status})` : ""}
                      </p>
                      {p.receipt && (
                        <p className="font-mono text-[11px] text-gray-400">
                          {p.receipt}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>

                <table className="hidden w-full text-sm sm:table">
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
                        Month
                      </th>
                      <th scope="col" className="px-5 py-2 font-medium">
                        Code
                      </th>
                      <th
                        scope="col"
                        className="px-5 py-2 font-medium text-right"
                      >
                        Amount
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {payments.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-2.5 text-gray-700">
                          {p.date ?? "-"}
                        </td>
                        <td className="px-5 py-2.5 text-gray-700 capitalize">
                          {p.type.replace(/_/g, " ")}
                          {p.status !== "confirmed" && (
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-200">
                              {p.status}
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-2.5 text-gray-500">
                          {p.period ?? "-"}
                        </td>
                        <td className="px-5 py-2.5 text-gray-500 font-mono text-xs">
                          {p.receipt ?? "-"}
                        </td>
                        <td className="px-5 py-2.5 text-right text-gray-900">
                          {formatKes(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            )}
            <p className="px-5 py-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500">
              <Receipt
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 mt-0.5"
              />
              What your landlord has recorded. If one is missing, send them the
              code. You cannot add it here, and nor can anyone else.
            </p>
          </section>
        )}

        {/* ---------------- lease ---------------- */}
        {tab === "lease" && (
          <section className="bg-white rounded-xl border border-gray-200 p-5">
            <dl>
              <Row k="Unit" v={unitNumber ?? "-"} />
              <Row k="Building" v={buildingName ?? "-"} />
              <Row k="Area" v={area ?? "-"} />
              <Row k="Rent" v={formatKes(monthlyRent)} />
              <Row k="Due day" v={rentDueDay ? `Day ${rentDueDay}` : "-"} />
              <Row k="Grace" v={`${gracePeriodDays} days`} />
              <Row k="Started" v={leaseStart} />
              <Row k="Ends" v={leaseEnd ?? "Open"} />
              <Row
                k="Notice"
                v={
                  noticePeriodMonths
                    ? `${noticePeriodMonths} month${noticePeriodMonths === 1 ? "" : "s"}`
                    : "-"
                }
              />
              <Row
                k="Deposit"
                v={`${formatKes(summary.depositHeld)}${depositStatus ? ` · ${depositStatus}` : ""}`}
              />
              <Row k="Paid to date" v={formatKes(summary.lifetimeRentPaid)} />
              <Row
                k="Agreement"
                v={
                  leaseDocumentUrl ? (
                    <a
                      href={leaseDocumentUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-teal-700 underline"
                    >
                      <FileText aria-hidden="true" className="w-3.5 h-3.5" />
                      Open
                    </a>
                  ) : (
                    "Not uploaded"
                  )
                }
              />
            </dl>
            {accessInstructions && (
              <div className="mt-4 rounded-lg bg-gray-50 border border-gray-200 px-4 py-3">
                <p className="flex items-center gap-1.5 text-xs uppercase tracking-wide text-gray-500">
                  <Home aria-hidden="true" className="w-3.5 h-3.5" />
                  Access
                </p>
                <p className="mt-1 text-sm text-gray-700">
                  {accessInstructions}
                </p>
              </div>
            )}
          </section>
        )}

        {/* ---------------- repairs ---------------- */}
        {tab === "repairs" && (
          <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <RepairForm onDone={() => router.refresh()} />
            {maintenance.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-gray-500">
                No repair requests.
              </p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {maintenance.map((m) => (
                  <li
                    key={m.id}
                    className="px-5 py-3 flex items-start justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {m.title ?? "Repair"}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">
                        {[
                          m.category?.replace(/_/g, " "),
                          m.urgency,
                          m.reportedAt?.slice(0, 10),
                        ]
                          .filter(Boolean)
                          .join(" · ")}
                      </p>
                    </div>
                    <span className="shrink-0 px-2 py-0.5 rounded-full text-xs border border-gray-300 text-gray-700 capitalize">
                      {(m.status ?? "open").replace(/_/g, " ")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
            <p className="px-5 py-3 border-t border-gray-100 flex items-start gap-2 text-xs text-gray-500">
              <Wrench
                aria-hidden="true"
                className="w-3.5 h-3.5 shrink-0 mt-0.5"
              />
              Your landlord is emailed when you report one. They record who
              comes, when, and what it costs.
            </p>
          </section>
        )}
      </div>

      <p className="text-xs text-gray-400">As at {today}</p>
    </Shell>
  );
}
