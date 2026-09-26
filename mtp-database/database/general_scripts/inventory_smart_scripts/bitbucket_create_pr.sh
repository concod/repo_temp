#!/usr/bin/env bash
# Bitbucket PR creation helper - Basic Authentication Only
# Uses Basic Authentication (email + API token) as recommended by Bitbucket
# Usage:
#   bitbucket_create_pr.sh --workspace WS --repo REPO --source SRC --dest DEST \
#     --title TITLE [--description DESC] [--reviewer-uuids "{uuid1},{uuid2}"] [--close-source true]
# Auth:
#   BITBUCKET_APP_PASSWORD (required) - your Bitbucket API token
#   BITBUCKET_USERNAME (optional) - defaults to hardcoded email below

set -euo pipefail

# -------- Load Constants --------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONSTANTS_FILE="$SCRIPT_DIR/constants.sh"
if [[ -f "$CONSTANTS_FILE" ]]; then
  source "$CONSTANTS_FILE"
  load_bitbucket_constants
else
  echo "WARNING: Constants file not found at $CONSTANTS_FILE" >&2
  echo "Using fallback defaults..." >&2
  DEFAULT_BITBUCKET_EMAIL="mithun.rangaswamy@impactanalytics.co"
fi

# -------- args --------
WORKSPACE=""
REPO=""
SOURCE=""
DEST=""
TITLE=""
DESCRIPTION=""
REVIEWER_UUIDS=""
CLOSE_SOURCE="true"
DRY_RUN="false"
DEBUG_FLAG="false"

usage() {
  cat <<EOF
Usage: $0 --workspace WS --repo REPO --source SRC --dest DEST --title TITLE [options]
Options:
  --description TEXT          PR description/body (plain text)
  --reviewer-uuids LIST       Comma-separated reviewer UUIDs, e.g. "{uuid1},{uuid2}"
  --close-source true|false   Whether to close source branch on merge (default: true)
  --dry-run                   Print payload and exit without calling API
  --debug                     Print endpoint and payload before the API call (secrets masked)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace) WORKSPACE="$2"; shift 2;;
    --repo) REPO="$2"; shift 2;;
    --source) SOURCE="$2"; shift 2;;
    --dest) DEST="$2"; shift 2;;
    --title) TITLE="$2"; shift 2;;
    --description) DESCRIPTION="$2"; shift 2;;
    --reviewer-uuids) REVIEWER_UUIDS="$2"; shift 2;;
    --close-source) CLOSE_SOURCE="$2"; shift 2;;
    --dry-run) DRY_RUN="true"; shift;;
    --debug) DEBUG_FLAG="true"; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 2;;
  esac
done

# Auto-detect workspace/repo from git remote if not provided
if [[ -z "$WORKSPACE" || -z "$REPO" ]]; then
  remote=$(git remote get-url origin 2>/dev/null || true)
  if [[ -n "$remote" && "$remote" =~ bitbucket\.org[:/]+([^/]+)/([^/]+?)(\.git)?$ ]]; then
    [[ -n "$WORKSPACE" ]] || WORKSPACE="${BASH_REMATCH[1]}"
    rp_detect="${BASH_REMATCH[2]}"; rp_detect="${rp_detect%.git}"
    [[ -n "$REPO" ]] || REPO="$rp_detect"
  fi
fi

[[ -n "$WORKSPACE" && -n "$REPO" && -n "$SOURCE" && -n "$DEST" && -n "$TITLE" ]] || { usage; exit 2; }

API_URL="https://api.bitbucket.org/2.0/repositories/$WORKSPACE/$REPO/pullrequests"

# -------- reviewers payload --------
reviewers_json='[]'
if [[ -n "$REVIEWER_UUIDS" ]]; then
  IFS=',' read -ra uuids <<< "$REVIEWER_UUIDS"
  for u in "${uuids[@]}"; do
    u_clean=$(echo "$u" | xargs)
    [[ "$u_clean" == \{*\} ]] || u_clean="{$u_clean}"
    reviewers_json=$(jq -c --arg uuid "$u_clean" '. + [{"uuid": $uuid}]' <<< "$reviewers_json")
  done
fi

# -------- payload --------
# -------- Basic Authentication Setup (email + API token) --------
# Use configured email if BITBUCKET_USERNAME is not set
if [[ -z "${BITBUCKET_USERNAME:-}" ]]; then
  export BITBUCKET_USERNAME="${DEFAULT_BITBUCKET_EMAIL:-mithun.rangaswamy@impactanalytics.co}"
fi

# Try to get API token from various sources
API_TOKEN=""
TOKEN_SOURCE="<unset>"

if [[ -n "${BITBUCKET_APP_PASSWORD:-}" ]]; then
  API_TOKEN="$BITBUCKET_APP_PASSWORD"
  TOKEN_SOURCE="BITBUCKET_APP_PASSWORD"
elif [[ -n "${BITBUCKET_TOKEN_FILE:-}" && -f "$BITBUCKET_TOKEN_FILE" ]]; then
  API_TOKEN=$(<"$BITBUCKET_TOKEN_FILE")
  TOKEN_SOURCE="BITBUCKET_TOKEN_FILE"
elif [[ -n "${BITBUCKET_API_TOKEN:-}" ]]; then
  API_TOKEN="$BITBUCKET_API_TOKEN"
  TOKEN_SOURCE="BITBUCKET_API_TOKEN"
else
  # Try to get token from keychain as last resort
  API_TOKEN=$(security find-generic-password -a "$USER" -s bitbucket_api_token -w 2>/dev/null || echo "")
  if [[ -n "$API_TOKEN" ]]; then
    TOKEN_SOURCE="keychain"
  fi
fi

# Set the app password for Basic auth
if [[ -n "$API_TOKEN" ]]; then
  export BITBUCKET_APP_PASSWORD="$API_TOKEN"
fi

mask() {
  local s="$1"; local l=${#s};
  if [[ -z "$s" ]]; then echo "<unset>"; return; fi
  local head=${s:0:6}; local tail=${s: -4};
  echo "${head}…${tail} (len=${l})"
}

payload=$(jq -n \
  --arg title "$TITLE" \
  --arg src "$SOURCE" \
  --arg dest "$DEST" \
  --arg desc "$DESCRIPTION" \
  --argjson reviewers "$reviewers_json" \
  --argjson close "$( [[ "$CLOSE_SOURCE" == "true" ]] && echo true || echo false )" \
  '{title: $title, description: $desc, source: {branch: {name: $src}}, destination: {branch: {name: $dest}}, reviewers: $reviewers, close_source_branch: $close}')

if [[ "$DRY_RUN" == "true" ]]; then
  echo "[DRY RUN] POST $API_URL"
  echo "$payload" | jq .
  
  # Show auth info in dry-run mode too
  if [[ "$DEBUG_FLAG" == "true" ]]; then
    echo "" >&2
    echo "[DRY RUN DEBUG] Basic Authentication info:" >&2
    echo "[DEBUG] Auth mode: Basic (Atlassian email + API token)" >&2
    echo "[DEBUG] Username: ${BITBUCKET_USERNAME:-<unset>}" >&2
    echo "[DEBUG] App password: $(mask "${BITBUCKET_APP_PASSWORD:-<empty>}")" >&2
    echo "[DEBUG] Token source: ${TOKEN_SOURCE}" >&2
    if [[ -n "${BITBUCKET_USERNAME:-}" && -n "${BITBUCKET_APP_PASSWORD:-}" ]]; then
      echo "[DEBUG] Headers: Authorization: Basic $(echo -n "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" | base64 | head -c 20)..." >&2
      echo "[DEBUG] ✅ Using Bitbucket recommended Basic auth" >&2
    else
      echo "[DEBUG] Headers: Authorization: Basic <incomplete>" >&2
      echo "[DEBUG] ❌ Missing credentials for Basic auth" >&2
    fi
  fi
  
  exit 0
fi

if [[ "$DEBUG_FLAG" == "true" ]]; then
  echo "[DEBUG] Endpoint: POST $API_URL" >&2
  echo "[DEBUG] Payload:" >&2
  echo "$payload" | jq . >&2 || echo "$payload" >&2
  echo "[DEBUG] ==================" >&2
fi

# -------- curl setup (Basic auth only) --------
if [[ -z "${BITBUCKET_USERNAME:-}" || -z "${BITBUCKET_APP_PASSWORD:-}" ]]; then
  echo "ERROR: Missing authentication for Basic auth." >&2
  echo "" >&2
  echo "Required:" >&2
  echo "  BITBUCKET_USERNAME: ${BITBUCKET_USERNAME:-<not set>}" >&2
  echo "  BITBUCKET_APP_PASSWORD: ${BITBUCKET_APP_PASSWORD:+<set (len=${#BITBUCKET_APP_PASSWORD})>}${BITBUCKET_APP_PASSWORD:-<not set>}" >&2
  echo "" >&2
  echo "Setup options:" >&2
  echo "  export BITBUCKET_APP_PASSWORD='your-api-token'" >&2
  echo "  # Username defaults to: ${DEFAULT_BITBUCKET_EMAIL:-mithun.rangaswamy@impactanalytics.co}" >&2
  echo "" >&2
  echo "Or store token in keychain:" >&2
  echo "  security add-generic-password -a \"\$USER\" -s bitbucket_api_token -w 'your-token'" >&2
  exit 3
fi

curl_args=(-sS -w $'\n%{http_code}' -H "Content-Type: application/json" -X POST "$API_URL" -d "$payload")
curl_args+=(-u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}")

if [[ "$DEBUG_FLAG" == "true" ]]; then
  echo "[DEBUG] Auth mode: Basic (Atlassian email + API token)" >&2
  echo "[DEBUG] Username: ${BITBUCKET_USERNAME}" >&2
  echo "[DEBUG] App password: $(mask "${BITBUCKET_APP_PASSWORD}")" >&2
  echo "[DEBUG] Token source: ${TOKEN_SOURCE}" >&2
  echo "[DEBUG] Headers: Authorization: Basic $(echo -n "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" | base64 | head -c 20)..." >&2
  echo "[DEBUG] ✅ Using Bitbucket recommended Basic auth" >&2
  echo "[DEBUG] ==================" >&2
fi

resp=$(curl "${curl_args[@]}")
body="${resp%$'\n'*}"
code="${resp##*$'\n'}"

if [[ "$code" -ge 300 ]]; then
  echo "ERROR: PR creation failed with HTTP $code" >&2
  echo "$body" | jq . >&2 || echo "$body" >&2
  # Print a hint about common causes
  if [[ "$DEBUG_FLAG" == "true" ]]; then
    echo "[DEBUG] Hint: Check that your token/app password has scopes: pullrequest:write, repository:read (and repository:write if needed)." >&2
  fi
  exit 4
fi

link=$(echo "$body" | jq -r '.links.html.href // empty')
number=$(echo "$body" | jq -r '.id // empty')
if [[ -n "$link" ]]; then
  echo "PR created (#${number:-?}): $link"
else
  echo "PR created successfully"
fi
