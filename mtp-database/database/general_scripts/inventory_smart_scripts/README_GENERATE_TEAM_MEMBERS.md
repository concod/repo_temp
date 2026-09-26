# Generate Team Members - README

This guide shows how to use the `bitbucket_get_user_uuids.sh` script to generate a local copy of team members from your Bitbucket repository.

## 🎯 Purpose

Generate an `inventory_members.json` file containing all team members from a Bitbucket repository with their UUIDs, display names, and usernames for use in pull request reviewer assignments. The file is automatically added to `.gitignore` to keep it out of version control.

## 📋 Prerequisites

1. **Authentication Setup**: Basic Authentication with your Bitbucket API token
   ```bash
   export BITBUCKET_APP_PASSWORD="your-api-token"
   # Username defaults to: mithun.rangaswamy@impactanalytics.co
   ```

2. **Or use keychain** (macOS):
   ```bash
   security add-generic-password -a "$USER" -s bitbucket_api_token -w 'your-api-token'
   ```

3. **Required tools**: `curl`, `jq` (for JSON processing)

## 🚀 Quick Start

### Generate Team Members for a Repository

```bash
# Generate team members file for a specific repository
./bitbucket_get_user_uuids.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --save
```

### Or use auto-detection from current git repository

```bash
# Auto-detects workspace/repo from git remote
./bitbucket_get_user_uuids.sh --save
```

## 📄 Generated File: `inventory_members.json`

The script creates an `inventory_members.json` file in the current directory with structured JSON data:

- **Metadata**: Repository info, generation date, total users, data source
- **Users Array**: Complete user information with UUIDs, display names, usernames, and sources
- **Usage Examples**: Ready-to-use commands and UUID combinations
- **Auto .gitignore**: Automatically added to `.gitignore` to keep out of version control

### JSON Structure

```json
{
  "metadata": {
    "workspace": "insideinsight",
    "repository": "mtp-inventorysmart-generic-backend",
    "generated_on": "2025-10-01T15:15:28Z",
    "total_users": 21,
    "data_source": "pull_requests",
    "note": "Your credentials lack one or more required privilege scopes."
  },
  "users": [
    {
      "uuid": "{24bf3a46-8d8b-4cf4-ad56-820f53426e9e}",
      "display_name": "Shashwat Yadav",
      "username": "Shashwat Yadav",
      "source": "pr_author"
    },
    {
      "uuid": "{32de071f-6163-4958-a1ad-b56fefdd16fd}",
      "display_name": "Aniruddh Singh",
      "username": "Aniruddh Singh",
      "source": "pr_author"
    }
  ],
  "usage_examples": {
    "pr_creation": {
      "command": "./bitbucket_create_pr.sh",
      "example": "./bitbucket_create_pr.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --source feature-branch --dest main --title \"My PR\" --reviewer-uuids \"{uuid1},{uuid2}\""
    },
    "first_two_reviewers": "{24bf3a46-8d8b-4cf4-ad56-820f53426e9e},{32de071f-6163-4958-a1ad-b56fefdd16fd}",
    "reviewers_array": [
      { "uuid": "{24bf3a46-8d8b-4cf4-ad56-820f53426e9e}" },
      { "uuid": "{32de071f-6163-4958-a1ad-b56fefdd16fd}" }
    ]
  }
}
```

## 🔧 Command Options

```bash
./bitbucket_get_user_uuids.sh [OPTIONS]
```

### Required (or auto-detected):
- `--workspace WS` - Bitbucket workspace name
- `--repo REPO` - Repository name

### Options:
- `--save` - **Save results to 'inventory_members.json' file (JSON format)**
- `--output FORMAT` - Output format: table, json, reviewers (default: table)
- `--limit N` - Max users to fetch (default: 50)
- `--debug` - Show debug information
- `--help` - Show help

## 📊 Data Sources

The script intelligently gathers user information from:

1. **Workspace Members** (if token has permissions)
2. **Pull Request Authors** (fallback method)
3. **Pull Request Reviewers** (additional users)
4. **Merged PR History** (comprehensive coverage)

> **Note**: If workspace access is denied, the script automatically falls back to PR data and shows a warning.

## 💡 Usage Examples

### 1. Generate for Current Repository
```bash
# Assumes you're in a git repository with Bitbucket remote
./bitbucket_get_user_uuids.sh --save
```

### 2. Generate for Specific Repository
```bash
# For the inventory smart generic backend
./bitbucket_get_user_uuids.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --save
```

### 3. Generate with Debug Info
```bash
./bitbucket_get_user_uuids.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --save --debug
```

### 4. Preview Before Saving
```bash
# See the data first
./bitbucket_get_user_uuids.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend

# Then save if satisfied
./bitbucket_get_user_uuids.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --save
```

## 🔗 Integration with PR Creation

After generating the `inventory_members` file, you can use the UUIDs for PR creation:

```bash
# Example using UUIDs from the generated file
./bitbucket_create_pr.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend \
  --source "feature-branch" --dest "main" --title "My Feature PR" \
  --reviewer-uuids "{24bf3a46-8d8b-4cf4-ad56-820f53426e9e},{32de071f-6163-4958-a1ad-b56fefdd16fd}"
```

## 🛠 Troubleshooting

### Authentication Issues
```bash
# Check if authentication is working
./bitbucket_get_user_uuids.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --debug
```

### No Users Found
- Repository might have no pull requests
- Try a different repository with PR activity
- Check if workspace/repo names are correct

### Permission Denied for Workspace Members
- This is normal - script will fall back to PR data
- You'll see: "⚠️ Workspace members access denied: ..."
- PR data is usually sufficient for team member identification

## 🔍 Working with the JSON File

### Programmatic Access with `jq`

```bash
# Get all display names
jq -r '.users[] | .display_name' inventory_members.json

# Find user by name
jq -r '.users[] | select(.display_name | contains("Mithun")) | "\(.display_name): \(.uuid)"' inventory_members.json

# Get first 3 UUIDs for PR reviewers
jq -r '.users[0:3] | map(.uuid) | join(",")' inventory_members.json

# Get ready-to-use reviewer UUIDs
jq -r '.usage_examples.first_two_reviewers' inventory_members.json

# Count users by source
jq '.users | group_by(.source) | map({source: .[0].source, count: length})' inventory_members.json

# Extract metadata
jq '.metadata' inventory_members.json
```

### Integration with Shell Scripts

```bash
# Use in variables
REVIEWER_UUIDS=$(jq -r '.usage_examples.first_two_reviewers' inventory_members.json)
TOTAL_USERS=$(jq -r '.metadata.total_users' inventory_members.json)

# Use with PR creation
./bitbucket_create_pr.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend \
  --source "my-feature" --dest "main" --title "My PR" \
  --reviewer-uuids "$REVIEWER_UUIDS"
```

## 📁 File Location

The `inventory_members.json` file is created in the **same directory** as the script:
```bash
ls -la inventory_members.json .gitignore
# -rw-r--r-- 1 user staff   23 Oct  1 20:45 .gitignore
# -rw-r--r-- 1 user staff 5.8K Oct  1 20:45 inventory_members.json
```

### .gitignore Integration

The script automatically:
- ✅ Adds `inventory_members.json` to `.gitignore` if not present
- ✅ Avoids duplicate entries if already exists
- ✅ Creates `.gitignore` if it doesn't exist

## 🔄 Updating Team Members

To refresh the team members list:

```bash
# Remove old file and generate new one
rm -f inventory_members
./bitbucket_get_user_uuids.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --save
```

## 📝 Example Workflow

```bash
# 1. Generate team members
./bitbucket_get_user_uuids.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --save --debug

# 2. Review the generated file
head -20 inventory_members

# 3. Use UUIDs for PR creation
./bitbucket_create_pr.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend \
  --source "my-feature" --dest "main" --title "Add new feature" \
  --reviewer-uuids "{uuid1},{uuid2}" \
  --debug
```

## 🎯 Pro Tips

1. **Keep it Updated**: Regenerate `inventory_members` periodically as team changes
2. **Version Control**: Consider adding `inventory_members` to `.gitignore` if it contains sensitive info
3. **Automation**: Add to your workflow scripts to auto-generate before PR creation
4. **Team Onboarding**: Use this to quickly identify all active team members

---

## 🔗 Related Scripts

- `bitbucket_create_pr.sh` - Create pull requests using the generated UUIDs
- Uses the same Basic Authentication setup
- Both scripts work together seamlessly

**Happy team member management!** 🚀