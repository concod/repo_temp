#!/usr/bin/env python3.8
"""
PR Blame Notifier
=================
Parses Liquibase validation/deployment error output, identifies the exact
lines and authors responsible via git blame, then sends personalised emails
to the correct people (line owner AND/OR PR author) with a fully-structured,
actionable error message.

Usage (called from validate_pr.sh / complete_deploy.sh):
    python3.8 pr_blame_notifier.py \
        --error-file  /tmp/liquibase_error.txt \
        --context     "File: liquibase/client/master_changelog.xml" \
        --client      CLIENT_NAME \
        --env         ENV_NAME \
        --mode        validate   # or "deploy"
"""

import os
import re
import sys
import json
import argparse
import subprocess
import requests
import traceback
from collections import defaultdict
from typing import List, Dict, Optional, Tuple
from colorama import Fore, Style, init

init(autoreset=True)


# ── Email-validity guard (shared with error_blame_analyzer.py) ────────────────
# Git blame returns placeholder/service-account emails in CI environments that
# must never be used as notification targets.
_PLACEHOLDER_EMAIL_RE = re.compile(
    r'not\.committed\.yet'
    r'|activated-\d+@'
    r'|pipeline-'
    r'|noreply@'
    r'|bitbucket-pipelines'
    r'|@users\.noreply\.'
    r'|<none>'
    r'|<unknown>',
    re.IGNORECASE,
)

def _is_real_author_email(email: str) -> bool:
    """Return True only for real developer email addresses."""
    if not email or '@' not in email:
        return False
    return not _PLACEHOLDER_EMAIL_RE.search(email)

def _sanitize_email(email: str) -> str:
    """
    Remove Bitbucket CI artifact prefixes from email domains.

    Bitbucket sometimes stores a developer's git author-mail with prefixes like
    ``activated-`` or ``actived-`` in the domain due to account-activation artifacts.
    We strip these prefixes from the **start** of the domain only, so legitimate
    domain names like ``active-company.com`` or ``activation-services.io`` remain unchanged.

    Examples
    --------
        john@activated-solutions.com  →  john@solutions.com      (cleaned)
        jane@actived-acme.co.uk       →  jane@acme.co.uk         (cleaned)
        bob@active-company.com        →  bob@active-company.com  (unchanged ✓)
        alice@activation-hub.io       →  alice@activation-hub.io (unchanged ✓)
        normal@company.com            →  normal@company.com      (unchanged ✓)
    """
    if not email or '@' not in email:
        return email

    username, domain = email.rsplit('@', 1)

    # Strip Bitbucket CI artifact prefixes from the START of the domain.
    # Handles variations: activated-, actived-, etc.
    # Only matches at domain start (^) to preserve legitimate company domains.
    cleaned_domain = re.sub(r'^activ(at)?ed-', '', domain, flags=re.IGNORECASE)

    return f"{username}@{cleaned_domain}"
# ─────────────────────────────────────────────────────────────────────────────


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 1 — Liquibase error parser
# ─────────────────────────────────────────────────────────────────────────────

class LiquibaseErrorParser:
    """
    Turns raw Liquibase stdout/stderr into structured error records.

    Supported error shapes
    ──────────────────────
    1. Changeset validation failure
       Validation Failed:
           1 changes have validation failures
               ...Changeset 'my_file.sql::1234::author' ...

    2. Precondition failure
       Preconditions Failed
           MARK_RAN ...

    3. SQL execution failure (includes line number from JDBC driver)
       ERROR: relation "foo" does not exist
         Position: 42    ← JDBC gives us byte offset, not line number

    4. Duplicate changeset id
       Changeset ... was already ran against the database

    Each record produced:
        {
            "raw"        : str,   # original error block
            "type"       : str,   # CHANGESET | PRECONDITION | SQL | DUPLICATE | UNKNOWN
            "file"       : str,   # relative path extracted if available
            "changeset"  : str,   # id::author if available
            "line"       : int|None,
            "description": str,   # human-readable summary
            "suggestion" : str,   # actionable fix hint
        }
    """

    # Changeset reference, e.g.  'path/to/file.sql::20240101-001::john.doe'
    _CS_RE = re.compile(
        r"'([^']+\.sql)::([^']+)'"          # 'file.sql::id::author'
    )
    # Liquibase line reference within changeset
    _LINE_RE = re.compile(r'line\s+(\d+)', re.IGNORECASE)
    # JDBC position (byte offset) – best-effort approximation
    _POS_RE  = re.compile(r'[Pp]osition:\s*(\d+)')
    # Generic SQL file ref
    _FILE_RE = re.compile(r'((?:[\w./-]+/)[\w.-]+\.(?:sql|xml))')

    # Known error phrases → human explanation + fix hint
    _KNOWN_PATTERNS = [
        (re.compile(r'duplicate unique value', re.I),
         "Duplicate value violates unique constraint",
         "Check for existing rows before INSERT, or use ON CONFLICT DO NOTHING."),
        (re.compile(r'already ran against', re.I),
         "Duplicate changeset ID – this changeset was already applied",
         "Use a new unique ID for your changeset, or remove the duplicate entry."),
        (re.compile(r'relation .+ does not exist', re.I),
         "Referenced table / view does not exist yet",
         "Ensure the dependency is created in an earlier changeset, or add a precondition."),
        (re.compile(r'column .+ of relation .+ does not exist', re.I),
         "Column referenced does not exist on the target table",
         "Verify the column name and the schema version the migration expects."),
        (re.compile(r'syntax error', re.I),
         "SQL syntax error",
         "Review the SQL statement; check for missing commas, parentheses, or keywords."),
        (re.compile(r'precondition failed', re.I),
         "Liquibase precondition not met – changeset cannot run",
         "Review the <preConditions> block and ensure the expected state exists in the DB."),
        (re.compile(r'validation fail', re.I),
         "Liquibase changelog validation failure",
         "Run 'liquibase validate' locally and fix reported issues before re-pushing."),
        (re.compile(r'checksum.*mismatch|mismatch.*checksum', re.I),
         "Changeset checksum mismatch – the SQL was edited after it was applied",
         "Never edit already-applied changesets. Create a new one to amend behaviour."),
        (re.compile(r'permission denied', re.I),
         "Insufficient DB privileges for this operation",
         "Check the DB user's permissions or wrap the statement in a DO $$ block with EXCEPTION."),
    ]

    def parse(self, raw_output: str) -> List[Dict]:
        """Split raw Liquibase output into individual error records."""
        # Split on common Liquibase section dividers
        blocks = re.split(
            r'\n(?=(?:ERROR|Caused by|Validation Failed|Preconditions Failed|'
            r'Unexpected error running Liquibase|Migration failed))',
            raw_output,
            flags=re.IGNORECASE
        )

        records = []
        for block in blocks:
            block = block.strip()
            if not block:
                continue
            record = self._parse_block(block)
            if record:
                records.append(record)

        # Deduplicate identical descriptions
        seen = set()
        unique = []
        for r in records:
            key = (r['file'], r['changeset'], r['description'])
            if key not in seen:
                seen.add(key)
                unique.append(r)

        return unique if unique else [self._unknown_record(raw_output)]

    def _parse_block(self, block: str) -> Optional[Dict]:
        """Parse a single error block into a structured record."""
        record = {
            "raw"        : block,
            "type"       : "UNKNOWN",
            "file"       : "",
            "changeset"  : "",
            "line"       : None,
            "description": "",
            "suggestion" : "Review the error and contact db-architects@impactanalytics.co if unsure.",
        }

        # Skip purely informational lines
        if re.match(r'^\s*(Liquibase|#|--|\[main\])', block) and 'error' not in block.lower():
            return None

        # ── File & changeset extraction ──────────────────────────────────────
        cs_match = self._CS_RE.search(block)
        if cs_match:
            record['file']      = cs_match.group(1)
            record['changeset'] = cs_match.group(2)

        if not record['file']:
            file_match = self._FILE_RE.search(block)
            if file_match:
                record['file'] = file_match.group(1)

        # ── Line number extraction ────────────────────────────────────────────
        line_match = self._LINE_RE.search(block)
        if line_match:
            record['line'] = int(line_match.group(1))

        # ── Error type & description ─────────────────────────────────────────
        for pattern, desc, suggestion in self._KNOWN_PATTERNS:
            if pattern.search(block):
                record['description'] = desc
                record['suggestion']  = suggestion
                if 'already ran' in block.lower() or 'duplicate' in block.lower():
                    record['type'] = 'DUPLICATE'
                elif 'precondition' in block.lower():
                    record['type'] = 'PRECONDITION'
                elif 'validation' in block.lower():
                    record['type'] = 'CHANGESET'
                else:
                    record['type'] = 'SQL'
                break
        else:
            # Fallback: pull first meaningful line as description
            for line in block.splitlines():
                line = line.strip()
                if line and not line.startswith('[') and len(line) > 10:
                    record['description'] = line[:200]
                    break

        return record if record['description'] else None

    def _unknown_record(self, raw: str) -> Dict:
        first_line = next(
            (l.strip() for l in raw.splitlines() if l.strip()), raw[:200]
        )
        return {
            "raw"        : raw,
            "type"       : "UNKNOWN",
            "file"       : "",
            "changeset"  : "",
            "line"       : None,
            "description": first_line,
            "suggestion" : "Review the full pipeline log and contact db-architects@impactanalytics.co.",
        }


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 2 — Git blame resolver
# ─────────────────────────────────────────────────────────────────────────────

class GitBlameResolver:
    """
    Resolves the author email of specific lines in a file using git blame.

    Resolution order (per author found in blame output):
      1. Bitbucket REST API  — always returns the real, verified account email
      2. Sanitized blame email — strips the 'activated-' Bitbucket artifact
      3. None — if neither source produces a usable address

    Falls back gracefully when git is unavailable or the file is untracked.
    """

    def __init__(self, repo_root: str = None):
        self.repo_root  = repo_root or os.getcwd()
        self._api_cache: Dict[Tuple[str, str], Optional[str]] = {}   # display_name → email

        # Bitbucket API credentials (set these as pipeline variables)
        self._workspace = os.environ.get('BITBUCKET_WORKSPACE', '')
        self._bb_token  = os.environ.get('BITBUCKET_TOKEN', '')   # repo / workspace access token

    # ── Public entry point ────────────────────────────────────────────────────

    def resolve(self, file_path: str, line: Optional[int]) -> Optional[str]:
        """
        Return the real author email for a specific line (or the most-frequent
        author of the whole file when no line number is available).
        """
        if not os.path.isfile(os.path.join(self.repo_root, file_path)):
            return None

        if line:
            return self._blame_line(file_path, line)
        else:
            return self._blame_file_majority(file_path)

    # ── Bitbucket API lookup ──────────────────────────────────────────────────

    def _get_email_from_bitbucket_api(self, display_name: str,
                                       fallback_email: str) -> Optional[str]:
        """
        Look up the developer's real verified email via the Bitbucket REST API.

        Strategy
        --------
        1. Search workspace members whose display_name matches the git author.
        2. Fetch the /emails endpoint for the resolved account_id.
        3. Return the primary+confirmed email; fall back to first confirmed email.
        4. If the API is unavailable or returns nothing, return None so the
           caller can use the sanitized blame email instead.

        Results are cached so each unique author triggers at most one API round-trip.
        """
        cache_key = (display_name, (fallback_email or '').lower())
        # Return cached result (None means "API tried, nothing found")
        if cache_key in self._api_cache:
            return self._api_cache[cache_key]

        if not self._workspace or not self._bb_token:
            # Credentials not configured — skip silently, caller will fall back
            self._api_cache[cache_key] = None
            return None

        try:
            auth = ('x-token-auth', self._bb_token)
            headers = {'Accept': 'application/json'}

            # ── Step 1: resolve display_name → account_id ─────────────────────
            search_url = (
                f"https://api.bitbucket.org/2.0/workspaces/{self._workspace}/members"
            )
            resp = requests.get(
                search_url,
                auth=auth,
                headers=headers,
                params={'q': f'display_name="{display_name}"'},
                timeout=10,
            )

            if resp.status_code != 200:
                print(f"{Fore.YELLOW}⚠ Bitbucket API member search returned "
                      f"HTTP {resp.status_code} for '{display_name}'{Style.RESET_ALL}")
                self._api_cache[cache_key] = None
                return None

            members = resp.json().get('values', [])
            if not members:
                # Try looser match — sometimes display name differs slightly from git author
                print(f"{Fore.YELLOW}⚠ No Bitbucket member matched display_name='{display_name}'. "
                      f"Falling back to blame email.{Style.RESET_ALL}")
                self._api_cache[cache_key] = None
                return None
            
                        # Iterate through all members — verify API email matches blame to avoid
            # wrong attribution when multiple people share the same display name
            fallback_lower = (fallback_email or '').lower()
            for member in members:
                account_id = member.get('account_id') or member.get('uuid', '').strip('{}')
                if not account_id:
                    continue
                email_url = f"https://api.bitbucket.org/2.0/users/{account_id}/emails"
                email_resp = requests.get(
                    email_url, auth=auth, headers=headers, timeout=10
                )
                if email_resp.status_code != 200:
                    continue
                emails = email_resp.json().get('values', [])

                # Prefer primary + confirmed; then any confirmed; then first available
                real_email = None
                for entry in emails:
                    if entry.get('is_primary') and entry.get('is_confirmed'):
                        real_email = entry['email']
                        break
                if not real_email:
                    for entry in emails:
                        if entry.get('is_confirmed'):
                            real_email = entry['email']
                            break
                if not real_email and emails:
                    real_email = emails[0]['email']

                # Only use API email if it matches blame (same person)
                if real_email and fallback_lower:
                    if real_email.lower() == fallback_lower:
                        print(f"{Fore.GREEN}✓ Bitbucket API resolved '{display_name}' "
                              f"→ {real_email}{Style.RESET_ALL}")
                        self._api_cache[cache_key] = real_email
                        return real_email
                    api_local = real_email.split('@')[0].lower() if '@' in real_email else ''
                    fallback_local = fallback_lower.split('@')[0] if '@' in fallback_lower else ''
                    if api_local == fallback_local:
                        print(f"{Fore.GREEN}✓ Bitbucket API resolved '{display_name}' "
                              f"→ {real_email}{Style.RESET_ALL}")
                        self._api_cache[cache_key] = real_email
                        return real_email
    
            # No member's email matched blame — use blame email to avoid wrong attribution
            self._api_cache[cache_key] = None
            return None

        except Exception as ex:
            print(f"{Fore.YELLOW}⚠ Bitbucket API error for '{display_name}': {ex}{Style.RESET_ALL}")
            self._api_cache[cache_key] = None
            return None

    # ── Git blame helpers ─────────────────────────────────────────────────────

    def _blame_line(self, file_path: str, line: int) -> Optional[str]:
        cmd = f"git blame -L {line},{line} --porcelain -- {file_path}"
        return self._run_blame(cmd, file_path)

    def _blame_file_majority(self, file_path: str) -> Optional[str]:
        """Return the email of the author who wrote the most lines in the file."""
        try:
            result = subprocess.run(
                f"git blame --porcelain -- {file_path}",
                shell=True, capture_output=True, text=True, cwd=self.repo_root
            )
            if result.returncode != 0:
                return None

            # Collect (display_name, blame_email) occurrence counts
            author_name  = None
            author_email = None
            counts: Dict[str, int] = defaultdict(int)
            # Map blame_email → display_name so we can resolve via API later
            name_for_email: Dict[str, str] = {}

            for raw_line in result.stdout.splitlines():
                if raw_line.startswith('author ') and not raw_line.startswith('author-'):
                    author_name = raw_line[len('author '):].strip()
                elif raw_line.startswith('author-mail '):
                    author_email = raw_line.split('author-mail ')[1].strip('<>')
                    if author_name and author_email and _is_real_author_email(author_email):
                        cleaned = _sanitize_email(author_email)
                        counts[cleaned] += 1
                        name_for_email.setdefault(cleaned, author_name)
                    # reset for next commit block
                    author_name  = None
                    author_email = None

            if not counts:
                return None

            top_email = max(counts, key=counts.get)
            top_name  = name_for_email.get(top_email, '')

            # Try Bitbucket API first; fall back to sanitized blame email
            return self._get_email_from_bitbucket_api(top_name, top_email) or top_email

        except Exception as e:
            print(f"{Fore.YELLOW}⚠ git blame (file) failed for {file_path}: {e}{Style.RESET_ALL}")
            return None

    def _run_blame(self, cmd: str, file_path: str) -> Optional[str]:
        """Run a git blame command and return the resolved author email."""
        try:
            result = subprocess.run(
                cmd, shell=True, capture_output=True, text=True, cwd=self.repo_root
            )
            if result.returncode != 0:
                return None

            # Shallow clone: lines beyond clone depth are attributed to the boundary commit (^).
            # Do not notify that author — treat as unreliable and let caller attribute to PR author.
            for raw_line in result.stdout.splitlines():
                if raw_line and raw_line[0] == '^':
                    print(f"{Fore.YELLOW}⚠ git blame boundary commit (shallow history) for {file_path} — attributing to PR author{Style.RESET_ALL}")
                    return None
                break  # only check first line of porcelain output

            author_name  = None
            author_email = None

            for raw_line in result.stdout.splitlines():
                if raw_line.startswith('author ') and not raw_line.startswith('author-'):
                    author_name = raw_line[len('author '):].strip()
                elif raw_line.startswith('author-mail '):
                    author_email = raw_line.split('author-mail ')[1].strip('<>')
                    break   # both fields collected; stop scanning

            if not author_email or not _is_real_author_email(author_email):
                # CI bot or placeholder — attribute to PR author
                return None

            sanitized = _sanitize_email(author_email)

            # ── Resolution order ──────────────────────────────────────────────
            # 1. Bitbucket API  (real verified email, no 'activated-' artifacts)
            # 2. Sanitized blame email (strips 'activated-' prefix from domain)
            if author_name:
                api_email = self._get_email_from_bitbucket_api(author_name, sanitized)
                if api_email:
                    return api_email

            return sanitized

        except Exception as e:
            print(f"{Fore.YELLOW}⚠ git blame failed for {file_path}: {e}{Style.RESET_ALL}")
        return None


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 3 — Blame attribution engine
# ─────────────────────────────────────────────────────────────────────────────

class BlameAttributionEngine:
    """
    Connects parsed error records with git blame results and decides WHO
    should be notified:

        - If the error file was modified in the current PR  → PR author
        - If the error file was NOT touched in this PR      → line owner
        - Always: PR author gets a copy when line owner != PR author
    """

    def __init__(self):
        self.pr_author_email  = os.environ.get('BITBUCKET_PR_AUTHOR_EMAIL', '')
        self.pr_author_name   = os.environ.get('BUILD_TRIGGER_BY', 'PR Author')
        self.changed_files    = self._get_changed_files()
        self.blame_resolver   = GitBlameResolver()

    def _get_changed_files(self):
        branch_diff = os.environ.get('BRANCH_DIFF', '')
        if branch_diff:
            return set(branch_diff.strip().splitlines())

        source = os.environ.get('BITBUCKET_BRANCH', '')
        dest   = os.environ.get('BITBUCKET_PR_DESTINATION_BRANCH', 'master')
        if source and dest:
            try:
                result = subprocess.run(
                    f"git diff --name-only origin/{dest}...origin/{source}",
                    shell=True, capture_output=True, text=True
                )
                if result.returncode == 0:
                    return set(result.stdout.strip().splitlines())
            except Exception:
                pass
        return set()

    def attribute(self, records: List[Dict]) -> Dict:
        """
        Returns:
        {
            "pr_author_records"   : [AttributedRecord, ...],
            "line_owner_records"  : { owner_email: [AttributedRecord, ...] },
            "all_emails"          : set()
        }

        AttributedRecord = error record dict  +  extra keys:
            line_owner_email, line_owner_name, file_was_pr_changed
        """
        result = {
            "pr_author_records" : [],
            "line_owner_records": defaultdict(list),
            "all_emails"        : {self.pr_author_email} if self.pr_author_email else set(),
        }

        for record in records:
            file_path = record.get('file', '')
            line      = record.get('line')

            in_pr = file_path in self.changed_files if file_path else True

            # Attempt to resolve line owner
            line_owner_email = None
            if file_path:
                line_owner_email = self.blame_resolver.resolve(file_path, line)

            # Build attributed record
            ar = dict(record)
            ar['file_was_pr_changed'] = in_pr
            ar['line_owner_email']    = line_owner_email
            ar['line_owner_name']     = (
                line_owner_email.split('@')[0].replace('.', ' ').title()
                if line_owner_email and '@' in line_owner_email
                else line_owner_email or 'Unknown'
            )

            # Routing logic
            if in_pr or not line_owner_email:
                # PR author is responsible
                result['pr_author_records'].append(ar)
            elif line_owner_email == self.pr_author_email:
                # Same person — just goes to PR author
                result['pr_author_records'].append(ar)
            else:
                # Different person — notify line owner
                result['line_owner_records'][line_owner_email].append(ar)
                result['all_emails'].add(line_owner_email)
                # Also add a copy to PR author's list (awareness)
                pr_copy = dict(ar, _for_pr_author_awareness=True)
                result['pr_author_records'].append(pr_copy)

        result['all_emails'] = list(result['all_emails'])
        result['line_owner_records'] = dict(result['line_owner_records'])
        return result


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 4 — Message formatter
# ─────────────────────────────────────────────────────────────────────────────

class MessageFormatter:
    """Produces both terminal-pretty and HTML email versions of error messages."""

    # Error type → colour and icon for terminal output
    _TERMINAL_STYLES = {
        'SQL'        : (Fore.RED,    '🔴'),
        'CHANGESET'  : (Fore.YELLOW, '⚠️ '),
        'PRECONDITION': (Fore.YELLOW, '⚠️ '),
        'DUPLICATE'  : (Fore.MAGENTA,'🔁'),
        'UNKNOWN'    : (Fore.WHITE,  '❓'),
    }

    def format_terminal_record(self, record: Dict, pr_author: str, client: str, env: str) -> str:
        """Format a single attributed error record for terminal (pipeline log) output."""
        color, icon = self._TERMINAL_STYLES.get(
            record.get('type', 'UNKNOWN'), (Fore.WHITE, '❓')
        )
        width = 80

        lines = [
            f"\n{color}{'═' * width}{Style.RESET_ALL}",
            f"{color}{icon}  ERROR RECORD{Style.RESET_ALL}",
            f"{color}{'─' * width}{Style.RESET_ALL}",
        ]

        def row(label: str, value: str):
            lines.append(f"{Fore.CYAN}{label:<22}{Style.RESET_ALL}{value}")

        row("📄 File:",        record.get('file') or '(unknown)')
        row("📍 Line:",        str(record.get('line')) if record.get('line') else '(not identified)')
        row("🔖 Changeset:",   record.get('changeset') or '(unknown)')
        row("⚙️  Error Type:", record.get('type', 'UNKNOWN'))
        row("📝 Description:", record.get('description', ''))
        row("👤 Line Owner:",  record.get('line_owner_name', 'Unknown') +
                               (f"  <{record.get('line_owner_email', '')}>"
                                if record.get('line_owner_email') else ''))
        row("✍️  PR Author:",   pr_author)
        row("🏷  Client/Env:", f"{client.upper()} / {env.upper()}")

        lines.append(f"\n{Fore.GREEN}{'─' * width}{Style.RESET_ALL}")
        lines.append(f"{Fore.GREEN}💡 Suggested Action:{Style.RESET_ALL}")
        lines.append(f"   {record.get('suggestion', 'Contact db-architects@impactanalytics.co')}")
        lines.append(f"{color}{'═' * width}{Style.RESET_ALL}\n")

        return '\n'.join(lines)

    # ── HTML helpers ──────────────────────────────────────────────────────────

    def _html_card(self, record: Dict, idx: int, for_line_owner: bool,
                   pr_author: str, client: str, env: str) -> str:
        """Produce one HTML error card."""
        is_pr_awareness = record.get('_for_pr_author_awareness', False)
        bg    = '#fff3cd' if is_pr_awareness else '#ffebee'
        border= '#ffc107' if is_pr_awareness else '#d32f2f'

        file_path  = record.get('file') or '(unknown file)'
        line_num   = record.get('line')
        changeset  = record.get('changeset') or '—'
        desc       = record.get('description', '—')
        suggestion = record.get('suggestion', 'Contact db-architects@impactanalytics.co')
        owner_name = record.get('line_owner_name', 'Unknown')
        owner_email= record.get('line_owner_email', '')
        err_type   = record.get('type', 'UNKNOWN')

        awareness_banner = ""
        if is_pr_awareness:
            awareness_banner = (
                f"<div style='background:#e3f2fd;padding:8px 12px;border-left:4px solid #1976d2;"
                f"margin-bottom:10px;border-radius:4px;font-size:12px;'>"
                f"ℹ️ <b>Awareness notice:</b> This error is in a file not modified by your PR. "
                f"The original author <b>{owner_name}</b> has been separately notified.</div>"
            )

        responsibility_row = ""
        if for_line_owner:
            responsibility_row = f"""
            <tr>
              <td style="padding:6px 12px;background:#f9f9f9;color:#555;font-size:12px;width:160px;"><b>✍️ Current PR by</b></td>
              <td style="padding:6px 12px;">{pr_author}</td>
            </tr>"""
        else:
            responsibility_row = f"""
            <tr>
              <td style="padding:6px 12px;background:#f9f9f9;color:#555;font-size:12px;width:160px;"><b>👤 Line Owner</b></td>
              <td style="padding:6px 12px;">{owner_name}{f' &lt;{owner_email}&gt;' if owner_email else ''}</td>
            </tr>"""

        return f"""
        <div style="margin:16px 0;padding:16px;background:{bg};border-left:5px solid {border};
                    border-radius:6px;font-family:monospace;font-size:13px;">
          {awareness_banner}
          <h3 style="margin:0 0 12px 0;color:#b71c1c;font-size:15px;font-family:sans-serif;">
              #{idx} — {err_type} ERROR
          </h3>
          <table style="width:100%;border-collapse:collapse;font-family:sans-serif;font-size:13px;">
            <tr>
              <td style="padding:6px 12px;background:#f9f9f9;color:#555;font-size:12px;width:160px;"><b>📄 File</b></td>
              <td style="padding:6px 12px;font-family:monospace;">{file_path}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px;background:#f9f9f9;color:#555;font-size:12px;"><b>📍 Line</b></td>
              <td style="padding:6px 12px;">{line_num if line_num else '<i>Not identified — see full log</i>'}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px;background:#f9f9f9;color:#555;font-size:12px;"><b>🔖 Changeset</b></td>
              <td style="padding:6px 12px;font-family:monospace;">{changeset}</td>
            </tr>
            <tr>
              <td style="padding:6px 12px;background:#f9f9f9;color:#555;font-size:12px;"><b>❌ Error</b></td>
              <td style="padding:6px 12px;color:#c62828;">{desc}</td>
            </tr>
            {responsibility_row}
          </table>
          <div style="margin-top:14px;padding:12px;background:#e8f5e9;border-left:4px solid #388e3c;border-radius:4px;">
            <b style="color:#1b5e20;font-family:sans-serif;">💡 Suggested Action:</b><br/>
            <span style="font-family:sans-serif;">{suggestion}</span>
          </div>
        </div>
        """

    def build_pr_author_email(self, attributed: Dict, client: str, env: str,
                               pipeline_url: str, pr_url: str) -> Tuple[str, str]:
        """Returns (subject, html_body) for the PR author."""
        pr_author  = attributed.get('pr_author_name', os.environ.get('BUILD_TRIGGER_BY', 'Developer'))
        records    = attributed.get('pr_author_records', [])
        own_errors = [r for r in records if not r.get('_for_pr_author_awareness')]
        awareness  = [r for r in records if r.get('_for_pr_author_awareness')]

        cards_html = ""
        for idx, rec in enumerate(own_errors, 1):
            cards_html += self._html_card(rec, idx, False, pr_author, client, env)
        for idx, rec in enumerate(awareness, len(own_errors) + 1):
            cards_html += self._html_card(rec, idx, False, pr_author, client, env)

        awareness_note = ""
        if awareness:
            awareness_note = f"""
            <div style="background:#e3f2fd;padding:15px;border-left:4px solid #1976d2;
                        border-radius:4px;margin:20px 0;font-family:sans-serif;">
              <b>📧 Also notified:</b>
              {len(set(r.get('line_owner_email','') for r in awareness))} original author(s) have
              been contacted about errors in files they authored that are breaking your PR.
            </div>"""

        subject = (
            f"[PR Validation] Your PR Has {len(own_errors)} Error(s) — "
            f"{client.upper()} {env.upper()}"
        )
        html = f"""
        <div style="font-family:sans-serif;max-width:900px;margin:auto;">
          <h2 style="color:#d32f2f;">🚨 PR Validation Failed — Action Required</h2>
          <p>Hi <b>{pr_author}</b>,</p>
          <p>Your PR triggered the DB validation pipeline, which detected
             <b style="color:#d32f2f;">{len(own_errors)} error(s)</b> that must be resolved
             before merging.</p>
          <table style="width:100%;font-family:sans-serif;font-size:13px;
                        background:#f5f5f5;padding:12px;border-radius:6px;margin-bottom:20px;">
            <tr><td><b>🏷 Client / Env</b></td><td>{client.upper()} / {env.upper()}</td></tr>
            <tr><td><b>🔗 Pipeline</b></td><td><a href="{pipeline_url}">View build</a></td></tr>
            <tr><td><b>🔗 PR</b></td><td><a href="{pr_url}">Open PR</a></td></tr>
          </table>
          <h3 style="color:#c62828;">Errors to Fix</h3>
          {cards_html}
          {awareness_note}
          <p style="color:#555;font-size:12px;">
            Need help? Contact
            <a href="mailto:db-architects@impactanalytics.co">db-architects@impactanalytics.co</a><br/>
            <i>**This is an auto-generated email. Do not reply.**</i>
          </p>
        </div>"""

        return subject, html

    def build_line_owner_email(self, owner_email: str, records: List[Dict],
                                pr_author: str, client: str, env: str,
                                pipeline_url: str, pr_url: str) -> Tuple[str, str]:
        """Returns (subject, html_body) for a line owner."""
        owner_name = (
            owner_email.split('@')[0].replace('.', ' ').title()
            if '@' in owner_email else owner_email
        )

        cards_html = ""
        for idx, rec in enumerate(records, 1):
            cards_html += self._html_card(rec, idx, True, pr_author, client, env)

        unique_files = list({r.get('file', '') for r in records if r.get('file')})
        files_list   = ''.join(
            f"<li style='font-family:monospace;font-size:12px;'>{f}</li>"
            for f in unique_files
        )

        subject = (
            f"[Action Required] {len(records)} Error(s) in Your Lines — "
            f"{client.upper()} {env.upper()}"
        )
        html = f"""
        <div style="font-family:sans-serif;max-width:900px;margin:auto;">
          <h2 style="color:#e65100;">⚠️ Errors Detected in Lines You Authored</h2>
          <p>Hi <b>{owner_name}</b>,</p>
          <p>A PR by <b>{pr_author}</b> has triggered a validation pipeline that detected
             <b style="color:#d32f2f;">{len(records)} error(s)</b> in lines you last modified.
             Your files were <b>not</b> changed in the current PR, but they need to be fixed
             (or the errors need to be added to <code>exceptions.json</code> if they are
             false positives).</p>
          <table style="width:100%;font-family:sans-serif;font-size:13px;
                        background:#f5f5f5;padding:12px;border-radius:6px;margin-bottom:20px;">
            <tr><td><b>🏷 Client / Env</b></td><td>{client.upper()} / {env.upper()}</td></tr>
            <tr><td><b>✍️ PR Raised by</b></td><td>{pr_author}</td></tr>
            <tr><td><b>🔗 Pipeline</b></td><td><a href="{pipeline_url}">View build</a></td></tr>
            <tr><td><b>🔗 PR</b></td><td><a href="{pr_url}">Open PR</a></td></tr>
          </table>
          <h3>📂 Your Affected Files</h3>
          <ul style="background:#f5f5f5;padding:15px 25px;border-radius:4px;">{files_list}</ul>
          <h3 style="color:#c62828;">Detailed Errors</h3>
          {cards_html}
          <div style="background:#fff3cd;padding:20px;border-left:4px solid #ffc107;
                      border-radius:4px;margin:20px 0;">
            <b style="font-size:15px;font-family:sans-serif;">🔧 Next Steps</b><br/><br/>
            <ol style="font-family:sans-serif;font-size:13px;line-height:1.8;">
              <li>Review each error above — the file, line, and suggested fix are listed.</li>
              <li>Fix the issue in the affected file and raise a separate PR.</li>
              <li>Or, if this is a false positive, add an entry to <code>exceptions.json</code>.</li>
              <li>Reach out to <b>{pr_author}</b> for context about what their PR changes.</li>
              <li>Contact <a href="mailto:db-architects@impactanalytics.co">db-architects@impactanalytics.co</a>
                  if you need assistance.</li>
            </ol>
          </div>
          <p style="color:#555;font-size:12px;"><i>**This is an auto-generated email. Do not reply.**</i></p>
        </div>"""

        return subject, html


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 5 — Email dispatcher
# ─────────────────────────────────────────────────────────────────────────────

class EmailDispatcher:
    """Sends emails via Mailgun (same setup used by compile.py / notify.py)."""

    def __init__(self):
        self.url  = os.environ.get('MAILGUN_URL', '')
        self.key  = os.environ.get('MAILGUN_KEY', '')
        self.from_ = 'DB Pipeline <info@impactanalytics.co>'

    def send(self, to: str, subject: str, html: str,
             attachments: List[Tuple] = None) -> bool:
        if not self.url or not self.key:
            print(f"{Fore.YELLOW}⚠ MAILGUN_URL/KEY not set. Skipping email to {to}.{Style.RESET_ALL}")
            return False

        data = {
            "from"   : self.from_,
            "to"     : to,
            "subject": subject,
            "html"   : html,
        }
        files = []
        if attachments:
            for att in attachments:
                files.append(att)

        try:
            response = requests.post(
                self.url,
                auth=("api", self.key),
                data=data,
                files=files or None,
            )
            ok = response.status_code in (200, 202)
            status = f"{Fore.GREEN}✓{Style.RESET_ALL}" if ok else f"{Fore.RED}✗{Style.RESET_ALL}"
            print(f"  {status} Email → {to}  (HTTP {response.status_code})")
            return ok
        except Exception as e:
            print(f"{Fore.RED}✗ Failed to send email to {to}: {e}{Style.RESET_ALL}")
            return False


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 6 — Orchestrator
# ─────────────────────────────────────────────────────────────────────────────

class PRBlameNotifier:
    """
    Top-level orchestrator — ties all pieces together.
    Reads error output, attributes blame, prints structured terminal output,
    and dispatches personalized emails.
    """

    def __init__(self):
        self.parser     = LiquibaseErrorParser()
        self.attribution= BlameAttributionEngine()
        self.formatter  = MessageFormatter()
        self.dispatcher = EmailDispatcher()

    def run(self, error_text: str, client: str, env: str,
            mode: str = 'validate', log_file: str = '') -> int:
        """
        Execute full pipeline.  Returns number of errors found.
        """
        pr_author   = os.environ.get('BUILD_TRIGGER_BY', 'Unknown')
        pr_id       = os.environ.get('BITBUCKET_PR_ID', '')
        build_num   = os.environ.get('BITBUCKET_BUILD_NUMBER', '')
        repo_url    = os.environ.get('BITBUCKET_GIT_HTTP_ORIGIN', '')
        pr_author_email = os.environ.get('BITBUCKET_PR_AUTHOR_EMAIL', '')

        pipeline_url = f"{repo_url}/pipelines/results/{build_num}" if repo_url else '#'
        pr_url       = f"{repo_url}/pull-requests/{pr_id}"          if repo_url else '#'

        print(f"\n{Fore.CYAN}{'═'*80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  🔍  PR Blame Notifier — {mode.upper()} mode  |  {client.upper()} / {env.upper()}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'═'*80}{Style.RESET_ALL}\n")

        # ── Step 1: Parse ────────────────────────────────────────────────────
        records = self.parser.parse(error_text)
        print(f"{Fore.YELLOW}Parsed {len(records)} distinct error record(s).{Style.RESET_ALL}")

        if not records:
            print(f"{Fore.GREEN}No structured errors found in output. Exiting.{Style.RESET_ALL}")
            return 0

        # ── Step 2: Attribute blame ──────────────────────────────────────────
        attributed = self.attribution.attribute(records)
        attributed['pr_author_name'] = pr_author

        # ── Step 3: Terminal output (visible in pipeline log) ────────────────
        print(f"\n{Fore.RED}{'─'*80}{Style.RESET_ALL}")
        print(f"{Fore.RED}  STRUCTURED ERROR REPORT{Style.RESET_ALL}")
        print(f"{Fore.RED}{'─'*80}{Style.RESET_ALL}\n")

        all_records = (
            attributed['pr_author_records']
            + [r for recs in attributed['line_owner_records'].values() for r in recs]
        )
        # Deduplicate for terminal print
        seen_ids = set()
        for rec in all_records:
            key = (rec.get('file'), rec.get('line'), rec.get('description'))
            if key in seen_ids:
                continue
            seen_ids.add(key)
            print(self.formatter.format_terminal_record(rec, pr_author, client, env))

        # ── Step 4: Send emails ──────────────────────────────────────────────
        print(f"\n{Fore.CYAN}{'─'*80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}  📧  Dispatching personalized notifications...{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'─'*80}{Style.RESET_ALL}\n")

        attachments = []
        if log_file and os.path.isfile(log_file):
            attachments = [("attachment", ("pipeline.log", open(log_file, "rb").read()))]

        sent_count = 0

        # Email to PR author
        if pr_author_email and attributed['pr_author_records']:
            subj, html = self.formatter.build_pr_author_email(
                attributed, client, env, pipeline_url, pr_url
            )
            if self.dispatcher.send(pr_author_email, subj, html, attachments):
                sent_count += 1

        # Emails to individual line owners
        for owner_email, owner_records in attributed['line_owner_records'].items():
            subj, html = self.formatter.build_line_owner_email(
                owner_email, owner_records, pr_author, client, env,
                pipeline_url, pr_url
            )
            if self.dispatcher.send(owner_email, subj, html):
                sent_count += 1

        print(f"\n{Fore.GREEN}✓ {sent_count} email(s) dispatched.{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'═'*80}{Style.RESET_ALL}\n")

        return len(records)


# ─────────────────────────────────────────────────────────────────────────────
# SECTION 7 — CLI entry point
# ─────────────────────────────────────────────────────────────────────────────

def main():
    ap = argparse.ArgumentParser(description='PR Blame Notifier')
    ap.add_argument('--error-file', required=True,
                    help='Path to file containing raw Liquibase error output')
    ap.add_argument('--client',     required=True,  help='Client name (e.g. acme)')
    ap.add_argument('--env',        required=True,  help='Environment (e.g. prod, staging)')
    ap.add_argument('--mode',       default='validate',
                    choices=['validate', 'deploy'],
                    help='Pipeline mode: validate (PR check) or deploy')
    ap.add_argument('--log-file',   default='',
                    help='Optional path to full pipeline log for email attachment')
    ap.add_argument('--context',    default='',
                    help='Additional context string appended to terminal output')
    args = ap.parse_args()

    if not os.path.isfile(args.error_file):
        print(f"{Fore.RED}Error: --error-file '{args.error_file}' not found.{Style.RESET_ALL}",
              file=sys.stderr)
        sys.exit(1)

    with open(args.error_file, 'r', errors='replace') as fh:
        error_text = fh.read()

    if args.context:
        print(f"{Fore.CYAN}Context: {args.context}{Style.RESET_ALL}")

    notifier  = PRBlameNotifier()
    err_count = notifier.run(error_text, args.client, args.env, args.mode, args.log_file)
    sys.exit(1 if err_count > 0 else 0)


if __name__ == '__main__':
    main()
