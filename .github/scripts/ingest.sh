#!/usr/bin/env bash
#
# POST one ingest payload and fail loudly unless work actually happened.
#
#   ./.github/scripts/ingest.sh '<json payload>' '<url>'
#
# Why this exists rather than a bare `curl --fail`: the ingest endpoint has two
# ways to return a perfectly green 200 while doing nothing at all, and both
# present exactly like the outage this workflow was written to fix — an absence
# of rows in job_ingest_runs, with every check passing.
#
#   1. JOBS_INGEST_ENABLED=false           -> 200 {"success":true,"skipped":true}
#   2. every source in the payload disabled -> 200 with runs: [] (or every run
#      carrying note "no work configured")
#
# runJobIngest() returns {runs, totals, durationMs}, so both are detectable. A
# per-source failure is also reported inside `runs` with status "failed" while
# the HTTP status stays 200, because one dead Workday tenant must not abort the
# other eight sources — so that is checked here too.
#
# Read CRON_SECRET from the environment rather than an argument: an argument
# would be visible in the process list and in `set -x` output.

set -euo pipefail

PAYLOAD="${1:?usage: ingest.sh <json-payload> <url>}"
URL="${2:?usage: ingest.sh <json-payload> <url>}"
: "${CRON_SECRET:?CRON_SECRET must be set in the environment}"

body="$(mktemp)"
trap 'rm -f "$body"' EXIT

# --fail-with-body rather than --fail so a 4xx/5xx still prints what the server
# said; plain --fail discards the body and leaves only an exit code.
status="$(
  curl -sS --fail-with-body --max-time 600 -X POST \
    -H "Authorization: Bearer ${CRON_SECRET}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}" \
    -o "${body}" -w '%{http_code}' \
    "${URL}"
)" || {
  echo "::error::HTTP ${status:-?} from ${URL}"
  cat "${body}" >&2
  exit 1
}

echo "HTTP ${status}"
jq '{skipped, totals, runs: [.runs[]? | {label, status, note, fetched: .stats.fetched, inserted: .stats.inserted}]}' \
  "${body}" || cat "${body}"

# 1. Ingest disabled server-side.
if [ "$(jq -r '.skipped // false' "${body}")" = "true" ]; then
  echo "::error::Ingest was skipped server-side: $(jq -r '.reason // "no reason given"' "${body}"). JOBS_INGEST_ENABLED is probably false on Render."
  exit 1
fi

# 2. Nothing ran at all — the payload named sources that are disabled or unknown.
if [ "$(jq -r '.runs | length' "${body}")" -eq 0 ]; then
  echo "::error::The API accepted the request but ran nothing. Every source in ${PAYLOAD} is disabled or unknown in job_sources."
  exit 1
fi

# 3. Ran, but fetched nothing anywhere. Every adapter returning zero at once is
#    an outage, not a quiet night — a single dead board leaves the others fetching.
if [ "$(jq -r '.totals.fetched // 0' "${body}")" -eq 0 ]; then
  echo "::error::Every source fetched 0 jobs. Sources are configured but returning nothing."
  exit 1
fi

# 4. Individual source failures, which do not affect the HTTP status by design.
failed="$(jq -r '[.runs[]? | select(.status == "failed") | "\(.label): \(.error // "no error recorded")"] | join("; ")' "${body}")"
if [ -n "${failed}" ]; then
  echo "::error::Source(s) failed: ${failed}"
  exit 1
fi

# Not a failure — a partial run is the deliberate outcome of the deadline or the
# expiry outage guard — but it should be visible in the run summary.
partial="$(jq -r '[.runs[]? | select(.status == "partial") | .label] | join(", ")' "${body}")"
if [ -n "${partial}" ]; then
  echo "::warning::Partial run(s): ${partial}. Deadline hit or the expiry volume guard tripped."
fi

echo "OK — fetched $(jq -r '.totals.fetched' "${body}"), new $(jq -r '.totals.inserted' "${body}"), refreshed $(jq -r '.totals.updated' "${body}")"
