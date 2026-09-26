# Raise PRs with Bitbucket API Tokens

This guide explains how to create Bitbucket pull requests automatically from the Inventory Smart release script using API tokens only. It works whether the release runs in normal mode or in debug mode (worktree). In debug mode the script uses a separate working directory, but PR creation uses only the pushed branch names, so it is unaffected by where the files live on disk.

## Overview
- You run `inventory_smart_release_v2.sh`, which creates and pushes a release branch like `<env>/release_YYYY-MM-DD_HH-MM...`.
- After push, the script prompts to create a PR. If you say yes (or pass `--yes`), it calls `bitbucket_create_pr.sh` with the source branch, destination branch, title, and description.
- Authentication uses a Bitbucket API token via `Authorization: Bearer`.

## Requirements
- macOS, zsh or bash
- `git`, `jq`, `curl`
- Access to Bitbucket Cloud and permission to create PRs in the repository

## 1) Create a Bitbucket API Token
1. Go to Bitbucket Cloud (bitbucket.org) while logged in with your account.
2. Open: Profile avatar → Personal settings → API tokens.
3. Click “Create token”.
4. Give the token a name (e.g., `inventory-smart-release-pr`).
5. Scopes required:
   - `repository:read` (to resolve branches)
   - `pullrequest:write` (to create PRs)
6. Create and copy the token. You will not be able to see it again.

Note: Some organizations use Workspace Access Tokens instead. Those also work—store and export them the same way as an API token.

## 2) Store the token securely on macOS Keychain (recommended)
Save it one time:
```bash path=null start=null
security add-generic-password -a "$USER" -s bitbucket_api_token -w {{YOUR_API_TOKEN}}
```

When running the release script, export it as an environment variable (without printing it):
```bash path=null start=null
export BITBUCKET_TOKEN=$(security find-generic-password -a "$USER" -s bitbucket_api_token -w)
```

Alternative: Store token in a file with strict permissions and point the script at it:
```bash path=null start=null
# e.g., ~/.secrets/bitbucket_token (chmod 600)
export BITBUCKET_TOKEN_FILE="$HOME/.secrets/bitbucket_token"
```

## 3) Optional: Configure reviewers
If you want default reviewers added automatically, set a comma-separated list of Bitbucket reviewer UUIDs:
```bash path=null start=null
export BITBUCKET_REVIEWER_UUIDS="{uuid1},{uuid2}"
```
(You can find a user’s UUID in Bitbucket’s UI or API; it looks like `{f48da9bb-669a-4865-b286-d16d0ff77da2}`.)

## 4) Run the release script

**Note**: The script requires Bash 4+. On macOS with zsh, use the full bash path:

Interactive:
```bash path=null start=null
/usr/local/bin/bash ./inventory_smart_release_v2.sh
```
- After it pushes the release branch, you'll be asked:
  - "Create PR automatically now? (y/n)"
  - Then for PR title and description (defaults are provided). 

Non-interactive (auto-create PR):
```bash path=null start=null
/usr/local/bin/bash ./inventory_smart_release_v2.sh --yes
```

Debug mode (uses separate worktree):
```bash path=null start=null
/usr/local/bin/bash ./inventory_smart_release_v2.sh --debug
```

## 5) Optional: Get a user’s UUID (for reviewers)
Reviewers can be specified by UUID. To discover UUIDs in your workspace:

List all members of a workspace (paginated by 100):
```bash path=null start=null
# Requires: BITBUCKET_TOKEN and BITBUCKET_WORKSPACE
curl -sS -H "Authorization: Bearer $BITBUCKET_TOKEN" \
  "https://api.bitbucket.org/2.0/workspaces/$BITBUCKET_WORKSPACE/members?pagelen=100" | \
  jq -r '.values[] | [ .user.display_name, .user.nickname, .user.uuid ] | @tsv'
```

Search by partial name/nickname locally with jq (replace mithun):
```bash path=null start=null
curl -sS -H "Authorization: Bearer $BITBUCKET_TOKEN" \
  "https://api.bitbucket.org/2.0/workspaces/$BITBUCKET_WORKSPACE/members?pagelen=100" | \
  jq -r --arg q "mithun" '.values[] | select((.user.display_name|ascii_downcase|contains($q)) or (.user.nickname|ascii_downcase|contains($q))) | .user.display_name + " (" + .user.nickname + ")\t" + .user.uuid'
```

Then set reviewers (optional):
```bash path=null start=null
export BITBUCKET_REVIEWER_UUIDS="{uuid1},{uuid2}"
```

If you prefer not to add reviewers, leave `BITBUCKET_REVIEWER_UUIDS` unset.

## 6) How the PR gets created
- The release script calls:
  - `./bitbucket_create_pr.sh --workspace insideinsight --repo mtp-database \
     --source <release-branch> --dest <target-branch> \
     --title "..." --description "..."`  
- `bitbucket_create_pr.sh` uses `BITBUCKET_TOKEN` (or `BITBUCKET_TOKEN_FILE`) to authenticate and posts to:
  - `https://api.bitbucket.org/2.0/repositories/<workspace>/<repo>/pullrequests`

This works the same in debug mode: the branch has already been pushed to origin; the PR call only references branch names, not any local path.

## 7) Troubleshooting
- “ERROR: No authentication available.” → Ensure `BITBUCKET_TOKEN` is exported (or `BITBUCKET_TOKEN_FILE` points to a valid file).
- HTTP 401/403 → Token missing required scopes or insufficient repository permissions.
- HTTP 404 → Check workspace/repo names and that the source branch was pushed.
- Reviewer errors → Verify UUID formatting and access.

## 8) Security tips
- Never echo your token to the terminal or store it in shell history.
- Prefer macOS Keychain or a secrets manager.
- Avoid committing tokens to the repo.

## Reference
- Script: `bitbucket_create_pr.sh`
- Called by: `inventory_smart_release_v2.sh` after a successful push
- Env vars used:
  - `BITBUCKET_TOKEN` or `BITBUCKET_TOKEN_FILE` (required)
  - `BITBUCKET_REVIEWER_UUIDS` (optional)
  - `BITBUCKET_WORKSPACE` (default: insideinsight)
  - `BITBUCKET_REPO` (default: mtp-database)
