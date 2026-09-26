from typing import List, Tuple

from .base import IndexKeyValidationErrorLine, InvalidMetadata


class SegregatedDataConflict(IndexKeyValidationErrorLine):
    """Represents a segregated data conflict."""

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], duplicates: List[InvalidMetadata]):
        super().__init__(key_columns, key_values, meta=duplicates)
        self.type = 'Segregated Data Conflict' 
