import csv
import sys
import os
from collections import defaultdict
from typing import Dict, List, Any, Generator
from .table import Table, TableFactory, DataTable

from .formatters import ConsoleFormatter

# Set maximum CSV field size to system maximum to handle large fields
csv.field_size_limit(sys.maxsize)
from collections import OrderedDict


class CSVDataReader:
    """Handles reading CSV data files and processing their contents."""
    
    @staticmethod
    def read_csv_file(file_path: str) -> Generator[Dict[str, Any], None, None]:
        """
        Read a CSV file and yield its contents row by row as dictionaries.
        
        Args:
            file_path (str): Path to the CSV file to read
            
        Yields:
            Dict[str, Any]: Each row as a dictionary with column names as keys
            
        Raises:
            Exception: If the file cannot be read or processed
        """
        try:
            # Open file with UTF-8 BOM support for proper encoding handling
            with open(file_path, newline='', encoding='utf-8-sig') as f:
                reader = csv.DictReader(f, skipinitialspace=True)
                
                # Process each row in the CSV file
                for row in reader:
                    _row = {}
                    # Clean and process each column in the row
                    for key, value in row.items():
                        # Strip whitespace from both key and value if they exist
                        if key and value:
                            _row[key] = value.strip()
                        elif key:
                            # Keep None values but strip key
                            _row[key] = value
                        else:
                            # Handle edge case where key is None
                            _row[key] = value
                    yield _row
        except Exception as e:
            # Log error with specific file information
            ConsoleFormatter.print_red(f"Error reading CSV file: {file_path}")
            ConsoleFormatter.print_red(f"Error: {e}")
            raise


class TableFinder:
    """Finds and processes CSV table files for validation."""
    
    def __init__(self, config_loader):
        """
        Initialize the TableFinder with configuration.
        
        Args:
            config_loader: Configuration loader instance for validation settings
        """
        self.config_loader = config_loader
        self.factory: TableFactory = None
        self.tables: Dict[str, Table] = {}
    
    def find_csv_files(self, base_dir: str) -> List[str]:
        """
        Find all CSV files in allowed schema directories.
        
        Args:
            base_dir (str): Base directory to search for CSV files
            
        Returns:
            List[str]: List of full paths to valid CSV files
        """
        csv_files = []
        
        # Walk through all directories starting from base_dir
        for root, _, files in os.walk(base_dir):
            # Check each file in the current directory
            for file in files:
                # Only process CSV files
                if file.endswith('.csv'):
                    full_path = os.path.join(root, file)
                    path_parts = full_path.split('/')
                    
                    # Skip files with insufficient path depth
                    if len(path_parts) < 2:
                        continue
                        
                    # Extract schema name from path (second to last component)
                    schema = path_parts[-2]
                    
                    # Only include files from allowed schema directories
                    if schema in self.config_loader.allowed_schema_dirs:
                        csv_files.append(full_path)
        return csv_files
    
    def preprocess_tables(self, tables_path_list: List[str]) -> Dict[str, str]:
        """
        Create a dictionary mapping table names to their file paths.
        
        Args:
            tables_path_list (List[str]): List of table file paths
            
        Returns:
            Dict[str, str]: Mapping of 'schema.table' names to file paths
        """
        tables_dict = {}
        
        # Process each table path to create name mapping
        for table_path in tables_path_list:
            path_parts = table_path.split('/')
            schema = path_parts[-2]  # Second to last part is schema
            table = path_parts[-1].split('.')[0]  # Last part without extension is table name
            table_name = f"{schema}.{table}"  # Create fully qualified table name
            tables_dict[table_name] = table_path
        return tables_dict

    def __mark_segregated_tables(self, segregated_tables: Dict[str, List[Table]]):
        """
        Mark tables as segregated and establish parent-child relationships.
        
        Args:
            segregated_tables (Dict[str, List[Table]]): Tables grouped by name
        """
        # Process each group of tables with the same name
        for table_name, table_objs in segregated_tables.items():
            # Skip if there's only one table (no segregation needed)
            if len(table_objs) < 2:
                continue

            # Sort tables with global tables first (they become parent tables)
            table_objs.sort(key=lambda table: 0 if '/global/' in table.table_file_path else 1)

            # First table (global) becomes the parent
            parent_table_obj = table_objs[0]
            
            # Keep global tables and tables with the same path length
            global_table_path_length = len(table_objs[0].table_file_path.split('/'))
            
            # Mark remaining tables as segregated children
            for table_obj in table_objs[1:]:
                # Only mark tables with sufficient path depth as segregated
                if len(table_obj.table_file_path.split('/')) >= global_table_path_length:
                    table_obj.is_segregated_table = True
                    table_obj.segregated_parent_table = parent_table_obj
                    parent_table_obj.segregated_child_tables.append(table_obj)

    
    def get_combined_segregated_tables(self, client, env, client_table_name_to_path_dict: Dict[str, str]) -> Dict[str, Table]:
        """
        Group tables by their base name and sort them with global tables first.
        
        Args:
            client: Client name for table processing
            env: Environment for table processing
            client_table_name_to_path_dict (Dict[str, str]): Mapping of table names to paths
            
        Returns:
            Dict[str, Table]: Dictionary of processed Table objects
        """
        tables: Dict[str, Table] = {}
        
        # Get client-specific configuration
        allowed_segregated_tables = self.config_loader.get_client_segregated_data_validation(client)
        allowed_sync_tables = self.config_loader.get_client_primary_key_mapping(client)
        
        segregated_tables = defaultdict(list)
        self.factory = TableFactory(client, env)
        
        # Group tables by base name for segregation processing
        for full_table_name, table_path in client_table_name_to_path_dict.items():
            table_name = full_table_name.split('.')[1]  # Extract table name without schema
            
            # Skip tables that are not allowed to be synced
            if table_name not in allowed_sync_tables:
                continue
                
            # Create Table object using factory
            table_obj = self.factory.get_table(table_path)
            
            # Group segregated tables for parent-child relationship processing
            if table_name in allowed_segregated_tables:
                segregated_tables[table_name].append(table_obj)

            # Add non-segregated tables or global tables directly to main tables dict
            if table_name not in allowed_segregated_tables or 'global.' in full_table_name:
                tables[full_table_name] = table_obj

        # Establish segregated table relationships
        self.__mark_segregated_tables(segregated_tables)
        self.tables = tables
        return tables 
    
    def apply_foreign_key_constraints(self, foreign_key_constraints: List[Dict[str, str]]):
        """
        Apply foreign key constraints to table objects.
        
        Args:
            foreign_key_constraints (List[Dict[str, str]]): List of foreign key constraint definitions
        """
        # Process each foreign key constraint
        for constraint in foreign_key_constraints:
            # Construct full table names
            full_table_name = f"{constraint['table_schema']}.{constraint['table_name']}"
            full_reference_table_name = f"{constraint['referenced_table_schema']}.{constraint['referenced_table_name']}"

            reference_table_column = constraint['referenced_column_name']

            if full_table_name not in self.tables:
                continue

            # Get the table object that has the foreign key
            full_table_obj = self.tables[full_table_name]
            
            # Check if referenced table exists in our table set
            if full_reference_table_name in self.tables:
                full_reference_table_obj = self.tables[full_reference_table_name]

            else:
                # Create a data table object for external reference
                full_reference_table_obj = self.factory.get_data_table(constraint['referenced_table_schema'], constraint['referenced_table_name'], constraint['referenced_column_name'])

            # Set up the foreign key relationship
            join_column_name = constraint['column_name']
            join_column_obj = full_table_obj.get_column_dict()[join_column_name]

            reference_join_column_name = constraint['referenced_column_name']
            reference_join_column_obj = full_reference_table_obj.get_column_dict()[reference_join_column_name]
            # Foreign key always references the primary key of the referenced table
            join_column_obj.foreign_key_reference = full_reference_table_obj
            join_column_obj.foreign_key_reference_column = reference_join_column_obj


    def load_schema_from_db(self):
        """
        Load schema information from the database and apply foreign key constraints.
        """
        if self.factory:
            # Load schema metadata from database
            self.factory.load_schemas()
            
            # Get foreign key constraints and apply them to tables
            foreign_key_constraints = self.factory.schema_loader.all_table_foreign_keys
            self.apply_foreign_key_constraints(foreign_key_constraints)
