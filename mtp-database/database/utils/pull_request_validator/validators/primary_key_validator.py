# Standard library imports
import traceback
from typing import Dict, List

# Local application imports
from ..table import Table, Constraints
from ..formatters import ConsoleFormatter
from ..pipeline_exception import PrimaryKeyConflict, InvalidMetadata, InvalidTable
from .base import Validator


class PrimaryKeyValidator(Validator):
    """
    Validates primary key and unique constraints in tables.
    Ensures that primary keys and unique constraints are not violated across CSV data.
    """
    
    def validate(self, tables: Dict[str, Table], client: str) -> None:
        """
        Validate primary keys and unique constraints for all tables of a client.
        Iterates through each table and validates all unique constraints.
        
        Args:
            tables (Dict[str, Table]): Dictionary of table objects to validate
            client (str): Client name for context-specific validation
        """
        try:
            # Process each table for primary key and unique constraint validation
            for table_name, table_obj in tables.items():
                # Include both main table and any segregated child tables
                table_objs = [table_obj] + table_obj.segregated_child_tables
                
                # Get all unique constraints (including primary key) for this table
                all_constraints = table_obj.unique_constraints

                # Validate each constraint across all table objects
                for constraint in all_constraints:
                    self._validate_constraint(client, table_name, table_objs, constraint)
        except Exception as exc:
            # Log any unexpected errors during validation
            traceback.print_exc()
            ConsoleFormatter.print_red(f"Error in primary key validation: {exc}")
    
    def _validate_constraint(self, client: str, table_name: str, table_objs: List[Table], constraint: Constraints) -> None:
        """
        Validate a single constraint (primary key or unique) across all table paths.
        Tracks composite key values and identifies duplicates.
        
        Args:
            client (str): Client name for conflict reporting
            table_name (str): Table name for conflict reporting
            table_objs (List[Table]): List of table objects to validate (main + segregated)
            constraint (Constraints): The constraint to validate
        """
        # Dictionary to track primary key values and their metadata
        pk_value_to_metadata = {}
        
        # Get the parent table object for storing primary key values
        parent_table_obj = table_objs[0]
        
        # Process each table object (main table and segregated tables)
        for table_obj in table_objs:
            try:
                # Read CSV data from the table file
                data_rows = self.csv_reader.read_csv_file(table_obj.table_file_path)
                
                # Process each row to check constraint violations
                for line_number, row in enumerate(data_rows):
                    # Create composite key from constraint columns
                    try:
                        # Build tuple of values for all columns in the constraint
                        pk_values = tuple(row[column_obj.column_name] for column_obj in constraint.contraint_columns)
                    except KeyError:
                        # Skip this row if constraint column doesn't exist in CSV
                        continue
                        
                    # Store primary key values for foreign key validation later
                    parent_table_obj.add_unique_constraint_values(tuple(constraint.contraint_columns), pk_values)
                    
                    # Create metadata for this row
                    meta = InvalidMetadata(
                        table_path=table_obj.table_file_path,
                        line_number=line_number + 2  # +2 to account for header row and 0-based indexing
                    )
                    
                    # Check if this primary key value already exists
                    if pk_values in pk_value_to_metadata:
                        # Add this occurrence to the list of duplicates
                        pk_value_to_metadata[pk_values].append(meta)
                        
                        # Report conflict when we find the second occurrence (first duplicate)
                        if len(pk_value_to_metadata[pk_values]) == 2:
                            self.conflict_manager.add_conflict(
                                client, table_name, PrimaryKeyConflict(
                                    key_columns=[column_obj.column_name for column_obj in constraint.contraint_columns],
                                    key_values=pk_values,
                                    duplicates=pk_value_to_metadata[pk_values],
                                    constraint_name=constraint.constraint_name
                                )
                            )
                    else:
                        # First occurrence of this primary key value
                        pk_value_to_metadata[pk_values] = [meta]
            except Exception:
                # Record any errors encountered while processing this table
                self.conflict_manager.add_conflict(
                    client, table_name, InvalidTable(traceback=traceback.format_exc())
                )

