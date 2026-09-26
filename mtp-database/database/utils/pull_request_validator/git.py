import os
import subprocess
import re


class GitUtils:
    """
    Utility class for Git operations related to pull request validation.
    Provides methods for git blame analysis and pull request file detection.
    """

    @staticmethod
    def get_git_blame(file_path, line_number):
        """
        Get git blame information for a specific line in a file.
        Retrieves commit details including author, timestamp, and code content.
        
        Args:
            file_path: Path to the file to analyze
            line_number: Line number to get blame information for
            
        Returns:
            dict: Dictionary containing commit hash, author, timestamp, and code
                  Returns empty dict if error occurs
        """
        try:
            # Prepare the Git blame command for a specific line in the given file
            git_command = ['git', 'blame', '-L', f'{line_number},{line_number}', file_path]
            
            # Run the command and capture its output
            result = subprocess.run(git_command, capture_output=True, text=True)
            
            # If Git returns a non-zero exit code, raise an error
            if result.returncode != 0:
                raise Exception(f'Error fetching blame for file {file_path} at line {line_number}')
            
            # Get the output line (should be a single line from git blame)
            line = result.stdout.strip()
            
            # Regex pattern to extract commit hash, author, timestamp, and code line
            # Format: <commit_hash> (<author> <timestamp> <line_num>) <code>
            pattern = r'^([0-9a-f]+) \((.+?) (\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{4}) +\d+\)\s+(.*)$'
            match = re.match(pattern, line)
            
            # If the output doesn't match expected blame format, raise an error
            if not match:
                raise ValueError("Unable to parse blame output")
            
            # Extract blame information from the matched groups
            commit_hash, author, timestamp, code = match.groups()
            
            # Return structured information as a dictionary
            return {
                'commit_hash': commit_hash,
                'author': author,
                'timestamp': timestamp,
                'code': code
            }

        except Exception as e:
            # Log the error and return an empty dictionary if something goes wrong
            # print('Error fetching blame for file:', e)
            return {}

    @staticmethod
    def get_pull_request_files(ends_with=None):
        """
        Get the list of files changed in the current pull request.
        Compares the current branch against the destination branch to find modified files.
        
        Args:
            ends_with: Optional file extension filter (e.g., '.csv')
            
        Returns:
            set: Set of file paths that were changed in the pull request
                 Returns empty set if error occurs or no PR environment
        """
        try:
            # Get destination branch from Bitbucket environment variables
            dest_branch = os.getenv('BITBUCKET_PR_DESTINATION_BRANCH')
            
            # Return empty set if not in a pull request environment
            if not dest_branch:
                return []

            # Compare current HEAD against the destination branch to find changed files
            git_command = ['git', 'diff', '--name-only', f'origin/{dest_branch}']
            result = subprocess.run(git_command, capture_output=True, text=True)

            # Check if git command executed successfully
            if result.returncode != 0:
                raise RuntimeError(f"Git diff command failed: {result.stderr.strip()}")

            # Split output into individual file paths and filter empty strings
            files = set([line.strip() for line in result.stdout.strip().split('\n') if line.strip()])
            
            # Apply file extension filter if specified
            if ends_with:
                files = {file for file in files if file.endswith(ends_with)}
            return files

        except Exception as e:
            # Log error and return empty set if git operations fail
            print(f"Error in get_pull_request_files: {e}")
            return []