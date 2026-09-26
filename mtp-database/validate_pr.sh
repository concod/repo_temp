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

#send pr email
send_pr_email() {
python3.8 -c """
from notify import send_pr_email
send_pr_email()
"""
}

# Format Liquibase errors with beautiful messages
format_liquibase_error() {
    local error_output="$1"
    local context="$2"
    
    # Check if error_message_helper exists and format the error
    if [ -f "error_message_helper.py" ] && [ -f "error_messages.json" ]; then
        python3.8 error_message_helper.py liquibase "$error_output" "$context" 2>/dev/null || echo "$error_output"
    else
        echo "$error_output"
    fi
}

# Run blame analysis and send personalized notifications for Liquibase errors.
# Writes the error text to a temp file so pr_blame_notifier.py can read it.
#
# Usage: notify_blame_recipients "$error_text" "$client" "$env" "$mode" "$log_file"
notify_blame_recipients() {
    local error_text="$1"
    local client="$2"
    local env="$3"
    local mode="${4:-validate}"
    local log_file="${5:-}"

    if [ ! -f "pr_blame_notifier.py" ]; then
        echo "⚠ pr_blame_notifier.py not found — skipping blame notifications."
        return 0
    fi

    # Write error text to a temp file (avoids shell quoting issues)
    local tmp_err
    tmp_err=$(mktemp /tmp/lb_error_XXXXXX.txt)
    printf '%s' "$error_text" > "$tmp_err"

    local extra_args=""
    if [ -n "$log_file" ] && [ -f "$log_file" ]; then
        extra_args="--log-file $log_file"
    fi

    # Run notifier; errors are non-fatal (we've already captured the failure)
    python3.8 pr_blame_notifier.py \
        --error-file "$tmp_err" \
        --client     "$client" \
        --env        "$env" \
        --mode       "$mode" \
        $extra_args \
        2>&1 || echo "⚠ pr_blame_notifier.py exited with an error (notifications may be partial)."

    rm -f "$tmp_err"
}

export PP_TYPE=validate_pr
error_in_deployment=false
export VALIDATE_ONLY=True

source ./print_docs.sh # Print docs

export BRANCH_DIFF=`git diff --name-only origin/$BITBUCKET_PR_DESTINATION_BRANCH...origin/$BITBUCKET_BRANCH | sort | uniq | grep '\.sql$' | grep '/schemas/'` # Only .sql files and /schema/ must be in path
#echo "BRANCH_DIFF:" $BRANCH_DIFF
if [[ ! -z "${BRANCH_DIFF}" ]]; then
    echo -e "${Green}Detected some changes"
    export CLIENTS=`git diff --name-only origin/$BITBUCKET_PR_DESTINATION_BRANCH...origin/$BITBUCKET_BRANCH | sort | uniq | grep '\.sql$' | grep '/schemas/' | cut -d "/" -f2 | sort | uniq`
    export CLIENTS=$(echo "$CLIENTS" | grep -vwF -f <(tr ' ' '\n' <<< "$OFFBOARD_CLIENTS"))
    if [ -z "$CLIENTS" ]; then
        echo -e "${RED}No clients were selected. Kindly retrigger the new pipeline instead of re-running."
        exit 1;
    fi
    python3.8 compile.py #Compile the whole build for each client impacted by change mentioned in the SCHEMA variable in the "Repository variables" section
fi

# ========================================
# BigQuery Custom Migration Validation
# ========================================
echo -e "${Green}Checking for BigQuery custom migration files..."
export BRANCH_DIFF_GBQ=`git diff --name-only origin/$BITBUCKET_PR_DESTINATION_BRANCH...origin/$BITBUCKET_BRANCH | sort | uniq | grep 'custom_migration_gbq\.sql$' || echo ""`

if [[ ! -z "${BRANCH_DIFF_GBQ}" ]]; then
    echo -e "${Green}Detected BigQuery custom migration files - Running validation..."
    echo -e "${Green}Files to validate:"
    echo "$BRANCH_DIFF_GBQ"
    
    # Run BigQuery validation with dry run checks
    {
        python3.8 bigquery_custom_migration_validator.py
    } || {
        export EMAIL_SUBJECT="[BigQuery PR Validation] Failed - Dangerous Operations Detected!"
        export EMAIL_BODY="Hi all,<br/><br/>BigQuery custom migration validation detected dangerous operations in the PR.<br/> <b>Trigger By: </b>$BUILD_TRIGGER_BY<br/><b>PR: </b><a href='$BITBUCKET_GIT_HTTP_ORIGIN/pull-requests/$BITBUCKET_PR_ID'>$BITBUCKET_PR_ID</a><br/><b>Branch: </b><a href='$BITBUCKET_GIT_HTTP_ORIGIN/branch/$BITBUCKET_BRANCH'>$BITBUCKET_BRANCH</a><br/><b>Target Branch: </b><a href='$BITBUCKET_GIT_HTTP_ORIGIN/branch/$BITBUCKET_PR_DESTINATION_BRANCH'>$BITBUCKET_PR_DESTINATION_BRANCH</a><br/><br/><b>Files with issues:</b><br/>${BRANCH_DIFF_GBQ//$'\n'/<br/>}<br/><br/><b>Dangerous operations detected:</b><br/>• DROP, DELETE, TRUNCATE operations<br/>• RENAME operations<br/>• Role changes (CREATE ROLE, ALTER ROLE)<br/><br/><b>Next steps:</b><br/>1. Review the operations in BigQuery console<br/>2. Ensure you have proper backups<br/>3. Get approval from data-platform@impactanalytics.co<br/>4. Add '[skip-bigquery-validation]' to PR description if approved<br/><br/><b>Note:</b> These validations help prevent accidental data loss. Please contact data-platform@impactanalytics.co for assistance.<br/><span color='rgb(136,136,136); font-size: 12px;'>**This is an auto generated Email, please do not reply back on this email.</span>"
        send_pr_email
        error_in_deployment=true
    }
else
    echo -e "${Green}No BigQuery custom migration files in this PR"
fi

SECRET=`gcloud secrets versions access latest --secret=$PROJECT_ID-database-deployment-$ENV`
mkdir -p liquibase
export XMLS=`get_master_changelogs`
while IFS= read -r XML ; do
    if [[ ! -z "${XML}" ]]; then
        echo -e "${Green}Changelog: $XML"
        export CLIENT=`echo $XML | cut -d "/" -f2`

        db_name=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_name`
        db_user=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_user`
        db_host=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_host`
        db_port=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_port`
        db_pass=`echo $SECRET | jq --raw-output .${CLIENT}_${ENV}.db_pass`

        {
            echo -e "${Green}DB Name: $db_name"
            
            # Capture Liquibase validation output to both a variable and a temp log file.
            # The log file is later passed to pr_blame_notifier.py as an email attachment.
            lb_log=$(mktemp /tmp/lb_validate_XXXXXX.log)
            validation_output=$(liquibase validate \
                --changelog-file="$XML" \
                --url=jdbc:postgresql://$db_host:$db_port/$db_name \
                --username=$db_user \
                --default-schema-name=liquibase \
                --password="$db_pass" 2>&1 | tee "$lb_log")
            
            # Check if validation succeeded
            if echo "$validation_output" | grep -qi "successfully"; then
                echo "$validation_output"
                echo -e "${Green}✓ Validation passed for $XML"
                rm -f "$lb_log"
            else
                # ── Validation failed ─────────────────────────────────────────────
                echo "$validation_output"
                
                # Pretty-print the error in the pipeline log
                echo ""
                echo -e "${Red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                format_liquibase_error "$validation_output" "File: $XML, Client: $CLIENT, Env: $ENV"
                echo -e "${Red}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
                echo ""

                # ── Blame analysis & personalized notifications ────────────────────
                # pr_blame_notifier.py will:
                #   1. Parse structured error records from the Liquibase output
                #   2. Run git blame on the affected lines to identify the author
                #   3. Print a per-record structured report in the pipeline log
                #   4. Send a personalized email to the PR author AND the line owner
                #      (if they are different people)
                echo -e "${Green}🔍 Running blame analysis to identify responsible authors..."
                notify_blame_recipients \
                    "$validation_output" \
                    "$CLIENT" \
                    "$ENV" \
                    "validate" \
                    "$lb_log"

                rm -f "$lb_log"
                
                # Propagate failure so the outer error handler runs
                exit 1
            fi
        } || {
            # ── Outer error handler: legacy group email (fallback / audit trail) ──
            # pr_blame_notifier already sent targeted emails above; this block
            # keeps the existing group-list notification so nothing is lost during
            # a transition period.  Remove when fully migrated to blame emails.
            export EMAIL_SUBJECT="[PR Validation] (${CLIENT^^} ${ENV^^}) Failed!"
            export EMAIL_BODY="Hi all,<br/><br/>Pipeline detected an error for <b>${CLIENT^^} ${ENV^^}</b> ($db_name) DB builds. Targeted notifications have been sent to the responsible author(s) via blame analysis. Jump to <a href='$BITBUCKET_GIT_HTTP_ORIGIN/pipelines/results/$BITBUCKET_BUILD_NUMBER'>build</a> for details.<br/><b>Trigger By: </b>$BUILD_TRIGGER_BY<br/><b>PR: </b><a href='$BITBUCKET_GIT_HTTP_ORIGIN/pull-requests/$BITBUCKET_PR_ID'>$BITBUCKET_PR_ID</a><br/><b>Branch: </b><a href='$BITBUCKET_GIT_HTTP_ORIGIN/branch/$BITBUCKET_BRANCH'>$BITBUCKET_BRANCH</a><br/><b>Target Branch: </b><a href='$BITBUCKET_GIT_HTTP_ORIGIN/branch/$BITBUCKET_PR_DESTINATION_BRANCH'>$BITBUCKET_PR_DESTINATION_BRANCH</a><br/><br/><b>Note:</b> A broken PR can lead to issues in any module. Please fix all errors before merging. For manual intervention contact db-architects@impactanalytics.co<br/><span color='rgb(136,136,136); font-size: 12px;'>**This is an auto generated Email, please do not reply back on this email.</span>"
            send_pr_email
            error_in_deployment=true
        }
    fi
done <<< "$XMLS"

if [ -f compile_exception_count.sh ]; then
    source compile_exception_count.sh
else
    COMPILE_EXCEPTIONS_COUNT=0
fi

if [ "$error_in_deployment" = true ] || [ "$COMPILE_EXCEPTIONS_COUNT" -gt 0 ]; then
    echo -e "${Red}❌ Pipeline failed:"
    [ "$error_in_deployment" = true ] && echo -e "${Red}- Liquibase validation errors detected"
    [ "$COMPILE_EXCEPTIONS_COUNT" -gt 0 ] && echo -e "${Red}- Compile exceptions detected: $COMPILE_EXCEPTIONS_COUNT"
    exit 1;
fi

echo -e "${Green}✅ Pipeline completed successfully with no validation or compile issues"
