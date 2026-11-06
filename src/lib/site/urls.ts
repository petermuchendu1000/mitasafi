/**
 * The one place that knows where this site lives and which mailboxes it uses.
 *
 * WHY THIS MODULE EXISTS
 *   Until 2026-11-06 the codebase carried 39 hardcoded references to
 *   "mitasafi.co.ke" — a domain that has never been registered. Measured that
 *   day from two independent public resolvers (Cloudflare 1.1.1.1 and Google
 *   8.8.8.8), every record type on mitasafi.co.ke returned NXDOMAIN, and the
 *   Cloudflare account that holds this project's DNS has no zone for it.
 *
 *   The damage was live and in two directions:
 *
 *   1. SENDING. Resend rejected every transactional email with HTTP 403,
 *      "The mitasafi.co.ke domain is not verified" — confirmed by probing the
 *      live Resend API with each of the three from-addresses the app actually
 *      used (notifications@, alerts@, noreply@). The same probe from
 *      notifications@mitasafi.com returned HTTP 200. So inquiry notifications,
 *      search alerts, verification emails and every booking email silently
 *      failed in production.
 *
 *   2. INDEXING. metadataBase, og:url and the JSON-LD "url" fields advertised
 *      https://mitasafi.co.ke as the canonical home of the site. The deployed
 *      pages were serving that to crawlers — verified by fetching the live
 *      HTML of /, /services, /landlords, /properties and /service-providers.
 *
 *   mitasafi.com is the domain that is actually registered, is a zone in this
 *   Cloudflare account, is verified for sending in Resend, has MX records
 *   pointing at Cloudflare Email Routing, and is serving the site today.
 *
 * RULE
 *   Nothing outside this module may hardcode the site's domain or a mailbox
 *   address. src/__tests__/site-domain.test.ts enforces that.
 */

/**
 * Canonical origin of the deployed site, with no trailing slash.
 *
 * NEXT_PUBLIC_APP_URL wins so that preview and local builds describe
 * themselves honestly. The fallback is the production origin rather than
 * localhost because this value ends up in crawler-visible metadata, where a
 * localhost URL would be worse than a stale one.
 */
export const SITE_URL: string = (
  process.env.NEXT_PUBLIC_APP_URL || "https://mitasafi.com"
).replace(/\/+$/, "");

/** Bare hostname of {@link SITE_URL}, e.g. "mitasafi.com". */
export const SITE_DOMAIN: string = SITE_URL.replace(/^https?:\/\//, "");

/**
 * The mail domain. Kept separate from SITE_DOMAIN on purpose: SITE_URL moves
 * with the deployment (preview builds, localhost), but mail may only ever be
 * sent from a domain verified in Resend, so the from-addresses must not drift
 * with NEXT_PUBLIC_APP_URL.
 */
export const MAIL_DOMAIN = "mitasafi.com";

/** Absolute URL for a site-relative path. */
export function siteUrl(path = ""): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Mailboxes that receive mail. Forwarded by Cloudflare Email Routing. */
export const CONTACT_EMAIL = `hello@${MAIL_DOMAIN}`;
export const SUPPORT_EMAIL = `support@${MAIL_DOMAIN}`;

/**
 * Envelope senders, formatted for Resend's `from` field.
 *
 * All three are on MAIL_DOMAIN, which is verified in Resend. Changing the
 * domain here without verifying it there resumes the 403 outage described
 * above.
 */
export const MAIL_FROM = {
  notifications: `MitaSafi <notifications@${MAIL_DOMAIN}>`,
  alerts: `MitaSafi <alerts@${MAIL_DOMAIN}>`,
  noreply: `MitaSafi <noreply@${MAIL_DOMAIN}>`,
} as const;
