# Inventory Smart Release Script

A simple script to automate database releases for the inventory_smart team.

## Quick Start

```bash
# Navigate to the script directory
cd database/general_scripts/inventory_smart_scripts

# Run the script
./inventory_smart_release_v2.sh --debug
```

## Features

The script includes enhanced features and safer operation:
- **Worktree support**: Operates in temporary git worktree (with `--debug` flag)
- **Improved logging**: Rich, per-client file listings in a single log file
- **Quieter console**: Less verbose output, details in log file
- **Better OMS handling**: Robust handling of OMS/excluded files across branches
- **Environment-specific data**: Automatic syncing of prod_specific, uat_specific, test_specific, dev_specific folders
- **Pull Request automation**: Automatic PR creation via Bitbucket API

## What It Does

1. **Creates a release branch** with timestamp
2. **Copies client data** from source branch to target branch
3. **Handles global files** (optional)
4. **Excludes unwanted files** (OMS files, excluded paths)
5. **Syncs environment-specific data**
6. **Commits changes** (optional)
7. **Creates pull request** (optional)

## Prerequisites

- **Bash 4+**: `bash --version`
- **jq**: `brew install jq` (macOS)
- **Git access** to the repository

## Usage

### Basic Usage
```bash
./inventory_smart_release_v2.sh
```

#### With Debug Mode (Separate Worktree)
```bash
./inventory_smart_release_v2.sh --debug
```

#### With Custom Name
```bash
./inventory_smart_release_v2.sh --name "hotfix_123"
# Or
./inventory_smart_release_v2.sh --name=hotfix_123
```

#### Non-Interactive Mode
```bash
./inventory_smart_release_v2.sh --yes
```

#### Combined Options
```bash
./inventory_smart_release_v2.sh --debug --name "hotfix_123" --yes
```

## Command-Line Options

### `--debug`
**Purpose**: Creates a separate git worktree for the release operation instead of working in the current repository.

**When to use**:
- When you want to keep your current working directory unchanged
- When you want to test the release process without affecting your current branch
- When you need to inspect the release branch in isolation

**Behavior**:
- Creates a temporary worktree at `/tmp/mtp_release_{DATETIME}`
- All operations happen in the worktree
- Your current repository remains on the original branch
- Worktree persists after script completion for review

**Example**:
```bash
./inventory_smart_release_v2.sh --debug
```

### `--name` or `--name=`
**Purpose**: Append a custom suffix to the release branch name.

**Format**:
- `--name "suffix"` or `--name=suffix`
- Suffix is appended to `release_{DATETIME}`
- Must be a valid git branch name (alphanumeric, dots, dashes, slashes)

**Example**:
```bash
./inventory_smart_release_v2.sh --name "hotfix_inventory_bug"
# Creates: prod/release_2025-01-15_14-30hotfix_inventory_bug
```

### `--yes`
**Purpose**: Non-interactive mode with automatic confirmations.

**Behavior**:
- Auto-selects first environment (PROD)
- Auto-selects all clients
- Auto-includes repository-level global schemas
- Auto-includes client-level global data
- Skips commit and PR creation prompts

**Example**:
```bash
./inventory_smart_release_v2.sh --yes
```

## Step-by-Step Process

The script will guide you through these steps:

1. **Select Environment** (PROD, UAT, TEST, DEV)
2. **Choose Clients** (select specific clients or "all")
3. **Choose Repository-level Global Schema Changes** (optional - include global schemas from `database/schemas/`)
4. **Enter Release Name** (optional - adds to timestamp)
5. **Git Operations** (fetch branches, create release branch or worktree)
6. **Sync Repository-level Data** (inventory_smart, ada_visual, global data)
7. **Copy Repository-level Global Schemas** (if selected - from source branch)
8. **Copy Client Data** (per-client data and schemas from source branch)
9. **Sync Environment-specific Data** (prod_specific, uat_specific, etc.)
10. **Handle Client-level Global Data Files** (optional - include global data files)
11. **Handle Excluded Files** (restore excluded files from target branch)
12. **Review & Commit** (optional - commit changes)
13. **Create Pull Request** (optional - via Bitbucket API)

## Environments

| Environment | Target Branch | Source Branch |
|-------------|---------------|---------------|
| PROD | main | develop/uat |
| UAT | develop/uat | develop/test |
| TEST | develop/test | develop/dev |
| DEV | develop/dev | custom |

## Supported Clients

- carters
- briscoes
- victorias_secret
- dollar_general
- coach_na
- lovisa
- levis_us
- spanx
- crackerbarrel
- pacsun

## What Gets Copied

### Client Data (for each selected client):
- `database/{client}/data/inventory_smart/` (all SQL files, excluding OMS files)
- `database/{client}/schemas/inventory_smart/` (views, tables, functions - all SQL files)
- `database/{client}/schemas/global/` (views, tables, functions - all SQL files)

### Global Schemas (if selected):
- `database/schemas/inventory_smart/` (views, tables, functions - all SQL files)
- `database/schemas/global/` (views, tables, functions - all SQL files)

### Global Data Files (if selected):
- Files listed in `include_global_files` configuration for selected clients

## What Gets Excluded

- **OMS files**: All files matching OMS patterns (starting with "oms", containing "oms_", etc.) are automatically restored to target branch version
- **Excluded paths**: Files listed in `exclude_paths` configuration are restored to target branch version
- **Excluded files**: Files listed in `exclude_files` configuration are restored to target branch version across all clients and global schemas

## Configuration

The script uses `inventory_smart_release_config.json` for:
- **Client list**: Available clients for selection
- **Environment settings**: Branch mappings for each environment
- **Global files to include**: CSV files to copy from global data folders
- **Schema folders to include**: Which schema types to process (views, tables, functions)
- **OMS file patterns**: Patterns to identify OMS files for exclusion
- **Excluded paths**: Specific file paths to restore from target branch
- **Excluded files**: File names to exclude across all clients and global schemas

## Troubleshooting

### Common Issues

**"Bash version too old"**
```bash
# Install modern bash
brew install bash

# Run with correct path
/usr/local/bin/bash ./inventory_smart_release.sh  # Intel
/opt/homebrew/bin/bash ./inventory_smart_release.sh  # Apple Silicon
```

**"jq not found"**
```bash
brew install jq
```

**"Permission denied"**
```bash
chmod +x inventory_smart_release.sh
```

### Git Issues

- Ensure you have latest changes: `git pull origin main`
- Check git status is clean: `git status`
- Verify branch access permissions

## Safety Features

- ✅ **Worktree isolation** (with `--debug` flag)
- ✅ **Confirmation prompts** for critical operations
- ✅ **Error handling** with clear messages
- ✅ **Branch cleanup** (removes existing release branches)
- ✅ **OMS file protection** (automatic restoration to target branch)
- ✅ **Detailed logging** (all operations logged to `/tmp/mtp_database_logs_{DATE}/`)
- ✅ **Progress indicators** with timing information

## Output Examples

```
------------------------------------------------------------
Welcome to the Inventory Smart Release Automation Script!
------------------------------------------------------------

Select the target deployment environment:
1. PROD  2. UAT  3. TEST  4. DEV
● Enter the number for the environment: 2

Global schema changes include:
- database/schemas/inventory_smart (views, tables, functions)
- database/schemas/global (views, tables, functions)
● Include global schema changes? (Y/n): Y

Available clients:
1. carters  2. briscoes  3. victorias_secret  4. dollar_general
● Enter comma-separated numbers for clients to include (e.g., 1,3,5) or type 'all' to select all clients.
Your selection: 1,2
```

## Tips

- **Debug mode for safety**: Use `--debug` flag when testing or learning the script
- **Test first**: Always test in DEV environment
- **Review changes**: Check git status before committing
- **Use descriptive names**: Add meaningful names to release branches
- **Check logs**: Review log files in `/tmp/mtp_database_logs_{DATE}/` for detailed operation history
- **Global schemas**: Consider whether you need global schema changes for your release
- **File exclusions**: Check the configuration for excluded files and paths
- **Environment-specific data**: Script automatically syncs environment-specific folders (prod_specific, uat_specific, etc.)

## Support

For issues:
1. Check prerequisites are met
2. Review error messages carefully
3. Test with a simple client selection first
4. Ensure git repository is clean

---

**Author**: Mithun Rangaswamy
**Updated By**: Arjun
**Last Updated**: 2026-03-24