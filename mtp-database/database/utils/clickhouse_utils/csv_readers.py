import sys
import os
import csv
import re
import json
import logging


SYNC_CONFIG_PATH = os.path.join(os.path.dirname(__file__), 'clickhouse_sync.json')


def load_sync_config():
    """
    Load the ClickHouse sync configuration from clickhouse_sync.json.

    Returns:
        dict: Parsed JSON config, or empty dict on failure.
    """
    try:
        with open(SYNC_CONFIG_PATH, 'r') as f:
            return json.load(f)
    except (FileNotFoundError, json.JSONDecodeError) as e:
        logging.error(f"Failed to load ClickHouse sync config: {str(e)}")
        print(f"Failed to load ClickHouse sync config: {str(e)}")
        return {}


def get_tables_to_sync(client_name: str) -> set:
    """
    Get the set of table names allowed for sync by merging common config
    with client-specific config.

    Priority: client-specific tables are merged on top of common tables.

    Args:
        client_name: Name of the client

    Returns:
        set: Table names (e.g., {'test_sync', 'product_master'}) to sync.
             Returns empty set if no config found (nothing will be synced).
    """
    config = load_sync_config()

    if not config:
        print("No sync config loaded, no tables will be synced")
        return set()

    # Start with common tables
    common_tables = set(config.get('common', {}).get('tables', []))

    # Merge client-specific tables
    client_tables = set(config.get(client_name, {}).get('tables', []))

    merged = common_tables | client_tables

    if not merged:
        print(f"No tables configured for sync (common + {client_name})")
    else:
        print(f"Tables to sync for '{client_name}': {sorted(merged)}")

    return merged


def get_csv_files_to_sync(client_name: str, application: str) -> list:
    """
    Get list of CSV files to sync for a client and application, filtered by clickhouse_sync.json.

    Only CSVs whose table name appears in the merged config (common + client)
    will be included. Only the application passed from the pipeline is processed.

    Directory structure:
    - Client-specific CSVs: database/{client}/clickhouse/data/{application}/*.csv
    - Default CSVs: database/clickhouse/data/{application}/*.csv

    Priority: Client-specific CSVs override default CSVs for the same table.

    Args:
        client_name: Name of the client
        application: Application name from pipeline (e.g., 'item_smart')
        base_path: Base path to the database directory

    Returns:
        List of dicts with table_name (schema.table) and csv_path
    """
    base_path = os.path.dirname(os.path.abspath(__file__))
    path_parts = base_path.split(os.sep)
    database_index = path_parts.index('database')
    base_path = os.sep.join(path_parts[:database_index + 1])

    # Load allowed tables from config
    allowed_tables = get_tables_to_sync(client_name)

    if not allowed_tables:
        return []

    # Paths scoped to the specific application
    default_app_path = os.path.join(base_path, 'data', 'clickhouse', 'data', application)
    client_app_path = os.path.join(base_path, client_name, 'data', 'clickhouse', 'data', application)

    # Common first, then client-specific overrides common if same table exists
    csv_files = collect_all_csvs(client_app_path, default_app_path, allowed_tables)

    return csv_files


def _collect_csvs(dir_path: str, allowed_tables: set, csv_files: dict, source_label: str):
    """
    Scan a directory for CSV files and add allowed ones to csv_files dict.

    Silently overrides existing entries so the last call wins (client over common).
    """
    if not os.path.exists(dir_path):
        return

    for filename in os.listdir(dir_path):
        if not filename.endswith('.csv'):
            continue

        table_name = filename.replace('.csv', '')

        if table_name not in allowed_tables:
            print(f"  [Skipped] {table_name} (not in sync config)")
            continue

        csv_files[table_name] = {
            'table_name': table_name,
            'csv_path': os.path.join(dir_path, filename),
            'source': source_label
        }


def collect_all_csvs(client_app_path, default_app_path, allowed_tables):
    csv_files = {}

    # Common first, then client-specific overrides if same table exists
    _collect_csvs(default_app_path, allowed_tables, csv_files, "Common")
    _collect_csvs(client_app_path, allowed_tables, csv_files, "Client")

    # Log final resolved sources after override
    for table_name, info in csv_files.items():
        print(f"  [{info['source']}] {table_name}")

    return list(csv_files.values())