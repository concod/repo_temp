#!/bin/bash -e

Red='\033[0;31m'
Green='\033[0;32m'

#send email
send_maintenance_email() {
python3.8 -c """
from notify import send_maintenance_email
send_maintenance_email()
"""
}

export CLIENTS=$CLIENT
export PP_TYPE=maintenance
error_in_deployment=false

source ./print_docs.sh # Print docs
export CLIENTS=$(echo "$CLIENTS" | grep -vwF -f <(tr ' ' '\n' <<< "$OFFBOARD_CLIENTS"))
if [ -z "$CLIENTS" ]; then
    echo -e "${RED}No clients were selected. Kindly retrigger the new pipeline instead of re-running."
    exit 1;
fi

SECRET=`gcloud secrets versions access latest --secret=$PROJECT_ID-database-deployment-$ENV`
db_name=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_name`

{
    python3.8 maintenance.py
} || {
    error_in_deployment=true
}

if [ $error_in_deployment = true ]; then
    export EMAIL_SUBJECT="[DB Maintenance] (${CLIENT^^} ${ENV^^}) Failed!"
    export EMAIL_BODY="Hi all,<br/><br/>DB Maintenance failed for <b>${CLIENT^^} ${ENV^^}</b> ($db_name). Jump to <a href='$BITBUCKET_GIT_HTTP_ORIGIN/pipelines/results/$BITBUCKET_BUILD_NUMBER'>build</a> for details of Maintenance job.<br/> <b>Trigger By: </b>$BUILD_TRIGGER_BY<br/><br/><br/><br/><b>Note:</b> For a manual intervention please contact at db-architects@impactanalytics.co<br/><span color='rgb(136,136,136); font-size: 12px;'>**This is an auto generated Email, please do not reply back on this email.</span>"
    send_maintenance_email
    exit 1;
else
    export EMAIL_SUBJECT="[DB Maintenance] (${CLIENT^^} ${ENV^^}) Successful!"
    export EMAIL_BODY="Hi all,<br/><br/>DB Maintenance Successful for <b>${CLIENT^^} ${ENV^^}</b> ($db_name). Jump to <a href='$BITBUCKET_GIT_HTTP_ORIGIN/pipelines/results/$BITBUCKET_BUILD_NUMBER'>build</a> for details of Maintenance job.<br/> <b>Trigger By: </b>$BUILD_TRIGGER_BY<br/><br/><br/><br/><b>Note:</b> For any suggestion/improvement please contact at db-architects@impactanalytics.co<br/><span color='rgb(136,136,136); font-size: 12px;'>**This is an auto generated Email, please do not reply back on this email.</span>"
    send_maintenance_email
fi
