#!/usr/bin/env bash
# Simplified Bitbucket Default Reviewers Fetcher
# Fetches only repository default reviewers for PR assignments
# Uses Basic Authentication (email + API token)

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
  # Fallback defaults
  DEFAULT_BITBUCKET_EMAIL="mithun.rangaswamy@impactanalytics.co"
fi

# Hardcoded team leads (for easy identification and default selection)
TEAM_LEADS=(
    "Pradeep J Nayak"
    "surendra.babu" 
    "Raj Mohan"
    "Arjun P P"
)

# -------- args --------
WORKSPACE=""
REPO=""
OUTPUT_FORMAT="table"
SAVE_FILE="false"
UPDATE_CONSTANTS="false"
DEBUG_FLAG="false"

usage() {
  cat <<EOF
Usage: $0 --workspace WS --repo REPO [options]
Options:
  --output FORMAT         Output format: table, json, reviewers (default: table)
  --save                  Save results to 'team_reviewers.json' file (JSON format)
  --update-constants      Update constants.sh file with fetched team lead UUIDs
  --debug                 Show debug information
  
Examples:
  # Show default reviewers in table format
  $0 --workspace insideinsight --repo mtp-database
  
  # Save to JSON file
  $0 --workspace insideinsight --repo mtp-database --save
  
  # Update constants.sh with latest team lead UUIDs
  $0 --workspace insideinsight --repo mtp-database --update-constants
  
  # Get reviewers array for PR creation
  $0 --workspace insideinsight --repo mtp-database --output reviewers
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --workspace) WORKSPACE="$2"; shift 2;;
    --repo) REPO="$2"; shift 2;;
    --output) OUTPUT_FORMAT="$2"; shift 2;;
    --save) SAVE_FILE="true"; shift;;
    --update-constants) UPDATE_CONSTANTS="true"; shift;;
    --debug) DEBUG_FLAG="true"; shift;;
    -h|--help) usage; exit 0;;
    *) echo "Unknown arg: $1"; usage; exit 2;;
  esac
done

# Auto-detect workspace/repo from git remote if not provided
if [[ -z "$WORKSPACE" || -z "$REPO" ]]; then
  remote=$(git remote get-url origin 2>/dev/null || true)
  if [[ -n "$remote" && "$remote" =~ bitbucket\.org[:/]([^/]+)/([^/]+)(\.git)?$ ]]; then
    [[ -n "$WORKSPACE" ]] || WORKSPACE="${BASH_REMATCH[1]}"
    rp_detect="${BASH_REMATCH[2]}"; rp_detect="${rp_detect%.git}"
    [[ -n "$REPO" ]] || REPO="$rp_detect"
  fi
fi

[[ -n "$WORKSPACE" && -n "$REPO" ]] || { echo "ERROR: workspace and repo required"; usage; exit 2; }

# -------- Basic Authentication Setup --------
if [[ -z "${BITBUCKET_USERNAME:-}" ]]; then
  export BITBUCKET_USERNAME="${DEFAULT_BITBUCKET_EMAIL:-mithun.rangaswamy@impactanalytics.co}"
fi

# Get API token
API_TOKEN=""
TOKEN_SOURCE="<unset>"

if [[ -n "${BITBUCKET_APP_PASSWORD:-}" ]]; then
  API_TOKEN="$BITBUCKET_APP_PASSWORD"
  TOKEN_SOURCE="BITBUCKET_APP_PASSWORD"
else
  API_TOKEN=$(security find-generic-password -a "$USER" -s bitbucket_api_token -w 2>/dev/null || echo "")
  if [[ -n "$API_TOKEN" ]]; then
    TOKEN_SOURCE="keychain"
    export BITBUCKET_APP_PASSWORD="$API_TOKEN"
  fi
fi

[[ -n "$API_TOKEN" ]] || { 
  echo "ERROR: No API token found. Set BITBUCKET_APP_PASSWORD or store in keychain." >&2
  exit 3
}

if [[ "$DEBUG_FLAG" == "true" ]]; then
  echo "[DEBUG] Workspace: $WORKSPACE, Repo: $REPO" >&2
  echo "[DEBUG] Token source: $TOKEN_SOURCE" >&2
fi

# -------- Fetch Repository Default Reviewers --------
DEFAULT_REVIEWERS_URL="https://api.bitbucket.org/2.0/repositories/$WORKSPACE/$REPO/default-reviewers"

if [[ "$DEBUG_FLAG" == "true" ]]; then
  echo "[DEBUG] Fetching default reviewers from: $DEFAULT_REVIEWERS_URL" >&2
fi

default_reviewers_resp=$(curl -sS -u "${BITBUCKET_USERNAME}:${BITBUCKET_APP_PASSWORD}" \
  "$DEFAULT_REVIEWERS_URL?pagelen=100" 2>/dev/null || echo '{"values":[]}')

# Check for errors
if echo "$default_reviewers_resp" | jq -e '.error' >/dev/null 2>&1; then
  echo "ERROR: API returned error:" >&2
  echo "$default_reviewers_resp" | jq '.error.message // .' >&2
  exit 4
fi

# Process reviewers and mark team leads
reviewers=$(echo "$default_reviewers_resp" | jq -r '.values[] | 
  {
    uuid: .uuid,
    display_name: .display_name,
    username: (.nickname // .username),
    is_team_lead: (
      (.display_name // "" | test("Pradeep.*Nayak|Raj Mohan|Arjun P P")) or
      (.nickname // .username // "" | test("surendra\\.babu"))
    )
  }' | jq -s '.')

total_reviewers=$(echo "$reviewers" | jq 'length')
team_leads=$(echo "$reviewers" | jq '[.[] | select(.is_team_lead == true)]')
team_lead_count=$(echo "$team_leads" | jq 'length')

if [[ "$DEBUG_FLAG" == "true" ]]; then
  echo "[DEBUG] Found $total_reviewers default reviewers, $team_lead_count team leads" >&2
fi

# -------- Output Results --------
case "$OUTPUT_FORMAT" in
  "json")
    echo "$reviewers" | jq '.'
    ;;
    
  "reviewers")
    echo "$reviewers" | jq 'map({uuid: .uuid})'
    ;;
    
  "leads")
    echo "$team_leads"
    ;;
    
  "table"|*)
    echo "=== Default Reviewers for $WORKSPACE/$REPO ==="
    echo ""
    echo "Found Reviewers ($total_reviewers total, $team_lead_count team leads):"
    printf "%-40s %-25s %-20s %s\n" "UUID" "Display Name" "Username" "Role"
    printf "%-40s %-25s %-20s %s\n" "----" "------------" "--------" "----"
    
    echo "$reviewers" | jq -r '.[] | 
      "\(.uuid // "N/A") \(.display_name // "N/A") \(.username // "N/A") \(if .is_team_lead then "LEAD" else "REVIEWER" end)"' | \
    while read -r uuid display_name username role; do
      printf "%-40s %-25s %-20s %s\n" "$uuid" "$display_name" "$username" "$role"
    done
    
    echo ""
    echo "=== Team Leads Only ==="
    team_lead_uuids=$(echo "$team_leads" | jq -r 'map(.uuid) | join(",")')
    echo "UUIDs: $team_lead_uuids"
    
    echo ""
    echo "=== Usage Examples ==="
    echo "# Use team leads as default reviewers:"
    echo "./bitbucket_create_pr.sh --workspace '$WORKSPACE' --repo '$REPO' \\"
    echo "  --source 'feature-branch' --dest 'main' --title 'My PR' \\"
    echo "  --reviewer-uuids \"$team_lead_uuids\""
    ;;
esac

# -------- Save to file if requested --------
if [[ "$SAVE_FILE" == "true" ]]; then
  TEAM_FILE="team_reviewers.json"
  
  # Create JSON with metadata
  team_json=$(jq -n \
    --arg workspace "$WORKSPACE" \
    --arg repo "$REPO" \
    --arg generated_on "$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
    --arg total_reviewers "$total_reviewers" \
    --arg team_lead_count "$team_lead_count" \
    --argjson reviewers "$reviewers" \
    --argjson team_leads "$team_leads" \
    '{
      "metadata": {
        "workspace": $workspace,
        "repository": $repo,
        "generated_on": $generated_on,
        "total_reviewers": ($total_reviewers | tonumber),
        "team_lead_count": ($team_lead_count | tonumber),
        "data_source": "default_reviewers_only"
      },
      "reviewers": $reviewers,
      "team_leads": $team_leads,
      "usage_examples": {
        "team_leads_uuids": ($team_leads | map(.uuid) | join(",")),
        "all_reviewers_uuids": ($reviewers | map(.uuid) | join(",")),
        "reviewers_array": ($reviewers | map({uuid: .uuid}))
      }
    }')
  
  echo "$team_json" > "$TEAM_FILE"
  
  # Add to .gitignore
  if [[ -f ".gitignore" ]]; then
    grep -q "^team_reviewers\.json$" ".gitignore" || echo "team_reviewers.json" >> ".gitignore"
  else
    echo "team_reviewers.json" > ".gitignore"
  fi
  
  echo ""
  echo "✅ Saved $total_reviewers reviewers ($team_lead_count leads) to '$TEAM_FILE'"
  echo "📄 Added to .gitignore"
  
  if [[ "$DEBUG_FLAG" == "true" ]]; then
    echo "[DEBUG] Team leads UUIDs: $(echo "$team_leads" | jq -r 'map(.uuid) | join(",")')" >&2
  fi
fi

# -------- Update Constants File if requested --------
if [[ "$UPDATE_CONSTANTS" == "true" ]]; then
  if [[ ! -f "$CONSTANTS_FILE" ]]; then
    echo "ERROR: Constants file not found at $CONSTANTS_FILE" >&2
    echo "Cannot update constants without existing file." >&2
    exit 5
  fi
  
  # Get team lead UUIDs in the required format
  team_lead_uuids_formatted=$(echo "$team_leads" | jq -r 'map(.uuid) | join(",")')
  
  if [[ -z "$team_lead_uuids_formatted" ]]; then
    echo "ERROR: No team lead UUIDs found to update constants file" >&2
    exit 6
  fi
  
  # Create backup
  backup_file="${CONSTANTS_FILE}.backup.$(date +%Y%m%d_%H%M%S)"
  cp "$CONSTANTS_FILE" "$backup_file"
  
  # Update the constants file
  if sed -i.tmp "s/^DEFAULT_TEAM_LEAD_REVIEWER_UUIDS=.*/DEFAULT_TEAM_LEAD_REVIEWER_UUIDS=\"$team_lead_uuids_formatted\"/" "$CONSTANTS_FILE"; then
    rm -f "${CONSTANTS_FILE}.tmp"
    echo ""
    echo "✅ Updated constants.sh with latest team lead UUIDs"
    echo "📄 Backup saved to: $backup_file"
    echo "🔄 New UUIDs: $team_lead_uuids_formatted"
    
    # Also update team lead names
    team_lead_names=$(echo "$team_leads" | jq -r 'map(.display_name) | join(", ")')
    if [[ -n "$team_lead_names" ]]; then
      sed -i.tmp "s/^TEAM_LEAD_NAMES=.*/TEAM_LEAD_NAMES=\"$team_lead_names\"/" "$CONSTANTS_FILE"
      rm -f "${CONSTANTS_FILE}.tmp"
      echo "📝 Updated team lead names: $team_lead_names"
    fi
    
    if [[ "$DEBUG_FLAG" == "true" ]]; then
      echo "[DEBUG] Constants file updated successfully" >&2
      echo "[DEBUG] Backup location: $backup_file" >&2
    fi
  else
    echo "ERROR: Failed to update constants file" >&2
    echo "Backup preserved at: $backup_file" >&2
    exit 7
  fi
fi