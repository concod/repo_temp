#!/bin/bash -e

Red='\033[0;31m'
Green='\033[0;32m'

#send email
send_maintenance_email() {
python3.8 -c """
from notify import send_maintenance_email
send_maintenance_email()
"""
}

error_in_deployment=false

source ./print_docs.sh # Print docs

{
    python3.8 alert_monitoring.py
} || {
    error_in_deployment=true
}
