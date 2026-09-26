#!/usr/bin/env python3

"""
=============================
Primary Key Mapping Merger
=============================
Helper script to merge client primary key mapping from source branch
Usage: python3 merge_primary_keys.py <client_name> <source_branch>
=============================
"""

import sys
import json
import subprocess
import os
from pathlib import Path
import tempfile


class PrimaryKeyMerger:
    def __init__(self, client_name, source_branch, repo_path=None):
        self.client_name = client_name
        self.source_branch = source_branch
        
        if repo_path:
            # Repo path provided as argument
            self.repo_path = Path(repo_path)
        else:
            # Calculate repo path from script location (original behavior)
            self.script_dir = Path(__file__).parent
            self.repo_path = self.script_dir.parent.parent.parent
        
        self.pk_mapping_file = self.repo_path / "database" / "utils" / "primary_key_mapping.json"
        
    def print_success(self, message):
        print(f"\033[1;32m✓ {message}\033[0m")
    
    def print_error(self, message):
        print(f"\033[1;31m✗ {message}\033[0m")
    
    def print_warning(self, message):
        print(f"\033[1;33m⚠ {message}\033[0m")
    
    def validate_inputs(self):
        """Validate that the required files and branches exist"""
        
        # Check if primary_key_mapping.json exists
        if not self.pk_mapping_file.exists():
            self.print_error(f"Primary key mapping file not found: {self.pk_mapping_file}")
            return False
        
        # Check if source branch exists
        try:
            result = subprocess.run(
                ["git", "-C", str(self.repo_path), "rev-parse", "--verify", self.source_branch],
                capture_output=True,
                text=True,
                check=False
            )
            if result.returncode != 0:
                self.print_error(f"Source branch '{self.source_branch}' does not exist")
                return False
        except Exception as e:
            self.print_error(f"Error checking source branch: {e}")
            return False
        
        return True
    
    def get_client_mapping_from_branch(self):
        """Extract client mapping from source branch using git show"""
        
        try:
            # Get the file content from source branch
            result = subprocess.run(
                ["git", "-C", str(self.repo_path), "show", 
                 f"{self.source_branch}:database/utils/primary_key_mapping.json"],
                capture_output=True,
                text=True,
                check=True
            )
            
            # Parse JSON from source branch
            source_data = json.loads(result.stdout)
            
            # Check if client exists in source branch
            if self.client_name not in source_data:
                self.print_warning(f"Client '{self.client_name}' not found in source branch '{self.source_branch}'")
                return None
            
            client_mapping = source_data[self.client_name]
            self.print_success(f"Retrieved client mapping for '{self.client_name}' from '{self.source_branch}'")
            return client_mapping
            
        except subprocess.CalledProcessError as e:
            self.print_error(f"Error retrieving file from source branch: {e}")
            return None
        except json.JSONDecodeError as e:
            self.print_error(f"Error parsing JSON from source branch: {e}")
            return None
        except Exception as e:
            self.print_error(f"Unexpected error: {e}")
            return None
    
    def update_current_mapping(self, client_mapping):
        """Update the current branch's primary_key_mapping.json with client data"""
        
        try:
            # Read current mapping file preserving original formatting
            with open(self.pk_mapping_file, 'r') as f:
                original_content = f.read()
            
            # Parse JSON
            current_data = json.loads(original_content)
            
            # Update with client mapping
            current_data[self.client_name] = client_mapping
            
            # Create backup
            backup_file = self.pk_mapping_file.with_suffix('.json.bak')
            with open(backup_file, 'w') as f:
                f.write(original_content)
            
            # Write updated data with minimal formatting changes
            # Try to preserve the original indent and structure
            with open(self.pk_mapping_file, 'w') as f:
                json.dump(current_data, f, indent=2, separators=(',', ': '), sort_keys=False)
            
            # Remove backup if successful
            backup_file.unlink()
            
            self.print_success(f"Updated primary key mapping for '{self.client_name}'")
            return True
            
        except Exception as e:
            self.print_error(f"Error updating primary key mapping: {e}")
            
            # Restore backup if it exists
            backup_file = self.pk_mapping_file.with_suffix('.json.bak')
            if backup_file.exists():
                backup_file.rename(self.pk_mapping_file)
                self.print_warning("Restored backup due to error")
            
            return False
    
    def run(self):
        """Main execution method"""
        
        print(f"Merging primary key mapping for client: {self.client_name}")
        
        # Validate inputs
        if not self.validate_inputs():
            return False
        
        # Get client mapping from source branch
        client_mapping = self.get_client_mapping_from_branch()
        if client_mapping is None:
            return False
        
        # Update current mapping
        if not self.update_current_mapping(client_mapping):
            return False
        
        self.print_success(f"Primary key mapping merge completed for '{self.client_name}'")
        return True


def main():
    """Main entry point"""
    
    if len(sys.argv) < 3 or len(sys.argv) > 4:
        print("Usage: python3 merge_primary_keys.py <client_name> <source_branch> [repo_path]")
        print("Example: python3 merge_primary_keys.py carters develop/test")
        print("Example: python3 merge_primary_keys.py carters develop/test /path/to/repo")
        sys.exit(1)
    
    client_name = sys.argv[1]
    source_branch = sys.argv[2]
    repo_path = sys.argv[3] if len(sys.argv) == 4 else None
    
    # Handle empty source branch (for DEV environment)
    if not source_branch or source_branch.strip() == "":
        print("⚠ No source branch specified. Skipping primary key mapping merge.")
        sys.exit(0)
    
    merger = PrimaryKeyMerger(client_name, source_branch, repo_path)
    success = merger.run()
    
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main() 