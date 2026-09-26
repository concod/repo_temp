import json
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import List, Tuple, Dict

from ..formatters import ConsoleFormatter
from ..git import GitUtils


class PipelineException(ABC):
    level: int = 0
    @abstractmethod
    def print(self):
        pass


@dataclass
class InvalidMetadata:
    """Metadata for invalid entries."""
    table_path: str
    line_number: int
    line: Dict = field(default_factory=dict)

    def get_commit_details(self):
        detail = GitUtils.get_git_blame(self.table_path, self.line_number)
        return detail


@dataclass
class DBNotConnected(PipelineException):
    error: str = ""
    level: int = 10
    def print(self):
        ConsoleFormatter.print_red(" "*20, 'Type:', 'DB Not Connected')
        ConsoleFormatter.print(" "*20, "Error: ", self.error)


@dataclass
class InvalidTable(PipelineException):
    traceback: str
    type: str = 'Invalid Table'
    table_path: str = ''
    level: int = 5

    def print(self):
        ConsoleFormatter.print_red(" "*20, 'Type:', self.type)
        if self.table_path:
            ConsoleFormatter.print(" "*20, 'Table Path:', self.table_path)
        ConsoleFormatter.print(" "*20, 'Traceback:', )
        ConsoleFormatter.print(" "*25, self.traceback)


class ValidationInvalidLine(PipelineException):
    type: str = "Invalid Line (Default)"
    meta: List[InvalidMetadata]
    level: int = 2

    def _print_extra(self):
        pass

    def __init__(self, meta: List[InvalidMetadata]):
        self.meta = meta

    
    def print(self):
        ConsoleFormatter.print_red(" "*20, 'Type:', self.type)
        self._print_extra()
        ConsoleFormatter.print(" "*20, 'Paths:')

        commit_details = []

        for line in self.meta:
            ConsoleFormatter.print(" "*25, line.table_path, 'line', line.line_number)
            if line.line:
                ConsoleFormatter.print(" "*25, 'Row: ', json.dumps(line.line, indent=27))

            commit_details.append(line.get_commit_details())

        commit_details = [detail for detail in commit_details if detail]
        if commit_details:
            commit_details.sort(key=lambda x: x.get('timestamp'))
            print(" "*20, "Last Change details:")
            print(" "*25, "Author: ", commit_details[-1]['author'])
            print(" "*25, "Timestamp: ", commit_details[-1]['timestamp'])
            print(" "*25, "Line: ", commit_details[-1]['code'])


class IndexKeyValidationErrorLine(ValidationInvalidLine):
    """Represents a validation conflict."""
    key_columns: List[str]
    key_values: Tuple[str, ...]
    level: int = 1

    def __init__(self, key_columns: List[str], key_values: Tuple[str, ...], meta: List[InvalidMetadata]):
        self.key_columns = key_columns
        self.key_values = key_values
        self.meta = meta

    def _print_extra(self):
        ConsoleFormatter.print(" "*20, 'Key Columns:', self.key_columns)
        ConsoleFormatter.print(" "*20, 'Key Values :', self.key_values)
