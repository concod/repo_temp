#!/usr/bin/env bash
# Verification script for Team Lead Reviewers Setup

set -euo pipefail

echo "🔍 Team Lead Reviewers Setup Verification"
echo "========================================"

# Check if required files exist
echo ""
echo "📁 File Status:"
files_to_check=(
    "bitbucket_get_default_reviewers.sh"
    "inventory_smart_release_v2.sh"
    "bitbucket_create_pr.sh"
    "README_TEAM_LEAD_REVIEWERS.md"
    "IMPROVED_PR_FORMAT.md"
)

for file in "${files_to_check[@]}"; do
    if [[ -f "$file" ]]; then
        echo "  ✅ $file"
    else
        echo "  ❌ $file (missing)"
    fi
done

# Check if old files were cleaned up
echo ""
echo "🧹 Cleanup Status:"
old_files_to_check=(
    "bitbucket_get_user_uuids.sh"
    "inventory_members.json"
    "team_reviewers.json"
)

for file in "${old_files_to_check[@]}"; do
    if [[ ! -f "$file" ]]; then
        echo "  ✅ $file (removed)"
    else
        echo "  ⚠️  $file (still present - should be removed)"
    fi
done

# Check hardcoded UUIDs in release script
echo ""
echo "🔐 Hardcoded Team Lead UUIDs:"
if grep -q "TEAM_LEAD_REVIEWER_UUIDS=" inventory_smart_release_v2.sh; then
    uuid_line=$(grep "TEAM_LEAD_REVIEWER_UUIDS=" inventory_smart_release_v2.sh | head -1)
    if [[ "$uuid_line" == *'""' ]]; then
        echo "  ⚠️  Empty UUIDs - will fetch dynamically"
    else
        echo "  ✅ Hardcoded UUIDs present"
        echo "     $(echo "$uuid_line" | sed 's/^[[:space:]]*/     /')"
    fi
else
    echo "  ❌ TEAM_LEAD_REVIEWER_UUIDS not found"
fi

# Test API connectivity
echo ""
echo "🌐 API Connectivity Test:"
if command -v curl >/dev/null 2>&1; then
    if [[ -n "${BITBUCKET_APP_PASSWORD:-}" ]] || security find-generic-password -a "$USER" -s bitbucket_api_token >/dev/null 2>&1; then
        echo "  ✅ API token available"
        
        # Test with default reviewers script
        echo ""
        echo "🎯 Testing Team Lead Detection:"
        if [[ -x "bitbucket_get_default_reviewers.sh" ]]; then
            echo "  Running: ./bitbucket_get_default_reviewers.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --output leads"
            echo ""
            ./bitbucket_get_default_reviewers.sh --workspace insideinsight --repo mtp-inventorysmart-generic-backend --output leads | \
                jq -r '.[] | "  ✅ \(.display_name) (\(.username)) - \(.uuid)"' 2>/dev/null || \
                echo "  ❌ Failed to fetch team leads"
        else
            echo "  ❌ bitbucket_get_default_reviewers.sh not executable"
        fi
    else
        echo "  ⚠️  No API token found (set BITBUCKET_APP_PASSWORD or store in keychain)"
    fi
else
    echo "  ⚠️  curl not available"
fi

echo ""
echo "📋 Summary:"
echo "============"
echo "The simplified team lead reviewers setup is ready to use:"
echo ""
echo "• Team leads are hardcoded in inventory_smart_release_v2.sh"
echo "• Release process will automatically add them as PR reviewers"
echo "• Dynamic fallback available if hardcoded UUIDs are empty"
echo "• bitbucket_get_default_reviewers.sh available for UUID updates"
echo "• Enhanced PR titles and descriptions with human-readable dates"
echo "• Client list and global changes tracking in PR descriptions"
echo ""
echo "Usage: ./inventory_smart_release_v2.sh --yes"
echo ""
echo "📝 Sample PR Format:"
echo "Title: Release: PROD Deployment - October 06, 2025"
echo "Description: Includes client list with contextual notes, organized global"
echo "             changes, and technical details with AM/PM time formatting"
echo ""
echo "🎉 Setup verification complete!"
