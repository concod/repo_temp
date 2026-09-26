#!/usr/bin/env python3

# Import modules
import json
# import subprocess
import time
# from google.cloud import secretmanager
import requests
from requests.auth import HTTPBasicAuth
import sys

user = sys.argv[1]
password = sys.argv[2]

# Get all the inventories from ansible.
response = json.loads(
    requests.get(
        "https://deployment-new.iaproducts.ai/api/v2/inventories/",
        auth=HTTPBasicAuth(user, password),
    ).text
)

inventory = response["results"]
while "next" in response and response["next"] is not None:
    response = json.loads(
        requests.get(
            "https://deployment-new.iaproducts.ai" + response["next"],
            auth=HTTPBasicAuth(user, password),
        ).text
    )
    inventory.extend(response["results"])

host_inventory = []

inventory_name = sys.argv[3]

# The value of the application tag matches with the name of the inventory in ansible.
# This is how we decide which inventory to deploy to.
# Running a loop over the list of inventories in ansible and checking it against the the application tag.
# When there is a match, adding its id to the host_inventory variable.
for each in inventory:
    if each["name"] in inventory_name:
        host_inventory.append(each["id"])

headers = {"Content-type": "application/json"}
# After line 46
if len(sys.argv) > 6:
    client_list = sys.argv[6].split(",")
else:
    client_list = ["primark","carters", "vs", "vs-intl", "dg", "cb", "levi-lsa", "levi-lse", "levi-ama", "spanx", "briscoes", "tapestry", "pacsun", "figs", "aritzia", "kik", "lovisa", "sb", "tillys", "ua", "cna", "tb", "leslies"]
job_type = sys.argv[4]
image_version = sys.argv[5]

BATCH_SIZE = 10
client_batches = [client_list[i:i + BATCH_SIZE] for i in range(0, len(client_list), BATCH_SIZE)]

# Based on the inventory and network tags, deploying the corresponding job template.
for each in host_inventory:
    for idx, batch in enumerate(client_batches):

        # Selecting inventory and passing value to survey question.
        request_body = {
            "inventory": each,
            "extra_vars": {
                "job_type": job_type,
                "image_version": image_version,
                "client": batch
            },
        }
        json_data = json.dumps(request_body)

        # Launching the job template
        response = requests.post(
            "https://deployment-new.iaproducts.ai/api/v2/job_templates/deploy-cloudrun-iss-mfe-base-image/launch/",
            data=json_data,
            headers=headers,
            auth=HTTPBasicAuth(user, password),
        )

        print(f"Batch: {batch}")
        print(response.request.body)
        print(response.text)

        if idx < len(client_batches) - 1:
            time.sleep(60)