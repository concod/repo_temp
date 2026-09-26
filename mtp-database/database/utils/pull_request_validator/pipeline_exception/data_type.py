from typing import List, Tuple

from .base import IndexKeyValidationErrorLine, InvalidMetadata
from ..formatters import ConsoleFormatter


class InvalidDataTypeValue(IndexKeyValidationErrorLine):
    """Represents a primary key conflict."""

    def _print_extra(self):
        super()._print_extra()
        ConsoleFormatter.print(" "*20, 'Expected Data Type :', self.data_type)
        

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], duplicates: List[InvalidMetadata], data_type: str):
        super().__init__(key_columns, key_values, meta=duplicates)
        self.type = 'Invalid data type'
        self.data_type = data_type

