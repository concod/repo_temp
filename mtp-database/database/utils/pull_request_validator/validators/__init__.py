# Import all validator classes for external use
# Each validator handles a specific aspect of CSV data validation

# Base abstract validator that defines the common interface
from .base import Validator

# Validates primary key and unique constraint violations
from .primary_key_validator import PrimaryKeyValidator

# Validates data segregation across different table paths/schemas
from .segregated_data_validator import SegregatedDataValidator

# Validates column count mismatches (missing/extra values in rows)
from .column_count_mismatch_validator import ColumnCountMismatchValidator

# Validates data types against database schema definitions
from .data_type_validator import DataTypeValidator

# Validates foreign key relationships and referential integrity
from .foreign_key_validator import ForeignKeyValidator

# Export all validator classes for use by the validation service
__all__ = [
    'Validator',                        # Base abstract validator interface
    'PrimaryKeyValidator',              # Primary key and unique constraint validation
    'SegregatedDataValidator',          # Data segregation validation across schemas
    'ColumnCountMismatchValidator',     # Column count and row structure validation
    'DataTypeValidator',                # Data type compliance validation
    'ForeignKeyValidator'               # Foreign key relationship validation
]

