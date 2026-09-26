import sys
from utils.pull_request_validator.service import ValidationService
from utils.pull_request_validator.sync_env import SyncEnv

def run_replication_validation_for_all_clients(service: ValidationService, affected_files_only: bool = False) -> bool:
    """
    Run validation for all replicated clients sequentially.
    For each replicated client, runs both inventory and non_inventory validation.
    """
    # Get all clients with replication configured
    replicated_clients = service._get_replicated_clients()
    has_conflicts = False
    
    for client in replicated_clients:        
        # Run inventory validation if client supports it
        if service._client_has_replication_value(client, 'inventory'):
            
            # Create fresh service instance for inventory validation
            inventory_service = ValidationService(service.config_loader.base_path, service.env)
            inventory_conflicts = inventory_service.run_inventory_validation([client], affected_files_only)
            has_conflicts = has_conflicts or bool(inventory_conflicts)
        
        # Run non_inventory validation if client supports it
        if service._client_has_replication_value(client, 'non_inventory'):
            
            # Create fresh service instance for non_inventory validation
            non_inventory_service = ValidationService(service.config_loader.base_path, service.env)
            non_inventory_conflicts = non_inventory_service.run_non_inventory_validation([client], affected_files_only)
            has_conflicts = has_conflicts or bool(non_inventory_conflicts)
    
    # Also run validation for non-replicated clients using standard validation
    all_clients = service.config_loader.clients
    non_replicated_clients = [client for client in all_clients if client not in replicated_clients]
    
    if non_replicated_clients:
        # Create fresh service instance for standard validation
        standard_service = ValidationService(service.config_loader.base_path, service.env)
        standard_conflicts = standard_service.run_validation(clients=non_replicated_clients, validated_only_affected_files=affected_files_only)
        has_conflicts = has_conflicts or bool(standard_conflicts)
    return has_conflicts


if __name__ == "__main__":
    sync_env = SyncEnv()
    sync_env.setup_env()
    env = sync_env.get_env()
    service = ValidationService(env=env)
    
    # Run replication validation for all replicated clients
    # This will automatically run both inventory and non_inventory validation
    # for each client that has replication configured
    # Note: This validates affected files
    has_issues = run_replication_validation_for_all_clients(service, affected_files_only=True)
    
    # Exit with error code if issues were found
    sys.exit(1 if has_issues else 0)

