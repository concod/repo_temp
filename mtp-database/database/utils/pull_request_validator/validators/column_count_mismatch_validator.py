# Standard library imports
import traceback
from typing import Dict, List

# Local application imports
from ..table import Table
from .base import Validator
from ..formatters import ConsoleFormatter
from ..pipeline_exception import MissingValuesInvalidLine, ExtraValuesInvalidLine, InvalidMetadata, InvalidTable


class ColumnCountMismatchValidator(Validator):
    """
    Validates column count mismatches in CSV tables.
    Checks for missing values (None values) or extra values (unexpected columns) 
    in each row of the CSV files to ensure data integrity.
    """
    
    def _validate_constraint(self, client: str, table_name: str, table_objs: List[Table]) -> None:
        """
        Validate column count for all rows in all table paths for a given table.
        Identifies rows with missing values (None in values) or extra columns (None in keys).
        
        Args:
            client (str): Client name for conflict reporting
            table_name (str): Table name for conflict reporting
            table_objs (List[Table]): List of table objects to validate (main + segregated)
        """
        # Process each table object (main table and segregated tables)
        for table_obj in table_objs:
            try:
                # Read CSV data from the table file
                data_rows = self.csv_reader.read_csv_file(table_obj.table_file_path)
                
                # Process each row to check for column count issues
                for line_number, row in enumerate(data_rows):
                    # Create metadata for this row for conflict reporting
                    meta = InvalidMetadata(
                        table_path=table_obj.table_file_path,
                        line_number=line_number + 2,  # +2 to account for header row and 0-based indexing
                        line=row  # Include the actual row data for debugging
                    )
                    
                    # Create a filtered row dictionary (currently no filtering applied)
                    # This could be extended to remove columns that should be skipped from validation
                    filtered_row = {key: value for key, value in row.items()}
                    
                    # Check for missing values - occurs when CSV has fewer columns than expected
                    if None in filtered_row.values():
                        # Mark this line number as invalid to skip in other validators
                        table_obj.invalid_linenumber.add(line_number)
                        
                        # Report missing values conflict
                        self.conflict_manager.add_conflict(
                            client, table_name, MissingValuesInvalidLine(meta=[meta])
                        )
                    
                    # Check for extra values - occurs when CSV has more columns than expected
                    # This happens when there are unnamed columns (None keys)
                    if None in filtered_row.keys():
                        # Mark this line number as invalid to skip in other validators
                        table_obj.invalid_linenumber.add(line_number)
                        
                        # Report extra values conflict
                        self.conflict_manager.add_conflict(
                            client, table_name, ExtraValuesInvalidLine(meta=[meta])
                        )
            except Exception as exc:
                # Record any errors encountered while processing this table
                self.conflict_manager.add_conflict(
                    client, table_name, InvalidTable(traceback=traceback.format_exc())
                )

    def validate(self, tables: Dict[str, Table], client: str) -> None:
        """
        Validate column count mismatches for all tables of a client.
        Entry point that iterates through all tables and calls the constraint validation.
        
        Args:
            tables (Dict[str, Table]): Dictionary of table objects to validate
            client (str): Client name for context-specific validation
        """
        try:
            # Process each table for column count validation
            for table_name, table_obj in tables.items():
                # Validate both main table and any segregated child tables
                self._validate_constraint(client, table_name, [table_obj] + table_obj.segregated_child_tables)
        except Exception as exc:
            # Log any unexpected errors during validation
            ConsoleFormatter.print_red(f"Error in ColumnCountMismatchValidator: {exc}")
