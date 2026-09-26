#!/usr/bin/env python3

# Import modules
import json

# import subprocess
# import time
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
client_list = ["arhaus", "partycity"]
job_type = sys.argv[4]
image_version = sys.argv[5]

# Based on the inventory and network tags, deploying the corresponding job template.
for each in host_inventory:

    # Selecting inventory and passing value to survey question.
    request_body = {
        "inventory": each,
        "extra_vars": {
            "job_type": job_type,
            "image_version": image_version,
            "client": client_list,
            "region": "us-central1",
        },
    }
    json_data = json.dumps(request_body)

    # Launching the job template
    response = requests.post(
        "https://deployment-new.iaproducts.ai/api/v2/job_templates/deploy-cloudrun-iss-mfe/launch/",
        data=json_data,
        headers=headers,
        auth=HTTPBasicAuth(user, password),
    )

    print(response.request.body)
    print(response.text)
