#!/opt/homebrew/bin/bash

# =============================
# Database Client Onboarding Script
# =============================
# Author: MTP Team
# Date: $(date +%Y-%m-%d)
#
# This script automates the client onboarding process for the mtp-database repository.
# It performs git operations, file updates, and branch creation in a single command.
#
# Usage:
#   ./db_onboard.sh
# =============================

set -e
set -u
set -o pipefail

# ---- Ensure modern Bash ----
if ((BASH_VERSINFO[0] < 4)); then
  echo "\033[1;31mERROR: This script requires Bash version 4 or higher.\033[0m"
  echo "Please install a modern Bash (e.g., with Homebrew: brew install bash)"
  exit 1
fi

# --------- CONFIGURATION ---------
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
CONFIG_FILE="$SCRIPT_DIR/db_onboard_config.json"
REPO_PATH="$(cd "$SCRIPT_DIR/../../.." && pwd)"
DB_PATH="$REPO_PATH/database"
DATETIME=$(date +%Y-%m-%d_%H-%M)

# Create temp directory for scripts (will be cleaned up on exit)
TEMP_SCRIPT_DIR=$(mktemp -d)

# Validate config file exists
if [[ ! -f "$CONFIG_FILE" ]]; then
  echo "Error: Configuration file not found: $CONFIG_FILE"
  exit 1
fi

# Load excluded folders from config
mapfile -t EXCLUDED_FOLDERS < <(jq -r '.excluded_folders[]' "$CONFIG_FILE")

# --------- GLOBAL VARIABLES ---------
SELECTED_CLIENT=""
SELECTED_ENV=""
TARGET_BRANCH=""
SRC_BRANCH=""
ONBOARD_BRANCH=""

# --------- UTILITY FUNCTIONS ---------
blinking_prompt() {
  echo -ne "\033[5;32m●\033[0m "
}

blinking_prompt_red() {
  echo -ne "\033[5;31m●\033[0m "
}

print_separator() {
  echo -e "\n============================================================"
}

print_step() {
  print_separator
  echo -e "\033[1;36m$1\033[0m"
  print_separator
}

print_success() {
  echo -e "\033[1;32m✓ $1\033[0m"
}

print_error() {
  echo -e "\033[1;31m✗ $1\033[0m"
}

print_warning() {
  echo -e "\033[1;33m⚠ $1\033[0m"
}

# --------- CLEANUP FUNCTION ---------
cleanup_temp_scripts() {
  if [[ -d "$TEMP_SCRIPT_DIR" ]]; then
    rm -rf "$TEMP_SCRIPT_DIR"
    echo "Cleaned up temporary scripts"
  fi
}

# Set up cleanup trap
trap cleanup_temp_scripts EXIT

# --------- SCRIPT MANAGEMENT ---------
copy_scripts_to_temp() {
  print_step "Preparing Helper Scripts"
  
  # Copy all necessary scripts to temp directory
  echo "--> Copying scripts to temporary location: $TEMP_SCRIPT_DIR"
  
  cp "$SCRIPT_DIR/update_pipeline.sh" "$TEMP_SCRIPT_DIR/" || {
    print_error "Failed to copy update_pipeline.sh"
    exit 1
  }
  
  cp "$SCRIPT_DIR/merge_primary_keys.py" "$TEMP_SCRIPT_DIR/" || {
    print_error "Failed to copy merge_primary_keys.py"
    exit 1
  }
  
  cp "$CONFIG_FILE" "$TEMP_SCRIPT_DIR/" || {
    print_error "Failed to copy config file"
    exit 1
  }
  
  # Make scripts executable
  chmod +x "$TEMP_SCRIPT_DIR/update_pipeline.sh"
  chmod +x "$TEMP_SCRIPT_DIR/merge_primary_keys.py"
  
  print_success "Helper scripts copied to temp directory"
}

# --------- CORE FUNCTIONS ---------
get_client_folders_from_source() {
  local clients=()
  
  # If no source branch, get from current directory
  if [[ -z "$SRC_BRANCH" ]]; then
    print_warning "No source branch specified, using current directory"
    for folder in "$DB_PATH"/*; do
      if [[ -d "$folder" ]]; then
        local folder_name=$(basename "$folder")
        local is_excluded=false
        
        # Check if folder should be excluded
        for excluded in "${EXCLUDED_FOLDERS[@]}"; do
          if [[ "$folder_name" == "$excluded" ]]; then
            is_excluded=true
            break
          fi
        done
        
        if [[ "$is_excluded" == false ]]; then
          clients+=("$folder_name")
        fi
      fi
    done
  else
    # Get client list from source branch
    print_success "Getting client list from source branch: $SRC_BRANCH"
    
    # Use git ls-tree to list directories in the source branch
    local git_folders
    git_folders=$(git -C "$REPO_PATH" ls-tree -d --name-only "$SRC_BRANCH:database/" 2>/dev/null || true)
    
    if [[ -n "$git_folders" ]]; then
      while IFS= read -r folder_name; do
        if [[ -n "$folder_name" ]]; then
          local is_excluded=false
          
          # Check if folder should be excluded
          for excluded in "${EXCLUDED_FOLDERS[@]}"; do
            if [[ "$folder_name" == "$excluded" ]]; then
              is_excluded=true
              break
            fi
          done
          
          if [[ "$is_excluded" == false ]]; then
            clients+=("$folder_name")
          fi
        fi
      done <<< "$git_folders"
    fi
    
    # Fallback to current directory if no clients found in source branch
    if [[ ${#clients[@]} -eq 0 ]]; then
      print_warning "No clients found in source branch, using current directory"
      for folder in "$DB_PATH"/*; do
        if [[ -d "$folder" ]]; then
          local folder_name=$(basename "$folder")
          local is_excluded=false
          
          for excluded in "${EXCLUDED_FOLDERS[@]}"; do
            if [[ "$folder_name" == "$excluded" ]]; then
              is_excluded=true
              break
            fi
          done
          
          if [[ "$is_excluded" == false ]]; then
            clients+=("$folder_name")
          fi
        fi
      done
    fi
  fi
  
  # Sort clients alphabetically
  IFS=$'\n' clients=($(sort <<<"${clients[*]}")); unset IFS
  echo "${clients[@]}"
}

prompt_client_selection() {
  print_step "Select Client for Onboarding (from $SRC_BRANCH)"
  
  local clients=($(get_client_folders_from_source))
  
  if [[ ${#clients[@]} -eq 0 ]]; then
    print_error "No client folders found"
    exit 1
  fi
  
  echo "Available clients from source branch '$SRC_BRANCH':"
  for i in "${!clients[@]}"; do
    printf "\033[1;32m%2d\033[0m. %s\n" $((i+1)) "${clients[$i]}"
  done
  
  echo
  blinking_prompt
  read -rp "Enter the number for the client: " client_num
  
  if [[ "$client_num" =~ ^[0-9]+$ ]] && (( client_num >= 1 && client_num <= ${#clients[@]} )); then
    SELECTED_CLIENT="${clients[$((client_num-1))]}"
    print_success "Selected client: $SELECTED_CLIENT"
  else
    print_error "Invalid selection"
    exit 1
  fi
}

prompt_environment_selection() {
  print_step "Select Target Environment"
  
  echo "Select the target deployment environment:"
  
  # Read environments and priorities from config, sort by priority
  mapfile -t ENV_NAMES < <(jq -r '.environments | to_entries | sort_by(.value.priority) | .[].key' "$CONFIG_FILE")
  
  for i in "${!ENV_NAMES[@]}"; do
    printf "\033[1;32m%d\033[0m. %s\n" $((i+1)) "${ENV_NAMES[$i]}"
  done
  
  echo
  blinking_prompt
  read -rp "Enter the number for the environment: " env_num
  
  if [[ "$env_num" =~ ^[0-9]+$ ]] && (( env_num >= 1 && env_num <= ${#ENV_NAMES[@]} )); then
    SELECTED_ENV="${ENV_NAMES[$((env_num-1))]}"
    TARGET_BRANCH=$(jq -r --arg env "$SELECTED_ENV" '.environments[$env].branch' "$CONFIG_FILE")
    SRC_BRANCH=$(jq -r --arg env "$SELECTED_ENV" '.environments[$env].src_branch' "$CONFIG_FILE")
    
    print_success "Selected environment: $SELECTED_ENV"
    print_success "Target branch: $TARGET_BRANCH"
    print_success "Source branch: $SRC_BRANCH"
  else
    print_error "Invalid selection"
    exit 1
  fi
}

handle_dev_src_branch() {
  if [[ "$SELECTED_ENV" == "DEV" ]]; then
    blinking_prompt
    read -rp "DEV environment: Enter the source branch (default: develop/dev): " dev_src
    SRC_BRANCH=${dev_src:-develop/dev}
    print_success "Using source branch: $SRC_BRANCH"
  fi
  
  # Checkout and pull source branch to get latest client list
  if [[ -n "$SRC_BRANCH" ]]; then
    print_step "Preparing Source Branch for Client List"
    cd "$REPO_PATH"
    
    echo "--> Stashing any local changes"
    git stash || echo "No local changes to stash"
    
    echo "--> Checking out source branch: $SRC_BRANCH"
    if git checkout "$SRC_BRANCH" 2>/dev/null; then
      echo "--> Pulling latest changes from $SRC_BRANCH"
      git pull origin "$SRC_BRANCH" || {
        print_warning "Could not pull latest changes from $SRC_BRANCH"
      }
      print_success "Source branch $SRC_BRANCH is ready"
    else
      print_warning "Could not checkout $SRC_BRANCH, using current branch for client list"
    fi
  fi
}

perform_git_operations() {
  print_step "Performing Git Operations"
  
  cd "$REPO_PATH"
  
  # Stash local changes
  echo "--> Stashing local changes"
  git stash || echo "No local changes to stash"
  
  # Checkout and pull target branch
  echo "--> Checking out target branch: $TARGET_BRANCH"
  git checkout "$TARGET_BRANCH" || {
    print_error "Could not checkout $TARGET_BRANCH"
    exit 1
  }
  
  echo "--> Pulling latest changes from $TARGET_BRANCH"
  git pull origin "$TARGET_BRANCH" || {
    blinking_prompt_red
    read -rp "Pull failed. Continue anyway? (y/n): " continue_choice
    if [[ ! "$continue_choice" =~ ^[Yy]$ ]]; then
      exit 1
    fi
  }
  
  # Checkout client files from source branch
  if [[ -n "$SRC_BRANCH" ]]; then
    print_step "Checking out client files from source branch: $SRC_BRANCH"
    
    local client_path="database/$SELECTED_CLIENT"
    echo "--> git checkout $SRC_BRANCH -- $client_path"
    git checkout "$SRC_BRANCH" -- "$client_path" 2>/dev/null || {
      print_warning "Could not checkout some files for $SELECTED_CLIENT from $SRC_BRANCH"
    }
    
    print_success "Client files checked out from $SRC_BRANCH"
  fi
}

unstage_changes() {
  print_step "Unstaging Changes"
  
  cd "$REPO_PATH"
  echo "--> git restore --staged ."
  git restore --staged . || {
    print_warning "Could not unstage changes"
  }
  
  print_success "Changes unstaged"
}

create_onboard_branch() {
  print_step "Creating Onboard Branch"
  
  cd "$REPO_PATH"
  
  # Create branch name: env/client/client_name/onboarding
  local env_lower=$(echo "$SELECTED_ENV" | tr '[:upper:]' '[:lower:]')
  ONBOARD_BRANCH="${env_lower}/client/${SELECTED_CLIENT}/onboarding"
  
  # Delete branch if it exists
  if git show-ref --verify --quiet "refs/heads/$ONBOARD_BRANCH"; then
    echo "--> Deleting existing branch: $ONBOARD_BRANCH"
    git branch -D "$ONBOARD_BRANCH"
  fi
  
  echo "--> Creating branch: $ONBOARD_BRANCH"
  git checkout -b "$ONBOARD_BRANCH" || {
    print_error "Could not create onboard branch"
    exit 1
  }
  
  print_success "Created onboard branch: $ONBOARD_BRANCH"
}

update_pipeline_file() {
  print_step "Updating Pipeline Configuration"
  
  bash "$TEMP_SCRIPT_DIR/update_pipeline.sh" "$SELECTED_CLIENT" "$REPO_PATH" || {
    print_error "Failed to update pipeline file"
    exit 1
  }
  
  print_success "Pipeline file updated"
}

update_primary_key_mapping() {
  print_step "Updating Primary Key Mapping"
  
  python3 "$TEMP_SCRIPT_DIR/merge_primary_keys.py" "$SELECTED_CLIENT" "$SRC_BRANCH" "$REPO_PATH" || {
    print_error "Failed to update primary key mapping"
    exit 1
  }
  
  print_success "Primary key mapping updated"
}

show_summary() {
  print_separator
  echo -e "\033[1;32m🎉 CLIENT ONBOARDING COMPLETED SUCCESSFULLY! 🎉\033[0m"
  print_separator
  echo "Summary:"
  echo "  Client: $SELECTED_CLIENT"
  echo "  Environment: $SELECTED_ENV"
  echo "  Source Branch: $SRC_BRANCH"
  echo "  Target Branch: $TARGET_BRANCH"
  echo "  Onboard Branch: $ONBOARD_BRANCH"
  echo
  echo "Next steps:"
  echo "  1. Review the changes in your repository"
  echo "  2. Test the configuration"
  echo "  3. Commit and push the onboard branch when ready"
  print_separator
}

# --------- MAIN EXECUTION ---------
main() {
  print_step "🚀 Database Client Onboarding Script"
  echo "This script will help you onboard a new client to the MTP database system."
  
  # Step 0: Copy scripts to temp directory BEFORE any git operations
  copy_scripts_to_temp
  
  # Step 1: Environment Selection (moved first)
  prompt_environment_selection
  
  # Step 2: Handle DEV environment special case and prepare source branch
  handle_dev_src_branch
  
  # Step 3: Client Selection (now from source branch)
  prompt_client_selection
  
  # Step 4: Git Operations
  perform_git_operations
  
  # Step 5: Create Onboard Branch
  create_onboard_branch
  
  # Step 6: Update Pipeline File (using temp scripts)
  update_pipeline_file
  
  # Step 7: Update Primary Key Mapping (using temp scripts)
  update_primary_key_mapping
  
  # Step 8: Unstage Changes (so user can review)
  unstage_changes
  
  # Step 9: Show Summary
  show_summary
}

# Execute main function
main "$@" 