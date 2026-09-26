from abc import ABC
from dataclasses import dataclass
from typing import List, Tuple

from .formatters import ConsoleFormatter
from .git import GitUtils


@dataclass
class DuplicateMetadata:
    """
    Metadata container for duplicate entries found during validation.
    Stores file path and line number information for conflict reporting.
    """
    table_path: str    # Path to the CSV file where the duplicate was found
    line_number: int   # Line number in the file (1-indexed including header)

    def get_commit_details(self):
        """
        Retrieve git blame information for this specific line.
        Uses GitUtils to get commit details including author and timestamp.
        
        Returns:
            dict: Git blame information (commit hash, author, timestamp, code)
        """
        # Get git blame details for the specific file and line number
        detail = GitUtils.get_git_blame(self.table_path, self.line_number)
        return detail


@dataclass
class ValidationConflict(ABC):
    """
    Abstract base class for all validation conflicts.
    Provides common structure and functionality for different types of validation errors.
    """
    type: str                           # Human-readable description of the conflict type
    key_columns: List[str]              # Column names involved in the conflict
    key_values: Tuple[str, ...]         # Values that caused the conflict
    duplicates: List[DuplicateMetadata] # Metadata for all duplicate occurrences

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], duplicates: List[DuplicateMetadata]):
        """
        Initialize the validation conflict with key information.
        
        Args:
            key_columns (List[str]): Names of columns involved in the conflict
            key_values (Tuple[str, ...]): Values that caused the validation conflict
            duplicates (List[DuplicateMetadata]): Metadata for all duplicate occurrences
        """
        self.key_columns = key_columns
        self.key_values = key_values
        self.duplicates = duplicates

    def print(self):
        """
        Print the validation conflict in a formatted manner.
        Displays conflict type, affected columns/values, file paths, and git blame information.
        """
        # Print conflict type in red to highlight the error
        ConsoleFormatter.print_red(" "*20, 'Type:', self.type)
        
        # Print the columns and values involved in the conflict
        ConsoleFormatter.print(" "*20, 'Key Columns:', self.key_columns)
        ConsoleFormatter.print(" "*20, 'Key Values :', self.key_values)
        ConsoleFormatter.print(" "*20, 'Paths:')

        commit_details = []

        # Print each duplicate occurrence with its file path and line number
        for duplicate in self.duplicates:
            ConsoleFormatter.print(" "*25, duplicate.table_path, 'line', duplicate.line_number)
            # Collect git blame details for each duplicate
            commit_details.append(duplicate.get_commit_details())

        # Filter out empty commit details and sort by timestamp
        commit_details = [detail for detail in commit_details if detail]
        if commit_details:
            # Sort by timestamp to show most recent change last
            commit_details.sort(key=lambda x: x.get('timestamp'))
            print(" "*20, "Last Change details:")
            print(" "*25, "Author: ", commit_details[-1]['author'])
            print(" "*25, "Timestamp: ", commit_details[-1]['timestamp'])
            print(" "*25, "Line: ", commit_details[-1]['code'])


class PrimaryKeyConflict(ValidationConflict):
    """
    Represents a primary key or unique constraint violation.
    Occurs when the same primary key values appear in multiple rows.
    """

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], duplicates: List[DuplicateMetadata]):
        """
        Initialize a primary key conflict.
        
        Args:
            key_columns (List[str]): Primary key column names
            key_values (Tuple[str, ...]): Duplicate primary key values
            duplicates (List[DuplicateMetadata]): Metadata for duplicate occurrences
        """
        super().__init__(key_columns, key_values, duplicates)
        self.type = 'Primary Key/Unique Constraint Conflict'


class SegregatedDataConflict(ValidationConflict):
    """
    Represents a segregated data validation violation.
    Occurs when the same composite key appears in multiple segregated table files.
    """

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], duplicates: List[DuplicateMetadata]):
        """
        Initialize a segregated data conflict.
        
        Args:
            key_columns (List[str]): Composite key column names
            key_values (Tuple[str, ...]): Duplicate composite key values
            duplicates (List[DuplicateMetadata]): Metadata for duplicate occurrences across files
        """
        super().__init__(key_columns, key_values, duplicates)
        self.type = 'Segregated Data Conflict' 


class MissingValues(ValidationConflict):
    """
    Represents a missing values validation error.
    Occurs when required data is missing from CSV rows.
    """

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], duplicates: List[DuplicateMetadata]):
        """
        Initialize a missing values conflict.
        
        Args:
            key_columns (List[str]): Column names with missing values
            key_values (Tuple[str, ...]): Values involved in the missing data error
            duplicates (List[DuplicateMetadata]): Metadata for affected rows
        """
        super().__init__(key_columns, key_values, duplicates)
        self.type = 'Missing Values in Row. (Refer Unique Key/value or line number for reference)'


class ExtraValues(ValidationConflict):
    """
    Represents an extra values validation error.
    Occurs when CSV rows contain more data than expected (extra columns).
    """

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], duplicates: List[DuplicateMetadata]):
        """
        Initialize an extra values conflict.
        
        Args:
            key_columns (List[str]): Column names with extra values
            key_values (Tuple[str, ...]): Values involved in the extra data error
            duplicates (List[DuplicateMetadata]): Metadata for affected rows
        """
        super().__init__(key_columns, key_values, duplicates)
        self.type = 'Extra Values in Row. (Refer Unique Key/value or line number for reference)'
