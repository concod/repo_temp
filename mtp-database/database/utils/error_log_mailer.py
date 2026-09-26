import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email.utils import COMMASPACE
from email import encoders
import os
import json
import requests

mail_config = json.loads(os.environ.get('mail_creds')) if os.environ.get('mail_creds') else {}
# Mailgun credentials
SMTP_SERVER = mail_config.get('mail_server')
SMTP_PORT = mail_config.get('mail_port')
SMTP_USERNAME = mail_config.get('mail_username')
SMTP_PASSWORD = mail_config.get('mail_password')
SMTP_FROM = mail_config.get('mail_from')
SMTP_USE_TLS = True
SMTP_USE_SSL = False
SMTP_USE_CREDENTIALS = True
SMTP_VALIDATE_CERTS = True	

def get_pipeline_user():
    triggerer_uuid = os.getenv('BITBUCKET_STEP_TRIGGERER_UUID')
    api_url = f"https://api.bitbucket.org/2.0/users/{triggerer_uuid}"
    response = requests.get(api_url)
    name = ""
    if response.status_code == 200:
        data = response.json()
        name = data['display_name']
    return name

def send_mail(client,env,choice='sp_sync',replication_value=None):
    # Recipients of the email
    to_emails = mail_config.get('receiver_emails', [])
    if env in ["uat","prod"]:
        uat_prod_mails =  mail_config.get('uat_prod_emails', [])
        to_emails.extend(uat_prod_mails)
    # Remove duplicates from the to_emails list if any
    to_emails = list(set(to_emails))
    # File to attach
    file_path = os.getcwd() + f'/sync_error_{client}_{env}.txt'
    if client:
        client = client.upper()
    if env:
        env = env.upper()
    if replication_value:
        replication_value = replication_value.upper()
    sync_choice = 'SP'
    if choice == 'data_sync':
        sync_choice = 'CSV'
    
    msg = MIMEMultipart()
    msg['From'] = SMTP_FROM
    msg['To'] = COMMASPACE.join(to_emails)
    
    pipeline_user = get_pipeline_user()
    # Check if file exists and is not empty
    if os.path.exists(file_path) and os.path.getsize(file_path) > 0:
        # Create the email message
        subject = f"{client} {env} {sync_choice} SYNC ERROR LOG"
        if replication_value:
            subject = f"{client} {env} {replication_value} {sync_choice} SYNC ERROR LOG"
        msg['Subject'] = subject

        pipeline_url = f"https://bitbucket.org/{os.environ.get('BITBUCKET_WORKSPACE')}/{os.environ.get('BITBUCKET_REPO_SLUG')}/pipelines/results/{os.environ.get('BITBUCKET_BUILD_NUMBER')}/"

        # Add the text message
        msg.attach(MIMEText(f"Pipeline triggered by : {pipeline_user}\n\nPlease find the attached error log file for the db sync pipeline that just ran.\nPipline URL - {pipeline_url}"))
        
        # Add the attachment
        with open(file_path, 'rb') as file:
            part = MIMEBase('application', 'octet-stream')
            part.set_payload(file.read())
            encoders.encode_base64(part)
            part.add_header('Content-Disposition', f'attachment; filename="{os.path.basename(file_path)}"')
            msg.attach(part)
    else:
        # Create the email message
        subject = f"{client} {env} {sync_choice} SYNC Successful!"
        if replication_value:
            subject = f"{client} {env} {replication_value} {sync_choice} SYNC Successful!"
        msg['Subject'] = subject

        # Add the success text message
        success_message = f"Pipeline triggered by : {pipeline_user}\n\nPipeline successfully executed for {client} {env}"
        if replication_value:
            success_message += f" {replication_value}"
        success_message += f" {sync_choice} sync"
        msg.attach(MIMEText(success_message))
       
    # Connect to the SMTP server and send the email
    smtp_server = smtplib.SMTP(SMTP_SERVER, SMTP_PORT)
    smtp_server.starttls()
    smtp_server.login(SMTP_USERNAME, SMTP_PASSWORD)
    smtp_server.sendmail(SMTP_FROM, to_emails, msg.as_string())
    smtp_server.quit()  # Log out and terminate the session
    print('Email sent successfully!')