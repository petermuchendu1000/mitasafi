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

import { CONTACT_EMAIL, SITE_DOMAIN } from "@/lib/site/urls";

/**
 * Contact address for legal and privacy enquiries.
 *
 * Status, measured 2026-11-06: mitasafi.com now has the three Cloudflare Email
 * Routing MX records (route1/2/3.mx.cloudflare.net), an SPF TXT record and a
 * DKIM key, all confirmed resolving from two independent public resolvers.
 * Mail will not be delivered onward until the forwarding destination is
 * confirmed by its owner, which is a one-click action outside this codebase.
 *
 * The domain is the single source of truth in @/lib/site/urls — the earlier
 * app-wide hardcoding of the unregistered mitasafi.co.ke is gone.
 */
export const LEGAL_CONTACT_EMAIL = CONTACT_EMAIL;

/** Date these documents last changed. Update when the text changes. */
export const LEGAL_LAST_UPDATED = "5 November 2026";

/**
 * Commission charged to service providers, read from public.commission_config
 * version 3 and public.commission_bands, scope "global", effective 2026-11-05.
 * Flat-by-band: a job inside a band is charged that band's rate on its whole
 * value. No fee floor, NO CAP, no minimum job value.
 */
export const COMMISSION = {
  /** Bands as advertised, in whole KES. Mirrors commission_bands on v3. */
  bands: [
    { fromKes: 0, toKes: 999, ratePercent: 15 },
    { fromKes: 1_000, toKes: 4_999, ratePercent: 12 },
    { fromKes: 5_000, toKes: 19_999, ratePercent: 10 },
    { fromKes: 20_000, toKes: 99_999, ratePercent: 7 },
    { fromKes: 100_000, toKes: null, ratePercent: 5 },
  ],
  hasMinimumFee: false,
  hasCap: false,
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
    purpose: `DNS for ${SITE_DOMAIN}, and email routing for addresses on it.`,
    note: "Email routing receives and forwards the full content of any message sent to an address on this domain, including the sender's address.",
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
