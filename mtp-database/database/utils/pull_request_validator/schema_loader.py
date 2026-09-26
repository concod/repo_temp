# Standard library imports
import traceback
from typing import List

# Local application imports
from .db import DB
from .query import DATA_TYPE_QUERY, UNIQUE_KEY_INDEX_QUERY, FOREIGN_KEY_INDEX_QUERY, DATA_QUERY
from .formatters import ConsoleFormatter


class SchemaLoader:
    """
    Loads schema information for a given client and environment from the database.
    Handles connection management, data type fetching, constraint loading, and error reporting.
    Supports different database connections for inventory and non_inventory replication.
    """
    def __init__(self, client: str, env: str):
        """
        Initialize the schema loader and prepare for database connection.
        
        Args:
            client (str): Client name for database identification
            env (str): Environment (dev, test, prod) for database identification.
                      Can include suffix like '_non_inventory' for replication databases.
        """
        try:
            # Initialize storage for schema information
            self.all_table_data_type = []          # Column data types for all tables
            self.all_table_unique_constraints = [] # Unique and primary key constraints
            self.all_table_foreign_keys = []       # Foreign key relationships
            
            # Connection state tracking
            self.db_conntected = False
            self.db: DB = None
            
            # Store client and environment for connection setup
            self.client = client
            self.env = env
        except Exception as exc:
            # Log initialization errors with client context
            ConsoleFormatter.print_red(f'Error initializing schema loader for client {client}: {exc}')
            traceback.print_exc()
    
    def _create_connection(self):
        """
        Establish database connection for the client and environment.
        Sets db_connected flag based on connection success.
        Handles different connection types for inventory and non_inventory replication.
        """
        try:
            # Create database identifier for connection
            # For non_inventory replication, env will be like 'dev_non_inventory'
            # For inventory replication, env will be like 'dev'
            db_id = f"{self.client}_{self.env}"
            db = DB(db_id)
            
            # Test connection to ensure it's working
            db.connection_check()
            
            # Store connection and update status
            self.db = db
            self.db_conntected = True
        except Exception as exc:
            # Log connection errors with client context
            ConsoleFormatter.print_red(f'Error connecting to database for client {self.client} with env {self.env}: {exc}')
            traceback.print_exc()

    def __fetch_table_data_type(self, table_names: str):
        """
        Fetch data type information for the specified table names from the database.
        
        Args:
            table_names (str): Comma-separated quoted table names for SQL query
        """
        # Execute query to get column data types for specified tables
        self.all_table_data_type = self.db.get_results(DATA_TYPE_QUERY.format(table_names=table_names))
    
    def __fetch_table_unique_constraints(self, table_names: str):
        """
        Fetch unique and primary key constraints for the specified table names.
        
        Args:
            table_names (str): Comma-separated quoted table names for SQL query
        """
        # Execute query to get unique constraints (both primary and unique keys)
        self.all_table_unique_constraints = self.db.get_results(UNIQUE_KEY_INDEX_QUERY.format(table_names=table_names))

    def __fetch_table_foreign_keys(self, table_names: str):
        """
        Fetch foreign key constraints for the specified table names from the database.
        
        Args:
            table_names (str): Comma-separated quoted table names for SQL query
        """
        # Execute query to get foreign key relationships
        self.all_table_foreign_keys = self.db.get_results(FOREIGN_KEY_INDEX_QUERY.format(table_names=table_names))

    def get_table_primary_key_values(self, schema: str, table_name: str, primary_key_column: str):
        """
        Fetch all primary key values for a specific table from the database.
        Used for foreign key validation against existing data.
        
        Args:
            schema (str): Schema name
            table_name (str): Table name
            primary_key_column (str): Primary key column name
            
        Returns:
            List[Dict]: List of dictionaries containing primary key values
        """
        # Execute query to get all primary key values from the specified table
        return self.db.get_results(DATA_QUERY.format(schema=schema, table_name=table_name, primary_key_column=primary_key_column))

    def load(self, table_names: List[str]):
        """
        Load complete schema information for the provided list of table names.
        This includes data types, constraints, and foreign key relationships.
        
        Args:
            table_names (List[str]): List of table names to load schema information for
        """
        # Establish database connection first
        self._create_connection()
        
        # Check if connection was successful
        if not self.db_conntected:
            ConsoleFormatter.print_red("Failed to load schemas as unable to connect to database")
            return
            
        # Prepare table names for SQL query (quote each name)
        quoted_table_names = [f"'{table_name}'" for table_name in table_names]
        joined_table_names = ','.join(quoted_table_names)
        
        # Load all schema information in batch for efficiency
        self.__fetch_table_data_type(joined_table_names)      # Column data types
        self.__fetch_table_unique_constraints(joined_table_names)  # Primary and unique keys
        self.__fetch_table_foreign_keys(joined_table_names)   # Foreign key relationships
