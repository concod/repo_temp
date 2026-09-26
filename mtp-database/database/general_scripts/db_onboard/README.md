# Database Client Onboarding Scripts

This directory contains scripts to automate the client onboarding process for the MTP database system.

## 🚀 Quick Start

```bash
# Navigate to the script directory
cd database/general_scripts/db_onboard

# Make scripts executable (first time only)
chmod +x *.sh

# Run the onboarding script
./db_onboard.sh
```

## 📁 Files Overview

| File | Description |
|------|-------------|
| `db_onboard.sh` | Main onboarding script (single command execution) |
| `update_pipeline.sh` | Helper script to update bitbucket-pipelines.yml |
| `merge_primary_keys.py` | Python helper to merge primary key mappings |
| `db_onboard_config.json` | Configuration file with environment settings |
| `README.md` | This documentation file |

## 🔧 How It Works

The main script `db_onboard.sh` orchestrates the entire onboarding process:

1. **Client Selection**: Dynamically lists all client folders from `/database/` directory
2. **Environment Selection**: Allows selection from PROD, UAT, TEST, or DEV environments
3. **Git Operations**: Handles branch checkout, pull, and file synchronization
4. **Pipeline Updates**: Adds client to bitbucket-pipelines.yml configuration
5. **Primary Key Mapping**: Merges client-specific mappings from source branch
6. **Branch Creation**: Creates a new onboard branch for review

## 📋 Prerequisites

- **Bash 4+**: Required for modern shell features
- **Python 3**: For JSON manipulation
- **jq**: For JSON parsing in bash scripts
- **Git**: Repository must be a git repository

### Installing Prerequisites

```bash
# macOS
brew install bash jq python3

# Ensure you're using modern bash
/usr/local/bin/bash ./db_onboard.sh  # Intel Mac
/opt/homebrew/bin/bash ./db_onboard.sh  # Apple Silicon Mac
```

## ⚙️ Configuration

The `db_onboard_config.json` file contains:

```json
{
  "environments": {
    "PROD": { "branch": "main", "src_branch": "develop/uat", "priority": 1 },
    "UAT": { "branch": "develop/uat", "src_branch": "develop/test", "priority": 2 },
    "TEST": { "branch": "develop/test", "src_branch": "develop/dev", "priority": 3 },
    "DEV": { "branch": "develop/dev", "src_branch": "", "priority": 4 }
  },
  "excluded_folders": ["utils", "schemas", "data", "general_scripts", "ada-visual"],
  "pipeline_template_client": "dollar_general"
}
```

### Configuration Options

- **environments**: Defines deployment environments and their branch mappings
- **excluded_folders**: Folders to exclude when listing clients
- **pipeline_template_client**: Template client used for pipeline step generation

## 🎯 Usage Examples

### Basic Usage
```bash
./db_onboard.sh
```

### Step-by-Step Process
1. **Select Client**: Choose from automatically detected client folders
2. **Select Environment**: Pick target deployment environment
3. **Confirm Operations**: Review git operations before execution
4. **Review Results**: Check the created onboard branch

### Example Session
```
🚀 Database Client Onboarding Script
============================================================

Select Client for Onboarding
============================================================
Available clients:
 1. arhaus
 2. carters
 3. levis_us
...

● Enter the number for the client: 2
✓ Selected client: carters

Select Target Environment
============================================================
1. PROD
2. UAT
3. TEST
4. DEV

● Enter the number for the environment: 2
✓ Selected environment: UAT
✓ Target branch: develop/uat
✓ Source branch: develop/test
```

## 🔍 What Gets Updated

### 1. Git Operations
- Stashes local changes
- Checks out target branch and pulls latest changes
- Checks out client files from source branch
- Creates new onboard branch: `<env>/client/<client_name>/onboarding`

### 2. Pipeline Configuration (`bitbucket-pipelines.yml`)
- Adds client to `x-client-list` section
- Creates deployment step based on template client

### 3. Primary Key Mapping (`database/utils/primary_key_mapping.json`)
- Merges client-specific primary key configurations from source environment
- Handles missing client gracefully with warnings

## 🛠️ Troubleshooting

### Common Issues

**Script fails with "Bash version" error**
```bash
# Solution: Use modern bash
brew install bash
/usr/local/bin/bash ./db_onboard.sh
```

**"jq command not found"**
```bash
# Solution: Install jq
brew install jq
```

**"No client folders found"**
- Check that you're running from correct directory
- Verify client folders exist in `/database/` directory
- Check excluded folders configuration

**Git operations fail**
- Ensure you have proper git permissions
- Check that specified branches exist
- Verify repository is in clean state

### Manual Cleanup

If the script fails partway through:

```bash
# Return to original branch
git checkout <your_original_branch>

# Clean up any partial changes
git restore --staged .
git stash

# Delete partial onboard branch (if created)
git branch -D <env>/client/<client>/onboarding
```

## 📝 Best Practices

1. **Always run from a clean git state**
2. **Review changes before committing**
3. **Test in DEV environment first**
4. **Keep backups of configuration files**
5. **Run script from the correct directory**

## 🔧 For Developers

### Extending the Scripts

**Adding new environments:**
Edit `db_onboard_config.json`:
```json
"STAGING": { "branch": "develop/staging", "src_branch": "develop/test", "priority": 5 }
```

**Changing excluded folders:**
Update the `excluded_folders` array in config.

**Modifying pipeline template:**
Change `pipeline_template_client` in config to use a different template.

### Script Architecture

```
db_onboard.sh (Main orchestrator)
├── update_pipeline.sh (Pipeline updater)
├── merge_primary_keys.py (JSON merger)
└── db_onboard_config.json (Configuration)
```

Each component is independent and can be tested separately:

```bash
# Test pipeline updater
./update_pipeline.sh test_client dollar_general

# Test primary key merger
python3 merge_primary_keys.py test_client develop/test
```

## 📞 Support

For issues or questions:
1. Check this README first
2. Review script output for specific error messages
3. Test individual components separately
4. Contact the MTP team for assistance

---

**Created by**: MTP Team  
**Last Updated**: $(date +%Y-%m-%d)  
**Version**: 1.0 