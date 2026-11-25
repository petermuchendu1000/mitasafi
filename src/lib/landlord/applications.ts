/**
 * The landlord's application queue.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 *   It does not score anyone. It would be easy to divide stated income by rent
 *   and print "STRONG" or "WEAK" beside a person's name, and it would be wrong
 *   twice over: the income is a number the applicant typed and nobody has
 *   checked, and a housing decision dressed up as a computed verdict invites
 *   the landlord to stop reading. So the ratio is shown as arithmetic, labelled
 *   as the applicant's own unverified figure, and no row is ranked, flagged or
 *   sorted by it.
 *
 *   It does not sort by anything but time and status. Ordering a queue by
 *   income is a screening policy, and this module has no business inventing one.
 *
 * WHAT "RENT" MEANS HERE
 *   The rent is the listing's asking rent, not anything the applicant agreed.
 *   An application is an expression of interest in a listing at its asking
 *   price; nothing is negotiated until there is a lease.
 */

/** Queue order: what needs attention first, then what has been dealt with. */
export const APPLICATION_STATUSES = [
  "new",
  "reviewing",
  "shortlisted",
  "approved",
  "rejected",
  "withdrawn",
] as const;

export type ApplicationStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  new: "New",
  reviewing: "Reviewing",
  shortlisted: "Shortlisted",
  approved: "Approved",
  rejected: "Declined",
  withdrawn: "Withdrawn",
};

/** Statuses still awaiting something from the landlord. */
export const OPEN_STATUSES: readonly string[] = [
  "new",
  "reviewing",
  "shortlisted",
];

/** Statuses the landlord can move an application to. Withdrawal is not one. */
export const LANDLORD_DECISIONS: readonly ApplicationStatus[] = [
  "reviewing",
  "shortlisted",
  "approved",
  "rejected",
];

export interface ApplicationRow {
  id: string;
  listing_id: string;
  applicant_id: string;
  full_name: string;
  email: string | null;
  phone: string;
  occupation: string | null;
  employer: string | null;
  monthly_income: number | null;
  household_size: number | null;
  move_in_date: string | null;
  lease_months: number | null;
  message: string | null;
  status: string;
  landlord_notes: string | null;
  decided_at: string | null;
  created_at: string;
}

export interface ListingRef {
  id: string;
  title: string;
  rent_amount: number | null;
}

export interface QueueApplication extends ApplicationRow {
  listingTitle: string;
  listingRent: number | null;
  statusLabel: string;
  isOpen: boolean;
  /**
   * Stated monthly income ÷ asking rent, or null when either is missing.
   * A ratio, not a verdict. Nothing sorts or filters on it.
   */
  incomeToRent: number | null;
}

export interface ApplicationStats {
  total: number;
  open: number;
  byStatus: Record<string, number>;
}

function statusRank(status: string): number {
  const i = (APPLICATION_STATUSES as readonly string[]).indexOf(status);
  return i === -1 ? APPLICATION_STATUSES.length : i;
}

export function buildApplicationQueue({
  applications,
  listings,
}: {
  applications: ApplicationRow[];
  listings: ListingRef[];
}): { applications: QueueApplication[]; stats: ApplicationStats } {
  const byId = new Map(listings.map((l) => [l.id, l]));

  const rows: QueueApplication[] = applications.map((a) => {
    const listing = byId.get(a.listing_id);
    const rent = listing?.rent_amount ?? null;
    // Guard the divide: a listing with rent 0 or null yields null, not Infinity.
    const incomeToRent =
      a.monthly_income !== null && rent !== null && rent > 0
        ? a.monthly_income / rent
        : null;

    return {
      ...a,
      listingTitle: listing?.title ?? "Listing no longer available",
      listingRent: rent,
      statusLabel: APPLICATION_STATUS_LABELS[a.status] ?? a.status,
      isOpen: OPEN_STATUSES.includes(a.status),
      incomeToRent,
    };
  });

  // Needs-attention first, then newest first within a status. Never by income.
  rows.sort((x, y) => {
    const r = statusRank(x.status) - statusRank(y.status);
    if (r !== 0) return r;
    return y.created_at.localeCompare(x.created_at);
  });

  const byStatus: Record<string, number> = {};
  for (const r of rows) byStatus[r.status] = (byStatus[r.status] ?? 0) + 1;

  return {
    applications: rows,
    stats: {
      total: rows.length,
      open: rows.filter((r) => r.isOpen).length,
      byStatus,
    },
  };
}

export function applicationMatches(
  application: QueueApplication,
  query: string,
): boolean {
  const q = query.trim().toLowerCase();
  if (q === "") return true;

  if (
    application.full_name.toLowerCase().includes(q) ||
    application.listingTitle.toLowerCase().includes(q) ||
    application.statusLabel.toLowerCase().includes(q) ||
    (application.occupation ?? "").toLowerCase().includes(q) ||
    (application.employer ?? "").toLowerCase().includes(q) ||
    (application.email ?? "").toLowerCase().includes(q)
  ) {
    return true;
  }

  // A local 07… number is the stored +2547… number WITHOUT the leading zero,
  // so a plain substring test never matches. Same rule as leaseMatches and
  // tenantMatches rather than a third answer to one question.
  const digitsOf = (s: string) => s.replace(/\D/g, "");
  const qDigits = digitsOf(q);
  if (qDigits.length >= 3) {
    const phone = digitsOf(application.phone);
    if (phone && phone.includes(qDigits)) return true;
    if (qDigits.startsWith("0") && phone && phone.includes(qDigits.slice(1))) {
      return true;
    }
  }

  return false;
}
