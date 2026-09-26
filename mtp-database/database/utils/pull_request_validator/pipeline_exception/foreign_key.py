from dataclasses import dataclass
from typing import List, Tuple
from .base import IndexKeyValidationErrorLine, InvalidMetadata
from ..formatters import ConsoleFormatter


@dataclass
class ForeignKeyConflict(IndexKeyValidationErrorLine):
    """Represents a foreign key constraint violation."""
    reference_table: str
    type: str = 'Foreign Key Constraint Violation'
    
    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], 
                 meta: List[InvalidMetadata], reference_table: str):
        super().__init__(key_columns, key_values, meta)
        self.reference_table = reference_table
    
    def _print_extra(self):
        super()._print_extra()
        ConsoleFormatter.print(" "*20, 'Reference Table:', self.reference_table)
        