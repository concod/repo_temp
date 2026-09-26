# Standard library imports
import os
import json

# Third-party imports
from google.cloud import secretmanager


class SyncEnv:
    """
    Handles environment detection and secret management for deployment environments.
    Determines the environment based on branch names and loads secrets from Google Secret Manager.
    Supports multiple deployment environments: local, dev, test, uat, and prod.
    """
    def __init__(self) -> None:
        """
        Initialize environment synchronizer by detecting the current environment.
        Reads environment variables to determine the target deployment environment.
        """
        # Get branch information from Bitbucket environment variables
        self.destination_branch = os.environ.get("BITBUCKET_PR_DESTINATION_BRANCH") or ''
        self.current_branch = os.environ.get("BITBUCKET_BRANCH") or ''
        
        # Determine environment based on branch names
        self.env = self._determine_env(self.destination_branch or self.current_branch)
        print(f"Environment: {self.env}")

    def _determine_env(self, destination_branch: str) -> str:
        """
        Determine the deployment environment based on the destination branch name.
        Maps specific branch names to their corresponding environments.
        
        Args:
            destination_branch (str): Name of the destination branch
            
        Returns:
            str: Environment name (dev, test, uat, prod, or local)
        """
        # Map branch names to their corresponding environments
        branch_to_env = {
            'develop/test': 'test',
            'develop/dev': 'dev',
            'develop/uat': 'uat',
        }
        
        # Check for production environment (main branch)
        if 'main' in destination_branch:
            return 'prod'
        # Check for mapped development environments
        elif destination_branch in branch_to_env:
            return branch_to_env[destination_branch]
        # Default to local environment for unknown branches
        return 'local'

    def access_secret_version(self, secret_id: str, version_id: str = "latest") -> dict:
        """
        Access a specific secret version from Google Secret Manager.
        
        Args:
            secret_id (str): The identifier of the secret to retrieve
            version_id (str, optional): Version of the secret to access. Defaults to "latest"
            
        Returns:
            dict: Empty dictionary for local environment, or decoded secret payload
        """
        # Skip secret access for local environment
        if self.env == 'local':
            return {}
            
        # Create the Secret Manager client for Google Cloud
        client = secretmanager.SecretManagerServiceClient()
        
        # Build the resource name for the specific secret version
        resource_name = f"projects/{os.environ['SECRET_PROJECT_ID']}/secrets/{secret_id}/versions/{version_id}"
        
        # Access the secret version from Google Secret Manager
        response = client.access_secret_version(name=resource_name)
        
        # Return the decoded payload as a UTF-8 string
        return response.payload.data.decode('UTF-8')

    def setup_env(self):
        """
        Set up environment variables from secrets for the current environment.
        Loads configuration from Google Secret Manager and sets environment variables.
        """
        # Skip environment setup for local development
        if self.env == 'local':
            return
            
        # Construct secret identifier for the current environment
        secret_id = f"{os.environ['PROJECT_ID']}-database-deployment-{self.env}"
        
        # Load environment variables from the secret
        env_vars = json.loads(self.access_secret_version(secret_id))
        
        # Set each environment variable from the secret
        for key, value in env_vars.items():
            # Handle dictionary values by converting to JSON string
            if isinstance(value, dict):
                os.environ[key] = json.dumps(value)
            else:
                # Convert all other values to string
                os.environ[key] = str(value)
    
    def get_env(self) -> str:
        """
        Get the current environment name.
        
        Returns:
            str: The current environment name
        """
        return self.env

