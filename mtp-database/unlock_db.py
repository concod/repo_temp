import os
import traceback
import sys
import load_env
from services import PGSync
from colorama import Fore, Back, Style

clients = os.environ.get('CLIENT').split("\n")
env = os.environ.get('ENV')
maintenance_type = os.environ.get('MAINTENANCE_TYPE')

if maintenance_type == 'aggressive':
	sync_type = 'DB MAINTENANCE AGGRESSIVE'
else:
	sync_type = 'DB MAINTENANCE'

print(Fore.GREEN + "Cleanup for:", clients)
print(Style.RESET_ALL)

failed = False

if __name__ == '__main__':
	for client in clients:
		pg_sync = PGSync(client, env, False, False)
		result = pg_sync.execute_query(
			f"call public.ensure_exclusive_db_flow(false, '{sync_type}')"
		)
		if result:
			print(f"✓ Database unlocked successfully for {client} {env}")
		else:
			print(f"✗ Failed to unlock database for {client} {env}")
			print("⚠️  Database may be down or unreachable.")
			failed = True
	sys.exit(1 if failed else 0)