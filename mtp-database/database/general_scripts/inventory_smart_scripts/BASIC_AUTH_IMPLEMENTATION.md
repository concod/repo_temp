# Bitbucket Basic Authentication Only - Implementation Summary

## ✅ **COMPLETED: Simplified to Basic Auth Only with Constants File**

Your `bitbucket_create_pr.sh` script has been completely rewritten to use **only Basic Authentication** with no Bearer token fallback, and all hardcoded values have been moved to a centralized constants file.

## 🎯 **Key Changes**

### 1. **Constants File Configuration**
All hardcoded values are now centralized in `constants.sh`:
```bash
# constants.sh
DEFAULT_BITBUCKET_EMAIL="mithun.rangaswamy@impactanalytics.co"
DEFAULT_BITBUCKET_WORKSPACE="insideinsight"
DEFAULT_BITBUCKET_REPO="mtp-database"
DEFAULT_TEAM_LEAD_REVIEWER_UUIDS="{uuid1},{uuid2},{uuid3},{uuid4}"
TEAM_LEAD_NAMES="Pradeep J Nayak, Surendra Babu, Raj Mohan, Arjun P P"
```

### 2. **Basic Auth Only Logic**
- ❌ **Removed**: All Bearer token logic
- ❌ **Removed**: Complex auth mode switching  
- ❌ **Removed**: Git email detection
- ❌ **Removed**: All hardcoded values from scripts
- ✅ **Added**: Simple Basic auth with configurable email
- ✅ **Added**: Multiple token source support
- ✅ **Added**: Centralized constants file

### 3. **Token Source Priority (in order)**
1. `BITBUCKET_APP_PASSWORD` environment variable
2. `BITBUCKET_TOKEN_FILE` file path
3. `BITBUCKET_API_TOKEN` legacy variable
4. `bitbucket_api_token` from macOS keychain

### 4. **Username Handling**
- **Default**: Uses configurable email from `constants.sh`
- **Override**: Set `BITBUCKET_USERNAME` to use different email
- **No auto-detection**: No git config or email guessing
- **Maintainable**: Change email in one place (constants.sh)

## 📋 **Current Behavior**

### Zero Configuration Setup ✨
```bash
# Just works if token is in keychain
./bitbucket_create_pr.sh --workspace WS --repo REPO --source SRC --dest DEST --title "PR Title"
```

### Explicit Setup (Recommended)
```bash
export BITBUCKET_APP_PASSWORD="your-api-token"
# Username automatically uses value from constants.sh

./bitbucket_create_pr.sh --workspace WS --repo REPO --source SRC --dest DEST --title "PR Title"
```

### Debug Output
```
[DEBUG] Auth mode: Basic (Atlassian email + API token)
[DEBUG] Username: mithun.rangaswamy@impactanalytics.co
[DEBUG] App password: ATATT3…E808 (len=192)
[DEBUG] Token source: keychain
[DEBUG] Headers: Authorization: Basic bWl0aHVuLnJhbmdhc3dh...
[DEBUG] ✅ Using Bitbucket recommended Basic auth
```

## 🔧 **Error Handling**

When authentication is missing:
```
ERROR: Missing authentication for Basic auth.

Required:
  BITBUCKET_USERNAME: mithun.rangaswamy@impactanalytics.co
  BITBUCKET_APP_PASSWORD: <not set>

Setup options:
  export BITBUCKET_APP_PASSWORD='your-api-token'
  # Username defaults to value from constants.sh

Or store token in keychain:
  security add-generic-password -a "$USER" -s bitbucket_api_token -w 'your-token'
```

## 📊 **Before vs After**

| Feature | Before | After |
|---------|--------|-------|
| **Auth Methods** | Basic + Bearer (complex) | Basic Only (simple) |
| **Default Mode** | Bearer | Basic |
| **Email Detection** | Git config auto-detect | Hardcoded |
| **Fallback Logic** | Complex auth switching | None needed |
| **Error Messages** | Generic | Specific to Basic auth |
| **Code Lines** | ~200+ lines | ~180 lines |
| **Maintenance** | Complex | Simple |

## 🚀 **Usage Examples**

### Current Environment (Already Working)
```bash
# Your current setup works immediately
./bitbucket_create_pr.sh --workspace "insideinsight" --repo "mtp-database" \
  --source "feature-branch" --dest "main" --title "My PR" --debug
```

### Fresh Setup on New Machine
```bash
# 1. Store token in keychain
security add-generic-password -a "$USER" -s bitbucket_api_token -w 'your-api-token'

# 2. Use immediately (zero configuration)
./bitbucket_create_pr.sh --workspace "insideinsight" --repo "mtp-database" \
  --source "feature-branch" --dest "main" --title "My PR"
```

### Alternative Setup
```bash
# Environment variable approach
export BITBUCKET_APP_PASSWORD="your-api-token"
# Email automatically uses value from constants.sh

./bitbucket_create_pr.sh --workspace "insideinsight" --repo "mtp-database" \
  --source "feature-branch" --dest "main" --title "My PR"
```

### Customizing Constants
```bash
# Edit the constants file to change defaults
vim constants.sh

# Or override via environment variables
export BITBUCKET_USERNAME="different.email@company.com"
export BITBUCKET_WORKSPACE="different-workspace"
export TEAM_LEAD_REVIEWER_UUIDS="{new-uuid1},{new-uuid2}"
```

## 🎯 **Mission Accomplished**

✅ **No Bearer token support** - Completely removed  
✅ **No hardcoded values** - All moved to centralized constants.sh  
✅ **Basic auth only** - Simple, reliable, Bitbucket-recommended  
✅ **Auto-configuration** - Works with your existing keychain setup  
✅ **Clear error messages** - Guides users to correct setup  
✅ **Simplified codebase** - Easier to maintain and understand  
✅ **Maintainable configuration** - Change values in one place  
✅ **Team lead reviewers only** - Configured to use only team leads by default  

Your script now follows the **KISS principle**: Keep It Simple, Stupid! 🎉

## 🔄 **Automatic Constants Update**

The `bitbucket_get_default_reviewers.sh` script now includes functionality to automatically update the `constants.sh` file:

```bash
# Automatically fetch and update team lead UUIDs in constants.sh
./bitbucket_get_default_reviewers.sh --update-constants

# Output example:
# ✅ Updated constants.sh with latest team lead UUIDs
# 📄 Backup saved to: constants.sh.backup.20241005_143022
# 🔄 New UUIDs: {uuid1},{uuid2},{uuid3},{uuid4}
# 📝 Updated team lead names: Pradeep J Nayak, Surendra Babu, Raj Mohan, Arjun P P
```

**Features:**
- ✅ Automatic backup creation before updates
- ✅ Updates both UUIDs and team lead names
- ✅ Error handling and validation
- ✅ Debug output available

## 📁 **File Structure**
```
inventory_smart_scripts/
├── constants.sh                      # 🆕 Centralized configuration
├── bitbucket_create_pr.sh           # ✅ Updated to use constants
├── bitbucket_get_default_reviewers.sh # ✅ Can update constants automatically
├── inventory_smart_release_v2.sh     # ✅ Updated to use constants
├── BASIC_AUTH_IMPLEMENTATION.md      # ✅ Updated documentation
└── README_CONSTANTS.md              # 🆕 Configuration guide
```