#!/bin/bash
# =============================================================================
# restore.sh — Restore PostgreSQL database from a SQL dump file
# Usage: ./restore.sh <path-to-dump-file>
# =============================================================================

set -euo pipefail

# ── Resolve project root ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CONTAINER_NAME="postgresdb-container"
PG_USER="root"
PG_PASSWORD="root"
PG_DB="filestoragedb"

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Argument validation ───────────────────────────────────────────────────────
if [ -z "${1:-}" ]; then
  error "No dump file specified.\nUsage: $0 <path-to-dump-file>\nExample: $0 dump/db_dump_20260718_175230.sql"
fi

DUMP_FILE="$1"

[ -f "$DUMP_FILE" ] || error "Dump file not found: '$DUMP_FILE'"
[ -s "$DUMP_FILE" ] || error "Dump file is empty: '$DUMP_FILE'"

# ── Prerequisite checks ───────────────────────────────────────────────────────
command -v docker &>/dev/null || error "Docker is not installed or not in PATH."
docker info &>/dev/null       || error "Docker daemon is not running."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  error "Container '${CONTAINER_NAME}' is not running. Start it first with ./startup.sh"
fi

# ── Confirmation prompt (destructive operation) ───────────────────────────────
warn "This will DESTROY all data in '${PG_DB}' and replace it with '$(basename "$DUMP_FILE")'."
read -rp "Are you sure? Type 'yes' to confirm: " CONFIRM
if [ "$CONFIRM" != "yes" ]; then
  echo "Aborted."
  exit 0
fi

# Helper: run a psql command inside the container with password injected
psql_exec() {
  docker exec -e PGPASSWORD="$PG_PASSWORD" "$CONTAINER_NAME" \
    psql -U "$PG_USER" -d postgres -v ON_ERROR_STOP=1 "$@"
}

# ── Terminate active connections ──────────────────────────────────────────────
info "Terminating active connections to '${PG_DB}'..."
psql_exec -c "SELECT pg_terminate_backend(pid)
              FROM pg_stat_activity
              WHERE datname = '${PG_DB}'
                AND pid <> pg_backend_pid();" > /dev/null 2>&1 || true

# ── Drop and recreate the database ───────────────────────────────────────────
info "Dropping database '${PG_DB}'..."
psql_exec -c "DROP DATABASE IF EXISTS ${PG_DB};"

info "Recreating database '${PG_DB}'..."
psql_exec -c "CREATE DATABASE ${PG_DB};"

# ── Restore — pipe dump file into psql, abort on first SQL error ─────────────
info "Restoring from '${DUMP_FILE}'..."
cat "$DUMP_FILE" | docker exec -i \
  -e PGPASSWORD="$PG_PASSWORD" \
  "$CONTAINER_NAME" \
  psql -U "$PG_USER" -d "$PG_DB" \
  -v ON_ERROR_STOP=1 \
  --quiet

success "Database '${PG_DB}' restored successfully from '$(basename "$DUMP_FILE")'."
