#!/usr/bin/env bash

# ==============================================
# Inventory Smart Release Automation Script (v2)
# ==============================================
# Goals:
# - Operate in a temporary git worktree to avoid branch switching pain
# - Robustly handle OMS/excluded files even when created/removed across branches
# - Quiet console output; rich, per-client file listings in a single log file
# - Preserve the behavior of v1 where possible, with safer defaults
#
# Usage:
#   ./inventory_smart_release_v2.sh [--debug] [--name <suffix>] [--yes]
#
# Options:
#   --debug            Create separate worktree (default: work in current repo)
#   --name, --name=    Append a custom suffix to the release name
#   --yes              Non-interactive confirmations (assume yes)
# ==============================================

set -euo pipefail

# ---- Bash version check ----
if ((BASH_VERSINFO[0] < 4)); then
  echo "ERROR: Bash 4+ required. Install via Homebrew (brew install bash) and run with:"
  echo "  /usr/local/bin/bash ./inventory_smart_release_v2.sh  (Intel)"
  echo "  /opt/homebrew/bin/bash ./inventory_smart_release_v2.sh  (Apple Silicon)"
  exit 1
fi

# --------- PATHS & CONSTANTS ---------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
CONFIG_FILE="$SCRIPT_DIR/inventory_smart_release_config.json"
DATE="$(date +%Y-%m-%d)"
DATETIME="$(date +%Y-%m-%d_%H-%M)"

# --------- Load Constants --------
CONSTANTS_FILE="$SCRIPT_DIR/constants.sh"
if [[ -f "$CONSTANTS_FILE" ]]; then
  source "$CONSTANTS_FILE"
  load_bitbucket_constants
else
  echo "WARNING: Constants file not found at $CONSTANTS_FILE" >&2
  echo "Using fallback defaults..." >&2
  # Fallback defaults
  DEFAULT_BITBUCKET_WORKSPACE="insideinsight"
  DEFAULT_BITBUCKET_REPO="mtp-database"
  DEFAULT_TEAM_LEAD_REVIEWER_UUIDS="{8b2a6a6a-de9d-4e4f-a74a-8be8be28af70},{affe7981-af0c-429d-ad1f-3bfa29bd4eb5},{b0406b51-e79a-4415-b1f8-5d0d97059d46},{f48da9bb-669a-4865-b286-d16d0ff77da2}"
fi

# --------- BITBUCKET SETTINGS (override via environment) ---------
# Authentication is via Basic Auth (email + API token). Before running, set:
#   export BITBUCKET_APP_PASSWORD=$(security find-generic-password -a "$USER" -s bitbucket_api_token -w)
# If workspace/repo are not provided, we will auto-detect them from the git remote.
# These values are now loaded from constants.sh but can still be overridden via environment
BITBUCKET_WORKSPACE="${BITBUCKET_WORKSPACE:-}"
BITBUCKET_REPO="${BITBUCKET_REPO:-}"

# Team lead reviewer UUIDs (loaded from constants.sh)
# Update these UUIDs by running: ./bitbucket_get_default_reviewers.sh --output leads
# and updating the constants.sh file
TEAM_LEAD_REVIEWER_UUIDS="${TEAM_LEAD_REVIEWER_UUIDS:-}"

# Attempt to auto-detect workspace and repo slugs from the git remote if not provided
auto_detect_bitbucket() {
  local remote
  remote=$(git -C "$REPO_ROOT" remote get-url origin 2>/dev/null || true)
  if [[ -n "$remote" ]]; then
    # Match both SSH and HTTPS remotes, e.g. git@bitbucket.org:ws/repo.git or https://bitbucket.org/ws/repo.git
    if [[ "$remote" =~ bitbucket\.org[:/]+([^/]+)/([^/]+?)(\.git)?$ ]]; then
      local ws="${BASH_REMATCH[1]}"
      local rp="${BASH_REMATCH[2]}"
      rp="${rp%.git}"
      [[ -n "$BITBUCKET_WORKSPACE" ]] || BITBUCKET_WORKSPACE="$ws"
      [[ -n "$BITBUCKET_REPO" ]] || BITBUCKET_REPO="$rp"
    fi
  fi
  # Fallback defaults if still blank (use constants)
  BITBUCKET_WORKSPACE="${BITBUCKET_WORKSPACE:-${DEFAULT_BITBUCKET_WORKSPACE:-insideinsight}}"
  BITBUCKET_REPO="${BITBUCKET_REPO:-${DEFAULT_BITBUCKET_REPO:-mtp-database}}"
}
auto_detect_bitbucket
BITBUCKET_API_PR_URL="https://api.bitbucket.org/2.0/repositories/$BITBUCKET_WORKSPACE/$BITBUCKET_REPO/pullrequests"

# Auto-fetch team lead UUIDs if not configured
get_default_reviewer_uuids() {
  local reviewer_script="$SCRIPT_DIR/bitbucket_get_default_reviewers.sh"

  # Use constants if TEAM_LEAD_REVIEWER_UUIDS is empty
  if [[ -z "$TEAM_LEAD_REVIEWER_UUIDS" ]]; then
    TEAM_LEAD_REVIEWER_UUIDS="${DEFAULT_TEAM_LEAD_REVIEWER_UUIDS:-}"
  fi

  # If still empty, try to fetch from repository
  if [[ -z "$TEAM_LEAD_REVIEWER_UUIDS" && -f "$reviewer_script" ]]; then
    info "Fetching team lead UUIDs from repository default reviewers..."
    TEAM_LEAD_REVIEWER_UUIDS=$(
      "$reviewer_script" --workspace "$BITBUCKET_WORKSPACE" --repo "$BITBUCKET_REPO" --output leads 2>/dev/null |
      jq -r 'map(.uuid) | join(",")' 2>/dev/null || echo ""
    )
    [[ -n "$TEAM_LEAD_REVIEWER_UUIDS" ]] && info "Found team lead UUIDs: $TEAM_LEAD_REVIEWER_UUIDS"
  fi

  # Final reviewer UUIDs (environment variable can override, but default to team leads only)
  REVIEWER_UUIDS="${BITBUCKET_REVIEWER_UUIDS:-$TEAM_LEAD_REVIEWER_UUIDS}"
}

# --------- ARGUMENTS ---------
DEBUG_MODE=false
CUSTOM_RELEASE_NAME=""
ASSUME_YES=false
EXPECTING_NAME=false
INCLUDE_CLIENT_GLOBAL_DATA=false

for arg in "$@"; do
  case "$arg" in
    --debug) DEBUG_MODE=true ;;
    --yes) ASSUME_YES=true ;;
    --name) EXPECTING_NAME=true ;;
    --name=*) CUSTOM_RELEASE_NAME="${arg#--name=}" ;;
    *) if [[ "$EXPECTING_NAME" == true ]]; then CUSTOM_RELEASE_NAME="$arg"; EXPECTING_NAME=false; fi ;;
  esac
done

# --------- DEPENDENCIES ---------
need() { command -v "$1" >/dev/null 2>&1 || { echo "Missing dependency: $1"; exit 1; }; }
need jq
need git

# --------- LOGGING ---------
LOG_DIR="/tmp/mtp_database_logs_${DATE}"
mkdir -p "$LOG_DIR"
LOG_FILE="$LOG_DIR/release_v2_${DATETIME}.log"
# Duplicate stdout/stderr to log
exec > >(tee -a "$LOG_FILE") 2>&1

# Console-light logging helpers (append-only to log via >> when needed)
hr() { printf '\n%*s\n' 80 | tr ' ' '-'; }
section() { hr; echo "$1"; hr; }
subsection() { echo "  > $1"; printf '%*s\n' 60 | tr ' ' '-'; }
info() { echo "- $1"; }
filelog() { printf "%s\n" "$1" >> "$LOG_FILE"; }

# Simple progress + timing wrapper
run_with_progress() {
  local desc="$1"; shift
  local cmd="$*"
  local start=$(date +%s)
  printf "  • %s " "$desc"
  # run command in background to show dots
  bash -lc "$cmd" &
  local pid=$!
  while kill -0 $pid 2>/dev/null; do printf "."; sleep 0.25; done
  wait $pid
  local rc=$?
  local end=$(date +%s)
  local dur=$((end-start))
  if [[ $rc -eq 0 ]]; then
    printf " (%ss) [OK]\n" "$dur"
  else
    printf " (%ss) [FAIL]\n" "$dur"
  fi
  return $rc
}

section "Inventory Smart Release v2 - START"
info "Repo root: $REPO_ROOT"
info "Config: $CONFIG_FILE"
info "Log file: $LOG_FILE"

# --------- CONFIG LOADING ---------
mapfile -t CLIENT_LIST < <(jq -r '.clients[].name' "$CONFIG_FILE")
mapfile -t OMIT_GLOBAL_CSV < <(jq -r '.omit_global_csv[]' "$CONFIG_FILE")
mapfile -t INCLUDE_GLOBAL_FILES < <(jq -r '.include_global_files[]' "$CONFIG_FILE")
mapfile -t EXCLUDE_PATHS < <(jq -r '.exclude_paths[]' "$CONFIG_FILE")
mapfile -t EXCLUDE_FILES < <(jq -r '.exclude_files[]' "$CONFIG_FILE")
mapfile -t INCLUDE_INV_SCHEMAS < <(jq -r '.include_inventory_smart_schemas[]' "$CONFIG_FILE")
mapfile -t INCLUDE_GLOBAL_SCHEMAS < <(jq -r '.include_global_schemas[]' "$CONFIG_FILE")

# --------- PROMPTS ---------
blip() { printf "\033[5;32m●\033[0m "; }

# Environments from config (sorted by priority)
prompt_env() {
  section "Select target deployment environment"
  mapfile -t ENV_NAMES < <(jq -r '.environments | to_entries | sort_by(.value.priority) | .[].key' "$CONFIG_FILE")
  for i in "${!ENV_NAMES[@]}"; do printf "%d) %s  " $((i+1)) "${ENV_NAMES[$i]}"; done; echo
  if $ASSUME_YES; then env_num=1; echo "Auto-selected: 1"; else blip; read -rp "Enter number: " env_num; fi
  if [[ "$env_num" =~ ^[0-9]+$ ]] && (( env_num >= 1 && env_num <= ${#ENV_NAMES[@]} )); then
    ENV="${ENV_NAMES[$((env_num-1))]}"
    BRANCH=$(jq -r --arg env "$ENV" '.environments[$env].branch' "$CONFIG_FILE")
    SRC_BRANCH=$(jq -r --arg env "$ENV" '.environments[$env].src_branch' "$CONFIG_FILE")
  else
    echo "Invalid environment selection"; exit 1
  fi
}

prompt_clients() {
  section "Select clients"
  for i in "${!CLIENT_LIST[@]}"; do printf "%d) %s  " $((i+1)) "${CLIENT_LIST[$i]}"; done; echo
  if $ASSUME_YES; then
    CLIENTS=("${CLIENT_LIST[@]}")
    echo "Auto-selected: all"
  else
    blip; read -rp "Enter comma-separated numbers, or 'all': " input
    CLIENTS=()
    if [[ "$input" =~ ^[Aa][Ll][Ll]$ ]]; then CLIENTS=("${CLIENT_LIST[@]}"); else
      IFS=',' read -ra SEL <<< "$input"
      for idx in "${SEL[@]}"; do idx=$(echo "$idx"|xargs); [[ "$idx" =~ ^[0-9]+$ ]] || continue; idx=$((idx-1));
        (( idx>=0 && idx<${#CLIENT_LIST[@]} )) && CLIENTS+=("${CLIENT_LIST[$idx]}")
      done
    fi
  fi
  ((${#CLIENTS[@]})) || { echo "No clients selected"; exit 1; }
}

prompt_repo_global_schema() {
  section "Repository-level global schema inclusion"
  echo "Affects: database/schemas/inventory_smart and database/schemas/global"
  if $ASSUME_YES; then INCLUDE_REPO_GLOBAL=Y; echo "Auto-selected: include"; else
    blip; read -rp "Include repository-level schema changes? (Y/n): " ans; ans=${ans:-Y}; INCLUDE_REPO_GLOBAL="$ans"
  fi
}

validate_branch_name() {
  local name="$1"
  [[ "$name" =~ ^[^-] && "$name" =~ [^./]$ && "$name" =~ ^[A-Za-z0-9._/-]+$ ]]
}

prompt_release_name() {
  if [[ -n "$CUSTOM_RELEASE_NAME" ]]; then
    validate_branch_name "$CUSTOM_RELEASE_NAME" || { echo "Invalid --name"; exit 1; }
    RELEASE_NAME="release_${DATETIME}${CUSTOM_RELEASE_NAME}"
  else
    if $ASSUME_YES; then RELEASE_NAME="release_${DATETIME}"; else
      blip; read -rp "Custom release branch suffix (appended to 'release_${DATETIME}') [optional]: " sfx
      if [[ -n "$sfx" ]]; then validate_branch_name "$sfx" || { echo "Invalid branch suffix"; exit 1; }; RELEASE_NAME="release_${DATETIME}$sfx"; else RELEASE_NAME="release_${DATETIME}"; fi
    fi
  fi
  RELEASE_BRANCH="$(echo "$ENV"|tr '[:upper:]' '[:lower:]')/$RELEASE_NAME"
}

# --------- GIT HELPERS ---------
ensure_branch_present() {
  local ref="$1"
  info "Fetching latest from origin for '$ref'"
  run_with_progress "fetch $ref" "git -C '$REPO_ROOT' fetch origin '+$ref:$ref' >/dev/null 2>&1 || true"
}

exists_in_branch() {
  local branch="$1"; local path="$2"
  git -C "$REPO_ROOT" cat-file -e "$branch:$path" >/dev/null 2>&1
}

is_tracked() {
  local path="$1"
  git -C "$WORKTREE" ls-files --error-unmatch -- "$path" >/dev/null 2>&1
}

restore_to_branch_or_delete() {
  local branch="$1"; shift
  for path in "$@"; do
    if exists_in_branch "$branch" "$path"; then
      git -C "$WORKTREE" restore --source="$branch" --staged --worktree -- "$path" 2>/dev/null || true
      filelog "restored:$path -> $branch"
    else
      if is_tracked "$path"; then
        git -C "$WORKTREE" rm -rf -- "$path" >/dev/null 2>&1 || true
      else
        rm -rf -- "$WORKTREE/$path" >/dev/null 2>&1 || true
      fi
      filelog "deleted:$path (absent in $branch)"
    fi
  done
}

list_changed_for_client() {
  local client="$1"
  echo "Client $client changes (staged):" >> "$LOG_FILE"
  git -C "$WORKTREE" --no-pager diff --cached --name-status -- "database/$client" >> "$LOG_FILE" || true
  echo "" >> "$LOG_FILE"
}

# --------- WORKTREE SETUP ---------
prompt_env
prompt_clients
prompt_repo_global_schema
prompt_release_name

section "Execution summary"
info "Environment: $ENV"
info "Source branch: $SRC_BRANCH"
info "Target branch: $BRANCH"
info "Release branch: $RELEASE_BRANCH"
info "Clients: ${CLIENTS[*]}"
info "Repo-level schemas: $INCLUDE_REPO_GLOBAL"
info "Bitbucket: $BITBUCKET_WORKSPACE/$BITBUCKET_REPO"
info "PR API URL: $BITBUCKET_API_PR_URL"
if $DEBUG_MODE; then
  info "Mode: Debug (separate worktree)"
else
  info "Mode: Normal (current repository)"
fi

if ! $ASSUME_YES; then blip; read -rp "Proceed? (y/N): " c; [[ "$c" =~ ^[Yy]$ ]] || { echo "Aborted"; exit 0; }; fi

section "Preparing branches/worktree"
ensure_branch_present "$SRC_BRANCH"
ensure_branch_present "$BRANCH"

if $DEBUG_MODE; then
  # Debug mode: use separate worktree
  WORKTREE="/tmp/mtp_release_${DATETIME}"
  # Clean any existing directory
  rm -rf "$WORKTREE"
  # If release branch exists, delete it (local)
  if git -C "$REPO_ROOT" rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
    info "Deleting existing branch $RELEASE_BRANCH"
    git -C "$REPO_ROOT" branch -D "$RELEASE_BRANCH" >/dev/null 2>&1 || true
  fi
  info "Creating worktree at $WORKTREE for $RELEASE_BRANCH from $BRANCH"
  run_with_progress "worktree add" "git -C '$REPO_ROOT' worktree add -b '$RELEASE_BRANCH' '$WORKTREE' '$BRANCH' >/dev/null"
else
  # Normal mode: work in current repo
  WORKTREE="$REPO_ROOT"
  # If release branch exists, delete it (local)
  if git -C "$REPO_ROOT" rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
    info "Deleting existing branch $RELEASE_BRANCH"
    git -C "$REPO_ROOT" branch -D "$RELEASE_BRANCH" >/dev/null 2>&1 || true
  fi
  info "Creating and checking out release branch $RELEASE_BRANCH from $BRANCH"
  run_with_progress "checkout branch" "git -C '$REPO_ROOT' checkout -b '$RELEASE_BRANCH' '$BRANCH' >/dev/null"
fi

# --------- COPY / SYNC OPERATIONS ---------
section "Repository-level operations"
subsection "Sync repository-level data"
REPO_DATA_PATHS=("database/data/inventory_smart" "database/data/ada_visual" "database/data/global")
for REPO_DATA_PATH in "${REPO_DATA_PATHS[@]}"; do
  run_with_progress "restore $REPO_DATA_PATH (excluding OMS) from $SRC_BRANCH" "git -C '$WORKTREE' restore --source='$SRC_BRANCH' --staged --worktree -- '$REPO_DATA_PATH' ':(icase,exclude)**/*oms*' 2>/dev/null || true"
  # Safety fallback: Revert any OMS files back to target state (or delete if absent)
  if [[ -d "$WORKTREE/$REPO_DATA_PATH" ]]; then
    while IFS= read -r -d '' f; do rel="${f#"$WORKTREE/"}"; restore_to_branch_or_delete "$BRANCH" "$rel"; done < <(find "$WORKTREE/$REPO_DATA_PATH" -type f -iname "*oms*" -print0 2>/dev/null)
  fi
done

copy_repo_global_schemas() {
  if [[ "$INCLUDE_REPO_GLOBAL" =~ ^[Yy]$ ]]; then
    subsection "Sync repository-level schemas"
    local inv_s="database/schemas/inventory_smart"
    local g_s="database/schemas/global"
    run_with_progress "restore $inv_s (excluding OMS) from $SRC_BRANCH" "git -C '$WORKTREE' restore --source='$SRC_BRANCH' --staged --worktree -- '$inv_s' ':(icase,exclude)**/*oms*' 2>/dev/null || true"
    run_with_progress "restore $g_s (excluding OMS) from $SRC_BRANCH" "git -C '$WORKTREE' restore --source='$SRC_BRANCH' --staged --worktree -- '$g_s' ':(icase,exclude)**/*oms*' 2>/dev/null || true"
    # Safety fallback for any OMS files that slipped
    for p in "$inv_s" "$g_s"; do
      if [[ -d "$WORKTREE/$p" ]]; then
        while IFS= read -r -d '' f; do rel="${f#"$WORKTREE/"}"; restore_to_branch_or_delete "$BRANCH" "$rel"; done < <(find "$WORKTREE/$p" -type f -iname "*oms*" -print0 2>/dev/null)
      fi
    done
  else
    info "Skipping repo-level schema sync"
  fi
}
copy_repo_global_schemas

section "Per-client operations"
for client in "${CLIENTS[@]}"; do
  subsection "Client: $client"
  paths=("database/$client/data/inventory_smart" "database/$client/data/ada_visual" "database/$client/schemas/inventory_smart" "database/$client/schemas/global")
  for p in "${paths[@]}"; do
    run_with_progress "restore $p (excluding OMS) from $SRC_BRANCH" "git -C '$WORKTREE' restore --source='$SRC_BRANCH' --staged --worktree -- '$p' ':(icase,exclude)**/*oms*' 2>/dev/null || true"
  done
  # Revert OMS files (safety)
  for p in "${paths[@]}"; do
    if [[ -d "$WORKTREE/$p" ]]; then
      while IFS= read -r -d '' f; do rel="${f#"$WORKTREE/"}"; restore_to_branch_or_delete "$BRANCH" "$rel"; done < <(find "$WORKTREE/$p" -type f -iname "*oms*" -print0 2>/dev/null)
    fi
  done
  list_changed_for_client "$client"
  # Quiet console summary
  cnt=$(git -C "$WORKTREE" --no-pager diff --cached --name-only -- "database/$client" | wc -l | xargs)
  info "  staged changes: $cnt files (details in log)"
done

# --------- ENVIRONMENT-SPECIFIC DATA ---------
copy_environment_specific_data() {
  section "Environment-specific data"
  local env_folders=("prod_specific" "uat_specific" "test_specific" "dev_specific")

  info "Syncing environment-specific folders (prod_specific, uat_specific, test_specific, dev_specific) for selected clients"

  for client in "${CLIENTS[@]}"; do
    subsection "Client: $client"
    local client_start=$(date +%s)
    local total_files=0
    local synced_folders=0

    for env_folder in "${env_folders[@]}"; do
      local env_data_path="database/$client/data/$env_folder"
      local start=$(date +%s)

      printf "    • %s: " "$env_folder"

      # Check if the environment-specific folder exists in the source branch
      if exists_in_branch "$SRC_BRANCH" "$env_data_path"; then
        printf "[EXISTS] "

        # Attempt to restore the environment-specific data
        if git -C "$WORKTREE" restore --source="$SRC_BRANCH" --staged --worktree -- "$env_data_path" 2>/dev/null; then
          local end=$(date +%s)
          printf "(%ss) [OK]" "$((end-start))"
          filelog "env_specific_synced:$env_data_path from $SRC_BRANCH"
          synced_folders=$((synced_folders + 1))

          # Count files copied for this folder - with error handling
          if [[ -d "$WORKTREE/$env_data_path" ]]; then
            local file_count=0
            file_count=$(find "$WORKTREE/$env_data_path" -type f 2>/dev/null | wc -l | xargs || echo "0")
            printf " (%s files)" "$file_count"
            total_files=$((total_files + file_count))
          fi
          printf "\n"
        else
          local end=$(date +%s)
          printf "(%ss) [FAIL]\n" "$((end-start))"
          filelog "env_specific_sync_failed:$env_data_path from $SRC_BRANCH"
          info "        ⚠ Failed to sync $env_data_path"
        fi
      else
        printf "[NOT FOUND] "
        local end=$(date +%s)
        printf "(%ss) [SKIP]\n" "$((end-start))"
        filelog "env_specific_not_found:$env_data_path in $SRC_BRANCH"
      fi
    done

    # Client summary
    local client_end=$(date +%s)
    local client_duration=$((client_end - client_start))
    printf "    ↳ Summary: %s/%s folders synced, %s total files (%ss)\n" "$synced_folders" "${#env_folders[@]}" "$total_files" "$client_duration"

    # Add spacing between clients for readability
    echo
  done
}
copy_environment_specific_data

# --------- CLIENT-LEVEL GLOBAL DATA (selected files) ---------
prompt_global_client_data() {
  section "Client-level global data"
  if $ASSUME_YES; then include=y; echo "Auto: include"; else blip; read -rp "Include client-level global data updates? (y/n): " include; fi
  if [[ "$include" =~ ^[Yy]$ ]]; then
    info "Including client-level global data updates"
    INCLUDE_CLIENT_GLOBAL_DATA=true
  else
    info "Skipping client-level global data updates (user selected 'n'); continuing with exclusions and the rest of the script"
    INCLUDE_CLIENT_GLOBAL_DATA=false
    return
  fi
  local targets=("${CLIENTS[@]}")
  for client in "${targets[@]}"; do
    local base="database/$client/data/global"
    [[ -d "$WORKTREE/$base" ]] || { info "No global data folder for $client"; continue; }
    for fname in "${INCLUDE_GLOBAL_FILES[@]}"; do
      [[ "$fname" == oms* ]] && continue
      local fp="$base/$fname"
      git -C "$WORKTREE" restore --source="$SRC_BRANCH" --staged --worktree -- "$fp" 2>/dev/null || filelog "missing_in_source:$fp"
    done
    list_changed_for_client "$client"
  done
}
prompt_global_client_data

# --------- EXCLUSIONS (paths and files) ---------
section "Apply exclusions"
# Helper: print blinking yellow dot
blink_yellow() { printf "\033[5;33m●\033[0m"; }

# Excluded paths: restore to target or delete if absent (single timed block)
if (( ${#EXCLUDE_PATHS[@]} )); then
  subsection "Restore excluded paths to target or delete if absent"
  start=$(date +%s)
  printf "  • %s Paths " "$(blink_yellow)"
  for x in "${EXCLUDE_PATHS[@]}"; do
    restore_to_branch_or_delete "$BRANCH" "$x"; printf "."
  done
  end=$(date +%s); printf " (%ss) [OK]\n" "$((end-start))"
fi

# Excluded files under specified schema types and clients + repo-level schemas
if (( ${#EXCLUDE_FILES[@]} )); then
  subsection "Per-client excluded files"
  for client in "${CLIENTS[@]}"; do
    cstart=$(date +%s)
    printf "  • %s Client: %s " "$(blink_yellow)" "$client"
    for exclude_file in "${EXCLUDE_FILES[@]}"; do
      for t in "${INCLUDE_INV_SCHEMAS[@]}"; do restore_to_branch_or_delete "$BRANCH" "database/$client/schemas/inventory_smart/$t/$exclude_file"; printf "."; done
      for t in "${INCLUDE_GLOBAL_SCHEMAS[@]}"; do restore_to_branch_or_delete "$BRANCH" "database/$client/schemas/global/$t/$exclude_file"; printf "."; done
    done
    cend=$(date +%s); printf " (%ss) [OK]\n" "$((cend-cstart))"
  done

  subsection "Repository-level excluded files"
  rstart=$(date +%s)
  printf "  • %s Repo-level " "$(blink_yellow)"
  for exclude_file in "${EXCLUDE_FILES[@]}"; do
    for t in "${INCLUDE_INV_SCHEMAS[@]}";   do restore_to_branch_or_delete "$BRANCH" "database/schemas/inventory_smart/$t/$exclude_file"; printf "."; done
    for t in "${INCLUDE_GLOBAL_SCHEMAS[@]}"; do restore_to_branch_or_delete "$BRANCH" "database/schemas/global/$t/$exclude_file"; printf "."; done
  done
  rend=$(date +%s); printf " (%ss) [OK]\n" "$((rend-rstart))"
fi

section "Release branch ready"
info "Worktree: $WORKTREE"
info "Release branch: $RELEASE_BRANCH"
info "Review changes in the worktree, then commit/push as desired."

if $ASSUME_YES; then commit_choice=n; else blip; read -rp "Commit and push now? (y/n): " commit_choice; fi
if [[ "$commit_choice" =~ ^[Yy]$ ]]; then
  default_msg="release for $ENV $RELEASE_NAME"
  if $ASSUME_YES; then commit_msg="$default_msg"; else blip; read -rp "Commit message (default: '$default_msg'): " commit_msg; commit_msg=${commit_msg:-$default_msg}; fi
  run_with_progress "git add" "cd '$WORKTREE' && git add -A"
  run_with_progress "git commit" "cd '$WORKTREE' && git commit -m '$commit_msg'"
  run_with_progress "git push" "cd '$WORKTREE' && git push --set-upstream origin '$RELEASE_BRANCH'"
  info "Committed and pushed to $RELEASE_BRANCH"
else
  info "Unstaging all changes..."
  run_with_progress "git reset" "cd '$WORKTREE' && git reset HEAD"
  if $DEBUG_MODE; then
    info "Changes unstaged in worktree at $WORKTREE"
  else
    info "Changes unstaged in current repository. You are now on branch $RELEASE_BRANCH"
  fi
fi

section "Inventory Smart Release v2 - COMPLETE"
info "Log saved to: $LOG_FILE"

# --------- PULL REQUEST INFORMATION / CREATION ---------
if [[ "$commit_choice" =~ ^[Yy]$ ]]; then
  section "Pull Request"
  info "Branch pushed successfully to origin/$RELEASE_BRANCH"

  # Fetch team lead UUIDs for PR reviewers
  get_default_reviewer_uuids

  # Format human-readable date for PR
  format_human_date() {
    local datetime_input="$1"
    # Convert YYYY-MM-DD_HH-MM to human readable format
    if [[ "$datetime_input" =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2})_([0-9]{2})-([0-9]{2})$ ]]; then
      local year="${BASH_REMATCH[1]}"
      local month="${BASH_REMATCH[2]}"
      local day="${BASH_REMATCH[3]}"
      local hour="${BASH_REMATCH[4]}"
      local minute="${BASH_REMATCH[5]}"

      # Convert month number to name
      local month_names=("" "January" "February" "March" "April" "May" "June" "July" "August" "September" "October" "November" "December")
      local month_name="${month_names[${month#0}]}"

      # Convert to 12-hour format with AM/PM
      local hour_12=$((${hour#0}))
      local ampm="AM"
      if (( hour_12 == 0 )); then
        hour_12=12
      elif (( hour_12 > 12 )); then
        hour_12=$((hour_12 - 12))
        ampm="PM"
      elif (( hour_12 == 12 )); then
        ampm="PM"
      fi

      echo "$month_name $day, $year at $hour_12:${minute} $ampm"
    elif [[ "$datetime_input" =~ ^([0-9]{4})-([0-9]{2})-([0-9]{2})$ ]]; then
      # Handle YYYY-MM-DD format (DATE variable)
      local year="${BASH_REMATCH[1]}"
      local month="${BASH_REMATCH[2]}"
      local day="${BASH_REMATCH[3]}"

      # Convert month number to name
      local month_names=("" "January" "February" "March" "April" "May" "June" "July" "August" "September" "October" "November" "December")
      local month_name="${month_names[${month#0}]}"

      echo "$month_name $day, $year"
    else
      echo "$datetime_input"
    fi
  }

  # Generate client list for PR description
  generate_client_list() {
    local clients_str=""
    for client in "${CLIENTS[@]}"; do
      if [[ -n "$clients_str" ]]; then
        clients_str="$clients_str
• $client"
      else
        clients_str="• $client"
      fi
    done

    # Add global data changes note if applicable
    if [[ "${INCLUDE_CLIENT_GLOBAL_DATA:-false}" == "true" ]]; then
      clients_str="$clients_str

*Note: Global data changes (client level) are included for the above clients*"
    fi

    echo "$clients_str"
  }

  # Generate global changes list (repository-level only)
  generate_global_changes_list() {
    local global_changes=""

    # Repository-level global schema changes
    if [[ "$INCLUDE_REPO_GLOBAL" =~ ^[Yy]$ ]]; then
      global_changes="• Global schema changes (repository level)
• Global data changes (repository level)"
    fi

    if [[ -n "$global_changes" ]]; then
      echo "$global_changes"
    fi
  }

  DEST_BRANCH="$BRANCH"
  PR_BROWSER_URL="https://bitbucket.org/$BITBUCKET_WORKSPACE/$BITBUCKET_REPO/pull-requests/new?source=$RELEASE_BRANCH&dest=$DEST_BRANCH"
  info "Manual PR URL: $PR_BROWSER_URL"

  if $ASSUME_YES; then create_now=y; else blip; read -rp "Create PR automatically now? (y/n): " create_now; fi
  if [[ "$create_now" =~ ^[Yy]$ ]]; then
    # Generate human-readable date
    HUMAN_DATE=$(format_human_date "$DATETIME")
    HUMAN_DATE_SHORT=$(format_human_date "$DATE")

    # Create better formatted title and description
    default_title="Release: $ENV Deployment - $HUMAN_DATE_SHORT"

    # Build comprehensive description
    client_list=$(generate_client_list)
    global_changes_list=$(generate_global_changes_list)

    # Build description with actual line breaks
    default_desc="🚀 **Automated Release for $ENV Environment**

📅 **Generated on:** $HUMAN_DATE
🏷️ **Release ID:** $RELEASE_NAME

## 📊 Included Clients
$client_list"

    if [[ -n "$global_changes_list" ]]; then
      default_desc="$default_desc

## 🌐 Global Changes
$global_changes_list"
    fi

    default_desc="$default_desc

## 🔧 Technical Details
• **Source branch:** $SRC_BRANCH
• **Target branch:** $BRANCH
• **Release branch:** $RELEASE_BRANCH"

    if $ASSUME_YES; then
      PR_TITLE="$default_title"
      PR_DESC="$default_desc"
    else
      blip; read -rp "PR title (default: '$default_title'): " PR_TITLE; PR_TITLE=${PR_TITLE:-$default_title}
      blip; read -rp "PR description (optional, default auto-generated): " PR_DESC; PR_DESC=${PR_DESC:-$default_desc}
    fi

    info "Creating PR '$PR_TITLE' -> $DEST_BRANCH"
    PR_SCRIPT="$SCRIPT_DIR/bitbucket_create_pr.sh"
    if [[ ! -x "$PR_SCRIPT" ]]; then chmod +x "$PR_SCRIPT" 2>/dev/null || true; fi

    # Enable verbose API logging when running in --debug mode
    PR_EXTRA_ARGS=""
    if $DEBUG_MODE; then PR_EXTRA_ARGS="--debug"; fi

    # Show reviewer info
    if [[ -n "$REVIEWER_UUIDS" ]]; then
      info "Using reviewers: $REVIEWER_UUIDS"
    else
      info "No reviewers configured"
    fi

    set +e
    "$PR_SCRIPT" \
      --workspace "$BITBUCKET_WORKSPACE" \
      --repo "$BITBUCKET_REPO" \
      --source "$RELEASE_BRANCH" \
      --dest "$DEST_BRANCH" \
      --title "$PR_TITLE" \
      --description "$PR_DESC" \
      ${REVIEWER_UUIDS:+--reviewer-uuids "$REVIEWER_UUIDS"} \
      ${PR_EXTRA_ARGS}
    rc=$?
    set -e
    if [[ $rc -eq 0 ]]; then
      info "PR creation step completed"
    else
      info "PR creation failed (exit $rc). Falling back to manual URL above."
    fi
  else
    info "Skipping API PR creation. Use the manual URL above."
  fi
fi
