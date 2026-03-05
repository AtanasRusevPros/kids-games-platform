#!/usr/bin/env bash
# restore.sh — restore kids_games_dev from a pg_dump backup file.
# Usage: ./restore.sh <backup-file.sql>
# WARNING: existing data in kids_games_dev will be replaced.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMPOSE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <backup-file.sql>"
  exit 1
fi

BACKUP_FILE="$1"

if [[ ! -r "${BACKUP_FILE}" ]]; then
  echo "Error: file not found or not readable: ${BACKUP_FILE}"
  exit 1
fi

# Verify the db container is running
if ! podman-compose -f "${COMPOSE_DIR}/compose.yml" ps | grep -q 'kids-games-db'; then
  echo "Error: stack does not appear to be running."
  echo "Start it with:  podman-compose -f infra/podman/compose.yml up -d"
  exit 1
fi

echo "WARNING: This will overwrite all data in kids_games_dev with:"
echo "  ${BACKUP_FILE}"
read -r -p "Type 'yes' to confirm: " CONFIRM

if [[ "${CONFIRM}" != "yes" ]]; then
  echo "Aborted."
  exit 0
fi

echo "Restoring ${BACKUP_FILE} → kids_games_dev ..."

# Terminate existing connections so the restore can acquire locks
podman-compose -f "${COMPOSE_DIR}/compose.yml" exec -T db \
  psql -U postgres -c \
  "SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname='kids_games_dev' AND pid <> pg_backend_pid();" \
  postgres > /dev/null

# Pipe the backup SQL (which contains DROP TABLE IF EXISTS + CREATE TABLE) into psql
podman-compose -f "${COMPOSE_DIR}/compose.yml" exec -T db \
  psql -U postgres kids_games_dev < "${BACKUP_FILE}"

echo "Restore complete."
echo "Verify with:  curl http://localhost:3000/health"
