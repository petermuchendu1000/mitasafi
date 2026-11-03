#!/usr/bin/env node
/**
 * Run the SQL regression suites in supabase/tests and fail the build on any
 * failing assertion.
 *
 * WHY THIS EXISTS RATHER THAN `psql -f each-file`:
 *
 * Every suite deliberately ends with `RAISE EXCEPTION 'X_RESULT pass=N fail=M ...'`.
 * The exception is how the suite forces its fixtures to roll back, so psql
 * ALWAYS exits non-zero, for a passing run and a failing run alike. Wiring
 * these to a plain `psql -f` step gives a check that can never pass; inverting
 * it with `|| true` gives a check that can never fail. Both are worthless.
 *
 * So the contract is explicit:
 *   - the suite MUST emit a `..._RESULT pass=<n> fail=<m>` line, or it is
 *     treated as a failure (it did not run, or it died before reporting)
 *   - fail > 0 is a failure
 *   - pass == 0 is a failure (a suite that asserts nothing is not a suite)
 *
 * Run:   node scripts/ci/run-sql-suites.mjs "$DATABASE_URL"
 * Check: node scripts/ci/run-sql-suites.mjs --self-test
 */

import { spawnSync } from "node:child_process";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const SUITE_DIR = "supabase/tests";

/**
 * Extract the verdict from a suite's combined output.
 *
 * Returns { pass, fail } or null when no verdict line is present. Null is a
 * failure, never a pass: a suite that produced no verdict did not run.
 */
export function parseVerdict(output) {
  const m = /(?:^|\s)(?:[A-Z0-9_]*RESULT)\s+pass=(\d+)\s+fail=(\d+)/.exec(output);
  if (!m) return null;
  return { pass: Number(m[1]), fail: Number(m[2]) };
}

/** A suite passes only if it reported a verdict, asserted something, and failed nothing. */
export function isPass(verdict) {
  return verdict !== null && verdict.fail === 0 && verdict.pass > 0;
}

function selfTest() {
  // Proves the parser can FAIL. If these ever all pass trivially, the runner is
  // lying and every red build would look green.
  const cases = [
    ["CAPACITY_RESULT pass=8 fail=0\nPASS C1 ...", { pass: 8, fail: 0 }, true],
    ["SUITE_RESULT pass=15 fail=0", { pass: 15, fail: 0 }, true],
    ["RESULT pass=19 fail=0", { pass: 19, fail: 0 }, true],
    ["MUTANT_RESULT pass=6 fail=2\nFAIL C3 ...", { pass: 6, fail: 2 }, false],
    ["RECOVERY_RESULT pass=0 fail=0", { pass: 0, fail: 0 }, false], // asserted nothing
    ["ERROR:  relation does not exist", null, false],              // never ran
    ["", null, false],                                             // no output
    ["psql: connection refused", null, false],                     // no database
    // The real-world shape: psql prints the verdict on stderr, prefixed, as
    // part of an ERROR line. This is what the first version of the runner
    // threw away.
    [
      "psql:supabase/tests/x.sql:140: ERROR:  MONEY_RESULT pass=12 fail=0\nPASS I1 ...",
      { pass: 12, fail: 0 },
      true,
    ],
    // ...and the same shape carrying failures.
    [
      "psql:supabase/tests/x.sql:140: ERROR:  MONEY_RESULT pass=9 fail=3\nFAIL I4 ...",
      { pass: 9, fail: 3 },
      false,
    ],
  ];

  let bad = 0;
  for (const [output, expectedVerdict, expectedPass] of cases) {
    const v = parseVerdict(output);
    const okVerdict = JSON.stringify(v) === JSON.stringify(expectedVerdict);
    const okPass = isPass(v) === expectedPass;
    if (!okVerdict || !okPass) {
      bad++;
      console.error(
        `  SELF-TEST FAIL  input=${JSON.stringify(output.slice(0, 40))} ` +
          `verdict=${JSON.stringify(v)} (want ${JSON.stringify(expectedVerdict)}) ` +
          `pass=${isPass(v)} (want ${expectedPass})`
      );
    }
  }
  if (bad) {
    console.error(`self-test: ${bad} case(s) wrong`);
    process.exit(1);
  }
  console.log(`self-test: ${cases.length}/${cases.length} ok — the parser accepts passes and rejects failures, missing verdicts and empty suites`);
}

function main() {
  const arg = process.argv[2];

  if (arg === "--self-test") {
    selfTest();
    return;
  }

  const dbUrl = arg || process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("usage: run-sql-suites.mjs <DATABASE_URL>   (or set DATABASE_URL)");
    process.exit(2);
  }

  const files = readdirSync(SUITE_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  if (files.length === 0) {
    console.error(`No suites found in ${SUITE_DIR}. Refusing to report success.`);
    process.exit(1);
  }

  let failed = 0;
  let totalPass = 0;
  let totalFail = 0;

  for (const file of files) {
    const path = join(SUITE_DIR, file);

    // spawnSync, and BOTH streams.
    //
    // The first version of this used execFileSync and read only its return
    // value. That was wrong twice over, and the two errors cancelled into
    // silence:
    //   - the verdict is delivered by RAISE EXCEPTION, so psql prints it to
    //     STDERR, and execFileSync returns stdout only;
    //   - under ON_ERROR_STOP=0 psql then exits ZERO, so the catch block that
    //     was supposed to recover stderr never ran.
    // Every suite therefore came back as "no verdict line", including suites
    // that were passing. A step that can only fail is no better than one that
    // can only pass. Found by running this against a real postgres; the
    // parser self-test cannot see it, because the parser was never the bug.
    const run = spawnSync("psql", [dbUrl, "-v", "ON_ERROR_STOP=0", "-f", path], {
      encoding: "utf8",
    });

    if (run.error) {
      console.log(`  FAIL  ${file.padEnd(36)} could not run psql: ${run.error.message}`);
      failed++;
      continue;
    }

    // The exit code is deliberately not consulted: each suite raises on
    // purpose to roll its fixtures back, so psql's status says nothing about
    // whether the assertions passed. The verdict line is the only signal.
    const output = `${run.stdout ?? ""}\n${run.stderr ?? ""}`;

    const verdict = parseVerdict(output);
    if (isPass(verdict)) {
      totalPass += verdict.pass;
      console.log(`  PASS  ${file.padEnd(36)} ${verdict.pass} assertions`);
    } else {
      failed++;
      if (verdict === null) {
        console.log(`  FAIL  ${file.padEnd(36)} no verdict line — the suite did not run`);
        console.log(
          output
            .split("\n")
            .filter((l) => /ERROR|FATAL|psql:/.test(l))
            .slice(0, 6)
            .map((l) => `          ${l.trim()}`)
            .join("\n")
        );
      } else {
        totalPass += verdict.pass;
        totalFail += verdict.fail;
        console.log(`  FAIL  ${file.padEnd(36)} ${verdict.fail} failing assertion(s)`);
        console.log(
          output
            .split("\n")
            .filter((l) => l.includes("FAIL"))
            .slice(0, 10)
            .map((l) => `          ${l.trim()}`)
            .join("\n")
        );
      }
    }
  }

  console.log(
    `\n${files.length - failed}/${files.length} suites passed ` +
      `(${totalPass} assertions passed, ${totalFail} failed)`
  );
  process.exit(failed === 0 ? 0 : 1);
}

main();
