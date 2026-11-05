/**
 * Facts the legal pages are allowed to state.
 *
 * Everything here was read out of the live system, not drafted from memory,
 * because /terms and /privacy make binding representations and a wrong one is
 * worse than a missing page.
 *
 * WHAT IS DELIBERATELY ABSENT
 *   Registered company name, company number, registered office, and the name
 *   of a data protection officer. None of those exist anywhere in this
 *   codebase or database, and inventing them in a legal document would be
 *   fabrication. The pages omit those sections rather than fill them with
 *   plausible-looking text. They must be added before launch.
 */

/**
 * Contact address for legal and privacy enquiries.
 *
 * WARNING, measured 2026-11-05: neither mitasafi.com nor mitasafi.co.ke has an
 * MX record, so NO address on either domain can receive mail today. The rest
 * of the app still points at hello@mitasafi.co.ke, whose domain does not even
 * resolve. This constant uses the domain that is actually registered, verified
 * in Resend and now serving the site; the mailbox still has to be created and
 * MX records added, or enquiries required by law will silently bounce.
 */
export const LEGAL_CONTACT_EMAIL = "hello@mitasafi.com";

/** Date these documents last changed. Update when the text changes. */
export const LEGAL_LAST_UPDATED = "5 November 2026";

/**
 * Commission charged to service providers, read from public.commission_config
 * version 2, scope "global", effective 2026-11-03:
 *   rate_bps 1000, min_fee_cents 0, max_fee_cents 500000, min_job_amount_cents 0
 * Expressed here in the units a reader understands.
 */
export const COMMISSION = {
  /** rate_bps 1000 = 10% */
  ratePercent: 10,
  /** max_fee_cents 500000, in KES */
  capKes: 5_000,
  /** min_fee_cents 0 — there is no floor, so 10% is accurate at every price */
  hasMinimumFee: false,
  /** min_job_amount_cents 0 — no minimum job value */
  hasMinimumJobValue: false,
} as const;

/**
 * Processors and third parties the application actually contacts. Each was
 * confirmed by reading the code that calls it, not by assumption.
 */
export const SUBPROCESSORS = [
  {
    name: "Supabase",
    purpose:
      "Database, authentication, and file storage. Holds account details, listings, bookings and uploaded documents.",
    note: "Project hosted in the EU (eu-central-2).",
  },
  {
    name: "Safaricom (M-Pesa Daraja)",
    purpose: "Processing M-Pesa payments initiated from the platform.",
    note: "Receives the paying phone number and the amount.",
  },
  {
    name: "Fly.io",
    purpose: "Application hosting. Serves this site from Johannesburg.",
    note: "Processes request metadata such as IP address.",
  },
  {
    name: "Cloudflare",
    purpose: "DNS for mitasafi.com.",
    note: "",
  },
  {
    name: "Resend",
    purpose: "Transactional email, such as alerts and notifications.",
    note: "Receives the recipient address and message content.",
  },
  {
    name: "Mapbox",
    purpose: "Rendering maps on listing pages.",
    note: "Receives the coordinates being displayed, which for a listing whose owner has hidden its exact address are already rounded.",
  },
  {
    name: "Google",
    purpose: "Optional sign-in with a Google account.",
    note: "Used only if you choose that sign-in method.",
  },
] as const;
