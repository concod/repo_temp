from typing import List, Tuple

from .base import IndexKeyValidationErrorLine, InvalidMetadata
from ..formatters import ConsoleFormatter


class PrimaryKeyConflict(IndexKeyValidationErrorLine):
    """Represents a primary key conflict."""

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], duplicates: List[InvalidMetadata], constraint_name: str):
        super().__init__(key_columns, key_values, meta=duplicates)
        self.type = 'Primary Key/Unique Constraint Conflict'
        self.constraint_name = constraint_name
    
    def _print_extra(self):
        super()._print_extra()
        ConsoleFormatter.print(" "*20, 'Constraint Name:', self.constraint_name)

