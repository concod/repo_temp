"""
Logging helpers — console + file logging, progress indicators, and formatting.
Provides hr / section / subsection / info / filelog / run_with_progress utilities.
"""

import os
import sys
import time
import subprocess
import threading
from datetime import datetime
from pathlib import Path


class ReleaseLogger:
    """Handles all console and file logging for the release script."""

    def __init__(self) -> None:
        """Initialise logger: create log directory and open the log file.

        Log directory: ``<cwd>/logs/mtp_database_logs_YYYY-MM-DD/``
        Log file:      ``release_v2_YYYY-MM-DD_HH-MM.log``
        """
        now = datetime.now()
        self.date_str = now.strftime("%Y-%m-%d")
        self.datetime_str = now.strftime("%Y-%m-%d_%H-%M")

        self.log_dir = Path.cwd() / "logs" / f"mtp_database_logs_{self.date_str}"
        self.log_dir.mkdir(parents=True, exist_ok=True)
        self.log_file = self.log_dir / f"release_v2_{self.datetime_str}.log"

        # Open log file for appending
        self._log_fh = open(self.log_file, "a", encoding="utf-8")

    # ------------------------------------------------------------------
    # Low-level helpers
    # ------------------------------------------------------------------

    def _write(self, text: str, *, console: bool = True, log: bool = True) -> None:
        """Write text to console and/or log file."""
        if console:
            sys.stdout.write(text)
            sys.stdout.flush()
        if log:
            self._log_fh.write(text)
            self._log_fh.flush()

    def _writeln(self, text: str, *, console: bool = True, log: bool = True) -> None:
        """Write *text* followed by a newline to console and/or log file.

        Args:
            text: The string to write.
            console: If True, write to stdout.
            log: If True, write to the log file.
        """
        self._write(text + "\n", console=console, log=log)

    # ------------------------------------------------------------------
    # Formatting (mirrors bash hr / section / subsection / info / filelog)
    # ------------------------------------------------------------------

    def hr(self) -> None:
        """Print a horizontal rule (80 dashes) to console and log."""
        line = "\n" + "-" * 80 + "\n"
        self._write(line)

    def section(self, title: str) -> None:
        """Print a section header surrounded by horizontal rules.

        Args:
            title: The section heading text.
        """
        self.hr()
        self._writeln(title)
        self.hr()

    def subsection(self, title: str) -> None:
        """Print a subsection header with a 60-dash underline.

        Args:
            title: The subsection heading text.
        """
        self._writeln(f"  > {title}")
        self._writeln("-" * 60)

    def info(self, msg: str) -> None:
        """Print an informational message prefixed with ``- ``.

        Args:
            msg: The message text.
        """
        self._writeln(f"- {msg}")

    def filelog(self, msg: str) -> None:
        """Append only to the log file (not console)."""
        self._writeln(msg, console=False)

    # ------------------------------------------------------------------
    # Progress wrapper (mirrors run_with_progress)
    # ------------------------------------------------------------------

    def run_with_progress(self, desc: str, cmd: str, cwd: str | None = None) -> int:
        """
        Run *cmd* as a shell command, printing dots while it runs.
        Returns the process return code.
        """
        start = time.time()
        self._write(f"  • {desc} ")

        proc = subprocess.Popen(
            cmd,
            shell=True,
            cwd=cwd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )

        # Print dots in a thread while the subprocess runs
        stop_event = threading.Event()

        def _dots():
            while not stop_event.is_set():
                self._write(".")
                stop_event.wait(0.25)

        dot_thread = threading.Thread(target=_dots, daemon=True)
        dot_thread.start()

        proc.wait()
        stop_event.set()
        dot_thread.join()

        elapsed = int(time.time() - start)
        status = "[OK]" if proc.returncode == 0 else "[FAIL]"
        self._writeln(f" ({elapsed}s) {status}")
        return proc.returncode

    # ------------------------------------------------------------------
    # Blip helpers (coloured dots for prompts)
    # ------------------------------------------------------------------

    @staticmethod
    def blip() -> str:
        """Blinking green dot (for prompts)."""
        return "\033[5;32m●\033[0m "

    @staticmethod
    def blink_yellow() -> str:
        """Blinking yellow dot."""
        return "\033[5;33m●\033[0m"

    # ------------------------------------------------------------------
    # Cleanup
    # ------------------------------------------------------------------

    def close(self) -> None:
        """Flush and close the underlying log file handle."""
        self._log_fh.close()
