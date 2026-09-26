# DB Merge Automation

Automated release branch creation, synchronisation, and Bitbucket PR creation
for the `mtp-database` repository.

---

## Quick Start

```bash
cd /path/to/mtp-database

# Interactive mode (prompts for environment, clients, etc.)
python -m scripts.inventory_smart.db_merge_automation

# Non-interactive — accept all defaults
python -m scripts.inventory_smart.db_merge_automation --yes

# Debug mode — uses a temporary git worktree instead of switching branches
python -m scripts.inventory_smart.db_merge_automation --debug

# Custom release name suffix
python -m scripts.inventory_smart.db_merge_automation --name hotfix_abc
```

### CLI Options

| Flag | Description |
|------|-------------|
| `--debug` | Create a separate git worktree at `/tmp/mtp_release_*` instead of switching branches in the current repo. |
| `--name <suffix>` | Append a custom suffix to the release branch name (e.g. `release_2026-04-13_17-00hotfix_abc`). |
| `--yes` | Skip all interactive prompts and use default/auto selections. |

---

## What It Does

1. **Environment selection** — choose the target deployment environment
   (PROD, UAT, TEST, DEV) which determines the source and target branches.
2. **Client selection** — pick one, many, or all configured clients.
3. **Branch preparation** — fetches the latest remote state, creates a release
   branch off the target branch (or a temporary worktree in debug mode).
4. **Data sync** — restores repository-level and per-client
   `data/inventory_smart`, `data/ada_visual`, and `data/global` directories
   from the source branch, **excluding all OMS-related files**.
5. **Schema sync** (optional) — restores `schemas/inventory_smart` and
   `schemas/global` at the repository level.
6. **Per-client schema sync** — restores each selected client's schema
   directories from the source branch.
7. **Environment-specific data** — syncs `test_specific` and `dev_specific`
   data folders for each client.
8. **Client-level global data** (optional) — syncs specific global data
   files (e.g. `acl_master.csv`, `roles_master.csv`) listed in the config.
9. **Exclusions** — reverts configured paths and files back to the target
   branch state (or deletes them if they don't exist in the target).
10. **Commit & push** (optional) — stages, commits, and pushes the release
    branch to `origin`.
11. **Pull Request creation** (optional) — creates a Bitbucket PR with
    auto-generated title, description, and team-lead reviewers.

---

## Module Structure

```
scripts/inventory_smart/db_merge_automation/
├── __init__.py          # Package marker
├── __main__.py          # Entry point for `python -m scripts.inventory_smart.db_merge_automation`
├── release.py           # Main orchestrator — ties all modules together
├── constants.py         # Bitbucket defaults and team lead UUIDs
├── logging_utils.py     # Console + file logging, progress indicators
├── git_helpers.py       # Git operations (branch, restore, worktree, OMS sweeps)
├── prompts.py           # Interactive user prompts
├── bitbucket.py         # Bitbucket auto-detect, PR description, PR creation
├── release_config.json  # Client, environment, and exclusion configuration
└── README.md            # This file
```

### Module Responsibilities

- **`release.py`** — The main entry point. Parses CLI args, loads config,
  runs the full workflow (prompts → branch setup → sync → exclusions →
  commit/push → PR).

- **`constants.py`** — Stores default Bitbucket credentials, workspace/repo
  slugs, and team lead reviewer UUIDs. Provides `load_bitbucket_constants()`
  to merge environment variable overrides with defaults.

- **`logging_utils.py`** — `ReleaseLogger` class that writes to both the
  console and a timestamped log file under `/tmp/mtp_database_logs_YYYY-MM-DD/`.
  Includes `section()`, `subsection()`, `info()`, `filelog()`, and
  `run_with_progress()` (animated dots while a shell command runs).

- **`git_helpers.py`** — All git subprocess operations:
  - `ensure_branch_present()` — fetch a ref from origin.
  - `exists_in_branch()` / `is_tracked()` — object existence checks.
  - `restore_to_branch_or_delete()` — restore files to a branch state or
    remove them.
  - `revert_oms_files()` — safety sweep to revert any OMS files that
    slipped through.
  - `restore_from_source()` — restore a path from the source branch,
    excluding OMS files via git pathspec.
  - `create_worktree()` / `checkout_new_branch()` — branch/worktree setup.
  - `git_add_all()`, `git_commit()`, `git_push()`, `git_reset_head()`.

- **`prompts.py`** — Interactive user input functions:
  - `prompt_env()` — environment selection.
  - `prompt_clients()` — client selection (individual, comma-separated, or all).
  - `prompt_repo_global_schema()` — include repo-level schemas?
  - `prompt_release_name()` — build the release branch name.
  - `prompt_global_client_data()` — include client-level global data?
  - `prompt_commit_push()` — commit and push?
  - `prompt_create_pr()` / `prompt_pr_title()` / `prompt_pr_description()`.

- **`bitbucket.py`** — Bitbucket integration:
  - `auto_detect_bitbucket()` — parse workspace/repo from git remote URL.
  - `get_default_reviewer_uuids()` — resolve reviewer UUIDs from env vars,
    constants, or the Bitbucket API.
  - `format_human_date()` — human-readable date formatting.
  - `build_pr_description()` — compose the full Markdown PR body.
  - `create_pr()` — creates PRs via the Bitbucket REST API (native Python).

---

## Configuration

The script reads its configuration from:

```
scripts/inventory_smart/db_merge_automation/release_config.json
```

### Key config sections

| Key | Description |
|-----|-------------|
| `clients` | List of client objects with `name`, `data_path`, `schema_path`. |
| `environments` | Map of environment names → `{branch, src_branch, priority}`. |
| `include_global_files` | Global data CSV filenames to sync at client level. |
| `include_inventory_smart_schemas` | Schema subdirectories to process (e.g. `views`, `tables`, `functions`). |
| `include_global_schemas` | Same as above but for the `global` schema. |
| `exclude_paths` | Specific repo-relative paths to always exclude from the release. |
| `exclude_files` | Filenames to exclude across all clients and schema types. |
| `oms_file_patterns` | Glob patterns for OMS files (excluded automatically). |
| `reviewers` | List of `{name, uuid}` objects — PR reviewers (current user auto-excluded). |

### Adding a new reviewer

To find a user's UUID, pick any existing PR that has them as a reviewer and run:

```bash
curl -s -u "$BITBUCKET_USERNAME:$BITBUCKET_TOKEN" \
  "https://api.bitbucket.org/2.0/repositories/insideinsight/mtp-database/pullrequests/<PR_NUMBER>" \
  | python3 -c "
import sys, json
data = json.load(sys.stdin)
for r in data.get('reviewers', []):
    print(r.get('display_name',''), '->', r.get('uuid',''))
"
```

Then add the entry to the `reviewers` array in `release_config.json`:

```json
{"name": "New Person", "uuid": "{uuid-from-above}"}
```

---

## Environment Variables

| Variable | Purpose | Required |
|----------|---------|----------|
| `BITBUCKET_USERNAME` | Your Bitbucket email (e.g. `arjun.pp@impactanalytics.co`). | **Yes** |
| `BITBUCKET_TOKEN` | Bitbucket API token (with scopes) for authentication. | **Yes** (for PR creation) |
| `BITBUCKET_WORKSPACE` | Override the auto-detected Bitbucket workspace. | No |
| `BITBUCKET_REPO` | Override the auto-detected Bitbucket repository. | No |
| `BITBUCKET_REVIEWER_UUIDS` | Override the reviewer UUIDs for PR creation. | No |

### How to create a Bitbucket API Token (`BITBUCKET_TOKEN`)

> **Note:** As of Sept 2025, Bitbucket App Passwords are deprecated.
> Use **API tokens with scopes** instead.

1. Go to [https://id.atlassian.com/manage-profile/security/api-tokens](https://id.atlassian.com/manage-profile/security/api-tokens).
2. Click **Create and manage API tokens** → **Create API token with scopes**.
3. Give it a name (e.g. `release-automation`) and set an expiry date, then click **Next**.
4. Select **Bitbucket** as the app and click **Next**.
5. Select these **scopes**:
   - **Repositories**: Read, Write
   - **Pull requests**: Read, Write
6. Click **Next**, review, then **Create token**.
7. **Copy the generated token** — it is shown only once.
8. Set it in your shell profile:

```bash
export BITBUCKET_USERNAME="your.email@impactanalytics.co"
export BITBUCKET_TOKEN="ATBBxxxxxxxxxxxxxxxxxxxx"
```

> **Tip:** Add these to your `~/.zshrc` or `~/.bashrc` so they persist across sessions.

---

## Logging

All output is written to both the console and a log file at:

```
<cwd>/logs/mtp_database_logs_YYYY-MM-DD/release_v2_YYYY-MM-DD_HH-MM.log
```

The log file contains additional detail not shown on the console (e.g.
per-file restore/delete actions, full staged diffs per client).

---

## Dependencies

- **Python 3.12+** (uses `str | None` union syntax)
- **git** (must be on PATH)
- No third-party Python packages required (stdlib only)

The PR creation step uses the Bitbucket REST API directly via Python's
``urllib`` — no external shell scripts are required.
