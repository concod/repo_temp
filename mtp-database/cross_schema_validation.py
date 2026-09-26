#!/usr/bin/env python3
"""
Cross Operation Check - NON_INVENTORY_SCHEMA_WRITE Validator

This script validates that non-inventory schemas do not perform write operations
to the global schema, maintaining architectural separation between inventory and 
non-inventory systems.

Usage:
    python3 cross_operation_check.py
    
Exit codes:
    0 - All validations passed
    1 - Violations detected
"""

import os
import sys
import glob
import re
import json
import argparse
from pathlib import Path
from typing import List, Dict, Tuple, Set

# Schema classifications (from services.py)
common_schemas = ['cache', 'global', 'public', 'data_retention', 'datadog', 'app_cache', 'chat_gpt']
inventory_schemas = ['ada', 'data_platform', 'inventory_smart', 'forecast_smart', 'oms', 'genai'] + common_schemas

# ============================================================================
# CENTRALIZED NON_INVENTORY_SCHEMA_WRITE EXCEPTIONS
# ============================================================================
# Add files here that have valid business reasons to write to global schema
# from non-inventory schemas. Keep this list minimal and well-documented.
# ============================================================================
NON_INVENTORY_SCHEMA_WRITE_EXCEPTIONS = [
    # Add file paths below that have valid business reasons to write to global schema
    # from non-inventory schemas. Each entry should have a comment explaining why.
    # 
    # Example:
    # "database/client/schemas/price_promo/functions/fn_update_product_group.sql",  # Reason: Legacy sync process
]

# Global exclusions cache
exclusions_cache: Set[str] = set()

# ANSI color codes for output
class Colors:
    RED = '\033[91m'
    GREEN = '\033[92m'
    YELLOW = '\033[93m'
    BLUE = '\033[94m'
    MAGENTA = '\033[95m'
    CYAN = '\033[96m'
    BOLD = '\033[1m'
    RESET = '\033[0m'

def check_non_inventory_write(sql_content: str) -> Tuple[bool, List[Tuple[str, str]]]:
    """
    Check if SQL content contains write operations to GLOBAL schema.
    
    This rule prevents non-inventory schemas (item_smart, plan_smart, etc.) 
    from performing write operations (INSERT, DELETE, UPDATE, TRUNCATE, DROP) 
    on the global schema to maintain architectural separation between 
    inventory and non-inventory systems.
    
    Args:
        sql_content (str): SQL content to check
        
    Returns:
        tuple: (has_violation, list of matches)
    """
    # Detect write operations specifically to GLOBAL schema
    write_ops_pattern = r"(?i)\b(INSERT\s+INTO|DELETE\s+FROM|TRUNCATE\s+TABLE|UPDATE|DROP\s+TABLE|DROP\s+INDEX|DROP\s+VIEW)\s+(global)\."
    
    matches = re.findall(write_ops_pattern, sql_content, re.IGNORECASE)
    
    return len(matches) > 0, matches

def load_exceptions() -> Set[str]:
    """
    Load all NON_INVENTORY_SCHEMA_WRITE exceptions.
    
    Exceptions are loaded from:
    1. Centralized list in this file (NON_INVENTORY_SCHEMA_WRITE_EXCEPTIONS)
    2. Individual tenant exceptions.json files (if they have the rule defined)
    
    Returns:
        set: Set of file paths that are excluded from validation
    """
    exclusions = set()
    
    # Load centralized exceptions from this file
    exclusions.update(NON_INVENTORY_SCHEMA_WRITE_EXCEPTIONS)
    
    # Load from individual tenant exceptions.json files (optional)
    exception_files = glob.glob("database/*/exceptions.json", recursive=False)
    exception_files.extend(glob.glob("database/schemas/exceptions.json"))
    
    for exception_file in exception_files:
        try:
            with open(exception_file, 'r') as f:
                exceptions_data = json.load(f)
                
            # Check if NON_INVENTORY_SCHEMA_WRITE rule exists
            if 'NON_INVENTORY_SCHEMA_WRITE' in exceptions_data:
                rule_exceptions = exceptions_data['NON_INVENTORY_SCHEMA_WRITE'].get('exclusions', [])
                exclusions.update(rule_exceptions)
                
        except Exception as e:
            print(f"{Colors.YELLOW}Warning: Error loading {exception_file}: {e}{Colors.RESET}")
    
    return exclusions

def should_check_file(schema: str, obj_type: str) -> bool:
    """
    Determine if the file should be checked for NON_INVENTORY_SCHEMA_WRITE violations.
    
    Args:
        schema (str): Schema name
        obj_type (str): Object type (functions, procedures, tables, etc.)
        
    Returns:
        bool: True if file should be checked
    """
    # Only check functions, procedures, and tables in non-inventory schemas
    if obj_type in ['functions', 'procedures', 'tables']:
        if schema not in inventory_schemas:
            return True
    return False

def validate_sql_file(filepath: str) -> Dict:
    """
    Validate a single SQL file for NON_INVENTORY_SCHEMA_WRITE violations.
    
    Args:
        filepath (str): Path to SQL file
        
    Returns:
        dict: Validation result with filename and violations
    """
    try:
        # Extract schema and object type from path
        parts = filepath.split('/')
        
        # Find schemas index
        if 'schemas' not in parts:
            return None
            
        schema_idx = parts.index('schemas') + 1
        if schema_idx >= len(parts):
            return None
            
        schema = parts[schema_idx]
        obj_type = parts[-2] if len(parts) >= 2 else 'unknown'
        
        # Check if this file should be validated
        if not should_check_file(schema, obj_type):
            return None
        
        # Read file content
        if not os.path.exists(filepath):
            return None
            
        sql_content = Path(filepath).read_text()
        
        # Check if file is in exclusions list
        if filepath in exclusions_cache:
            return None
        
        # Check for violations
        has_violation, matches = check_non_inventory_write(sql_content)
        
        if has_violation:
            return {
                'filename': filepath,
                'schema': schema,
                'obj_type': obj_type,
                'violations': matches,
                'is_exception': False
            }
        
        return None
        
    except Exception as e:
        print(f"{Colors.YELLOW}Warning: Error processing {filepath}: {e}{Colors.RESET}")
        return None

def scan_database_files(client: str = None) -> Tuple[List[Dict], int]:
    """
    Scan SQL files in the database directory for violations.
    
    Args:
        client (str): Optional client name to scan specific client only.
                     If None, scans all files.
    
    Returns:
        tuple: (list of files with violations, total files scanned)
    """
    violations = []
    files_scanned = 0
    
    # Build patterns based on client filter
    if client and client != "ALL":
        # Scan specific client only
        patterns = [
            f"database/{client}/schemas/*/functions/*.sql",
            f"database/{client}/schemas/*/procedures/*.sql",
            f"database/{client}/schemas/*/tables/*.sql"
        ]
    else:
        # Scan all files
        patterns = [
            "database/schemas/*/functions/*.sql",
            "database/schemas/*/procedures/*.sql",
            "database/schemas/*/tables/*.sql",
            "database/*/schemas/*/functions/*.sql",
            "database/*/schemas/*/procedures/*.sql",
            "database/*/schemas/*/tables/*.sql"
        ]
    
    all_files = []
    for pattern in patterns:
        all_files.extend(glob.glob(pattern, recursive=True))
    
    # Remove duplicates
    all_files = list(set(all_files))
    
    for filepath in all_files:
        files_scanned += 1
        result = validate_sql_file(filepath)
        if result:
            violations.append(result)
    
    return violations, files_scanned

def print_report(violations: List[Dict], files_scanned: int, client: str = None):
    """
    Print validation report.
    
    Args:
        violations (list): List of files with violations
        files_scanned (int): Total number of files scanned
        client (str): Client name being scanned (optional)
    """
    print("\n" + "="*80)
    print(f"{Colors.BOLD}{Colors.CYAN}NON_INVENTORY_SCHEMA_WRITE VALIDATION REPORT{Colors.RESET}")
    print("="*80)
    
    print(f"\n{Colors.BLUE}📊 Scan Summary:{Colors.RESET}")
    if client and client != "ALL":
        print(f"   Client: {client}")
    else:
        print(f"   Client: ALL (scanning entire repository)")
    print(f"   Files scanned: {files_scanned}")
    print(f"   Files in exceptions: {len(exclusions_cache)}")
    print(f"   Violations found: {len(violations)}")
    
    if len(violations) == 0:
        print(f"\n{Colors.GREEN}{Colors.BOLD}✅ SUCCESS: No violations detected!{Colors.RESET}")
        print(f"{Colors.GREEN}All non-inventory schemas are properly isolated from global schema.{Colors.RESET}")
        return
    
    print(f"\n{Colors.RED}{Colors.BOLD}❌ VIOLATIONS DETECTED:{Colors.RESET}")
    print(f"{Colors.RED}Non-inventory schemas are attempting to write to global schema!{Colors.RESET}\n")
    
    # Group violations by client
    violations_by_client = {}
    for violation in violations:
        # Extract client name from path: database/CLIENT_NAME/schemas/...
        filepath = violation['filename']
        parts = filepath.split('/')
        if len(parts) > 1 and parts[0] == 'database':
            client_name = parts[1]
            if client_name not in violations_by_client:
                violations_by_client[client_name] = []
            violations_by_client[client_name].append(violation)
    
    # Display violations grouped by client
    print(f"{Colors.RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.RESET}")
    print(f"{Colors.RED}{Colors.BOLD}FILES WITH VIOLATIONS:{Colors.RESET}")
    print(f"{Colors.RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.RESET}\n")
    
    # Sort clients alphabetically
    for client_name in sorted(violations_by_client.keys()):
        print(f"{Colors.CYAN}{Colors.BOLD}{client_name}{Colors.RESET}")
        for violation in violations_by_client[client_name]:
            print(f"  {Colors.YELLOW}{violation['filename']}{Colors.RESET}")
        print()  # Empty line between clients
    
    # Show how to fix section
    print(f"{Colors.RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.RESET}")
    print(f"{Colors.YELLOW}{Colors.BOLD}💡 HOW TO FIX THESE VIOLATIONS:{Colors.RESET}")
    print(f"{Colors.RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.RESET}\n")
    
    print(f"{Colors.YELLOW}Option 1: Remove Write Operations (Recommended){Colors.RESET}")
    print(f"   • Remove all DML operations (INSERT/UPDATE/DELETE/TRUNCATE) to global.* tables")
    print(f"   • Use read-only operations (SELECT) to query global schema instead\n")
    
    print(f"{Colors.YELLOW}Option 2: Add to Centralized Exceptions (If Valid Business Reason){Colors.RESET}")
    print(f"   • File: {Colors.CYAN}cross_schema_validation.py{Colors.RESET}")
    print(f"   • Add to: {Colors.CYAN}NON_INVENTORY_SCHEMA_WRITE_EXCEPTIONS{Colors.RESET} list (around line 35)")
    print(f"   • Add each file with a comment explaining why:\n")
    print(f"{Colors.CYAN}     NON_INVENTORY_SCHEMA_WRITE_EXCEPTIONS = [{Colors.RESET}")
    for idx, violation in enumerate(violations[:3], 1):  # Show first 3 as examples
        print(f'{Colors.CYAN}         "{violation["filename"]}",  # Reason: <explain why>{Colors.RESET}')
    if len(violations) > 3:
        print(f"{Colors.CYAN}         # ... add remaining {len(violations) - 3} file(s){Colors.RESET}")
    print(f"{Colors.CYAN}     ]{Colors.RESET}\n")
    
    print(f"{Colors.RED}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━{Colors.RESET}")
    print(f"\n{Colors.RED}{Colors.BOLD}⚠️  VALIDATION FAILED{Colors.RESET}")
    print(f"{Colors.RED}Please fix the violations above before merging this PR.{Colors.RESET}")
    print(f"\n{Colors.CYAN}ℹ️  For more information about schema separation:{Colors.RESET}")
    print(f"   • Inventory schemas: {', '.join(inventory_schemas[:5])}...")
    print(f"   • Non-inventory schemas: All others (item_smart, plan_smart, assort, etc.)")
    print(f"   • Global schema is protected from non-inventory writes")
    print(f"   • Centralized exceptions: Edit NON_INVENTORY_SCHEMA_WRITE_EXCEPTIONS in cross_schema_validation.py")

def main():
    """Main execution function."""
    global exclusions_cache
    
    # Parse command line arguments
    parser = argparse.ArgumentParser(
        description='NON_INVENTORY_SCHEMA_WRITE Validator - Checks for write operations from non-inventory schemas to global schema'
    )
    parser.add_argument(
        '--client',
        type=str,
        default=None,
        help='Client name to scan (e.g., carters, balsam). If not specified, scans all clients.'
    )
    
    args = parser.parse_args()
    
    print(f"\n{Colors.CYAN}{Colors.BOLD}Starting NON_INVENTORY_SCHEMA_WRITE Validation...{Colors.RESET}")
    
    if args.client:
        print(f"{Colors.CYAN}Target: {args.client}{Colors.RESET}")
    else:
        print(f"{Colors.CYAN}Target: ALL clients{Colors.RESET}")
    
    print(f"{Colors.CYAN}Loading exceptions from exceptions.json files...{Colors.RESET}")
    
    # Load exceptions
    exclusions_cache = load_exceptions()
    
    if len(exclusions_cache) > 0:
        print(f"{Colors.YELLOW}Found {len(exclusions_cache)} file(s) in exceptions list{Colors.RESET}")
    
    print(f"{Colors.CYAN}Scanning database directory for violations...{Colors.RESET}\n")
    
    # Scan for violations
    violations, files_scanned = scan_database_files(client=args.client)
    
    # Print report
    print_report(violations, files_scanned, client=args.client)
    
    # Exit with appropriate code
    if len(violations) > 0:
        sys.exit(1)
    else:
        sys.exit(0)

if __name__ == '__main__':
    main()

