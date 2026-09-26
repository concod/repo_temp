import os
import sys
import traceback
import load_env

from services import PGSync
from notify import send_monitoring_alert
from colorama import Fore, Style

def send_alert_email(client, env, alert_items):
	"""Send email with alert details"""
	try:
		# Build email content
		email_subject = f"Monitoring Alert - {client.upper()} {env.upper()}"
		
		email_body = f"""
		<html>
		<body>
		Hi all, <br/><br/>Jump to <a href='$BITBUCKET_GIT_HTTP_ORIGIN/pipelines/results/$BITBUCKET_BUILD_NUMBER'>build</a> for details<br/><br/>
		<h2>Monitoring Alert Report</h2>
		<table border="1" style="border-collapse: collapse;">
		<tr>
			<th style="padding: 8px;">pubname</th>
			<th style="padding: 8px;">name</th>
			<th style="padding: 8px;">slot_name</th>
			<th style="padding: 8px;">active</th>
			<th style="padding: 8px;">inactive_since</th>
			<th style="padding: 8px;">retained_wal_size</th>
			<th style="padding: 8px;">lag_bytes</th>
			<th style="padding: 8px;">lag_raw_bytes</th>
			<th style="padding: 8px;">tbl_count</th>
		</tr>
		"""

		for item in alert_items:
			email_body += f"""
		<tr>
			<td style="padding: 8px;">{item['pubname']}</td>
			<td style="padding: 8px;">{item['name']}</td>
			<td style="padding: 8px;">{item['slot_name']}</td>
			<td style="padding: 8px;">{item['active']}</td>
			<td style="padding: 8px;">{item['inactive_since']}</td>
			<td style="padding: 8px;">{item['retained_wal_size']}</td>
			<td style="padding: 8px;">{item['lag_bytes']}</td>
			<td style="padding: 8px;">{item['lag_raw_bytes']}</td>
			<td style="padding: 8px;">{item['tbl_count']}</td>
		</tr>"""

		email_body += """
		</table>
		<p>Please investigate these items that have triggered monitoring alerts.</p>
		</body>
		</html>
		"""

		# Send email using existing notification system
		send_monitoring_alert(
			client=client,
			env=env,
			subject=email_subject,
			body=email_body,
		)
		print(f"Alert email sent successfully to monitoring team")
	except Exception as e:
		print(f"Error sending alert email: {str(e)}")

def run_monitoring_query(client, env):
	"""Run the monitoring query and process results"""
	try:
		monitoring_query = """
			SELECT *
			FROM (
				SELECT *
				FROM (
					-- Get all publication names and derive a common 'name' field
					SELECT 
						pubname, 
						REPLACE(pubname, '_pub', '') AS name
					FROM pg_publication
				) pub

				-- Join with replication slot data using common name
				LEFT JOIN (
					SELECT 
						slot_name,
						REPLACE(slot_name, '_sub', '') AS name,
						active,
						inactive_since,
						pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal_size,
						pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS lag_bytes,
						pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_raw_bytes
					FROM pg_replication_slots
				) slot USING (name)

				-- Join with publication table count using pubname and name
				LEFT JOIN (
					SELECT 
						pubname, 
						REPLACE(pubname, '_pub', '') AS name, 
						COUNT(1) AS tbl_count
					FROM pg_publication_tables
					GROUP BY 1
				) tbl USING (pubname, name)

			) dt

			-- Alert conditions
			WHERE 
				active IS NULL 
				OR active = FALSE 
				OR lag_raw_bytes >= 1000000000;"""

		connection_exception = False
		cred = os.environ.get("{}_{}".format(client, env))
		if cred:
			try:
				pg_sync = PGSync(client, env, False) #False server connection
				pg_sync.connection_check()
			except Exception as e:
				connection_exception = True
		else:
			connection_exception = True

		if connection_exception:
			print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, please check with the DevOps{Style.RESET_ALL}")
			send_monitoring_alert(
				client=client,
				env=env,
				subject=f"Monitoring Alert - {client.upper()} {env.upper()} Connection Failure",
				body="<html><body>Hi all, <br/><br/>Jump to <a href='$BITBUCKET_GIT_HTTP_ORIGIN/pipelines/results/$BITBUCKET_BUILD_NUMBER'>build</a> for details<br/><br/><h2>Alert Manager not able to connect with db</h2></body></html>",
			)
		else:
			alert_items = pg_sync.get_results(monitoring_query)
			if alert_items:
				print(f"{Fore.RED}{client} {env}: {len(alert_items)} alerts found")
				# Send email alert
				send_alert_email(client, env, alert_items)
			else:
				print(f"{Fore.GREEN}{client} {env}: No alerts found")

	except Exception as e:
		print(f"Error in monitoring: {str(e)}")
		send_monitoring_alert(
			client=client,
			env=env,
			subject=f"Monitoring Alert - {client.upper()} {env.upper()} Pipeline Failure",
			body="<html><body><h2>Hi all, <br/><br/>Jump to <a href='$BITBUCKET_GIT_HTTP_ORIGIN/pipelines/results/$BITBUCKET_BUILD_NUMBER'>build</a> for details<br/><br/>Alert Manager failed via an exception</h2></body></html>",
		)
		traceback.print_exc()
		sys.exit(1)

if __name__ == "__main__":
	clients = os.environ.get('CLIENTS')
	env = os.environ.get('ENV')
	print(f"{Fore.GREEN}Starting monitoring pipeline for {clients} {env}{Style.RESET_ALL}")
	for client in clients.split(','):
		run_monitoring_query(client.strip(), env)
	print(f"{Fore.GREEN}Monitoring pipeline completed{Style.RESET_ALL}") 
