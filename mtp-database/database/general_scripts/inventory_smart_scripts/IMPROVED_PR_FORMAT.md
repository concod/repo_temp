# Improved PR Format

## Overview

The `inventory_smart_release_v2.sh` script now generates more user-friendly PR titles and descriptions with:

1. **Human-readable date formats**
2. **Client list in bullet points**  
3. **Global changes section with context**
4. **Professional formatting with emojis and markdown**

## Before vs After

### Before
```
Title: release: PROD release_2025-10-06_02-38

Description: Automated release PR for PROD release_2025-10-06_02-38 (generated on 2025-10-06_02-38).
```

### After
```
Title: Release: PROD Deployment - October 06, 2025

Description: 🚀 **Automated Release for PROD Environment**

📅 **Generated on:** October 06, 2025 at 2:57 AM
🏷️ **Release ID:** release_2025-10-06_02-57

## 📊 Included Clients
• crackerbarrel
• client2  
• client3

*Note: Global data changes (client level) are included for the above clients*

## 🌐 Global Changes
• Global schema changes (repository level)
• Global data changes (repository level)

## 🔧 Technical Details
• **Source branch:** develop
• **Target branch:** main
• **Release branch:** prod/release_2025-10-06_02-57
```

## Features

### 1. Human-Readable Dates with AM/PM
- Converts `2025-10-06_02-38` → `October 06, 2025 at 2:38 AM`
- Converts `2025-10-06_14-30` → `October 06, 2025 at 2:30 PM`
- Converts `2025-10-06` → `October 06, 2025`
- Handles both DATETIME and DATE formats with proper 12-hour time conversion

### 2. Smart Client List
- Shows all selected clients in bullet points
- **Includes contextual note** when client-level global data changes are included
- Clear section heading with emoji
- Easy to scan for reviewers

### 3. Organized Global Changes Tracking
- **Repository-level changes** - both schema and data changes at repository level
- **Client-level global data** - noted under the client list for better context
- Only appears when `INCLUDE_REPO_GLOBAL=Y`
- Improved organization and clarity

### 4. Technical Details
- Source, target, and release branches clearly labeled
- Formatted as bullet points for readability
- Uses markdown bold formatting for emphasis

## Implementation Details

### New Functions Added
```bash
format_human_date()           # Converts dates to human-readable format
generate_client_list()        # Creates bullet-point client list  
generate_global_changes_list() # Creates global changes section
```

### Line Break Handling
The implementation uses **actual line breaks** in bash strings instead of `\n` escape sequences to ensure proper multi-line formatting in Bitbucket PR descriptions. This prevents line break characters from appearing as literal text.

### New Variables
```bash
INCLUDE_CLIENT_GLOBAL_DATA    # Tracks client-level global data selection
HUMAN_DATE                    # Human-readable datetime
HUMAN_DATE_SHORT              # Human-readable date only
```

## Usage

The improvements are automatic when running:
```bash
./inventory_smart_release_v2.sh --yes
```

The script will:
1. Track user selections during prompts
2. Generate formatted PR title and description
3. Include relevant sections based on choices made
4. Apply team lead reviewers automatically

## Benefits

1. **Better visibility** - Reviewers can quickly understand scope
2. **Professional appearance** - Consistent formatting and emojis  
3. **Complete information** - All relevant details included
4. **Easy scanning** - Structured sections with clear headers
5. **Context preservation** - Release details and selections documented

## Customization

Users can still override the auto-generated title and description when prompted (if not using `--yes` flag):

```
PR title (default: 'Release: PROD Deployment - October 06, 2025'): [custom title]
PR description (optional, default auto-generated): [custom description]
```

The formatted defaults provide a professional starting point that users can modify as needed.