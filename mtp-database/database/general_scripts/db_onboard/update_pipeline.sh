#!/usr/bin/env bash

# =============================
# Pipeline Configuration Updater
# =============================
# Helper script to update bitbucket-pipelines.yml with new client
# Usage: ./update_pipeline.sh <client_name> <template_client>
# =============================

set -e
set -u
set -o pipefail

# --------- ARGUMENTS ---------
if [[ $# -lt 1 ]] || [[ $# -gt 2 ]]; then
  echo "Usage: $0 <client_name> [repo_path]"
  echo "Example: $0 new_client"
  echo "Example: $0 new_client /path/to/repo"
  exit 1
fi

CLIENT_NAME="$1"

# --------- CONFIGURATION ---------
if [[ $# -eq 2 ]]; then
  # Repo path provided as argument
  REPO_PATH="$2"
else
  # Calculate repo path from script location (original behavior)
  SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
  REPO_PATH="$(cd "$SCRIPT_DIR/../../.." && pwd)"
fi

PIPELINE_FILE="$REPO_PATH/bitbucket-pipelines.yml"

# --------- UTILITY FUNCTIONS ---------
print_success() {
  echo -e "\033[1;32m✓ $1\033[0m"
}

print_error() {
  echo -e "\033[1;31m✗ $1\033[0m"
}

print_warning() {
  echo -e "\033[1;33m⚠ $1\033[0m"
}

# --------- VALIDATION ---------
validate_inputs() {
  # Check if pipeline file exists
  if [[ ! -f "$PIPELINE_FILE" ]]; then
    print_error "Pipeline file not found: $PIPELINE_FILE"
    exit 1
  fi
  
  # Check if client is already in the client list
  if grep -q "^  - $CLIENT_NAME$" "$PIPELINE_FILE"; then
    print_warning "Client '$CLIENT_NAME' already exists in pipeline file"
    return 0
  fi
}

# --------- CORE FUNCTIONS ---------
add_client_to_list() {
  echo "Adding '$CLIENT_NAME' to x-client-list..."
  
  # Create a backup
  cp "$PIPELINE_FILE" "$PIPELINE_FILE.bak"
  
  # Find the line number where x-client-list ends (before the empty line or next section)
  local insert_line
  insert_line=$(awk '
    /^x-client-list:/ { in_list = 1; next }
    in_list && /^[[:space:]]*$/ { print NR-1; exit }
    in_list && /^[^[:space:]-]/ { print NR-1; exit }
    in_list && /^#x-all-client-list:/ { print NR-1; exit }
  ' "$PIPELINE_FILE")
  
  if [[ -z "$insert_line" ]]; then
    print_error "Could not find where to insert client in x-client-list"
    return 1
  fi
  
  # Insert the client name in the list (ensure it's on a new line)
  {
    head -n "$insert_line" "$PIPELINE_FILE"
    printf "  - %s\n" "$CLIENT_NAME"
    tail -n +"$((insert_line + 1))" "$PIPELINE_FILE"
  } > "$PIPELINE_FILE.new"
  
  mv "$PIPELINE_FILE.new" "$PIPELINE_FILE"
  print_success "Added '$CLIENT_NAME' to x-client-list"
}

add_client_step_section() {
  echo "Adding deployment step for '$CLIENT_NAME' to all_clients_complete_deploy parallel section..."
  
  # Find the all_clients_complete_deploy parallel section
  local parallel_start_line
  parallel_start_line=$(awk '
    /all_clients_complete_deploy:/ { in_section = 1 }
    in_section && /- parallel:/ { print NR; exit }
  ' "$PIPELINE_FILE")
  
  if [[ -z "$parallel_start_line" ]]; then
    print_error "Could not find all_clients_complete_deploy parallel section"
    return 1
  fi
  
  # Find insertion point for alphabetical order
  local temp_file=$(mktemp)
  local insert_line=""
  
  # Find all existing steps and their boundaries, determine correct insertion point
  awk -v start="$parallel_start_line" -v target_client="$CLIENT_NAME" '
    BEGIN { 
      in_parallel = 0
      current_step_start = 0
      found_insertion = 0
    }
    
    NR > start { 
      in_parallel = 1 
    }
    
    # Detect start of each step (must be exactly "          - step:")  
    in_parallel && /^[[:space:]]{10}-[[:space:]]step:$/ {
      current_step_start = NR
      next
    }
    
    # Extract client name from step name line
    in_parallel && current_step_start > 0 && /^[[:space:]]*name:[[:space:]]*Build[[:space:]]\+[[:space:]]Deploy[[:space:]]for[[:space:]]/ {
      # Extract client name
      client_name = $0
      gsub(/^[[:space:]]*name:[[:space:]]*Build[[:space:]]\+[[:space:]]Deploy[[:space:]]for[[:space:]]/, "", client_name)
      gsub(/[[:space:]]*$/, "", client_name)
      
      # Check if we should insert before this client
      if (target_client < client_name && !found_insertion) {
        print current_step_start
        found_insertion = 1
        exit
      }
      current_step_start = 0
    }
    
    # Detect end of parallel section - lines that start with non-space, non-dash characters
    in_parallel && /^[a-zA-Z]/ && !found_insertion {
      print NR
      found_insertion = 1
      exit
    }
  ' "$PIPELINE_FILE" > "$temp_file"
  
  insert_line=$(cat "$temp_file")
  rm "$temp_file"
  
  # If no insertion point found, find end of file
  if [[ -z "$insert_line" ]]; then
    insert_line=$(wc -l < "$PIPELINE_FILE")
  fi
  
  # Create the step content with exact indentation
  local step_content="          - step:
              name: Build + Deploy for $CLIENT_NAME
              <<: *runner-template
              script:
                - CLIENT=$CLIENT_NAME ./run_script.sh"
  
  # Insert the step content at the appropriate location
  {
    head -n "$((insert_line - 1))" "$PIPELINE_FILE"
    echo "$step_content"
    echo ""
    tail -n +"$insert_line" "$PIPELINE_FILE"
  } > "$PIPELINE_FILE.new"
  
  mv "$PIPELINE_FILE.new" "$PIPELINE_FILE"
  
  print_success "Added deployment step for '$CLIENT_NAME' in alphabetical order"
}

cleanup_backup() {
  if [[ -f "$PIPELINE_FILE.bak" ]]; then
    rm "$PIPELINE_FILE.bak"
  fi
}

# --------- MAIN EXECUTION ---------
main() {
  echo "Updating pipeline configuration for client: $CLIENT_NAME"
  
  # Validate inputs
  validate_inputs
  
  # Add client to the client list
  add_client_to_list
  
  # Add client step section
  add_client_step_section
  
  # Cleanup
  cleanup_backup
  
  print_success "Pipeline configuration updated successfully for '$CLIENT_NAME'"
}

# Trap to cleanup on exit
trap cleanup_backup EXIT

# Execute main function
main 