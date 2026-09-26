#!/bin/bash -e

Red='\033[0;31m'
Green='\033[0;32m'

#send pr email
send_pr_email() {
python3.8 -c """
from notify import send_pr_email
send_pr_email()
"""
}

export PP_TYPE=manual_replication
error_in_deployment=false

source ./print_docs.sh # Print docs

python3.8 manual_replication.py

if [ $error_in_deployment = true ]; then
    exit 1;
fi
