#!/usr/bin/env bash
# Post-deploy smoke test. Usage: ./scripts/smoke.sh https://SITE_URL https://API_URL
set -euo pipefail
SITE=${1:?site url}; API=${2:?api url}

check() { # url, expected substring, label
  body=$(curl -sf "$1") || { echo "FAIL: $3 ($1 unreachable)"; exit 1; }
  echo "$body" | grep -q "$2" && echo "ok: $3" || { echo "FAIL: $3 (missing '$2')"; exit 1; }
}

check "$SITE/" "Bots" "homepage renders"
check "$SITE/schedule/" "cohort" "schedule page renders"
check "$API/cohorts" "cohorts" "public cohorts API responds"
code=$(curl -s -o /dev/null -w "%{http_code}" "$API/enrollments")
[ "$code" = "401" ] && echo "ok: enrollments requires auth (401)" || { echo "FAIL: enrollments returned $code, expected 401"; exit 1; }
echo "Smoke test passed."
