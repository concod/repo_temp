import os
import requests
import json
import traceback
import re
import load_env
from services import PGSync
from notify import send_pr_email
from colorama import Fore, Back, Style
from error_message_helper import ErrorMessageHelper
from error_blame_analyzer import ErrorBlameAnalyzer, _is_real_author_email, _sanitize_email

class CompileException(Exception):
	"""Compile Exception"""

def format_name(name):
	return name.replace('_', ' ').upper()

clients = os.environ.get('CLIENTS').split("\n")
env = os.environ.get('ENV')
cs_map = json.loads(os.environ.get('SCHEMAS'))
#compile_exception = False
compile_exception_count = 0

if 'schemas' in clients: # Common schema changes detected can impact on all clients
	clients = list(cs_map.keys())

files = os.environ.get('BRANCH_DIFF') # Validate if diff changes for mentioned clients or not
if files:
	files = files.split("\n")
	sc = []
	filtered_clients = []
	for f in files:
		sc.append(f.split('/')[-3])
	sc = list(set(sc)) # Products impacted via this PR
	os.environ["changed_schemas"] = json.dumps(sc) # based on products mode of deployment_mode
	for c in clients:
		for s in sc:
			if c in cs_map and s in cs_map[c]['schemas']:
				filtered_clients.append(c)
	clients = list(set(filtered_clients))
# If no clients after filtering, client or schema is not present in secrets
if len(clients) == 0:
    print(Fore.RED + "Client or schema not present in the secrets." + Style.RESET_ALL)
    raise CompileException("Client or schema not present in the secrets.")
    
print(Fore.GREEN + "Compiling for:")
for client in clients:
	print(Fore.GREEN + "\t" + client)
print(Style.RESET_ALL)

for client in clients:
	connection_exception = False
	if os.environ.get('VALIDATE_ONLY') != "True":
		cred = os.environ.get("{}_{}".format(client, env))
		if cred:
			try:
				pg_sync = PGSync(client, env, False) #False server connection
				pg_sync.connection_check()
				del pg_sync
			except Exception as e:
				connection_exception = True
		else:
			connection_exception = True

	if connection_exception:
		print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, please check with the DevOps{Style.RESET_ALL}")
		continue

	errors = ""
	pg_sync = PGSync(client, env, True) #True local connection
	db_name = pg_sync.db_name
	res = pg_sync.compile_schema(client)
	if len(res) > 0:
		# Use error helper to format and display errors beautifully
		error_helper = ErrorMessageHelper()
		formatted_errors = error_helper.format_compilation_errors(res)
		print(formatted_errors)
		
		print(Fore.RED + "\nCompilation error for {} {}".format(client, env))
		report = {}
		for r in res:
			s = r.split("/")
			if s[1] == 'schemas':
				key = 'common'
			else:
				key = client
			if key not in report:
				report[key] = {}
			if s[-3] not in report[key]:
				report[key][s[-3]] = {}
			if s[-2] not in report[key][s[-3]]:
				report[key][s[-3]][s[-2]] = []
			report[key][s[-3]][s[-2]].append(s[-1].replace(".sql", ""))
		for l1 in report:
			#print("\n")
			print(Fore.RED + l1.title())
			for l2 in report[l1]:
				print(Fore.RED + "\t", l2.title())
				for l3 in report[l1][l2]:
					print(Fore.RED + "\t\t", l3.title())
					for l4 in report[l1][l2][l3]:
						print(Fore.RED + "\t\t\t", l4)
		print(Style.RESET_ALL)
		for e in res:
			cl = e.split('/')[1]
			if cl == 'schemas':
				t1 = 'common'
			else:
				t1 = cl
			sc = e.split('/')[-3]
			if sc == 'global':
				t2 = 'core'
			elif sc == 'public':
				t2 = 'data ingestion'
			else:
				t2 = sc
			errors += """<tr><td>""" + (' → '.join(x.capitalize() for x in (e.replace('.sql', '').replace('_', ' ')).split('/'))).replace('block start', "<span style='color:red'>").replace('block end', "</span> ") + (" <span style='background-color: rgba(222,222,222,0.5); color: crimson; font-size: 12px; font-weight: bold; padding: 2px 10px;'>" + t1.replace('_', ' ').upper() + "</span>") + (" <span style='background-color: rgba(222,222,222,0.5); color: crimson; font-size: 12px; font-weight: bold; padding: 2px 10px;'>" + t2.replace('_', ' ').upper() + "</span>") + """</td></tr>"""
		
		# Analyze error responsibility using git blame and send separate personalized emails
		additional_recipients = []
		responsibility_msg = ""
		try:
			error_helper = ErrorMessageHelper()
			blame_analyzer = ErrorBlameAnalyzer()
			blame_analysis = blame_analyzer.analyze_errors(res)
			
			# Get additional recipients (authors of unchanged files with errors)
			additional_recipients = [
				email for email in blame_analysis['all_responsible_emails']
				if email and email != blame_analyzer.pr_author_email
			]
			
			print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
			print(f"{Fore.CYAN}Sending personalized emails to responsible parties...{Style.RESET_ALL}")
			print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}\n")
			
			# === SEND SEPARATE EMAILS TO EACH PERSON ===
			
			# 1. Send email to PR Author (if they have errors)
			if blame_analysis['pr_author_errors']:
				pr_errors_html = ""
				for err in blame_analysis['pr_author_errors']:
					# Extract file path
					file_match = re.match(r'(.*?)\s*-\s*block_start(.*)block_end', err)
					if file_match:
						file_path = file_match.group(1).strip()
						error_details = error_helper.format_error_for_email_html(err, file_path)
						
						pr_errors_html += f"<tr><td style='padding:10px; border-bottom:1px solid #ddd;'>"
						pr_errors_html += f"<b>📄 {file_path}</b><br/><br/>"
						
						for idx, detail in enumerate(error_details, 1):
							pr_errors_html += f"<div style='margin:10px 0; padding:10px; background:#fff3cd; border-left:4px solid #ffc107;'>"
							pr_errors_html += f"<b>Issue {idx}: {detail['title']}</b><br/>"
							pr_errors_html += f"<b style='color:#d32f2f;'>❌ Problem:</b> {detail['problem']}<br/><br/>"
							pr_errors_html += f"<b style='color:#388e3c;'>✅ Solution:</b><br/><ul>"
							for sol in detail['solutions']:
								pr_errors_html += f"<li>{sol}</li>"
							pr_errors_html += "</ul>"
							if detail['example']:
								pr_errors_html += f"<b>📝 Example:</b><br/><pre style='background:#f5f5f5; padding:10px; border-radius:4px; overflow-x:auto; font-family:monospace; font-size:12px;'>{detail['example']}</pre>"
							pr_errors_html += "</div>"
						
						pr_errors_html += "</td></tr>"
				
				pr_author_msg = f"""Hi {os.environ.get('BUILD_TRIGGER_BY', 'Developer')},<br/><br/>
				Your PR has <b style='color:#d32f2f;'>{len(blame_analysis['pr_author_errors'])} error(s)</b> in <b>{format_name(client)} {format_name(env)}</b>.<br/><br/>
				<b>📋 PR Details:</b><br/>
				• PR: <a href='{os.environ.get('BITBUCKET_GIT_HTTP_ORIGIN')}/pull-requests/{os.environ.get('BITBUCKET_PR_ID')}'>{os.environ.get('BITBUCKET_PR_ID')}</a><br/>
				• Branch: {os.environ.get('BITBUCKET_BRANCH')} → {os.environ.get('BITBUCKET_PR_DESTINATION_BRANCH')}<br/><br/>
				<b>🔧 Errors in Your Changes:</b><br/>
				<table width='100%' style='border-collapse:collapse;'>{pr_errors_html}</table><br/>
				"""
				
				if blame_analysis['other_author_errors']:
					pr_author_msg += f"""<br/><div style='background:#fff3cd; padding:15px; border-left:4px solid #ffc107; border-radius:4px;'>
					<b>📧 Also Notified:</b><br/>
					<span style='color:#f57c00;'>{len(blame_analysis['other_author_errors'])} other author(s) have been notified about errors in files they authored.</span></div><br/>"""
				
				pr_author_msg += """<br/><b>Note:</b> Please fix these errors before merging. Contact db-architects@impactanalytics.co for help.<br/>
				<span style='color:rgb(136,136,136); font-size: 12px;'>**This is an auto-generated email.**</span>"""
				
				send_pr_email(
					f"[PR Validation] Your PR Has {len(blame_analysis['pr_author_errors'])} Error(s) - {format_name(client)} {format_name(env)}",
					pr_author_msg,
					[("attachment", ("Logs.txt", open('sync_error.txt', "rb").read()))] if os.path.isfile('sync_error.txt') else []
				)
				print(f"{Fore.GREEN}✓ Sent email to PR author{Style.RESET_ALL}")
			
			# 2. Send SEPARATE emails to each original author
			for author_email, details in blame_analysis['other_author_errors'].items():
				# Skip CI service-account / placeholder emails
				if not _is_real_author_email(author_email):
					print(f"{Fore.YELLOW}⚠ Skipping placeholder email: {author_email}{Style.RESET_ALL}")
					continue
				
				# Sanitize email
				cleaned_email = _sanitize_email(author_email)
				if cleaned_email != author_email:
					print(f"{Fore.CYAN}ℹ️  Email sanitized: {author_email} → {cleaned_email}{Style.RESET_ALL}")
				
				author_name = cleaned_email.split('@')[0].replace('.', ' ').title() if '@' in cleaned_email else cleaned_email
				
				# Format their specific errors (Option A: no file path in detailed section)
				author_errors_html = ""
				for err in details['errors']:
					file_match = re.match(r'(.*?)\s*-\s*block_start(.*)block_end', err)
					if file_match:
						file_path = file_match.group(1).strip()
						error_details = error_helper.format_error_for_email_html(err, file_path)
						author_errors_html += "<tr><td style='padding:16px; border-bottom:1px solid #e0e0e0;'>"
						for idx, detail in enumerate(error_details, 1):
							icon = "⚠️" if detail['is_missing'] else "🔴"
							bg_color = "#fffbf0" if detail['is_missing'] else "#fff5f5"
							border_color = "#edb806" if detail['is_missing'] else "#c62828"
							author_errors_html += f"<div style='margin:0 0 16px 0; padding:16px; background:{bg_color}; border-left:4px solid {border_color}; border-radius:6px; font-family:-apple-system,BlinkMacSystemFont,\"Segoe UI\",Roboto,Helvetica,Arial,sans-serif; font-size:14px; line-height:1.5; color:#333;'>"
							author_errors_html += f"<p style='margin:0 0 10px 0; font-weight:600; font-size:15px; color:#1a1a1a;'>{icon} Issue {idx}: {detail['title']}</p>"
							if detail.get('problem'):
								author_errors_html += f"<p style='margin:8px 0;'><b style='color:#c62828;'>❌ Problem:</b> {detail['problem']}</p>"
							author_errors_html += f"<p style='margin:8px 0;'><b style='color:#2e7d32;'>✅ How to Fix:</b></p><ul style='margin:6px 0; padding-left:20px;'>"
							for sol in detail['solutions']:
								author_errors_html += f"<li style='margin:4px 0;'>{sol}</li>"
							author_errors_html += "</ul>"
							if detail.get('example'):
								author_errors_html += f"<p style='margin:10px 0 4px 0;'><b>📝 Example:</b></p><pre style='margin:0; background:#f5f5f5; padding:12px; border-radius:4px; font-size:13px; font-family:Consolas,monospace; overflow-x:auto;'>{detail['example']}</pre>"
							if detail.get('note'):
								author_errors_html += f"<p style='margin:10px 0; padding:10px; background:#e3f2fd; border-left:4px solid #1976d2; border-radius:4px;'><b>💡 Note:</b> {detail['note']}</p>"
							author_errors_html += "</div>"
						author_errors_html += "</td></tr>"

				# Modern theme (reference: blue header, cards, sans-serif)
				_font = "font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;"
				author_msg = f"""<div style='max-width:600px; margin:0 auto; {_font} font-size:15px; line-height:1.5; color:#333;'>
				<div style='background:#1976d2; color:#fff; padding:24px 20px; text-align:center; border-radius:6px 6px 0 0;'>
				<p style='margin:0; font-size:20px; font-weight:600;'>PR Validation — Errors in Your Files</p>
				<p style='margin:8px 0 0 0; font-size:14px; opacity:0.95;'>Client: {format_name(client)} {format_name(env)}</p>
				</div>
				<div style='padding:24px 20px; background:#fff; border:1px solid #e0e0e0; border-top:none; border-radius:0 0 6px 6px;'>
				<p style='margin:0 0 20px 0; font-size:15px;'>Hi {author_name},</p>
				<p style='margin:0 0 20px 0;'>A PR by <b>{os.environ.get('BUILD_TRIGGER_BY', 'another developer')}</b> has detected <b style='color:#c62828;'>{len(details['errors'])} error(s)</b> in files you previously authored.</p>
				<div style='background:#f8f9fa; padding:14px 18px; border-radius:6px; border:1px solid #e8e8e8; margin:16px 0;'>
				<p style='margin:0 0 8px 0; font-size:14px; font-weight:600; color:#1a1a1a;'>📋 PR Details</p>
				<p style='margin:0; font-size:14px; color:#555;'>Triggered by: {os.environ.get('BUILD_TRIGGER_BY')} · Client: {format_name(client)} {format_name(env)}</p>
				</div>
				<div style='background:#f8f9fa; padding:14px 18px; border-radius:6px; border:1px solid #e8e8e8; margin:16px 0;'>
				<p style='margin:0 0 10px 0; font-size:14px; font-weight:600; color:#1a1a1a;'>📂 Your Files with Errors ({len(details['files'])})</p>
				<ul style='margin:0; padding-left:20px; font-size:14px; color:#444;'>
				"""
				for file in details['files']:
					author_msg += f"<li style='margin:4px 0;'><code style='background:#eee; padding:2px 6px; border-radius:4px; font-size:13px;'>{file}</code></li>"
				author_msg += f"""</ul>
				</div>
				<p style='margin:20px 0 10px 0; font-size:14px; font-weight:600; color:#1a1a1a;'>🔍 Detailed Errors &amp; Solutions</p>
				<table width='100%' style='border-collapse:collapse; border:1px solid #e0e0e0; border-radius:6px; font-size:14px; {_font}'>{author_errors_html}</table>
				<div style='background:#fffbf0; padding:18px 20px; border:1px solid #edb806; border-radius:6px; margin:20px 0;'>
				<p style='margin:0 0 12px 0; font-weight:600; font-size:15px; color:#1a1a1a;'>🔧 Action Required</p>
				<ol style='margin:0; padding-left:20px; font-size:14px; color:#444;'>
				<li style='margin:6px 0;'>Review the errors in your files above</li>
				<li style='margin:6px 0;'>Fix the issues OR add them to <code>exceptions.json</code> if they are false positives</li>
				<li style='margin:6px 0;'>Contact <b>{os.environ.get('BUILD_TRIGGER_BY')}</b> if you need context about this PR</li>
				<li style='margin:6px 0;'>Reach out to <a href='mailto:db-architects@impactanalytics.co' style='color:#1976d2; text-decoration:none;'>db-architects@impactanalytics.co</a> if you need assistance</li>
				</ol>
				</div>
				<p style='margin:16px 0 0 0; font-size:14px; color:#666;'>Note: These files were not changed in the current PR, but they have errors that need to be resolved.</p>
				<p style='margin:24px 0 0 0; font-size:12px; color:#888;'>This is an auto-generated email. Do not reply.</p>
				</div>
				</div>
				"""
			
				# Send ONLY to this author
				url = os.environ.get('MAILGUN_URL')
				auth = ("api", os.environ.get('MAILGUN_KEY'))
				data = {
					"from": 'DB Pipeline <info@impactanalytics.co>',
					"to": cleaned_email,
					"subject": f"[TESTING] Please ignore this email] {len(details['errors'])} Error(s) in Your Files - {format_name(client)} {format_name(env)}",
					"html": author_msg
				}
				response = requests.post(url, auth=auth, data=data)
			
				print(f"{Fore.GREEN}✓ Sent to {author_name} ({cleaned_email}) - {response.status_code}{Style.RESET_ALL}")
		
			print(f"\n{Fore.GREEN}{'='*80}{Style.RESET_ALL}")
			print(f"{Fore.GREEN}✓ All personalized emails sent successfully!{Style.RESET_ALL}")
			print(f"{Fore.GREEN}{'='*80}{Style.RESET_ALL}\n")

		except Exception as e:
			print(f"\n{Fore.YELLOW}Warning: Could not send personalized emails: {e}{Style.RESET_ALL}")
			traceback.print_exc()
			
			# Fallback: send one email with all errors (old behavior)
			print(f"{Fore.YELLOW}Falling back to single email notification...{Style.RESET_ALL}")
			subject = "[PR Validation] ({client} {env}) Failed!".format(client=format_name(client), env=format_name(env))
			msg = """Hi all,<br/><br/>Pipeline detected a few errors for <b>{client} {env}</b> ({db_name}) DB builds. It can be a syntax, dependency, or known vulnerability issue. Please look at the attached log file from bottom to top in order of reported file name.<br/> <b>Trigger By: </b>{trigger_by}<br/><b>PR: </b><a href='{repo_url}/pull-requests/{pr_id}'>{pr_id}</a><br/><b>Branch: </b><a href='{repo_url}/branch/{branch_id}'>{branch_id}</a><br/><b>Target Branch: </b><a href='{repo_url}/branch/{destination_branch_id}'>{destination_branch_id}</a><br/><b>Errors: </b><br/><table width='100%'>{errors}</table><br/><br/><br/><b>Note:</b> A broken PR can lead to any issue in any module please fix all errors before merging with the parent branch. For a manual intervention please contact at db-architects@impactanalytics.co<br/><span color='rgb(136,136,136); font-size: 12px;'>**This is an auto generated Email, please do not reply back on this email.</span>""".format(pr_id=os.environ.get('BITBUCKET_PR_ID'), repo_url=os.environ.get('BITBUCKET_GIT_HTTP_ORIGIN'), branch_id=os.environ.get('BITBUCKET_BRANCH'), destination_branch_id=os.environ.get('BITBUCKET_PR_DESTINATION_BRANCH'), client=format_name(client), env=format_name(env), errors=errors, trigger_by=os.environ.get('BUILD_TRIGGER_BY'), db_name=db_name)
			send_pr_email(subject, msg, [
				("attachment", (
					'Logs.txt',
					open('sync_error.txt', "rb").read()
				))
			] if os.path.isfile('sync_error.txt') else [])
		
		#compile_exception = True
		compile_exception_count = compile_exception_count+1
	else:
		print(f"{Fore.GREEN}\nCompilation pass for {client} {env}{Style.RESET_ALL}")

	# Cleanup database from local for another build
	del pg_sync
	pg_sync = PGSync(client, env, True) #True local connection
	pg_sync.drop_db_if_exists()

with open('compile_exception_count.sh', 'w') as f:
    f.write(f"export COMPILE_EXCEPTIONS_COUNT={compile_exception_count}\n")

#if compile_exception:
if len(clients) > 0 and compile_exception_count == len(clients):
    raise CompileException()
