#!/bin/bash

###############################################################################
# Cross Schema Validation Script
# 
# This script runs the NON_INVENTORY_SCHEMA_WRITE validation to ensure
# non-inventory schemas do not perform write operations to the global schema.
#
# Usage:
#   ./cross_schema_validation.sh [--client CLIENT_NAME]
#
# Exit codes:
#   0 - All validations passed
#   1 - Violations detected or script error
###############################################################################

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

echo -e "${CYAN}${BOLD}"
echo "╔════════════════════════════════════════════════════════════════════════════════╗"
echo "║                  NON_INVENTORY_SCHEMA_WRITE VALIDATION                        ║"
echo "║                         Cross Schema Validation                                ║"
echo "╚════════════════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

echo -e "${BLUE}📂 Working directory: ${SCRIPT_DIR}${NC}"
echo -e "${BLUE}🐍 Python version:${NC}"
python3 --version

echo ""
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${CYAN}Starting validation...${NC}"
echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if cross_schema_validation.py exists
if [ ! -f "${SCRIPT_DIR}/cross_schema_validation.py" ]; then
    echo -e "${RED}${BOLD}❌ ERROR: cross_schema_validation.py not found!${NC}"
    echo -e "${RED}Expected location: ${SCRIPT_DIR}/cross_schema_validation.py${NC}"
    exit 1
fi

# Check if database directory exists
if [ ! -d "${SCRIPT_DIR}/database" ]; then
    echo -e "${YELLOW}⚠️  WARNING: database directory not found!${NC}"
    echo -e "${YELLOW}No files to validate. Skipping...${NC}"
    exit 0
fi

# Run the validation
cd "${SCRIPT_DIR}"

if python3 cross_schema_validation.py "$@"; then
    echo ""
    echo -e "${GREEN}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          ✅ VALIDATION PASSED ✅                               ║"
    echo "║                                                                                ║"
    echo "║          All non-inventory schemas are properly isolated!                     ║"
    echo "╚════════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    exit 0
else
    EXIT_CODE=$?
    echo ""
    echo -e "${RED}${BOLD}"
    echo "╔════════════════════════════════════════════════════════════════════════════════╗"
    echo "║                          ❌ VALIDATION FAILED ❌                               ║"
    echo "║                                                                                ║"
    echo "║    Non-inventory schemas are writing to global schema!                        ║"
    echo "║    Please fix the violations above before merging.                            ║"
    echo "╚════════════════════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    exit $EXIT_CODE
fi

