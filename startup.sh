#!/bin/bash
# =============================================================================
# startup.sh — Automated project startup script
# Builds the Postgres Docker image, recreates the container, waits for the DB
# to be ready, installs dependencies, runs Prisma migrations and generates the
# client, then starts the Next.js dev server.
# =============================================================================

set -euo pipefail

# ── Resolve project root (wherever this script lives) ────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

CONTAINER_NAME="postgresdb-container"
IMAGE_NAME="postgresdb"
PG_USER="root"
PG_DB="filestoragedb"
HEALTH_TIMEOUT=60   # seconds to wait for Postgres to be ready

# ── Colour helpers ────────────────────────────────────────────────────────────
RED='\033[0;31m'; GREEN='\033[0;32m'; YELLOW='\033[1;33m'; CYAN='\033[0;36m'; NC='\033[0m'
info()    { echo -e "${CYAN}[INFO]${NC} $*"; }
success() { echo -e "${GREEN}[OK]${NC}   $*"; }
warn()    { echo -e "${YELLOW}[WARN]${NC} $*"; }
error()   { echo -e "${RED}[ERROR]${NC} $*" >&2; exit 1; }

# ── Prerequisite checks ───────────────────────────────────────────────────────
command -v docker &>/dev/null || error "Docker is not installed or not in PATH."
command -v bun    &>/dev/null || error "Bun is not installed or not in PATH."
docker info &>/dev/null       || error "Docker daemon is not running. Please start Docker and try again."

# ── Smart image build (only rebuild if Dockerfile changed) ───────────────────
HASH_FILE=".dockerfile.sha256"

# Compute a combined hash of Dockerfile (and .dockerignore if present)
CURRENT_HASH=$(cat Dockerfile $([ -f .dockerignore ] && echo .dockerignore) 2>/dev/null | sha256sum | cut -d' ' -f1)

IMAGE_EXISTS=$(docker images --format '{{.Repository}}:{{.Tag}}' | grep -q "^${IMAGE_NAME}:latest$" && echo "yes" || echo "no")
CACHED_HASH=$(cat "$HASH_FILE" 2>/dev/null || echo "")

if [ "$IMAGE_EXISTS" = "yes" ] && [ "$CURRENT_HASH" = "$CACHED_HASH" ]; then
  success "Image '${IMAGE_NAME}' is up-to-date — skipping rebuild."
else
  if [ "$IMAGE_EXISTS" = "no" ]; then
    info "No image found — building '${IMAGE_NAME}' for the first time..."
  else
    info "Dockerfile has changed — rebuilding '${IMAGE_NAME}'..."
  fi
  docker build -t "$IMAGE_NAME" .
  echo "$CURRENT_HASH" > "$HASH_FILE"
  success "Image '${IMAGE_NAME}' built and cache updated."
fi


# ── Recreate container ────────────────────────────────────────────────────────
if docker ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
  warn "Container '${CONTAINER_NAME}' already exists — removing it..."
  docker rm -f "$CONTAINER_NAME" >/dev/null
fi

info "Starting container '${CONTAINER_NAME}'..."
docker run --name "$CONTAINER_NAME" -p 5432:5432 -d "$IMAGE_NAME" >/dev/null
success "Container started."

# ── Wait for Postgres to be healthy (with timeout) ────────────────────────────
info "Waiting for PostgreSQL to accept connections (timeout: ${HEALTH_TIMEOUT}s)..."
SECONDS_WAITED=0
until docker exec "$CONTAINER_NAME" pg_isready -U "$PG_USER" -q 2>/dev/null; do
  if [ "$SECONDS_WAITED" -ge "$HEALTH_TIMEOUT" ]; then
    error "PostgreSQL did not become ready within ${HEALTH_TIMEOUT} seconds."
  fi
  sleep 1
  SECONDS_WAITED=$((SECONDS_WAITED + 1))
done
success "PostgreSQL is ready (waited ${SECONDS_WAITED}s)."

# ── Install dependencies ──────────────────────────────────────────────────────
info "Installing dependencies..."
bun install --frozen-lockfile
success "Dependencies installed."

# ── Run Prisma migrations ─────────────────────────────────────────────────────
info "Running Prisma migrations..."
bun prisma migrate deploy   # non-interactive; applies all pending migrations
success "Migrations applied."

# ── Generate Prisma client ────────────────────────────────────────────────────
info "Generating Prisma client..."
bun prisma generate
success "Prisma client generated."

success "Setup complete! Run 'bun run dev' to start the development server."
