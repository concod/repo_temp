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

export PP_TYPE=replication_setup
error_in_deployment=false

source ./print_docs.sh # Print docs

python3.8 replication_setup.py

if [ $error_in_deployment = true ]; then
    exit 1;
fi
