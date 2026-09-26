"""
Bitbucket helpers — auto-detect workspace/repo from git remote, resolve
reviewer UUIDs, format PR descriptions, and create PRs via the API.
"""

import base64
import json
import os
import re
import subprocess
import urllib.request
import urllib.error
from datetime import datetime

from .logging_utils import ReleaseLogger

# Fallback defaults — primary values come from release_config.json
_FALLBACK_WORKSPACE = "insideinsight"
_FALLBACK_REPO = "mtp-database"


# ------------------------------------------------------------------
# Auto-detect workspace / repo from git remote
# ------------------------------------------------------------------

def auto_detect_bitbucket(repo_root: str) -> tuple[str, str]:
    """
    Parse the origin remote URL to extract workspace and repo slugs.
    Falls back to constants / env vars.
    Returns (workspace, repo).
    """
    workspace = os.environ.get("BITBUCKET_WORKSPACE", "")
    repo = os.environ.get("BITBUCKET_REPO", "")

    try:
        result = subprocess.run(
            ["git", "-C", repo_root, "remote", "get-url", "origin"],
            capture_output=True, text=True,
        )
        remote = result.stdout.strip()
    except Exception:
        remote = ""

    if remote:
        # Match SSH or HTTPS: git@bitbucket.org:ws/repo.git | https://bitbucket.org/ws/repo.git
        m = re.search(r"bitbucket\.org[:/]+([^/]+)/([^/]+?)(?:\.git)?$", remote)
        if m:
            if not workspace:
                workspace = m.group(1)
            if not repo:
                rp = m.group(2).removesuffix(".git")
                repo = rp

    workspace = workspace or _FALLBACK_WORKSPACE
    repo = repo or _FALLBACK_REPO
    return workspace, repo


# ------------------------------------------------------------------
# Reviewer UUID resolution
# ------------------------------------------------------------------

def get_default_reviewer_uuids(
    config: dict,
    logger: ReleaseLogger,
) -> str:
    """Read reviewer UUIDs from config.

    Each entry in ``release_config.json`` ``reviewers`` list is an object
    with ``name`` and ``uuid`` keys.  All UUIDs are returned; if the
    PR author happens to be in the list, ``create_pr`` will automatically
    retry without that UUID.

    Falls back to ``BITBUCKET_REVIEWER_UUIDS`` env var if set.

    Args:
        config: Parsed release config dict.
        logger: ReleaseLogger instance for output.

    Returns:
        Comma-separated UUID string.
    """
    env_override = os.environ.get("BITBUCKET_REVIEWER_UUIDS", "")
    if env_override:
        return env_override

    reviewer_entries = config.get("reviewers", [])
    uuids: list[str] = []
    for entry in reviewer_entries:
        name = entry.get("name", "")
        uuid = entry.get("uuid", "")

        if uuid:
            uuids.append(uuid)
            logger.info(f"Reviewer: {name} ({uuid})")
        else:
            logger.info(f"WARNING: No UUID configured for {name}")

    if not uuids:
        logger.info("No reviewers configured")

    return ",".join(uuids)


# ------------------------------------------------------------------
# Human-readable date formatting (mirrors format_human_date)
# ------------------------------------------------------------------

MONTH_NAMES = [
    "", "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
]


def format_human_date(dt_str: str) -> str:
    """
    Convert YYYY-MM-DD_HH-MM or YYYY-MM-DD to human-readable format.
    e.g. "April 13, 2026 at 5:26 PM" or "April 13, 2026".
    """
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})_(\d{2})-(\d{2})$", dt_str)
    if m:
        year, month, day, hour, minute = (
            m.group(1), int(m.group(2)), m.group(3), int(m.group(4)), m.group(5),
        )
        month_name = MONTH_NAMES[month]
        ampm = "AM"
        hour_12 = hour
        if hour_12 == 0:
            hour_12 = 12
        elif hour_12 > 12:
            hour_12 -= 12
            ampm = "PM"
        elif hour_12 == 12:
            ampm = "PM"
        return f"{month_name} {day}, {year} at {hour_12}:{minute} {ampm}"

    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})$", dt_str)
    if m:
        year, month, day = m.group(1), int(m.group(2)), m.group(3)
        month_name = MONTH_NAMES[month]
        return f"{month_name} {day}, {year}"

    return dt_str


# ------------------------------------------------------------------
# PR description builders (mirrors generate_client_list / generate_global_changes_list)
# ------------------------------------------------------------------

def generate_client_list(clients: list[str], include_global_data: bool) -> str:
    """Build a bullet-point list of client names for the PR description.

    Args:
        clients: List of client folder names.
        include_global_data: If True, append a note about global data inclusion.

    Returns:
        Formatted multi-line string.
    """
    lines = [f"• {c}" for c in clients]
    text = "\n".join(lines)
    if include_global_data:
        text += "\n\n*Note: Global data changes (client level) are included for the above clients*"
    return text


def generate_global_changes_list(include_repo_global: bool) -> str:
    """Build the global-changes section for the PR description.

    Args:
        include_repo_global: True if repo-level schema changes were included.

    Returns:
        Formatted string, or empty string if not applicable.
    """
    if include_repo_global:
        return (
            "• Global schema changes (repository level)\n"
            "• Global data changes (repository level)"
        )
    return ""


def build_pr_description(
    env_name: str,
    release_name: str,
    human_date: str,
    clients: list[str],
    include_global_data: bool,
    include_repo_global: bool,
    src_branch: str,
    target_branch: str,
    release_branch: str,
) -> str:
    """Compose the full Markdown PR description.

    Args:
        env_name: Target environment (e.g. ``PROD``, ``UAT``).
        release_name: Release identifier string.
        human_date: Human-readable date/time string.
        clients: List of client names included in this release.
        include_global_data: Whether client-level global data was included.
        include_repo_global: Whether repo-level global schemas were included.
        src_branch: Source branch name.
        target_branch: Destination / target branch name.
        release_branch: The release branch name.

    Returns:
        Full PR description as a Markdown string.
    """
    client_list = generate_client_list(clients, include_global_data)
    global_changes = generate_global_changes_list(include_repo_global)

    desc = (
        f"🚀 **Automated Release for {env_name} Environment**\n\n"
        f"📅 **Generated on:** {human_date}\n"
        f"🏷️ **Release ID:** {release_name}\n\n"
        f"## 📊 Included Clients\n"
        f"{client_list}"
    )

    if global_changes:
        desc += f"\n\n## 🌐 Global Changes\n{global_changes}"

    desc += (
        f"\n\n## 🔧 Technical Details\n"
        f"• **Source branch:** {src_branch}\n"
        f"• **Target branch:** {target_branch}\n"
        f"• **Release branch:** {release_branch}"
    )

    return desc


# ------------------------------------------------------------------
# Authentication helpers
# ------------------------------------------------------------------

def _get_credentials() -> str | None:
    """Resolve Bitbucket Basic-auth credentials (base64-encoded).

    Requires ``BITBUCKET_USERNAME`` and ``BITBUCKET_TOKEN`` env vars.

    Returns:
        Base64-encoded ``username:token`` string, or None if unavailable.
    """
    username = os.environ.get("BITBUCKET_USERNAME", "")
    token = os.environ.get("BITBUCKET_TOKEN", "")

    if not username or not token:
        return None

    raw = f"{username}:{token}"
    return base64.b64encode(raw.encode()).decode()


def _mask(secret: str) -> str:
    """Mask a secret for debug logging: show first 6 and last 4 chars."""
    if not secret:
        return "<unset>"
    if len(secret) <= 10:
        return "***"
    return f"{secret[:6]}…{secret[-4:]} (len={len(secret)})"


# ------------------------------------------------------------------
# Low-level PR request helper
# ------------------------------------------------------------------

def _send_pr_request(
    api_url: str,
    payload: dict,
    creds: str,
    logger: "ReleaseLogger",
) -> tuple[int, str, int]:
    """POST *payload* to the Bitbucket PR endpoint.

    Returns:
        ``(return_code, error_body, http_status_code)``
        — ``return_code`` is 0 on success, 4 on failure.
    """
    payload_bytes = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(api_url, data=payload_bytes, method="POST")
    req.add_header("Content-Type", "application/json")
    req.add_header("Authorization", f"Basic {creds}")

    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            body = json.loads(resp.read().decode())
            link = body.get("links", {}).get("html", {}).get("href", "")
            pr_id = body.get("id", "?")
            if link:
                logger.info(f"PR created (#{pr_id}): {link}")
            else:
                logger.info("PR created successfully")
            return 0, "", 200

    except urllib.error.HTTPError as e:
        error_body = ""
        try:
            error_body = e.read().decode()
        except Exception:
            pass
        logger.info(f"ERROR: PR creation failed with HTTP {e.code}")
        if error_body:
            logger.info(f"API response: {error_body}")
            logger.filelog(error_body)
        return 4, error_body, e.code

    except Exception as e:
        logger.info(f"ERROR: PR creation failed: {e}")
        return 4, str(e), 0


# ------------------------------------------------------------------
# Create PR via Bitbucket REST API (native Python)
# ------------------------------------------------------------------

def create_pr(
    workspace: str,
    repo: str,
    source_branch: str,
    dest_branch: str,
    title: str,
    description: str,
    reviewer_uuids: str,
    debug: bool,
    logger: ReleaseLogger,
    close_source_branch: bool = True,
    reviewer_name_map: dict[str, str] | None = None,
) -> int:
    """Create a Bitbucket Pull Request via the REST API.

    Uses Basic Authentication (Atlassian email + app password / API token).

    Args:
        workspace: Bitbucket workspace slug.
        repo: Bitbucket repository slug.
        source_branch: Source branch for the PR.
        dest_branch: Destination branch for the PR.
        title: PR title.
        description: PR description (Markdown).
        reviewer_uuids: Comma-separated reviewer UUID strings.
        debug: If True, log the endpoint and payload before calling the API.
        logger: ReleaseLogger instance for output.
        close_source_branch: Whether to close the source branch on merge.
        reviewer_name_map: Optional ``{name_lower: uuid}`` map for author
            exclusion on retry.

    Returns:
        0 on success, non-zero on failure.
    """
    api_url = (
        f"https://api.bitbucket.org/2.0/repositories/"
        f"{workspace}/{repo}/pullrequests"
    )

    creds = _get_credentials()
    if not creds:
        logger.info("ERROR: Missing Bitbucket authentication credentials.")
        logger.info("Set BITBUCKET_APP_PASSWORD or store token in macOS Keychain.")
        return 3

    # Build reviewers list (author already excluded by get_default_reviewer_uuids)
    reviewers: list[dict] = []
    if reviewer_uuids:
        for uuid_str in reviewer_uuids.split(","):
            uuid_str = uuid_str.strip()
            if not uuid_str:
                continue
            if not uuid_str.startswith("{"):
                uuid_str = "{" + uuid_str
            if not uuid_str.endswith("}"):
                uuid_str = uuid_str + "}"
            reviewers.append({"uuid": uuid_str})

    payload = {
        "title": title,
        "description": description,
        "source": {"branch": {"name": source_branch}},
        "destination": {"branch": {"name": dest_branch}},
        "reviewers": reviewers,
        "close_source_branch": close_source_branch,
    }

    logger.info(f"Creating PR '{title}' -> {dest_branch}")
    if reviewers:
        logger.info(f"Using reviewers: {', '.join(r['uuid'] for r in reviewers)}")
    else:
        logger.info("No reviewers configured")

    if debug:
        logger.info(f"[DEBUG] Endpoint: POST {api_url}")
        logger.info(f"[DEBUG] Payload: {json.dumps(payload, indent=2)}")
        logger.info("[DEBUG] Auth mode: Basic (Atlassian email + API token)")

    # --- Attempt PR creation (with auto-retry on author conflict) ---
    rc, error_body, http_code = _send_pr_request(api_url, payload, creds, logger)
    if rc == 0:
        return 0

    # If 400 + author conflict → extract author name, find their UUID, remove it
    if http_code == 400 and "author" in error_body.lower():
        author_uuid = ""
        try:
            err_data = json.loads(error_body)
            # Message format: "Arjun P P is the author and cannot be included..."
            msg = err_data.get("error", {}).get("fields", {}).get("reviewers", [""])[0]
            if " is the author" in msg:
                author_name = msg.split(" is the author")[0].strip()
                logger.info(f"Author detected: {author_name}")
                # Look up UUID from reviewer name map
                if reviewer_name_map:
                    author_uuid = reviewer_name_map.get(author_name.lower(), "")
        except Exception:
            pass

        if author_uuid:
            logger.info(f"Removing author {author_uuid} from reviewers and retrying...")
            payload["reviewers"] = [
                r for r in payload["reviewers"] if r["uuid"] != author_uuid
            ]
        else:
            logger.info("Could not identify author UUID — removing all reviewers and retrying...")
            payload["reviewers"] = []

        rc, error_body, http_code = _send_pr_request(api_url, payload, creds, logger)
        if rc == 0:
            return 0

    # Final failure
    if debug:
        logger.info(
            "[DEBUG] Hint: Check that your token/app password has scopes: "
            "pullrequest:write, repository:read"
        )
    return 4


def get_manual_pr_url(workspace: str, repo: str, source: str, dest: str) -> str:
    """Build the Bitbucket browser URL for manually creating a PR.

    Args:
        workspace: Bitbucket workspace slug.
        repo: Bitbucket repository slug.
        source: Source branch.
        dest: Destination branch.

    Returns:
        Full URL string.
    """
    return (
        f"https://bitbucket.org/{workspace}/{repo}/pull-requests/new"
        f"?source={source}&dest={dest}"
    )
