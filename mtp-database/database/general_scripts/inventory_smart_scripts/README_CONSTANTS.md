# Constants Configuration Guide

## Overview

All hardcoded values have been moved to a centralized `constants.sh` file to make the scripts more maintainable and configurable.

## Files Affected

- `bitbucket_create_pr.sh` - Updated to use constants
- `inventory_smart_release_v2.sh` - Updated to use constants
- `constants.sh` - **NEW** - Centralized configuration

## Configuration

### Default Values (in constants.sh)

```bash
# Bitbucket Authentication
DEFAULT_BITBUCKET_EMAIL="mithun.rangaswamy@impactanalytics.co"

# Repository Settings
DEFAULT_BITBUCKET_WORKSPACE="insideinsight"
DEFAULT_BITBUCKET_REPO="mtp-database"

# Team Lead Reviewers
DEFAULT_TEAM_LEAD_REVIEWER_UUIDS="{8b2a6a6a-de9d-4e4f-a74a-8be8be28af70},{affe7981-af0c-429d-ad1f-3bfa29bd4eb5},{b0406b51-e79a-4415-b1f8-5d0d97059d46},{f48da9bb-669a-4865-b286-d16d0ff77da2}"
TEAM_LEAD_NAMES="Pradeep J Nayak, Surendra Babu, Raj Mohan, Arjun P P"
```

### Customization Options

#### 1. Edit Constants File (Recommended for permanent changes)
```bash
vim constants.sh
# Edit the DEFAULT_* values as needed
```

#### 2. Environment Variable Override (Temporary changes)
```bash
# Override email
export BITBUCKET_USERNAME="different.email@company.com"

# Override workspace/repo
export BITBUCKET_WORKSPACE="different-workspace"
export BITBUCKET_REPO="different-repo"

# Override reviewers (team leads only by default)
export TEAM_LEAD_REVIEWER_UUIDS="{new-uuid1},{new-uuid2}"
```

## Reviewer Configuration

### Current Behavior
- **Default**: Only team lead UUIDs are used as reviewers
- **Team Leads**: Pradeep J Nayak, Surendra Babu, Raj Mohan, Arjun P P
- **Override**: Set `BITBUCKET_REVIEWER_UUIDS` environment variable

### Updating Team Lead UUIDs

#### Automatic Update (Recommended)
```bash
# Automatically fetch and update constants.sh with latest team lead UUIDs
./bitbucket_get_default_reviewers.sh --update-constants

# With debug output
./bitbucket_get_default_reviewers.sh --update-constants --debug
```

#### Manual Update
```bash
# Fetch current team leads from repository
./bitbucket_get_default_reviewers.sh --output leads

# Manually edit constants.sh with new UUIDs
vim constants.sh
```

## Usage Examples

### Standard Usage (uses constants.sh defaults)
```bash
# PR creation
./bitbucket_create_pr.sh --workspace insideinsight --repo mtp-database \
  --source feature-branch --dest main --title "My PR"

# Release script
./inventory_smart_release_v2.sh --yes
```

### Custom Configuration
```bash
# Temporary override
export BITBUCKET_USERNAME="custom.email@company.com"
export TEAM_LEAD_REVIEWER_UUIDS="{custom-uuid1},{custom-uuid2}"

./bitbucket_create_pr.sh --workspace insideinsight --repo mtp-database \
  --source feature-branch --dest main --title "My PR"
```

## Troubleshooting

### Constants File Not Found
If you see "WARNING: Constants file not found", the scripts will fall back to hardcoded defaults. Ensure `constants.sh` exists in the same directory as the scripts.

### Debug Configuration
```bash
# Show current configuration
source constants.sh
load_bitbucket_constants
show_bitbucket_config
```

### Verify Setup
```bash
# Test with dry-run
./bitbucket_create_pr.sh --workspace insideinsight --repo mtp-database \
  --source test --dest main --title "Test" --dry-run --debug
```

## Migration Notes

- All hardcoded values have been removed from the scripts
- Scripts automatically load constants.sh if available
- Environment variables still take precedence over constants
- Backward compatibility maintained through fallback defaults
