#!/usr/bin/env node
/**
 * grant-admin.mjs — the operator path for the admin role.
 *
 * WHY THIS EXISTS
 *
 * public.grant_admin_role / public.revoke_admin_role (added in
 * 20260352-adjacent 20260350000000_admin_grant_path.sql) are the only sanctioned
 * way to grant the admin role, and EXECUTE on them is granted to service_role
 * and nothing else. Until this script, using them meant pasting SQL into the
 * Supabase console by hand — which is how a uuid gets mistyped, a reason gets
 * left blank, and nobody can later say which account was changed or why.
 *
 * This adds NO capability. Anyone who can run this already holds the
 * service-role key, and with that key they could write user_roles directly. What
 * it adds is: resolve the user by email so no uuid is typed, show exactly what
 * will change before changing it, require a reason, and read the audit trail
 * back afterwards.
 *
 * SECRETS
 *
 * The key is read from the environment, or from .env.local if the environment
 * does not carry it. It is never printed, never logged, never included in an
 * error message, and never passed as a command-line argument (argv is visible
 * to every process on the machine). The only thing echoed about it is whether
 * one was found.
 *
 * USAGE
 *
 *   node scripts/ops/grant-admin.mjs --list
 *   node scripts/ops/grant-admin.mjs --email a@b.com --reason "..." --dry-run
 *   node scripts/ops/grant-admin.mjs --email a@b.com --reason "..."
 *   node scripts/ops/grant-admin.mjs --user-id <uuid> --reason "..."
 *   node scripts/ops/grant-admin.mjs --email a@b.com --revoke --reason "..."
 *
 * --dry-run resolves the user and reports what WOULD change, making no write.
 * Without --revoke the action is a grant. Both are idempotent, so re-running is
 * safe; the audit trail records each call with its reason.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, "..", "..");

// ---------------------------------------------------------------------------
// arguments
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { dryRun: false, revoke: false, list: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => {
      const v = argv[++i];
      if (v === undefined || v.startsWith("--")) {
        throw new Error(`${a} needs a value`);
      }
      return v;
    };
    switch (a) {
      case "--email":
        out.email = next();
        break;
      case "--user-id":
        out.userId = next();
        break;
      case "--reason":
        out.reason = next();
        break;
      case "--revoke":
        out.revoke = true;
        break;
      case "--dry-run":
        out.dryRun = true;
        break;
      case "--list":
        out.list = true;
        break;
      case "--help":
      case "-h":
        out.help = true;
        break;
      default:
        throw new Error(`unknown argument: ${a}`);
    }
  }
  return out;
}

const USAGE = `
grant-admin.mjs — grant or revoke the admin role through the audited path.

  --list                 show who currently holds admin, and the audit trail
  --email <address>      the user to act on, resolved via profiles.email
  --user-id <uuid>       the user to act on, by id (use when email is ambiguous)
  --reason "<text>"      why. Required for a grant or revoke; it is stored in
                         audit_log and the database refuses a blank one.
  --revoke               deactivate the role instead of granting it
  --dry-run              resolve and report, write nothing
  --help

Credentials come from NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in
the environment, or from .env.local. The key is never printed.
`.trim();

// ---------------------------------------------------------------------------
// credentials
// ---------------------------------------------------------------------------
/**
 * Read .env.local without printing any of it.
 *
 * Deliberately not using a dotenv package: this runs with a production
 * service-role key in scope, and a dependency that decides to log what it
 * parsed would leak it. Splitting on the FIRST '=' only matters because base64
 * keys contain '='.
 */
function readEnvFile(path) {
  let text;
  try {
    text = readFileSync(path, "utf8");
  } catch {
    return {};
  }
  const env = {};
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const eq = t.indexOf("=");
    if (eq < 1) continue;
    let v = t.slice(eq + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    env[t.slice(0, eq).trim()] = v;
  }
  return env;
}

function credentials() {
  const file = readEnvFile(join(REPO, ".env.local"));
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || file.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || file.SUPABASE_SERVICE_ROLE_KEY;

  // Report PRESENCE, never the value, and never a prefix or length either --
  // both narrow a key for anyone reading a shared terminal or a CI log.
  if (!url || !key) {
    console.error("Missing Supabase admin credentials.");
    console.error(`  NEXT_PUBLIC_SUPABASE_URL  ${url ? "found" : "MISSING"}`);
    console.error(`  SUPABASE_SERVICE_ROLE_KEY ${key ? "found" : "MISSING"}`);
    console.error(
      "\nSet them in the environment or in .env.local. This script needs the " +
        "SERVICE ROLE key, not the anon/publishable key: EXECUTE on " +
        "grant_admin_role is granted to service_role only.",
    );
    process.exit(2);
  }
  return { url, key };
}

// ---------------------------------------------------------------------------
// reporting
// ---------------------------------------------------------------------------
async function listAdmins(db) {
  const { data: roles, error: rolesError } = await db
    .from("user_roles")
    .select("user_id, is_active, is_verified, created_at, updated_at")
    .eq("role", "admin")
    .order("created_at", { ascending: true });
  if (rolesError) throw new Error(`reading user_roles: ${rolesError.message}`);

  console.log("ADMIN ROLES");
  if (!roles || roles.length === 0) {
    console.log("  (none — nobody holds the admin role)");
  } else {
    // Resolved separately rather than with a join: user_roles -> profiles is a
    // foreign key, but PostgREST needs an embedding hint for it and a wrong
    // hint fails at runtime. Two plain reads cannot.
    const ids = roles.map((r) => r.user_id);
    const { data: profiles, error: pErr } = await db
      .from("profiles")
      .select("id, email, full_name")
      .in("id", ids);
    if (pErr) throw new Error(`reading profiles: ${pErr.message}`);
    const byId = new Map((profiles || []).map((p) => [p.id, p]));
    for (const r of roles) {
      const p = byId.get(r.user_id);
      console.log(
        `  ${r.is_active ? "ACTIVE  " : "revoked "} ${p?.email ?? "(no profile)"}` +
          `  ${r.user_id}  granted ${String(r.created_at).slice(0, 19)}`,
      );
    }
  }

  const { data: audit, error: aErr } = await db
    .from("audit_log")
    .select("created_at, action, entity_id, details")
    .in("action", ["admin_role_granted", "admin_role_revoked"])
    .order("created_at", { ascending: false })
    .limit(25);
  if (aErr) throw new Error(`reading audit_log: ${aErr.message}`);

  console.log("\nAUDIT TRAIL (most recent 25)");
  if (!audit || audit.length === 0) {
    console.log("  (empty)");
  } else {
    for (const a of audit) {
      const d = a.details || {};
      console.log(
        `  ${String(a.created_at).slice(0, 19)}  ${a.action}  ` +
          `${d.target_email ?? d.target_user_id ?? "?"}  — ${d.reason ?? "(no reason recorded)"}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// resolution
// ---------------------------------------------------------------------------
async function resolveUser(db, { email, userId }) {
  if (userId) {
    const { data, error } = await db
      .from("profiles")
      .select("id, email, full_name")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`looking up ${userId}: ${error.message}`);
    if (!data) {
      throw new Error(
        `no profile with id ${userId}. The user must have signed up first — ` +
          `user_roles.user_id references profiles(id).`,
      );
    }
    return data;
  }

  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name")
    .eq("email", email);
  if (error) throw new Error(`looking up ${email}: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(
      `no profile with email ${email}. The user must have signed up first.`,
    );
  }
  // profiles.email carries no unique constraint, so more than one row is
  // possible. Picking one would be a guess about which human to make an admin.
  if (data.length > 1) {
    throw new Error(
      `${data.length} profiles share the email ${email}:\n` +
        data.map((p) => `  ${p.id}`).join("\n") +
        `\nRe-run with --user-id to say which.`,
    );
  }
  return data[0];
}

async function currentlyAdmin(db, userId) {
  const { data, error } = await db
    .from("user_roles")
    .select("is_active")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error) throw new Error(`reading current role: ${error.message}`);
  if (!data) return "absent";
  return data.is_active ? "active" : "revoked";
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

  const { url, key } = credentials();
  const db = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  if (args.list) {
    await listAdmins(db);
    return;
  }

  if (!args.email && !args.userId) {
    console.error(`Give --email or --user-id.\n\n${USAGE}`);
    process.exit(2);
  }
  if (args.email && args.userId) {
    console.error("Give --email or --user-id, not both.");
    process.exit(2);
  }
  // Checked here as well as in the database. The database is the authority and
  // raises null_value_not_allowed on a blank reason, but failing before the
  // round trip gives a message about the argument rather than about an SQL
  // error code.
  if (!args.reason || !args.reason.trim()) {
    console.error(
      "--reason is required and must not be blank. It is stored in audit_log " +
        "and is the only record of why this account holds admin.",
    );
    process.exit(2);
  }

  const user = await resolveUser(db, args);
  const before = await currentlyAdmin(db, user.id);
  const action = args.revoke ? "REVOKE" : "GRANT";

  console.log(`${action} admin`);
  console.log(`  user     ${user.email ?? "(no email)"}  ${user.id}`);
  console.log(`  name     ${user.full_name ?? "(none)"}`);
  console.log(`  current  ${before}`);
  console.log(`  reason   ${args.reason.trim()}`);

  // Say plainly when the call will change nothing. Both functions are
  // idempotent, so this is informational, not a refusal.
  if (!args.revoke && before === "active") {
    console.log(
      "\n  NOTE: already an active admin. The call is idempotent; it will " +
        "record another audit entry with this reason and change nothing else.",
    );
  }
  if (args.revoke && before !== "active") {
    console.log(
      `\n  NOTE: not currently an active admin (${before}). The revoke will be ` +
        "a no-op and will not write an audit entry.",
    );
  }

  if (args.dryRun) {
    console.log("\n--dry-run: nothing was written.");
    return;
  }

  const fn = args.revoke ? "revoke_admin_role" : "grant_admin_role";
  const { data, error } = await db.rpc(fn, {
    p_user_id: user.id,
    p_reason: args.reason.trim(),
  });

  if (error) {
    // The common failure is using the anon key, which cannot execute these.
    console.error(`\n${fn} failed: ${error.message}`);
    if (/permission denied|not exist/i.test(error.message)) {
      console.error(
        "EXECUTE on this function is granted to service_role only. Check that " +
          "SUPABASE_SERVICE_ROLE_KEY holds the service-role key, and that " +
          "20260350000000_admin_grant_path.sql has been applied to this project.",
      );
    }
    process.exit(1);
  }

  const after = await currentlyAdmin(db, user.id);
  console.log(`\n  result   ${JSON.stringify(data)}`);
  console.log(`  now      ${after}`);

  // Verify the outcome rather than trusting the return value. The function
  // reports what it did; this reads back what is true.
  const expected = args.revoke ? "revoked" : "active";
  if (after !== expected && !(args.revoke && after === "absent")) {
    console.error(
      `\nUNEXPECTED: expected the role to be ${expected} afterwards, found ${after}.`,
    );
    process.exit(1);
  }
  console.log("\nok. `--list` shows the audit trail.");
}

main().catch((e) => {
  // e.message only: a thrown Supabase error object can carry request details,
  // and this process holds a service-role key.
  console.error(`\nerror: ${e.message}`);
  process.exit(1);
});
