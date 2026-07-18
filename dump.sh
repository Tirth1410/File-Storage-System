#!/bin/bash
# =============================================================================
# dump.sh — Export the PostgreSQL database to a timestamped SQL file
# Usage: ./dump.sh [output-dir]   (default output dir: ./dump)
# =============================================================================

set -euo pipefail

# ── Resolve project root ──────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CONTAINER_NAME="postgresdb-container"
PG_USER="root"
PG_PASSWORD="root"
PG_DB="filestoragedb"
OUTPUT_DIR="${1:-dump}"   # allow custom output dir as first argument

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Prerequisite checks ───────────────────────────────────────────────────────
command -v docker &>/dev/null || error "Docker is not installed or not in PATH."
docker info &>/dev/null       || error "Docker daemon is not running."

if ! docker ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  error "Container '${CONTAINER_NAME}' is not running. Start it first with ./startup.sh"
fi

# ── Prepare output directory ──────────────────────────────────────────────────
mkdir -p "$OUTPUT_DIR"
DUMP_FILE="${OUTPUT_DIR}/db_dump_$(date +%Y%m%d_%H%M%S).sql"

# ── Dump — clean up the partial file if pg_dump fails ────────────────────────
info "Dumping '${PG_DB}' → '${DUMP_FILE}'..."
cleanup() { rm -f "$DUMP_FILE"; }
trap cleanup ERR

# PGPASSWORD is passed via docker exec -e so pg_dump never prompts
docker exec -e PGPASSWORD="$PG_PASSWORD" "$CONTAINER_NAME" \
  pg_dump -U "$PG_USER" -d "$PG_DB" > "$DUMP_FILE"

trap - ERR   # clear cleanup trap on success

# ── Sanity check: ensure the file is non-empty ───────────────────────────────
if [ ! -s "$DUMP_FILE" ]; then
  rm -f "$DUMP_FILE"
  error "Dump produced an empty file — something went wrong. File removed."
fi

success "Database dumped successfully → ${DUMP_FILE} ($(du -sh "$DUMP_FILE" | cut -f1))"

