#!/usr/bin/env python3

import subprocess
import sys
from pathlib import Path
import re
from collections import defaultdict, Counter
import os

# Add the repo root to sys.path
repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
sys.path.insert(0, repo_root)

from local_services import LocalSync

def get_file_diff(file_path):
	try:
		old = subprocess.check_output(['git', 'show', f'HEAD:{file_path}'], text=True).splitlines()
	except subprocess.CalledProcessError:
		old = []
	with open(file_path, encoding='utf-8') as f:
		new = f.read().splitlines()
	return old, new

def extract_changesets(lines):
	changesets = defaultdict(list)
	changeset_ids = []
	current_key = None
	for line in lines:
		match = re.match(r'\s*--\s*changeset\s+([\w@.\-]+):([\w\-]+)', line, re.IGNORECASE)
		if match:
			current_key = f"{match.group(1).lower()}:{match.group(2).lower()}"
			changeset_ids.append(current_key)
			changesets[current_key] = [line]
		elif current_key:
			if re.match(r'\s*--\s*changeset', line, re.IGNORECASE) or re.match(r'^\s*$', line):
				current_key = None
			else:
				changesets[current_key].append(line)
	
	# Detect duplicates
	duplicates = [k for k, v in Counter(changeset_ids).items() if v > 1]
	
	return changesets, duplicates

def get_staged_files():
	result = subprocess.run(
		["git", "diff", "--cached", "--name-only"],
		stdout=subprocess.PIPE,
		stderr=subprocess.PIPE,
		text=True,
	)
	if result.returncode != 0:
		print("Error getting staged files")
		sys.exit(1)
	return result.stdout.strip().splitlines()

def main():
	is_bad_commit = False
	is_vr_exists = False
	files = get_staged_files()
	vr_tree = {}
	local_aync = LocalSync()

	for file in files:
		if not file.endswith('.sql'):
			continue

		if not Path(file).exists():
			continue  # Skip deleted files

		if "runOnChange:true" in Path(file).read_text():
			continue

		client = file.split("/")[1]
		if client not in vr_tree:
			vr_tree[client] = []
		vr_tree[client].append(file)

		modified_changesets = []
		modified_changesets_files = []

		old_lines, new_lines = get_file_diff(file)		
		old_changesets, duplicates = extract_changesets(old_lines)
		new_changesets, duplicates = extract_changesets(new_lines)

		for key in old_changesets:
			if key in new_changesets and old_changesets[key] != new_changesets[key]:
				modified_changesets.append((file, key))
				if file not in modified_changesets_files:
					modified_changesets_files.append(file)


		#print(modified_changesets_files, duplicates)
		if len(duplicates) > 0 or len(modified_changesets_files) > 0:
			is_bad_commit = True
			print("-" * 75)
			print("File:", file)
			if len(duplicates) > 0:
				print("❌ Duplicate changesets")
			if len(modified_changesets_files) > 0:
				print("❌ Modified existing Liquibase changesets")

	if is_bad_commit:
		print("\n✅ Please fix above errors before commit", "\n")
		sys.exit(1)

	for client in vr_tree:
		vrs = local_aync.compile_schema(client, vr_tree[client])
		if len(vrs) > 0:
			is_vr_exists = True
			print("❌ {} schema vulnerabilities found".format(client))
			for vr in vrs:
				print(vr)
			print("-" * 75)

	if is_vr_exists:
		print("\n✅ Please fix above errors before commit", "\n")
		sys.exit(1)

	sys.exit(0)

if __name__ == "__main__":
	sys.exit(main())
