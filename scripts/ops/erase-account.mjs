#!/usr/bin/env node
/**
 * erase-account.mjs — the operator path for account erasure.
 *
 * WHY THIS EXISTS
 *
 * src/app/dashboard/settings/actions.ts lets a user request deletion, and the
 * settings page tells them "our team will process your request within 48
 * hours". 20260353000000_account_erasure.sql added public.erase_account() so
 * that promise CAN be discharged. Nothing connected the two: the request was
 * written to metadata.deletion_requested_at and no tool read it.
 *
 * This is that tool. It finds the pending requests, shows exactly what will be
 * destroyed and what will be kept, and only then — with --execute — erases.
 *
 * SAFE BY DEFAULT, AND DELIBERATELY SO
 *
 * Erasure is irreversible and it is the most destructive operation in this
 * codebase. So:
 *
 *   - a run with no --execute is a PREVIEW. There is no --dry-run flag to
 *     forget; previewing is what happens unless you ask for the opposite.
 *   - --reason is required and is stored in audit_log. It is the only record of
 *     why an account was erased.
 *   - the account must carry metadata.deletion_requested_at. Erasing someone
 *     who never asked, because an email was mistyped, is the failure mode worth
 *     engineering against. --no-request-required overrides it for a lawful
 *     erasure that did not come through the settings page, and says so in the
 *     audit reason.
 *   - the preview COUNTS the real rows first, so the blast radius comes from
 *     the database rather than from this file's idea of the schema.
 *
 * The service-role key is read from the environment or .env.local by
 * scripts/ops/_lib.mjs and is never printed.
 *
 * USAGE
 *
 *   node scripts/ops/erase-account.mjs --list
 *   node scripts/ops/erase-account.mjs --email a@b.com --reason "DSR-014"
 *   node scripts/ops/erase-account.mjs --email a@b.com --reason "DSR-014" --execute
 *   node scripts/ops/erase-account.mjs --user-id <uuid> --reason "..." --execute
 *   node scripts/ops/erase-account.mjs --audit
 */

import { adminClient, resolveUser, countWhere, row } from "./_lib.mjs";

// ---------------------------------------------------------------------------
// what erase_account does to what -- mirrored here ONLY to describe it
// ---------------------------------------------------------------------------
// These lists drive the preview. They are the same classification as the
// migration's, and that duplication is the one real weakness of this script: if
// the function changes and this does not, the preview becomes a lie about a
// destructive operation.
//
// Mitigated two ways rather than pretended away. The preview is labelled as a
// projection, and after execution the script prints the function's OWN returned
// counts beside it -- so a divergence shows up on the very next real run
// instead of silently misinforming an operator. erase-account.test.ts also
// asserts these table lists against the migration text.
const DELETED_OWN_ONLY = [
  "phone_verifications",
  "saved_listings",
  "saved_providers",
  "search_alerts",
  "search_queries",
  "user_preferences",
  "notifications",
  "listing_waitlist",
  "review_helpful_votes",
  "analytics_events",
];

// table -> the column that points at the erased person
const RETAINED = [
  ["bookings", "customer_id", "the provider's record of jobs they did"],
  ["booking_payments", "payer_id", "financial record, mpesa fields included"],
  ["payments", "confirmed_by", "financial record"],
  ["provider_payouts", "approved_by", "financial record"],
  ["reviews", "reviewer_id", "the provider's rating depends on it"],
  ["booking_disputes", "reported_by", "dispute evidence"],
  ["booking_media", "uploaded_by", "dispute evidence"],
];

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { execute: false, list: false, audit: false, noRequestRequired: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) throw new Error(`${a} needs a value`);
      return v;
    };
    switch (a) {
      case "--email": out.email = next(); break;
      case "--user-id": out.userId = next(); break;
      case "--reason": out.reason = next(); break;
      case "--execute": out.execute = true; break;
      case "--list": out.list = true; break;
      case "--audit": out.audit = true; break;
      case "--no-request-required": out.noRequestRequired = true; break;
      case "--help": case "-h": out.help = true; break;
      default: throw new Error(`unknown argument: ${a}`);
    }
  }
  return out;
}

const USAGE = `
erase-account.mjs — discharge an account erasure request.

  --list                  pending requests (deletion_requested_at set, not yet erased)
  --audit                 the erasure audit trail
  --email <address>       the account to erase, resolved via profiles.email
  --user-id <uuid>        the account to erase, by id
  --reason "<text>"       REQUIRED. Stored in audit_log; the only record of why.
  --execute               actually erase. WITHOUT THIS, THE RUN IS A PREVIEW.
  --no-request-required   erase an account that did not request it (lawful
                          erasure from another basis). Recorded in the reason.
  --help

Erasure is irreversible. It anonymises in place: financial records and the
counterparty's records are RETAINED by design — see docs/ACCOUNT_ERASURE_DESIGN.md.
`.trim();

// ---------------------------------------------------------------------------
// reports
// ---------------------------------------------------------------------------
async function listPending(db) {
  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name, metadata, created_at")
    .not("metadata->deletion_requested_at", "is", null)
    .order("created_at", { ascending: true });
  if (error) throw new Error(`reading profiles: ${error.message}`);

  const pending = (data || []).filter((p) => !p.metadata?.erased_at);
  const done = (data || []).filter((p) => p.metadata?.erased_at);

  console.log("PENDING ERASURE REQUESTS");
  if (pending.length === 0) {
    console.log("  (none)");
  } else {
    for (const p of pending) {
      const asked = String(p.metadata.deletion_requested_at);
      // The settings page promises 48 hours. Showing the age is the point of
      // the list: an operator needs to see which ones are already late.
      const ageH = Math.floor((Date.now() - Date.parse(asked)) / 3600000);
      const late = Number.isFinite(ageH) && ageH > 48 ? "  *** PAST 48h ***" : "";
      console.log(`  ${p.email ?? "(no email)"}  ${p.id}`);
      console.log(`      requested ${asked.slice(0, 19)}  (${Number.isFinite(ageH) ? ageH + "h ago" : "unparseable"})${late}`);
    }
  }
  console.log(`\nALREADY ERASED: ${done.length}`);
  for (const p of done) {
    console.log(`  ${p.id}  erased ${String(p.metadata.erased_at).slice(0, 19)}`);
  }
}

async function showAudit(db) {
  const { data, error } = await db
    .from("audit_log")
    .select("created_at, entity_id, details")
    .eq("action", "account_erased")
    .order("created_at", { ascending: false })
    .limit(25);
  if (error) throw new Error(`reading audit_log: ${error.message}`);

  console.log("ERASURE AUDIT TRAIL (most recent 25)");
  if (!data || data.length === 0) {
    console.log("  (empty — no account has been erased)");
    return;
  }
  for (const a of data) {
    const d = a.details || {};
    console.log(`  ${String(a.created_at).slice(0, 19)}  ${a.entity_id}`);
    console.log(`      reason   ${d.reason ?? "(none)"}`);
    console.log(`      retained ${JSON.stringify(d.retained ?? {})}`);
  }
  // Said explicitly because it looks like an omission otherwise.
  console.log(
    "\n  Note: audit rows deliberately contain NO erased personal data —\n" +
      "  not the old email, not the old name. A trail that preserved what was\n" +
      "  erased would defeat the erasure.",
  );
}

/**
 * Count the real rows, so the operator sees the blast radius from the database.
 */
async function preview(db, user) {
  const id = user.id;

  const [ownCounts, locs, roles, providers, inqs, listingInqs, listings, tenants] =
    await Promise.all([
      Promise.all(DELETED_OWN_ONLY.map((t) => countWhere(db, t, "user_id", id))),
      db.from("locations").select("id").eq("user_id", id),
      countWhere(db, "user_roles", "user_id", id, (q) => q.eq("is_active", true)),
      countWhere(db, "service_providers", "user_id", id),
      countWhere(db, "inquiries", "user_id", id),
      countWhere(db, "listing_inquiries", "user_id", id),
      countWhere(db, "listings", "landlord_id", id, (q) => q.neq("status", "archived")),
      countWhere(db, "tenants", "created_by", id),
    ]);
  if (locs.error) throw new Error(`reading locations: ${locs.error.message}`);

  // locations splits in two and the split is not cosmetic: a booked location
  // can be neither deleted (RESTRICT) nor scrubbed
  // (prevent_location_address_mutation freezes every address field), so its
  // address is RETAINED. Computed from bookings rather than assumed.
  const locIds = (locs.data || []).map((l) => l.id);
  let frozen = 0;
  if (locIds.length) {
    const { count, error } = await db
      .from("bookings")
      .select("service_location_id", { count: "exact", head: true })
      .in("service_location_id", locIds);
    if (error) throw new Error(`reading bookings: ${error.message}`);
    frozen = count ?? 0;
  }

  const retained = await Promise.all(
    RETAINED.map(async ([t, col]) => [t, await countWhere(db, t, col, id)]),
  );

  return {
    own: DELETED_OWN_ONLY.map((t, i) => [t, ownCounts[i]]),
    locationsTotal: locIds.length,
    locationsFrozen: frozen,
    roles,
    providers,
    inqs,
    listingInqs,
    listings,
    tenants,
    retained,
  };
}

function printPreview(p) {
  const deletedTotal =
    p.own.reduce((a, [, n]) => a + n, 0) + (p.locationsTotal - p.locationsFrozen);

  console.log("\nWILL BE DESTROYED");
  for (const [t, n] of p.own) if (n) console.log(row(t, n));
  if (p.locationsTotal - p.locationsFrozen > 0) {
    console.log(row("locations (unreferenced)", p.locationsTotal - p.locationsFrozen));
  }
  if (deletedTotal === 0) console.log("  (nothing — this account has no own-only rows)");

  console.log("\nWILL BE SCRUBBED, ROW KEPT");
  console.log(row("profiles", "email, name, phone, avatar, metadata"));
  console.log(row("auth.users", "email, phone, password; sign-in disabled"));
  if (p.providers) console.log(row("service_providers", `${p.providers} (deactivated + scrubbed)`));
  if (p.inqs) console.log(row("inquiries", `${p.inqs} (name/phone/email)`));
  if (p.listingInqs) console.log(row("listing_inquiries", `${p.listingInqs} (name/phone/email)`));
  if (p.roles) console.log(row("user_roles", `${p.roles} active → inactive`));
  if (p.listings) console.log(row("listings", `${p.listings} → archived`));
  if (p.locationsFrozen) {
    console.log(row("locations (booked)", `${p.locationsFrozen} — access_notes only`));
  }

  console.log("\nWILL BE RETAINED, PERSONAL DATA INCLUDED");
  let anyRetained = false;
  for (const [t, n] of p.retained) {
    if (n) {
      anyRetained = true;
      const why = RETAINED.find(([x]) => x === t)[2];
      console.log(row(t, `${n}  — ${why}`));
    }
  }
  if (p.locationsFrozen) {
    anyRetained = true;
    console.log(row("locations (addresses)", `${p.locationsFrozen}  — frozen dispute evidence`));
  }
  if (!anyRetained) console.log("  (nothing — this account has no counterparty records)");

  if (p.tenants) {
    console.log("\nNOT DECIDED BY THIS TOOL");
    console.log(row("tenants", `${p.tenants}  — THIRD-PARTY data (name, phone, id_number)`));
    console.log(
      "  Entered by this landlord about other people. Erasing the landlord is\n" +
        "  not authority to erase a tenant's data. Left untouched; decide separately.",
    );
  }
}

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
async function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (e) {
    console.error(`${e.message}\n\n${USAGE}`);
    process.exit(2);
  }
  if (args.help || process.argv.length <= 2) {
    console.log(USAGE);
    process.exit(args.help ? 0 : 2);
  }

  const db = adminClient();

  if (args.list) return listPending(db);
  if (args.audit) return showAudit(db);

  if (!args.email && !args.userId) {
    console.error(`Give --email or --user-id.\n\n${USAGE}`);
    process.exit(2);
  }
  if (args.email && args.userId) {
    console.error("Give --email or --user-id, not both.");
    process.exit(2);
  }
  if (!args.reason || !args.reason.trim()) {
    console.error(
      "--reason is required and must not be blank. It is stored in audit_log " +
        "and is the only record of why this account was erased.",
    );
    process.exit(2);
  }

  const user = await resolveUser(db, args);
  const requestedAt = user.metadata?.deletion_requested_at ?? null;
  const alreadyErased = user.metadata?.erased_at ?? null;

  console.log(args.execute ? "ERASE ACCOUNT  (--execute)" : "ERASE ACCOUNT  (preview)");
  console.log(row("user", `${user.email ?? "(no email)"}  ${user.id}`));
  console.log(row("name", user.full_name ?? "(none)"));
  console.log(row("requested erasure", requestedAt ?? "NO — never asked"));
  console.log(row("already erased", alreadyErased ?? "no"));
  console.log(row("reason", args.reason.trim()));

  if (alreadyErased) {
    console.log(
      "\nAlready erased. erase_account is idempotent and will not overwrite " +
        "erased_at,\nso there is nothing to do.",
    );
    return;
  }

  // The guard that matters: a mistyped email must not erase a stranger.
  if (!requestedAt && !args.noRequestRequired) {
    console.error(
      "\nREFUSING: this account has no metadata.deletion_requested_at.\n" +
        "It never asked to be erased, and erasing the wrong person because an\n" +
        "email was mistyped is not recoverable.\n\n" +
        "If this erasure is lawful on another basis, re-run with\n" +
        "--no-request-required and say so in --reason.",
    );
    process.exit(3);
  }

  const p = await preview(db, user);
  printPreview(p);

  if (!args.execute) {
    console.log(
      "\nPREVIEW ONLY — nothing was written. The counts above are a projection\n" +
        "from this script; the authority is erase_account itself, whose own\n" +
        "counts are printed after a real run.\n\n" +
        "To proceed, repeat the command with --execute.",
    );
    return;
  }

  const reason = args.noRequestRequired
    ? `${args.reason.trim()} [no prior request; --no-request-required]`
    : args.reason.trim();

  const { data, error } = await db.rpc("erase_account", {
    p_user_id: user.id,
    p_reason: reason,
  });
  if (error) {
    console.error(`\nerase_account failed: ${error.message}`);
    if (/permission denied|not exist/i.test(error.message)) {
      console.error(
        "EXECUTE is granted to service_role only. Check that " +
          "SUPABASE_SERVICE_ROLE_KEY holds the service-role key and that " +
          "20260353000000_account_erasure.sql is applied to this project.",
      );
    }
    process.exit(1);
  }

  console.log("\nERASED. Counts reported by erase_account itself:");
  console.log(row("deleted", JSON.stringify(data.deleted)));
  console.log(row("retained", JSON.stringify(data.retained)));
  console.log(row("flagged", JSON.stringify(data.flagged)));

  // Verify by reading back, not by trusting the return value.
  const after = await resolveUser(db, { userId: user.id });
  const ok =
    after.full_name === "Erased account" &&
    after.email !== user.email &&
    !!after.metadata?.erased_at;
  console.log(row("verified", ok ? "yes — profile is a tombstone" : "NO"));
  if (!ok) {
    console.error(
      "\nUNEXPECTED: erase_account returned success but the profile does not " +
        "read as erased. Investigate before telling the data subject it is done.",
    );
    process.exit(1);
  }
  console.log("\nok. `--audit` shows the trail.");
}

main().catch((e) => {
  // e.message only: a thrown Supabase error object can carry request details,
  // and this process holds a service-role key.
  console.error(`\nerror: ${e.message}`);
  process.exit(1);
});
