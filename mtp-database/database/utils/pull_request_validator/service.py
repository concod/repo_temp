# Standard library imports
import time
import json
import os
from typing import Dict, List, Set, Type

# Local application imports
from .formatters import ConsoleFormatter
from .config import ConfigurationLoader
from .readers import CSVDataReader, TableFinder
from .conflict_manager import ConflictManager
from .pipeline_exception import PipelineException
from .validators import (
    PrimaryKeyValidator, SegregatedDataValidator, ColumnCountMismatchValidator,
    DataTypeValidator, ForeignKeyValidator, Validator
)
from .git import GitUtils
from .table import Table


class ValidationService:
    """
    Orchestrates the validation process for all clients and tables.
    Handles loading, running, and reporting of all validation checks.
    Supports separate validation for inventory and non_inventory replication databases.
    """
    
    def __init__(self, base_path: str = "./database", env: str = "dev"):
        """
        Initialize the validation service with required components.
        
        Args:
            base_path (str): Base path to the database directory
            env (str): Environment to validate against (dev, test, prod)
        """
        # Initialize configuration loader to read validation settings
        self.config_loader = ConfigurationLoader(base_path)
        
        # Initialize CSV reader for processing data files
        self.csv_reader = CSVDataReader()
        
        # Initialize table finder for discovering CSV files
        self.table_finder = TableFinder(self.config_loader)
        
        # Initialize conflict manager for tracking validation errors
        self.conflicts_manager = ConflictManager()
        
        # Define the list of validators to run in order
        self.validators: List[Type[Validator]] = [
            ColumnCountMismatchValidator,  # Check for missing/extra columns
            DataTypeValidator,             # Validate data type consistency
            PrimaryKeyValidator,           # Check primary key constraints
            SegregatedDataValidator,       # Validate segregated data rules
            ForeignKeyValidator           # Check foreign key relationships
        ]
        self.env = env
        
        # Cache for schema database mapping
        self._schema_db_mapping = None

    def _load_schema_db_mapping(self) -> Dict:
        """
        Load the schema database mapping configuration from JSON file.
        
        Returns:
            Dict: Schema database mapping configuration
        """
        if self._schema_db_mapping is None:
            mapping_path = os.path.join(self.config_loader.base_path, "utils/schema_db_mapping.json")
            with open(mapping_path, 'r') as file:
                self._schema_db_mapping = json.load(file)
        return self._schema_db_mapping
    
    def _get_segregated_tables_to_exclude(self) -> Set[str]:
        """
        Get set of table names that should be excluded from non_inventory validation
        but kept available for foreign key validations.
        
        Returns:
            Set[str]: Set of table names to exclude from validation
        """
        segregated_validation = self.config_loader.segregated_data_validation
        common_tables = segregated_validation.get("common", {})
        return set(common_tables.keys())
    
    def _filter_tables_by_replication_schema(self, tables: Dict[str, Table], client: str, 
                                           replication_value: str) -> Dict[str, Table]:
        """
        Filter tables based on replication schema mapping.
        
        Args:
            tables (Dict[str, Table]): Dictionary of table objects
            client (str): Client name
            replication_value (str): Either 'inventory' or 'non_inventory'
            
        Returns:
            Dict[str, Table]: Filtered tables based on replication schemas
        """
        schema_mapping = self._load_schema_db_mapping()
        
        # Check if client has replication mapping
        if client not in schema_mapping:
            ConsoleFormatter.print_yellow(f"No replication mapping found for client {client}")
            return tables
        
        client_replication_data = schema_mapping[client]
        
        # Find the replication configuration for the requested value
        replication_config = None
        for config in client_replication_data:
            if config['replication_value'] == replication_value:
                replication_config = config
                break
        
        if not replication_config:
            ConsoleFormatter.print_yellow(f"No {replication_value} replication config found for client {client}")
            return {}
        
        # Get schemas for this replication type
        allowed_schemas = set(replication_config['schemas'])
        
        # Always include global schema for non_inventory validation
        if replication_value == 'non_inventory':
            allowed_schemas.add('global')
        
        # For inventory and other replication values, use the configured schemas
        filtered_tables = {}
        for table_name, table_obj in tables.items():
            table_schema = table_obj.schema
            if table_schema in allowed_schemas:
                filtered_tables[table_name] = table_obj
        
        return filtered_tables
    
    
    def _get_database_connection_suffix(self, replication_value: str = None) -> str:
        """
        Get the database connection suffix based on replication type.
        
        Args:
            replication_value (str): Either 'inventory', 'non_inventory', or None
            
        Returns:
            str: Database connection suffix
        """
        if replication_value == 'non_inventory':
            return '_non_inventory'
        return ''
    

    def can_validate_client(self, affected_files: Set[str], tables: Dict[str, Table]) -> bool:
        """
        Determine if we can validate a client based on the affected files.
        If no files are affected, all clients can be validated.
        
        Args:
            affected_files (Set[str]): Set of files affected in the PR
            tables (Dict[str, Table]): Dictionary of tables for the client
            
        Returns:
            bool: True if client can be validated, False otherwise
        """
        # If no files are affected, validate all clients
        if not affected_files:
            return True
            
        # Check if any table file is in the affected files
        for table, table_obj in tables.items():
            table_objs = [table_obj] + table_obj.segregated_child_tables
            for table_obj in table_objs:
                # Remove leading './' from path for comparison
                if table_obj.table_file_path[2:] in affected_files:
                    return True
        return False
    
    def _get_replicated_clients(self) -> List[str]:
        """
        Get list of clients that have replication configuration.
        
        Returns:
            List[str]: List of client names that have replication configured
        """
        schema_mapping = self._load_schema_db_mapping()
        return list(schema_mapping.keys())
    
    def _client_has_replication_value(self, client: str, replication_value: str) -> bool:
        """
        Check if a client has a specific replication value configured.
        
        Args:
            client (str): Client name
            replication_value (str): Either 'inventory' or 'non_inventory'
            
        Returns:
            bool: True if client has the replication value configured
        """
        schema_mapping = self._load_schema_db_mapping()
        if client not in schema_mapping:
            return False
        
        client_replication_data = schema_mapping[client]
        return any(config['replication_value'] == replication_value for config in client_replication_data)

    def run_validation(self, clients: List[str] = None, validated_only_affected_files: bool = False, 
                      replication_value: str = None) -> Dict[str, Dict[str, List[PipelineException]]]:
        """
        Run all validations for the specified clients and return the conflicts found.
        
        Args:
            clients (List[str], optional): List of clients to validate. If None, validate all.
            validated_only_affected_files (bool): Whether to only validate affected files
            replication_value (str, optional): Either 'inventory' or 'non_inventory' for replication-specific validation
            
        Returns:
            Dict[str, Dict[str, List[PipelineException]]]: Conflicts grouped by client and table
        """
        # Record start time for performance tracking
        start_time = time.time()
        
        # Get files affected by the current pull request
        affected_files = GitUtils.get_pull_request_files(ends_with=".csv")
        # comment below condition for running validation on all files and not just affected_files
        if validated_only_affected_files and not affected_files:
            ConsoleFormatter.print_yellow("No affected files found. Skipping validation.")
            return {}
        
        # Display validation type
        validation_type = f" --VALIDATING {replication_value.upper()} PR CSVs--" if replication_value else "--VALIDATING PR CSVs--"
        ConsoleFormatter.print_yellow("="*100)
        ConsoleFormatter.print_yellow(validation_type)
        ConsoleFormatter.print('\n'*3)
        
        # Get common tables that apply to all clients
        common_data_path = f'{self.config_loader.base_path}/data'
        common_tables_paths = self.table_finder.find_csv_files(common_data_path)
        common_table_dict = self.table_finder.preprocess_tables(common_tables_paths)

        # Display affected CSV files if any
        if affected_files:
            print('Affected CSV files:')
            # Loop through affected files to display them
            for file in affected_files:
                print(file)
            print('\n'*2)
        
        # Process each client or use default client list
        clients = clients or self.config_loader.clients
        validated_any_client_flag = False
        
        # Get tables to exclude for different replication types
        segregated_tables_set = self._get_segregated_tables_to_exclude()
        
        # Handle segregated tables based on replication type
        if replication_value == 'inventory':
            # For inventory: validate segregated tables (keep them in validation)
            if segregated_tables_set:
                ConsoleFormatter.print_yellow(f"For inventory replication, including segregated data validation csvs: {segregated_tables_set}")
        elif replication_value == 'non_inventory':
            # For non_inventory: exclude segregated tables from validation but keep for FK references
            if segregated_tables_set:
                ConsoleFormatter.print_yellow(f"For non_inventory replication, including segregated data validation csvs: {segregated_tables_set}")
        
        # Loop through each client to perform validation
        for client in clients:
            # Check if client supports replication if replication_value is specified
            if replication_value:
                schema_mapping = self._load_schema_db_mapping()
                if client not in schema_mapping:
                    ConsoleFormatter.print_yellow(f"Skipping client {client} - no replication mapping found")
                    continue
                
                # Check if the specific replication value exists for this client
                client_replication_data = schema_mapping[client]
                replication_exists = any(config['replication_value'] == replication_value for config in client_replication_data)
                if not replication_exists:
                    ConsoleFormatter.print_yellow(f"Skipping client {client} - no {replication_value} replication found")
                    continue
            
            # Get client-specific tables
            client_data_path = f'{self.config_loader.base_path}/{client}/data'
            client_tables_paths = self.table_finder.find_csv_files(client_data_path)
            client_table_dict = self.table_finder.preprocess_tables(client_tables_paths)
            
            # Combine common and client-specific tables
            combined_table_dict = {**common_table_dict, **client_table_dict}
            
            # Create appropriate database connection suffix for replication
            db_suffix = self._get_database_connection_suffix(replication_value)
            env_for_db = self.env + db_suffix if replication_value else self.env
            
            # Get segregated tables for the client
            tables = self.table_finder.get_combined_segregated_tables(client, env_for_db, combined_table_dict)
            
            # Filter tables based on replication schema if specified
            if replication_value:
                tables = self._filter_tables_by_replication_schema(tables, client, replication_value)
            
            # Skip client if it cannot be validated based on affected files
            if not self.can_validate_client(affected_files, tables):
                continue
                
            if not tables:
                ConsoleFormatter.print_yellow(f"No tables found for client {client} with {replication_value} replication")
                continue
                
            replication_suffix = f" ({replication_value})" if replication_value else ""
            print(f'Validating client {client}{replication_suffix}')
            validated_any_client_flag = True

            # Load schema information from database with appropriate connection
            self.table_finder.load_schema_from_db()
            
            # Run each validator on the client's tables
            for validator in self.validators:
                validator(self.config_loader, self.csv_reader, self.conflicts_manager).validate(tables, client)
            print('-'*80)
            
        # Check if any client was validated
        if not validated_any_client_flag:
            ConsoleFormatter.print_red("Changed CSV files was not validated. Path were not included in any client!!")
            
        # Report all validation results
        self.conflicts_manager.print_conflicts()
        ConsoleFormatter.print('\n'*3)
        ConsoleFormatter.print_yellow('--END--')
        ConsoleFormatter.print_yellow("="*100)
        
        # Calculate and display validation time
        end_time = time.time()
        replication_suffix = f" ({replication_value})" if replication_value else ""
        ConsoleFormatter.print(f"Validation{replication_suffix} time taken: {end_time - start_time:.2f} seconds")
        
        return self.conflicts_manager.conflicts

    def run_inventory_validation(self, clients: List[str] = None, validated_only_affected_files: bool = False) -> Dict[str, Dict[str, List[PipelineException]]]:
        """
        Run validation specifically for inventory replication schemas.
        Excludes segregated data validation tables as they will be validated from inventory replication db.
        
        Args:
            clients (List[str], optional): List of clients to validate. If None, validate all.
            validated_only_affected_files (bool): Whether to only validate affected files
            
        Returns:
            Dict[str, Dict[str, List[PipelineException]]]: Conflicts grouped by client and table
        """
        return self.run_validation(clients, validated_only_affected_files, 'inventory')
    
    def run_non_inventory_validation(self, clients: List[str] = None, validated_only_affected_files: bool = False) -> Dict[str, Dict[str, List[PipelineException]]]:
        """
        Run validation specifically for non_inventory replication schemas.
        
        Args:
            clients (List[str], optional): List of clients to validate. If None, validate all.
            validated_only_affected_files (bool): Whether to only validate affected files
            
        Returns:
            Dict[str, Dict[str, List[PipelineException]]]: Conflicts grouped by client and table
        """
        return self.run_validation(clients, validated_only_affected_files, 'non_inventory') 

