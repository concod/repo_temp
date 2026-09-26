"""
Git helper functions — branch management, worktree setup, file restore/delete,
OMS safety sweeps, and staging queries.
"""

import os
import subprocess
import shutil
from pathlib import Path

from .logging_utils import ReleaseLogger


def _run(cmd: list[str], cwd: str | None = None, check: bool = False) -> subprocess.CompletedProcess:
    """Thin wrapper around subprocess.run with sensible defaults."""
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, check=check)


def _run_ok(cmd: list[str], cwd: str | None = None) -> bool:
    """Return True if *cmd* exits 0."""
    return _run(cmd, cwd=cwd).returncode == 0


# ------------------------------------------------------------------
# ensure_branch_present  (mirrors ensure_branch_present)
# ------------------------------------------------------------------

def ensure_branch_present(ref: str, repo_root: str, logger: ReleaseLogger) -> None:
    """Fetch the latest state of *ref* from the remote ``origin``.

    Args:
        ref: Branch or ref name to fetch (e.g. ``develop/uat``).
        repo_root: Absolute path to the repository root.
        logger: ReleaseLogger instance for output.
    """
    logger.info(f"Fetching latest from origin for '{ref}'")
    logger.run_with_progress(
        f"fetch {ref}",
        f"git -C '{repo_root}' fetch origin '+{ref}:{ref}' >/dev/null 2>&1 || true",
    )


# ------------------------------------------------------------------
# exists_in_branch  (mirrors exists_in_branch)
# ------------------------------------------------------------------

def exists_in_branch(branch: str, path: str, repo_root: str) -> bool:
    """Check whether *path* exists in *branch* using ``git cat-file -e``.

    Args:
        branch: Git branch name.
        path: Repository-relative file path.
        repo_root: Absolute path to the repository root.

    Returns:
        True if the object exists, False otherwise.
    """
    return _run_ok(["git", "-C", repo_root, "cat-file", "-e", f"{branch}:{path}"])


# ------------------------------------------------------------------
# is_tracked  (mirrors is_tracked)
# ------------------------------------------------------------------

def is_tracked(path: str, worktree: str) -> bool:
    """Return True if *path* is tracked by git in *worktree*.

    Args:
        path: Repository-relative file path.
        worktree: Absolute path to the git worktree.
    """
    return _run_ok(["git", "-C", worktree, "ls-files", "--error-unmatch", "--", path])


# ------------------------------------------------------------------
# restore_to_branch_or_delete  (mirrors restore_to_branch_or_delete)
# ------------------------------------------------------------------

def restore_to_branch_or_delete(
    branch: str,
    paths: list[str],
    worktree: str,
    repo_root: str,
    logger: ReleaseLogger,
) -> None:
    """For each path, restore it to its *branch* state or delete it.

    If the file exists in *branch*, it is restored (staged + worktree).
    If the file does **not** exist in *branch*, it is removed — either
    via ``git rm`` (if tracked) or a filesystem delete (if untracked).

    Args:
        branch: Target branch to restore files to.
        paths: List of repository-relative file paths.
        worktree: Absolute path to the git worktree.
        repo_root: Absolute path to the repository root.
        logger: ReleaseLogger instance for output.
    """
    for path in paths:
        if exists_in_branch(branch, path, repo_root):
            _run(
                ["git", "-C", worktree, "restore", f"--source={branch}",
                 "--staged", "--worktree", "--", path],
            )
            logger.filelog(f"restored:{path} -> {branch}")
        else:
            if is_tracked(path, worktree):
                _run(["git", "-C", worktree, "rm", "-rf", "--", path])
            else:
                full = os.path.join(worktree, path)
                if os.path.exists(full):
                    if os.path.isdir(full):
                        shutil.rmtree(full, ignore_errors=True)
                    else:
                        os.remove(full)
            logger.filelog(f"deleted:{path} (absent in {branch})")


# ------------------------------------------------------------------
# list_changed_for_client  (mirrors list_changed_for_client)
# ------------------------------------------------------------------

def list_changed_for_client(client: str, worktree: str, logger: ReleaseLogger) -> None:
    """Log the staged diff (name-status) for *client*'s directory to the log file.

    Args:
        client: Client folder name (e.g. ``pacsun``).
        worktree: Absolute path to the git worktree.
        logger: ReleaseLogger instance for output.
    """
    logger.filelog(f"Client {client} changes (staged):")
    result = _run(
        ["git", "-C", worktree, "--no-pager", "diff", "--cached",
         "--name-status", "--", f"database/{client}"],
    )
    logger.filelog(result.stdout)
    logger.filelog("")


# ------------------------------------------------------------------
# count_staged_files (used for per-client summary)
# ------------------------------------------------------------------

def count_staged_files(client: str, worktree: str) -> int:
    """Return the number of staged files under ``database/<client>``.

    Args:
        client: Client folder name.
        worktree: Absolute path to the git worktree.

    Returns:
        Count of staged file paths.
    """
    result = _run(
        ["git", "-C", worktree, "--no-pager", "diff", "--cached",
         "--name-only", "--", f"database/{client}"],
    )
    return len([l for l in result.stdout.strip().splitlines() if l])


# ------------------------------------------------------------------
# OMS safety sweep  (find files matching *oms* and revert them)
# ------------------------------------------------------------------

def revert_oms_files(
    dir_path: str,
    branch: str,
    worktree: str,
    repo_root: str,
    logger: ReleaseLogger,
) -> None:
    """Find any files matching *oms* (case-insensitive) under *dir_path*
    and restore them to *branch* state or delete."""
    full_dir = os.path.join(worktree, dir_path)
    if not os.path.isdir(full_dir):
        return
    oms_files: list[str] = []
    for root, _dirs, files in os.walk(full_dir):
        for f in files:
            if "oms" in f.lower():
                abs_path = os.path.join(root, f)
                rel = os.path.relpath(abs_path, worktree)
                oms_files.append(rel)
    if oms_files:
        restore_to_branch_or_delete(branch, oms_files, worktree, repo_root, logger)


# ------------------------------------------------------------------
# git restore from source branch (excluding OMS)
# ------------------------------------------------------------------

def restore_from_source(
    path: str,
    src_branch: str,
    worktree: str,
    logger: ReleaseLogger,
) -> int:
    """
    git restore --source=<src_branch> --staged --worktree -- <path> ':(icase,exclude)**/*oms*'
    Returns the exit code.
    """
    cmd = (
        f"git -C '{worktree}' restore --source='{src_branch}' "
        f"--staged --worktree -- '{path}' ':(icase,exclude)**/*oms*' 2>/dev/null || true"
    )
    return logger.run_with_progress(
        f"restore {path} (excluding OMS) from {src_branch}", cmd
    )


# ------------------------------------------------------------------
# Worktree / branch creation
# ------------------------------------------------------------------

def branch_exists_locally(branch: str, repo_root: str) -> bool:
    """Return True if *branch* exists as a local ref in *repo_root*."""
    return _run_ok(["git", "-C", repo_root, "rev-parse", "--verify", branch])


def delete_local_branch(branch: str, repo_root: str) -> None:
    """Force-delete a local branch.

    Args:
        branch: Branch name to delete.
        repo_root: Absolute path to the repository root.
    """
    _run(["git", "-C", repo_root, "branch", "-D", branch])


def create_worktree(
    repo_root: str,
    release_branch: str,
    target_branch: str,
    worktree_path: str,
    logger: ReleaseLogger,
) -> None:
    """Debug mode: create a separate worktree."""
    if os.path.exists(worktree_path):
        shutil.rmtree(worktree_path)
    if branch_exists_locally(release_branch, repo_root):
        logger.info(f"Deleting existing branch {release_branch}")
        delete_local_branch(release_branch, repo_root)
    logger.info(f"Creating worktree at {worktree_path} for {release_branch} from {target_branch}")
    logger.run_with_progress(
        "worktree add",
        f"git -C '{repo_root}' worktree add -b '{release_branch}' '{worktree_path}' '{target_branch}' >/dev/null",
    )


def checkout_new_branch(
    repo_root: str,
    release_branch: str,
    target_branch: str,
    logger: ReleaseLogger,
) -> None:
    """Normal mode: checkout a new release branch in-place."""
    if branch_exists_locally(release_branch, repo_root):
        logger.info(f"Deleting existing branch {release_branch}")
        delete_local_branch(release_branch, repo_root)
    logger.info(f"Creating and checking out release branch {release_branch} from {target_branch}")
    logger.run_with_progress(
        "checkout branch",
        f"git -C '{repo_root}' checkout -b '{release_branch}' '{target_branch}' >/dev/null",
    )


# ------------------------------------------------------------------
# Commit / push / reset
# ------------------------------------------------------------------

def git_add_all(worktree: str, logger: ReleaseLogger) -> int:
    """Stage all changes in *worktree* (``git add -A``). Returns exit code."""
    return logger.run_with_progress("git add", f"cd '{worktree}' && git add -A")


def git_commit(worktree: str, message: str, logger: ReleaseLogger) -> int:
    """Commit staged changes with *message*. Returns exit code."""
    return logger.run_with_progress("git commit", f"cd '{worktree}' && git commit -m '{message}'")


def git_push(worktree: str, release_branch: str, logger: ReleaseLogger) -> int:
    """Push *release_branch* to origin with upstream tracking. Returns exit code."""
    return logger.run_with_progress(
        "git push",
        f"cd '{worktree}' && git push --set-upstream origin '{release_branch}'",
    )


def git_reset_head(worktree: str, logger: ReleaseLogger) -> int:
    """Unstage all changes (``git reset HEAD``). Returns exit code."""
    return logger.run_with_progress("git reset", f"cd '{worktree}' && git reset HEAD")


# ------------------------------------------------------------------
# Restore specific file from source (no OMS exclude — for global data files)
# ------------------------------------------------------------------

def restore_file_from_source(
    path: str,
    src_branch: str,
    worktree: str,
    logger: ReleaseLogger,
) -> bool:
    """Restore a single file; return True on success."""
    result = _run(
        ["git", "-C", worktree, "restore", f"--source={src_branch}",
         "--staged", "--worktree", "--", path],
    )
    if result.returncode != 0:
        logger.filelog(f"missing_in_source:{path}")
        return False
    return True


# ------------------------------------------------------------------
# Environment-specific restore (no OMS exclusion)
# ------------------------------------------------------------------

def restore_env_specific(
    path: str,
    src_branch: str,
    worktree: str,
) -> bool:
    """Restore env-specific data path; return True on success."""
    result = _run(
        ["git", "-C", worktree, "restore", f"--source={src_branch}",
         "--staged", "--worktree", "--", path],
    )
    return result.returncode == 0


def count_files_in_dir(dir_path: str) -> int:
    """Count files recursively under *dir_path*."""
    if not os.path.isdir(dir_path):
        return 0
    count = 0
    for _root, _dirs, files in os.walk(dir_path):
        count += len(files)
    return count
