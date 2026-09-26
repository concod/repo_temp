from typing import List

from .base import ValidationInvalidLine, InvalidMetadata


class MissingValuesInvalidLine(ValidationInvalidLine):
    level = 4
    """Represents a missing values conflict."""

    def __init__(self, meta: List[InvalidMetadata]):
        super().__init__(meta)
        self.type = 'Missing Values in Row. (Refer Unique Key/value or line number for reference)'


class ExtraValuesInvalidLine(ValidationInvalidLine):
    level = 4
    """Represents a extra values conflict."""

    def __init__(self, meta: List[InvalidMetadata]):
        super().__init__(meta)
        self.type = 'Extra Values in Row. (Refer Unique Key/value or line number for reference)'
