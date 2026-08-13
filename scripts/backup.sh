#!/usr/bin/env bash
# ── Realm Backup Script ───────────────────────────────────────────────────────
#
# Backs up:
#   1. PostgreSQL database  → compressed .sql.gz dump
#   2. MinIO S3 bucket      → rsync-style mirror to local backup directory
#
# Usage:
#   ./scripts/backup.sh [--env /path/to/.env]
#
# Schedule with cron (daily at 02:00):
#   0 2 * * * /opt/realm/scripts/backup.sh >> /var/log/realm-backup.log 2>&1
#
# Retention: keeps the last 30 days of database dumps automatically.
# MinIO mirror is a full sync (deletions are NOT mirrored — safe).
# ─────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Configuration ─────────────────────────────────────────────────────────────

ENV_FILE="${1:-$(dirname "$0")/../.env}"
if [[ -f "$ENV_FILE" ]]; then
  # shellcheck disable=SC1090
  set -o allexport; source "$ENV_FILE"; set +o allexport
fi

BACKUP_DIR="${BACKUP_DIR:-/var/backups/realm}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# PostgreSQL connection (falls back to dev defaults)
POSTGRES_HOST="${POSTGRES_HOST:-localhost}"
POSTGRES_PORT="${POSTGRES_PORT:-5432}"
POSTGRES_USER="${POSTGRES_USER:-realm}"
POSTGRES_PASSWORD="${POSTGRES_PASSWORD:-password}"
POSTGRES_DB="${POSTGRES_DB:-realm}"

# MinIO / S3
MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost}"
MINIO_PORT="${MINIO_PORT:-9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_BUCKET="${MINIO_BUCKET:-realm-files}"
MINIO_USE_SSL="${MINIO_USE_SSL:-false}"

MINIO_ALIAS="realm-backup-$$"

# ── Helpers ───────────────────────────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
require() { command -v "$1" &>/dev/null || { log "ERROR: $1 is not installed."; exit 1; }; }

# ── Preflight ─────────────────────────────────────────────────────────────────

require pg_dump
require gzip
require mc  # MinIO Client — install: https://min.io/docs/minio/linux/reference/minio-mc.html

mkdir -p "$BACKUP_DIR/db" "$BACKUP_DIR/s3"
log "Backup directory: $BACKUP_DIR"

# ── 1. PostgreSQL dump ────────────────────────────────────────────────────────

DB_DUMP="$BACKUP_DIR/db/realm_${TIMESTAMP}.sql.gz"

log "Starting PostgreSQL backup → $DB_DUMP"

PGPASSWORD="$POSTGRES_PASSWORD" pg_dump \
  --host="$POSTGRES_HOST" \
  --port="$POSTGRES_PORT" \
  --username="$POSTGRES_USER" \
  --dbname="$POSTGRES_DB" \
  --format=plain \
  --no-owner \
  --no-acl \
  | gzip -9 > "$DB_DUMP"

DB_SIZE=$(du -sh "$DB_DUMP" | cut -f1)
log "PostgreSQL backup complete — $DB_SIZE compressed"

# ── 2. Prune old DB dumps ─────────────────────────────────────────────────────

PRUNED=$(find "$BACKUP_DIR/db" -name "realm_*.sql.gz" -mtime +"$RETENTION_DAYS" -print -delete | wc -l)
if [[ "$PRUNED" -gt 0 ]]; then
  log "Pruned $PRUNED database dump(s) older than ${RETENTION_DAYS} days"
fi

# ── 3. MinIO bucket mirror ────────────────────────────────────────────────────

PROTOCOL="http"
if [[ "$MINIO_USE_SSL" == "true" ]]; then PROTOCOL="https"; fi

log "Registering MinIO alias '$MINIO_ALIAS'…"
mc alias set "$MINIO_ALIAS" \
  "${PROTOCOL}://${MINIO_ENDPOINT}:${MINIO_PORT}" \
  "$MINIO_ACCESS_KEY" \
  "$MINIO_SECRET_KEY" \
  --quiet

S3_BACKUP_DIR="$BACKUP_DIR/s3/$MINIO_BUCKET"
mkdir -p "$S3_BACKUP_DIR"

log "Mirroring MinIO bucket '$MINIO_BUCKET' → $S3_BACKUP_DIR"
mc mirror \
  --overwrite \
  --remove \
  "${MINIO_ALIAS}/${MINIO_BUCKET}" \
  "$S3_BACKUP_DIR"

S3_SIZE=$(du -sh "$S3_BACKUP_DIR" | cut -f1)
log "MinIO mirror complete — $S3_SIZE total"

# ── 4. Cleanup MinIO alias ─────────────────────────────────────────────────────

mc alias remove "$MINIO_ALIAS" --quiet || true

# ── Done ───────────────────────────────────────────────────────────────────────

log "Backup finished successfully."
log "  DB dump : $DB_DUMP"
log "  S3 mirror: $S3_BACKUP_DIR"
