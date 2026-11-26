"use client";

/**
 * The application queue, its filters and the decision control.
 *
 * The income figure is rendered as what it is: a number the applicant typed,
 * next to the asking rent, with the ratio spelled out as arithmetic. No badge,
 * no colour-coding by amount and no ordering by it. A landlord deciding who
 * gets housing should be reading the person, not a score this page invented.
 *
 * The shell supplies min-h-screen, the <main> landmark and the page padding.
 */

import { useMemo, useState, useTransition } from "react";
import {
  Search,
  Mail,
  Phone,
  Briefcase,
  Users,
  CalendarDays,
} from "lucide-react";
import { FilterPills } from "@/components/dashboard/landlord/FilterPills";
import { formatKes } from "@/lib/landlord/labels";
import {
  applicationMatches,
  APPLICATION_STATUS_LABELS,
  LANDLORD_DECISIONS,
  type QueueApplication,
  type ApplicationStats,
} from "@/lib/landlord/applications";
import { recordApplicationDecision } from "./actions";

type Filter = "open" | "all" | "approved" | "rejected";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "open", label: "Needs a decision" },
  { id: "all", label: "All" },
  { id: "approved", label: "Approved" },
  { id: "rejected", label: "Declined" },
];

const BADGE: Record<string, string> = {
  new: "bg-teal-50 text-teal-700 border-teal-200",
  reviewing: "bg-blue-50 text-blue-700 border-blue-200",
  shortlisted: "bg-indigo-50 text-indigo-700 border-indigo-200",
  approved: "bg-green-50 text-green-700 border-green-200",
  rejected: "bg-gray-100 text-gray-600 border-gray-200",
  withdrawn: "bg-gray-100 text-gray-500 border-gray-200",
};

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
    </div>
  );
}

function Fact({
  icon: Icon,
  children,
}: {
  icon: typeof Mail;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-gray-600">
      <Icon aria-hidden="true" className="w-4 h-4 text-gray-400" />
      {children}
    </span>
  );
}

function ApplicationCard({ application }: { application: QueueApplication }) {
  const [notes, setNotes] = useState(application.landlord_notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const notesId = `notes-${application.id}`;
  const errorId = `notes-error-${application.id}`;

  function decide(status: string) {
    setError(null);
    startTransition(async () => {
      const r = await recordApplicationDecision(
        application.id,
        status,
        notes.trim() === "" ? null : notes.trim(),
      );
      if (!r.success) setError(r.error ?? "Could not save that decision.");
    });
  }

  return (
    <li className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-semibold text-gray-900">
            {application.full_name}
          </h3>
          <p className="text-sm text-gray-500">
            for {application.listingTitle}
            {application.listingRent !== null && (
              <> · asking {formatKes(application.listingRent)}</>
            )}
          </p>
        </div>
        <span
          className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
            BADGE[application.status] ?? BADGE.rejected
          }`}
        >
          {application.statusLabel}
        </span>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2">
        <Fact icon={Phone}>{application.phone}</Fact>
        {application.email && <Fact icon={Mail}>{application.email}</Fact>}
        {application.occupation && (
          <Fact icon={Briefcase}>
            {application.occupation}
            {application.employer && <> at {application.employer}</>}
          </Fact>
        )}
        {application.household_size !== null && (
          <Fact icon={Users}>
            {application.household_size === 1
              ? "Living alone"
              : `${application.household_size} people`}
          </Fact>
        )}
        {application.move_in_date && (
          <Fact icon={CalendarDays}>
            Wants to move in {application.move_in_date}
            {application.lease_months && (
              <> for {application.lease_months} months</>
            )}
          </Fact>
        )}
      </div>

      {application.monthly_income !== null && (
        <p className="mt-3 text-sm text-gray-700">
          States an income of{" "}
          <span className="font-medium">
            {formatKes(application.monthly_income)}
          </span>{" "}
          a month
          {application.incomeToRent !== null && (
            <>, {application.incomeToRent.toFixed(1)}× the asking rent</>
          )}
          . {/* Said plainly, every time, because nobody has checked it. */}
          <span className="text-gray-500">
            Entered by the applicant. Not verified.
          </span>
        </p>
      )}

      {application.message && (
        <p className="mt-3 text-sm text-gray-700 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          {application.message}
        </p>
      )}

      {application.isOpen ? (
        <div className="mt-4 border-t border-gray-100 pt-4">
          <label
            htmlFor={notesId}
            className="block text-sm font-medium text-gray-700"
          >
            Your notes
          </label>
          <textarea
            id={notesId}
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? errorId : undefined}
            placeholder="Only you can see this."
            className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 min-h-[44px] text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
          {error && (
            <p id={errorId} role="alert" className="mt-1 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            {LANDLORD_DECISIONS.map((d) => (
              <button
                key={d}
                type="button"
                disabled={pending || d === application.status}
                onClick={() => decide(d)}
                className={`px-3 min-h-[44px] rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 ${
                  d === "approved"
                    ? "bg-teal-600 text-white border-teal-600 hover:bg-teal-700"
                    : "bg-white text-gray-700 border-gray-300 hover:border-gray-400"
                }`}
              >
                {APPLICATION_STATUS_LABELS[d]}
              </button>
            ))}
          </div>
        </div>
      ) : (
        application.landlord_notes && (
          <p className="mt-4 border-t border-gray-100 pt-4 text-sm text-gray-600">
            <span className="font-medium text-gray-700">Your note:</span>{" "}
            {application.landlord_notes}
          </p>
        )
      )}
    </li>
  );
}

export function ApplicationsQueue({
  applications,
  stats,
}: {
  applications: QueueApplication[];
  stats: ApplicationStats;
}) {
  const [filter, setFilter] = useState<Filter>("open");
  const [query, setQuery] = useState("");

  const shown = useMemo(
    () =>
      applications
        .filter((a) =>
          filter === "all"
            ? true
            : filter === "open"
              ? a.isOpen
              : a.status === filter,
        )
        .filter((a) => applicationMatches(a, query)),
    [applications, filter, query],
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Applications</h1>
        <p className="mt-1 text-gray-500">
          Tenant applications for your listings
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Tile label="Applications" value={String(stats.total)} />
        <Tile label="Needs a decision" value={String(stats.open)} />
        <Tile label="Approved" value={String(stats.byStatus.approved ?? 0)} />
        <Tile label="Declined" value={String(stats.byStatus.rejected ?? 0)} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
        <FilterPills
          label="Filter applications"
          value={filter}
          onChange={setFilter}
          options={FILTERS}
        />

        <div className="relative sm:w-72">
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
          />
          <input
            type="search"
            aria-label="Search applications"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Name, listing or phone"
            className="w-full pl-9 pr-3 min-h-[44px] rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>
      </div>

      {shown.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 px-5 py-12 text-center">
          <p className="text-gray-500">
            {applications.length === 0
              ? "No applications yet. They arrive when somebody applies to an active listing."
              : "No application matches that."}
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {shown.map((a) => (
            <ApplicationCard key={a.id} application={a} />
          ))}
        </ul>
      )}
    </div>
  );
}
