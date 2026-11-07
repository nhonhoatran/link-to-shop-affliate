#!/usr/bin/env bash
# Backs up MongoDB (gzip archive) and the RustFS bucket into a dated directory, then prunes old backups.
# Run on the VPS host from anywhere (cron example below). Exits non-zero on any failure.
#
# Settings (environment variable first, then the anchored line in the env file, then the default):
#   ENV_FILE                default <repo>/.env.prod
#   BACKUP_DIR              default <repo>/backups
#   BACKUP_RETENTION_DAYS   default 14
#   COMPOSE_PROJECT_NAME    default: compose project name from the compose file (under30ss)
#
# Cron (daily 02:30):  30 2 * * * /opt/under30ss/infra/backup/backup-mongo-and-bucket.sh >> /var/log/under30ss-backup.log 2>&1
#
# Output: <BACKUP_DIR>/<YYYYMMDD-HHMMSS>/mongo.archive.gz  and  <BACKUP_DIR>/<YYYYMMDD-HHMMSS>/bucket/
#
# Restore (stack running, from the repo root; DIR = chosen backup directory):
#   C="docker compose --env-file .env.prod -f infra/docker-compose.yml -f infra/docker-compose.prod.yml"
#   # MongoDB (drops existing collections of the dump first):
#   $C exec -T mongo sh -c 'mongorestore --archive --gzip --drop -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' < "$DIR/mongo.archive.gz"
#   # Bucket (upload the copy back; add --delete to also remove objects missing from the backup):
#   $C run --rm --no-deps -v "$DIR/bucket:/restore:ro" --entrypoint sh rustfs-init -c 'aws --endpoint-url "$S3_ENDPOINT" s3 sync /restore "s3://$S3_BUCKET"'
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV_FILE="${ENV_FILE:-$REPO_ROOT/.env.prod}"
[ -f "$ENV_FILE" ] || { echo "env file not found: $ENV_FILE" >&2; exit 1; }

setting() { # name default
  local value="${!1:-}"
  [ -n "$value" ] || value="$(grep -m1 "^$1=" "$ENV_FILE" | cut -d= -f2- || true)"
  printf '%s' "${value:-$2}"
}
BACKUP_DIR="$(setting BACKUP_DIR "$REPO_ROOT/backups")"
RETENTION_DAYS="$(setting BACKUP_RETENTION_DAYS 14)"
case "$RETENTION_DAYS" in ''|*[!0-9]*) echo "BACKUP_RETENTION_DAYS must be a non-negative integer" >&2; exit 1;; esac

compose=(docker compose --env-file "$ENV_FILE" -f "$REPO_ROOT/infra/docker-compose.yml" -f "$REPO_ROOT/infra/docker-compose.prod.yml")
[ -z "${COMPOSE_PROJECT_NAME:-}" ] || compose+=(-p "$COMPOSE_PROJECT_NAME")

stamp="$(date +%Y%m%d-%H%M%S)"
dest="$BACKUP_DIR/$stamp"
mkdir -p "$dest/bucket"
cleanup_partial() { [ "${ok:-0}" = 1 ] || { echo "backup failed, removing partial $dest" >&2; rm -rf "$dest"; }; }
trap cleanup_partial EXIT

echo "[$stamp] mongodump -> $dest/mongo.archive.gz"
"${compose[@]}" exec -T mongo sh -c \
  'mongodump --archive --gzip -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --authenticationDatabase admin' \
  > "$dest/mongo.archive.gz"
[ -s "$dest/mongo.archive.gz" ] || { echo "mongo archive is empty" >&2; exit 1; }

echo "[$stamp] bucket sync -> $dest/bucket"
"${compose[@]}" run --rm --no-deps -T -u "$(id -u):$(id -g)" -e HOME=/tmp -v "$dest/bucket:/backup" \
  --entrypoint sh rustfs-init -c 'aws --endpoint-url "$S3_ENDPOINT" s3 sync "s3://$S3_BUCKET" /backup --only-show-errors'

ok=1
echo "[$stamp] pruning backups older than $RETENTION_DAYS days in $BACKUP_DIR"
find "$BACKUP_DIR" -mindepth 1 -maxdepth 1 -type d -name '[0-9]*-[0-9]*' -mtime "+$RETENTION_DAYS" -exec rm -rf {} +
echo "[$stamp] done"
