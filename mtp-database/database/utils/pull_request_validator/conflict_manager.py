# Standard library imports
from collections import defaultdict
from typing import Dict, List

# Local application imports
from .formatters import ConsoleFormatter
from .pipeline_exception import PipelineException


class ConflictManager:
    """
    Manages and reports validation conflicts for multiple clients and tables.
    Centralizes conflict collection and provides formatted reporting functionality.
    Stores conflicts in a nested dictionary structure: {client: {table: [conflicts]}}
    """
    
    def __init__(self):
        """
        Initialize the conflict manager with an empty conflict storage structure.
        """
        # Nested dictionary structure: {client: {table: [PipelineException, ...]}}
        # This allows organizing conflicts by client and then by table for easy reporting
        self.conflicts: Dict[str, Dict[str, List[PipelineException]]] = defaultdict(dict)

    def add_conflict(self, client: str, table: str, conflict: PipelineException) -> None:
        """
        Add a validation conflict for a specific client and table.
        Creates the table entry if it does not exist.
        
        Args:
            client (str): Client name where the conflict occurred
            table (str): Table name where the conflict occurred
            conflict (PipelineException): The validation conflict to add
        """
        # Initialize table list if this is the first conflict for this client/table combination
        if table not in self.conflicts[client]:
            self.conflicts[client][table] = []
            
        # Add the conflict to the appropriate client/table list
        self.conflicts[client][table].append(conflict)

    def has_conflicts(self) -> bool:
        """
        Check if any validation conflicts have been recorded.
        
        Returns:
            bool: True if conflicts exist, False if no conflicts found
        """
        # Check if any conflicts exist across all clients and tables
        return any(self.conflicts)

    def get_conflicts(self) -> Dict[str, Dict[str, List[PipelineException]]]:
        """
        Retrieve all recorded validation conflicts.
        
        Returns:
            Dict[str, Dict[str, List[PipelineException]]]: Complete conflicts dictionary
        """
        return self.conflicts
    
    def __print_no_conflicts(self) -> None:
        """
        Print a success message indicating that no validation conflicts were found.
        Used internally when validation passes without issues.
        """
        ConsoleFormatter.print_green("="*100)
        ConsoleFormatter.print_green("No issues found!")
        ConsoleFormatter.print_green("="*100)
    
    def print_conflicts(self) -> None:
        """
        Print all validation conflicts in a formatted manner.
        Organizes output by client and table, with conflicts sorted by severity.
        If no conflicts exist, prints a success message instead.
        """
        # Check if there are any conflicts to report
        if not self.has_conflicts():
            self.__print_no_conflicts()
            return
        
        # Iterate through each client that has conflicts
        for client_name, client_conflicts in self.conflicts.items():
            # Print client header
            ConsoleFormatter.print_yellow(f"---{client_name}---")
            
            # Iterate through each table that has conflicts for this client
            for table_name, table_conflicts in client_conflicts.items():
                # Print table name with indentation
                ConsoleFormatter.print_blue(" "*10 + table_name)
                
                # Sort conflicts by severity level (descending - higher severity first)
                # This ensures critical issues are displayed prominently
                table_conflicts.sort(key=lambda conflict: -getattr(conflict, 'level', 0))
                
                # Print each conflict for this table
                for conflict in table_conflicts:
                    # Each conflict has its own print method for formatted output
                    conflict.print()
                    # Add spacing between conflicts for readability
                    ConsoleFormatter.print('\n'*2) 