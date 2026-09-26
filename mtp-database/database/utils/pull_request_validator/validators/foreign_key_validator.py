# Standard library imports
import traceback
from collections import defaultdict
from typing import Dict, List

# Local application imports
from .base import Validator
from ..table import Table, Column
from ..formatters import ConsoleFormatter
from ..pipeline_exception import ForeignKeyConflict, InvalidMetadata


class ForeignKeyValidator(Validator):
    """
    Validates foreign key relationships between tables.
    Checks that foreign key values in CSV data exist in the referenced tables,
    ensuring referential integrity across the data set.
    """
    
    def validate(self, tables: Dict[str, Table], client: str):
        """
        Entry point for foreign key validation across all tables.
        Iterates through tables and validates foreign key constraints for each.
        
        Args:
            tables (Dict[str, Table]): Dictionary of table objects to validate
            client (str): Client name for context-specific validation
        """
        # Process each table to check foreign key relationships
        for table_name, table_obj in tables.items():            
            # Only validate tables that have foreign key columns
            if table_obj.foreign_keys:
                self._validate_foreign_key(
                    client, 
                    table_name, 
                    [table_obj] + table_obj.segregated_child_tables,  # Include segregated tables
                    table_obj.foreign_keys
                )
    
    def _validate_foreign_key(self, client: str, table_name: str, table_objs: List[Table], foreign_key_columns: List[Column]):
        """
        Validate foreign key constraints for a specific table across all its paths.
        Checks that each foreign key value exists in the referenced table's primary keys.
        
        Args:
            client (str): Client name for conflict reporting
            table_name (str): Table name for conflict reporting
            table_objs (List[Table]): List of table objects to validate (main + segregated)
            foreign_key_columns (List[Column]): List of columns with foreign key constraints
        """
        try:
            # Process each table object (main table and segregated tables)
            for table_obj in table_objs:
                # Read CSV data from the table file
                data_rows = self.csv_reader.read_csv_file(table_obj.table_file_path)
                

                issue_map = defaultdict(dict)
                # Process each row to validate foreign key values
                for line_number, row in enumerate(data_rows):
                    try:
                        # Check each foreign key column in this row
                        for column in foreign_key_columns:
                            column_value: str = row[column.column_name]

                            # Skip empty/null foreign key values (typically allowed)
                            if not column_value or column_value.lower() == 'null':
                                continue
                                
                            # Check if foreign key value exists in the referenced table
                            # Convert to tuple format to match primary key storage format
                            foreign_key_value = tuple([column_value])
                            
                            # Validate against the referenced table's primary key values
                            if foreign_key_value not in column.foreign_key_reference.unique_constraint_values[tuple([column.foreign_key_reference_column])]:
                                # Foreign key violation found - create metadata for reporting
                                meta = InvalidMetadata(
                                    table_path=table_obj.table_file_path,
                                    line_number=line_number + 2  # +2 to account for header row and 0-based indexing
                                )
                                
                                if column_value in issue_map[column.column_name]:
                                    foreign_key_conflict: ForeignKeyConflict = issue_map[column.column_name][column_value]
                                    foreign_key_conflict.meta.append(meta)
                                else:
                                    # Create foreign key conflict object
                                    foreign_key_conflict = ForeignKeyConflict(
                                        key_columns=[column.column_name],
                                        key_values=[column_value],
                                        meta=[meta],
                                        reference_table=column.foreign_key_reference.table_name
                                    )
                                    issue_map[column.column_name][column_value] = foreign_key_conflict
                                    # Report the foreign key violation
                                    self.conflict_manager.add_conflict(
                                        client, table_name, foreign_key_conflict
                                    )
                    except KeyError as e:
                        # Skip rows where foreign key column doesn't exist in CSV
                        # This is handled by other validators (column mismatch)
                        pass
                    except Exception as e:
                        # Log any unexpected errors during row validation
                        traceback.print_exc()
                        ConsoleFormatter.print_red(f"Error in foreign key row validation: {e}")
        except Exception as e:
            # Log any unexpected errors during table validation
            traceback.print_exc()
            ConsoleFormatter.print_red(f"Error in foreign key validation: {e}")
