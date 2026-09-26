# Standard library imports
import traceback
from typing import Dict, List

# Local application imports
from ..table import Table
from ..formatters import ConsoleFormatter
from ..pipeline_exception import InvalidMetadata, InvalidTable, SegregatedDataConflict
from .base import Validator


class SegregatedDataValidator(Validator):
    """
    Validates data segregation across schemas for a client.
    Ensures that composite keys are unique across all table paths and prevents
    data duplication between different segregated tables (e.g., global vs client-specific).
    """

    def validate(self, tables: Dict[str, Table], client: str) -> None:
        """
        Validate that data is properly segregated across schemas for all tables of a client.
        Checks that the same composite key values don't appear in multiple segregated table files.
        
        Args:
            tables (Dict[str, Table]): Dictionary of table objects to validate
            client (str): Client name for context-specific validation
        """
        try:
            # Get segregation rules for this specific client
            segregation_rules = self.config_loader.get_client_segregated_data_validation(client)
            
            # Process each table for segregation validation
            for table_name, table_obj in tables.items():
                # Include both main table and any segregated child tables
                table_objs = [table_obj] + table_obj.segregated_child_tables
                
                # Skip tables that don't have multiple paths (no segregation needed)
                if len(table_objs) < 2:
                    continue
                    
                # Get segregation rules for this specific table
                table_rules = segregation_rules.get(table_name, {})
                composite_key_validation = table_rules.get("composite_key_validation", [])
                
                # Skip if no composite key validation rules are defined
                if not composite_key_validation:
                    continue
                    
                # Ensure composite_key_validation is always a list for consistent processing
                if isinstance(composite_key_validation, str):
                    composite_key_validation = [composite_key_validation]
                    
                # Perform segregation validation for this table
                self._validate_segregation(client, table_name, table_objs, composite_key_validation)
        except Exception as exc:
            # Log any unexpected errors during validation
            ConsoleFormatter.print_red(f"Error in segregated data validation: {exc}")
    
    def _validate_segregation(self, client: str, table_name: str, table_objs: List[Table], composite_key_cols: List[str]) -> None:
        """
        Validate segregation using composite keys for a given table across all table paths.
        Ensures that the same composite key values don't appear in multiple segregated files.
        
        Args:
            client (str): Client name for conflict reporting
            table_name (str): Table name for conflict reporting
            table_objs (List[Table]): List of table objects to validate (main + segregated)
            composite_key_cols (List[str]): List of column names that form the composite key
        """
        # Dictionary to track composite keys seen across all files
        visited_keys = {}
        
        # Process each segregated table file
        for table_obj in table_objs:
            try:
                # Read CSV data from the current table file
                data_rows = self.csv_reader.read_csv_file(table_obj.table_file_path)
                
                # Dictionary to track composite keys within the current file only
                current_file_keys = {}
                
                # Process each row in the current file
                for line_number, row in enumerate(data_rows):
                    try:
                        # Build composite key from specified columns
                        composite_key = tuple(row[col] for col in composite_key_cols)
                    except KeyError:
                        # Skip if required columns don't exist in the CSV
                        continue
                        
                    # Skip duplicates within the same file (these are handled by primary key validator)
                    if composite_key in current_file_keys:
                        continue
                        
                    # Create metadata for this row
                    meta = InvalidMetadata(
                        table_path=table_obj.table_file_path,
                        line_number=line_number + 2  # +2 to account for header row and 0-based indexing
                    )
                    
                    # Check if this composite key was seen in a different file
                    if composite_key in visited_keys:
                        # Segregation violation: same key exists in multiple files
                        self.conflict_manager.add_conflict(
                            client, table_name, SegregatedDataConflict(
                                key_columns=composite_key_cols,
                                key_values=composite_key,
                                duplicates=[visited_keys[composite_key], meta]
                            )
                        )
                    
                    # Track this key for the current file
                    current_file_keys[composite_key] = meta
                
                # Update global visited keys with those found in this file
                visited_keys.update(current_file_keys)
            except Exception:
                # Record any errors encountered while processing this table
                self.conflict_manager.add_conflict(
                    client, table_name, InvalidTable(traceback=traceback.format_exc())
                )
