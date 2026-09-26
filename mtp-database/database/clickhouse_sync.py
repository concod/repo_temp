import sys
import os
import csv
import re

import time
import traceback
import json
import logging

from load_sync_env import setup_env
from colorama import Fore, Style

from utils.clickhouse_utils import csv_readers

try:
    import clickhouse_connect
except ImportError:
    print("clickhouse-connect package not installed. Install with: pip install clickhouse-connect")
    sys.exit(1)


class ClickHouseSync:
    """ClickHouse database sync class similar to PGSync for PostgreSQL"""
    
    def __init__(self, client_name: str, application: str, env: str = 'dev'):
        self.client_name = client_name
        self.env = env
        self.client = None
        self.credentials_valid = False
        # self.ch_verify = False  # Default SSL verification
        
        # Build the environment variable key: {client}_{env}_clickhouse
        # e.g., primark_test_clickhouse
        tdb_id = f"{client_name}_{env}_{application}_clickhouse"
        
        # Load ClickHouse connection settings from JSON environment variable
        ch_config_str = os.environ.get(tdb_id)
        
        if ch_config_str:
            try:
                ch_config = json.loads(ch_config_str)
                
                # Required fields (no defaults)
                self.ch_host = ch_config['CLICKHOUSE_HOST']
                self.ch_password = ch_config['CLICKHOUSE_PASSWORD']
                
                # Optional fields with sensible defaults
                self.ch_port = int(ch_config.get('CLICKHOUSE_PORT', 8443))
                self.ch_user = ch_config.get('CLICKHOUSE_USER', 'default')
                self.ch_database = ch_config.get('CLICKHOUSE_DATABASE', 'default')
                self.ch_secure = str(ch_config.get('CLICKHOUSE_SECURE', 'true')).lower() == 'true'
                # CLICKHOUSE_VERIFY: Set to 'false' to skip SSL certificate verification (not recommended for production)
                # self.ch_verify = str(ch_config.get('CLICKHOUSE_VERIFY', 'true')).lower() == 'true'
                
                self.credentials_valid = True
                
            except json.JSONDecodeError as e:
                logging.error(f"Failed to parse ClickHouse config from {tdb_id}: {str(e)}")
                print(f"Failed to parse ClickHouse config from {tdb_id}: {str(e)}")
        else:
            # No config found for this client/env
            print(f"ClickHouse config not found for {tdb_id}")
        
    def connect(self):
        """Establish connection to ClickHouse"""
        if not self.credentials_valid:
            logging.error("ClickHouse credentials not configured")
            print("ClickHouse credentials not configured")
            return False
        
        try:
            print(f"Connecting to ClickHouse: {self.ch_host}:{self.ch_port} (secure={self.ch_secure})")
            
            self.client = clickhouse_connect.get_client(
                host=self.ch_host,
                port=self.ch_port,
                username=self.ch_user,
                password=self.ch_password,
                database=self.ch_database,
                secure=self.ch_secure,
                connect_timeout=30,
                send_receive_timeout=300
            )
            return True
        except Exception as e:
            logging.error(f"ClickHouse connection error: {str(e)}")
            print(f"ClickHouse connection error: {str(e)}")
            return False
    
    def connection_check(self):
        """Check if connection is valid"""
        if not self.client:
            self.connect()
        result = self.client.query("SELECT 1")
        print(f"ClickHouse Connected: {self.ch_host}:{self.ch_port} db={self.ch_database}")
        return True
    
    def close(self):
        """Close the connection"""
        if self.client:
            self.client.close()
            self.client = None

def get_database_name(client_name: str, env: str) -> str:
    """
    Build the ClickHouse database name from client and environment.
    
    Args:
        client_name: Name of the client (e.g., 'primark')
        env: Environment (e.g., 'test')
    
    Returns:
        str: Database name in the format client_env (e.g., 'primark_test')
    """
    return f"{client_name}_{env}"


def sync_table(client, table_name: str, csv_path: str, database: str):
    """
    Atomically sync a CSV file to a ClickHouse table using EXCHANGE TABLES.
    
    This function:
    1. Creates a temporary table with the same structure as the target
    2. Loads the CSV data into the temporary table
    3. Atomically exchanges the tables using EXCHANGE TABLES
    4. Drops the old table (now named as temp)
    
    Args:
        client: ClickHouse client connection
        table_name: Table name (may include database prefix, which will be replaced)
        csv_path: Path to the CSV file to sync
        database: ClickHouse database name (client_env)
    
    Returns:
        bool: True if sync successful, False otherwise
    """
    if not os.path.isfile(csv_path):
        logging.error(f"CSV file not found: {csv_path}")
        print(f"CSV file not found: {csv_path}")
        return False
    
    # Extract table name, stripping any existing database prefix
    table = table_name.split('.')[-1] if '.' in table_name else table_name
    full_table_name = f"{database}.{table}"
    
    temp_table_name = f"{database}.temp_{table}_{int(time.time())}"
    
    try:
        # Step 1: Check if target table exists
        exists_result = client.query(
            f"SELECT count() FROM system.tables WHERE database = '{database}' AND name = '{table}'"
        )
        if exists_result.result_rows[0][0] == 0:
            logging.error(f"Target table {full_table_name} does not exist")
            print(f"Target table {full_table_name} does not exist")
            return False
        
        # Step 2: Get the CREATE TABLE statement for the target table
        create_result = client.query(f"SHOW CREATE TABLE {full_table_name}")
        create_statement = create_result.result_rows[0][0]
        
        # Modify CREATE statement for temp table
        temp_create_statement = create_statement.replace(
            f"CREATE TABLE {database}.{table}",
            f"CREATE TABLE {temp_table_name}"
        ).replace(
            f"CREATE TABLE {table}",
            f"CREATE TABLE {temp_table_name}"
        )
        
        # Step 3: Create the temporary table
        client.command(temp_create_statement)
        print(f"Created temporary table: {temp_table_name}")
        
        # Step 4: Stream CSV directly into temp table using ClickHouse's native CSV parser
        # This is more efficient than loading into Python memory first
        with open(csv_path, 'rb') as f:
            client.command(f"INSERT INTO {temp_table_name} FORMAT CSVWithNames", data=f.read())
        
        # Get row count for logging
        count_result = client.query(f"SELECT count() FROM {temp_table_name}")
        row_count = count_result.result_rows[0][0]
        print(f"Inserted {row_count} rows into {temp_table_name}")
        
        # Step 6: Atomically exchange tables
        client.command(f"EXCHANGE TABLES {full_table_name} AND {temp_table_name}")
        print(f"Exchanged tables: {full_table_name} <-> {temp_table_name}")
        
        # Step 7: Drop the temporary table
        client.command(f"DROP TABLE IF EXISTS {temp_table_name}")
        print(f"Dropped temporary table: {temp_table_name}")
        
        print(f"Successfully synced {csv_path} to {full_table_name}")
        return True
        
    except Exception as e:
        error_msg = f"Error syncing {csv_path} to {full_table_name}: {str(e)}"
        logging.error(error_msg)
        print(error_msg)
        
        # Cleanup: try to drop temp table if it exists
        try:
            client.command(f"DROP TABLE IF EXISTS {temp_table_name}")
        except:
            pass
        
        return False

def run_clickhouse_sync(client_name: str, application: str, env: str):
    """
    Main function to run ClickHouse sync for a client.
    
    Args:
        client_name: Name of the client
        env: Environment (dev, staging, prod)
        base_path: Base path to the database directory (defaults to current directory)
    
    Returns:
        bool: True if all syncs successful, False otherwise
    """
    
    print(Fore.CYAN + f"Starting ClickHouse sync for client: {client_name}, env: {env}")
    print(Style.RESET_ALL)
    
    # Initialize ClickHouse connection
    ch_sync = ClickHouseSync(client_name, application, env)
    
    try:
        # Check connection
        if not ch_sync.connect():
            print(Fore.RED + f"Failed to connect to ClickHouse for {client_name}")
            print(Style.RESET_ALL)
            return False
        
        ch_sync.connection_check()
        
        # Build database name from client and env
        database = get_database_name(client_name, env)
        print(f"Using ClickHouse database: {database}")
        
        # Get CSV files to sync for the specified application
        csv_files = csv_readers.get_csv_files_to_sync(client_name, application)
        
        if not csv_files:
            print(f"No CSV files found for ClickHouse sync")
            return True
        
        print(f"Found {len(csv_files)} CSV files to sync")
        
        # Sync each table
        success_count = 0
        error_count = 0
        sync_map = {}
        
        start_time = time.time()
        
        for idx, file_info in enumerate(csv_files, 1):
            table_name = file_info['table_name']
            csv_path = file_info['csv_path']
            
            print(f"\n[{idx}/{len(csv_files)}] Syncing: {table_name}")
            
            try:
                if sync_table(ch_sync.client, table_name, csv_path, database):
                    success_count += 1
                else:
                    error_count += 1
                    sync_map[table_name] = True
            except Exception as e:
                error_msg = f"Error syncing {table_name}: {str(e)}"
                logging.error(error_msg)
                print(error_msg)
                error_count += 1
                sync_map[table_name] = True
        
        end_time = time.time()
        
        print(Fore.GREEN + f"\nClickHouse sync completed:")
        print(f"  Success: {success_count}")
        print(f"  Errors: {error_count}")
        print(f"  Time elapsed: {end_time - start_time:.2f} seconds")
        print(Style.RESET_ALL)
        
        return error_count == 0
        
    except Exception as e:
        logging.error(f"ClickHouse sync error: {str(e)}")
        print(Fore.RED + f"ClickHouse sync error: {str(e)}")
        print(Style.RESET_ALL)
        return False
    
    finally:
        ch_sync.close()


# Main execution when run directly
if __name__ == '__main__':
    if len(sys.argv) < 4:
        sys.exit(1)
    
    choice = sys.argv[1]
    client = sys.argv[2]
    application = sys.argv[3]
    env = sys.argv[4]
    
    # Configure logging
    logging.basicConfig(
        filename=f'clickhouse_sync_error_{client}_{env}.txt',
        level=logging.ERROR,
        format='%(asctime)s:%(levelname)s:%(message)s'
    )
    
    # Setup environment
    setup_env(env)
    
    # Run sync
    if choice == 'clickhouse_data_sync':
        success = run_clickhouse_sync(client, application, env)
    
    sys.exit(0 if success else 1)
