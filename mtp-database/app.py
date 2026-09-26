from functools import wraps
from markupsafe import escape
from flask import Flask, abort, send_file, render_template, redirect, url_for, request, session, flash
from flask_session_captcha import FlaskSessionCaptcha
from authlib.integrations.flask_client import OAuth
import glob
from pathlib import Path
import traceback
import os
import load_env
from services import PGSync
import json
import re
import psycopg2
import csv
import secrets
import string
import requests
import sys
#from Crypto.Cipher import AES
from datetime import date, timedelta, datetime
from io import StringIO
import codecs
from google.cloud import bigquery
# from dotenv import load_dotenv

app = Flask(__name__)
app.secret_key = os.environ.get('SECRET')

app.config['CAPTCHA_ENABLE'] = True
app.config['CAPTCHA_LENGTH'] = 4
app.config['CAPTCHA_WIDTH'] = 160
app.config['CAPTCHA_HEIGHT'] = 60
app.config['SESSION_TYPE'] = 'filesystem'
captcha = FlaskSessionCaptcha(app)

oauth = OAuth(app)

# Authentication decorator
def login_required(f):
	@wraps(f)
	def decorator(*args, **kwargs):
		if session.get('loggedin') == True:
			return f(*args, **kwargs)
		else:
			return redirect(url_for('login'))
	return decorator

def g_login_required(f):
	@wraps(f)
	def decorator(*args, **kwargs):
		if session.get('g_loggedin') == True:
			return f(*args, **kwargs)
		else:
			return redirect(url_for('login'))
	return decorator

@app.route('/switch/<client>')
@login_required
def switch_client(client):
	session['client'] = client
	return redirect(url_for('hello'))

@app.route('/download/<path>/')
@login_required
def downloadFile(path):
	return send_file(path.replace('___', '/'), as_attachment=True)

@app.route('/', methods=['GET', 'POST'])
@login_required
def hello():
	#pg_sync_target = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
	#x = pg_sync_target.execute_query("""
	#	drop table if exists genai.ada_module_insights_metadata;
	#	drop table if exists genai.ada_table_metadata;
	#	drop table if exists genai.assortsmart_module_insights_metadata;
	#	drop table if exists genai.assortsmart_table_metadata;
	#	drop table if exists genai.inventorysmart_module_insights_metadata;
	#	drop table if exists genai.inventorysmart_table_metadata;
	#	drop table if exists genai.plansmart_module_insights_metadata;
	#	drop table if exists genai.plansmart_table_metadata;
	#	drop table if exists genai.pricesmart_module_insights_metadata;
	#	drop table if exists genai.pricesmart_table_metadata;
	#	delete
	#	FROM liquibase.databasechangelog where filename
	#	in ('database/schemas/genai/tables/ada_module_insights_metadata.sql', 'database/schemas/genai/tables/ada_table_metadata.sql', 'database/schemas/genai/tables/assortsmart_module_insights_metadata.sql', 'database/schemas/genai/tables/assortsmart_table_metadata.sql', 'database/schemas/genai/tables/inventorysmart_module_insights_metadata.sql', 'database/schemas/genai/tables/inventorysmart_table_metadata.sql', 'database/schemas/genai/tables/plansmart_module_insights_metadata.sql', 'database/schemas/genai/tables/plansmart_table_metadata.sql', 'database/schemas/genai/tables/pricesmart_module_insights_metadata.sql', 'database/schemas/genai/tables/pricesmart_table_metadata.sql');
	#""")
	#print(session.get('client'), os.environ["ENV"], x)
	output = None
	file_name = None
	pg_sync_target = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))

	output = None
	file_name = None
	if request.method == 'POST':
		pg_sync_target = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))

		if request.form['action'] == 'generate_release_file':
			files_list = request.form['files'].replace('"', "").replace(" ", "\n").splitlines()
			files = []
			common_files = []
			client_files = []
			client = session.get('client')
			release_no = request.form['release_no']
			non_replaceable_files = ""
			replaceable_files = ""
			non_replaceable_files_list = []
			replaceable_files_list = []
			
			for file in files_list:
				file = file.strip()
				if os.path.isfile(file) and os.stat(file).st_size > 0 and file.lower().endswith('.sql'): # If file exists
					schema = (file.split('/')[3] if file.split('/')[1] != 'schemas' else file.split('/')[2]) #get schema name
					if schema in pg_sync_target.schemas:
						if file.split('/')[1] == 'schemas':
							search_client_file = 'database/' + client + '/schemas' + '/'.join(file.split('/')[-3:])
							if not (os.path.isfile(search_client_file) and os.stat(search_client_file).st_size > 0):
								common_files.append(file)
						if file.split('/')[1] == client:
							client_files.append(file)
			files = client_files + common_files

			for file in files:
				filename = file.split('/')[-1]
				if file.split('/')[-2] == 'functions' or file.split('/')[-2] == 'procedures':
					if filename in replaceable_files_list:
						pass
					else:
						replaceable_files_list.append(filename)
						replaceable_files += """\n\t<include file="{}" relativeToChangelogFile="false" />""".format(file)
				else:
					if filename in non_replaceable_files_list:
						pass
					else:
						non_replaceable_files_list.append(filename)
						non_replaceable_files += """\n\t<include file="{}" relativeToChangelogFile="false" />""".format(file)

			if replaceable_files != "":
				filename = "releases/{}/release {}/replaceable_files.xml".format(client, release_no)
				os.makedirs(os.path.dirname(filename), exist_ok=True)
				f = open(filename, "w")
				f.write("""<?xml version="1.0" encoding="UTF-8"?>   
<databaseChangeLog
   xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xmlns:pro="http://www.liquibase.org/xml/ns/pro"
   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
	  http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.1.xsd
	  http://www.liquibase.org/xml/ns/pro 
	  http://www.liquibase.org/xml/ns/pro/liquibase-pro-4.1.xsd">""" + replaceable_files + """
</databaseChangeLog>""")
				f.close()

			if non_replaceable_files != "":
				filename = "releases/{}/release {}/non_replaceable_files.xml".format(client, release_no)
				os.makedirs(os.path.dirname(filename), exist_ok=True)
				f = open(filename, "w")
				f.write("""<?xml version="1.0" encoding="UTF-8"?>   
<databaseChangeLog
   xmlns="http://www.liquibase.org/xml/ns/dbchangelog"
   xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
   xmlns:pro="http://www.liquibase.org/xml/ns/pro"
   xsi:schemaLocation="http://www.liquibase.org/xml/ns/dbchangelog
	  http://www.liquibase.org/xml/ns/dbchangelog/dbchangelog-4.1.xsd
	  http://www.liquibase.org/xml/ns/pro 
	  http://www.liquibase.org/xml/ns/pro/liquibase-pro-4.1.xsd">""" + non_replaceable_files + """
</databaseChangeLog>""")
				f.close()
		if request.form['action'] == 'changelog-sync' or request.form['action'] == 'update' or request.form['action'] == 'validate' or request.form['action'] == 'updateSQL':
			output = pg_sync_target.exec_shell_lb(request.form['action'], request.form['release_file'])
			if request.form['action'] in ['changelog-sync', 'update', 'validate']:
				output = output.stderr.decode("utf-8")
			else:
				if os.stat(output).st_size > 0:
					output = Path(output).read_text()
					file_name = output
	return render_template('dashboard.html', client=session.get('client'), glob=glob, Path=Path, output=output, session=session, inputs=request.form, file_name=file_name)

@app.route('/reown-objects')
@login_required
def reown():
	pg_sync_target_admin = PGSync(session.get('client'), os.environ["ENV"], False, True)
	pg_sync_target = PGSync(session.get('client'), os.environ["ENV"], False, False)
	owner_name = os.environ["PROJECT_ID"] + '-' + ('dev' if os.environ["ENV"] == 'dev' else 'admin')
	msg = ""
	owneres = pg_sync_target.get_results("""select owner_name, string_agg(dml, ' ') as dmls from (
		select 
		*,
		--ChangeObjectsOwnerShip(
		case when type = 'FUNCTION' then
		'ALTER FUNCTION ' || name || ' OWNER TO "{owner_name}";'
		when type = 'PROCEDURE' then
		'ALTER PROCEDURE ' || quote_ident(schema_name) || '.' || name || ' OWNER TO "{owner_name}";'
		when type IN ('SEQUENCE', 'BASE TABLE', 'PARENT TABLE', 'VIEW', 'MATERIALIZED VIEW') then
		'ALTER TABLE ' || quote_ident(schema_name) || '.' || quote_ident(name) || ' owner TO "{owner_name}";'
		when type = 'DATATYPE' then
		'ALTER TYPE ' || quote_ident(schema_name) || '.' || quote_ident(name) || ' OWNER TO "{owner_name}";'
		else null end as dml
		--) as dml
		from (
		-- r = ordinary table, i = index, S = sequence, t = TOAST table, v = view, m = materialized view, c = composite type, f = foreign table, p = partitioned table, I = partitioned index
		SELECT 
			n.nspname AS schema_name,
			c.relname::text AS name,
			case
				when c.relkind = 'S' then 'SEQUENCE'
				when c.relkind = 'r' then 'BASE TABLE'
				when c.relkind = 'p' then 'PARENT TABLE'
				when c.relkind = 'i' then 'INDEX'
				when c.relkind = 'I' then 'CHILD INDEX'
				when c.relkind = 'm' then 'MATERIALIZED VIEW'
				when c.relkind = 'v' then 'VIEW'
				when c.relkind = 'c' then 'DATATYPE'
				else c.relkind::varchar
			end as type,
			pg_get_userbyid(c.relowner) AS owner_name
		  FROM pg_class c
		  JOIN pg_namespace n ON n.oid = c.relnamespace
		where n.nspname not in('pg_toast', 'pg_catalog', 'information_schema')
		union all
		select
			n.nspname AS schema_name,
			replace(p.oid::regprocedure::text, n.nspname || '.', '') as name,
			'PROCEDURE' as type,
			pg_get_userbyid(proowner) as owner_name
		from
			pg_proc p
		join pg_namespace n on
			n.oid = p.pronamespace
		where
			n.nspname not in('pg_toast', 'pg_catalog', 'information_schema')
			and prokind = 'p'
		--  and probin is null
		union all
		select
			n.nspname AS schema_name,
			p.oid::regprocedure::text as name,
			'FUNCTION' as type,
			pg_get_userbyid(proowner) as owner_name
		from
			pg_proc p
		join pg_namespace n on
			n.oid = p.pronamespace
		where
			n.nspname not in('pg_toast', 'pg_catalog', 'information_schema')
			and prokind = 'f'
		--  and probin is null
		 ) x 
		 where owner_name != '{owner_name}'
		-- and schema_name = 'public'
		 and type != 'INDEX'
		 and type != 'CHILD INDEX'
		 and type != 'SEQUENCE'
		-- and type != 'VIEW'
		--group by 1
		--order by 2 desc
		 ORDER BY POSITION(type IN 'BASE TABLE, PARENT TABLE, MATERIALIZED VIEW, DATATYPE, SEQUENCE, VIEW, FUNCTION, PROCEDURE') desc
		 ) x where owner_name not in('cloudsqladmin') group by owner_name""".format(owner_name=owner_name))
	if len(owneres) > 0:
		x = pg_sync_target_admin.execute_query(""" revoke "{owner_name}" from "postgres"; grant "postgres" to "{owner_name}"; """.format(owner_name=owner_name))
		for o in owneres:
			msg = msg + "owner: " + o['owner_name'] + "<br/>"
			y1 = pg_sync_target_admin.execute_query(""" revoke "{owner_name}" from "{old_owner_name}"; grant "{old_owner_name}" to "{owner_name}"; """.format(old_owner_name=o['owner_name'], owner_name=owner_name))
			y2 = pg_sync_target.execute_query(o['dmls'])
			y3 = pg_sync_target_admin.execute_query(""" revoke "{old_owner_name}" from "{owner_name}"; grant "{owner_name}" to "{old_owner_name}"; """.format(old_owner_name=o['owner_name'], owner_name=owner_name))
			msg = msg + "status: " + str(x) + " " + str(y1) + " " + str(y2) + " " + str(y3) + "<br/>"
		z = pg_sync_target_admin.execute_query(""" revoke "postgres" from "{owner_name}"; """.format(owner_name=owner_name))
		msg = msg + "z: " + str(z) + "<br/>"
	return render_template('msg.html', client=session.get('client'), session=session, msg=msg)

@app.route('/compile')
@login_required
def compile():
	pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], True, False)
	res = pg_sync_source.compile_schema(session.get('client'))
	if len(res) > 0:
		msg = "Error in compilation with the below files"
	else:
		msg = "XML ready to download"
	return render_template('compile.html', client=session.get('client'), glob=glob, Path=Path, session=session, msg=msg, res=res)

####@app.route('/manual/', methods=['GET', 'POST'])
####@login_required
####def manual():
####	backup_msg = ""
####	restore_msg = ""
####	cleanup_msg = ""
####	info_msg = ""
####	if request.method == 'POST':
####		pg_sync_target = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
####		if request.form['action'] == 'backup':
####			files_list = request.form['backup_tables'].replace('"', "").replace(" ", "\n").splitlines()
####			for file in files_list:
####				file = file.strip()
####				sc = file.split('.')[0]
####				tbl = file.split('.')[1]
####				res = pg_sync_target.execute_safe_query("""
####					DO $do$
####						declare
####							_schema text := '{}';
####							_table text := '{}';
####						begin
####							execute 'create table "' || _schema || '"."' || _table || '_backup" as select * from "' || _schema || '"."' || _table || '";';
####							execute 'delete
####					FROM liquibase.databasechangelog
####					where filename like ''%/' || _schema || '/tables/' || _table || '.sql'';';
####							execute 'drop table "' || _schema ||'"."' || _table || '";';
####						END;
####					$do$;
####				""".format(sc, tbl))
####				if not res:
####					backup_msg += "{}.{}".format(sc, tbl)
####		if request.form['action'] == 'restore':
####			files_list = request.form['restore_tables'].replace('"', "").replace(" ", "\n").splitlines()
####			for file in files_list:
####				file = file.strip()
####				sc = file.split('.')[0]
####				tbl = file.split('.')[1]
####				res = pg_sync_target.execute_safe_query("""
####					DO $do$
####						declare
####							_schema text := '{}';
####							_table text := '{}';
####							_cols text;
####							_rc int := 0;
####						begin
####							select 
####							string_agg(column_name, ', ') into _cols
####							from 
####							  information_schema."columns" c 
####							where 
####							  table_name = _table
####							  and table_schema = _schema
####							;
####							execute 'select count(1) from "'  || _schema || '"."' || _table || '_backup"' into _rc;
####							if _rc > 0 then
####								execute 'insert into "' || _schema || '"."' || _table || '"(' || _cols || ') select ' || _cols || ' from "' || _schema || '"."' || _table || '_backup";';
####							end if;
####							execute 'drop table "' || _schema ||'"."' || _table || '_backup";';
####						END;
####					$do$;
####				""".format(sc, tbl))
####				if not res:
####					restore_msg += "{}.{}".format(sc, tbl)
####		if request.form['action'] == 'cleanup':
####			files_list = request.form['cleanup_tables'].replace('"', "").replace(" ", "\n").splitlines()
####			for file in files_list:
####				file = file.strip()
####				if file != '':
####					res = pg_sync_target.execute_safe_query("""
####						delete
####						from
####							liquibase.databasechangelog
####						where
####							filename like '%{}%';
####					""".format(file))
####					if not res:
####						cleanup_msg += "{}.{}".format(file)
####		if request.form['action'] == 'info':
####			info_msg = request.form['info_tables']
####			files_list = request.form['info_tables'].replace('"', "").replace(" ", "\n").splitlines()
####			for file in files_list:
####				file = file.strip()
####				sc = file.split('.')[0]
####				tbl = file.split('.')[1]
####				res = pg_sync_target.get_results("""
####					select '{}.{}' as tbl union all SELECT
####						ns.nspname || '.' || t.relname as tbl
####					FROM
####						pg_constraint c
####					LEFT JOIN pg_class t ON
####						c.conrelid = t.oid
####					LEFT JOIN pg_class t2 ON
####						c.confrelid = t2.oid
####					LEFT JOIN pg_attribute a ON
####						t.oid = a.attrelid
####						AND a.attnum = c.conkey[1]
####					LEFT JOIN pg_attribute a2 ON
####						t2.oid = a2.attrelid
####						AND a2.attnum = c.confkey[1]
####					LEFT JOIN pg_catalog.pg_namespace AS ns
####					  ON
####						t.relnamespace = ns.oid
####					WHERE
####						t2.relname = '{}'
####						AND c.contype = 'f';
####				""".format(sc, tbl, tbl))
####				info = []
####				for r in res:
####					info.append("select '{}' as tbl, count(1) as cnt from {}".format(r['tbl'], r['tbl']))
####				info = ' union all '.join(info)
####				res = pg_sync_target.get_results(info)
####				for r in res:
####					info_msg += "\n{} - {}".format(r['tbl'], str(r['cnt']))
####	return render_template('manual.html', client=session.get('client'), session=session, restore_msg=restore_msg, backup_msg=backup_msg, cleanup_msg=cleanup_msg, info_msg=info_msg, inputs=request.form)

def clean_lb_output(inp, typ):
	output = {}

	out = []
	for col in inp["{} Column(s)".format(typ)]:
		if typ == 'Changed' and 'changed from' in col:
			pass
		elif col.split('.')[1] in inp["{} Table(s)".format(typ)] or col.split('.')[1] in inp["{} View(s)".format(typ)]:
			pass
		else:
			out.append((col.split('.')[1]).lstrip())
	output["{} Column(s)".format(typ)] = sorted(list(set(out)))

	out = []
	for col in inp["{} Unique Constraint(s)".format(typ)]:
		if typ == 'Changed' and 'changed from' in col:
			pass
		elif (col.split(' on ')[1]).split('(')[0] in inp["{} Table(s)".format(typ)]:
			pass
		else:
			out.append(col.lstrip())
	output["{} Unique Constraint(s)".format(typ)] = sorted(list(set(out)))

	out = []
	for col in inp["{} Foreign Key(s)".format(typ)]:
		if typ == 'Changed' and 'changed from' in col:
			pass
		elif (col.split('(')[1]).split('[')[0] in inp["{} Table(s)".format(typ)]:
			pass
		else:
			out.append(col.lstrip())
	output["{} Foreign Key(s)".format(typ)] = sorted(list(set(out)))

	out = []
	for col in inp["{} Index(s)".format(typ)]:
		if typ == 'Changed' and 'changed from' in col:
			pass
		elif (col.split('.')[1]).split('(')[0] in inp["{} Table(s)".format(typ)]:
			pass
		else:
			out.append(col.lstrip())
	output["{} Index(s)".format(typ)] = sorted(list(set(out)))

	out = []
	for col in inp["{} Primary Key(s)".format(typ)]:
		if typ == 'Changed' and 'changed from' in col:
			pass
		elif (col.split('.')[1]).split('(')[0] in inp["{} Table(s)".format(typ)]:
			pass
		else:
			out.append(col.lstrip())
	output["{} Primary Key(s)".format(typ)] = sorted(list(set(out)))

	for key in inp:
		if key in output.keys():
			pass
		else:
			output[key] = []
		if key not in ["{} Column(s)".format(typ), "{} Unique Constraint(s)".format(typ), "{} Foreign Key(s)".format(typ), "{} Index(s)".format(typ), "{} Primary Key(s)".format(typ)]:
			for val in inp[key]:
				output[key].append(val)

	return output

@app.route('/diff/<schema>')
@login_required
def diff(schema):
	missing = {}
	unexpected = {}
	changed = {}
	output = ""
	pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], True, session.get('is_super_user'))
	pg_sync_target = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
	
	if schema != 'na':
		file_name = pg_sync_target.exec_shell_lb_diff(pg_sync_source, schema)
		print("file_name:", file_name)
		#file_name = "/Users/ashishgupta/5f4c57f3-300a-47c5-87e0-fec2f03c2682.diff"

		if os.stat(file_name).st_size > 0:
			output = Path(file_name).read_text()
			last_iteration = ''
			skip = True
			for i in output.split("\n"):
				if 'Missing Column' in i:
					skip = False
				if skip:
					pass
				else:
					if 'Missing' in i or 'Unexpected' in i or 'Changed' in i:
						if 'Missing' in i:
							if 'NONE' in i.split(':')[1]:
								missing[i.split(':')[0]] = []
							else:
								missing[i.split(':')[0]] = []
								last_iteration = 'missing'
								last_iteration_key = i.split(':')[0]
						if 'Unexpected' in i:
							if 'NONE' in i.split(':')[1]:
								unexpected[i.split(':')[0]] = []
							else:
								unexpected[i.split(':')[0]] = []
								last_iteration = 'unexpected'
								last_iteration_key = i.split(':')[0]
						if 'Changed' in i:
							if 'NONE' in i.split(':')[1]:
								changed[i.split(':')[0]] = []
							else:
								changed[i.split(':')[0]] = []
								last_iteration = 'changed'
								last_iteration_key = i.split(':')[0]
					if re.match(r'[ \t]', i):
						if last_iteration == 'missing':
							if 'Table(s)' in last_iteration_key or 'View(s)' in last_iteration_key:
								missing[last_iteration_key].append(i.lstrip())
							else:
								missing[last_iteration_key].append(i)
						if last_iteration == 'unexpected':
							if 'Table(s)' in last_iteration_key or 'View(s)' in last_iteration_key:
								unexpected[last_iteration_key].append(i.lstrip())
							else:
								unexpected[last_iteration_key].append(i)
						if last_iteration == 'changed':
							if 'Table(s)' in last_iteration_key or 'View(s)' in last_iteration_key:
								changed[last_iteration_key].append(i.lstrip())
							else:
								changed[last_iteration_key].append(i)
			
			missing = clean_lb_output(missing, 'Missing')
			unexpected = clean_lb_output(unexpected, 'Unexpected')
			changed = clean_lb_output(changed, 'Changed')

		else:
			output = file_name
		#print(output)
	return render_template('diff.html', client=session.get('client'), schemas=pg_sync_target.schemas, glob=glob, Path=Path, missing=missing, unexpected=unexpected, changed=changed, output=output, session=session, inputs=request.form, json=json, schema=schema)

@app.route('/sps_dump/')
@login_required
def sps_dump():
	pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
	zip_path = pg_sync_source.generate_sp_dump()
	return send_file(zip_path, as_attachment=True)

@app.route('/guser_login', methods=['GET', 'POST'])
def guser_login():
    CONF_URL = 'https://accounts.google.com/.well-known/openid-configuration'
    oauth.register(
        name='google',
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        server_metadata_url=CONF_URL,
        client_kwargs={
            'scope': 'openid email profile'
        }
    )
    redirect_uri = url_for('guser_login_redirect', _external=True)
    return oauth.google.authorize_redirect(redirect_uri)

@app.route('/guser_login_redirect/')
def guser_login_redirect():
	env = os.environ.get('ENV')
	try:
		token = oauth.google.authorize_access_token()
		#print(json.dumps(token))
		session['g_loggedin'] = True
		session['name'] = token["userinfo"]["name"]
		session['picture'] = token["userinfo"]["picture"]
		#session['id'] = tdb_id
		session['g_username'] = token["userinfo"]["email"]
		#session['client'] = request.form['client']
		session['env'] = env
		#session['is_super_user'] = bool(request.form.get('is_super_user'))
		#session['schemas'] = list(json.loads(os.environ.get('SCHEMAS')).keys())
		return redirect(url_for('g_home'))
	except Exception as e:
		trace_back = traceback.format_exc()
		#error = str(e) + "" + str(trace_back)
		print("Operational error in login:", e)
		error = "Error in login"
	return render_template('login.html', error=error)

@app.route('/g_logout')
def g_logout():
	session.pop('g_loggedin', None)
	session.pop('g_username', None)
	session.pop('name', None)
	session.pop('picture', None)
	session.pop('env', None)
	session.pop('client', None)
	return redirect(url_for('login'))

def get_db_list_from_env():
	db_list = []
	for name, value in os.environ.items():
		if name.endswith("_" + session.get('env')):
			value = json.loads(value)
			db_list.append({
				"db_name": value["db_name"],
				"client": name.replace('_' + session.get('env'), '')
			})
	return db_list

@app.route('/g_home')
@g_login_required
def g_home():
	return render_template('g_home.html', session=session, db_list=get_db_list_from_env())

@app.route('/g_switch_db/<client>')
@g_login_required
def g_switch_db(client):
	session['client'] = client
	return redirect(url_for('g_home'))

@app.route('/g_locks')
@g_login_required
def g_locks():
	pass

@app.route('/g_sessions')
@g_login_required
def g_sessions():
	pass

@app.route('/g_change_password')
@g_login_required
def g_change_password():
	pass

@app.route('/login', methods=['GET', 'POST'])
def login():
	error = None
	if request.method == 'POST' and captcha.validate():
		env = os.environ.get('ENV')
		tdb_id = "{}_{}".format(request.form['client'], env)
		pg_sync_target = PGSync(request.form['client'], env, False, bool(request.form.get('is_super_user')), request.form['username'], request.form['password'])
		# print(pg_sync_target)
		try:
			pg_sync_target.connection_check()
			session['loggedin'] = True
			session['id'] = tdb_id
			session['username'] = request.form['username']
			session['client'] = request.form['client']
			session['env'] = env
			session['is_super_user'] = bool(request.form.get('is_super_user'))
			session['schemas'] = list(json.loads(os.environ.get('SCHEMAS')).keys())
			session['schemas'].sort()
			#session['projects'] = list(set(os.environ.get('PROJECTS').split(",")))
			return redirect(url_for('hello'))
		except Exception as e:
			trace_back = traceback.format_exc()
			#error = str(e) + "" + str(trace_back)
			print("Operational error in login:", e)
			error = "Check the credentials"
	return render_template('login.html', error=error)

@app.route('/logout')
def logout():
	session.pop('loggedin', None)
	session.pop('id', None)
	session.pop('username', None)
	session.pop('client', None)
	session.pop('env', None)
	session.pop('is_super_user', None)
	session.pop('schemas', None)
	#session.pop('projects', None)
	return redirect(url_for('login'))

@app.route('/roles')
@login_required
def roles():
	pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
	roles = pg_sync_source.get_results("""
	SELECT 
	  r.rolname, 
	  r.rolsuper, 
	  r.rolinherit, 
	  r.rolcreaterole, 
	  r.rolcreatedb, 
	  r.rolcanlogin, 
	  r.rolconnlimit, 
	  r.rolvaliduntil::date as rolvaliduntil, 
	  ARRAY(
		SELECT 
		  b.rolname 
		FROM 
		  pg_catalog.pg_auth_members m 
		  JOIN pg_catalog.pg_roles b ON (m.roleid = b.oid) 
		WHERE 
		  m.member = r.oid
	  ) as memberof
	  --, r.rolreplication
	  --, r.rolbypassrls
	FROM 
	  pg_catalog.pg_roles r 
	WHERE 
	  r.rolname !~ '^pg_' 
	  and r.rolname !~ '^cloudsql' 
	   and r.rolname !~ '^alloy' 
	ORDER BY 
	  1;
	""")
	#print(roles)
	return render_template('permissions.html', client=session.get('client'), roles=roles, session=session, inputs=request.form, str=str)

@app.route('/create_default_roles')
@login_required
def create_default_roles():
	if session.get('is_super_user'):
		pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], False, True)
		status = pg_sync_source.create_roles()
		if status:
			status = pg_sync_source.create_db()
			if status:
				pg_sync_target = PGSync(session.get('client'), os.environ["ENV"], False, False)
				status = pg_sync_target.init_db()
				if status:
					status = pg_sync_target.set_default_permissions() #connect, usage
					if status:
						status = pg_sync_source.set_default_role_mapping()
						if status:
							print("All done")
						else:
							print("Error in set default role mapping")
					else:
						print("Error in set default permissions")
				else:
					print("Error in db init.")
			else:
				print("Error in create db.")
		else:
			print("Error in create roles.")
	else:
		print("Must be admin for this.")
	return redirect(url_for('roles'))

#@app.route('/permissions')
#@login_required
#def permissions():
#	pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
#	roles = pg_sync_source.get_results("""
#	SELECT 
#	  r.rolname, 
#	  r.rolsuper, 
#	  r.rolinherit, 
#	  r.rolcreaterole, 
#	  r.rolcreatedb, 
#	  r.rolcanlogin, 
#	  r.rolconnlimit, 
#	  r.rolvaliduntil, 
#	  ARRAY(
#		SELECT 
#		  b.rolname 
#		FROM 
#		  pg_catalog.pg_auth_members m 
#		  JOIN pg_catalog.pg_roles b ON (m.roleid = b.oid) 
#		WHERE 
#		  m.member = r.oid
#	  ) as memberof
#	  --, r.rolreplication
#	  --, r.rolbypassrls
#	FROM 
#	  pg_catalog.pg_roles r 
#	WHERE 
#	  r.rolname !~ '^pg_' 
#	  and r.rolname !~ '^cloudsql' 
#	ORDER BY 
#	  1;
#	""")
#	#print(roles)
#	prevs = pg_sync_source.get_results("""
#		SELECT 
#		  coalesce(
#			y.main, 
#			concat(table_schema, '.', table_name)
#		  ) as tbl, 
#		  array_agg(distinct grantor) as grantor, 
#		  array_agg(distinct grantee) as grantee, 
#		  array_agg(distinct privilege_type) as privilege_type 
#		FROM 
#		  information_schema.table_privileges x 
#		  left join (
#			SELECT 
#			  concat(
#				nmsp_parent.nspname, '.', parent.relname
#			  ) AS main, 
#			  concat(
#				nmsp_child.nspname, '.', child.relname
#			  ) AS part 
#			FROM 
#			  pg_inherits 
#			  JOIN pg_class parent ON pg_inherits.inhparent = parent.oid 
#			  JOIN pg_class child ON pg_inherits.inhrelid = child.oid 
#			  JOIN pg_namespace nmsp_parent ON nmsp_parent.oid = parent.relnamespace 
#			  JOIN pg_namespace nmsp_child ON nmsp_child.oid = child.relnamespace
#		  ) y on concat(table_schema, '.', table_name) = y.part 
#		where 
#		  table_schema in('{schemas}') 
#		  and table_schema not in('public') 
#		  and table_catalog = '{db_name}' 
#		  and (
#			grantee not in ({allowed_users}) 
#			or grantor != '{user}'
#		  ) 
#		  and privilege_type not in('SELECT') 
#		group by 
#		  1;
#	""".format(db_name=pg_sync_source.db_name, schemas="', '".join(pg_sync_source.schemas), user=pg_sync_source.db_user, allowed_users=("'postgres', 'mtp-dev'" if os.environ["ENV"] == 'dev' else "'mtp-admin', 'mtp-backend', 'mtp-readonly'")))
#	#print(prevs)
#	return render_template('permissions.html', client=session.get('client'), roles=roles, prevs=prevs, session=session, inputs=request.form, str=str)

#@app.route('/cloudsql', methods=['GET', 'POST'])
#@login_required
#def cloudsql():
#	# for custom check if custom role already exists for the user, drop if the already existing role expired and create new. If not expired, create with a new name
#	if request.method == 'POST':
#		clientname = request.form['client']
#		database_string = request.form['database']
#		custom_priv = request.form.get('customBox') if request.form.get('customBox') else None
#		custom_exp = request.form['expiry'] if request.form['expiry'] else None
#		env = os.environ.get('ENV')
#		tdb_id = "{}_{}".format(clientname, env)
#		tdb = json.loads(os.environ.get(tdb_id))
#		email = request.form['email']
#		name = email.split('@')[0].split('.')
#		errors = []
#		success = []
#		if len(name) == 1:
#			name = (name[0].capitalize()).strip()
#		elif len(name) == 2:
#			name = (name[0].capitalize() + " " + name[1].capitalize()).strip()
#
#		owner = request.form['username']
#		owner_password = request.form['password']
#		roles = [request.form['roles']]
#		try:
#			create_user(database_string, tdb, owner_password, roles, email, owner, name, custom_priv=custom_priv, custom_exp=custom_exp)
#			success.append(email)
#		except Exception as e:
#			errors.append(f"Error processing row: {str(e)}")
#
#		if errors:
#			return render_template('error.html', errors=errors)
#		else:
#			return render_template('success.html', success=success)
#
#	return render_template('cloudsql.html')

@app.route('/bulkcreate', methods=['GET', 'POST'])
@login_required
def bulk_create():
	errors = []
	success = []

	if request.method == 'POST':
		encrypt_key = os.getenv("encryption_key")
		encryption_key = encrypt_key.encode('utf-8')
		csv_file = request.files['csvfile']
		super_db_object = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
		target_db_obj = PGSync(session.get('client'), os.environ["ENV"], False, False)

		content_string = StringIO(csv_file.stream.read().decode('UTF-8'), newline=None)
		reader = csv.reader(content_string)
		header = next(reader) 
		name_index = header.index('name')
		email_index = header.index('email')
		role_index = header.index('role')
		default_expiry_index = header.index('default_expiry')

		for row in reader:
			name = row[name_index].capitalize()
			email = row[email_index]
			roles = [f'"{role}"' for role in row[role_index].split(',')] if row[role_index] else []
			default_expiry = int(row[default_expiry_index]) if row[default_expiry_index] else 30
			default_expiry_date = date.today() + timedelta(days=default_expiry)
			try:
				err, succ = super_db_object.create_user(roles, email, name, encryption_key, default_expiry_date, target_db_obj)
				for e in err:
					errors.append(e)
				for s in succ:
					success.append(s)
			except Exception as e:
				errors.append(f"Error processing row {email}: {str(e)}")

	return render_template('bulkcreate.html', errors=errors, success=success)

@app.route('/table-op/<object>/<operation>', methods=['GET', 'POST'])
@login_required
def table_ops(object, operation):
    # print(object)
	pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
    #if operation == 'vacuum':
    #    query = f"VACUUM (full, VERBOSE) {object};"
    #    # print(query,session.get('client'), os.environ["ENV"])
    #    output = pg_sync_source.execute_query_unsafe(query)
    #    # print(output)
    #    return redirect(url_for('bloat'))
    #elif operation == 'kill_lock':
    #    query = f"SELECT pg_cancel_backend({object});"
    #    # print("lock",object)
    #    output = pg_sync_source.execute_query_unsafe(query)
    #    return redirect(url_for('locks'))
	if operation == 'vacuum':
		query = f"VACUUM (full, VERBOSE) {object};"
		# print(query,session.get('client'), os.environ["ENV"])
		output = pg_sync_source.execute_query_unsafe(query)
		# print(output)
		return redirect(url_for('bloat'))
	elif operation == 'drop':
		query = f"DROP TABLE {object};"
		# print(query,session.get('client'), os.environ["ENV"])
		output = pg_sync_source.execute_query_unsafe(query)
		# print(output)
		return redirect(url_for('bloat'))
	elif operation == 'droprole':
		query = """DROP ROLE "{}";""".format(object)
		# print(query,session.get('client'), os.environ["ENV"])
		output = pg_sync_source.execute_query_unsafe(query)
		print(output)
		return redirect(url_for('roles'))
	elif operation.startswith('rolcreatedb') or operation.startswith('rolcreaterole'):
		tmp = operation.split('|')
		role = tmp[0]
		status = tmp[-1]
		if role == 'rolcreaterole':
			if status == 'true':
				role = 'CREATEROLE'
			else:
				role = 'NOCREATEROLE'
		if role == 'rolcreatedb':
			if status == 'true':
				role = 'CREATEDB'
			else:
				role = 'NOCREATEDB'
		output = pg_sync_source.execute_query_unsafe("""ALTER USER "{}" {};""".format(object, role))
		print(output)
		#CREATE ROLE user_name PASSWORD 'tYPe_YoUr_PaSSwOrD' NOSUPERUSER CREATEDB CREATEROLE INHERIT LOGIN;
		return redirect(url_for('roles'))
	elif operation == 'kill_lock':
		query = f"SELECT pg_cancel_backend({object});"
		# print("lock",object)
		output = pg_sync_source.execute_query_unsafe(query)
		return redirect(url_for('locks'))


@app.route('/bloat', methods=['GET', 'POST'])
@login_required
def bloat():
	pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
	bloats = pg_sync_source.get_results("""
	with foo as (
  SELECT
    schemaname, tablename, hdr, ma, bs,
    SUM((1-null_frac)*avg_width) AS datawidth,
    MAX(null_frac) AS maxfracsum,
    hdr+(
      SELECT 1+COUNT(*)/8
      FROM pg_stats s2
      WHERE null_frac<>0 AND s2.schemaname = s.schemaname AND s2.tablename = s.tablename
    ) AS nullhdr
  FROM pg_stats s, (
    SELECT
      (SELECT current_setting('block_size')::NUMERIC) AS bs,
      CASE WHEN SUBSTRING(v,12,3) IN ('8.0','8.1','8.2') THEN 27 ELSE 23 END AS hdr,
      CASE WHEN v ~ 'mingw32' THEN 8 ELSE 4 END AS ma
    FROM (SELECT version() AS v) AS foo
  ) AS constants
  GROUP BY 1,2,3,4,5  
), rs as (
  select 
    ma,bs,schemaname,tablename,
    (datawidth+(hdr+ma-(CASE WHEN hdr%ma=0 THEN ma ELSE hdr%ma END)))::NUMERIC AS datahdr,
    (maxfracsum*(nullhdr+ma-(CASE WHEN nullhdr%ma=0 THEN ma ELSE nullhdr%ma END))) AS nullhdr2
  FROM foo  
), sml as (
  SELECT
    schemaname, tablename, cc.reltuples, cc.relpages, bs,
    CEIL((cc.reltuples*((datahdr+ma-
      (CASE WHEN datahdr%ma=0 THEN ma ELSE datahdr%ma END))+nullhdr2+4))/(bs-20::FLOAT)) AS otta
 FROM rs
  JOIN pg_class cc ON cc.relname = rs.tablename
  JOIN pg_namespace nn ON cc.relnamespace = nn.oid AND nn.nspname = rs.schemaname AND nn.nspname not in ('pg_catalog','information_schema')
)
, final as (
SELECT
  current_database(), schemaname, tablename, 
  ROUND((CASE WHEN otta=0 THEN 0.0 ELSE sml.relpages::FLOAT/otta END)::NUMERIC,1) AS tbloat,
  CASE WHEN sml.relpages < otta THEN 0 ELSE bs*(sml.relpages-otta)::BIGINT END AS wastedbytes, sml.reltuples as estimated_row_count
from sml )
select current_database(), schemaname, tablename, tbloat, wastedbytes, estimated_row_count
from final where wastedbytes > 0
ORDER BY wastedbytes desc;
	""")
	return render_template('bloat.html', client=session.get('client'), bloats=bloats, session=session, inputs=request.form, str=str)

@app.route('/locks', methods=['GET', 'POST'])
@login_required
def locks():
	pg_sync_source = PGSync(session.get('client'), os.environ["ENV"], False, session.get('is_super_user'))
	locks = pg_sync_source.get_results("""
;with recursive 
    find_the_source_blocker as (
        select  pid
               ,pid as blocker_id
        from pg_stat_activity pa
        where pa.state<>'idle'
              and array_length(pg_blocking_pids(pa.pid), 1) is null

        union all

        select              
                t.pid  as  pid
               ,f.blocker_id as blocker_id
        from find_the_source_blocker f 
        join (  SELECT
                    act.pid,
                    blc.pid AS blocker_id
                FROM pg_stat_activity AS act
                LEFT JOIN pg_stat_activity AS blc ON blc.pid = ANY(pg_blocking_pids(act.pid))
                where act.state<>'idle') t on f.pid=t.blocker_id
        )
    
select distinct 
       s.pid
      ,s.blocker_id
      ,pb.usename       as blocker_user
      ,pb.query_start   as blocker_start
      ,pb.query         as blocker_query
      ,pt.query_start   as trans_start
      ,pt.query         as trans_query
from find_the_source_blocker s
join pg_stat_activity pb on s.blocker_id=pb.pid
join pg_stat_activity pt on s.pid=pt.pid
where s.pid<>s.blocker_id;
	""")
	return render_template('locks.html', client=session.get('client'), locks=locks, session=session, inputs=request.form, str=str)


if __name__ == "__main__":
	app.run(debug=True, port=os.environ.get('PORT'), host=os.environ.get('HOST'))

