#!/usr/bin/env bash
# =============================================================================
# A throwaway local Postgres with this project's schema applied from scratch.
# =============================================================================
# WHY THIS EXISTS
#
# The SQL suites in supabase/tests and the migration guards only run against a
# real database. CI has one (a postgres:17 service container); a dev machine
# usually does not, so in practice nobody ran them outside CI -- and nothing in
# the repository said it was possible.
#
# It is possible, and it matters. The suites caught a production defect that
# the live project could not: a foreign key added to
# booking_status_history.changed_by would have blocked every system-initiated
# booking status change, because a trigger writes a nil-uuid sentinel there.
# On the live project it applied cleanly and every guard passed -- bookings and
# profiles are both empty, so nothing could fail. Ten of thirteen suites failed
# the moment they ran against a schema built from scratch.
#
# The lesson worth keeping: "idempotent against the live database" and "applies
# correctly from scratch" are different properties, and only the second one
# exercises the triggers.
#
# USAGE
#
#   scripts/ci/local-pg.sh up       build a cluster and apply everything
#   scripts/ci/local-pg.sh suites   run the SQL regression suites against it
#   scripts/ci/local-pg.sh idem     run the idempotency checker against it
#   scripts/ci/local-pg.sh psql     open a shell on it
#   scripts/ci/local-pg.sh url      print the DATABASE_URL
#   scripts/ci/local-pg.sh down     stop it and delete the data directory
#
# A full check is: up, then suites, then idem.
#
# REQUIREMENTS AND CAVEATS
#
#   - A Postgres SERVER package, not just the client. Debian/Ubuntu put it in
#     /usr/lib/postgresql/<major>/bin, which is NOT on PATH, so `which postgres`
#     finding nothing does not mean it is absent -- look there first.
#   - initdb refuses to run as root. If this script is run as root it creates
#     an unprivileged account (default: pgtest) and runs the cluster as that
#     user. The data directory lives in that user's HOME, deliberately: a
#     directory under /tmp or a scratch path may sit beneath parents the new
#     user cannot traverse, which initdb reports as "could not access
#     directory" rather than as a permissions problem.
#   - THE MAJOR VERSION MAY NOT MATCH. CI uses postgres:17 and the live project
#     runs 17.x. Whatever is installed locally is what you get, and this script
#     prints it. A pass here is strong evidence, not identical evidence.
#   - This is for local use. CI should keep using its service container.
# =============================================================================

set -euo pipefail

PG_USER="${LOCAL_PG_USER:-pgtest}"
PG_DB="${LOCAL_PG_DB:-mitasafi_local}"
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# --- locate a server, not just a client -------------------------------------
find_pgbin() {
  local candidate
  for candidate in /usr/lib/postgresql/*/bin /usr/pgsql-*/bin /opt/homebrew/opt/postgresql@*/bin; do
    [ -x "$candidate/initdb" ] && [ -x "$candidate/postgres" ] && { echo "$candidate"; return 0; }
  done
  if command -v initdb >/dev/null 2>&1 && command -v postgres >/dev/null 2>&1; then
    dirname "$(command -v initdb)"; return 0
  fi
  return 1
}

PGBIN="$(find_pgbin)" || {
  cat >&2 <<'EOF'
No Postgres SERVER found. A psql client alone is not enough.

  Debian/Ubuntu:  apt-get install -y postgresql
  then look in    /usr/lib/postgresql/<major>/bin

Note that `which postgres` returning nothing does not mean it is missing --
the server binaries are not on PATH on Debian-family systems.
EOF
  exit 1
}

# --- run-as-user plumbing ----------------------------------------------------
# When root, everything that touches the cluster runs as PG_USER.
AS_PG=()
if [ "$(id -u)" = "0" ]; then
  id -u "$PG_USER" >/dev/null 2>&1 || useradd -m -s /bin/bash "$PG_USER"
  AS_PG=(runuser -u "$PG_USER" --)
  PG_HOME="$(getent passwd "$PG_USER" | cut -d: -f6)"
else
  PG_HOME="$HOME"
fi

PGDATA="$PG_HOME/mitasafi-pgdata"
SOCK="$PG_HOME/mitasafi-pgsock"
DATABASE_URL="postgresql://postgres@/$PG_DB?host=$SOCK"

running() { "${AS_PG[@]}" "$PGBIN/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; }

cmd_up() {
  if running; then
    echo "already running — $("$PGBIN/psql" "$DATABASE_URL" -Atc 'select version();' | cut -c1-40)"
    echo "DATABASE_URL=$DATABASE_URL"
    return 0
  fi

  echo "==> initdb ($PGBIN)"
  rm -rf "$PGDATA" "$SOCK"
  "${AS_PG[@]}" mkdir -p "$PGDATA" "$SOCK"
  "${AS_PG[@]}" "$PGBIN/initdb" -D "$PGDATA" -U postgres --auth=trust -E UTF8 >/dev/null

  echo "==> start"
  "${AS_PG[@]}" "$PGBIN/pg_ctl" -D "$PGDATA" \
    -o "-k $SOCK -h '' -c max_connections=20 -c fsync=off" \
    -l "$PG_HOME/mitasafi-pg.log" -w start >/dev/null
  # So a root shell can reach a socket owned by PG_USER.
  chmod 777 "$SOCK"

  "$PGBIN/psql" -h "$SOCK" -U postgres -Atc 'select version();' postgres
  "$PGBIN/createdb" -h "$SOCK" -U postgres "$PG_DB"

  echo "==> bootstrap the Supabase surface"
  # auth schema, auth.uid(), auth.users, the three client roles, extensions.
  # Without this the migrations fail immediately: they are written against a
  # Supabase project, where the platform provides all of that.
  "$PGBIN/psql" "$DATABASE_URL" -v ON_ERROR_STOP=1 -q \
    -f "$REPO_ROOT/supabase/ci/bootstrap.sql"

  echo "==> apply migrations from scratch"
  # Skip rules MIRROR .github/workflows/ci.yml exactly: the reset script, and
  # files whose NAME BEGINS WITH _skip_ or _test_. Prefix, not infix --
  # 20260109120005_test_enforcement.sql contains "_test_" but IS applied to the
  # live project, and an infix pattern would make this validate a different
  # schema than production runs.
  local applied=0 expected base
  shopt -s nullglob
  for f in "$REPO_ROOT"/supabase/migrations/*.sql; do
    base="$(basename "$f")"
    case "$base" in
      00000000000000_reset_database.sql) continue ;;
      _skip_*|_test_*)                   continue ;;
    esac
    if ! "$PGBIN/psql" "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -f "$f"; then
      echo "FAILED applying $base" >&2
      return 1
    fi
    applied=$((applied + 1))
  done
  expected=$(ls "$REPO_ROOT"/supabase/migrations/*.sql \
             | grep -vcE '/(00000000000000_reset_database|_skip_|_test_)')
  echo "applied $applied of $expected"
  # A run that applied nothing, or only some, must not report success.
  [ "$applied" -gt 0 ] && [ "$applied" -eq "$expected" ]

  echo
  echo "ready. DATABASE_URL=$DATABASE_URL"
  echo "next:  scripts/ci/local-pg.sh suites"
}

require_running() {
  running || { echo "not running — scripts/ci/local-pg.sh up" >&2; exit 1; }
}

cmd_suites() {
  require_running
  cd "$REPO_ROOT"
  # run-sql-suites.mjs shells out to psql, so it must be on PATH.
  PATH="$PGBIN:$PATH" node scripts/ci/run-sql-suites.mjs "$DATABASE_URL"
}

cmd_idem() {
  require_running
  cd "$REPO_ROOT"
  PATH="$PGBIN:$PATH" node scripts/ci/check-migration-idempotency.mjs "$DATABASE_URL"
}

cmd_psql() { require_running; exec "$PGBIN/psql" "$DATABASE_URL"; }
cmd_url()  { echo "$DATABASE_URL"; }

# Processes belonging to THIS cluster, matched on its data directory.
#
# Deliberately not `pgrep -u $PG_USER postgres`: that matches every cluster the
# account owns, so `down` on one would kill another. Matching the -D argument
# scopes it to this one.
cluster_pids() { pgrep -f -- "postgres .*-D $PGDATA( |$)" 2>/dev/null || true; }

cmd_down() {
  if running; then
    # -m immediate: this cluster is disposable, so do not wait for a clean
    # checkpoint. Stop BEFORE removing the data directory -- removing it from
    # under a live server leaves an orphaned process holding a deleted path,
    # which is easy to do and easy to miss.
    "${AS_PG[@]}" "$PGBIN/pg_ctl" -D "$PGDATA" -m immediate -w stop >/dev/null 2>&1 || true
  fi

  # `pg_ctl -w stop` returns once the postmaster is gone, but its children can
  # still be winding down for a moment afterwards. Checking immediately reports
  # a survivor that is simply mid-exit, so wait for them before concluding
  # anything -- and only then remove the data directory.
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -z "$(cluster_pids)" ] && break
    sleep 0.5
  done

  local stragglers
  stragglers="$(cluster_pids)"
  if [ -n "$stragglers" ]; then
    echo "this cluster's postgres did not exit; killing: $stragglers" >&2
    kill -9 $stragglers 2>/dev/null || true
    sleep 1
  fi

  rm -rf "$PGDATA" "$SOCK" "$PG_HOME/mitasafi-pg.log"
  echo "down"
}

case "${1:-}" in
  up)     cmd_up ;;
  suites) cmd_suites ;;
  idem)   cmd_idem ;;
  psql)   cmd_psql ;;
  url)    cmd_url ;;
  down)   cmd_down ;;
  *) sed -n '/^# USAGE/,/^# REQUIREMENTS/p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 2 ;;
esac
