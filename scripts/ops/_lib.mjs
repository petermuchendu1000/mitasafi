/**
 * Shared plumbing for the scripts in scripts/ops/.
 *
 * These scripts run with a PRODUCTION SERVICE-ROLE KEY in scope. That key
 * bypasses RLS entirely and is the authority for grant_admin_role,
 * revoke_admin_role and erase_account. So the rules here are not style:
 *
 *   - the key is never printed, never logged, never put in an error message,
 *     and never passed in argv (argv is readable by every process on the box)
 *   - presence is reported, never a prefix or a length: both narrow a key for
 *     anyone reading a shared terminal or a CI log
 *   - no dotenv-style dependency parses the file. A package that decides to log
 *     what it parsed would leak it, and this is not a place to find that out.
 *
 * Extracted from grant-admin.mjs when erase-account.mjs needed the same three
 * things, rather than copied into it. Two copies of credential handling is two
 * places for one of the rules above to be dropped.
 */

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

export const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Parse a .env file without printing any of it.
 *
 * Splits on the FIRST '=' only, which matters because base64 keys contain '='.
 * A missing file is not an error: the environment may carry the values instead.
 */
export function readEnvFile(path) {
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

/**
 * Resolve the project URL and service-role key, or exit 2 with a message that
 * says which one is missing and nothing about either value.
 */
export function credentials() {
  const file = readEnvFile(join(REPO_ROOT, ".env.local"));
  const url =
    process.env.NEXT_PUBLIC_SUPABASE_URL || file.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY || file.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error("Missing Supabase admin credentials.");
    console.error(`  NEXT_PUBLIC_SUPABASE_URL  ${url ? "found" : "MISSING"}`);
    console.error(`  SUPABASE_SERVICE_ROLE_KEY ${key ? "found" : "MISSING"}`);
    console.error(
      "\nSet them in the environment or in .env.local. These scripts need the " +
        "SERVICE ROLE key, not the anon/publishable key: EXECUTE on the " +
        "functions they call is granted to service_role only.",
    );
    process.exit(2);
  }
  return { url, key };
}

/** A service-role client with session persistence off (this is a CLI). */
export function adminClient() {
  const { url, key } = credentials();
  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

/**
 * Resolve one profile by email or id, or throw with something actionable.
 *
 * profiles.email carries no unique constraint, so more than one row is
 * possible. Picking one would be a guess about which human to act on, and both
 * callers of this act irreversibly, so it refuses instead.
 */
export async function resolveUser(db, { email, userId }) {
  if (userId) {
    const { data, error } = await db
      .from("profiles")
      .select("id, email, full_name, metadata, created_at")
      .eq("id", userId)
      .maybeSingle();
    if (error) throw new Error(`looking up ${userId}: ${error.message}`);
    if (!data) {
      throw new Error(
        `no profile with id ${userId}. user_roles and every other reference ` +
          `target profiles(id), so there is nothing to act on.`,
      );
    }
    return data;
  }

  const { data, error } = await db
    .from("profiles")
    .select("id, email, full_name, metadata, created_at")
    .eq("email", email);
  if (error) throw new Error(`looking up ${email}: ${error.message}`);
  if (!data || data.length === 0) {
    throw new Error(`no profile with email ${email}.`);
  }
  if (data.length > 1) {
    throw new Error(
      `${data.length} profiles share the email ${email}:\n` +
        data.map((p) => `  ${p.id}`).join("\n") +
        `\nRe-run with --user-id to say which.`,
    );
  }
  return data[0];
}

/** `exact` row count for a filtered table, without transferring the rows. */
export async function countWhere(db, table, column, value, extra) {
  let q = db.from(table).select("*", { count: "exact", head: true }).eq(column, value);
  if (extra) q = extra(q);
  const { count, error } = await q;
  if (error) throw new Error(`counting ${table}: ${error.message}`);
  return count ?? 0;
}

/** Fixed-width left column, so a report lines up without a table library. */
export function row(label, value, width = 34) {
  return `  ${String(label).padEnd(width)}${value}`;
}
