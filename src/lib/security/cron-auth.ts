// =============================================================================
// MITASAFI: CRON REQUEST AUTHORIZATION
// =============================================================================
// GET /api/cron/search-alerts was callable by anyone on the internet. The guard
// failed OPEN when CRON_SECRET was unset -- `if (!cronSecret) return true` --
// and CRON_SECRET was unset on the production Fly app, so an unauthenticated
// request returned HTTP 200. Past the guard the handler sends email and updates
// search_alerts through the service-role client, which bypasses RLS.
//
// There were two branches that returned "authorized" WITHOUT comparing a
// secret: the missing-secret branch, and an unconditional NODE_ENV ===
// "development" bypass. Production emits Strict-Transport-Security, which
// src/proxy.ts:48-50 sets only under NODE_ENV === "production", so the
// development branch was not the one serving traffic -- but it is the same
// defect class, and a staging or preview deploy with NODE_ENV unset would
// reopen the hole. Both are gone. Neither is replaced by an opt-in flag,
// because none is needed: local development supplies CRON_SECRET through
// .env.local like any other secret.
//
// The invariant, which no configuration may weaken: this function cannot
// return authorized:true unless a non-empty CRON_SECRET was configured AND the
// presented bearer token equals it exactly.
// =============================================================================

/** Minimal shape of a Headers object, so this stays unit-testable. */
export interface HeaderReader {
  get(name: string): string | null;
}

export interface CronAuthResult {
  authorized: boolean;
  /** Machine-readable explanation, for logging. Never contains the secret. */
  reason: string;
}

export function authorizeCronRequest(
  headers: HeaderReader,
  env: Record<string, string | undefined> = process.env,
): CronAuthResult {
  const cronSecret = env.CRON_SECRET;

  // No secret configured => DENY. This is the inversion: it used to allow.
  // An empty string is caught here too, which matters, because `Bearer ${""}`
  // is the literal "Bearer " and would otherwise string-match that header.
  if (!cronSecret) {
    return { authorized: false, reason: "cron-secret-not-configured" };
  }

  const presented = headers.get("authorization");
  if (!presented) {
    return { authorized: false, reason: "no-authorization-header" };
  }

  if (presented !== `Bearer ${cronSecret}`) {
    return { authorized: false, reason: "bearer-mismatch" };
  }

  return { authorized: true, reason: "bearer-match" };
}
