#!/usr/bin/env bash

# =============================
# Inventory Smart Release Automation Script
# =============================
# Author: Mithun Rangaswamy
# Date: 07/07/2025
#
# This script automates the release process for the mtp-database repository
# for the inventory_smart team, as per the requirements in script_req.txt.
#
# Usage:
#   ./inventory_smart_release.sh [--additional] [--name "custom_name"]
#   ./inventory_smart_release.sh [--additional] [--name=custom_name]
#
# Options:
#   --additional    Handle additional paths for clients
#   --name          Specify a custom name to append to the default release name
# =============================

set -e
set -u
set -o pipefail

# ---- Ensure modern Bash ----
if ((BASH_VERSINFO[0] < 4)); then
  echo "\033[1;31mERROR: This script requires Bash version 4 or higher.\033[0m"
  echo "Please install a modern Bash (e.g., with Homebrew: brew install bash) and run the script with:"
  echo "  /usr/local/bin/bash ./inventory_smart_release.sh  (Intel)"
  echo "  /opt/homebrew/bin/bash ./inventory_smart_release.sh  (Apple Silicon)"
  exit 1
fi

# --------- CONFIGURATION ---------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/inventory_smart_release_config.json"
REPO_PATH="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DB_PATH="$REPO_PATH/database"
DATE=$(date +%Y-%m-%d)
DATETIME=$(date +%Y-%m-%d_%H-%M)

# Load client list from config (Bash array)
mapfile -t CLIENT_LIST < <(jq -r '.clients[].name' "$CONFIG_FILE")
mapfile -t OMIT_GLOBAL_CSV < <(jq -r '.omit_global_csv[]' "$CONFIG_FILE")
mapfile -t INCLUDE_GLOBAL_FILES < <(jq -r '.include_global_files[]' "$CONFIG_FILE")
mapfile -t EXCLUDE_PATHS < <(jq -r '.exclude_paths[]' "$CONFIG_FILE")
mapfile -t EXCLUDE_FILES < <(jq -r '.exclude_files[]' "$CONFIG_FILE")
mapfile -t INCLUDE_INV_SCHEMAS < <(jq -r '.include_inventory_smart_schemas[]' "$CONFIG_FILE")
mapfile -t INCLUDE_GLOBAL_SCHEMAS < <(jq -r '.include_global_schemas[]' "$CONFIG_FILE")

# --------- ARGUMENT PARSING ---------
HANDLE_ADDITIONAL_PATHS=false
CUSTOM_RELEASE_NAME=""
EXPECTING_NAME=false

for arg in "$@"; do
  if [[ "$arg" == "--additional" ]]; then
    HANDLE_ADDITIONAL_PATHS=true
  elif [[ "$arg" == "--name" ]]; then
    EXPECTING_NAME=true
  elif [[ "$arg" =~ ^--name= ]]; then
    # Extract name from --name=value format
    CUSTOM_RELEASE_NAME="${arg#--name=}"
  elif [[ "$EXPECTING_NAME" == true ]]; then
    # This is the value after --name flag
    CUSTOM_RELEASE_NAME="$arg"
    EXPECTING_NAME=false
  fi
done

# --------- FUNCTIONS ---------

# Helper function to check if a file should be excluded
is_file_excluded() {
  local file_path="$1"
  local filename=$(basename "$file_path")
  
  # Check if file is in exclude_paths
  for exclude_path in "${EXCLUDE_PATHS[@]}"; do
    if [[ "$file_path" == "$exclude_path" ]]; then
      return 0  # File is excluded
    fi
  done
  
  # Check if filename is in exclude_files
  for exclude_file in "${EXCLUDE_FILES[@]}"; do
    if [[ "$filename" == "$exclude_file" ]]; then
      return 0  # File is excluded
    fi
  done
  
  return 1  # File is not excluded
}

# Helper function to handle exclusions for a specific path
handle_path_exclusions() {
  local path="$1"
  
  # Handle excluded files in this path and all subdirectories
  if [[ ${#EXCLUDE_FILES[@]} -gt 0 ]]; then
    for exclude_file in "${EXCLUDE_FILES[@]}"; do
      # Search for the excluded file in the path and all subdirectories
      find "$REPO_PATH/$path" -name "$exclude_file" -type f 2>/dev/null | while read -r file_path; do
        # Convert absolute path to relative path from repo root
        local relative_path="${file_path#$REPO_PATH/}"
        log_command "Restoring excluded file to target branch: $relative_path"
        git -C "$REPO_PATH" restore --source="$BRANCH" --staged --worktree -- "$relative_path" 2>/dev/null || log_warning "Could not restore '$relative_path' from target branch"
      done
    done
  fi
  
  # Handle excluded paths that match this path
  if [[ ${#EXCLUDE_PATHS[@]} -gt 0 ]]; then
    for exclude_path in "${EXCLUDE_PATHS[@]}"; do
      if [[ "$exclude_path" == "$path"* ]]; then
        log_command "Restoring excluded path to target branch: $exclude_path"
        git -C "$REPO_PATH" restore --source="$BRANCH" --staged --worktree -- "$exclude_path" 2>/dev/null || log_warning "Could not restore '$exclude_path' from target branch"
      fi
    done
  fi
}

# Enhanced logging functions for better readability
log_section() {
  echo -e "\n$(printf '=%.0s' {1..80})"
  echo -e "🔄 $1"
  echo -e "$(printf '=%.0s' {1..80})\n"
}

log_step() {
  echo -e "\n📋 $1"
  echo -e "$(printf '-%.0s' {1..60})"
}

log_command() {
  echo -e "  → $1"
}

log_success() {
  echo -e "  ✅ $1"
}

log_warning() {
  echo -e "  ⚠️  $1"
}

log_error() {
  echo -e "  ❌ $1"
}

setup_logging() {
  # Create log directory in /tmp
  LOG_DIR="/tmp/mtp_database_logs_$(date +%Y%m%d_%H%M%S)"
  mkdir -p "$LOG_DIR"
  
  # Create timestamped log file
  LOG_FILE="$LOG_DIR/release_$(date +%Y%m%d_%H%M%S).log"
  
  # Log both to file and terminal
  exec > >(tee -a "$LOG_FILE") 2>&1
  
  log_section "RELEASE SCRIPT STARTED"
  echo "Log file: $LOG_FILE"
  echo "Repository: $REPO_PATH"
  echo "Timestamp: $(date)"
  echo ""
}

git_safe_operation() {
  local operation="$1"
  local description="$2"
  
  log_step "$description"
  
  # Auto-stash any uncommitted changes
  if ! git -C "$REPO_PATH" diff --quiet; then
    log_warning "Uncommitted changes detected. Auto-stashing..."
    git -C "$REPO_PATH" stash
  fi
  
  # Execute operation
  log_command "$operation"
  if eval "$operation"; then
    log_success "Operation completed successfully"
  else
    log_error "Operation failed"
    return 1
  fi
}

blinking_prompt() {
  # Green blinking dot
  echo -ne "\033[5;32m●\033[0m "
}

blinking_prompt_red() {
  # Red blinking dot
  echo -ne "\033[5;31m●\033[0m "
}

print_separator() {
  echo -e "\n------------------------------------------------------------"
}

print_step() {
  print_separator
  echo -e "\033[1;36m$1\033[0m"
  print_separator
}

prompt_env() {
  echo "Select the target deployment environment:"
  # Read environments and priorities from config, sort by priority
  mapfile -t ENV_NAMES < <(jq -r '.environments | to_entries | sort_by(.value.priority) | .[].key' "$CONFIG_FILE")
  for i in "${!ENV_NAMES[@]}"; do
    # Green number for environment
    printf "\033[1;32m%d\033[0m. %s  " $((i+1)) "${ENV_NAMES[$i]}"
  done
  echo
  blinking_prompt
  read -rp "Enter the number for the environment: " env_num
  if [[ "$env_num" =~ ^[0-9]+$ ]] && (( env_num >= 1 && env_num <= ${#ENV_NAMES[@]} )); then
    ENV="${ENV_NAMES[$((env_num-1))]}"
    BRANCH=$(jq -r --arg env "$ENV" '.environments[$env].branch' "$CONFIG_FILE")
    SRC_BRANCH=$(jq -r --arg env "$ENV" '.environments[$env].src_branch' "$CONFIG_FILE")
  else
    echo "Invalid selection."; exit 1;
  fi
}

prompt_clients() {
  echo -e "\nAvailable clients:"
  for i in "${!CLIENT_LIST[@]}"; do
    # Green number for client
    printf "\033[1;32m%d\033[0m. %s  " $((i+1)) "${CLIENT_LIST[$i]}"
  done
  echo
  blinking_prompt
  echo "Enter comma-separated numbers for clients to include (e.g., 1,3,5) or type 'all' to select all clients."
  read -rp "Your selection: " client_input
  CLIENTS=()
  if [[ "$client_input" =~ ^[Aa][Ll][Ll]$ ]]; then
    CLIENTS=("${CLIENT_LIST[@]}")
  else
    IFS=',' read -ra SELECTED <<< "$client_input"
    for idx in "${SELECTED[@]}"; do
      idx=$(echo "$idx" | xargs)
      if [[ "$idx" =~ ^[0-9]+$ ]]; then
        idx=$((idx-1))
        if (( idx >= 0 && idx < ${#CLIENT_LIST[@]} )); then
          CLIENTS+=("${CLIENT_LIST[$idx]}")
        fi
      fi
    done
  fi
  if [[ ${#CLIENTS[@]} -eq 0 ]]; then
    echo "No valid clients selected. Exiting."; exit 1
  fi
  echo "Selected clients: ${CLIENTS[*]}"
}

verify_client_folders() {
  for client in "${CLIENTS[@]}"; do
    if [[ ! -d "$DB_PATH/$client" ]]; then
      echo "Warning: Client folder $client does not exist in $DB_PATH."
    fi
  done
}

handle_dev_src_branch() {
  if [[ "$ENV" == "DEV" ]]; then
    blinking_prompt
    read -rp "DEV environment: Enter the source branch for git checkout -- (default: develop/dev): " dev_src
    SRC_BRANCH=${dev_src:-develop/dev}
  fi
}

prompt_global_schema_inclusion() {
  echo -e "\n📁 REPOSITORY-LEVEL GLOBAL SCHEMAS"
  echo "These are shared schemas that affect ALL clients:"
  echo "  • database/schemas/inventory_smart (shared inventory functions, views, tables)"
  echo "  • database/schemas/global (shared global functions, views, tables)"
  echo ""
  echo "⚠️  WARNING: Changes here will affect ALL clients in this release!"
  echo ""
  blinking_prompt
  read -rp "Include repository-level global schema changes? (Y/n): " include_global_schemas
  include_global_schemas=${include_global_schemas:-Y}
  INCLUDE_REPO_GLOBAL="$include_global_schemas"
}

validate_branch_name() {
  local name="$1"
  # Git branch names cannot contain spaces, control characters, or certain special characters
  # Also cannot start with - or end with . or /
  if [[ "$name" =~ ^[^-] && "$name" =~ [^./]$ && "$name" =~ ^[a-zA-Z0-9._/-]+$ ]]; then
    return 0
  else
    return 1
  fi
}

prompt_release_name() {
  if [[ -n "$CUSTOM_RELEASE_NAME" ]]; then
    if validate_branch_name "$CUSTOM_RELEASE_NAME"; then
      echo "Using custom release name appended to default: $CUSTOM_RELEASE_NAME"
      RELEASE_NAME="release_$DATETIME$CUSTOM_RELEASE_NAME"
    else
      echo "Error: Invalid branch name '$CUSTOM_RELEASE_NAME'. Branch names cannot contain spaces, control characters, or start with - or end with . or /"
      exit 1
    fi
  else
    while true; do
      blinking_prompt
      read -rp "Enter a custom release name to append (or press Enter for default with timestamp): " custom_name
      if [[ -n "$custom_name" ]]; then
        if validate_branch_name "$custom_name"; then
          RELEASE_NAME="release_$DATETIME$custom_name"
          echo "Using custom release name appended to default: $RELEASE_NAME"
          break
        else
          echo "Error: Invalid branch name. Branch names cannot contain spaces, control characters, or start with - or end with . or /"
          echo "Please try again."
        fi
      else
        RELEASE_NAME="release_$DATETIME"
        echo "Using default release name: $RELEASE_NAME"
        break
      fi
    done
  fi
  
  # Set RELEASE_BRANCH for use in summary
  RELEASE_BRANCH="$(echo "$ENV" | tr '[:upper:]' '[:lower:]')/$RELEASE_NAME"
}

git_core_steps() {
  log_step "Stashing Local Changes and Managing Git Operations"
  
  # Auto-stash any existing changes
  if ! git -C "$REPO_PATH" diff --quiet; then
    log_warning "Local changes detected. Auto-stashing..."
    git -C "$REPO_PATH" stash
  fi
  
  log_step "Checking Out Target Branch: $BRANCH"
  if [[ -n "$SRC_BRANCH" && "$SRC_BRANCH" != "$BRANCH" ]]; then
    log_command "git -C \"$REPO_PATH\" checkout $SRC_BRANCH"
    if ! git -C "$REPO_PATH" checkout "$SRC_BRANCH"; then
      log_error "Could not checkout $SRC_BRANCH. Please check your git status."
      exit 1
    fi
    
    log_command "git -C \"$REPO_PATH\" pull origin $SRC_BRANCH"
    if ! git -C "$REPO_PATH" pull origin "$SRC_BRANCH"; then
      blinking_prompt_red
      read -rp "This is a critical action. Proceed? (y/n): " critical_input
      if [[ "$critical_input" =~ ^[Yy]$ ]]; then
        log_command "git -C \"$REPO_PATH\" pull origin $SRC_BRANCH (forced)"
        git -C "$REPO_PATH" pull origin "$SRC_BRANCH"
      else
        log_warning "Pull operation cancelled. Please ensure you have already pulled the latest changes."
      fi
    fi
  fi
  
  log_command "git -C \"$REPO_PATH\" checkout $BRANCH"
  if ! git -C "$REPO_PATH" checkout "$BRANCH"; then
    log_error "Could not checkout $BRANCH. Please check your git status."
    exit 1
  fi
  
  log_command "git -C \"$REPO_PATH\" pull origin $BRANCH"
  if ! git -C "$REPO_PATH" pull origin "$BRANCH"; then
    blinking_prompt_red
    read -rp "This is a critical action. Proceed? (y/n): " critical_input
    if [[ "$critical_input" =~ ^[Yy]$ ]]; then
      log_command "git -C \"$REPO_PATH\" pull origin $BRANCH (forced)"
      git -C "$REPO_PATH" pull origin "$BRANCH"
    else
      log_warning "Pull operation cancelled. Please ensure you have already pulled the latest changes."
    fi
  fi
  
  log_step "Creating Release Branch: $RELEASE_BRANCH"
  
  if git -C "$REPO_PATH" rev-parse --verify "$RELEASE_BRANCH" >/dev/null 2>&1; then
    log_warning "Branch $RELEASE_BRANCH already exists. Deleting it."
    log_command "git -C \"$REPO_PATH\" branch -D $RELEASE_BRANCH"
    git -C "$REPO_PATH" branch -D "$RELEASE_BRANCH"
  fi
  
  log_command "git -C \"$REPO_PATH\" checkout -b $RELEASE_BRANCH"
  if ! git -C "$REPO_PATH" checkout -b "$RELEASE_BRANCH"; then
    log_error "Could not create release branch. Please resolve and rerun."
    exit 1
  fi
  
  log_success "Release branch $RELEASE_BRANCH created successfully"
}

copy_client_folders() {
  for client in "${CLIENTS[@]}"; do
    log_step "Copying data for $client from $SRC_BRANCH"

    local inv_data_path="database/$client/data/inventory_smart"
    local inv_schema_path="database/$client/schemas/inventory_smart"
    local global_schema_path="database/$client/schemas/global"

    log_command "Copying all files from $SRC_BRANCH for $client"
    
    # Use git restore to sync entire paths from source branch (handles added, modified, and deleted files)
    for path in "$inv_data_path" "$inv_schema_path" "$global_schema_path"; do
      log_command "Syncing $path from $SRC_BRANCH (handles added, modified, and deleted files)"
      
      # Use git restore to sync the entire path from source branch
      # This handles: A (added), M (modified), and D (deleted) files
      log_command "git -C \"$REPO_PATH\" restore --source=$SRC_BRANCH --staged --worktree -- \"$path\""
      if git -C "$REPO_PATH" restore --source="$SRC_BRANCH" --staged --worktree -- "$path" 2>/dev/null; then
        log_success "Successfully synced $path from $SRC_BRANCH"
        
        # Handle exclusions for this path - restore excluded files to target branch version
        handle_path_exclusions "$path"
      else
        log_warning "Could not sync $path from $SRC_BRANCH (path may not exist in source branch)"
      fi
    done

    # Copy exceptions.json file for this client
    # log_command "Copying exceptions.json for $client"
    # local exceptions_file="database/$client/exceptions.json"
    # if git -C "$REPO_PATH" ls-tree "$SRC_BRANCH" "$exceptions_file" >/dev/null 2>&1; then
    #   log_command "git -C \"$REPO_PATH\" checkout $SRC_BRANCH -- \"$exceptions_file\""
    #   git -C "$REPO_PATH" checkout "$SRC_BRANCH" -- "$exceptions_file" 2>/dev/null || log_warning "Could not checkout '$exceptions_file'"
    # else
    #   log_warning "exceptions.json not found for $client in $SRC_BRANCH"
    # fi

    # Restore OMS files to target branch version (if they exist in target)
    log_command "Restoring OMS files to target branch version"
    for path in "$inv_data_path" "$inv_schema_path" "$global_schema_path"; do
      if [[ -d "$path" ]]; then
        find "$path" -name "*oms*" -type f -print0 2>/dev/null | while IFS= read -r -d '' file; do
          log_command "Restoring OMS file to target branch: $file"
          git -C "$REPO_PATH" restore --source="$BRANCH" --staged --worktree -- "$file" 2>/dev/null || log_warning "Could not restore '$file'"
        done
      fi
    done
    
    
    log_success "Completed copying data for $client"
  done
}

# --------- REPOSITORY-LEVEL SCHEMA FOLDER HANDLING ---------

copy_global_schemas() {
  if [[ "$INCLUDE_REPO_GLOBAL" =~ ^[Yy]$ ]]; then
    log_step "Copying Global Schemas from $SRC_BRANCH"
    
    # Sync inventory_smart schemas from source branch
    local inv_schema_path="database/schemas/inventory_smart"
    log_command "Syncing $inv_schema_path from $SRC_BRANCH (handles added, modified, and deleted files)"
    if git -C "$REPO_PATH" restore --source="$SRC_BRANCH" --staged --worktree -- "$inv_schema_path" 2>/dev/null; then
      log_success "Successfully synced $inv_schema_path from $SRC_BRANCH"
      handle_path_exclusions "$inv_schema_path"
    else
      log_warning "Could not sync $inv_schema_path from $SRC_BRANCH (path may not exist in source branch)"
    fi
    
    # Sync global schemas from source branch
    local global_schema_path="database/schemas/global"
    log_command "Syncing $global_schema_path from $SRC_BRANCH (handles added, modified, and deleted files)"
    if git -C "$REPO_PATH" restore --source="$SRC_BRANCH" --staged --worktree -- "$global_schema_path" 2>/dev/null; then
      log_success "Successfully synced $global_schema_path from $SRC_BRANCH"
      handle_path_exclusions "$global_schema_path"
    else
      log_warning "Could not sync $global_schema_path from $SRC_BRANCH (path may not exist in source branch)"
    fi
    
    
    log_success "Global schemas copied successfully"
  else
    log_warning "Skipping global schema changes."
  fi
}

# --------- REPOSITORY-LEVEL DATA FOLDER HANDLING ---------

copy_repository_inventory_data() {
  log_step "Copying Repository-Level Inventory Smart Data from $SRC_BRANCH"
  
  local inv_data_path="database/data/inventory_smart"
  log_command "Discovering files in $inv_data_path from $SRC_BRANCH"
  
  # Sync repository-level inventory data from source branch
  log_command "Syncing $inv_data_path from $SRC_BRANCH (handles added, modified, and deleted files)"
  if git -C "$REPO_PATH" restore --source="$SRC_BRANCH" --staged --worktree -- "$inv_data_path" 2>/dev/null; then
    log_success "Successfully synced $inv_data_path from $SRC_BRANCH"
    handle_path_exclusions "$inv_data_path"
  else
    log_warning "Could not sync $inv_data_path from $SRC_BRANCH (path may not exist in source branch)"
  fi
  
  # Restore OMS files to target branch version (if they exist in target)
  log_command "Restoring OMS files to target branch version"
  if [[ -d "$inv_data_path" ]]; then
    find "$inv_data_path" -name "*oms*" -type f -print0 2>/dev/null | while IFS= read -r -d '' file; do
      log_command "Restoring OMS file to target branch: $file"
      git -C "$REPO_PATH" restore --source="$BRANCH" --staged --worktree -- "$file" 2>/dev/null || log_warning "Could not restore '$file'"
    done
  fi
  
  log_success "Repository-level inventory data copied successfully"
}

handle_additional_paths() {
  for client in "${CLIENTS[@]}"; do
    mapfile -t ADD_PATHS < <(jq -r --arg name "$client" '.clients[] | select(.name==$name) | .additional_paths[]?' "$CONFIG_FILE")
    if [[ ${#ADD_PATHS[@]} -gt 0 ]]; then
      echo -e "\nClient '$client' has additional paths configured:"
      for path in "${ADD_PATHS[@]}"; do
        echo "  - $path"
      done
    fi
  done
  echo
  blinking_prompt
  read -rp "Do you want to sync (replace) these additional paths for the selected clients? (y/n): " sync_additional
  sync_additional=$(echo "$sync_additional" | xargs | tr '[:upper:]' '[:lower:]')
  if [[ "$sync_additional" == "y" || "$sync_additional" == "yes" ]]; then
    for client in "${CLIENTS[@]}"; do
      mapfile -t ADD_PATHS < <(jq -r --arg name "$client" '.clients[] | select(.name==$name) | .additional_paths[]?' "$CONFIG_FILE")
      if [[ ${#ADD_PATHS[@]} -gt 0 ]]; then
        echo -e "\nGit checkout commands for additional paths for client '$client':"
        for path in "${ADD_PATHS[@]}"; do
          echo "git -C \"$REPO_PATH\" checkout $SRC_BRANCH -- $path"
        done
      fi
    done
  else
    echo "Skipping additional path sync for all clients."
  fi
}

prompt_global_changes() {
  echo -e "\n📂 CLIENT-LEVEL GLOBAL DATA FILES"
  echo "These are global data files that can be applied to specific clients:"
  echo "  • database/{client}/data/global/* (client-specific global data)"
  echo ""
  echo "Note: This is different from repository-level schemas above."
  echo "These files are copied per-client basis."
  echo ""
  blinking_prompt
  read -rp "Include client-level global data file changes? (y/n): " include_global
  if [[ "$include_global" =~ ^[Yy]$ ]]; then
    echo "Which clients should receive global changes?"
    for i in "${!CLIENTS[@]}"; do
      printf "%d. %s  " $((i+1)) "${CLIENTS[$i]}"
    done
    echo
    blinking_prompt
    echo "Enter comma-separated numbers for clients to receive global changes, or 'all' for all selected clients."
    read -rp "Your selection: " global_client_input
    GLOBAL_CLIENTS=()
    if [[ "$global_client_input" =~ ^[Aa][Ll][Ll]$ ]]; then
      GLOBAL_CLIENTS=("${CLIENTS[@]}")
    else
      IFS=',' read -ra GSELECTED <<< "$global_client_input"
      for idx in "${GSELECTED[@]}"; do
        idx=$(echo "$idx" | xargs)
        if [[ "$idx" =~ ^[0-9]+$ ]]; then
          idx=$((idx-1))
          if (( idx >= 0 && idx < ${#CLIENTS[@]} )); then
            GLOBAL_CLIENTS+=("${CLIENTS[$idx]}")
          fi
        fi
      done
    fi
    if [[ ${#GLOBAL_CLIENTS[@]} -eq 0 ]]; then
      echo "No valid clients selected for global changes. Skipping global changes."
      return
    fi
    handle_global_files
  fi
}

handle_global_files() {
  for client in "${GLOBAL_CLIENTS[@]}"; do
    GDATA_PATH="$DB_PATH/$client/data/global"
    HEADER="---------- Copying Global Data for $(echo "$client" | tr '[:lower:]' '[:upper:]') ----------"
    printf "\n%*s\n\n" $(((${#HEADER}+80)/2)) "$HEADER"
    echo "--> Global data folder: $GDATA_PATH"

    if [[ ! -d "$GDATA_PATH" ]]; then
      echo "No global data folder found for $client. Skipping."
      echo
      continue
    fi

    if [[ ${#INCLUDE_GLOBAL_FILES[@]} -eq 0 ]]; then
        echo "No global files listed in the configuration's include_global_files. Skipping."
        continue
    fi

    echo "Checking out specified global files from config..."
    for fname in "${INCLUDE_GLOBAL_FILES[@]}"; do
        if [[ "$fname" == oms* ]]; then
            echo "Ignoring file starting with 'oms': $fname"
            continue
        fi
        file_path="database/$client/data/global/$fname"
        echo "--> git -C \"$REPO_PATH\" checkout $SRC_BRANCH -- $file_path"
        git -C "$REPO_PATH" checkout "$SRC_BRANCH" -- "$file_path" 2>/dev/null || echo "Warning: Could not find '$fname' for client '$client' in branch '$SRC_BRANCH'."
    done
    echo
  done
}

handle_excluded_paths() {
  # Handle specific paths (existing logic)
  if [[ ${#EXCLUDE_PATHS[@]} -gt 0 ]]; then
    print_step "Handling Excluded Paths"
    echo "Discarding changes for excluded paths..."
    
    for exclude_path in "${EXCLUDE_PATHS[@]}"; do
      if [[ -f "$REPO_PATH/$exclude_path" ]]; then
        echo "--> git -C \"$REPO_PATH\" checkout $BRANCH -- $exclude_path"
        git -C "$REPO_PATH" checkout "$BRANCH" -- "$exclude_path" 2>/dev/null || echo "Warning: Could not restore '$exclude_path' from target branch"
      else
        echo "File not found: $exclude_path (skipping)"
      fi
    done
    echo
  fi
  
  # NEW: Handle file names across all clients
  if [[ ${#EXCLUDE_FILES[@]} -gt 0 ]]; then
    print_step "Handling Excluded Files Across All Clients"
    echo "Discarding changes for excluded files across all clients..."
    
    for client in "${CLIENTS[@]}"; do
      for exclude_file in "${EXCLUDE_FILES[@]}"; do
        # Search in client's inventory_smart schemas
        for schema_type in "${INCLUDE_INV_SCHEMAS[@]}"; do
          local file_path="database/$client/schemas/inventory_smart/$schema_type/$exclude_file"
          if [[ -f "$REPO_PATH/$file_path" ]]; then
            echo "--> git -C \"$REPO_PATH\" checkout $BRANCH -- $file_path"
            git -C "$REPO_PATH" checkout "$BRANCH" -- "$file_path" 2>/dev/null || echo "Warning: Could not restore '$file_path' from target branch"
          fi
        done
        
        # Search in client's global schemas
        for schema_type in "${INCLUDE_GLOBAL_SCHEMAS[@]}"; do
          local file_path="database/$client/schemas/global/$schema_type/$exclude_file"
          if [[ -f "$REPO_PATH/$file_path" ]]; then
            echo "--> git -C \"$REPO_PATH\" checkout $BRANCH -- $file_path"
            git -C "$REPO_PATH" checkout "$BRANCH" -- "$file_path" 2>/dev/null || echo "Warning: Could not restore '$file_path' from target branch"
          fi
        done
      done
    done
    
    # NEW: Handle file names in repository-level global schemas
    echo "Discarding changes for excluded files in repository-level global schemas..."
    for exclude_file in "${EXCLUDE_FILES[@]}"; do
      # Search in repository-level inventory_smart schemas
      for schema_type in "${INCLUDE_INV_SCHEMAS[@]}"; do
        local file_path="database/schemas/inventory_smart/$schema_type/$exclude_file"
        if [[ -f "$REPO_PATH/$file_path" ]]; then
          echo "--> git -C \"$REPO_PATH\" checkout $BRANCH -- $file_path"
          git -C "$REPO_PATH" checkout "$BRANCH" -- "$file_path" 2>/dev/null || echo "Warning: Could not restore '$file_path' from target branch"
        fi
      done
      
      # Search in repository-level global schemas
      for schema_type in "${INCLUDE_GLOBAL_SCHEMAS[@]}"; do
        local file_path="database/schemas/global/$schema_type/$exclude_file"
        if [[ -f "$REPO_PATH/$file_path" ]]; then
          echo "--> git -C \"$REPO_PATH\" checkout $BRANCH -- $file_path"
          git -C "$REPO_PATH" checkout "$BRANCH" -- "$file_path" 2>/dev/null || echo "Warning: Could not restore '$file_path' from target branch"
        fi
      done
    done
    echo
  fi
}

# --------- MAIN SCRIPT ---------
print_separator
print_step "Welcome to the Inventory Smart Release Automation Script!"
print_separator

cd "$REPO_PATH"

# Setup logging first
setup_logging

print_step "Select Target Deployment Environment"
prompt_env

print_step "Prompt for Global Schema Inclusion"
prompt_global_schema_inclusion

print_step "Select Clients for Release"
prompt_clients

print_step "Verifying Client Folders"
verify_client_folders

print_step "Handle DEV Source Branch (if applicable)"
handle_dev_src_branch

print_step "Prompt for Release Name"
prompt_release_name

print_step "Show Execution Summary"
show_execution_summary() {
  echo ""
  echo "=================================================================================="
  echo "📋 EXECUTION SUMMARY"
  echo "=================================================================================="
  echo ""
  echo "🎯 Target Environment: $ENV"
  echo "🌿 Source Branch: $SRC_BRANCH"
  echo "🌿 Target Branch: $BRANCH"
  echo "🏷️  Release Name: $RELEASE_NAME"
  echo "🌿 Release Branch: $RELEASE_BRANCH"
  echo ""
  echo "👥 Selected Clients (${#CLIENTS[@]}):"
  for client in "${CLIENTS[@]}"; do
    echo "   • $client"
  done
  echo ""
  echo "📁 Global Schema Inclusion: $INCLUDE_GLOBAL_SCHEMAS"
  echo "📁 Repository-Level Global Schemas: $INCLUDE_REPO_GLOBAL"
  echo ""
  echo "📊 Log Directory: $LOG_DIR"
  echo "📄 Log File: $LOG_FILE"
  echo ""
  echo "=================================================================================="
  echo ""
  
  # Ask for confirmation before proceeding
  blinking_prompt_red
  read -rp "Do you want to proceed with this release? (y/N): " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Release cancelled by user."
    exit 0
  fi
  echo ""
}

show_execution_summary

print_step "Stash Local Changes and Checkout Target Branch"
git_core_steps

print_step "Copying Global Schemas (if selected)"
copy_global_schemas

print_step "Copying Repository-Level Inventory Smart Data"
copy_repository_inventory_data

print_step "Copying Inventory Smart Folders for Each Client"
copy_client_folders

print_step "Handle Additional Paths (if any)"
if [ "$HANDLE_ADDITIONAL_PATHS" = true ]; then
  handle_additional_paths
else
  echo "Skipping additional path sync for all clients (no --additional flag provided)."
fi

print_step "Handle Global Data File Copy (if selected)"
prompt_global_changes

print_step "Handle Excluded Paths"
handle_excluded_paths

print_separator
echo "Release branch $RELEASE_BRANCH created and client/global changes applied."
echo "Please review changes, commit, and push as needed."
print_separator

# Display log file location prominently
log_section "RELEASE COMPLETED SUCCESSFULLY"
echo "📁 Log file location: $LOG_FILE"
echo "💡 You can access the complete log at: $LOG_FILE"
echo ""

blinking_prompt
read -rp "Do you want to commit the changes? (y/n): " commit_choice
commit_choice=$(echo "$commit_choice" | xargs | tr '[:upper:]' '[:lower:]')
if [[ "$commit_choice" == "y" || "$commit_choice" == "yes" ]]; then
  default_commit_msg="release for $ENV $RELEASE_NAME"
  blinking_prompt
  read -rp "Enter commit message (leave blank for default: '$default_commit_msg'): " commit_msg
  if [[ -z "$commit_msg" ]]; then
    commit_msg="$default_commit_msg"
    echo "No commit message entered. Using default: '$commit_msg'"
  fi
  git add .
  git commit -m "$commit_msg"
  echo "Committed changes with message: $commit_msg"
  git push
  echo "Changes have been pushed to the remote repository."
else
  git restore --staged .
  echo "Unstaged all changes. No commit was made."
  echo "Your changes are ready to be reviewed."
fi

# Final log file reminder
echo ""
log_section "SCRIPT COMPLETED"
echo "📁 Complete log saved to: $LOG_FILE"
echo "🔗 Access log: $LOG_FILE"
echo "📋 Review the log above for any warnings or errors"