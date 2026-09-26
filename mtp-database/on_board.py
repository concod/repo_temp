import os
import requests
import json
import traceback
import load_env
from services import PGSync
#from notify import send_pr_email
from colorama import Fore, Back, Style

class CompileException(Exception):
	"""Compile Exception"""

def format_name(name):
	return name.replace('_', ' ').upper()

clients = os.environ.get('CLIENTS').split("\n")
env = os.environ.get('ENV')
deployment_target = os.environ.get('DEPLOYMENT_TARGET', '')
compile_exception = False

print(Fore.GREEN + "Setup for:", clients)
print(Style.RESET_ALL)

for client in clients:
	connection_exception = False
	if deployment_target == "REPLICATION":
		cred = os.environ.get("{}_{}_non_inventory".format(client, env))
	else:
		cred = os.environ.get("{}_{}".format(client, env))
	if cred:
		try:
			if deployment_target == "REPLICATION":
				pg_sync = PGSync(client, env + '_non_inventory', False, True) #False, True server admin connection
			else:
				pg_sync = PGSync(client, env, False, True) #False, True server admin connection
			pg_sync.connection_check()
		except Exception as e:
			connection_exception = True
	else:
		connection_exception = True

	if connection_exception:
		print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, May be tring to onboard if issue persist then please check with the DevOps{Style.RESET_ALL}")

	if deployment_target == "REPLICATION":
		pg_sync_admin = PGSync(client, env + '_non_inventory', False, True) #False, True server admin connection
	else:
		pg_sync_admin = PGSync(client, env, False, True) #False, True server admin connection

	status = pg_sync_admin.create_roles()
	if status:
		print(f"{Fore.GREEN}Step 1: Roles setup done for {client} {env}{Style.RESET_ALL}")
		status = pg_sync_admin.create_db()
		if status:
			print(f"{Fore.GREEN}Step 2: DB creation done for {client} {env}{Style.RESET_ALL}")
			if deployment_target == "REPLICATION":
				pg_sync = PGSync(client, env + '_non_inventory', False, False)
			else:
				pg_sync = PGSync(client, env, False, False)
			status = pg_sync.init_db()
			if status:
				print(f"{Fore.GREEN}Step 3: DB initiating done for {client} {env}{Style.RESET_ALL}")
				status = pg_sync.set_default_permissions() #connect, usage
				if status:
					print(f"{Fore.GREEN}Step 4: DB default permissions set for {client} {env}{Style.RESET_ALL}")
					status = pg_sync_admin.set_default_role_mapping()
					if status:
						print(f"{Fore.GREEN}Step 5: DB default role mapping set for {client} {env}{Style.RESET_ALL}")
					else:
						print(f"{Fore.RED}Step 5: Error in setting default role mapping for {client} {env}{Style.RESET_ALL}")
				else:
					print(f"{Fore.RED}Step 4: Error in setting default permissions for {client} {env}{Style.RESET_ALL}")
			else:
				print(f"{Fore.RED}Step 3: Error in initiating database for {client} {env}{Style.RESET_ALL}")
		else:
			print(f"{Fore.RED}Step 2: Error in creating database for {client} {env}{Style.RESET_ALL}")
	else:
		print(f"{Fore.RED}Step 1: Error in creating default roles for {client} {env}{Style.RESET_ALL}")
