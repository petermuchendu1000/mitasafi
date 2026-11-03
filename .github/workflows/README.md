# CI

## What runs, and what it is for

Before this existed, nothing ran the tests. 541 jest tests and 8 SQL regression
suites — including the proofs for several SEV-0 money and security defects —
were executed only when someone remembered to run them by hand.

### `quality` — verified working

| Step                 | Why                                                                                                                                                                |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `npm ci`             | Fails on a lockfile that disagrees with package.json, which is itself worth checking                                                                               |
| `tsc --noEmit`       | Has repeatedly caught real breakage here: a renamed export, a nullable type reaching a consumer, an RPC signature that drifted from the database after a migration |
| `jest --ci`          | 541 tests                                                                                                                                                          |
| SQL runner self-test | Checks the suite runner's own parser before trusting it to report on anything                                                                                      |

Every command in this job was run locally against this repository and passes.

### `database` — NOT yet verified end to end

Spins up `postgres:17`, applies the Supabase surface the migrations assume
(`supabase/ci/bootstrap.sql`), applies all 98 migrations from nothing, runs the
8 SQL suites, then re-applies every migration to prove idempotency.

**This job has never been executed.** There was no Docker daemon in the
environment where it was written, so the bootstrap and the from-scratch
migration run are reasoned, not observed. Expect the first run to need a round
of fixing. What _was_ verified locally:

- the YAML parses and both jobs are well-formed
- the skip rules select exactly 98 of 101 migrations, matching the live project
- the count assertion discriminates (adding a real migration changes it;
  adding a `_skip_` one does not)
- the suite runner's parser, including its failure modes

The most likely first-run failures are missing pieces of the Supabase surface
in `bootstrap.sql` — a `storage.objects` column some policy references, or an
`auth` helper beyond `uid()`.

## Why the SQL suites need a runner rather than `psql -f`

Every suite ends in `RAISE EXCEPTION '..._RESULT pass=N fail=M'`. The exception
is deliberate: it forces the suite's fixtures to roll back, so the tests leave
nothing behind and are safe against any environment.

The consequence is that `psql` **always** exits non-zero — for a passing run and
a failing run alike. Wiring the suites to a plain `psql -f` step would give a
check that can never pass; adding `|| true` would give one that can never fail.

`scripts/ci/run-sql-suites.mjs` parses the verdict line instead, and treats all
three of these as failures:

- `fail > 0`
- no verdict line at all (the suite did not run)
- `pass == 0` (a suite that asserts nothing is not a suite)

Run `npm run test:sql:self` to check the parser itself.

## The from-scratch migration run is a real check

Migrations were applied to the live project in a different order during
development, so "the ledger matches the directory" is not evidence that a
clean-room apply works. If two migrations have an ordering dependency, this job
is where it surfaces — before a new environment hits it.

The idempotency step matters for the same reason: several migrations are
`CREATE OR REPLACE` over live objects, and one that only works once cannot be
replayed into staging.

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
