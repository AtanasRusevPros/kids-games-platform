#!/usr/bin/env bash
# Starts a local Postgres 16 container for development and testing.
# Usage: ./scripts/dev-db.sh [start|stop|reset]
set -euo pipefail

CONTAINER_NAME="kids-games-postgres"
POSTGRES_PASSWORD="postgres"
POSTGRES_USER="postgres"
HOST_PORT="5432"

cmd="${1:-start}"

case "$cmd" in
  start)
    if podman ps --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      echo "✓ Postgres container already running."
      exit 0
    fi

    if podman ps -a --format '{{.Names}}' | grep -q "^${CONTAINER_NAME}$"; then
      echo "→ Starting existing container..."
      podman start "$CONTAINER_NAME"
    else
      echo "→ Creating and starting Postgres container..."
      podman run -d \
        --name "$CONTAINER_NAME" \
        -e POSTGRES_PASSWORD="$POSTGRES_PASSWORD" \
        -e POSTGRES_USER="$POSTGRES_USER" \
        -p "${HOST_PORT}:5432" \
        postgres:16-alpine
    fi

    echo "→ Waiting for Postgres to be ready..."
    for i in $(seq 1 30); do
      if podman exec "$CONTAINER_NAME" pg_isready -U "$POSTGRES_USER" &>/dev/null; then
        break
      fi
      sleep 1
    done

    echo "→ Creating databases..."
    podman exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -tc \
      "SELECT 1 FROM pg_database WHERE datname='kids_games_dev'" | grep -q 1 || \
      podman exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -c "CREATE DATABASE kids_games_dev;"

    podman exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -tc \
      "SELECT 1 FROM pg_database WHERE datname='kids_games_test'" | grep -q 1 || \
      podman exec "$CONTAINER_NAME" psql -U "$POSTGRES_USER" -c "CREATE DATABASE kids_games_test;"

    echo "✓ Postgres ready on port ${HOST_PORT}"
    echo "  DATABASE_URL=postgresql://postgres:postgres@localhost:${HOST_PORT}/kids_games_dev"
    echo "  TEST_DATABASE_URL=postgresql://postgres:postgres@localhost:${HOST_PORT}/kids_games_test"
    ;;

  stop)
    podman stop "$CONTAINER_NAME" 2>/dev/null && echo "✓ Stopped" || echo "Not running"
    ;;

  reset)
    podman stop "$CONTAINER_NAME" 2>/dev/null || true
    podman rm "$CONTAINER_NAME" 2>/dev/null || true
    echo "✓ Removed. Run './scripts/dev-db.sh start' to recreate."
    ;;

  *)
    echo "Usage: $0 [start|stop|reset]"
    exit 1
    ;;
esac
