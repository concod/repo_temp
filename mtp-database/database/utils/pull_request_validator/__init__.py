import os
import sys

# Add missing import in readers.py
from .formatters import ConsoleFormatter
from .pipeline_exception import (
    PrimaryKeyConflict, 
    SegregatedDataConflict
)
from .config import ConfigurationLoader
from .readers import CSVDataReader, TableFinder
from .conflict_manager import ConflictManager
from .validators import PrimaryKeyValidator, SegregatedDataValidator
from .service import ValidationService

# Export main classes for external use
# These classes provide the primary interface for CSV data validation in pull requests
__all__ = [
    'ConsoleFormatter',           # Provides colored console output formatting
    'PrimaryKeyConflict',         # Exception for primary key constraint violations
    'SegregatedDataConflict',     # Exception for segregated data validation issues
    'ConfigurationLoader',        # Loads validation configuration settings
    'CSVDataReader',             # Handles CSV file reading operations
    'TableFinder',               # Discovers and processes CSV table files
    'ConflictManager',           # Manages and reports validation conflicts
    'PrimaryKeyValidator',       # Validates primary key constraints
    'SegregatedDataValidator',   # Validates segregated data consistency
    'ValidationService'          # Main orchestrator for validation process
]
