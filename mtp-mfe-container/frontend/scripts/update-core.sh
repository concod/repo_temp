#!/bin/bash

set -e

VALID_ENVS=("dev" "test" "uat") 
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
CORE_DIR="frontend/src/core"

# --- Validate input ---
if [ -z "$1" ]; then
  echo "Usage: ./scripts/update-core.sh <env>"
  echo "Valid environments: ${VALID_ENVS[*]}"
  exit 1
fi

ENV="$1"

if [[ ! " ${VALID_ENVS[*]} " =~ " ${ENV} " ]]; then
  echo "Error: Invalid environment '${ENV}'"
  echo "Valid environments: ${VALID_ENVS[*]}"
  exit 1
fi

BRANCH="develop/${ENV}"

# --- Safety: never allow committing to a develop branch ---
assert_not_on_develop() {
  local current_branch
  current_branch="$(git rev-parse --abbrev-ref HEAD)"
  if [[ "$current_branch" == develop* ]]; then
    echo "SAFETY ERROR: Refusing to commit on branch '${current_branch}'."
    echo "This script must never commit directly to a develop branch."
    exit 1
  fi
}

# --- Helper: safe checkout + pull ---
safe_checkout_pull() {
  local branch="$1"
  local label="$2"

  echo "==> [${label}] Checking out '${branch}'..."
  if ! git checkout "$branch" 2>&1; then
    echo "Error: Failed to checkout '${branch}' in ${label}."
    echo "You may have uncommitted changes that conflict, or the branch doesn't exist."
    echo "Stash or commit your changes and re-run."
    exit 1
  fi

  echo "==> [${label}] Pulling latest from origin/${branch}..."
  if ! git pull origin "$branch" 2>&1; then
    echo "Error: Failed to pull '${branch}' in ${label}."
    echo "There may be merge conflicts. Resolve them manually, then re-run."
    exit 1
  fi
}

cd "$REPO_ROOT"

# --- Update core submodule ---
cd "${REPO_ROOT}/${CORE_DIR}"
safe_checkout_pull "$BRANCH" "Core submodule"
COMMIT_ID=$(git rev-parse HEAD)
SHORT_COMMIT="${COMMIT_ID:0:6}"
echo "==> Core latest commit: ${COMMIT_ID}"

# --- Update container repo ---
cd "$REPO_ROOT"
safe_checkout_pull "$BRANCH" "Container repo"

# --- Check if submodule pointer actually changed ---
git add "$CORE_DIR"
if git diff --cached --quiet; then
  echo "==> Core submodule pointer is already up to date. Nothing to commit."
  exit 0
fi

# --- Create a new branch (never commit on develop) ---
NEW_BRANCH="update/commitId-${SHORT_COMMIT}"

if git rev-parse --verify "$NEW_BRANCH" >/dev/null 2>&1; then
  echo "Error: Branch '${NEW_BRANCH}' already exists locally. Delete it first or use a different name."
  git reset HEAD "$CORE_DIR" >/dev/null 2>&1
  exit 1
fi

echo "==> Creating branch '${NEW_BRANCH}'..."
git checkout -b "$NEW_BRANCH"

# --- Final safety check before committing ---
assert_not_on_develop

git commit -m "Update: updates ${ENV} commit ID"

echo "==> Pushing branch '${NEW_BRANCH}'..."
if ! git push origin "$NEW_BRANCH"; then
  echo "Error: Failed to push '${NEW_BRANCH}'. The branch may already exist on remote."
  exit 1
fi

echo "==> Done! Branch '${NEW_BRANCH}' pushed with core commit ${SHORT_COMMIT}."
