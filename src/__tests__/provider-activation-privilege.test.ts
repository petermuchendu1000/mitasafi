/**
 * Two privilege defects, and the properties that keep them fixed.
 *
 * Both are properties of the FILE, not of runtime behaviour: they are about
 * which Supabase client issues a write and which predicates that write carries.
 * Neither can be observed by calling the functions without a live Postgres with
 * the real column-level grants, so these tests are deliberately textual — the
 * same approach as server-action-boundary.test.ts.
 *
 * B2 — provider deactivate/reactivate were dead.
 *   `authenticated` holds column-level UPDATE on 42 of the 50
 *   service_providers columns. account_status is one of the 8 withheld
 *   (with average_rating, is_verified, total_earnings, total_jobs_completed,
 *   total_reviews, verification_badge, wallet_balance). Postgres requires
 *   UPDATE on every column in the SET list, so both statements failed 42501 on
 *   every call. account_status must STAY un-writable by clients: a suspended
 *   provider must not be able to un-suspend itself. So the writes moved to the
 *   service-role client.
 *
 *   That client BYPASSES RLS. The policy providers_own_update
 *   USING (user_id = auth.uid()) was the only thing scoping these writes to the
 *   caller. The explicit .eq("id", providerId).eq("user_id", user.id) is now
 *   load-bearing: without it, any signed-in user could deactivate any provider.
 *   That is the property asserted below, and it is why a service-role write to
 *   this table may never lose its ownership predicate.
 *
 * B3 — phone auto-promotion never persisted.
 *   `authenticated` may UPDATE only avatar_url, email, full_name, metadata,
 *   phone and primary_role on profiles. verification_level and updated_at are
 *   withheld, so the page's render-time
 *   .update({ phone, verification_level: 'phone', updated_at }) failed 42501 —
 *   unchecked, while the page set verificationLevel = 'phone' in memory anyway.
 *   The page rendered one state and the row kept another, permanently.
 *   Phone is verified by OTP (sendPhoneOTP / verifyPhoneOTP), so the promotion
 *   is wrong in principle as well: loading a page must not grant a
 *   verification level.
 */

import fs from "fs";
import path from "path";

const read = (p: string) =>
  fs.readFileSync(path.join(process.cwd(), p), "utf8");

const SETTINGS_ACTIONS = "src/app/dashboard/provider/settings/actions.ts";
const VERIFY_PAGE = "src/app/dashboard/verify-provider/page.tsx";

/** Collapse the fluent chains onto one line so they can be matched whole. */
const flatten = (source: string) => source.replace(/\s+/g, " ");

/**
 * Every `.from("<table>")` ... `.update(` statement in the source, each as the
 * flattened text from `.from(` up to the statement-terminating `;`.
 */
function updateChains(source: string, table: string): string[] {
  const flat = flatten(source);
  const needle = `.from("${table}")`;
  const chains: string[] = [];

  for (
    let i = flat.indexOf(needle);
    i !== -1;
    i = flat.indexOf(needle, i + 1)
  ) {
    const end = flat.indexOf(";", i);
    const chain = flat.slice(i, end === -1 ? flat.length : end);
    if (chain.includes(".update(")) {
      chains.push(chain);
    }
  }
  return chains;
}

/** The body of `export async function <name>`, up to the next top-level export. */
function functionBody(source: string, name: string): string {
  const start = source.indexOf(`export async function ${name}`);
  expect(start).toBeGreaterThan(-1);
  const rest = source.slice(start + 1);
  const next = rest.indexOf("\nexport ");
  return next === -1 ? rest : rest.slice(0, next);
}

describe("B2: provider activation toggles", () => {
  const source = read(SETTINGS_ACTIONS);

  it("writes service_providers with the service-role client", () => {
    // Without this the SET list hits the revoked account_status grant and the
    // statement fails 42501 for every caller.
    expect(source).toContain('from "@/lib/supabase/admin"');

    for (const fn of [
      "deactivateProviderAccount",
      "reactivateProviderAccount",
    ]) {
      const body = flatten(functionBody(source, fn));
      expect(body).toContain("createAdminClient()");
      expect(body).toMatch(
        /await admin \.from\("service_providers"\) \.update\(/,
      );
      // The RLS-bound client must not be the one issuing this write.
      expect(body).not.toMatch(
        /await supabase \.from\("service_providers"\) \.update\(/,
      );
    }
  });

  it("constrains every service-role write to the caller's own row", () => {
    // THE safety property. RLS is bypassed, so these predicates are the only
    // ownership enforcement left.
    const chains = updateChains(source, "service_providers");
    expect(chains).toHaveLength(2);

    for (const chain of chains) {
      expect(chain).toContain('.eq("id", providerId)');
      expect(chain).toContain('.eq("user_id", user.id)');
    }
  });

  it("resolves providerId from the authenticated caller, not from an argument", () => {
    // getCachedProviderId() looks up service_providers by auth.uid() through the
    // RLS client; neither action takes a provider id from the client.
    expect(source).toContain("getCachedProviderId");
    expect(source).toMatch(
      /export async function deactivateProviderAccount\(\): Promise<ActionResult>/,
    );
    expect(source).toMatch(
      /export async function reactivateProviderAccount\(\): Promise<ActionResult>/,
    );
  });

  it("does not return the raw database error to the client", () => {
    // `permission denied for table service_providers` is internal detail.
    for (const fn of [
      "deactivateProviderAccount",
      "reactivateProviderAccount",
    ]) {
      const body = functionBody(source, fn);
      const guard = body.slice(
        body.indexOf("if (error) {"),
        body.indexOf("revalidatePath"),
      );
      expect(guard).toContain("console.error");
      expect(guard).not.toContain("error.message");
    }
  });

  it("detects the patterns it forbids (guards the guard)", () => {
    const unguarded = `
      const { error } = await admin
        .from("service_providers")
        .update({ is_active: false, account_status: "deactivated" });
    `;
    const chains = updateChains(unguarded, "service_providers");
    expect(chains).toHaveLength(1);
    expect(chains[0]).not.toContain('.eq("user_id", user.id)');

    const guarded = `
      await admin.from("service_providers").update({ is_active: false })
        .eq("id", providerId).eq("user_id", user.id);
    `;
    expect(updateChains(guarded, "service_providers")[0]).toContain(
      '.eq("user_id", user.id)',
    );

    // A select-only chain on the same table is not an update and is ignored.
    expect(
      updateChains(
        'await supabase.from("service_providers").select("id");',
        "service_providers",
      ),
    ).toHaveLength(0);
  });
});

describe("B3: phone verification level on the verify-provider page", () => {
  const source = read(VERIFY_PAGE);

  it("never writes verification_level 'phone' while rendering", () => {
    expect(source).not.toContain('verification_level: "phone"');
    for (const chain of updateChains(source, "profiles")) {
      expect(chain).not.toContain('verification_level: "phone"');
    }
  });

  it("issues no write at all through the RLS-bound client", () => {
    // profiles.verification_level and profiles.updated_at are both revoked from
    // `authenticated`; a render-time write through this client cannot succeed.
    const flat = flatten(source);
    expect(flat).not.toMatch(/await supabase \.from\("profiles"\) \.update\(/);
    expect(flat).not.toMatch(
      /await supabase \.from\("service_providers"\) \.update\(/,
    );
  });

  it("does not assert the promotion in memory", () => {
    // The in-memory lie: the page claimed 'phone' regardless of the DB result.
    expect(source).not.toMatch(/verificationLevel\s*=\s*"phone"/);
  });

  it("renders from the state the database reports", () => {
    expect(source).toContain(
      'let verificationLevel = profile?.verification_level || "none"',
    );
    expect(source).toContain('.select("id, phone, verification_level")');
  });

  it("leaves the OTP flow as the only path to 'phone'", () => {
    const actions = read("src/app/dashboard/verify-provider/actions.ts");
    expect(actions).toContain("export async function sendPhoneOTP");
    expect(actions).toContain("export async function verifyPhoneOTP");
    // verifyPhoneOTP promotes with the service-role client, after checking the
    // code, its expiry and its attempt count.
    expect(flatten(functionBody(actions, "verifyPhoneOTP"))).toContain(
      'verification_level: "phone"',
    );
  });

  it("detects the patterns it forbids (guards the guard)", () => {
    const old = `
      await supabase
        .from("profiles")
        .update({ phone: user.phone, verification_level: "phone" } as never)
        .eq("id", user.id);
      verificationLevel = "phone";
    `;
    expect(old).toContain('verification_level: "phone"');
    expect(flatten(old)).toMatch(
      /await supabase \.from\("profiles"\) \.update\(/,
    );
    expect(old).toMatch(/verificationLevel\s*=\s*"phone"/);
  });
});
