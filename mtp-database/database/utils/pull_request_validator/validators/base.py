from abc import ABC, abstractmethod
from typing import Dict, List

from ..table import Table

from ..pipeline_exception import PipelineException

from ..readers import CSVDataReader
from ..conflict_manager import ConflictManager
from ..config import ConfigurationLoader


class Validator(ABC):
    """
    Abstract base class for all validators in the pull request validation system.
    Defines the common interface and shared functionality for validating CSV data.
    """

    def __init__(self, config_loader: ConfigurationLoader, csv_reader: CSVDataReader, conflict_manager: ConflictManager):
        """
        Initialize the validator with required dependencies.
        
        Args:
            config_loader (ConfigurationLoader): Loads validation configuration and rules
            csv_reader (CSVDataReader): Reads and processes CSV files
            conflict_manager (ConflictManager): Manages and reports validation conflicts
        """
        # Store configuration loader for accessing validation rules
        self.config_loader = config_loader
        
        # Store CSV reader for processing data files
        self.csv_reader = csv_reader
        
        # Store conflict manager for reporting validation errors
        self.conflict_manager = conflict_manager
    
    @abstractmethod
    def validate(self, tables: Dict[str, Table], client: str, env: str="") -> Dict[str, List[PipelineException]]:
        """
        Abstract method that must be implemented by all validators.
        Each validator defines its own validation logic for tables.
        
        Args:
            tables (Dict[str, Table]): Dictionary of table objects to validate
            client (str): Client name for context-specific validation
            env (str, optional): Environment context for validation
            
        Returns:
            Dict[str, List[PipelineException]]: Dictionary of conflicts found during validation
        """
        pass

    def check_db_connected(self, tables: Dict[str, Table]) -> bool:
        """
        Check if database connection is available for any of the tables.
        Used by validators that require database access for schema information.
        
        Args:
            tables (Dict[str, Table]): Dictionary of table objects to check
            
        Returns:
            bool: True if database connection is available, False otherwise
        """
        # Check database connection status from any table's schema loader
        for table_name, table_obj in tables.items():
            return table_obj.schema_loader.db_conntected
