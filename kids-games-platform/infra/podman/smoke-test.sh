#!/usr/bin/env bash
# Smoke test: verify the full stack is reachable via Caddy reverse proxy.
# Run after: podman-compose up -d
# Usage: ./infra/podman/smoke-test.sh [base_url]
set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"
API_HEALTH="${BASE_URL}/api/health"
WEB_URL="${BASE_URL}/"
MAX_RETRIES=20
RETRY_DELAY=3

echo "==> Smoke test against ${BASE_URL}"

# Wait for stack to be ready
echo "--> Waiting for API health endpoint..."
for i in $(seq 1 $MAX_RETRIES); do
  STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${API_HEALTH}" 2>/dev/null || true)
  if [ "${STATUS}" = "200" ]; then
    echo "    OK (attempt ${i})"
    break
  fi
  if [ "${i}" -eq "${MAX_RETRIES}" ]; then
    echo "    FAIL: API health not reachable after ${MAX_RETRIES} attempts"
    exit 1
  fi
  echo "    Not ready yet (HTTP ${STATUS}), retrying in ${RETRY_DELAY}s..."
  sleep "${RETRY_DELAY}"
done

# Verify health response body
echo "--> Checking API health response..."
HEALTH_BODY=$(curl -s "${API_HEALTH}")
if echo "${HEALTH_BODY}" | grep -q '"ok":true'; then
  echo "    OK: health body contains ok:true"
else
  echo "    FAIL: unexpected health response: ${HEALTH_BODY}"
  exit 1
fi

# Verify web app is served
echo "--> Checking web app is served..."
WEB_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "${WEB_URL}" 2>/dev/null || true)
if [ "${WEB_STATUS}" = "200" ]; then
  echo "    OK: web app returns 200"
else
  echo "    FAIL: web app returned HTTP ${WEB_STATUS}"
  exit 1
fi

echo ""
echo "==> All smoke tests passed."
