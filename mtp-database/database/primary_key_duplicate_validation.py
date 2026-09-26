import sys
from utils.pull_request_validator.service import ValidationService
from utils.pull_request_validator.sync_env import SyncEnv


if __name__ == "__main__":
    sync_env = SyncEnv()
    sync_env.setup_env()
    env = sync_env.get_env()
    service = ValidationService(env=env)
    has_issues = service.run_validation(validated_only_affected_files=True)
    
    # Exit with error code if issues were found
    sys.exit(1 if has_issues else 0)