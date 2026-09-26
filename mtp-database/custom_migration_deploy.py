import os
import requests
import json
import traceback
from colorama import Fore, Back, Style
import re
import sys
from pathlib import Path
import load_env
from services import PGSync
#from notify import send_pr_email

class NONDBAException(Exception):
	"""Non DBA Exception"""

clients = os.environ.get('CLIENTS').split("\n")
env = os.environ.get('ENV')
deployment_target = os.environ.get('DEPLOYMENT_TARGET', '')

if deployment_target == "REPLICATION":
	script_name = "custom_migration_non_inventory.sql"
else:
	script_name = "custom_migration.sql"

def add_role_to_changesets(input_file_path, role_name):
	try:
		with open(input_file_path, 'r', encoding='utf-8') as file:
			content = file.read()
		changeset_pattern = r'(--changeset\s+[^\n]+(?:\n--comment:[^\n]+)*)'
		
		# Function to replace each changeset block
		def add_role_statement(match):
			changeset_block = match.group(1)
			return f'{changeset_block}\nset role "{role_name}";'
		
		# Replace all changeset blocks with role statement added
		modified_content = re.sub(changeset_pattern, add_role_statement, content)
				
		# Write the modified content to output file
		with open(input_file_path, 'w', encoding='utf-8') as file:
			file.write(modified_content)
			
	except FileNotFoundError:
		print(f"Error: File '{input_file_path}' not found.")
	except Exception as e:
		print(f"Error processing file: {str(e)}")

for client in clients:
	connection_exception = False
	cred = os.environ.get("{}_{}".format(client, env))
	if cred:
		try:
			pg_sync = PGSync(client, env, False) #False server connection
			pg_sync.connection_check()

			if env == 'dev':
				role = "{}-{}".format(pg_sync.project, env)
			elif env in ['test', 'prod']:
				role = "{}-{}".format(pg_sync.project, 'backend')
			elif env == 'uat':
				role = "{}-{}-{}".format(pg_sync.project, env, 'backend')
			
			add_role_to_changesets(f"database/{client}/{script_name}", role)
			master_change_logs = """<?xml version="1.0" encoding="UTF-8"?>
<databaseChangeLog
   xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xmlns:pro="http://www.liquibase.org/xml/ns/pro"
   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
      http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.1.xsd
      http://www.liquibase.org/xml/ns/pro 
      http://www.liquibase.org/xml/ns/pro/liquibase-pro-4.1.xsd">
    <include file="database/pre-deployment.sql" relativeToChangelogFile="false"/>
	<include file="database/{client}/{script_name}" relativeToChangelogFile="false"/>
</databaseChangeLog>""".format(client=client, script_name=script_name)
			filename = "liquibase/{client}/custom_migration_changelog.xml".format(client=client)
			os.makedirs(os.path.dirname(filename), exist_ok=True)
			f = open(filename, "w")
			f.write(master_change_logs)
			f.close()
		except Exception as e:
			connection_exception = True
	else:
		connection_exception = True

if connection_exception:
	print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, please check with the DevOps{Style.RESET_ALL}")
	raise NONDBAException()
