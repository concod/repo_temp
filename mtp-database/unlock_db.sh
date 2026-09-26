#!/bin/bash -e

Red='\033[0;31m'
Green='\033[0;32m'

export CLIENTS=$CLIENT
export PP_TYPE=unlock_db

source ./print_docs.sh # Print docs

python3.8 unlock_db.py
EXIT_CODE=$(cat exit_code 2>/dev/null || echo 1)
exit $EXIT_CODE
