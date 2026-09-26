import os
import requests
import load_env
import json

def send_email(subject=os.environ.get('EMAIL_SUBJECT'), html_body=os.environ.get('EMAIL_BODY'), attachments=[]):
	url = os.environ.get('MAILGUN_URL')
	auth = ("api", os.environ.get('MAILGUN_KEY'))
	data = {
		"from": 'info@impactanalytics.co',
		"to": os.environ.get('DEPLOYMENT_MAILING_LIST'),
		#"to": "ashish@impactanalytics.co",
		"subject": subject,
		"html": html_body
	}
	files = attachments
	response = requests.post(url, auth=auth, data=data, files=files,)

def send_pr_email(subject=os.environ.get('EMAIL_SUBJECT'), html_body=os.environ.get('EMAIL_BODY'), attachments=[]):
	url = os.environ.get('MAILGUN_URL')
	auth = ("api", os.environ.get('MAILGUN_KEY'))
	data = {
		"from": 'info@impactanalytics.co',
		"to": os.environ.get('BUILD_FAILURE_MAILING_LIST'),
		#"to": "ashish@impactanalytics.co",
		"subject": subject,
		"html": html_body
	}
	files = attachments
	response = requests.post(url, auth=auth, data=data, files=files,)

def send_maintenance_email(subject=os.environ.get('EMAIL_SUBJECT'), html_body=os.environ.get('EMAIL_BODY'), attachments=[]):
	attachments.append(("attachment", (
			'health_checkup_report.xlsx', 
			open('health_checkup_report.xlsx', "rb").read()
		)
	))
	url = os.environ.get('MAILGUN_URL')
	auth = ("api", os.environ.get('MAILGUN_KEY'))
	
	switch= "{}_{}".format(os.environ.get('CLIENTS'), os.environ["ENV"])
	tab = json.loads(os.environ.get(switch, "{}"))
	email_list = tab["MAINTINANCE_MAILING_LIST"]
	#email_list.append("ashish@impactanalytics.co")
	data = {
		"from": 'info@impactanalytics.co',
		"to": email_list,
		#"to": "ashish@impactanalytics.co",
		"subject": subject,
		"html": html_body
	}
	files = attachments
	response = requests.post(url, auth=auth, data=data, files=files,)

def send_monitoring_alert(client, env, subject, body):
	"""Send monitoring alert email"""
	url = os.environ.get('MAILGUN_URL')
	auth = ("api", os.environ.get('MAILGUN_KEY'))
		
	data = {
		"from": 'info@impactanalytics.co',
		"to": "ashish@impactanalytics.co,milind.jain@impactanalytics.co,manish2.kumar@impactanalytics.co,shaik.azmathulla@impactanalytics.co",
		"subject": subject,
		"html": body
	}
	
	try:
		response = requests.post(url, auth=auth, data=data)
		print(f"Monitoring alert email sent. Response: {response.status_code}")
		return response
	except Exception as e:
		print(f"Failed to send monitoring alert: {str(e)}")
		return None
