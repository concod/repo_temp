# Standard library imports
import re
import json
import traceback
from datetime import datetime
from typing import Dict, List

# Local application imports
from .base import Validator
from ..table import Table, Column
from ..formatters import ConsoleFormatter
from ..pipeline_exception import InvalidDataTypeValue, InvalidMetadata, InvalidTable, DBNotConnected


class DataTypeValidator(Validator):
    """
    Validator for checking data types of CSV values against expected database schema types.
    Validates each cell value against PostgreSQL data types and nullability constraints.
    Each _validate_* method handles validation for a specific PostgreSQL data type.
    """

    # === Public Interface ===
    def validate(self, tables: Dict[str, Table], client: str):
        """
        Entry point for data type validation. Checks DB connection and validates all tables.
        Validates CSV data types against database schema to ensure compatibility.
        
        Args:
            tables (Dict[str, Table]): Dictionary of table objects to validate
            client (str): Client name for context-specific validation
        """
        try:
            # Check if database connection is available for schema information
            if not self.check_db_connected(tables):
                # Cannot validate data types without database schema information
                self.conflict_manager.add_conflict(
                    client, '-', DBNotConnected(error="Skipping data type validation..")
                )
                return
                
            # Process each table for data type validation
            for table_name, table_obj in tables.items():
                # Include both main table and any segregated child tables
                table_objs = [table_obj] + table_obj.segregated_child_tables
                
                # Create column mapping for easy lookup by column name
                columns = {column.column_name: column for column in table_obj.columns}
                
                # Perform validation for this table
                self._validate(client, table_name, table_objs, columns)
        except Exception as e:
            # Log any unexpected errors during validation
            traceback.print_exc()
            ConsoleFormatter.print_red(f"Error in DataTypeValidator: {e}")

    # === Core Validation Workflow ===
    def _validate(self, client: str, table_name: str, table_objs: List[Table], columns: Dict[str, Column]):
        """
        Validate all rows in the given tables for correct data types and nullability.
        Orchestrates the validation process for a specific table across all its paths.
        
        Args:
            client (str): Client name for conflict reporting
            table_name (str): Table name for conflict reporting
            table_objs (List[Table]): List of table objects to validate (main + segregated)
            columns (Dict[str, Column]): Column definitions from database schema
        """
        # Handle case where no column information is available
        if not columns:
            self._handle_missing_columns(client, table_name, table_objs)
            return
            
        # Process each table object for data type validation
        for table_obj in table_objs:
            try:
                # Read CSV data from the table file
                data_rows = self.csv_reader.read_csv_file(table_obj.table_file_path)
                
                # Validate all rows in this table
                self._validate_table_rows(client, table_name, table_obj, data_rows, columns)
            except Exception:
                # Record any errors encountered while processing this table
                self.conflict_manager.add_conflict(
                    client, table_name, InvalidTable(traceback=traceback.format_exc())
                )

    def _validate_table_rows(self, client: str, table_name: str, table_obj: Table, data_rows: List[dict], columns: Dict[str, Column]):
        """
        Validate all rows in a single table object for data type compliance.
        
        Args:
            client (str): Client name for conflict reporting
            table_name (str): Table name for conflict reporting
            table_obj (Table): Table object being validated
            data_rows (List[dict]): CSV data rows to validate
            columns (Dict[str, Column]): Column definitions from database schema
        """
        csv_data_columns = set()
        # Track columns whose data types couldn't be validated
        unable_to_verify_data_type = dict()
        
        # Process each row in the CSV data
        for line_number, row in enumerate(data_rows):
            # Skip rows that were marked as invalid by previous validators
            if line_number in table_obj.invalid_linenumber:
                continue
                
            # Track the columns present in CSV data
            csv_data_columns = set(row.keys())
            
            # Validate this specific row
            self._validate_row(
                client, table_name, table_obj, row, line_number, columns, unable_to_verify_data_type
            )
            
        # Perform post-row validation checks (warnings, extra columns, etc.)
        self._post_row_validation(
            client, table_name, table_obj, csv_data_columns, columns, unable_to_verify_data_type
        )

    def _validate_row(self, client, table_name, table_obj, row, line_number, columns, unable_to_verify_data_type):
        """
        Validate a single row of data for data type compliance and nullability.
        
        Args:
            client: Client name for conflict reporting
            table_name: Table name for conflict reporting
            table_obj: Table object being validated
            row: Single row of CSV data as dictionary
            line_number: Row number for error reporting
            columns: Column definitions from database schema
            unable_to_verify_data_type: Dictionary to track unvalidatable columns
        """
        # Iterate through each cell in the row
        for column_name, cell_value in row.items():
            # Skip validation if column is not defined in database schema
            if not columns.get(column_name):
                continue
                
            # Check data type if value is not null
            if cell_value and cell_value.lower() != "null":
                # Validate the data type of this cell
                if not self._validate_cell_type(
                    client, table_name, table_obj, column_name, cell_value, line_number, columns, unable_to_verify_data_type, row
                ):
                    return False
            # Check nullability constraint if value is null/empty
            elif not columns.get(column_name).is_nullable:
                # Validate that non-nullable column doesn't have null value
                if not self._validate_cell_notnull(
                    client, table_name, table_obj, column_name, cell_value, line_number, columns, row
                ):
                    return False

    def _validate_cell_type(self, client, table_name, table_obj, column_name, cell_value, line_number, columns, unable_to_verify_data_type, row):
        """
        Validate the data type of a single cell against the expected database column type.
        
        Args:
            client: Client name for conflict reporting
            table_name: Table name for conflict reporting
            table_obj: Table object being validated
            column_name: Name of the column being validated
            cell_value: The actual value to validate
            line_number: Row number for error reporting
            columns: Column definitions from database schema
            unable_to_verify_data_type: Dictionary to track unvalidatable columns
            row: Complete row data for context
            
        Returns:
            bool: True if validation passes, False otherwise
        """
        # Construct validator method name from column data type
        # Convert spaces and hyphens to underscores, make lowercase
        validator_method_name = f'_validate_{columns.get(column_name).column_type}'.replace(' ', '_').replace('-', '_').lower()
        
        # Get the appropriate validator method if it exists
        validator_method = getattr(self, validator_method_name, None)
        
        if validator_method and callable(validator_method):
            # Call the specific data type validator
            is_valid = validator_method(cell_value)
            
            if not is_valid:
                # Create metadata for invalid data type
                meta = InvalidMetadata(
                    table_path=table_obj.table_file_path,
                    line_number=line_number+2  # +2 to account for header and 0-based indexing
                )
                
                # Report data type validation failure
                self.conflict_manager.add_conflict(
                    client, 
                    table=table_name,
                    conflict=InvalidDataTypeValue(
                        key_columns=[column_name],
                        key_values=[cell_value],
                        duplicates=[meta],
                        data_type=columns.get(column_name).column_type
                    )
                )
                return False
        else:
            # Track columns that couldn't be validated due to missing validator
            unable_to_verify_data_type[column_name] = columns.get(column_name).column_type
        return True

    def _validate_cell_notnull(self, client, table_name, table_obj, column_name, cell_value, line_number, columns, row):
        """
        Validate that a cell is not null when the column doesn't allow null values.
        
        Args:
            client: Client name for conflict reporting
            table_name: Table name for conflict reporting
            table_obj: Table object being validated
            column_name: Name of the column being validated
            cell_value: The actual value to validate
            line_number: Row number for error reporting
            columns: Column definitions from database schema
            row: Complete row data for context
            
        Returns:
            bool: True if validation passes, False otherwise
        """
        # Check if value is null when column requires non-null values
        is_valid = self._validate_notnull(cell_value)
        
        if not is_valid:
            # Create metadata for null value violation
            meta = InvalidMetadata(
                table_path=table_obj.table_file_path,
                line_number=line_number+2,  # +2 to account for header and 0-based indexing
                line=row  # Include full row for context
            )
            
            # Report null value violation
            self.conflict_manager.add_conflict(
                client, 
                table=table_name,
                conflict=InvalidDataTypeValue(
                    key_columns=[column_name],
                    key_values=[cell_value],
                    duplicates=[meta],
                    data_type='Not Null'
                )
            )
            return False
        return True

    def _post_row_validation(self, client: str, table_name: str, table_obj: Table, csv_data_columns: set, columns: Dict[str, Column], unable_to_verify_data_type):
        """
        Handle warnings and schema mismatches after validating all rows.
        
        Args:
            client: Client name for conflict reporting
            table_name: Table name for conflict reporting
            table_obj: Table object being validated
            csv_data_columns: Set of column names found in CSV
            columns: Column definitions from database schema
            unable_to_verify_data_type: Dictionary of unvalidatable columns
        """
        # Warn about columns that could not be verified due to missing validators
        if unable_to_verify_data_type:
            ConsoleFormatter.print_warning(
                f'Warning! Unable to verify columns in table-{table_name}, column-{unable_to_verify_data_type.keys()}, please define datatype validation for - {set(unable_to_verify_data_type.values())}'
            )
            
        # Check for extra columns in CSV that are not present in database schema
        extra_columns = csv_data_columns - columns.keys()
        
        # Remove None from extra columns if present (handled by column count validator)
        if None in extra_columns:
            extra_columns.remove(None)
            
        if csv_data_columns and extra_columns:
            # Mark extra columns to be skipped in validation
            table_obj.set_skip_columns_validations(extra_columns)
            
            # Report extra columns as table error
            self.conflict_manager.add_conflict(
                client, table_name, InvalidTable(traceback=f'Columns not found in DB! {extra_columns}, Path: {table_obj.table_file_path}')
            )
            
        # Warn about columns in database schema that are missing from CSV
        if csv_data_columns and columns.keys() - csv_data_columns:
            for missing_column in (columns.keys() - csv_data_columns):
                if not columns[missing_column].is_nullable:
                    self.conflict_manager.add_conflict(
                        client,
                        table_name,
                        InvalidTable(
                            traceback=f"Not-null Constraint Column '{missing_column}' not found in CSV!",
                            table_path=table_obj.table_file_path
                        )
                    )

            ConsoleFormatter.print_warning(
                f'Warning! Columns not found in CSV! {table_name} {columns.keys() - csv_data_columns}, Path: {table_obj.table_file_path}'
            )

    def _handle_missing_columns(self, client: str, table_name: str, table_objs: List[Table]):
        """
        Handle the case where no column information is available from database schema.
        
        Args:
            client (str): Client name for context
            table_name (str): Table name for reporting
            table_objs (List[Table]): List of table objects
        """

        for table_obj in table_objs:
            if f'/{client}/' in table_obj.table_file_path:
                ConsoleFormatter.print_warning(
                    f'Warning! Table not found in DB!, Client: {client} - {table_obj.schema}.{table_obj.table_name}, Path: {table_obj.table_file_path}'
                )


    # === Data Type Validators ===
    # Each method below validates a specific PostgreSQL data type
    
    def _validate_array(self, value: str) -> bool:
        """
        Validate PostgreSQL array format (e.g., {value1,value2,value3}).
        
        Args:
            value (str): The string value to validate as an array
            
        Returns:
            bool: True if valid array format, False otherwise
        """
        try:
            # Check basic array structure with curly braces
            if not value.startswith('{') or not value.endswith('}'):
                return False
                
            # Extract content between braces
            inner = value[1:-1]
            
            # Use regex to handle quoted strings and escape characters properly
            matches = re.findall(r'"(.*?)"|([^,{}]+)', inner)
            
            # Flatten and clean results to get array elements
            elements = [m[0] or m[1] for m in matches]
            return True
        except Exception:
            return False
    
    def _validate_user_defined(self, value) -> bool:
        """
        Validate user-defined types (assume valid unless overridden).
        
        Args:
            value: The value to validate
            
        Returns:
            bool: Always True (can be overridden for specific validation logic)
        """
        return True

    def _validate_bigint(self, value) -> bool:
        """
        Validate 64-bit integer within PostgreSQL bigint range.
        
        Args:
            value: The value to validate as bigint
            
        Returns:
            bool: True if valid bigint, False otherwise
        """
        try:
            int_val = int(value)
            # Check PostgreSQL bigint range: -2^63 to 2^63-1
            return -9223372036854775808 <= int_val <= 9223372036854775807
        except Exception:
            return False

    def _validate_boolean(self, value) -> bool:
        """
        Validate boolean values accepting multiple formats.
        
        Args:
            value: The value to validate as boolean
            
        Returns:
            bool: True if valid boolean representation, False otherwise
        """
        # Accept common boolean representations
        return str(value).lower() in ["true", "false", "1", "0"]

    def _validate_character_varying(self, value) -> bool:
        """
        Validate variable-length character string (VARCHAR).
        
        Args:
            value: The value to validate
            
        Returns:
            bool: True if value is a string, False otherwise
        """
        return isinstance(value, str)

    def _validate_datemultirange(self, value: str) -> bool:
        """
        Validate PostgreSQL datemultirange format (e.g., {[2024-01-01,2050-12-31)}).
        
        Args:
            value (str): The string to validate as datemultirange
            
        Returns:
            bool: True if valid datemultirange format, False otherwise
        """
        try:
            # Check basic structure with curly braces
            if not value.startswith('{') or not value.endswith('}'):
                return False
                
            inner = value[1:-1]
            
            # Match date ranges with bracket/parenthesis notation
            range_pattern = r'[\[\(]([\d]{4}-[\d]{2}-[\d]{2}),([\d]{4}-[\d]{2}-[\d]{2})[\]\)]'
            matches = re.findall(range_pattern, inner)
            
            if not matches:
                return False
                
            # Validate each date range by parsing the dates
            for start, end in matches:
                datetime.strptime(start, "%Y-%m-%d")
                datetime.strptime(end, "%Y-%m-%d")
            return True
        except Exception:
            return False

    def _validate_double_precision(self, value) -> bool:
        """
        Validate double precision floating point number.
        
        Args:
            value: The value to validate as double precision
            
        Returns:
            bool: True if valid float, False otherwise
        """
        try:
            float(value)
            return True
        except Exception:
            return False
    
    def _validate_integer(self, value) -> bool:
        """
        Validate 32-bit integer within PostgreSQL integer range.
        
        Args:
            value: The value to validate as integer
            
        Returns:
            bool: True if valid integer, False otherwise
        """
        try:
            int_val = int(value)
            # Check PostgreSQL integer range: -2^31 to 2^31-1
            return -2147483648 <= int_val <= 2147483647
        except Exception:
            return False
    
    def _validate_json(self, value: str) -> bool:
        """
        Validate JSON string format.
        
        Args:
            value (str): The string to validate as JSON
            
        Returns:
            bool: True if valid JSON, False otherwise
        """
        candidates = [value]
        
        # Handle common JSON escaping issues (double quotes)
        if value.startswith('{') and value.endswith('}') and '""' in value:
            candidates.append(value.replace('""', '"'))
            
        # Try to parse each candidate as JSON
        for candidate in candidates:
            try:
                parsed = json.loads(candidate)
                # Ensure it's a valid JSON object or array
                if isinstance(parsed, (dict, list)):
                    return True
            except json.JSONDecodeError:
                continue
        return False

    def _validate_jsonb(self, value) -> bool:
        """
        Validate JSONB format (same validation as JSON).
        
        Args:
            value: The value to validate as JSONB
            
        Returns:
            bool: True if valid JSONB, False otherwise
        """
        return self._validate_json(value)

    def _validate_name(self, value) -> bool:
        """
        Validate PostgreSQL name type (non-empty string).
        
        Args:
            value: The value to validate as name
            
        Returns:
            bool: True if non-empty string, False otherwise
        """
        return isinstance(value, str) and len(value) > 0

    def _validate_smallint(self, value) -> bool:
        """
        Validate 16-bit integer within PostgreSQL smallint range.
        
        Args:
            value: The value to validate as smallint
            
        Returns:
            bool: True if valid smallint, False otherwise
        """
        try:
            int_val = int(value)
            # Check PostgreSQL smallint range: -2^15 to 2^15-1
            return -32768 <= int_val <= 32767
        except Exception:
            return False

    def _validate_text(self, value) -> bool:
        """
        Validate text data type (any string).
        
        Args:
            value: The value to validate as text
            
        Returns:
            bool: True if value is a string, False otherwise
        """
        return isinstance(value, str)

    def _validate_timestamp_with_time_zone(self, value) -> bool:
        """
        Validate timestamp with timezone in various accepted formats.
        
        Args:
            value: The value to validate as timestamp with timezone
            
        Returns:
            bool: True if valid timestamp format, False otherwise
        """
        try:
            # Handle PostgreSQL 'now()' function
            if value == 'now()':
                return True
                
            # Clean up value by removing extra tokens if present
            if len(value.split(' ')) > 2:
                value = value.split(' ')[:2]
                value = " ".join(value)
                
            # Remove timezone part if present for easier parsing
            if '+' in value:
                value = value.split('+')[0]
                
            # List of accepted timestamp formats
            accepted_formats = [
                "%Y-%m-%d %H:%M:%S.%f %z",  # 2021-10-19 09:07:48.017 +0530
                "%Y-%m-%d %H:%M:%S %z",     # 2021-10-19 09:07:48 +0530
                "%Y-%m-%d %H:%M:%S.%f%z",  # with microseconds, no space
                "%Y-%m-%d %H:%M:%S%z",     # without microseconds, no space
                "%Y-%m-%d %H:%M:%S.%f",    # without timezone
                "%Y-%m-%d %H:%M:%S",       # basic timestamp
                "%Y-%m-%dT%H:%M:%S.%f%z",   # ISO format with T
                "%Y-%m-%dT%H:%M:%S%z",     # ISO format with T, no microseconds
                "%Y-%m-%dT%H:%M:%S"        # ISO format with T, no timezone
            ]
            
            # Try each format until one works
            for fmt in accepted_formats:
                try:
                    datetime.strptime(value, fmt)
                    return True
                except ValueError:
                    continue
            return False
        except Exception:
            return False

    def _validate_timestamp_without_time_zone(self, value) -> bool:
        """
        Validate timestamp without timezone (uses same validation as with timezone).
        
        Args:
            value: The value to validate as timestamp without timezone
            
        Returns:
            bool: True if valid timestamp format, False otherwise
        """
        return self._validate_timestamp_with_time_zone(value)
    
    def _validate_character(self, value) -> bool:
        """
        Validate single character string (CHAR(1)).
        
        Args:
            value: The value to validate as single character
            
        Returns:
            bool: True if exactly one character, False otherwise
        """
        return isinstance(value, str) and len(value) == 1

    def _validate_date(self, value) -> bool:
        """
        Validate date in various accepted formats.
        
        Args:
            value: The value to validate as date
            
        Returns:
            bool: True if valid date format, False otherwise
        """
        # List of accepted date formats
        accepted_formats = [ "%Y-%m-%d", "%d-%m-%Y", "%m-%d-%Y"]
        
        # Try each format until one works
        for fmt in accepted_formats:
            try:
                datetime.strptime(value, fmt)
                return True
            except ValueError:
                continue
        return False

    def _validate_numeric(self, value) -> bool:
        """
        Validate numeric value (can be integer or decimal).
        
        Args:
            value: The value to validate as numeric
            
        Returns:
            bool: True if valid numeric value, False otherwise
        """
        try:
            float(value)
            return True
        except ValueError:
            return False

    def _validate_real(self, value) -> bool:
        """
        Validate real (single precision floating point) value.
        
        Args:
            value: The value to validate as real
            
        Returns:
            bool: True if valid float value, False otherwise
        """
        try:
            float(value)
            return True
        except ValueError:
            return False

    def _validate_daterange(self, value: str) -> bool:
        """
        Validate PostgreSQL daterange format (e.g., [2000-01-01,2050-01-01)).
        
        Args:
            value (str): The string to validate as daterange
            
        Returns:
            bool: True if valid daterange format, False otherwise
        """
        try:
            # Match single date range with bracket/parenthesis notation
            match = re.match(r'^[\[\(](\d{4}-\d{2}-\d{2}),(\d{4}-\d{2}-\d{2})[\)\]]$', value)
            
            if not match:
                return False
                
            # Extract and validate the start and end dates
            start_date, end_date = match.groups()
            datetime.strptime(start_date, "%Y-%m-%d")
            datetime.strptime(end_date, "%Y-%m-%d")
            return True
        except Exception:
            return False

    def _validate_notnull(self, value) -> bool:
        """
        Check if value is not null or None.
        
        Args:
            value: The value to check for null
            
        Returns:
            bool: True if value is not None, False otherwise
        """
        return value is not None
