#!/bin/bash -e

Red='\033[0;31m'
Green='\033[0;32m'

#calculate changlog xmls
get_master_changelogs() {
python3.8 -c """
import glob
map = {}
for filename in glob.iglob('liquibase/**/master*.xml', recursive=True):
    if filename.split('/')[-2] not in map.keys():
        map[filename.split('/')[-2]] = []
    map[filename.split('/')[-2]].append(filename.split('/')[-1])
for c in map:
    if 'master_changelog.xml' in map[c]:
        print('liquibase/{}/master_changelog.xml'.format(c))
    else:
        print('liquibase/{}/master_replaceable_changelog.xml'.format(c))
"""
}

#send email
send_email() {
python3.8 -c """
from notify import send_email
send_email()
"""
}

#last deployment report
last_deployment_report() {
python3.8 -c """
from last_deployment_report import get_latest_deployment_report
print(get_latest_deployment_report())
"""
}

# Function to form cache invalidation URL
cache_inv_url() {
python3.8 -c """
from database.utils.constants import client_tenant_name_map, env_url_map
client = '$CLIENT'
env = '$ENV'
tenant = client_tenant_name_map.get(client, '')
env_part = env_url_map.get(env, '')
if tenant:
    print(f'https://{tenant}{env_part}.impactsmartsuite.com/api/v2/core/db-sync-event')
"""
}

error_in_deployment=false
source ./print_docs.sh # Print docs

export BRANCH_DIFF=`git show --first-parent $BITBUCKET_COMMIT --name-only --pretty=format: | sort | uniq | grep '\.sql$' | grep '/schemas/'` # Only .sql files and /schema/ must be in path
#echo "BRANCH_DIFF:" $BRANCH_DIFF
if [[ ! -z "${BRANCH_DIFF}" ]]; then
    echo -e "${Green}Detected some changes"
    export CLIENTS=`git show --first-parent $BITBUCKET_COMMIT --name-only --pretty=format: | sort | uniq | grep '\.sql$' | grep '/schemas/' | cut -d "/" -f2 | sort | uniq`
    export CLIENTS=$(echo "$CLIENTS" | grep -vwF -f <(tr ' ' '\n' <<< "$OFFBOARD_CLIENTS"))
    if [ -z "$CLIENTS" ]; then
        echo -e "${RED}No clients were selected. Kindly retrigger the new pipeline instead of re-running."
        exit 1;
    fi
    python3.8 compile.py #Compile the whole build for each client impacted by last commit
fi

SECRET=`gcloud secrets versions access latest --secret=$PROJECT_ID-database-deployment-$ENV`
mkdir -p liquibase
export XMLS=`get_master_changelogs`
while IFS= read -r XML ; do
    if [[ ! -z "${XML}" ]]; then
        echo -e "${Green}Changelog: $XML"
        export CLIENT=`echo $XML | cut -d "/" -f2`
        error_in_current_deployment=false

        db_name=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_name`
        db_user=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_user`
        db_host=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_host`
        db_port=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_port`
        db_pass=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_pass`

        {
            echo -e "${Green}DB Name: $db_name"
			liquibase update --changelog-file="$XML" --url=jdbc:postgresql://$db_host:$db_port/$db_name --username=$db_user --default-schema-name=liquibase --password="$db_pass" # Actual Deploy master_changelog
            #docker run -v="$BITBUCKET_CLONE_DIR:/liquibase/changelog" liquibase/liquibase:4.19 update --changelog-file="$XML" --url=jdbc:postgresql://$db_host:$db_port/$db_name --username=$db_user --default-schema-name=liquibase --password="$db_pass" # Actual Deploy master_changelog
        } || {
            error_in_deployment=true
            error_in_current_deployment=true
        }

		url=$(cache_inv_url)
		if [ -z "$url" ]; then
			echo "Cache invalidation URL not found for client $CLIENT. Skipping cache invalidation."
		else
			echo "Invalidating Cache for $CLIENT"
			curl -s -X POST "$url" \
				-H "Content-Type: application/json" \
				-d '{"config_sync": {"identifiers": ["api_cache"]}}' || true
		fi

        if [ $error_in_current_deployment = true ]; then
            export EMAIL_SUBJECT="[DB Deployment] (${CLIENT^^} ${ENV^^}) Failed!"
            export EMAIL_BODY="Hi all,<br/><br/>DB Deployment failed for <b>${CLIENT^^} ${ENV^^}</b> ($db_name). Jump to <a href='$BITBUCKET_GIT_HTTP_ORIGIN/pipelines/results/$BITBUCKET_BUILD_NUMBER'>build</a> for details of deployment.<br/><b>Trigger By: </b>$BUILD_TRIGGER_BY<br/><br/><br/><br/><b>Note:</b> A broken deployment can lead to any issue in any module please check all PRs merged with cuurent branch has passed all checks and merge a valid fix after a pass build. For a manual intervention please contact at db-architects@impactanalytics.co<br/><span color='rgb(136,136,136); font-size: 12px;'>**This is an auto generated Email, please do not reply back on this email.</span>"
            send_email
        else
            export EMAIL_SUBJECT="[DB Deployment] (${CLIENT^^} ${ENV^^}) Successful!"
            export EMAIL_BODY="Hi all,<br/><br/>DB Deployment Successful for <b>${CLIENT^^} ${ENV^^}</b> ($db_name). Jump to <a href='$BITBUCKET_GIT_HTTP_ORIGIN/pipelines/results/$BITBUCKET_BUILD_NUMBER'>build</a> for details.<br/><b>Trigger By: </b>$BUILD_TRIGGER_BY<br/><b>Last Deployment Report :</b><br/>`last_deployment_report`<br/><br/><br/><br/><b>Note:</b> For any suggestion/improvement please contact at db-architects@impactanalytics.co<br/><span color='rgb(136,136,136); font-size: 12px;'>**This is an auto generated Email, please do not reply back on this email.</span>"
            send_email
        fi
    fi
done <<< "$XMLS"

if [ $error_in_deployment = true ]; then
    exit 1;
fi
