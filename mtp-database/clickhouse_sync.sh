#!/bin/bash -e

Red='\033[0;31m'
Green='\033[0;32m'

source ./print_docs.sh # Print docs and derive ENV from branch

echo ""
echo "=========================================="
echo "  ClickHouse Data Sync Pipeline"
echo "=========================================="
echo "  CLIENT:      ${CLIENT}"
echo "  APPLICATION: ${APPLICATION}"
echo "  ENV:         ${ENV}"
echo "=========================================="
echo ""

cd database

python3.8 clickhouse_sync.py clickhouse_data_sync $CLIENT $APPLICATION $ENV
