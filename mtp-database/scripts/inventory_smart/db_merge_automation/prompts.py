"""
Interactive prompts — environment selection, client selection, release name, etc.
Provides prompt_env / prompt_clients / prompt_repo_global_schema /
prompt_release_name / prompt_global_client_data utilities.
"""

import re
import sys

from .logging_utils import ReleaseLogger


def _blip_input(prompt: str) -> str:
    """Print blinking green dot and read user input."""
    return input(f"{ReleaseLogger.blip()}{prompt}")


def validate_branch_name(name: str) -> bool:
    """Validate a branch name suffix.

    Rules:
    - Must not be empty.
    - Must not start with ``-``.
    - Must not end with ``.`` or ``/``.
    - Must only contain ``[A-Za-z0-9._/-]``.

    Args:
        name: The branch name suffix to validate.

    Returns:
        True if valid, False otherwise.
    """
    if not name:
        return False
    if name.startswith("-"):
        return False
    if name.endswith(".") or name.endswith("/"):
        return False
    if not re.match(r"^[A-Za-z0-9._/-]+$", name):
        return False
    return True


# ------------------------------------------------------------------
# prompt_env
# ------------------------------------------------------------------

def prompt_env(config: dict, assume_yes: bool, logger: ReleaseLogger) -> tuple[str, str, str]:
    """
    Prompt user to select deployment environment.
    Returns (env_name, target_branch, source_branch).
    """
    logger.section("Select target deployment environment")

    envs = config["environments"]
    env_names = sorted(envs.keys(), key=lambda k: envs[k]["priority"])

    for i, name in enumerate(env_names, 1):
        print(f"{i}) {name}  ", end="")
    print()

    if assume_yes:
        env_num = 1
        print("Auto-selected: 1")
    else:
        raw = _blip_input("Enter number: ")
        try:
            env_num = int(raw)
        except ValueError:
            print("Invalid environment selection")
            sys.exit(1)

    if 1 <= env_num <= len(env_names):
        env_name = env_names[env_num - 1]
        branch = envs[env_name]["branch"]
        src_branch = envs[env_name]["src_branch"]
        return env_name, branch, src_branch
    else:
        print("Invalid environment selection")
        sys.exit(1)


# ------------------------------------------------------------------
# prompt_clients
# ------------------------------------------------------------------

def prompt_clients(
    client_list: list[str], assume_yes: bool, logger: ReleaseLogger
) -> list[str]:
    """Prompt user to select clients. Returns list of selected client names."""
    logger.section("Select clients")

    for i, name in enumerate(client_list, 1):
        print(f"{i}) {name}  ", end="")
    print()

    if assume_yes:
        print("Auto-selected: all")
        return list(client_list)

    raw = _blip_input("Enter comma-separated numbers, or 'all': ")
    if raw.strip().lower() == "all":
        return list(client_list)

    clients: list[str] = []
    for part in raw.split(","):
        part = part.strip()
        if not part.isdigit():
            continue
        idx = int(part) - 1
        if 0 <= idx < len(client_list):
            clients.append(client_list[idx])

    if not clients:
        print("No clients selected")
        sys.exit(1)

    return clients


# ------------------------------------------------------------------
# prompt_repo_global_schema
# ------------------------------------------------------------------

def prompt_repo_global_schema(assume_yes: bool, logger: ReleaseLogger) -> bool:
    """
    Ask whether to include repository-level schema changes.
    Returns True if yes.
    """
    logger.section("Repository-level global schema inclusion")
    print("Affects: database/schemas/inventory_smart and database/schemas/global")

    if assume_yes:
        print("Auto-selected: include")
        return True

    ans = _blip_input("Include repository-level schema changes? (Y/n): ") or "Y"
    return ans.strip().upper().startswith("Y")


# ------------------------------------------------------------------
# prompt_release_name
# ------------------------------------------------------------------

def prompt_release_name(
    datetime_str: str,
    env_name: str,
    custom_name: str,
    assume_yes: bool,
    logger: ReleaseLogger,
) -> tuple[str, str]:
    """
    Build the release name and branch.
    Returns (release_name, release_branch).
    """
    if custom_name:
        if not validate_branch_name(custom_name):
            print("Invalid --name")
            sys.exit(1)
        release_name = f"release_{datetime_str}{custom_name}"
    else:
        if assume_yes:
            release_name = f"release_{datetime_str}"
        else:
            sfx = _blip_input(
                f"Custom release branch suffix (appended to 'release_{datetime_str}') [optional]: "
            )
            if sfx:
                if not validate_branch_name(sfx):
                    print("Invalid branch suffix")
                    sys.exit(1)
                release_name = f"release_{datetime_str}{sfx}"
            else:
                release_name = f"release_{datetime_str}"

    release_branch = f"{env_name.lower()}/{release_name}"
    return release_name, release_branch


# ------------------------------------------------------------------
# prompt_global_client_data
# ------------------------------------------------------------------

def prompt_global_client_data(assume_yes: bool, logger: ReleaseLogger) -> bool:
    """
    Ask whether to include client-level global data updates.
    Returns True if yes.
    """
    logger.section("Client-level global data")

    if assume_yes:
        print("Auto: include")
        logger.info("Including client-level global data updates")
        return True

    include = _blip_input("Include client-level global data updates? (y/n): ")
    if include.strip().upper().startswith("Y"):
        logger.info("Including client-level global data updates")
        return True
    else:
        logger.info(
            "Skipping client-level global data updates (user selected 'n'); "
            "continuing with exclusions and the rest of the script"
        )
        return False


# ------------------------------------------------------------------
# prompt_commit_push
# ------------------------------------------------------------------

def prompt_commit_push(assume_yes: bool, logger: ReleaseLogger) -> bool:
    """Ask whether to commit and push. Returns True if yes."""
    if assume_yes:
        return False  # mirrors: if $ASSUME_YES; then commit_choice=n
    return _blip_input("Commit and push now? (y/n): ").strip().upper().startswith("Y")


def prompt_commit_message(
    default_msg: str, assume_yes: bool, logger: ReleaseLogger
) -> str:
    """Prompt for a commit message, falling back to *default_msg*.

    Args:
        default_msg: The default commit message.
        assume_yes: If True, return *default_msg* without prompting.
        logger: ReleaseLogger instance.

    Returns:
        The commit message string.
    """
    if assume_yes:
        return default_msg
    msg = _blip_input(f"Commit message (default: '{default_msg}'): ")
    return msg.strip() or default_msg


# ------------------------------------------------------------------
# prompt_proceed
# ------------------------------------------------------------------

def prompt_proceed(assume_yes: bool) -> None:
    """Final confirmation before execution."""
    if assume_yes:
        return
    ans = _blip_input("Proceed? (y/N): ")
    if not ans.strip().upper().startswith("Y"):
        print("Aborted")
        sys.exit(0)


# ------------------------------------------------------------------
# prompt_create_pr
# ------------------------------------------------------------------

def prompt_create_pr(assume_yes: bool, logger: ReleaseLogger) -> bool:
    """Ask whether to create a PR automatically. Returns True if yes."""
    if assume_yes:
        return True
    return _blip_input("Create PR automatically now? (y/n): ").strip().upper().startswith("Y")


def prompt_pr_title(default: str, assume_yes: bool) -> str:
    """Prompt for a PR title, falling back to *default*.

    Args:
        default: The auto-generated default title.
        assume_yes: If True, return *default* without prompting.

    Returns:
        The PR title string.
    """
    if assume_yes:
        return default
    raw = _blip_input(f"PR title (default: '{default}'): ")
    return raw.strip() or default


def prompt_pr_description(default: str, assume_yes: bool) -> str:
    """Prompt for a PR description, falling back to *default*.

    Args:
        default: The auto-generated default description.
        assume_yes: If True, return *default* without prompting.

    Returns:
        The PR description string.
    """
    if assume_yes:
        return default
    raw = _blip_input("PR description (optional, default auto-generated): ")
    return raw.strip() or default
