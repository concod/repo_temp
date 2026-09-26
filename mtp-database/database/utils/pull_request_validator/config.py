import json
import os
from typing import Dict, List, Union


class ConfigurationLoader:
    """
    Loads and manages configuration data for pull request validation.
    Handles client lists, schema directories, primary key mappings, and validation rules.
    Uses lazy loading to only read configuration files when needed.
    """
    
    def __init__(self, base_path: str = "./database"):
        """
        Initialize the configuration loader with the base database path.
        
        Args:
            base_path (str): Base path to the database directory containing configuration files
        """
        self.base_path = base_path
        
        # Initialize lazy-loaded configuration cache variables
        self._clients = None
        self._allowed_schema_dirs = None
        self._primary_key_mapping = None
        self._other_unique_constraints = None
        self._segregated_data_validation = None
    
    @property
    def clients(self) -> List[str]:
        """
        Get the list of supported clients for validation.
        Lazy loads and caches the client list on first access.
        
        Returns:
            List[str]: List of client names that can be validated
        """
        if self._clients is None:
            # Hard-coded list of supported clients
            # In a production system, this could be loaded from a configuration file
            self._clients = ['aritzia', 'arhaus', 'arhaus_test_pivot', 'biglots', 'briscoes', 'carters', 'coach_na', 
                             'crackerbarrel', 'data_platform_qa', 'dollar_general', 'gap', 'homedepot', 'impactprice', 'lululemon', 'levis_us', 'levi_lse', 
                             'lovisa', 'marksandspencer', 'marksandspencer_mena', 'primark', 'pacsun', 'peter_millar', 
                             'pricesmart', 'ralph_lauren_apac', 'ralph_lauren_eu_is', 'ralph_lauren_na', 
                             'saks_fifth_avenue', 'signet', 'spanx', 'starboard', 'stevemadden', 'tapestry', 'tillys', 'tommy_bahama', 'toryburch',
                             'victorias_secret', 'victorias_secret_international', 'figs', 'bealls']

        return self._clients
    
    @property
    def allowed_schema_dirs(self) -> List[str]:
        """
        Get the list of schema directories that are allowed for validation.
        Lazy loads and caches the schema directory list on first access.
        
        Returns:
            List[str]: List of schema directory names that contain valid CSV files
        """
        if self._allowed_schema_dirs is None:
            # List of schema directories that contain CSV files eligible for validation
            self._allowed_schema_dirs = [
                "global", "plan_smart", "inventory_smart", "cluster_smart", 
                "assort", "assort_smart", "monday_smart", "forecast_smart",
                "datamodel", "meta_schema", "chat_gpt", "ada_configurator",
                "data_platform", "metaschema", "price_markdown", 
                "price_markdown_opt", "price_promo", "ada_visual", 
                "price_promo_opt", "genai", "item_smart", "oms", "data_retention","base_pricing", "visual_line_planning",
                "source_smart", "size_smart", "demand_smart"
            ]
        return self._allowed_schema_dirs
    
    @property
    def primary_key_mapping(self) -> Dict[str, Dict[str, Union[str, List[str]]]]:
        """
        Get the primary key mapping configuration from JSON file.
        Lazy loads and caches the primary key mapping on first access.
        
        Returns:
            Dict[str, Dict[str, Union[str, List[str]]]]: Mapping of tables to their primary key columns
        """
        if self._primary_key_mapping is None:
            # Load primary key mappings from JSON configuration file
            mapping_path = os.path.join(self.base_path, "utils/primary_key_mapping.json")
            with open(mapping_path) as f:
                self._primary_key_mapping = json.load(f)
        return self._primary_key_mapping
    
    @property
    def other_unique_constraints(self) -> Dict[str, Dict[str, List[List[str]]]]:
        """
        Get the other unique constraints configuration from JSON file.
        Lazy loads and caches the unique constraints on first access.
        
        Returns:
            Dict[str, Dict[str, List[List[str]]]]: Mapping of additional unique constraints beyond primary keys
        """
        if self._other_unique_constraints is None:
            # Load other unique constraints from JSON configuration file
            constraints_path = os.path.join(self.base_path, "utils/other_unique_constraints.json")
            with open(constraints_path) as f:
                self._other_unique_constraints = json.load(f)
        return self._other_unique_constraints
    
    @property
    def segregated_data_validation(self) -> Dict[str, Dict[str, Dict[str, List[str]]]]:
        """
        Get the segregated data validation configuration from JSON file.
        Lazy loads and caches the segregation rules on first access.
        
        Returns:
            Dict[str, Dict[str, Dict[str, List[str]]]]: Segregation validation rules for each client
        """
        if self._segregated_data_validation is None:
            # Load segregated data validation rules from JSON configuration file
            validation_path = os.path.join(self.base_path, "utils/segregated_data_validation.json")
            with open(validation_path) as f:
                self._segregated_data_validation = json.load(f)
        return self._segregated_data_validation
    
    def get_client_primary_key_mapping(self, client: str) -> Dict[str, Union[str, List[str]]]:
        """
        Get primary key mapping for a specific client, combining common and client-specific rules.
        
        Args:
            client (str): Client name to get primary key mappings for
            
        Returns:
            Dict[str, Union[str, List[str]]]: Combined primary key mappings for the client
        """
        # Get common primary key mappings that apply to all clients
        common = self.primary_key_mapping.get("common", {})
        
        # Get client-specific primary key mappings
        client_specific = self.primary_key_mapping.get(client, {})
        
        # Merge common and client-specific mappings (client-specific takes precedence)
        return {**common, **client_specific}
    
    def get_client_other_unique_constraints(self, client: str) -> Dict[str, List[Union[str, List[str]]]]:
        """
        Get other unique constraints for a specific client, combining common and client-specific rules.
        
        Args:
            client (str): Client name to get unique constraints for
            
        Returns:
            Dict[str, List[Union[str, List[str]]]]: Combined unique constraints for the client
        """
        # Get common unique constraints that apply to all clients
        common = self.other_unique_constraints.get("common", {})
        
        # Get client-specific unique constraints
        client_specific = self.other_unique_constraints.get(client, {})
        
        # Merge common and client-specific constraints (client-specific takes precedence)
        return {**common, **client_specific}
    
    def get_client_segregated_data_validation(self, client: str) -> Dict[str, Dict[str, List[str]]]:
        """
        Get segregated data validation rules for a specific client, combining common and client-specific rules.
        
        Args:
            client (str): Client name to get segregation validation rules for
            
        Returns:
            Dict[str, Dict[str, List[str]]]: Combined segregation validation rules for the client
        """
        # Get common segregation rules that apply to all clients
        common = self.segregated_data_validation.get("common", {})
        
        # Get client-specific segregation rules
        client_specific = self.segregated_data_validation.get(client, {})
        
        # Merge common and client-specific rules (client-specific takes precedence)
        return {**common, **client_specific}