import os
import json
import sys
import load_env
from services import PGSync
from colorama import Fore, Back, Style

connection_exception = False
client = os.environ.get('CLIENT')

env = os.environ.get('ENV')
cs_map = json.loads(os.environ.get('SCHEMAS'))
schemas = cs_map[client]['schemas']

invenory_cred = os.environ.get("{}_{}".format(client, env))
non_invenory_cred = os.environ.get("{}_{}_non_inventory".format(client, env))

#print(client, env, schemas, invenory_cred, non_invenory_cred)

if env not in ['test', 'uat', 'prod']: # Env must be dev,test or prod only will never do this for dev as schema will never alignemnt and permissions also can not revoke
	print(f"{Fore.RED}{client} {env}, is not a valid environment to run this setup. Exiting...{Style.RESET_ALL}")
	sys.exit(1)

if invenory_cred:
	try:
		pg_sync_inventory = PGSync(client, env, False) #False server connection
		pg_sync_inventory.connection_check()
	except Exception as e:
		connection_exception = True
else:
	connection_exception = True

if connection_exception:
	print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, please check with the DevOps for Inventory cluster. Exiting...{Style.RESET_ALL}")
	sys.exit(1)

if non_invenory_cred:
	try:
		pg_sync_non_inventory = PGSync(client, env + '_non_inventory', False) #False server connection
		pg_sync_non_inventory.connection_check()
	except Exception as e:
		connection_exception = True
else:
	connection_exception = True

if connection_exception:
	print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, please check with the DevOps for Non Inventory cluster. Exiting...{Style.RESET_ALL}")
	sys.exit(1)

rep_name = os.environ.get('REPLICATION_TYPE')

## Setup fdw ##
status = pg_sync_non_inventory.execute_query("""
	CREATE SCHEMA IF NOT EXISTS inventory_global;
""")

status = status and pg_sync_non_inventory.execute_query("""
    CREATE SERVER IF NOT EXISTS foreign_server_name
    FOREIGN DATA WRAPPER postgres_fdw
    OPTIONS (
        host '{inv_host}',
        port '{inv_port}',
        dbname '{inv_dbname}',
        use_remote_estimate 'true'
    );
""".format(inv_host=pg_sync_inventory.db_host_original, inv_port=pg_sync_inventory.db_port_original, inv_dbname=pg_sync_inventory.db_name))

status = status and pg_sync_non_inventory.execute_query("""
    DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1
			FROM pg_user_mappings um
			JOIN pg_foreign_server fs ON fs.oid = um.srvid
			WHERE um.umuser = (SELECT usesysid FROM pg_user WHERE usename = '{inv_user}')
			  AND fs.srvname = 'foreign_server_name'
		) THEN
			EXECUTE 'CREATE USER MAPPING FOR "{inv_user}"
					 SERVER foreign_server_name
					 OPTIONS (user ''{inv_user}'', password ''{inv_pass}'')';
		END IF;
	END
	$$;
""".format(inv_user=pg_sync_inventory.db_user, inv_pass= pg_sync_inventory.db_pass))

## Setup fdw ##

if status:
	print(f"{Fore.GREEN}FDW setup successfull ! {Style.RESET_ALL}")
else:
	print(f"{Fore.RED}FDW setup failure ! {Style.RESET_ALL}")
	sys.exit(1)

replication_tables = pg_sync_inventory.get_results(f"select * from global.get_replication_tables('{rep_name}')")
if replication_tables and len(replication_tables) == 1:
	replication_tables = replication_tables[0]['tbl_names']
	if len(replication_tables) > 0:
		print("replication_tables", replication_tables)
		replication_tables_as_pg_list = '{' + ','.join(replication_tables) + '}'

		status = pg_sync_non_inventory.execute_query(f"call global.copy_fdw_tables('{replication_tables_as_pg_list}'::text[]);")
		if status:
			print(f"{Fore.GREEN}Tables copied via fdw for: {rep_name} {Style.RESET_ALL}")
		else:
			print(f"{Fore.RED}Tables copy failed via fdw for: {rep_name} {Style.RESET_ALL}")
			sys.exit(1)

		status = pg_sync_non_inventory.execute_query_unsafe(f"call global.create_delta_for_replication('{replication_tables_as_pg_list}'::text[]);")
		if status:
			print(f"{Fore.GREEN}Tables delta calculated for: {rep_name} {Style.RESET_ALL}")
		else:
			print(f"{Fore.RED}Tables delta calculation failed for: {rep_name} {Style.RESET_ALL}")
			sys.exit(1)

		status = pg_sync_non_inventory.execute_query_unsafe(f"call global.manual_replication_process('{replication_tables_as_pg_list}'::text[]);")
		if status:
			print(f"{Fore.GREEN}Manual replication success for: {rep_name} {Style.RESET_ALL}")
		else:
			print(f"{Fore.RED}Manual replication failed for: {rep_name} {Style.RESET_ALL}")
			sys.exit(1)
	else:
		print(f"{Fore.RED}No tables for manual replication for: {rep_name} {Style.RESET_ALL}")
		sys.exit(1)
else:
	print(f"{Fore.RED}No tables for manual replication for: {rep_name} {Style.RESET_ALL}")
	sys.exit(1)



# Cleanup
#drop schema if exists inventory_global;
#SELECT * FROM pg_user_mappings WHERE srvname = 'foreign_server_name';
#DROP USER MAPPING FOR "mtp-admin" SERVER foreign_server_name;
#DROP SERVER IF EXISTS foreign_server_name CASCADE;
# good help https://dba.stackexchange.com/questions/194507/how-do-i-set-the-option-use-remote-estimate
