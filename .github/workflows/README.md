# CI

## What runs, and what it is for

Before this existed, nothing ran the tests. 549 jest tests and 9 SQL regression
suites — including the proofs for several SEV-0 money and security defects —
were executed only when someone remembered to run them by hand.

### `quality`

| Step                  | Why                                                                                                                                                                |
| --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`              | Fails on a lockfile that disagrees with package.json, which is itself worth checking                                                                               |
| `tsc --noEmit`        | Has repeatedly caught real breakage here: a renamed export, a nullable type reaching a consumer, an RPC signature that drifted from the database after a migration |
| `jest --ci`           | 549 tests                                                                                                                                                          |
| SQL runner self-test  | Checks the suite runner's own parser before trusting it to report on anything                                                                                      |
| Idempotency self-test | Same, for the replay checker's compare logic                                                                                                                       |

### `database`

Spins up `postgres:17`, applies the Supabase surface the migrations assume
(`supabase/ci/bootstrap.sql`), applies all 100 migrations from nothing, runs the
9 SQL suites, then replays every migration to check it can be re-applied.

**Both jobs have now been run end to end** against a real PostgreSQL 16 server:
bootstrap, a from-scratch apply of all 100 migrations, 9/9 suites with 108
assertions, and the replay check. The GitHub runner uses postgres **17**, which
is the one remaining untested difference.

Running it for the first time found three things that the earlier
"reasoned, not observed" version of this file had warned about:

1. **`bootstrap.sql` was missing the `supabase_realtime` publication.** Four
   migrations do `ALTER PUBLICATION supabase_realtime ADD TABLE ...`, which is
   a hard ERROR when the publication does not exist. The whole job failed at
   migration 9 of 100. Fixed in `bootstrap.sql`.

2. **`run-sql-suites.mjs` could never report a pass.** It used `execFileSync`
   and read only the return value — but each suite delivers its verdict through
   `RAISE EXCEPTION`, so psql prints it to **stderr**, and under
   `ON_ERROR_STOP=0` psql then exits **zero**, so the `catch` block that was
   meant to recover stderr never ran. Every suite came back as "no verdict
   line", passing suites included. The parser self-test could not see this,
   because the parser was never the bug. Now uses `spawnSync` and reads both
   streams; the self-test gained the two real-world stderr shapes.

3. **26 of the 100 migrations are not replayable.** See below.

### The replay check, and why it is a budget

`scripts/ci/check-migration-idempotency.mjs`.

Re-applying the tree fails on 26 migrations: legacy `CREATE POLICY` without a
preceding drop, `ADD CONSTRAINT` without `IF NOT EXISTS`,
`ALTER PUBLICATION ADD TABLE` for an already-published table, a
`CREATE OR REPLACE VIEW` whose column order changed. None of that is caused by
any change under review, and fixing all 26 is its own piece of work.

A step that is red on every run is a step someone switches off. So the measured
set lives in `supabase/ci/non-idempotent-migrations.txt` and the script fails on
**movement**:

- a migration **not** in the baseline that fails to replay — the regression
  worth catching, a new migration that cannot reach staging
- a migration **in** the baseline that now replays cleanly — fixed, so take it
  off the list, because a stale baseline stops being evidence

Both directions were checked with a real mutant: an added `CREATE TABLE`
migration exits 1, a phantom baseline entry exits 1, the unmodified tree
exits 0.

## Why the SQL suites need a runner rather than `psql -f`

Every suite ends in `RAISE EXCEPTION '..._RESULT pass=N fail=M'`. The exception
is deliberate: it forces the suite's fixtures to roll back, so the tests leave
nothing behind and are safe against any environment.

The consequence is that the verdict arrives on stderr, inside an `ERROR:` line,
and psql's exit code carries no information about whether the assertions
passed. Wiring the suites to a plain `psql -f` step would give a check that can
never pass; adding `|| true` would give one that can never fail.

`scripts/ci/run-sql-suites.mjs` parses the verdict line instead, and treats all
three of these as failures:

- `fail > 0`
- no verdict line at all (the suite did not run)
- `pass == 0` (a suite that asserts nothing is not a suite)

Run `npm run test:sql:self` to check the parser itself.

That the suites can also go RED was checked, not assumed: reinstating
`profiles_public_read USING (true)` on the test database fails 4 assertions in
`profile_read_scope_test.sql` and the runner exits 1.

## The from-scratch migration run is a real check

Migrations were applied to the live project in a different order during
development, so "the ledger matches the directory" is not evidence that a
clean-room apply works. If two migrations have an ordering dependency, this job
is where it surfaces — before a new environment hits it.

## Not wired, and why

**Linting.** `eslint` 9 is installed with no config (`eslint.config.*` and
`.eslintrc.*` are both absent), and `next lint` was removed in Next 16 — the
old `npm run lint` printed `Invalid project directory provided, no such
directory: .../lint` and **exited 0**, a check that could never fail. The script
now calls `eslint` directly, so it fails honestly until a flat config is added.
Adding that config is a separate piece of work: it will surface a large backlog
and should not be smuggled into a CI change.

**Prettier.** `prettier --check .` currently reports **575 files**. Making it a
blocking gate would mean a mass reformat unrelated to any change under review.
The pre-commit hook formats staged files, so the backlog drains as files are
touched.

**Secrets.** Neither job needs any. The database job uses a throwaway container;
nothing points at the live project.
