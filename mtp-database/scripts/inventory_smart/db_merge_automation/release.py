#!/usr/bin/env python3
"""
Release Automation Script
=========================
Goals:
- Operate in a temporary git worktree to avoid branch switching pain
- Robustly handle OMS/excluded files even when created/removed across branches
- Quiet console output; rich, per-client file listings in a single log file
- Preserve the behavior of v1 where possible, with safer defaults

Usage:
    python -m scripts.inventory_smart.db_merge_automation [--debug] [--name <suffix>] [--yes]

Options:
    --debug            Create separate worktree (default: work in current repo)
    --name, --name=    Append a custom suffix to the release name
    --yes              Non-interactive confirmations (assume yes)
"""

import argparse
import json
import os
import shutil
import sys
import time
from pathlib import Path

from .bitbucket import (
    auto_detect_bitbucket,
    build_pr_description,
    create_pr,
    format_human_date,
    get_default_reviewer_uuids,
    get_manual_pr_url,
)
from .git_helpers import (
    checkout_new_branch,
    count_files_in_dir,
    count_staged_files,
    create_worktree,
    ensure_branch_present,
    exists_in_branch,
    git_add_all,
    git_commit,
    git_push,
    git_reset_head,
    list_changed_for_client,
    restore_file_from_source,
    restore_env_specific,
    restore_from_source,
    restore_to_branch_or_delete,
    revert_oms_files,
)
from .logging_utils import ReleaseLogger
from .prompts import (
    prompt_clients,
    prompt_commit_message,
    prompt_commit_push,
    prompt_create_pr,
    prompt_env,
    prompt_global_client_data,
    prompt_pr_description,
    prompt_pr_title,
    prompt_proceed,
    prompt_release_name,
    prompt_repo_global_schema,
)


# =====================================================================
# Paths & constants
# =====================================================================

PACKAGE_DIR = str(Path(__file__).resolve().parent)
REPO_ROOT = str(Path(__file__).resolve().parent.parent.parent.parent)
CONFIG_FILE = os.path.join(PACKAGE_DIR, "release_config.json")


# =====================================================================
# Config loading
# =====================================================================

def load_config(path: str) -> dict:
    """Load and parse the release JSON configuration file.

    Args:
        path: Absolute path to ``release_config.json``.

    Returns:
        Parsed configuration dictionary containing clients, environments,
        exclusion rules, and schema lists.
    """
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


# =====================================================================
# Main
# =====================================================================

def main() -> None:
    """Entry point for the Inventory Smart release automation.

    Orchestrates the full release workflow:

    1. Parse CLI arguments (``--debug``, ``--name``, ``--yes``).
    2. Load the JSON configuration (clients, environments, exclusions).
    3. Auto-detect Bitbucket workspace/repo from the git remote.
    4. Prompt for environment, clients, schema inclusion, and release name.
    5. Fetch branches and create the release branch (worktree or in-place).
    6. Sync repository-level and per-client data/schemas from the source
       branch, excluding OMS-related files.
    7. Sync environment-specific data (``test_specific``, ``dev_specific``).
    8. Optionally sync client-level global data files.
    9. Apply configured path and file exclusions.
    10. Optionally commit, push, and create a Bitbucket Pull Request.
    """
    # ---------- argument parsing ----------
    parser = argparse.ArgumentParser(
        description="Inventory Smart Release Automation (v2) — Python port",
    )
    parser.add_argument("--debug", action="store_true",
                        help="Create separate worktree (default: work in current repo)")
    parser.add_argument("--name", dest="custom_name", default="",
                        help="Append a custom suffix to the release name")
    parser.add_argument("--yes", action="store_true",
                        help="Non-interactive confirmations (assume yes)")
    args = parser.parse_args()

    debug_mode: bool = args.debug
    custom_name: str = args.custom_name
    assume_yes: bool = args.yes

    # ---------- environment check ----------
    if not os.environ.get("BITBUCKET_USERNAME"):
        print("ERROR: BITBUCKET_USERNAME environment variable is not set.")
        print("Set it to your Bitbucket email, e.g.:")
        print("  export BITBUCKET_USERNAME=arjun.pp@impactanalytics.co")
        sys.exit(1)

    # ---------- dependency check ----------
    for dep in ("git",):
        if shutil.which(dep) is None:
            print(f"Missing dependency: {dep}")
            sys.exit(1)

    # ---------- logger ----------
    logger = ReleaseLogger()

    logger.section("Inventory Smart Release v2 - START")
    logger.info(f"Repo root: {REPO_ROOT}")
    logger.info(f"Config: {CONFIG_FILE}")
    logger.info(f"Log file: {logger.log_file}")

    # ---------- config loading ----------
    config = load_config(CONFIG_FILE)

    client_list: list[str] = [c["name"] for c in config["clients"]]
    omit_global_csv: list[str] = config.get("omit_global_csv", [])
    include_global_files: list[str] = config.get("include_global_files", [])
    exclude_paths: list[str] = config.get("exclude_paths", [])
    exclude_files: list[str] = config.get("exclude_files", [])
    include_inv_schemas: list[str] = config.get("include_inventory_smart_schemas", [])
    include_global_schemas: list[str] = config.get("include_global_schemas", [])

    # ---------- bitbucket auto-detect ----------
    bb_workspace, bb_repo = auto_detect_bitbucket(REPO_ROOT)
    bb_api_pr_url = (
        f"https://api.bitbucket.org/2.0/repositories/{bb_workspace}/{bb_repo}/pullrequests"
    )

    # ---------- interactive prompts ----------
    env_name, target_branch, src_branch = prompt_env(config, assume_yes, logger)
    clients = prompt_clients(client_list, assume_yes, logger)
    include_repo_global = prompt_repo_global_schema(assume_yes, logger)
    release_name, release_branch = prompt_release_name(
        logger.datetime_str, env_name, custom_name, assume_yes, logger,
    )

    # ---------- execution summary ----------
    logger.section("Execution summary")
    logger.info(f"Environment: {env_name}")
    logger.info(f"Source branch: {src_branch}")
    logger.info(f"Target branch: {target_branch}")
    logger.info(f"Release branch: {release_branch}")
    sorted_display = sorted(c.replace("_", " ").title() for c in clients)
    logger.info(f"Clients: {', '.join(sorted_display)}")
    logger.info(f"Repo-level schemas: {'Y' if include_repo_global else 'N'}")
    logger.info(f"Bitbucket: {bb_workspace}/{bb_repo}")
    logger.info(f"PR API URL: {bb_api_pr_url}")
    if debug_mode:
        logger.info("Mode: Debug (separate worktree)")
    else:
        logger.info("Mode: Normal (current repository)")

    prompt_proceed(assume_yes)

    # ---------- prepare branches / worktree ----------
    logger.section("Preparing branches/worktree")
    ensure_branch_present(src_branch, REPO_ROOT, logger)
    ensure_branch_present(target_branch, REPO_ROOT, logger)

    if debug_mode:
        worktree = f"/tmp/mtp_release_{logger.datetime_str}"
        create_worktree(REPO_ROOT, release_branch, target_branch, worktree, logger)
    else:
        worktree = REPO_ROOT
        checkout_new_branch(REPO_ROOT, release_branch, target_branch, logger)

    # =================================================================
    # COPY / SYNC OPERATIONS
    # =================================================================

    # ---- Repository-level data ----
    logger.section("Repository-level operations")
    logger.subsection("Sync repository-level data")

    repo_data_paths = [
        "database/data/inventory_smart",
        "database/data/ada_visual",
        "database/data/global",
    ]
    for rdp in repo_data_paths:
        restore_from_source(rdp, src_branch, worktree, logger)
        # Safety fallback: revert any OMS files
        revert_oms_files(rdp, target_branch, worktree, REPO_ROOT, logger)

    # ---- Repository-level schemas (optional) ----
    if include_repo_global:
        logger.subsection("Sync repository-level schemas")
        inv_s = "database/schemas/inventory_smart"
        g_s = "database/schemas/global"
        restore_from_source(inv_s, src_branch, worktree, logger)
        restore_from_source(g_s, src_branch, worktree, logger)
        for p in (inv_s, g_s):
            revert_oms_files(p, target_branch, worktree, REPO_ROOT, logger)
    else:
        logger.info("Skipping repo-level schema sync")

    # ---- Per-client operations ----
    logger.section("Per-client operations")
    for client in clients:
        logger.subsection(f"Client: {client}")
        paths = [
            f"database/{client}/data/inventory_smart",
            f"database/{client}/data/ada_visual",
            f"database/{client}/schemas/inventory_smart",
            f"database/{client}/schemas/global",
        ]
        for p in paths:
            restore_from_source(p, src_branch, worktree, logger)

        # Revert OMS files (safety)
        for p in paths:
            revert_oms_files(p, target_branch, worktree, REPO_ROOT, logger)

        list_changed_for_client(client, worktree, logger)
        cnt = count_staged_files(client, worktree)
        logger.info(f"  staged changes: {cnt} files (details in log)")

    # =================================================================
    # ENVIRONMENT-SPECIFIC DATA
    # =================================================================

    logger.section("Environment-specific data")
    env_folders = ["test_specific", "dev_specific"]
    logger.info(
        f"Syncing environment-specific folders ({', '.join(env_folders)}) "
        "for selected clients"
    )

    for client in clients:
        logger.subsection(f"Client: {client}")
        client_start = time.time()
        total_files = 0
        synced_folders = 0

        for env_folder in env_folders:
            env_data_path = f"database/{client}/data/{env_folder}"
            start = time.time()
            sys.stdout.write(f"    • {env_folder}: ")
            sys.stdout.flush()

            if exists_in_branch(src_branch, env_data_path, REPO_ROOT):
                sys.stdout.write("[EXISTS] ")
                sys.stdout.flush()

                if restore_env_specific(env_data_path, src_branch, worktree):
                    elapsed = int(time.time() - start)
                    sys.stdout.write(f"({elapsed}s) [OK]")
                    logger.filelog(f"env_specific_synced:{env_data_path} from {src_branch}")
                    synced_folders += 1

                    full_dir = os.path.join(worktree, env_data_path)
                    if os.path.isdir(full_dir):
                        fc = count_files_in_dir(full_dir)
                        sys.stdout.write(f" ({fc} files)")
                        total_files += fc
                    sys.stdout.write("\n")
                else:
                    elapsed = int(time.time() - start)
                    sys.stdout.write(f"({elapsed}s) [FAIL]\n")
                    logger.filelog(f"env_specific_sync_failed:{env_data_path} from {src_branch}")
                    logger.info(f"        ⚠ Failed to sync {env_data_path}")
            else:
                sys.stdout.write("[NOT FOUND] ")
                elapsed = int(time.time() - start)
                sys.stdout.write(f"({elapsed}s) [SKIP]\n")
                logger.filelog(f"env_specific_not_found:{env_data_path} in {src_branch}")

            sys.stdout.flush()

        client_duration = int(time.time() - client_start)
        print(
            f"    ↳ Summary: {synced_folders}/{len(env_folders)} folders synced, "
            f"{total_files} total files ({client_duration}s)"
        )
        print()

    # =================================================================
    # CLIENT-LEVEL GLOBAL DATA (selected files)
    # =================================================================

    include_client_global_data = prompt_global_client_data(assume_yes, logger)

    if include_client_global_data:
        for client in clients:
            base = f"database/{client}/data/global"
            full_base = os.path.join(worktree, base)
            if not os.path.isdir(full_base):
                logger.info(f"No global data folder for {client}")
                continue
            for fname in include_global_files:
                if fname.startswith("oms"):
                    continue
                fp = f"{base}/{fname}"
                restore_file_from_source(fp, src_branch, worktree, logger)
            list_changed_for_client(client, worktree, logger)

    # =================================================================
    # EXCLUSIONS
    # =================================================================

    logger.section("Apply exclusions")

    # Excluded paths
    if exclude_paths:
        logger.subsection("Restore excluded paths to target or delete if absent")
        start = time.time()
        sys.stdout.write(f"  • {ReleaseLogger.blink_yellow()} Paths ")
        sys.stdout.flush()
        for x in exclude_paths:
            restore_to_branch_or_delete(target_branch, [x], worktree, REPO_ROOT, logger)
            sys.stdout.write(".")
            sys.stdout.flush()
        elapsed = int(time.time() - start)
        print(f" ({elapsed}s) [OK]")

    # Excluded files under schema types per client + repo-level
    if exclude_files:
        logger.subsection("Per-client excluded files")
        for client in clients:
            cstart = time.time()
            sys.stdout.write(f"  • {ReleaseLogger.blink_yellow()} Client: {client} ")
            sys.stdout.flush()
            for exclude_file in exclude_files:
                for t in include_inv_schemas:
                    restore_to_branch_or_delete(
                        target_branch,
                        [f"database/{client}/schemas/inventory_smart/{t}/{exclude_file}"],
                        worktree, REPO_ROOT, logger,
                    )
                    sys.stdout.write(".")
                    sys.stdout.flush()
                for t in include_global_schemas:
                    restore_to_branch_or_delete(
                        target_branch,
                        [f"database/{client}/schemas/global/{t}/{exclude_file}"],
                        worktree, REPO_ROOT, logger,
                    )
                    sys.stdout.write(".")
                    sys.stdout.flush()
            cend = time.time()
            print(f" ({int(cend - cstart)}s) [OK]")

        logger.subsection("Repository-level excluded files")
        rstart = time.time()
        sys.stdout.write(f"  • {ReleaseLogger.blink_yellow()} Repo-level ")
        sys.stdout.flush()
        for exclude_file in exclude_files:
            for t in include_inv_schemas:
                restore_to_branch_or_delete(
                    target_branch,
                    [f"database/schemas/inventory_smart/{t}/{exclude_file}"],
                    worktree, REPO_ROOT, logger,
                )
                sys.stdout.write(".")
                sys.stdout.flush()
            for t in include_global_schemas:
                restore_to_branch_or_delete(
                    target_branch,
                    [f"database/schemas/global/{t}/{exclude_file}"],
                    worktree, REPO_ROOT, logger,
                )
                sys.stdout.write(".")
                sys.stdout.flush()
        rend = time.time()
        print(f" ({int(rend - rstart)}s) [OK]")

    # =================================================================
    # RELEASE BRANCH READY
    # =================================================================

    logger.section("Release branch ready")
    logger.info(f"Worktree: {worktree}")
    logger.info(f"Release branch: {release_branch}")
    logger.info("Review changes in the worktree, then commit/push as desired.")

    commit_choice = prompt_commit_push(assume_yes, logger)

    if commit_choice:
        commit_clients = sorted(c.replace("_", " ").title() for c in clients)
        commit_merge = f"{src_branch.split('/')[-1].upper()} to {env_name} Merge"
        default_msg = f"{', '.join(commit_clients)} – {commit_merge}"
        commit_msg = prompt_commit_message(default_msg, assume_yes, logger)
        git_add_all(worktree, logger)
        git_commit(worktree, commit_msg, logger)
        git_push(worktree, release_branch, logger)
        logger.info(f"Committed and pushed to {release_branch}")
    else:
        logger.info("Unstaging all changes...")
        git_reset_head(worktree, logger)
        if debug_mode:
            logger.info(f"Changes unstaged in worktree at {worktree}")
        else:
            logger.info(
                f"Changes unstaged in current repository. "
                f"You are now on branch {release_branch}"
            )

    logger.section("Inventory Smart Release v2 - COMPLETE")
    logger.info(f"Log saved to: {logger.log_file}")

    # =================================================================
    # PULL REQUEST CREATION
    # =================================================================

    if commit_choice:
        logger.section("Pull Request")
        logger.info(f"Branch pushed successfully to origin/{release_branch}")

        reviewer_uuids = get_default_reviewer_uuids(config, logger)

        pr_url = get_manual_pr_url(bb_workspace, bb_repo, release_branch, target_branch)
        logger.info(f"Manual PR URL: {pr_url}")

        if not os.environ.get("BITBUCKET_TOKEN"):
            logger.info("ERROR: BITBUCKET_TOKEN environment variable is not set.")
            logger.info("Set it to your Bitbucket app password, e.g.:")
            logger.info("  export BITBUCKET_TOKEN=<your-app-password>")
            logger.info("Skipping PR creation. Use the manual URL above.")
        elif prompt_create_pr(assume_yes, logger):
            human_date = format_human_date(logger.datetime_str)

            # Build title: sorted, title-cased client names + merge direction
            display_clients = sorted(
                [c.replace("_", " ").title() for c in clients]
            )
            merge_label = f"{src_branch.split('/')[-1].upper()} to {env_name} Merge"
            default_title = f"{', '.join(display_clients)} – {merge_label}"
            default_desc = build_pr_description(
                env_name=env_name,
                release_name=release_name,
                human_date=human_date,
                clients=clients,
                include_global_data=include_client_global_data,
                include_repo_global=include_repo_global,
                src_branch=src_branch,
                target_branch=target_branch,
                release_branch=release_branch,
            )

            pr_title = prompt_pr_title(default_title, assume_yes)
            pr_desc = prompt_pr_description(default_desc, assume_yes)

            # Build name→uuid map for author auto-exclusion on retry
            reviewer_name_map = {
                entry.get("name", "").lower(): entry.get("uuid", "")
                for entry in config.get("reviewers", [])
                if entry.get("name") and entry.get("uuid")
            }

            rc = create_pr(
                workspace=bb_workspace,
                repo=bb_repo,
                source_branch=release_branch,
                dest_branch=target_branch,
                title=pr_title,
                description=pr_desc,
                reviewer_uuids=reviewer_uuids,
                debug=debug_mode,
                logger=logger,
                reviewer_name_map=reviewer_name_map,
            )

            if rc == 0:
                logger.info("PR creation step completed")
            else:
                logger.info(f"PR creation failed (exit {rc}). Falling back to manual URL above.")
        else:
            logger.info("Skipping API PR creation. Use the manual URL above.")

    logger.close()


if __name__ == "__main__":
    main()
