"use client";

/**
 * Paste what arrived; see what it was matched to, and decide the rest.
 *
 * THE UNMATCHED LIST IS THE FEATURE
 *   Anything automatic will leave some money it cannot place — a payment with
 *   no account number, a reference that matches two units, a tenant paying
 *   from a friend's phone. Those have to be visible and resolvable, or
 *   "automatic reconciliation" just means the awkward cases vanish.
 *
 * Every row says WHY it matched or did not, in the same words the matcher
 * used, so the landlord can see the reasoning rather than trust it.
 */

import { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, Archive, Info } from "lucide-react";
import { DataTable } from "@/components/dashboard/landlord/DataTable";
import { formatKes } from "@/lib/landlord/labels";
import {
  ingestPastedPayments,
  assignInboxRow,
  ignoreInboxRow,
  type IngestResult,
} from "./actions";

export interface InboxRow {
  id: string;
  transId: string;
  amount: number;
  billRef: string | null;
  payerName: string | null;
  msisdn: string | null;
  transTime: string;
  status: string;
  reason: string | null;
  matchedLeaseId: string | null;
}

export interface LeaseOption {
  id: string;
  label: string;
}

/**
 * When MitaSafi RECORDED the payment — not when M-Pesa says it was sent.
 *
 * The label matters. `trans_time` is the ingest time, because the
 * confirmation's own stamp is "4/11/26 at 9:15 AM": a two-digit year, no
 * zone, and a day/month order this code is not willing to assume for money.
 * Calling this column "Arrived" would print "26 Nov" beside a message that
 * plainly says 4 Nov, so it is called what it is.
 *
 * Two payments from the same tenant for the same amount are told apart by
 * nothing else, and a row sitting unplaced for three weeks is a different
 * problem from one recorded this morning. Nairobi time, which is the clock
 * the landlord is on.
 */
function recordedAt(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "No date";
  return d.toLocaleString("en-GB", {
    timeZone: "Africa/Nairobi",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function ReconcileClient({
  rows,
  leases,
  notEnabled,
}: {
  rows: InboxRow[];
  leases: LeaseOption[];
  notEnabled?: boolean;
}) {
  const [text, setText] = useState("");
  const [report, setReport] = useState<IngestResult["report"] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [assigning, setAssigning] = useState<Record<string, string>>({});
  const [busy, start] = useTransition();

  const unmatched = rows.filter((r) => r.status === "unmatched");
  const matched = rows.filter((r) => r.status === "matched");
  const ignored = rows.filter((r) => r.status === "ignored");

  if (notEnabled) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">Reconcile</h1>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-sm text-gray-700">
            Reconciliation is not switched on here. The database change that
            stores incoming payments has not been applied.
          </p>
        </div>
      </div>
    );
  }

  function ingest() {
    setError(null);
    setReport(null);
    start(async () => {
      const r = await ingestPastedPayments(text);
      if (r.success) {
        setReport(r.report ?? []);
        setText("");
      } else setError(r.error ?? "Could not read that.");
    });
  }

  const outcomeStyle: Record<string, string> = {
    matched: "text-teal-800 bg-teal-50 border-teal-200",
    unmatched: "text-amber-900 bg-amber-50 border-amber-200",
    duplicate: "text-gray-700 bg-gray-50 border-gray-200",
    unreadable: "text-red-800 bg-red-50 border-red-200",
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reconcile</h1>
        <p className="mt-1 text-gray-500">Match money to its lease</p>
      </div>

      <section className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-base font-semibold text-gray-900">
          Paste M-Pesa confirmations
        </h2>
        {/* This was six lines of prose explaining what the button does,
            above a box with a worked example already in it. The example is
            the explanation. What survives is the one thing the screen
            cannot show: which field the match is made on. */}
        <p className="mt-1 text-sm text-gray-600">
          Paste one or the whole lot. Each is matched to a lease by the account
          number the tenant typed.
        </p>
        <p className="mt-2 flex gap-2 text-xs text-gray-500">
          <Info aria-hidden="true" className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          Your paybill can send these automatically, but only you can register
          MitaSafi with Safaricom. Pasting works just as well.
        </p>

        <label htmlFor="rc-paste" className="sr-only">
          M-Pesa confirmation messages
        </label>
        <textarea
          id="rc-paste"
          rows={5}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="SFG12ABCDE Confirmed. Ksh30,000.00 received from WANJIRU KARIUKI 0712345678 on 4/11/26 at 9:15 AM. Account Number A1."
          className="mt-3 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-teal-500"
        />

        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={ingest}
            disabled={busy || text.trim() === ""}
            className="px-4 min-h-[44px] rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
          >
            {busy ? "Reading…" : "Read and match"}
          </button>
          {error && (
            <p role="alert" className="text-sm text-red-700">
              {error}
            </p>
          )}
        </div>

        {report && (
          <ul
            className="mt-4 space-y-2"
            aria-label="What happened to each message"
          >
            {report.map((r, i) => (
              <li
                key={`${r.transId ?? "x"}-${i}`}
                className={`rounded-lg border px-3 py-2 text-sm ${outcomeStyle[r.outcome]}`}
              >
                <span className="font-medium capitalize">{r.outcome}</span>
                {r.transId && <span className="font-mono"> {r.transId}</span>}
                {". "}
                {r.detail}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- what could not be placed ---- */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-200">
          <h2 className="text-base font-semibold text-gray-900">
            Needs your decision
            {/* The space and the hidden word are both load-bearing: without
                them a screen reader announces "needs your decision2", and a
                bare number says nothing about what it counts. */}
            {unmatched.length > 0 && (
              <>
                {" "}
                <span className="px-2 py-0.5 rounded-full text-xs bg-amber-50 text-amber-800 border border-amber-200">
                  {unmatched.length}
                  <span className="sr-only"> waiting</span>
                </span>
              </>
            )}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Arrived, but could not be placed without guessing.
          </p>
        </div>

        {unmatched.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            Nothing waiting.
          </p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {unmatched.map((r) => (
              <li key={r.id} className="p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">
                      {formatKes(r.amount)}
                      <span className="ml-2 font-mono text-xs text-gray-500">
                        {r.transId}
                      </span>
                    </p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {r.payerName ?? "Unknown payer"}
                      {r.msisdn && ` · ${r.msisdn}`}
                      {r.billRef
                        ? ` · account "${r.billRef}"`
                        : " · no account given"}
                      {` · recorded ${recordedAt(r.transTime)}`}
                    </p>
                    {r.reason && (
                      <p className="mt-1 flex gap-1.5 text-xs text-amber-800">
                        <AlertTriangle
                          aria-hidden="true"
                          className="w-3.5 h-3.5 shrink-0 mt-0.5"
                        />
                        {r.reason}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <label htmlFor={`assign-${r.id}`} className="sr-only">
                    Lease to assign {r.transId} to
                  </label>
                  <select
                    id={`assign-${r.id}`}
                    value={assigning[r.id] ?? ""}
                    onChange={(e) =>
                      setAssigning({ ...assigning, [r.id]: e.target.value })
                    }
                    className="w-full sm:w-auto rounded-lg border border-gray-300 px-3 min-h-[44px] text-sm"
                  >
                    <option value="">Choose a lease…</option>
                    {leases.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.label}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={busy || !assigning[r.id]}
                    onClick={() =>
                      start(async () => {
                        await assignInboxRow(r.id, assigning[r.id]);
                      })
                    }
                    className="flex-1 sm:flex-none px-3 min-h-[44px] rounded-lg bg-teal-600 text-white text-sm font-medium disabled:opacity-50"
                  >
                    Post
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      start(async () => {
                        await ignoreInboxRow(r.id, "Not rent.");
                      })
                    }
                    className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-3 min-h-[44px] rounded-lg border border-gray-300 text-sm text-gray-700"
                  >
                    <Archive aria-hidden="true" className="w-3.5 h-3.5" />
                    Not rent
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* ---- what was placed ---- */}
      <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <h2 className="px-5 py-3 text-base font-semibold text-gray-900 border-b border-gray-200">
          Placed
        </h2>
        {matched.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-gray-500">
            Nothing matched yet.
          </p>
        ) : (
          /* The same five columns measured 749px on the reports page and
             were clipped outright on a phone. This one is only not clipped
             today because the test account has nothing matched yet. */
          <DataTable
            caption="Payments matched to a lease, with the reason each was matched"
            titleAt={0}
            subtitleAt={1}
            columns={[
              { label: "Code" },
              { label: "Recorded" },
              { label: "Payer" },
              { label: "Why" },
              { label: "Amount", right: true },
            ]}
            rows={matched.map((r) => ({
              key: r.id,
              cells: [
                <span key="c" className="font-mono text-xs">
                  {r.transId}
                </span>,
                <span key="t" className="whitespace-nowrap">
                  {recordedAt(r.transTime)}
                </span>,
                r.payerName ?? "Unknown payer",
                <span
                  key="w"
                  className="inline-flex items-start gap-1.5 text-xs"
                >
                  <CheckCircle2
                    aria-hidden="true"
                    className="w-3.5 h-3.5 shrink-0 mt-0.5 text-teal-600"
                  />
                  {r.reason}
                </span>,
                formatKes(r.amount),
              ],
            }))}
          />
        )}
      </section>

      {ignored.length > 0 && (
        <section className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-base font-semibold text-gray-900">Set aside</h2>
          <ul className="mt-2 space-y-1">
            {ignored.map((r) => (
              <li key={r.id} className="text-sm text-gray-600">
                <span className="font-mono text-xs">{r.transId}</span>{" "}
                {formatKes(r.amount)}. {r.reason}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
