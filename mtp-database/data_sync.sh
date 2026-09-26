#!/bin/bash -e

Red='\033[0;31m'
Green='\033[0;32m'

source ./print_docs.sh # Print docs

cd database
#python3.8 -m venv env
#source ./env/bin/activate
#if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

if [ -z "$REPLICATION_VALUE" ]; then
    python3.8 run.py data_sync $CLIENT $ENV
else
    python3.8 run.py data_sync $CLIENT $ENV $REPLICATION_VALUE
fi
