# Standard library imports
import os
import json
import urllib.parse
from typing import List, Dict, Optional, Any

# Third-party imports
from sqlalchemy import create_engine
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import NullPool
from sqlalchemy.sql import text as SQLQuery


class DB:
	"""
	Database connection and query utility class for PostgreSQL using SQLAlchemy.
	Handles connection setup, query execution, and result fetching for validation operations.
	"""
	def __init__(self, switch: str = 'source'):
		"""
		Initialize the DB connection parameters based on the switch parameter.
		
		Args:
			switch (str): Connection type - 'source', 'destination', or client identifier
		"""
		self.tdb, self.db_user, self.db_pass, self.db_host, self.db_port, self.db_name = None, None, None, None, None, None
		
		# Handle predefined connection types
		if switch == 'source':
			# Source database connection using environment variables
			self.db_pass = os.environ.get('DB_PASSWORD')
			self.db_host = os.environ.get('DB_HOST')
			self.db_name = 'source_db'
			self.db_user = os.environ.get('DB_USER')
			self.db_port = os.environ.get('DB_PORT')
		elif switch == 'destination':
			# Destination database connection using environment variables
			self.db_pass = os.environ.get('DB_PASSWORD')
			self.db_host = os.environ.get('DB_HOST')
			self.db_name = 'destination_db'
			self.db_user = os.environ.get('DB_USER')
			self.db_port = os.environ.get('DB_PORT')
		elif os.environ.get(switch):
			# Client-specific connection with hardcoded test credentials (should be configurable)
			self.tdb = json.loads(os.environ.get(switch))
			# self.tdb = {"db_name": "", "db_user": "", "db_pass": "", "db_host": "", "db_port": ""}
			self.db_pass = self.tdb['db_pass']
			self.db_host = self.tdb['db_host']
			self.db_name = self.tdb['db_name']
			self.db_user = self.tdb['db_user']
			self.db_port = self.tdb['db_port']
			
		# Validate that all required connection parameters are available
		if all([self.db_user, self.db_pass, self.db_host, self.db_port, self.db_name]):
			# Construct PostgreSQL connection URI with URL-encoded password and connection timeout
			self.sqlalchemy_database_uri = (
				f"postgresql+psycopg2://{self.db_user}:{urllib.parse.quote(self.db_pass)}@{self.db_host}:{self.db_port}/{self.db_name}?sslmode=disable&connect_timeout=20"
			)
			# Set connection arguments for additional timeout controls
			self.connect_args = {
				"connect_timeout": 20,  # Connection timeout in seconds
				"options": "-c statement_timeout=20s"  # Query timeout in seconds
			}
		else:
			# Raise exception if any required connection parameter is missing
			print("DB Connection Error: Missing DB Credentials")
			raise Exception("DB Connection Error: Missing DB Credentials")

	def connection_check(self):
		"""
		Test database connection by executing a simple query.
		Raises an exception if the connection fails.
		"""
		print("Connecting to DB..", self.db_name)
		
		# Execute a simple test query to verify connection
		if self.execute_query("SELECT 1"):
			print("DB Connected:", self.db_host, self.db_port, self.db_user, self.db_name)
		else:
			print("DB Connection Error: Failed to connect to DB", self.db_name)
			raise Exception("DB Connection Error: Failed to connect to DB", self.db_name)

	def execute_query(self, query: str) -> bool:
		"""
		Execute a SQL query that does not return results (DDL or DML operations).
		
		Args:
			query (str): SQL query to execute
			
		Returns:
			bool: True if successful, False if an error occurred
		"""
		try:
			# Create engine with NullPool and timeout settings
			engine = create_engine(
				self.sqlalchemy_database_uri, 
				poolclass=NullPool,
				connect_args=self.connect_args
			)
			# Use connection context manager for proper resource cleanup
			with engine.connect() as connection:
				# Execute the query with timeout (for operations like INSERT, UPDATE, DELETE, CREATE, etc.)
				connection.execute(SQLQuery(query).execution_options(autocommit=True))
			return True
		except SQLAlchemyError as exc:
			# Log query and error details for debugging
			print('query: ', query)
			print('execute_query: ', exc)
			return False

	def get_results(self, query: str) -> Optional[List[Dict[str, Any]]]:
		"""
		Execute a SQL query and return the results as a list of dictionaries.
		
		Args:
			query (str): SQL SELECT query to execute
			
		Returns:
			Optional[List[Dict[str, Any]]]: Query results as list of dictionaries, or None if error
		"""
		try:
			# Create engine with NullPool and timeout settings
			engine = create_engine(
				self.sqlalchemy_database_uri, 
				poolclass=NullPool,
				connect_args=self.connect_args
			)
			
			# Use connection context manager for proper resource cleanup
			with engine.connect() as connection:
				# Execute the query and fetch results
				result = connection.execute(SQLQuery(query))
				rows = result.fetchall()
				columns = result.keys()
				
				# Convert rows to list of dictionaries for easier processing
				return [dict(zip(columns, row)) for row in rows]
		except SQLAlchemyError as exc:
			# Log error details for debugging
			print('get_results:', exc)
			return None
