import sys
import os
import csv
import re

import sqlalchemy as sa
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import NullPool
from sqlalchemy import create_engine

import time
import urllib
import traceback
import json
from sqlalchemy.sql import text as SQLQuery
import utils
from load_sync_env import setup_env
from utils.cache import invoke_clear_cache_api
from colorama import Fore, Style

import psycopg2
import psycopg2.extras
import asyncpg
import asyncio

from utils import recurse_files , dependency_graph
from utils.pull_request_validator.service import ValidationService
from utils.constants import ALLOWED_SCHEMA_DIRS

import logging

class PGSync:
	def __init__(self, switch='source'):
		self.tdb = None
		if switch == 'source':
			self.db_pass = os.environ.get('DB_PASSWORD')
			self.db_host = os.environ.get('DB_HOST')
			self.db_name = 'source_db'
			self.db_user = os.environ.get('DB_USER')
			self.db_port = os.environ.get('DB_PORT')
		elif switch == 'destination':
			self.db_pass = os.environ.get('DB_PASSWORD')
			self.db_host = os.environ.get('DB_HOST')
			self.db_name = 'destination_db'
			self.db_user = os.environ.get('DB_USER')
			self.db_port = os.environ.get('DB_PORT')
		else:
			self.tdb = json.loads(os.environ.get(switch))
			self.db_pass = self.tdb['db_pass']
			self.db_host = self.tdb['db_host']
			self.db_name = self.tdb['db_name']
			self.db_user = self.tdb['db_user']
			self.db_port = self.tdb['db_port']
		if recurse_files.credentials_exist(self.db_user, self.db_pass, self.db_host, self.db_port, self.db_name):
			self.sqlalchemy_database_uri = "postgresql+psycopg2://{}:{}@{}:{}/{}?sslmode=disable".format(self.db_user, urllib.parse.quote(self.db_pass), self.db_host, self.db_port, self.db_name)

	def connection_check(self):
		self.get_results("SELECT 1")
		print("DB Connected:", self.db_host, self.db_port, self.db_user, self.db_name)

	#def execute_query(self, q):
	#	#print("Executing:", q)
	#	try:
	#		engine = create_engine(self.sqlalchemy_database_uri, poolclass=NullPool)
	#		engine.execute(SQLQuery(q))
	#		#engine.execute(q)
	#		return True
	#	except SQLAlchemyError as e:
	#		# trace_back = traceback.format_exc()
	#		# err_message = str(e) + "" + str(trace_back)
	#		# Log the exceptions in file
	#		logging.error(str(e))
	#		# print("Error", "execute_query", err_message)
	#		return False

	def execute_query(self, sql):
		flag = False
		connection = None
		try:
			connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, database=self.db_name, connect_timeout=30)
			cursor = connection.cursor()
			cursor.execute(sql)
			connection.commit()
			flag = True
		except psycopg2.Error as e:
			#print("SQL Error:", e)
			logging.error("SQL Error:" + str(e))
		except Exception as e:
			print("Other than SQL Error:", e)
			logging.error("Other than SQL Error:" + str(e))
		finally:
			if connection:
				cursor.close()
				connection.close()
		return flag

	def get_results(self, sql):
		#print("Fetching:", sql)
		#results = []
		connection = None
		is_exception = False
		try:
			connection = psycopg2.connect(user=self.db_user, password=self.db_pass, host=self.db_host, port=self.db_port, database=self.db_name, connect_timeout=30)
			cursor = connection.cursor(cursor_factory=psycopg2.extras.RealDictCursor)
			cursor.execute(sql)
			results = cursor.fetchall()
		except psycopg2.Error as e:
			is_exception = True
			#print("SQL Error:", e)
			logging.error("SQL Error:" + str(e))
		except Exception as e:
			is_exception = True
			print("Other than SQL Error:", e)
			logging.error("Other than SQL Error:" + str(e))
		finally:
			if connection:
				cursor.close()
				connection.close()
		return some_exception_in_get_results if is_exception else results

choice = sys.argv[1]
client = sys.argv[2]
env = sys.argv[3]
tdb_id = "{}_{}".format(client, env)

# Configure logging with dynamic filename
logging.basicConfig(filename=f'sync_error_{client}_{env}.txt', level=logging.ERROR,
format='%(asctime)s:%(levelname)s:%(message)s')

# Set up variables for replication
replication_value = sys.argv[4] if len(sys.argv) > 4 else None

def load_schema_db_mapping():
	schema_db_mapping = {}
	with open('./utils/schema_db_mapping.json', 'r') as file:
		schema_db_mapping = json.load(file)
	return schema_db_mapping

if replication_value:
	replication_client_mapping = load_schema_db_mapping()
	if client not in replication_client_mapping:
		msg = f"Client {client} not found in replication_client_mapping"
		logging.error(msg)
		print(msg)
		sys.exit(1)

	replication_client_all_data = replication_client_mapping.get(client, [])
	replication_client_data = next((item for item in replication_client_all_data if item['replication_value'] == replication_value ), None)

	if replication_client_data["replication_value"] == 'non_inventory':
		tdb_id = f'{client}_{env}_{replication_client_data["replication_value"]}'
	
connection_exception = False

print(Fore.GREEN + "Data/Config Syncing for:", tdb_id)
print(Style.RESET_ALL)

############## DATA SYNC #######################	


def get_table_columns(cur, table_name):
    schema , name = table_name.split(".") 
    cur.execute(f"SELECT column_name FROM information_schema.columns WHERE table_schema = '{schema}' and table_name = '{name}' and generation_expression is NULL ORDER BY ordinal_position;")
    columns = [row[0] for row in cur.fetchall()]
    columns = ['"{}"'.format(column) for column in columns]
    columns = ",".join(columns)		
    return columns


def get_line_numner_from_error(file_path, error_msg):
	line_number = None

	# Pattern 1: Look for standard CONTEXT format
	if "CONTEXT:" in error_msg:
		context_part = error_msg.split("CONTEXT:")[1].strip()
		line_match = re.search(r'line (\d+)', context_part)
		if line_match:
			return line_match.group(1)
	
	elif "DETAIL:" in error_msg:
		line_number = get_line_number_for_constraint_error(file_path, error_msg)
		
	# Pattern 2: Look for line information directly in the error message
	if not line_number:
		line_match = re.search(r'line (\d+)', error_msg)
		if line_match:
			line_number = line_match.group(1)
	
	return line_number


def get_line_number_for_constraint_error(file_path, error_msg):
    # Step 1: Extract column names and values from the FK error
    match = re.search(r'Key \((.*?)\)=\((.*?)\)', error_msg)
    if not match:
        return None

    keys_str = match.group(1)
    values_str = match.group(2)

    key_columns = [k.strip() for k in keys_str.split(',')]
    key_values = [v.strip() for v in values_str.split(',')]

    if len(key_columns) != len(key_values):
        return None  # mismatched keys and values, can't process

    # Step 2: Scan the CSV
    with open(file_path, 'r', newline='') as csvfile:
        reader = csv.DictReader(csvfile)
        for i, row in enumerate(reader, start=2):  # 2 = account for header line
            match = all(row.get(col) == val for col, val in zip(key_columns, key_values))
            if match:
                return i - 1 # Found the matching row
    
    return None  # No matching row found


def get_error_table_name(line, obj):
	if 'merged_csv_details' not in obj:
		return line, obj['table_name']

	segregated_tables = obj['merged_csv_details']

	for index, table in enumerate(segregated_tables):
		if table['startLine'] <= line <= table['endLine']:
			return line - table['startLine'] + 2, table['table_name']
	
	return line, f"SEG-{obj['table_name']}" #for debug


async def update_sequences_for_schemas_async(db_config, schemas_to_process):
	"""
	Async version: Update sequence values to max_value+1 for auto-increment columns in specified schemas
	
	Args:
		db_config: Dictionary containing database connection parameters
		schemas_to_process: List of schema names to process
	"""
	# Create a connection pool to manage connections efficiently
	pool = None
	try:
		print(f"Updating sequences asynchronously for schemas: {schemas_to_process}")
		
		# Create connection pool
		pool = await asyncpg.create_pool(
			user=db_config['user'],
			password=db_config['password'],
			host=db_config['host'],
			port=db_config['port'],
			database=db_config['database'],
			min_size=1,
			max_size=10  # Limit concurrent connections
		)
		
		# Query to find all tables with serial/auto-increment columns and their sequences
		query = """
		SELECT
			t.table_schema,
			t.table_name,
			c.column_name,
			pg_get_serial_sequence(t.table_schema||'.'||t.table_name, c.column_name) as sequence_name
		FROM
			information_schema.tables t
		JOIN
			information_schema.columns c ON t.table_name = c.table_name AND t.table_schema = c.table_schema
		WHERE
			t.table_type = 'BASE TABLE'
			AND c.column_default LIKE 'nextval%'
			AND t.table_schema = ANY($1)
			AND pg_get_serial_sequence(t.table_schema||'.'||t.table_name, c.column_name) IS NOT NULL
		ORDER BY t.table_schema, t.table_name, c.column_name;
		"""

		# Execute query to get tables with sequences using pool
		async with pool.acquire() as conn:
			tables_with_sequences = await conn.fetch(query, schemas_to_process)
		
		if not tables_with_sequences:
			print("No tables with auto-increment columns found")
			return
		
		# Process each table concurrently to gather sequence update information
		async def process_table_sequence(row):
			schema = row['table_schema']
			table = row['table_name']
			column = row['column_name']
			sequence = row['sequence_name']
			
			if not sequence:
				return None
			
			try:
				async with pool.acquire() as table_conn:
					# Get max value from table and current sequence value
					max_query = f'SELECT COALESCE(MAX("{column}"), 0) as max_val FROM "{schema}"."{table}"'
					max_result = await table_conn.fetchrow(max_query)
					
					seq_query = f"SELECT last_value, is_called FROM {sequence}"
					seq_result = await table_conn.fetchrow(seq_query)
					
					if max_result and seq_result:
						max_val = max_result['max_val']
						new_sequence_val = max_val + 1
						
						current_seq_val = seq_result['last_value']
						is_called = seq_result['is_called']
						
						# Calculate next sequence value
						next_seq_val = current_seq_val + 1 if is_called else current_seq_val
						
						# Only return update info if sequence needs updating
						if next_seq_val != new_sequence_val:
							return {
								'sequence': sequence,
								'new_val': new_sequence_val,
								'table_info': f"{schema}.{table}.{column}",
								'current_val': next_seq_val
							}
						else:
							print(f"Sequence {sequence} already at correct value {new_sequence_val} for {schema}.{table}.{column}")
							return None
						
			except Exception as e:
				print(f"Error processing sequence for {schema}.{table}.{column}: {str(e)}")
				logging.error(f"Error processing sequence for {schema}.{table}.{column}: {str(e)}")
				return None
		
		# Process tables with limited concurrency using semaphore
		semaphore = asyncio.Semaphore(5)  # Limit to 5 concurrent operations
		
		async def process_with_semaphore(row):
			async with semaphore:
				return await process_table_sequence(row)
		
		# Process all tables concurrently but with limited concurrency
		sequence_update_tasks = [process_with_semaphore(row) for row in tables_with_sequences]
		sequence_update_results = await asyncio.gather(*sequence_update_tasks, return_exceptions=True)
		
		# Filter out None results and exceptions
		sequence_updates = [
			result for result in sequence_update_results 
			if result is not None and not isinstance(result, Exception)
		]
		
		if not sequence_updates:
			print("No sequences need updating")
			return
		
		# Update sequences concurrently
		async def update_sequence(update_info):
			try:
				async with pool.acquire() as update_conn:
					update_query = f"SELECT setval('{update_info['sequence']}', {update_info['new_val']}, false)"
					await update_conn.execute(update_query)
					print(f"Updated sequence {update_info['sequence']} from {update_info['current_val']} to {update_info['new_val']} for {update_info['table_info']}")
					return True
			except Exception as e:
				error_msg = f"Failed to update sequence {update_info['sequence']} for {update_info['table_info']}: {str(e)}"
				print(error_msg)
				logging.error(f"Failed to update sequence {update_info['sequence']} from {update_info['current_val']} to {update_info['new_val']} for {update_info['table_info']}: {str(e)}")
				return False
		
		async def update_with_semaphore(update_info):
			async with semaphore:
				return await update_sequence(update_info)
		
		# Execute all sequence updates concurrently but with limited concurrency
		update_tasks = [update_with_semaphore(update_info) for update_info in sequence_updates]
		update_results = await asyncio.gather(*update_tasks, return_exceptions=True)
		
		successful_updates = sum(1 for result in update_results if result is True)
		print(f"Completed sequence updates: {successful_updates}/{len(sequence_updates)} successful")
		
	except Exception as e:
		error_msg = f"Error updating sequences asynchronously: {str(e)}"
		print(error_msg)
		logging.error(error_msg)
	finally:
		if pool:
			await pool.close()


def get_db_config_from_pg_sync(pg_sync_instance):
	"""
	Extract database configuration from PGSync instance for asyncpg
	"""
	return {
		'user': pg_sync_instance.db_user,
		'password': pg_sync_instance.db_pass,
		'host': pg_sync_instance.db_host,
		'port': pg_sync_instance.db_port,
		'database': pg_sync_instance.db_name
	}


async def run_async_sequence_update(pg_sync_instance, schemas_to_process):
	"""
	Wrapper function to run async sequence update
	"""
	db_config = get_db_config_from_pg_sync(pg_sync_instance)
	await update_sequences_for_schemas_async(db_config, schemas_to_process)


async def update_sequences_async_main(pg_sync_target, client, replication_value, replication_client_mapping):
	"""
	Async version of the sequence update logic from the main sync process
	"""
	try:
		if replication_value:
			# If replication is enabled, determine which schemas to update
			schema_results = get_schemas_to_update_sequences(client, replication_value, replication_client_mapping)
			if schema_results:
				await run_async_sequence_update(pg_sync_target, schema_results)
			else:
				print("No non-replicated schemas found to update sequences")
		else:
			# No replication, update sequences for all schemas that have auto-increment columns
			print("No replication configured, updating sequences for all schemas with auto-increment columns")
			
			# Get all schemas from the database using asyncpg
			db_config = get_db_config_from_pg_sync(pg_sync_target)
			conn = await asyncpg.connect(**db_config)
			
			try:
				all_schemas_query = """
				SELECT schema_name 
				FROM information_schema.schemata 
				WHERE schema_name NOT IN ('information_schema', 'pg_catalog', 'pg_toast', 'pg_temp_1', 'pg_toast_temp_1')
				"""
				schema_results = await conn.fetch(all_schemas_query)
				
				if schema_results:
					all_schemas = [row['schema_name'] for row in schema_results]
					update_schemas_seq = [schema for schema in all_schemas if schema in ALLOWED_SCHEMA_DIRS]
					await update_sequences_for_schemas_async(db_config, update_schemas_seq)
			finally:
				await conn.close()
				
	except Exception as e:
		error_msg = f"Error during async sequence update: {str(e)}"
		print(error_msg)
		logging.error(error_msg)


def get_schemas_to_update_sequences(client, replication_value, replication_client_mapping):
	"""
	Determine which schemas should have their sequences updated based on replication settings
	"""
	if not replication_value or not replication_client_mapping:
		return None
	
	replication_client_all_data = replication_client_mapping.get(client, [])
	current_replication_data = next(
		(item for item in replication_client_all_data if item['replication_value'] == replication_value), 
		None
	)
	
	if not current_replication_data:
		return None
	
	replicated_schemas = set(current_replication_data['schemas'])
	
	global_schema = set()
	if current_replication_data['replication_value'] != 'inventory':
		global_schema.add('global')

	schemas_to_update = replicated_schemas - global_schema
	
	return list(schemas_to_update) if schemas_to_update else None


def sync_data_util(obj, conn, exception_map, conflicts):
	pk = obj['pk']
	# If unique key is a list convert keys list into comma separated string for on conflict upsert query
	if isinstance(pk, list):
		pk = ",".join(pk)
	table_name = obj['table_name']
	schema = table_name.split('.')[0]
	temp_table_name = f"temp_{table_name.split('.')[1]}"
	file_path = obj['file_path']
	columns = obj['columns']

	# Exclude the primary key(s) for upsert
	pk_list = []
	if pk:
		pk_list = pk.split(",")
	update_columns = [c for c in columns if c not in pk_list]
	if conflicts.get(table_name):
		msg = f"Table: {table_name} ignored for sync due to build failure/pipeline validation failure"
		print(msg)
		logging.error(msg)
		return
	if not os.path.isfile(file_path) or pk == None:
		print(f"'{file_path}' is not a valid a path.")
		return
	print(f" pk - {pk} ,filepath - {file_path}" )
	# Fetch the dependent parent table if any
	parent_table = dependency_graph.parent_map.get(table_name,None)
	# Return / Don't sync the child table if the parent table was not synced 
	if parent_table and exception_map.get(parent_table):
		return
	error_msg = ""

	# Bulk insert the config table csv data to the respective pg tables 
	with open(file_path,'r') as source_csv:
		cur = conn.cursor()	
		try:
			# Check if the schema exists in the client db
			cur.execute(f"""SELECT EXISTS ( SELECT 1 FROM pg_namespace WHERE nspname='{schema}' )""")
			schema_exists = cur.fetchone()[0]
			if not schema_exists:
				return
			# Creates temporary empty table with same columns and types as
			# the final table
			cur.execute(f"""
				CREATE TEMPORARY TABLE {temp_table_name} (LIKE {table_name})
				ON COMMIT DROP
				""" )
			columns = ['"{}"'.format(column) for column in columns]
			columns = ",".join(columns)
			update_columns = ['"{}"'.format(update_column) for update_column in update_columns ]
			update_columns = ",".join(update_columns)
			cur.copy_expert(f"copy {temp_table_name}({columns}) from stdin with csv header delimiter as ','", source_csv)
			target_table_columns = get_table_columns(cur,table_name)
			# Build the upsert set statement
			upsert_set_columns = ",".join(
				list(
					map(
						lambda field: f"{field}=EXCLUDED.{field}",
						update_columns.split(","),
					)
				)
			)
			query = f""" INSERT INTO {table_name}({target_table_columns})
						SELECT {target_table_columns} FROM {temp_table_name}
					 """
			if pk:
				# Do an upsert operation if primary key is present				
				query += f""" ON CONFLICT ({pk}) DO UPDATE SET {upsert_set_columns} """
			else:
				# Delete the table first if no primary/unique key is present
				cur.execute(f"""DELETE FROM {table_name}""")
			# Run the insert/upsert query
			cur.execute(query)
			
			if pk_list and not recurse_files.is_upsert_table(table_name):
				# Delete all the records from the target table where the primary key values are not 
				# present in the temporary table
				delete_query = f"""DELETE FROM {table_name}
					WHERE NOT EXISTS (
						SELECT 1 FROM {temp_table_name}
						WHERE {' AND '.join([f"{table_name}.{col} = {temp_table_name}.{col}" for col in pk_list])}
					)"""
				cur.execute(delete_query)	
			cur.execute( f"DROP TABLE {temp_table_name}")
			conn.commit()
		except Exception as e:
			print("Error occured", e)
			line_number = get_line_numner_from_error(file_path, str(e))
			
			if line_number:
				line_number, table_name = get_error_table_name(int(line_number), obj)
				error_msg = f"Table Name - {table_name} , Line Number - {line_number} , Error - {str(e)}"
			else:
				error_msg = f"Table Name - {table_name} , Error - {str(e)}"
			# Log the duplicate row values if there is a conflict 
			if str(e).startswith('ON CONFLICT DO UPDATE') or "duplicate key value violates unique constraint" in error_msg:
				duplicate_rows = recurse_files.get_duplicate_rows(file_path=file_path, pk_list=pk_list)
				error_msg += '\n' + duplicate_rows
			logging.error(error_msg)
			# Keep track of exception for the table
			exception_map[table_name] = True
			conn.commit()
			return

if choice == 'data_sync':
	conflicts = {}
	setup_env(env)
	try:
		validation_service = ValidationService(os.getcwd(), env=env)
		# Run validation based on replication type
		if replication_value:
			if replication_value == 'inventory':
				# For inventory replication, run inventory-specific validation
				conflicts = validation_service.run_inventory_validation([client]) or {}
			elif replication_value == 'non_inventory':
				# For non_inventory replication, run non_inventory-specific validation
				conflicts = validation_service.run_non_inventory_validation([client]) or {}
		else:
			# No replication specified, run normal validation
			conflicts = validation_service.run_validation([client]) or {}		
		conflicts = conflicts.get(client, {})
	except Exception as e:
		print(f"Error running validation: {e}")

	pg_sync_target = PGSync(tdb_id)
	
	try:
		pg_sync_target.connection_check()
	except Exception as e:
		connection_exception = True
		#trace_back = traceback.format_exc()
		#err_message = str(e) + "" + str(trace_back)
		#print(err_message)

	if connection_exception:
		print(Fore.RED + "{} {} Credentials not set skipping...".format(client, env))
		print(Style.RESET_ALL)
		sys.exit(1)

	with open('pre-deployment.sql', 'r') as file: 
		pre_deployment = file.read() 
	pre_deployment_status = pg_sync_target.execute_query(pre_deployment)
	print("pre_deployment_status:", pre_deployment_status)

	sync_type = 'CSV Sync'
	if not pg_sync_target.execute_query("call public.ensure_exclusive_db_flow(true, '{}')".format(sync_type)):
		# Fetch current lock details to show in error message
		lock_details = pg_sync_target.get_results("SELECT lockedby, lockgranted FROM liquibase.databasechangeloglock WHERE id = 1")
		lock_info = ""
		if lock_details and len(lock_details) > 0:
			lockedby = lock_details[0].get('lockedby', 'Unknown')
			lockgranted = lock_details[0].get('lockgranted', 'Unknown')
			lock_info = f" (Currently locked by: {lockedby}, Lock granted at: {lockgranted})"
		
		logging.error(f"Error setting maintenance mode, Deployment or Ingestion in progress retry after sometime !!!{lock_info}")
		print(Fore.RED + "Error setting maintenance mode, Deployment or Ingestion in progress retry after sometime !!!: {} {}{} ".format(client, env, lock_info))
		utils.send_mail(client, env, choice)
		sys.exit(1)

	env_specific_tables_df_dict = recurse_files.get_env_specific_tables(client, env)
	env_specific_table_names = list(env_specific_tables_df_dict.keys())

	# Fetch all the global tables under data folder
	common_global_tables = recurse_files.fetch_all_tables(folders = ["data"], client=client, env=env)
	recurse_files.add_env_specific_tables(common_global_tables, "data", env)

	# Fetch all the global tables under client folder
	client_global_tables = recurse_files.fetch_all_tables(folders = [client], client=client, env=env)
	recurse_files.add_env_specific_tables(client_global_tables, client, env)

	# update env_specific tables, only for case if complete csv copy is needed
	client_global_tables = recurse_files.copy_env_specific_tables(client_global_tables, client, env)
	common_global_tables = recurse_files.copy_env_specific_tables(common_global_tables, client, env)

	# remove env_specific folder to prevent it from further processing
	folders = ["data", str(client)+'/data']
	recurse_files.remove_env_specific_folders(folders)

	# Fetch the merged config tables ensuring no duplicates
	merged_table_list = recurse_files.merge_tables(common_global_tables, client_global_tables)
	#merging data for all segregated tables
	invalid_tables, temp_table_map = recurse_files.validate_and_merge_segregated_table_data(
		client,
		tables=merged_table_list,
		pg_sync_target=pg_sync_target
		)
	
	if invalid_tables:
		logging.error(f"Sync didn't happen due to validation failure{invalid_tables}")
	
	final_merged_table_list = []

	for table in merged_table_list:
		if table.get("table_name") not in invalid_tables:
			final_merged_table_list.append(table)
	merged_table_list = final_merged_table_list
	
	if replication_value:
		# Filter tables based on replication schema mapping
		filtered_tables = []
		allowed_replication_data = next(
			(item for item in replication_client_all_data if item['replication_value'] == replication_client_data['replication_value']), 
			None
		)
		allowed_schemas = allowed_replication_data['schemas'] if allowed_replication_data else []

		for table_obj in merged_table_list:
			table_schema = table_obj['table_name'].split('.')[0]  # Extract schema part
			if table_schema in allowed_schemas:
				filtered_tables.append(table_obj)

		merged_table_list = filtered_tables

	try:
		eng = create_engine(pg_sync_target.sqlalchemy_database_uri, poolclass=NullPool)
		conn = eng.raw_connection()		
		start_time = time.time()
		count = 0
		exception_map = {}
		for obj in merged_table_list:
			if obj['table_name'] in env_specific_table_names:
				recurse_files.upsert_env_specific_table(obj, client, env, env_specific_tables_df_dict)
			count += 1
			print('TABLE ' , count)
			sync_data_util(obj, conn, exception_map, conflicts)
		end_time = time.time()
		print("Time elapsed: ", end_time - start_time, "seconds")
		conn.close()
		start_time = time.time()
		# Get the replication_client_mapping if it exists
		try:
			replication_mapping = replication_client_mapping if replication_value else None
		except NameError:
			replication_mapping = None
		asyncio.run(update_sequences_async_main(pg_sync_target, client, replication_value, replication_mapping))
		end_time = time.time()
		print("Time elapsed: ", end_time - start_time, "seconds")
	finally:
		recurse_files.post_sync_file_process(tables_map=temp_table_map)
		invoke_clear_cache_api(client=client, env=env, exception_map=exception_map)
		utils.send_mail(client, env, choice, replication_value)
		pg_sync_target.execute_query("call public.ensure_exclusive_db_flow(false, '{}')".format(sync_type))