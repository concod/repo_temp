# Standard library imports
from collections import defaultdict
from typing import List, Dict, Set, Union, Tuple

# Local application imports
from .schema_loader import SchemaLoader


class Column:
    """
    Represents a column in a database table with its metadata and constraints.
    """
    def __init__(self, column_name: str, column_type: str, is_nullable: bool):
        """
        Initialize a column with its basic properties.
        
        Args:
            column_name (str): Name of the column
            column_type (str): Data type of the column
            is_nullable (bool): Whether the column allows NULL values
        """
        self.column_name: str = column_name
        self.column_type: str = column_type
        # Reference to foreign key table (None if no foreign key)
        self.foreign_key_reference: Table = None
        self.foreign_key_reference_column: Column = None
        self.is_nullable: bool = is_nullable
    
class Constraints:
    """
    Represents a constraint (Primary Key or Unique) in a database table.
    """
    def __init__(self, constraint_name: str, is_primary_key_constraint: bool, contraint_columns: List[Column]):
        """
        Initialize a constraint with its properties.
        
        Args:
            constraint_name (str): Name of the constraint
            is_primary_key_constraint (bool): True if this is a primary key constraint
            contraint_columns (List[Column]): List of columns that make up this constraint
        """
        self.constraint_name = constraint_name
        self.is_primary_key_constraint = is_primary_key_constraint
        self.contraint_columns = contraint_columns


class Table:
    """
    Represents a database table, including its schema, columns, and constraints.
    Provides properties for lazy loading of metadata and supports validation skipping.
    """
    def __init__(self, table_file_path: str, schema_loader: SchemaLoader):
        """
        Initialize a table with its file path and schema loader.
        
        Args:
            table_file_path (str): Path to the CSV file representing this table
            schema_loader (SchemaLoader): Schema loader for fetching metadata
        """
        self.table_file_path: str = table_file_path
        # Flag indicating if this table is segregated (client-specific)
        self.is_segregated_table: bool = False
        # Reference to parent table if this is segregated
        self.segregated_parent_table: 'Table' = None
        self.schema_loader: SchemaLoader = schema_loader
        # Set of columns to skip during validation
        self.skip_column_validations: Set[str] = set()
        # List of child tables if this is a parent segregated table
        self.segregated_child_tables: List['Table'] = []
        # Set of primary key values found in this table
        self.unique_constraint_values: Dict[Tuple[Column], Set[Tuple[str]]] = defaultdict(set)
        # Set of line numbers with invalid data
        self.invalid_linenumber = set()

    @property
    def schema(self) -> str:
        """
        Extract and return the schema name from the file path.
        
        Returns:
            str: Schema name (directory name containing the CSV file)
        """
        path_parts = self.table_file_path.split('/')
        return path_parts[-2]  # Second to last part is schema
    
    @property
    def table_name(self) -> str:
        """
        Extract and return the table name from the file path.
        
        Returns:
            str: Table name (filename without extension)
        """
        path_parts = self.table_file_path.split('/')
        return path_parts[-1].split('.')[0]  # Last part without extension
    
    @property
    def full_table_name(self) -> str:
        """
        Return the fully qualified table name.
        
        Returns:
            str: Full table name in format 'schema.table'
        """
        return f"{self.schema}.{self.table_name}"

    @property
    def primary_columns(self) -> Union[None, Constraints]:
        """
        Return the primary key constraint for this table.
        Lazy loads from schema if not already cached.
        
        Returns:
            Union[None, Constraints]: Primary key constraint or None if no primary key
        """
        if not hasattr(self, '_primary_columns'):
            column_dict = self.get_column_dict()
            if not column_dict:
                return None
                
            # Find primary key constraints from schema
            self._primary_columns = [
                Constraints(
                    constraint_name=data['constraint_name'],
                    is_primary_key_constraint=True,
                    contraint_columns=[column_dict[column] for column in  data['constraint_columns']]
                )
                # Filter for primary key constraints (contype = 'p') for this table
                for data in self.schema_loader.all_table_unique_constraints
                if data['table_schema'] == self.schema and data['table_name'] == self.table_name and data['contype'] == 'p'
            ]
            # Return first primary key constraint or None
            self._primary_columns = self._primary_columns[0] if self._primary_columns else None
        return self._primary_columns
    
    @property
    def unique_constraints(self) -> List[Constraints]:
        """
        Return all unique constraints for this table including primary key.
        Lazy loads from schema if not already cached.
        
        Returns:
            List[Constraints]: List of all unique constraints
        """
        if not hasattr(self, '_unique_constraints'):
            column_dict = self.get_column_dict()
            if not column_dict:
                return []
                
            # Find unique constraints from schema
            self._unique_constraints = [
                Constraints(
                    constraint_name=data['constraint_name'],
                    is_primary_key_constraint=False,
                    contraint_columns=[column_dict[column] for column in  data['constraint_columns']]
                )
                # Filter for unique constraints (contype = 'u') for this table
                for data in self.schema_loader.all_table_unique_constraints
                if data['table_schema'] == self.schema and data['table_name'] == self.table_name and data['contype'] == 'u'
            ]
            # Add primary key constraint as first unique constraint if it exists
            if self.primary_columns:
                self._unique_constraints.insert(0, self.primary_columns)
        return self._unique_constraints
    
    @property
    def foreign_keys(self) -> List[Column]:
        """
        Return a list of columns that have foreign key relationships.
        
        Returns:
            List[Column]: List of columns with foreign key references
        """
        if not hasattr(self, '_foreign_keys'):
            # Filter columns that have foreign key references
            self._foreign_keys = [
               column for column in self.columns if column.foreign_key_reference
            ]
        return self._foreign_keys or []

    @property
    def columns(self) -> List[Column]:
        """
        Return the list of columns for this table, loaded from the schema loader.
        Lazy loads from schema if not already cached.
        
        Returns:
            List[Column]: List of Column objects representing table structure
        """
        if not hasattr(self, '_columns'):
            # Create Column objects from schema data
            self._columns = [
                Column(column_name=data['column_name'], column_type=data['data_type'], is_nullable=data['is_nullable'].lower() != 'no')
                # Filter schema data for this specific table
                for data in self.schema_loader.all_table_data_type
                if data['table_schema'] == self.schema and data['table_name'] == self.table_name
            ]
        return self._columns
    
    @property
    def segregated_tables(self) -> List['Table']:
        """
        Return the list of segregated tables related to this table.
        
        Returns:
            List['Table']: List of related segregated tables
        """
        if not hasattr(self, '_segregated_tables'):
            self._segregated_tables = []
        return self._segregated_tables
    
    def set_skip_columns_validations(self, columns: Set[str]):
        """
        Add columns to the set of columns to skip during validation.
        
        Args:
            columns (Set[str]): Set of column names to skip in validation
        """
        self.skip_column_validations.update(columns)

    def get_column_dict(self) -> Dict[str, Column]:
        """
        Create and return a dictionary mapping column names to Column objects.
        
        Returns:
            Dict[str, Column]: Dictionary with column names as keys and Column objects as values
        """
        return {column.column_name: column for column in self.columns}
    
    def add_unique_constraint_values(self, columns: Tuple[Column], value: Tuple[str]):
        """
        Add a primary key value to the set of values found in this table.
        Used for tracking duplicate primary keys during validation.
        
        Args:
            value: Primary key value to add
        """
        self.unique_constraint_values[columns].add(value)


class DataTable:
    """
    Represents a table in a database for foreign key reference validation.
    Simpler than Table class, focused on primary key value retrieval.
    """
    def __init__(self, schema: str, table_name: str, primary_key_column: str, schema_loader: SchemaLoader):
        """
        Initialize a DataTable for database queries.
        
        Args:
            schema (str): Schema name
            table_name (str): Table name
            primary_key_column (str): Name of the primary key column
            schema_loader (SchemaLoader): Schema loader for database access
        """
        self.schema: str = schema
        self.table_name: str = table_name
        self.primary_key_column: str = primary_key_column
        self.schema_loader: SchemaLoader = schema_loader
    
    @property
    def columns(self) -> List[Column]:
        """
        Return the list of columns for this table, loaded from the schema loader.
        Lazy loads from schema if not already cached.
        
        Returns:
            List[Column]: List of Column objects representing table structure
        """
        if not hasattr(self, '_columns'):
            # Create Column objects from schema data
            self._columns = [
                Column(column_name=self.primary_key_column, column_type='', is_nullable=False)
            ]
        return self._columns

    def get_column_dict(self) -> Dict[str, Column]:
        """
        Create and return a dictionary mapping column names to Column objects.
        
        Returns:
            Dict[str, Column]: Dictionary with column names as keys and Column objects as values
        """
        return {column.column_name: column for column in self.columns}


    @property
    def unique_constraint_values(self) -> Dict[str, Set[str]]:
        """
        Return the set of primary key values from the database table.
        Lazy loads from database if not already cached.
        
        Returns:
            Set[str]: Set of primary key values as tuples
        """
        if not hasattr(self, '_unique_constraint_values'):
            # Query database for primary key values
            primary_key_values = self.schema_loader.get_table_primary_key_values(self.schema, self.table_name, self.primary_key_column)
            # Convert values to tuple format for consistency
            values = [tuple([str(row['primary_key_value'])]) for row in primary_key_values]
            self._unique_constraint_values = {tuple(self.columns): set(values)} # we are only storing the primary key columns in self.columns
        return self._unique_constraint_values


class TableFactory:
    """
    Factory for creating and caching Table objects for a given client and environment.
    Handles schema loading for all created tables to avoid duplicate connections.
    """
    def __init__(self, client: str, env: str):
        """
        Initialize the factory for a specific client and environment.
        
        Args:
            client (str): Client name
            env (str): Environment (dev, test, prod)
        """
        # Cache for Table objects to avoid recreating them
        self.factory: Dict[str, Table] = {}
        # Cache for DataTable objects
        self.data_table_factory: Dict[(str, str), DataTable] = {}
        # Schema loader shared across all tables
        self.schema_loader: SchemaLoader = SchemaLoader(client, env)
    
    def get_table(self, table_file_path: str) -> Table:
        """
        Return a Table object for the given file path, creating and caching it if necessary.
        
        Args:
            table_file_path (str): Path to the CSV file
            
        Returns:
            Table: Table object for the given path
        """
        # Normalize path by removing leading slash
        normalized_path = table_file_path.strip('/')
        
        # Create and cache table if not already cached
        if normalized_path not in self.factory:
            self.factory[normalized_path] = Table(table_file_path, self.schema_loader)
        return self.factory[normalized_path]
    
    def get_data_table(self, schema: str, table_name: str, primary_key_column: str) -> DataTable:
        """
        Return a DataTable object for the given schema and table name, creating and caching it if necessary.
        
        Args:
            schema (str): Schema name
            table_name (str): Table name
            primary_key_column (str): Primary key column name
            
        Returns:
            DataTable: DataTable object for the given parameters
        """
        # Create and cache data table if not already cached
        if (schema, table_name) not in self.data_table_factory:
            self.data_table_factory[(schema, table_name)] = DataTable(schema, table_name, primary_key_column, self.schema_loader)
        return self.data_table_factory[(schema, table_name)]
    
    def load_schemas(self):
        """
        Load schema information for all tables currently in the factory.
        This method should be called after all tables are created to batch load schemas.
        """
        # Extract unique table names from all cached tables
        table_names = {table_obj.table_name for table_obj in self.factory.values()}
        # Load schema information for all tables at once
        self.schema_loader.load(table_names)
