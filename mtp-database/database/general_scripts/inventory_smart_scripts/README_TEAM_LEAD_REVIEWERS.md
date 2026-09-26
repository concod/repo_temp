# Team Lead Reviewers Setup

## Overview

The inventory release process has been simplified to use **hardcoded team lead UUIDs** for PR reviewers instead of the complex user fetching mechanism. This makes the release process more reliable and focused.

## Team Leads

The following team leads are automatically assigned as reviewers for all release PRs:

1. **Pradeep J Nayak** - `{8b2a6a6a-de9d-4e4f-a74a-8be8be28af70}`
2. **Surendra Babu** - `{affe7981-af0c-429d-ad1f-3bfa29bd4eb5}`  
3. **Raj Mohan** - `{b0406b51-e79a-4415-b1f8-5d0d97059d46}`
4. **Arjun P P** - `{f48da9bb-669a-4865-b286-d16d0ff77da2}`

## Files

### `bitbucket_get_default_reviewers.sh`
- **Purpose**: Fetches repository default reviewers from Bitbucket API
- **Focus**: Only queries default reviewers (simplified from previous comprehensive approach)
- **Team Lead Detection**: Automatically identifies team leads by name patterns
- **Usage**: For updating UUIDs when team changes occur

### `inventory_smart_release_v2.sh` 
- **Integration**: Contains hardcoded team lead UUIDs
- **Fallback**: Will attempt to fetch UUIDs dynamically if hardcoded ones are empty
- **PR Creation**: Automatically includes team leads as reviewers

## Usage

### Regular Release Process
```bash
# Standard release (team leads automatically added as reviewers)
./inventory_smart_release_v2.sh --yes

# Debug mode with detailed reviewer info  
./inventory_smart_release_v2.sh --debug
```

### Updating Team Lead UUIDs (When Team Changes)
```bash
# View current default reviewers and team leads
./bitbucket_get_default_reviewers.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend

# Get only team lead UUIDs in JSON format
./bitbucket_get_default_reviewers.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --output leads

# Save reviewers to file for reference
./bitbucket_get_default_reviewers.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --save
```

### Override Reviewers (Environment Variable)
```bash
# Override default team leads with custom reviewers
export BITBUCKET_REVIEWER_UUIDS="{custom-uuid-1},{custom-uuid-2}"
./inventory_smart_release_v2.sh --yes
```

## Configuration

### Hardcoded Team Lead UUIDs
Located in `inventory_smart_release_v2.sh` at line ~48:
```bash
TEAM_LEAD_REVIEWER_UUIDS="{uuid1},{uuid2},{uuid3},{uuid4}"
```

### Environment Variable Override
```bash
# Set this to override hardcoded team leads
export BITBUCKET_REVIEWER_UUIDS="{alternative-uuid-1},{alternative-uuid-2}"
```

## Authentication

Both scripts use **Basic Authentication** (email + API token):
```bash
# Token from keychain (automatic)
export BITBUCKET_APP_PASSWORD=$(security find-generic-password -a "$USER" -s bitbucket_api_token -w)

# Or set directly
export BITBUCKET_APP_PASSWORD="your-api-token"
```

## Benefits of This Approach

1. **Reliability**: Hardcoded UUIDs don't depend on API availability
2. **Speed**: No API calls needed during normal release process  
3. **Simplicity**: Clear, predictable behavior
4. **Maintainability**: Easy to update when team changes
5. **Fallback**: Dynamic fetching available when hardcoded values are empty

## Troubleshooting

### No Reviewers Added to PR
- Check if `TEAM_LEAD_REVIEWER_UUIDS` is set in `inventory_smart_release_v2.sh`
- Verify API token is accessible: `echo $BITBUCKET_APP_PASSWORD`
- Run with `--debug` flag to see reviewer resolution process

### Team Lead Not Detected
- Update regex patterns in `bitbucket_get_default_reviewers.sh` lines ~125
- Check actual display names in Bitbucket match expected patterns
- Test with: `./bitbucket_get_default_reviewers.sh --debug`

### API Authentication Issues
- Ensure API token has repository read permissions
- Verify token: `curl -u "email:$BITBUCKET_APP_PASSWORD" https://api.bitbucket.org/2.0/user`
- Check if token is expired and regenerate if needed

## File Cleanup

The following files are **no longer needed** and can be removed:
- `inventory_members.json` 
- `team_reviewers.json`
- `bitbucket_get_user_uuids.sh` (old complex version)
- Various test scripts

The simplified approach focuses on the essential functionality with better reliability.