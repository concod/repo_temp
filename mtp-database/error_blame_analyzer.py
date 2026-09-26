#!/usr/bin/env python3.8
"""
Error Blame Analyzer
Identifies authors of code that caused errors in files not changed in current PR
"""

import os
import subprocess
import re
from collections import defaultdict
from typing import Dict, List, Set, Tuple, Optional


# ── Email-validity guard ───────────────────────────────────────────────────────
# Git blame can return placeholder or service-account emails in CI environments.
# Known patterns we must *not* treat as real developer emails:
#
#   not.committed.yet          – git placeholder for staged-but-uncommitted lines
#   activated-<id>@bitbucket.org – Bitbucket pipeline service accounts
#   pipeline-*                 – generic CI bot patterns
#   noreply@*                  – GitHub / Bitbucket merge-commit bots
#   <none>  /  <unknown>       – unresolvable authors
#
# ── Block comment removal (must match services.py so validator line numbers align) ──


_PLACEHOLDER_PATTERNS = re.compile(
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
    """
    Return True only when the email looks like a real developer address.
    Rejects empty strings, git placeholders, and Bitbucket service accounts.
    """
    if not email or '@' not in email:
        return False
    if _PLACEHOLDER_PATTERNS.search(email):
        return False
    return True

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
# ──────────────────────────────────────────────────────────────────────────────


class ErrorBlameAnalyzer:
    def __init__(self):
        self.changed_files = self._get_changed_files()
        self.pr_author = os.environ.get('BUILD_TRIGGER_BY', 'Unknown')
        self.pr_author_email = os.environ.get('BITBUCKET_PR_AUTHOR_EMAIL', '')

        # Bitbucket API credentials (set as pipeline variables)
        self._workspace = os.environ.get('BITBUCKET_WORKSPACE', '')
        self._bb_token  = os.environ.get('BITBUCKET_TOKEN', '')
        self._api_user  = os.environ.get('BITBUCKET_API_USER', 'tarunreddy.challa@impactanalytics.co').strip()  # email for API token
        self._api_cache: Dict[Tuple[str, str], Optional[str]] = {}   # display_name → real email
        
    def _get_changed_files(self) -> Set[str]:
        """Get list of files changed in current PR"""
        try:
            # Get files changed in current PR
            branch_diff = os.environ.get('BRANCH_DIFF', '')
            if branch_diff:
                return set(branch_diff.strip().split('\n'))
            
            # Fallback: use git diff
            source_branch = os.environ.get('BITBUCKET_BRANCH', '')
            dest_branch = os.environ.get('BITBUCKET_PR_DESTINATION_BRANCH', 'master')
            
            if source_branch and dest_branch:
                cmd = f"git diff --name-only origin/{dest_branch}...origin/{source_branch}"
                result = subprocess.run(
                    cmd, 
                    shell=True, 
                    capture_output=True, 
                    text=True,
                    cwd=os.getcwd()
                )
                if result.returncode == 0:
                    return set(result.stdout.strip().split('\n'))
        except Exception as e:
            print(f"Warning: Could not get changed files: {e}")
        
        return set()
    
    def _extract_file_path(self, error_string: str) -> str:
        """Extract file path from error string"""
        # Error format: "database/.../file.sql - block_start..." 
        # or sometimes just "filename - block_start..."
        
        # Pattern 1: Full path with .sql extension before " - block_start"
        match = re.match(r'^([^\s]+\.sql)\s*-\s*block_start', error_string)
        if match:
            file_path = match.group(1)
            print(f"  → Extracted file path: {file_path}")
            return file_path
        
        # Pattern 2: Any path-like string before " - block_start"
        match = re.match(r'^([^\s]+)\s*-\s*block_start', error_string)
        if match:
            potential_path = match.group(1)
            # If it contains slashes, it's likely a path
            if '/' in potential_path:
                print(f"  → Extracted file path: {potential_path}")
                return potential_path
            # Otherwise, log warning
            print(f"  ⚠️  Warning: Could not extract full path from: {error_string[:100]}")
        
        print(f"  ⚠️  Warning: Could not extract file path from error string")
        return ""
    
    def _get_vulnerability_lines(
        self, file_path: str, error_string: str
    ) -> Tuple[List[int], bool, Dict[int, str]]:
        """
        Extract line numbers (and optional line content) from error string.
        Returns: (line_numbers, from_validator, line_contents).
        line_contents[line_num] = content when error has (lines: N, content: "...")
        """
        lines = []
        line_contents: Dict[int, str] = {}

        # Optional: parse (lines: N, content: "...") or (lines: N, content: '...')
        for m in re.finditer(
            r'\(lines:\s*(\d+)(?:\s*,\s*content:\s*["\']([^"\']*)["\'])?\)',
            error_string,
        ):
            line_num = int(m.group(1))
            lines.append(line_num)
            if m.lastindex >= 2 and m.group(2):
                line_contents[line_num] = m.group(2).strip()

        # Also catch (lines: 5, 18) style (no content)
        if not lines:
            for match in re.finditer(r'\(lines:\s*([\d,\s]+)\)', error_string):
                line_str = match.group(1)
                extracted = [int(l.strip()) for l in line_str.split(',') if l.strip().isdigit()]
                for line_num in extracted:
                    lines.append(line_num)

        if lines:
            lines = sorted(list(set(lines)))
            return (lines, True, line_contents)

        # Fallback: old logic for files without line numbers
        vuln_match = re.search(r'vulnerabilities?\s*\(([^)]+)\)', error_string, re.IGNORECASE)
        if not vuln_match:
            vuln_match = re.search(
                r'missing\s+(?:dependency|dependencies)\s*\(([^)]+)\)',
                error_string,
                re.IGNORECASE,
            )
        if not vuln_match:
            return ([], False, {})

        vulnerabilities = [v.strip() for v in vuln_match.group(1).split(',')]
        try:
            with open(file_path, 'r') as f:
                content = f.readlines()
            for line_num, line in enumerate(content, 1):
                line_upper = line.upper()
                for vuln in vulnerabilities:
                    vuln_upper = vuln.upper().split('(')[0].strip()
                    if vuln_upper in [
                        'CASCADE', 'DROP TABLE', 'DROP TRIGGER', 'DROP CONSTRAINT',
                        'DROP COLUMN', 'TRUNCATE', 'GRANT', 'REVOKE',
                        'DROP PROCEDURE', 'DROP FUNCTION',
                    ]:
                        if vuln_upper in line_upper:
                            lines.append(line_num)
                    elif vuln_upper in ['LB ENABLE', 'LB CHANGESET', 'LB RUN_ON_CHANGE']:
                        if '--changeset' in line.lower():
                            lines.append(line_num)
        except Exception as e:
            print(f"Warning: Could not read file {file_path}: {e}")
        return (sorted(list(set(lines))) if lines else [], False, {})
    # @staticmethod
    # def _map_validator_line_to_raw_line(sql_content: str, validator_line: int) -> int:
    #     """
    #     Map validator line N to raw file line.
    #     Validator reports line numbers after removing full-line -- comments; N = Nth non-- line.
    #     Empty lines (length 0 or whitespace-only) are not counted.
    #     """
    #     raw_lines = sql_content.split('\n')
    #     n = 0
    #     for raw_line_num, line in enumerate(raw_lines, 1):
    #         if re.match(r'^\s*--', line):
    #             continue
    #         if len(line.strip()) == 0:   # skip empty / whitespace-only lines
    #             continue
    #         n += 1
    #         if n == validator_line:
    #             return raw_line_num
    #     return validator_line
    #     clean_lines = clean_content.split('\n')
    #     non_comment_indices = [
    #         i for i, line in enumerate(clean_lines)
    #         if not re.match(r'^\s*--', line) and line.strip()
    #     ]
    #     if validator_line > len(non_comment_indices):
    #         return validator_line
    #     idx = non_comment_indices[validator_line - 1]
    #     offset = sum(len(clean_lines[j]) + 1 for j in range(idx))
    #     if offset >= len(output_to_input):
    #         offset = len(output_to_input) - 1
    #     input_pos = output_to_input[offset]
    #     raw_line_for_pos = []
    #     line_num = 1
    #     for i, c in enumerate(sql_content):
    #         raw_line_for_pos.append(line_num)
    #         if c == '\n':
    #             line_num += 1
    #     if input_pos >= len(raw_line_for_pos):
    #         input_pos = len(raw_line_for_pos) - 1
    #     return raw_line_for_pos[input_pos]
    @staticmethod
    def _raw_line_for_content(sql_content: str, line_content: str) -> Optional[int]:
        """
        Find 1-based raw line number where the line contains the given content.
        Uses strip() for comparison so whitespace differences don't break matching.
        Returns None if not found.
        """
        if not line_content or not sql_content:
            return None
        needle = line_content.strip()
        if not needle:
            return None
        raw_lines = sql_content.split('\n')
        for raw_line_num, line in enumerate(raw_lines, 1):
            line_stripped = line.strip()
            if needle in line_stripped or line_stripped == needle:
                return raw_line_num
        return None

    @staticmethod
    def _map_validator_line_to_raw_line(
        sql_content: str,
        validator_line: int,
        line_content: Optional[str] = None,
    ) -> int:
        """
        Map to raw file line. Prefer content match when line_content is given;
        otherwise use Nth non-comment, non-empty line (validator convention).
        """
        if line_content:
            raw = ErrorBlameAnalyzer._raw_line_for_content(sql_content, line_content)
            if raw is not None:
                return raw
        # Fallback: Nth non--, non-empty line
        raw_lines = sql_content.split('\n')
        n = 0
        for raw_line_num, line in enumerate(raw_lines, 1):
            if re.match(r'^\s*--', line):
                continue
            n += 1
            if n == validator_line:
                return raw_line_num
        return validator_line
    
    def _get_email_from_bitbucket_api(self, display_name: str,
                                       fallback_email: str) -> Optional[str]:
        """
        Look up the real verified email from the Bitbucket REST API.

        Resolution order:
          1. primary + confirmed email from Bitbucket account
          2. any confirmed email
          3. first email in the list
          4. None → caller uses sanitized blame email as fallback

        Results are cached so each author triggers at most one API round-trip.
        """
        cache_key = (display_name, (fallback_email or '').lower())
        if cache_key in self._api_cache:
            return self._api_cache[cache_key]

        if not self._workspace or not self._bb_token:
            self._api_cache[cache_key] = None
            return None

        try:
            import requests as _requests
            auth = (self._api_user, self._bb_token) if self._api_user else ('x-token-auth', self._bb_token)
            headers = {'Accept': 'application/json'}

            # Step 1: display_name → account_id via workspace members search
            resp = _requests.get(
                f"https://api.bitbucket.org/2.0/workspaces/{self._workspace}/members",
                auth=auth,
                headers=headers,
                params={'q': f'display_name="{display_name}"'},
                timeout=10,
            )
            if resp.status_code != 200:
                print(f"Warning: Bitbucket API member search HTTP {resp.status_code} "
                      f"for '{display_name}'")
                self._api_cache[cache_key] = None
                return None

            members = resp.json().get('values', [])
            if not members:
                print(f"Warning: No Bitbucket member matched display_name='{display_name}'. "
                      f"Falling back to blame email.")
                self._api_cache[cache_key] = None
                return None

            # Verify API result matches blame email — avoid wrong attribution when API
            # returns multiple/fuzzy matches (e.g. similar display names)
            fallback_lower = fallback_email.lower() if fallback_email else ''
            for member in members:
                account_id = member.get('account_id') or member.get('uuid', '').strip('{}')
                if not account_id:
                    continue
                email_resp = _requests.get(
                    f"https://api.bitbucket.org/2.0/users/{account_id}/emails",
                    auth=auth,
                    headers=headers,
                    timeout=10,
                )
                if email_resp.status_code != 200:
                    continue
                emails = email_resp.json().get('values', [])
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
                if real_email and fallback_lower:
                    # Only use API email if it matches blame (same person)
                    if real_email.lower() == fallback_lower:
                        print(f"  → Bitbucket API resolved '{display_name}' → {real_email}")
                        self._api_cache[cache_key] = real_email
                        return real_email
                    api_local = real_email.split('@')[0].lower() if '@' in real_email else ''
                    fallback_local = fallback_lower.split('@')[0] if '@' in fallback_lower else ''
                    if api_local == fallback_local:
                        print(f"  → Bitbucket API resolved '{display_name}' → {real_email}")
                        self._api_cache[cache_key] = real_email
                        return real_email
        except Exception as ex:            # <-- ADD THIS
            print(f"Warning: Bitbucket API error for '{display_name}': {ex}")
            # No member's email matched blame — use blame email to avoid wrong attribution
            self._api_cache[cache_key] = None
            return None

    def _is_merge_commit(self, commit_hash: str) -> bool:
        """
        Check if a commit is a merge commit (has 2+ parents).
        Returns True if merge commit, False otherwise.
        """
        try:
            cmd = f"git log -1 --format='%P' {commit_hash}"
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                cwd=os.getcwd()
            )
            if result.returncode == 0:
                parents = result.stdout.strip().split()
                is_merge = len(parents) >= 2
                if is_merge:
                    print(f"  → Detected merge commit: {commit_hash[:8]} (has {len(parents)} parents)")
                return is_merge
        except Exception as e:
            print(f"  ⚠️  Warning: Could not check if commit is merge: {e}")
        return False

    def _get_first_parent(self, commit_hash: str) -> Optional[str]:
        """
        Get the first parent of a merge commit.
        Returns the first parent hash, or None if error.
        """
        try:
            cmd = f"git log -1 --format='%P' {commit_hash}"
            result = subprocess.run(
                cmd,
                shell=True,
                capture_output=True,
                text=True,
                cwd=os.getcwd()
            )
            if result.returncode == 0:
                parents = result.stdout.strip().split()
                if len(parents) >= 1:
                    first_parent = parents[0]
                    print(f"  → First parent of merge commit: {first_parent[:8]}")
                    return first_parent
        except Exception as e:
            print(f"  ⚠️  Warning: Could not get first parent: {e}")
        return None

    def _get_author_for_lines(self, file_path: str, line_numbers: List[int], from_validator: bool = True , line_contents: Optional[Dict[int, str]] = None,) -> Dict[str, List[int]]:
        """
        Use git blame to find authors of specific lines.
        Resolution order per line: Bitbucket API → sanitized blame email.
        Handles merge commits by re-blaming on first parent.
        Returns dict: {author_email: [line_numbers]}
        """
        author_lines = defaultdict(list)

        try:
            for line_num in line_numbers:
                line_to_blame = line_num  # use line number from error directly (already raw file line)
                print(f"  → Running git blame for line {line_to_blame} in {file_path}")
                cmd = f"git blame -L {line_to_blame},{line_to_blame} --porcelain {file_path}"
                result = subprocess.run(
                    cmd,
                    shell=True,
                    capture_output=True,
                    text=True,
                    cwd=os.getcwd()
                )
                # print(f"  → Git blame raw output:\n{result.stdout}")

                if result.returncode == 0:
                    # Extract commit hash from first line (first 40 characters)
                    commit_hash = None
                    for raw_line in result.stdout.split('\n'):
                        if raw_line and len(raw_line) >= 40 and raw_line[0].isdigit():
                            commit_hash = raw_line[:40]
                            print(f"  → Extracted commit hash: {commit_hash[:8]}")
                            break

                    # Check if this is a merge commit and re-blame on first parent if needed
                    if commit_hash and self._is_merge_commit(commit_hash):
                        print(f"  → Merge commit detected, re-blaming on first parent...")
                        first_parent = self._get_first_parent(commit_hash)
                        if first_parent:
                            cmd = f"git blame -L {line_to_blame},{line_to_blame} --porcelain {first_parent} -- {file_path}"
                            result = subprocess.run(
                                cmd,
                                shell=True,
                                capture_output=True,
                                text=True,
                                cwd=os.getcwd()
                            )
                            if result.returncode == 0:
                                print(f"  → Re-blame on first parent successful:\n{result.stdout}")
                            else:
                                print(f"  ⚠️  Re-blame on first parent failed, using original blame result")
                        else:
                            print(f"  ⚠️  Could not get first parent, using original blame result")

                    author_name  = None
                    author_email = None

                    # Parse both author display name and email from porcelain output
                    for raw_line in result.stdout.split('\n'):
                        if raw_line.startswith('author ') and not raw_line.startswith('author-'):
                            author_name = raw_line[len('author '):].strip()
                        elif raw_line.startswith('author-mail '):
                            author_email = raw_line.split('author-mail ')[1].strip('<>')
                            break

                    print(f"  → Parsed author: {author_name} ({author_email})")

                    if not author_email or not _is_real_author_email(author_email):
                        # CI bot or git placeholder — skip
                        print(f"  ⚠️  Skipping invalid author email: {author_email}")
                        continue

                    sanitized = _sanitize_email(author_email)

                    # Try Bitbucket API first for the ground-truth email,
                    # fall back to the sanitized blame email
                    real_email = (
                        self._get_email_from_bitbucket_api(author_name, sanitized)
                        if author_name else None
                    ) or sanitized

                    print(f"  → Final resolved email: {real_email}")
                    author_lines[real_email].append(line_num)

        except Exception as e:
            print(f"Warning: Could not run git blame on {file_path}: {e}")

        return dict(author_lines)
    
    def _get_author_for_file(self, file_path: str) -> Optional[str]:
        """
        Get the author of a file using git blame (majority author or file owner).
        Returns the email of the author who wrote most of the file.
        """
        try:
            # Use git blame to get majority author
            result = subprocess.run(
                f"git blame --porcelain -- {file_path}",
                shell=True,
                capture_output=True,
                text=True,
                cwd=os.getcwd()
            )
            
            if result.returncode != 0:
                print(f"  ⚠️  git blame failed for {file_path}")
                return None
            
            # Count author emails
            author_counts = defaultdict(int)
            author_name_map = {}
            
            current_author_name = None
            for line in result.stdout.splitlines():
                if line.startswith('author ') and not line.startswith('author-'):
                    current_author_name = line[len('author '):].strip()
                elif line.startswith('author-mail '):
                    author_email = line.split('author-mail ')[1].strip('<>')
                    if current_author_name and _is_real_author_email(author_email):
                        cleaned_email = _sanitize_email(author_email)
                        author_counts[cleaned_email] += 1
                        author_name_map.setdefault(cleaned_email, current_author_name)
            
            if not author_counts:
                return None
            
            # Get the most frequent author
            majority_email = max(author_counts, key=author_counts.get)
            majority_name = author_name_map.get(majority_email, '')
            
            # Try Bitbucket API first
            if majority_name:
                api_email = self._get_email_from_bitbucket_api(majority_name, majority_email)
                if api_email:
                    return api_email
            
            return majority_email
            
        except Exception as e:
            print(f"  ⚠️  Error getting file author for {file_path}: {e}")
            return None


    def analyze_errors(self, error_list: List[str]) -> Dict[str, any]:
        """
        Analyze compilation errors and categorize by responsibility
        
        Returns:
        {
            'pr_author_errors': [error_strings],  # Errors in files changed by PR author
            'other_author_errors': {               # Errors in unchanged files
                'author_email': {
                    'errors': [error_strings],
                    'files': [file_paths]
                }
            },
            'all_responsible_emails': [emails]    # All emails to notify
        }
        """
        result = {
            'pr_author_errors': [],
            'other_author_errors': defaultdict(lambda: {'errors': [], 'files': set()}),
            # Only seed with PR author email when it looks like a real address
            'all_responsible_emails': (
                {self.pr_author_email}
                if _is_real_author_email(self.pr_author_email)
                else set()
            )
        }
        
        for error_string in error_list:
            file_path = self._extract_file_path(error_string)
            
            if not file_path:
                # Can't determine file, attribute to PR author
                result['pr_author_errors'].append(error_string)
                continue
            
            # Check if file was changed in this PR
            if file_path in self.changed_files:
                # PR author is responsible
                result['pr_author_errors'].append(error_string)
            else:
                # File not changed in this PR - find original author
                print(f"Analyzing unchanged file with error: {file_path}")
                
                # Try to get specific lines with vulnerabilities
                vuln_lines, from_validator, line_contents = self._get_vulnerability_lines(file_path, error_string)
                
                if vuln_lines:
                    # Get authors for these specific lines
                    authors = self._get_author_for_lines(file_path, vuln_lines, from_validator, line_contents=line_contents)
                    
                    if authors:
                        for author_email, lines in authors.items():
                            # Check if author is the PR author
                            if author_email == self.pr_author_email:
                                result['pr_author_errors'].append(error_string)
                            else:
                                result['other_author_errors'][author_email]['errors'].append(
                                    f"{error_string} (lines: {', '.join(map(str, lines))})"
                                )
                                result['other_author_errors'][author_email]['files'].add(file_path)
                                result['all_responsible_emails'].add(author_email)
                    else:
                        # Couldn't find author for specific lines - try file-level blame
                        print(f"  → Could not identify author for lines {vuln_lines}, trying file-level blame")
                        file_author = self._get_author_for_file(file_path)
                        if file_author and file_author != self.pr_author_email:
                            result['other_author_errors'][file_author]['errors'].append(error_string)
                            result['other_author_errors'][file_author]['files'].add(file_path)
                            result['all_responsible_emails'].add(file_author)
                        else:
                            result['pr_author_errors'].append(error_string)
                else:
                    # No specific lines - try file-level blame to find original author
                    print(f"  → File-level error (no specific lines), trying to find file author")
                    file_author = self._get_author_for_file(file_path)
                    
                    if file_author and file_author != self.pr_author_email:
                        # Found original author - notify them
                        result['other_author_errors'][file_author]['errors'].append(error_string)
                        result['other_author_errors'][file_author]['files'].add(file_path)
                        result['all_responsible_emails'].add(file_author)
                        print(f"  → Found file author: {file_author}")
                    else:
                        # Couldn't find author or it's the PR author - assign to PR author
                        print(f"  → Could not identify file author, assigning to PR author for triage")
                        result['pr_author_errors'].append(error_string)
        
        # Convert sets to lists for JSON serialization
        for author_email in result['other_author_errors']:
            result['other_author_errors'][author_email]['files'] = list(
                result['other_author_errors'][author_email]['files']
            )
        
        result['all_responsible_emails'] = list(result['all_responsible_emails'])
        result['other_author_errors'] = dict(result['other_author_errors'])
        
        return result
    
    def format_responsibility_message(self, analysis: Dict) -> str:
        """Format a human-readable message about error responsibility"""
        pr_author = self.pr_author or 'PR Author'
        
        message = ""
        
        if analysis['pr_author_errors']:
            message += f"\n🔴 **Errors in files changed by {pr_author}:**\n"
            message += f"   {len(analysis['pr_author_errors'])} error(s)\n"
        
        if analysis['other_author_errors']:
            message += f"\n⚠️  **Errors in files NOT changed by {pr_author}:**\n"
            for author_email, details in analysis['other_author_errors'].items():
                author_name = author_email.split('@')[0] if '@' in author_email else author_email
                message += f"   • {author_name}: {len(details['errors'])} error(s) in {len(details['files'])} file(s)\n"
            message += f"\n   Original authors have been notified.\n"
        
        return message


if __name__ == "__main__":
    # Test the analyzer
    import sys
    
    if len(sys.argv) > 1:
        # Test with sample errors
        sample_errors = sys.argv[1:]
        analyzer = ErrorBlameAnalyzer()
        result = analyzer.analyze_errors(sample_errors)
        
        print("\n=== Analysis Result ===")
        print(f"PR Author Errors: {len(result['pr_author_errors'])}")
        print(f"Other Author Errors: {len(result['other_author_errors'])} author(s)")
        print(f"All Responsible Emails: {result['all_responsible_emails']}")
        print(analyzer.format_responsibility_message(result))
    else:
        print("Usage: python3.8 error_blame_analyzer.py <error_string1> <error_string2> ...")

