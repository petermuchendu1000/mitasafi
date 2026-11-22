/**
 * The one place that knows how to build a service_providers row.
 *
 * WHY THIS EXISTS
 *
 * The same row was being created in six places with four different payload
 * shapes, and every defect below followed from that duplication:
 *
 *   src/app/auth/callback/route.ts:242   {user_id, business_name, status}
 *   src/app/(auth)/signup/page.tsx:489   {user_id, business_name, status}
 *       -- both ALWAYS failed, for two independent reasons. `phone` is NOT NULL
 *          with no default and no BEFORE INSERT trigger, so the statement
 *          violates not-null; and `status` is not a column of
 *          service_providers at all (the column is `account_status`), so
 *          PostgREST rejects the payload before Postgres sees it. Each error
 *          was logged and execution continued, so the "add the provider role"
 *          path silently never created a provider profile.
 *
 *   src/app/auth/callback/route.ts:150           phone: user.phone || <placeholder>
 *   src/app/(auth)/signup/page.tsx:523           phone: data.user.phone || <placeholder>
 *   src/app/(auth)/signup/page.tsx:624           phone: <placeholder>   (unconditional)
 *   src/app/(auth)/onboarding/provider-type/actions.ts:103
 *                                                phone: user.phone || <placeholder>
 *       -- that placeholder is the company's OWN published support number, the
 *          one src/app/contact/page.tsx renders as a tel: link. Every provider
 *          created without a phone was published to the marketplace with
 *          Mitasafi's support line as their contact, so customers calling that
 *          provider reached Mitasafi. At two of those sites the real verified
 *          phone was already in scope as `fullPhone`.
 *
 *          The digits are deliberately NOT written out here:
 *          identity-provider-profile.test.ts scans every .ts/.tsx file under
 *          src/ for that literal and allows it in exactly one place, the
 *          contact page. A module documenting the defect must not reintroduce
 *          the string the scan exists to forbid.
 *
 * So this module does three things and refuses to do a fourth:
 *   1. it names the columns a client may write, mirroring the database grant
 *   2. it validates the phone against the table's own CHECK
 *   3. it NEVER invents a phone number -- it returns a failure the caller must
 *      handle instead
 *
 * It is a pure function with no Supabase dependency, so it is testable without
 * a database, which is the whole point: the defects above were all payload
 * defects and none of them needed a live Postgres to catch.
 */

/**
 * The 42 columns `authenticated` may write on public.service_providers.
 *
 * Read from the live catalog, not from a migration file:
 *   SELECT attname FROM pg_attribute
 *    WHERE attrelid = 'public.service_providers'::regclass
 *      AND has_column_privilege('authenticated','public.service_providers',attname,'UPDATE');
 *
 * This list is the UPDATE allowlist that 20260329000000_lock_client_write_surface.sql
 * established. The companion migration applies the SAME list to INSERT, because
 * it had only ever been applied to UPDATE -- see PROVIDER_TRUST_COLUMNS.
 */
export const PROVIDER_CLIENT_WRITABLE_COLUMNS = [
  "acceptance_rate",
  "bio",
  "business_name",
  "business_photos",
  "business_type",
  "capacity_mode",
  "cover_photo_url",
  "created_at",
  "email",
  "emergency_available",
  "emergency_capacity_reserved",
  "emergency_hard_ceiling",
  "emergency_surcharge_amount",
  "emergency_surcharge_type",
  "headline",
  "id",
  "instant_booking",
  "is_active",
  "languages",
  "last_active_at",
  "max_concurrent_bookings",
  "max_simultaneous_emergencies",
  "min_price",
  "phone",
  "portfolio_images",
  "primary_location",
  "profile_photo_url",
  "provider_type",
  "registration_number",
  "response_time",
  "response_time_minutes",
  "search_vector",
  "service_radius_km",
  "social_links",
  "tagline",
  "tax_id",
  "team_size",
  "updated_at",
  "user_id",
  "whatsapp",
  "years_experience",
  "years_in_business",
] as const;

/**
 * The 8 columns no client may ever write: trust signals, money, and derived
 * statistics.
 *
 * These were withheld from UPDATE and -- until the companion migration --
 * granted on INSERT, because table-level INSERT was never revoked. A column
 * REVOKE is inert while the table privilege is held, so all 50 columns were
 * insertable. Combined with the RLS policy providers_own_insert, whose
 * WITH CHECK is `(user_id = auth.uid())` and constrains nothing else, a
 * signed-in user could create their own provider row carrying any
 * wallet_balance and a verified badge. request_provider_payout validates a
 * payout AMOUNT against wallet_balance; it cannot validate how the balance
 * arose.
 *
 * Never add one of these to a client-side payload. The database now refuses it,
 * and assertProviderPayloadSafe() refuses it before the request is made.
 */
export const PROVIDER_TRUST_COLUMNS = [
  "account_status",
  "average_rating",
  "is_verified",
  "total_earnings",
  "total_jobs_completed",
  "total_reviews",
  "verification_badge",
  "wallet_balance",
] as const;

/**
 * public.service_providers.phone_format, verbatim:
 *   CHECK ((phone ~ '^\+?[0-9]{10,15}$'::text))
 *
 * Duplicated here on purpose. A payload that fails this check is rejected
 * locally with a message a person can act on, rather than reaching Postgres and
 * coming back as constraint violation 23514.
 */
export const PROVIDER_PHONE_FORMAT = /^\+?[0-9]{10,15}$/;

/** The three columns that are NOT NULL with no default, per the live schema. */
export interface ProviderProfileRecord {
  user_id: string;
  business_name: string;
  phone: string;
  business_type?: "individual" | "company";
}

export type ProviderProfileFailure =
  | "missing-user-id"
  | "missing-business-name"
  | "missing-phone"
  | "invalid-phone";

export type BuildProviderProfileResult =
  | { ok: true; record: ProviderProfileRecord }
  | { ok: false; reason: ProviderProfileFailure; message: string };

export interface BuildProviderProfileInput {
  userId: string | null | undefined;
  businessName: string | null | undefined;
  /**
   * Candidate phone numbers in priority order, e.g.
   * [verifiedOtpPhone, authUser.phone, profile.phone].
   *
   * The first one that satisfies PROVIDER_PHONE_FORMAT wins. If none does, the
   * result is a failure. There is no fallback value and there must never be
   * one: a provider row whose phone is not the provider's is worse than no
   * provider row, because the marketplace publishes it as a contact channel.
   */
  phoneCandidates: ReadonlyArray<string | null | undefined>;
  businessType?: "individual" | "company";
}

/**
 * Build the payload for a service_providers INSERT, or explain why it cannot be
 * built.
 *
 * The caller MUST handle `ok: false`. That is the point of the discriminated
 * union: the previous code could not express "no phone is available", so it
 * substituted a fake one at four separate call sites.
 */
export function buildProviderProfile(
  input: BuildProviderProfileInput,
): BuildProviderProfileResult {
  const userId = input.userId?.trim();
  if (!userId) {
    return {
      ok: false,
      reason: "missing-user-id",
      message: "Cannot create a provider profile without a signed-in user.",
    };
  }

  const businessName = input.businessName?.trim();
  if (!businessName) {
    return {
      ok: false,
      reason: "missing-business-name",
      message: "Please provide a business name.",
    };
  }

  // Normalise before testing: the UI formats phone numbers for display
  // ("712 345 678") and the CHECK does not allow spaces.
  const candidates = input.phoneCandidates
    .map((c) => c?.replace(/\s/g, "").trim())
    .filter((c): c is string => Boolean(c));

  if (candidates.length === 0) {
    return {
      ok: false,
      reason: "missing-phone",
      message:
        "A phone number is required to create a provider profile. " +
        "Please add a phone number to your account and try again.",
    };
  }

  const phone = candidates.find((c) => PROVIDER_PHONE_FORMAT.test(c));
  if (!phone) {
    return {
      ok: false,
      reason: "invalid-phone",
      message:
        "That phone number is not in a valid format. " +
        "Use digits only, 10 to 15 of them, optionally starting with +.",
    };
  }

  const record: ProviderProfileRecord = {
    user_id: userId,
    business_name: businessName,
    phone,
  };

  if (input.businessType) {
    record.business_type = input.businessType;
  }

  return { ok: true, record };
}

/**
 * Throw if a payload names a column a client may not write, or one that does
 * not exist.
 *
 * Defence in depth for hand-built payloads: the database refuses these, but a
 * refusal arrives as a logged error at runtime, which is exactly how
 * `status: 'pending'` survived in two files. This fails loudly at the call site
 * instead.
 */
export function assertProviderPayloadSafe(
  payload: Record<string, unknown>,
): void {
  const trust = new Set<string>(PROVIDER_TRUST_COLUMNS);
  const writable = new Set<string>(PROVIDER_CLIENT_WRITABLE_COLUMNS);

  for (const key of Object.keys(payload)) {
    if (trust.has(key)) {
      throw new Error(
        `service_providers.${key} may never be written by a client ` +
          `(trust/money column). Remove it from the payload.`,
      );
    }
    if (!writable.has(key)) {
      throw new Error(
        `service_providers has no client-writable column "${key}". ` +
          `Check the column name against the live schema.`,
      );
    }
  }
}
