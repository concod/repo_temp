#!/bin/bash
#
# Updates the core submodule pointer for a given environment branch,
# creates a new branch, pushes it, and prints the PR creation link.
#
# Usage: bash scripts/update-core-and-raise-pr.sh <branch>
#   branch: develop/dev | develop/test | develop/uat
#
# In Bitbucket Pipelines, pass $BITBUCKET_BRANCH automatically.
#
# Required pipeline variables (set as secured in inventorysmart repo pipeline settings):
#   BB_TOKEN    — Repository Access Token from the core repo (Repositories → Read).
#   BB_PR_TOKEN — Repository Access Token from the inventorysmart repo (Pull requests → Write).

set -eo pipefail

VALID_BRANCHES=("develop/dev" "develop/test" "develop/uat")
WORKSPACE="insideinsight"
REPO_SLUG="mtp-mfe-inventorysmart"
CORE_DIR="frontend/src/core"

# --- Validate input ---
if [ -z "$1" ]; then
  echo "Usage: bash scripts/update-core-and-raise-pr.sh <branch>"
  echo "Valid branches: ${VALID_BRANCHES[*]}"
  exit 1
fi

BRANCH="$1"

if [[ ! " ${VALID_BRANCHES[*]} " =~ " ${BRANCH} " ]]; then
  echo "Error: Invalid branch '${BRANCH}'"
  echo "Valid branches: ${VALID_BRANCHES[*]}"
  echo "Please run this pipeline on one of: develop/dev, develop/test, develop/uat"
  exit 1
fi

# Extract env name from branch (e.g. "develop/dev" -> "dev")
ENV="${BRANCH#develop/}"

echo "============================================"
echo "  Core Submodule Update — ${ENV}"
echo "============================================"

# --- Configure git for pipeline ---
git config --global user.email "pipeline@inventorysmart.com"
git config --global user.name "Bitbucket Pipeline"

# --- Ensure we're on the correct container repo branch ---
echo "==> Checking out '${BRANCH}'..."
git fetch origin "${BRANCH}"
git checkout "${BRANCH}"
git pull origin "${BRANCH}"

# --- Record the current submodule commit (before update) ---
OLD_COMMIT=$(git ls-tree HEAD "${CORE_DIR}" | awk '{print $3}')
echo "==> Current core submodule pointer: ${OLD_COMMIT:-'(not set)'}"

# --- Validate tokens are set ---
if [ -z "${BB_TOKEN}" ]; then
  echo "Error: BB_TOKEN is not set."
  echo "Setup: Create a Repository Access Token in the core repo (Repositories → Read),"
  echo "then add it as a secured pipeline variable named BB_TOKEN in inventorysmart repo."
  exit 1
fi
if [ -z "${BB_PR_TOKEN}" ]; then
  echo "Error: BB_PR_TOKEN is not set."
  echo "Setup: Create a Repository Access Token in the inventorysmart repo (Pull requests → Write),"
  echo "then add it as a secured pipeline variable named BB_PR_TOKEN in inventorysmart repo."
  exit 1
fi

# --- Fetch latest core commit via Bitbucket API (no clone needed) ---
echo "==> Fetching latest core commit from '${BRANCH}' via API..."
API_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${BB_TOKEN}" \
  -H "Accept: application/json" \
  "https://api.bitbucket.org/2.0/repositories/${WORKSPACE}/core/refs/branches/${BRANCH}")
HTTP_CODE=$(echo "${API_RESPONSE}" | tail -1)
API_BODY=$(echo "${API_RESPONSE}" | head -n -1)
if [ "${HTTP_CODE}" -lt 200 ] || [ "${HTTP_CODE}" -ge 300 ]; then
  echo "Error: Failed to fetch branch '${BRANCH}' from core repo (HTTP ${HTTP_CODE})."
  echo "${API_BODY}"
  echo "Ensure the branch '${BRANCH}' exists in the core repo and BB_TOKEN has read access."
  exit 1
fi
COMMIT_ID=$(echo "${API_BODY}" | python3 -c "import sys,json; print(json.load(sys.stdin)['target']['hash'])")
SHORT_COMMIT="${COMMIT_ID:0:7}"
echo "==> Core latest commit: ${COMMIT_ID} (short: ${SHORT_COMMIT})"

# --- Check if submodule pointer actually changed ---
if [ "${OLD_COMMIT}" = "${COMMIT_ID}" ]; then
  echo "==> Core submodule pointer is already up to date. Nothing to do."
  exit 0
fi

echo "==> Submodule pointer changed: ${OLD_COMMIT:-'(none)'} → ${COMMIT_ID}"

# --- Update the submodule pointer using git-update-index ---
# This updates the tree entry for the submodule to the new commit without needing to clone into the submodule dir
git update-index --cacheinfo 160000,"${COMMIT_ID}","${CORE_DIR}"

# --- Create update branch ---
NEW_BRANCH="update/${ENV}-commitId-${SHORT_COMMIT}"
echo "==> Creating branch '${NEW_BRANCH}'..."

# Delete remote branch if it already exists (e.g. from a previous failed run)
if git ls-remote --exit-code origin "refs/heads/${NEW_BRANCH}" > /dev/null 2>&1; then
  echo "==> Branch '${NEW_BRANCH}' already exists on remote. Deleting it first..."
  git push origin --delete "${NEW_BRANCH}" || true
fi

# Delete local branch if it exists
git branch -D "${NEW_BRANCH}" 2>/dev/null || true

git checkout -b "${NEW_BRANCH}"

# --- Commit ---
if git diff --cached --quiet; then
  echo "Error: No changes staged after update-index. This should not happen."
  exit 1
fi
git commit -m "Update: updates ${ENV} core commit ID to ${SHORT_COMMIT}"

# --- Push ---
echo "==> Pushing branch '${NEW_BRANCH}'..."
git push origin "${NEW_BRANCH}"

# --- Auto-create PR via Bitbucket API ---
echo "==> Creating Pull Request..."
set +e  # Temporarily disable exit-on-error so PR failure doesn't kill the script
PR_RESPONSE=$(curl -s -w "\n%{http_code}" \
  -H "Authorization: Bearer ${BB_PR_TOKEN}" \
  -H "Accept: application/json" \
  -H "Content-Type: application/json" \
  -X POST \
  "https://api.bitbucket.org/2.0/repositories/${WORKSPACE}/${REPO_SLUG}/pullrequests" \
  -d "{
    \"title\": \"Update: ${ENV} core commit ID to ${SHORT_COMMIT}\",
    \"source\": { \"branch\": { \"name\": \"${NEW_BRANCH}\" } },
    \"destination\": { \"branch\": { \"name\": \"${BRANCH}\" } },
    \"description\": \"Automated update of core submodule pointer.\\n\\nCore commit: ${COMMIT_ID}\\nPrevious: ${OLD_COMMIT:-N/A}\",
    \"close_source_branch\": true,
    \"reviewers\": [
      { \"uuid\": \"{7b930163-0815-4aa3-9c7e-01bde9e80b9c}\" },
      { \"uuid\": \"{440875cc-715a-4211-8de7-699ac41b2385}\" },
      { \"uuid\": \"{cb06bba9-324a-4ca7-935f-ba45cdb0f7f7}\" },
      { \"uuid\": \"{b0406b51-e79a-4415-b1f8-5d0d97059d46}\" },
      { \"uuid\": \"{2ac6583a-4804-4f43-b48d-7384c1d7ea6c}\" },
      { \"uuid\": \"{93913295-803a-4654-a7b5-25a0444825f6}\" },
      { \"uuid\": \"{c2bbad20-2906-4a3d-8458-a2a4cf643ae4}\" },
      { \"uuid\": \"{8ff33d9e-eb6f-41f6-8401-02ec7e7e80b6}\" },
      { \"uuid\": \"{53a40a03-aefa-40ce-ad4e-b716f86fa727}\" },
      { \"uuid\": \"{7a22727e-25fb-4697-bcc7-0e06a78d7b5e}\" }
    ]
  }")
CURL_EXIT=$?
set -e  # Re-enable exit-on-error

if [ ${CURL_EXIT} -ne 0 ]; then
  PR_HTTP_CODE=0
  PR_BODY="curl failed with exit code ${CURL_EXIT}"
else
  PR_HTTP_CODE=$(echo "${PR_RESPONSE}" | tail -1)
  PR_BODY=$(echo "${PR_RESPONSE}" | head -n -1)
fi

if [ "${PR_HTTP_CODE}" -ge 200 ] && [ "${PR_HTTP_CODE}" -lt 300 ]; then
  PR_LINK=$(echo "${PR_BODY}" | python3 -c "import sys,json; print(json.load(sys.stdin)['links']['html']['href'])")
  echo ""
  echo "============================================"
  echo "  PR created successfully!"
  echo "============================================"
  echo "  Source:      ${NEW_BRANCH}"
  echo "  Destination: ${BRANCH}"
  echo "  Core commit: ${COMMIT_ID}"
  echo ""
  echo "  PR link:"
  echo "  ${PR_LINK}"
  echo "============================================"
else
  echo "Warning: Failed to create PR automatically (HTTP ${PR_HTTP_CODE})."
  echo "${PR_BODY}"
  MANUAL_PR_URL="https://bitbucket.org/${WORKSPACE}/${REPO_SLUG}/pull-requests/new?source=${NEW_BRANCH}&dest=${BRANCH}"
  echo ""
  echo "============================================"
  echo "  Branch pushed successfully!"
  echo "============================================"
  echo "  Source:      ${NEW_BRANCH}"
  echo "  Destination: ${BRANCH}"
  echo "  Core commit: ${COMMIT_ID}"
  echo ""
  echo "  Create PR manually here:"
  echo "  ${MANUAL_PR_URL}"
  echo "============================================"
fi
