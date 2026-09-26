import os
import json
from google.cloud import secretmanager

def access_secret_version(secret_id, version_id="latest"):
	# Create the Secret Manager client.
	client = secretmanager.SecretManagerServiceClient()
	
	# Build the resource name of the secret version.
	name = "projects/{}/secrets/{}/versions/{}".format(os.environ["SECRET_PROJECT_ID"], secret_id, version_id)
	
	# Access the secret version.
	response = client.access_secret_version(name=name)
	
	# Return the decoded payload.
	return response.payload.data.decode('UTF-8')

def setup_env(env='dev'):
    secret_id = "{}-database-deployment-{}".format(os.environ["PROJECT_ID"], env)
    env_vars = json.loads(access_secret_version(secret_id))
    for k in env_vars:
        if isinstance(env_vars[k], dict):
            os.environ[k] = json.dumps(env_vars[k])
        else:
            os.environ[k] = str(env_vars[k])
