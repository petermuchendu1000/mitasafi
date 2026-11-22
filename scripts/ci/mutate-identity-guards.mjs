#!/usr/bin/env node
/**
 * Mutation-test the identity guards: prove they can detect the defects they
 * claim to prevent.
 *
 * WHY THIS EXISTS
 *
 * src/__tests__/profile-read-scope.test.ts carries this note about one of its
 * own assertions:
 *
 *   "Restoring the real defect left the suite green, so the guard was
 *    decorative. Mutation testing is the only reason that was found."
 *
 * That is the whole argument. A guard is a claim that a defect cannot come
 * back, and the only way to check the claim is to bring the defect back and
 * watch the guard fail. Every assertion added for the identity work is a
 * textual property of a source file or a migration, which is exactly the shape
 * that rots quietly: a reformat, a rename or a reworded comment can make a
 * matcher stop matching without making any test fail.
 *
 * HOW IT WORKS
 *
 * Each mutant reintroduces ONE defect, alone, runs only the suite that should
 * catch it, and records KILLED or SURVIVED. A survivor is either an equivalent
 * mutant or an uncovered defect path, and either way it needs explaining.
 *
 * Run:   node scripts/ci/mutate-identity-guards.mjs
 * Check: node scripts/ci/mutate-identity-guards.mjs --self-test
 *
 * THE SELF-TEST IS NOT OPTIONAL CEREMONY. A harness that can only ever report
 * KILLED proves nothing, and that is the easy way to write one -- for instance
 * by reporting a baseline failure as a kill for every mutant. So --self-test
 * applies semantically NEUTRAL edits (a local rename, a reworded comment) and
 * requires them to SURVIVE. If they are reported killed, the harness is
 * measuring something other than what it claims and its results are void.
 *
 * SAFETY
 *
 * This edits files in the working tree and restores them from the contents it
 * read first. It refuses to start on a dirty tree, so an interrupted run can
 * never be mistaken for your own uncommitted work, and it restores in a
 * finally. It touches no database and never talks to production.
 */

import { spawnSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";

const PP = "src/lib/identity/provider-profile.ts";
const SIGNUP = "src/app/(auth)/signup/page.tsx";
const CALLBACK = "src/app/auth/callback/route.ts";
const ADMINV = "src/lib/services/admin-verification.ts";
const M_VERIF = "supabase/migrations/20260344000000_verification_single_source.sql";
const M_PROV = "supabase/migrations/20260346000000_provision_identity.sql";

const S_PROFILE = "src/__tests__/identity-provider-profile.test.ts";
const S_VERIF = "src/__tests__/verification-single-source.test.ts";
const S_PROV = "src/__tests__/identity-provisioning.test.ts";

/**
 * Each entry: the defect being reintroduced, and the suite whose job it is to
 * notice. `find` must occur EXACTLY ONCE -- a drifted anchor is reported as
 * NOT-APPLIED rather than silently skipped, because a mutant that never
 * applied is not a mutant that was killed.
 */
export const MUTANTS = [
  {
    id: "M01",
    desc: "the builder falls back to a fabricated phone number",
    file: PP,
    find: "const phone = candidates.find((c) => PROVIDER_PHONE_FORMAT.test(c));",
    replace:
      'const phone = candidates.find((c) => PROVIDER_PHONE_FORMAT.test(c)) ?? "+254700000000";',
    suite: S_PROFILE,
  },
  {
    id: "M02",
    desc: "the builder stops refusing when no phone is available",
    file: PP,
    find: "if (candidates.length === 0) {",
    replace: "if (false) {",
    suite: S_PROFILE,
  },
  {
    id: "M03",
    desc: "wallet_balance drops off the trust-column list",
    file: PP,
    find: 'export const PROVIDER_TRUST_COLUMNS = [\n  "account_status",',
    replace: "export const PROVIDER_TRUST_COLUMNS = [",
    suite: S_PROFILE,
  },
  {
    id: "M04",
    desc: "the builder emits a status column, which does not exist",
    file: PP,
    find: "const record: ProviderProfileRecord = {\n    user_id: userId,",
    replace: 'const record = {\n    status: "pending",\n    user_id: userId,',
    suite: S_PROFILE,
  },
  {
    id: "M05",
    desc: "admin verification writes is_verified alongside verification_level",
    file: ADMINV,
    find: '.update({\n        verification_level: "full",\n        updated_at: now,\n      })',
    replace:
      '.update({\n        verification_level: "full",\n        is_verified: true,\n        updated_at: now,\n      })',
    suite: S_VERIF,
  },
  {
    id: "M06",
    desc: "addRoleToUser reverts to a plain insert, so the flow is not re-runnable",
    file: SIGNUP,
    find: '.upsert(roleInsert as never, {\n        onConflict: "user_id,role",\n        ignoreDuplicates: true,\n      });',
    replace: ".insert(roleInsert as never);",
    suite: S_PROV,
  },
  {
    id: "M07",
    desc: "the callback logs a provisioning failure and carries on",
    file: CALLBACK,
    find: 'const response = NextResponse.redirect(\n            `${origin}/login?error=provisioning_failed`,\n          );',
    replace: "// swallowed",
    suite: S_PROV,
  },
  {
    id: "M08",
    desc: "is_verified derives from <> 'none' instead of = 'full'",
    file: M_VERIF,
    find: "GENERATED ALWAYS AS (COALESCE(verification_level = 'full'::text, false)) STORED",
    replace:
      "GENERATED ALWAYS AS (COALESCE(verification_level <> 'none'::text, false)) STORED",
    suite: S_VERIF,
  },
  {
    id: "M09",
    desc: "provision_identity becomes SECURITY DEFINER",
    file: M_PROV,
    find: "RETURNS jsonb\nLANGUAGE plpgsql",
    replace: "RETURNS jsonb\nLANGUAGE plpgsql\nSECURITY DEFINER",
    suite: S_PROV,
  },
  {
    id: "M10",
    desc: "EXECUTE is revoked only from PUBLIC, leaving anon's direct grant",
    file: M_PROV,
    find: "  FROM PUBLIC, anon;",
    replace: "  FROM PUBLIC;",
    suite: S_PROV,
  },
  {
    id: "M11",
    desc: "provision_identity inserts is_verified into profiles",
    file: M_PROV,
    find: "INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, primary_role)",
    replace:
      "INSERT INTO public.profiles (id, email, phone, full_name, avatar_url, primary_role, is_verified)",
    suite: S_PROV,
  },
  {
    id: "M12",
    desc: "a status key reappears in signup",
    file: SIGNUP,
    // Anchored on a line that occurs once. The first version of this mutant
    // anchored on `const built = buildProviderProfile({`, which appears three
    // times -- once per provider-creation site -- and the harness reported it
    // NOT-APPLIED and failed the run rather than counting it as a kill. That
    // is the intended behaviour: a defect that was never reintroduced proves
    // nothing about the guard that did not catch it.
    find: "const typedPhone = phoneNumber",
    replace: 'const _poison = { status: "pending" };\n          const typedPhone = phoneNumber',
    suite: S_PROFILE,
  },
  {
    id: "M13",
    desc: "the callback inserts a profiles row directly again",
    file: CALLBACK,
    find: "if (provisionError) {",
    replace:
      'await supabase.from("profiles").insert({} as never);\n        if (provisionError) {',
    suite: S_PROV,
  },
];

/** Neutral edits. These MUST survive, or the harness is not measuring kills. */
const CONTROLS = [
  {
    id: "C01",
    desc: "rename a local variable",
    file: PP,
    edit: (s) =>
      s
        .replace("const candidates = input.phoneCandidates", "const cands = input.phoneCandidates")
        .replace("candidates.length", "cands.length")
        .replace("candidates.find", "cands.find"),
    suite: S_PROFILE,
  },
  {
    id: "C02",
    desc: "reword a comment",
    file: PP,
    edit: (s) =>
      s.replace(
        "/** The three columns that are NOT NULL with no default, per the live schema. */",
        "/** Columns that are NOT NULL without a default. */",
      ),
    suite: S_PROFILE,
  },
];

function runSuite(suite) {
  const r = spawnSync("npx", ["jest", suite, "--silent"], { encoding: "utf8" });
  return r.status;
}

/**
 * Refuse only if a file this harness will EDIT has uncommitted changes.
 *
 * Scoped to the target files rather than to the whole tree. The harness
 * restores from the contents it read first, so unrelated dirty files are
 * irrelevant, and refusing on them only stops the harness being run during
 * ordinary work — which is when it is most useful. What must not happen is
 * mutating a file whose uncommitted state could then be lost if the process
 * dies between write and restore.
 */
function assertTargetsClean(targets) {
  const r = spawnSync("git", ["status", "--porcelain", "--", ...targets], {
    encoding: "utf8",
  });
  const dirty = (r.stdout || "").split("\n").filter((l) => l.trim());
  if (dirty.length) {
    console.error(
      "refusing to run: a file this harness mutates has uncommitted changes, and an\n" +
        "interrupted run could lose them. Commit or stash these first:\n" +
        dirty.join("\n"),
    );
    process.exit(2);
  }
}

/** Apply one edit, run its suite, always restore. Returns the suite's status. */
function withMutation(file, edit, suite) {
  const original = readFileSync(file, "utf8");
  try {
    const mutated = edit(original);
    if (mutated === original) return { status: null, reason: "anchor did not match" };
    writeFileSync(file, mutated);
    return { status: runSuite(suite), reason: null };
  } finally {
    writeFileSync(file, original);
  }
}

function selfTest() {
  assertTargetsClean([...new Set(CONTROLS.map((c) => c.file))]);
  console.log("self-test: neutral mutants must SURVIVE\n");
  let bad = 0;
  for (const c of CONTROLS) {
    const { status, reason } = withMutation(c.file, c.edit, c.suite);
    if (reason) {
      console.log(`  ${c.id} NOT-APPLIED  ${c.desc} (${reason})`);
      bad++;
      continue;
    }
    const verdict = status === 0 ? "SURVIVED" : "KILLED";
    console.log(`  ${c.id} ${verdict.padEnd(9)} ${c.desc}`);
    if (status !== 0) bad++;
  }
  if (bad) {
    console.error(
      "\nFAIL: a neutral mutant was reported killed, or did not apply. The harness is\n" +
        "measuring something other than what it claims, so its KILLED verdicts are void.",
    );
    process.exit(1);
  }
  console.log("\nself-test passed: the harness can report SURVIVED.");
}

function main() {
  assertTargetsClean([...new Set(MUTANTS.map((m) => m.file))]);
  const results = [];
  for (const m of MUTANTS) {
    const original = readFileSync(m.file, "utf8");
    const occurrences = original.split(m.find).length - 1;
    if (occurrences !== 1) {
      results.push({ ...m, verdict: "NOT-APPLIED", note: `anchor matched ${occurrences}x` });
      continue;
    }
    const { status } = withMutation(m.file, (s) => s.replace(m.find, m.replace), m.suite);
    results.push({ ...m, verdict: status === 0 ? "SURVIVED" : "KILLED", note: "" });
  }

  console.log("MUTANT  VERDICT      SUITE                                  DEFECT");
  for (const r of results) {
    console.log(
      `${r.id}     ${r.verdict.padEnd(12)} ${r.suite.replace("src/__tests__/", "").padEnd(38)} ${r.desc}${r.note ? ` [${r.note}]` : ""}`,
    );
  }

  const killed = results.filter((r) => r.verdict === "KILLED").length;
  const survived = results.filter((r) => r.verdict === "SURVIVED");
  const notApplied = results.filter((r) => r.verdict === "NOT-APPLIED");
  console.log(
    `\nMUTANTS applied=${results.length - notApplied.length} killed=${killed} ` +
      `survived=${survived.length} not-applied=${notApplied.length}`,
  );

  if (notApplied.length) {
    console.error(
      "\nFAIL: a mutant's anchor no longer matches the source. That is not a pass -- the\n" +
        "defect was never reintroduced, so nothing was proven about the guard:\n" +
        notApplied.map((r) => `  ${r.id} ${r.desc}`).join("\n"),
    );
  }
  if (survived.length) {
    console.error(
      "\nFAIL: these defects were reintroduced and no suite noticed. Each is either an\n" +
        "equivalent mutant or an uncovered defect path, and needs explaining:\n" +
        survived.map((r) => `  ${r.id} ${r.desc} (expected ${r.suite})`).join("\n"),
    );
  }
  process.exit(survived.length || notApplied.length ? 1 : 0);
}

if (process.argv.includes("--self-test")) selfTest();
else main();
