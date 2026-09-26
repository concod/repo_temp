import sys
import os
import copy
import traceback
import json
from pathlib import Path
import re

class LocalSync:
	def __init__(self):
		# IMPORTANT: Do NOT modify the must-have rules controlling the flow.
		# These rules are critical for the integrity and stability of the system.
		self.reverse_rules_map = {
			"DROP EXISTING PROCEDURE": {
				"regex": r'\b(DROP\s+PROCEDURE\s+IF\s+EXISTS)\b',
				"exclusions": []
			},
			"DROP EXISTING FUNCTION": {
				"regex": r'\b(DROP\s+FUNCTION\s+IF\s+EXISTS)\b',
				"exclusions": []
			},
			"DROP EXISTING VIEW": {
				"regex": r'\b(DROP\s+VIEW\s+IF\s+EXISTS)\b',
				"exclusions": [
					"database/arhaus/schemas/plan_smart/views/v_bu_op_master_1.sql",
					"database/arhaus/schemas/plan_smart/views/v_bu_lf_master_1.sql"
				]
			},
			"LB ENABLE": {
				"regex": r'\b(liquibase\s+formatted\s+sql)\b',
				"exclusions": []
			},
			"LB STRIP_COMMENTS": {
				"regex": r'\b(stripComments:false)\b',
				"exclusions": []
			},
			"LB STRIP_STMT": {
				"regex": r'\b(splitStatements:false)\b',
				"exclusions": []
			},
			"LB CHANGESET": {
				"regex": r'\b(changeset)\b',
				"exclusions": []
			},
			"LB RUN_ON_CHANGE": {
				"regex": r'\b(runOnChange:true|runAlways:true)\b',
				"exclusions": []
			}
		}

		self.rules_map = {
			"DROP TRIGGER": {
				"regex": "\\b(DROP\\s+TRIGGER)\\b",
				"exclusions": []
			},
			"DROP PROCEDURE": {
				"regex": "\\b(DROP\\s+PROCEDURE)\\b",
				"exclusions": []
			},
			"DROP FUNCTION": {
				"regex": "\\b(DROP\\s+FUNCTION)\\b",
				"exclusions": []
			},
			"DROP CONSTRAINT": {
				"regex": "\\b(DROP\\s+CONSTRAINT)\\b",
				"exclusions": []
			},
			"DROP COLUMN": {
				"regex": "\\b(DROP\\s+COLUMN)\\b",
				"exclusions": []
			},
			"DROP VIEW": {
				"regex": "\\b(DROP\\s+VIEW)\\b",
				"exclusions": []
			},
			"DROP TABLE": {
				"regex": "\\b(DROP\\s+TABLE)\\b",
				"exclusions": []
			},
			"DROP MATERIALIZED VIEW": {
				"regex": "\\b(DROP\\s+MATERIALIZED\\s+VIEW)\\b",
				"exclusions": []
			},
			"CASCADE": {
				"regex": "\\b(CASCADE)\\b",
				"exclusions": []
			},
			"GRANT": {
				"regex": "\\b(GRANT)\\b",
				"exclusions": []
			},
			"REVOKE": {
				"regex": "\\b(REVOKE)\\b",
				"exclusions": []
			},
			"ONLY": {
				"regex": "\\b(ONLY)\\b",
				"exclusions": []
			},
			"TRUNCATE": {
				"regex": "\\b(TRUNCATE)\\b",
				"exclusions": []
			},
			"LB RUN_ON_CHANGE": {
				"regex": "\\b(DROP\\s+FUNCTION)\\b",
				"exclusions": []
			}
		}

		self.bad_practices = {
			"ONLY": [],
			"GRANT": [],
			"REVOKE": [],
			"NO FILE": [],
			"DROP PROCEDURE": [],
			"NOT REQUIRED": [],
			"DROP FUNCTION": []
		}

	def validate_sql_file(self, f_path):
		if os.stat(f_path).st_size > 0:
			_sql = Path(f_path).read_text()
			return self.scan_sql_file(f_path, _sql)

	def detect_vulnerability(self, filename, sql_content_without_comments, rules, sql_content_with_comments):
		failed = []
		for rule in rules:
			check_in_comments = False
			if rule in self.rules_map:
				reg = self.rules_map[rule]["regex"]
			else:
				if rule == 'LB RUN_ON_CHANGE':
					reg = r'\b(runOnChange:true|runAlways:true)\b'
					check_in_comments = True
			if rule in self.rules_map:
				exc = self.rules_map[rule]["exclusions"]
			else:
				exc = []
			if filename not in exc:
				if check_in_comments:
					statements = re.findall(reg, sql_content_with_comments, re.IGNORECASE)
					if statements:
						for st in statements:
							if re.search(r'--.*' + re.escape(st), sql_content_with_comments):
								failed.append(rule)
				else:
					statements = re.findall(reg, sql_content_without_comments, re.IGNORECASE)
					if statements:
						for st in statements:
							if not re.search(r'--.*' + re.escape(st), sql_content_without_comments):
								failed.append(rule)
		failed = list(set(failed))
		failed.sort()
		return failed

	def detect_missing(self, filename, sql_content, rules):
		passed = []
		for rule in rules:
			reg = self.reverse_rules_map[rule]["regex"]
			exc = self.reverse_rules_map[rule]["exclusions"]
			if filename in exc:
				passed.append(rule)
			else:
				statements = re.findall(reg, sql_content, re.IGNORECASE)
				if statements:
					for st in statements:
						if not re.search(r'--.*' + re.escape(st), sql_content):
							passed.append(rule)
						else:
							if 'LB ' in rule:
								passed.append(rule)
		passed = list(set(passed))
		passed.sort()
		return passed

	def comment_replacer(self, match):
		start,mid,end = match.group(1,2,3)
		if mid is None:
			# single line comment
			return ''
		elif start is not None or end is not None:
			# multi line comment at start or end of a line
			return ''
		elif '\n' in mid:
			# multi line comment with line break
			return '\n'
		else:
			# multi line comment without line break
			return ' '

	def scan_sql_file(self, filename, sql_content):
		obj_type = filename.split("/")[-2]
		if obj_type == 'tables':
			mnr = ['DROP TRIGGER', 'DROP PROCEDURE', 'DROP FUNCTION', 'DROP COLUMN','DROP CONSTRAINT', 'DROP VIEW', 'DROP TABLE', 'DROP MATERIALIZED VIEW', 'GRANT', 'REVOKE', 'ONLY', 'TRUNCATE', 'LB RUN_ON_CHANGE']
			mhr = ['LB ENABLE', 'LB CHANGESET', 'LB STRIP_COMMENTS', 'LB STRIP_STMT']
		elif obj_type == 'triggers':
			mnr = ['DROP TRIGGER', 'DROP PROCEDURE', 'DROP FUNCTION', 'DROP COLUMN','DROP CONSTRAINT',  'DROP VIEW', 'DROP TABLE', 'DROP MATERIALIZED VIEW', 'CASCADE', 'GRANT', 'REVOKE', 'ONLY', 'TRUNCATE']
			mhr = ['LB ENABLE', 'LB CHANGESET', 'LB STRIP_COMMENTS', 'LB STRIP_STMT']
		elif obj_type == 'views':
			mnr = ['DROP TRIGGER', 'DROP PROCEDURE', 'DROP FUNCTION', 'DROP COLUMN','DROP CONSTRAINT',  'DROP TABLE', 'DROP MATERIALIZED VIEW', 'CASCADE', 'GRANT', 'REVOKE', 'ONLY', 'TRUNCATE']
			mhr = ['DROP EXISTING VIEW', 'LB ENABLE', 'LB CHANGESET', 'LB RUN_ON_CHANGE', 'LB STRIP_COMMENTS', 'LB STRIP_STMT']
		elif obj_type == 'materialized_views':
			mnr = ['DROP TRIGGER', 'DROP PROCEDURE', 'DROP FUNCTION', 'DROP COLUMN','DROP CONSTRAINT',  'DROP VIEW', 'DROP TABLE', 'GRANT', 'REVOKE', 'ONLY', 'TRUNCATE']
			mhr = ['LB ENABLE', 'LB CHANGESET', 'LB RUN_ON_CHANGE', 'LB STRIP_COMMENTS', 'LB STRIP_STMT']
		elif obj_type == 'procedures':
			mnr = ['DROP TRIGGER', 'DROP FUNCTION', 'DROP COLUMN','DROP CONSTRAINT',  'DROP VIEW', 'DROP TABLE', 'DROP MATERIALIZED VIEW', 'CASCADE', 'GRANT', 'REVOKE', 'ONLY', 'TRUNCATE']
			mhr = ['DROP EXISTING PROCEDURE', 'LB ENABLE', 'LB CHANGESET', 'LB RUN_ON_CHANGE', 'LB STRIP_COMMENTS', 'LB STRIP_STMT']
		elif obj_type == 'functions':
			mnr = ['DROP TRIGGER', 'DROP PROCEDURE', 'DROP COLUMN', 'DROP CONSTRAINT', 'DROP VIEW', 'DROP TABLE', 'DROP MATERIALIZED VIEW', 'CASCADE', 'GRANT', 'REVOKE', 'ONLY', 'TRUNCATE']
			mhr = ['DROP EXISTING FUNCTION', 'LB ENABLE', 'LB CHANGESET', 'LB RUN_ON_CHANGE', 'LB STRIP_COMMENTS', 'LB STRIP_STMT']
		elif obj_type == 'types':
			mnr = ['DROP TRIGGER', 'DROP PROCEDURE', 'DROP COLUMN', 'DROP CONSTRAINT', 'DROP VIEW', 'DROP TABLE', 'DROP MATERIALIZED VIEW', 'CASCADE', 'GRANT', 'REVOKE', 'ONLY', 'TRUNCATE', 'LB RUN_ON_CHANGE']
			mhr = ['LB ENABLE', 'LB CHANGESET', 'LB STRIP_COMMENTS', 'LB STRIP_STMT']

		mnr.sort()
		mhr.sort()

		comment_re = re.compile(
			r'(^)?[^\S\n]*/(?:\*(.*?)\*/[^\S\n]*|/[^\n]*)($)?',
			re.DOTALL | re.MULTILINE
		)
		clean_sql_content = comment_re.sub(self.comment_replacer, sql_content)

		vulnerabilities = self.detect_vulnerability(filename, re.sub('^\s*--.*\n?', '', clean_sql_content, flags=re.MULTILINE), mnr, clean_sql_content)
		#if len(vulnerabilities) > 0:
		#	print(filename, vulnerabilities)

		missings = self.detect_missing(filename, clean_sql_content, mhr)
		#if missings != mhr:
		#	print(filename, [i for i in mhr + missings if i not in mhr or i not in missings])

		return {
			"filename": filename,
			"vulnerabilities": vulnerabilities,
			"missing": [i for i in mhr + missings if i not in mhr or i not in missings]
		}

	def compile_schema(self, client, files):
		detect_some_bad_practices = False
		for f in os.scandir("database"):
			if f.is_dir():
				if os.path.isfile("{}/exceptions.json".format(f.path)):
					if f.path.split('/')[-1] in client:
						ef = open("{}/exceptions.json".format(f.path), "r")
						cc = json.loads(ef.read())
						for c in cc:
							if c not in self.rules_map:
								self.rules_map[c] = {
									"regex": "",
									"exclusions": []
								}
								#if c not in list(rules_map_parellel.keys()):
								#	rules_map_parellel[c] = {
								#		"regex": "",
								#		"exclusions": []
								#	}
							self.rules_map[c]["regex"] = cc[c]["regex"]
							#rules_map_parellel[c]["regex"] = cc[c]["regex"]
							for e in cc[c]["exclusions"]:
								if os.path.isfile(e):
									self.rules_map[c]["exclusions"].append(e)
									# Bad Practices cases
									ctype = e.split('/')[-2]
									cfile = e.split('/')[-1]
									if c == 'ONLY' and ctype == 'tables':
										self.bad_practices[c].append(e)
										detect_some_bad_practices = True
									if c == 'GRANT':
										self.bad_practices[c].append(e)
										detect_some_bad_practices = True
									if c == 'REVOKE':
										self.bad_practices[c].append(e)
										detect_some_bad_practices = True
									if c == 'DROP PROCEDURE' and ctype == 'procedures':
										self.bad_practices[c].append(e)
										detect_some_bad_practices = True
									if c == 'DROP FUNCTION' and ctype == 'functions':
										self.bad_practices[c].append(e)
										detect_some_bad_practices = True
									if cfile == 'custom_migration.sql':
										self.bad_practices["NOT REQUIRED"].append(e)
										detect_some_bad_practices = True
								else:
									self.bad_practices["NO FILE"].append(e)
									detect_some_bad_practices = True

		if detect_some_bad_practices:
			bad_practices_errors = []
			for bpt in self.bad_practices:
				for bptf in self.bad_practices[bpt]:
					bad_practices_errors.append("{} - block_start1 vulnerability ({})block_end".format(bptf, bpt))
			return bad_practices_errors

		# Scan sql files
		errors = []
		for st in files:
			vr = self.validate_sql_file(st)
			if len(vr['vulnerabilities']) > 0 or len(vr['missing']) > 0:
				#for v in vr['vulnerabilities']:
				#	rules_map_parellel[v]["exclusions"].append(vr["filename"])
				msg = [
					("{} {} ({})".format(len(vr['vulnerabilities']), ("vulnerability" if len(vr['vulnerabilities']) == 1 else "vulnerabilities"), ", ".join(vr['vulnerabilities'])) if len(vr['vulnerabilities']) > 0 else ""),
					("{} {} ({})".format(len(vr['missing']), ("missing dependency" if len(vr['missing']) == 1 else "missing dependencies"), ", ".join(vr['missing'])) if len(vr['missing']) > 0 else "")
				]
				msg = "{}, {}".format(msg[0], msg[1]) if msg[0] != "" and msg[1] != "" else "{}".format(msg[0] if msg[0] != "" else msg[1])
				errors.append("{} - block_start{}block_end".format(vr['filename'], msg))
		return errors
