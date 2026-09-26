import os
import requests
import sys
import json

BB_USER = "tarunreddy_challa"
BB_PASS = "ATBBHZqPSApfCBV8h8AvDuu6HgNJ0CF2B5E0"
SLACK_WEBHOOK_URL = "https://hooks.slack.com/services/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"
SCHEMA_APPROVERS = {"global":["Tarunreddy Challa","Ashish Gupta","Shaik Azmathulla"], "plan_smart":["jaya khandelwal","Hari Krishna","Subhash Pophale"], "inventory_smart":["Tarunreddy Challa","Ashish Gupta", "Linu Nazil"], "item_smart":["jaya khandelwal","Hari Krishna"], "public":["Tarunreddy Challa","Ashish Gupta"], "monday_smart":["Tarunreddy Challa","Ashish Gupta"], "assort_smart":["Srinivas Gowda S G","Ashish Gupta"], "assort":["Srinivas Gowda S G","Ashish Gupta"]}
REPO_FULL_NAME = "insideinsight/mtp-database"
BRANCH = "develop/test"

def get_latest_merged_pr():
    url = f"https://api.bitbucket.org/2.0/repositories/{REPO_FULL_NAME}/pullrequests"
    params = {"state": "MERGED", "destination.branch.name": BRANCH, "pagelen": 1, "sort": "-updated_on"}
    resp = requests.get(url, auth=(BB_USER, BB_PASS), params=params)
    resp.raise_for_status()
    values = resp.json()["values"]
    return values[0] if values else None

def get_pr_changed_files(pr_id):
    url = f"https://api.bitbucket.org/2.0/repositories/{REPO_FULL_NAME}/pullrequests/{pr_id}/diffstat"
    resp = requests.get(url, auth=(BB_USER, BB_PASS))
    try:
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"Error fetching PR changed files: {e}")
        print(f"Response text: {resp.text}")
        return []
    if not data or "values" not in data or not data["values"]:
        print("No changed files found or unexpected response structure.")
        print(f"Response JSON: {data}")
        return []
    changed_files = []
    for f in data["values"]:
        # Added or modified files
        if "new" in f and f["new"] and "path" in f["new"]:
            changed_files.append(f["new"]["path"])
        # Deleted files
        elif "old" in f and f["old"] and "path" in f["old"]:
            changed_files.append(f["old"]["path"])
    return changed_files

def get_pr_approvers(pr_id):
    url = f"https://api.bitbucket.org/2.0/repositories/{REPO_FULL_NAME}/pullrequests/{pr_id}?fields=participants.user.display_name"
    resp = requests.get(url, auth=(BB_USER, BB_PASS))
    try:
        resp.raise_for_status()
        data = resp.json()
    except Exception as e:
        print(f"Error fetching PR participants: {e}")
        print(f"Response text: {resp.text}")
        return []
    if not data or "participants" not in data or not data["participants"]:
        print("No participants found or unexpected response structure.")
        print(f"Response JSON: {data}")
        return []
    # Return all participants' display names
    return [p["user"]["display_name"] for p in data["participants"]]

def extract_schemas_from_files(files):
    """
    Extract schema names from .sql file paths.
    Handles:
      - database/schemas/schema_name/tables/file.sql  -> schema_name
      - database/client/schemas/schema_name/tables/file.sql -> schema_name
    """
    schemas = set()
    sql_files = []
    for file in files:
        if file.endswith(".sql"):
            sql_files.append(file)
            parts = file.split('/')
            if len(parts) == 5:
                # dat/sch/tab/file.sql
                schemas.add(parts[2])
            elif len(parts) == 6:
                # dat/client/sch/tab/file.sql
                schemas.add(parts[3])
    return schemas, sql_files

def send_slack_notification(pr_url, missing_approvers, schemas):
    message = {
        "text": f":warning: PR {pr_url} was merged without approval from required approvers for schemas {', '.join(schemas)}: {', '.join(missing_approvers)}"
    }
    requests.post(SLACK_WEBHOOK_URL, json=message)

def main():
    pr = get_latest_merged_pr()
    if not pr:
        print("No merged PR found.")
        sys.exit(0)
    pr_id = pr["id"]
    pr_url = pr["links"]["html"]["href"]
    files = get_pr_changed_files(pr_id)
    schemas, sql_files = extract_schemas_from_files(files)
    if len(schemas) > 1:
        if "global" in schemas:
            schemas = {"global"}
        else:
            schemas = {sorted(schemas)[0]}

    # If none of the schemas have approvers, fall back to global
    if not any(schema in SCHEMA_APPROVERS for schema in schemas):
        schemas = {"global"}

    if not sql_files:
        print("No .sql files in this PR.")
        sys.exit(0)

    actual_approvers = set(a.lower() for a in get_pr_approvers(pr_id))
    should_notify = True
    missing_approvers = set()

    for schema in schemas:
        required_approvers = set(a.lower() for a in SCHEMA_APPROVERS.get(schema, []))
        # If at least one required approver is present, do NOT send notification
        if required_approvers & actual_approvers:
            print("At least one required approver present. No notification sent.")
            should_notify = False
            break
        else:
            missing_approvers.update(required_approvers - actual_approvers)

    if should_notify and missing_approvers:
        send_slack_notification(pr_url, missing_approvers, schemas)
        print(f"Notification sent for PR {pr_id}")
    else:
        print("All required approvers present.")

if __name__ == "__main__":
    main()