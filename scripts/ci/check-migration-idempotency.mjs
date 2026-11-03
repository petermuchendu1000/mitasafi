#!/usr/bin/env node
/**
 * Re-apply every migration over an already-migrated database and report which
 * ones are not idempotent.
 *
 * WHY A BUDGET AND NOT A PLAIN PASS/FAIL
 *
 * Re-applying the tree as it stands fails on 26 of 99 migrations. They are
 * legacy: `CREATE POLICY` without a drop, `ADD CONSTRAINT` without IF NOT
 * EXISTS, `ALTER PUBLICATION ADD TABLE` for a table already published, a view
 * whose column order changed under CREATE OR REPLACE. None of that is caused
 * by any single change under review, and fixing all 26 is its own piece of
 * work.
 *
 * A step that is red on every run gets switched off, which is how a real
 * check dies. So the baseline is written down, and this script fails on
 * MOVEMENT rather than on the standing total:
 *
 *   - a migration NOT in the baseline that fails to re-apply  -> fail
 *     (that is the regression worth catching: a NEW migration that cannot be
 *      replayed into staging)
 *   - a migration IN the baseline that now re-applies cleanly -> fail
 *     (fixed, so take it off the list; a stale baseline stops being evidence)
 *
 * Run:   node scripts/ci/check-migration-idempotency.mjs "$DATABASE_URL"
 * Check: node scripts/ci/check-migration-idempotency.mjs --self-test
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const MIGRATIONS_DIR = "supabase/migrations";
const BASELINE_FILE = "supabase/ci/non-idempotent-migrations.txt";

/** Mirrors the apply step: the reset script, and _skip_/_test_ PREFIXES only. */
export function isSkipped(basename) {
  return (
    basename === "00000000000000_reset_database.sql" ||
    basename.startsWith("_skip_") ||
    basename.startsWith("_test_")
  );
}

export function readBaseline(text) {
  return new Set(
    text
      .split("\n")
      .map((l) => l.replace(/#.*$/, "").trim())
      .filter(Boolean)
  );
}

/** Returns the exit decision so it can be tested without a database. */
export function compare(failures, baseline) {
  const unexpected = [...failures].filter((f) => !baseline.has(f)).sort();
  const fixed = [...baseline].filter((f) => !failures.has(f)).sort();
  return { unexpected, fixed, ok: unexpected.length === 0 && fixed.length === 0 };
}

function selfTest() {
  const cases = [
    // [failures, baseline, expect ok]
    [["a.sql"], ["a.sql"], true],
    [[], [], true],
    [["a.sql", "b.sql"], ["a.sql"], false], // b is a new regression
    [["a.sql"], ["a.sql", "b.sql"], false], // b was fixed, baseline is stale
    [[], ["a.sql"], false],
    [["a.sql"], [], false],
  ];
  let bad = 0;
  for (const [f, b, expectOk] of cases) {
    const r = compare(new Set(f), new Set(b));
    if (r.ok !== expectOk) {
      bad++;
      console.error(
        `  SELF-TEST FAIL failures=${JSON.stringify(f)} baseline=${JSON.stringify(b)} ` +
          `ok=${r.ok} (want ${expectOk})`
      );
    }
  }
  const parsed = readBaseline("# a comment\n\na.sql\n  b.sql  # trailing\n");
  if (parsed.size !== 2 || !parsed.has("a.sql") || !parsed.has("b.sql")) {
    bad++;
    console.error(`  SELF-TEST FAIL baseline parse -> ${[...parsed]}`);
  }
  if (!isSkipped("_test_foo.sql") || isSkipped("20260109120021_test_service_type_immutability.sql")) {
    bad++;
    console.error("  SELF-TEST FAIL skip rule is not prefix-only");
  }
  if (bad) {
    console.error(`self-test: ${bad} case(s) wrong`);
    process.exit(1);
  }
  console.log(
    `self-test: ${cases.length + 2}/${cases.length + 2} ok — new regressions and stale baseline entries both fail, skip rule is prefix-only`
  );
}

function main() {
  const arg = process.argv[2];
  if (arg === "--self-test") {
    selfTest();
    return;
  }

  const dbUrl = arg || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("usage: check-migration-idempotency.mjs <DATABASE_URL>");
    process.exit(2);
  }

  const baseline = readBaseline(readFileSync(BASELINE_FILE, "utf8"));
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith(".sql") && !isSkipped(f))
    .sort();

  if (files.length === 0) {
    console.error("No migrations found. Refusing to report success.");
    process.exit(1);
  }

  const failures = new Set();
  const reasons = new Map();

  for (const file of files) {
    const run = spawnSync(
      "psql",
      [dbUrl, "-v", "ON_ERROR_STOP=1", "-q", "-f", join(MIGRATIONS_DIR, file)],
      { encoding: "utf8" }
    );
    if (run.error) {
      console.error(`could not run psql: ${run.error.message}`);
      process.exit(2);
    }
    if (run.status !== 0) {
      failures.add(file);
      const line = `${run.stdout ?? ""}\n${run.stderr ?? ""}`
        .split("\n")
        .find((l) => l.includes("ERROR"));
      reasons.set(file, (line ?? "unknown error").trim());
    }
  }

  const { unexpected, fixed, ok } = compare(failures, baseline);

  console.log(
    `re-applied ${files.length} migration(s): ${files.length - failures.size} clean, ` +
      `${failures.size} not idempotent (baseline allows ${baseline.size})`
  );

  if (unexpected.length) {
    console.log("\nNEW non-idempotent migration(s) -- this is the regression:");
    for (const f of unexpected) console.log(`  ${f}\n      ${reasons.get(f)}`);
    console.log(
      "\nA migration that only works once cannot be replayed into staging or a\n" +
        "fresh environment. Guard the statement (IF NOT EXISTS / DROP ... IF EXISTS)\n" +
        "rather than adding it to the baseline."
    );
  }

  if (fixed.length) {
    console.log("\nBaseline entries that now re-apply cleanly -- remove them from");
    console.log(`${BASELINE_FILE}:`);
    for (const f of fixed) console.log(`  ${f}`);
  }

  process.exit(ok ? 0 : 1);
}

main();
