#!/usr/bin/env bash
# backup.sh — dump the kids_games_dev PostgreSQL database from the running stack.
# Usage: ./backup.sh
# Output: infra/podman/backups/pg-YYYYMMDD-HHMMSS.sql
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKUP_DIR="${COMPOSE_DIR}/backups"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/pg-${TIMESTAMP}.sql"

# Verify the db container is running
if ! podman-compose -f "${COMPOSE_DIR}/compose.yml" ps | grep -q 'kids-games-db'; then
  echo "Error: stack does not appear to be running."
  echo "Start it with:  podman-compose -f infra/podman/compose.yml up -d"
  exit 1
fi

mkdir -p "${BACKUP_DIR}"

echo "Backing up kids_games_dev → ${BACKUP_FILE} ..."
podman-compose -f "${COMPOSE_DIR}/compose.yml" exec -T db \
  pg_dump --clean --if-exists -U postgres kids_games_dev > "${BACKUP_FILE}"

echo "Done. Backup saved to: ${BACKUP_FILE}"
echo "Restore with:  ./infra/podman/scripts/restore.sh ${BACKUP_FILE}"
