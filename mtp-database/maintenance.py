import os
import requests
import json
import traceback
import sys
import load_env
from services import PGSync
#from notify import send_pr_email
from colorama import Fore, Back, Style
import multiprocessing as mp

import psycopg2
import pandas as pd
from openpyxl.utils import get_column_letter
from openpyxl.styles import Alignment

class MaintenanceException(Exception):
	"""Maintenance Exception"""

def format_name(name):
	return name.replace('_', ' ').upper()

def init_worker():
	#print("process initializing", mp.current_process())
	pass

def run_vacuum(schema, table):
	print("Vacuum for:", schema, table)
	return pg_sync.execute_query_unsafe(""" VACUUM (FULL, ANALYZE, VERBOSE) "{}"."{}"; """.format(schema, table))

clients = os.environ.get('CLIENTS').split("\n")
env = os.environ.get('ENV')
maintenance_type = os.environ.get('MAINTENANCE_TYPE')

if maintenance_type == 'aggressive':
	sync_type = 'DB MAINTENANCE AGGRESSIVE'
	maintenance_sql = """
	SELECT 
		n.nspname AS schemaname,
		c.relname AS tablename
	FROM 
		pg_class c
	JOIN 
		pg_namespace n ON n.oid = c.relnamespace
	WHERE 
		n.nspname not in('pg_catalog', 'information_schema', 'public', 'data_retention')
		AND c.relkind = 'r'
		AND c.relname NOT LIKE 'cache_result_%'
	--
	union
	--
	SELECT n.nspname as schemaname, c.relname as tablename
	FROM pg_class c
	JOIN pg_namespace n ON n.oid = c.relnamespace
	WHERE n.nspname in('pg_catalog', 'information_schema')
	group by 1,2
	order by 1,2"""
else:
	sync_type = 'DB MAINTENANCE'
	maintenance_sql = """
	with foo as (
	  SELECT 
		schemaname, 
		tablename, 
		hdr, 
		ma, 
		bs, 
		SUM(
		  (1 - null_frac)* avg_width
		) AS datawidth, 
		MAX(null_frac) AS maxfracsum, 
		hdr +(
		  SELECT 
			1 + COUNT(*)/ 8 
		  FROM 
			pg_stats s2 
		  WHERE 
			null_frac <> 0 
			AND s2.schemaname = s.schemaname 
			AND s2.tablename = s.tablename
		) AS nullhdr 
	  FROM 
		pg_stats s, 
		(
		  SELECT 
			(
			  SELECT 
				current_setting('block_size')::NUMERIC
			) AS bs, 
			CASE WHEN SUBSTRING(v, 12, 3) IN ('8.0', '8.1', '8.2') THEN 27 ELSE 23 END AS hdr, 
			CASE WHEN v ~ 'mingw32' THEN 8 ELSE 4 END AS ma 
		  FROM 
			(
			  SELECT 
				version() AS v
			) AS foo
		) AS constants 
	  GROUP BY 
		1, 
		2, 
		3, 
		4, 
		5
	), 
	rs as (
	  select 
		ma, 
		bs, 
		schemaname, 
		tablename, 
		(
		  datawidth +(
			hdr + ma -(
			  CASE WHEN hdr % ma = 0 THEN ma ELSE hdr % ma END
			)
		  )
		)::NUMERIC AS datahdr, 
		(
		  maxfracsum *(
			nullhdr + ma -(
			  CASE WHEN nullhdr % ma = 0 THEN ma ELSE nullhdr % ma END
			)
		  )
		) AS nullhdr2 
	  FROM 
		foo
	), 
	sml as (
	  SELECT 
		schemaname, 
		tablename, 
		cc.reltuples, 
		cc.relpages, 
		bs, 
		CEIL(
		  (
			cc.reltuples *(
			  (
				datahdr + ma - (
				  CASE WHEN datahdr % ma = 0 THEN ma ELSE datahdr % ma END
				)
			  )+ nullhdr2 + 4
			)
		  )/(bs - 20::FLOAT)
		) AS otta 
	  FROM 
		rs 
		JOIN pg_class cc ON cc.relname = rs.tablename 
		JOIN pg_namespace nn ON cc.relnamespace = nn.oid 
		AND nn.nspname = rs.schemaname 
		AND nn.nspname not in (
		  'pg_catalog', 'information_schema', 'public', 'data_retention'
		)
		AND cc.relkind not in('i')
		AND tablename not like 'cache_result_%'
	), 
	final as (
	  SELECT 
		current_database(), 
		schemaname, 
		tablename, 
		ROUND(
		  (
			CASE WHEN otta = 0 THEN 0.0 ELSE sml.relpages::FLOAT / otta END
		  )::NUMERIC, 
		  1
		) AS tbloat, 
		CASE WHEN sml.relpages < otta THEN 0 ELSE bs *(sml.relpages - otta)::BIGINT END AS wastedbytes, 
		sml.reltuples as estimated_row_count 
	  from 
		sml
	) 
	select 
	  schemaname, 
	  tablename
	  -- , 
	  -- tbloat, 
	  -- wastedbytes, 
	  -- estimated_row_count 
	from 
	  final 
	where 
	  wastedbytes > 0 
	  and tbloat > 1
	--
	union
	--
	SELECT n.nspname as schemaname, c.relname as tablename
	FROM pg_class c
	JOIN pg_namespace n ON n.oid = c.relnamespace
	WHERE n.nspname in('pg_catalog', 'information_schema')
	group by 1,2
	--
	union
	--
	SELECT schemaname, tablename
	FROM pg_tables t
	JOIN pg_class c ON c.relname = t.tablename
	JOIN pg_namespace n ON n.oid = c.relnamespace AND n.nspname = t.schemaname
	WHERE t.tablename ILIKE '%rcl%'
	and schemaname not in('public', 'data_retention')
	and relkind in ('r', 'p') and not relispartition
	and tablename not in('rcl_versions_constraint')
	group by 1,2
	order by 1,2
	"""

print(Fore.GREEN + "Maintenance for:", clients)
print(Style.RESET_ALL)

for client in clients:
	connection_exception = False
	cred = os.environ.get("{}_{}".format(client, env))
	if cred:
		try:
			pg_sync = PGSync(client, env, False, False) #False, True server admin connection
			pg_sync.connection_check()
		except Exception as e:
			connection_exception = True
	else:
		connection_exception = True

	if connection_exception:
		print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, please check with the DevOps{Style.RESET_ALL}")
		sys.exit(1)

	pg_sync = PGSync(client, env, False, False) #False, False DBA connection

	################ bloating tables list and concurrency

	res = pg_sync.get_results("""
		select (select setting::int from pg_settings where name = 'max_parallel_workers') / coalesce((select setting::int from pg_settings where name = 'autovacuum_max_workers'), (select setting::int from pg_settings where name = 'max_parallel_maintenance_workers')) as max_vacuum_jobs
	""")
	parellel_jobs = int(res[0]["max_vacuum_jobs"])*2
	bloats = pg_sync.get_results(maintenance_sql)

	#####################################################

	if __name__ == '__main__':
		try:
			if not pg_sync.execute_query("call public.ensure_exclusive_db_flow(true, '{}')".format(sync_type)):
				print(f"{Fore.RED}Error setting maintenance mode, Deployment or Ingestion in progress retry after sometime !!!: {client} {env}{Style.RESET_ALL}")
				sys.exit(1)

			with open('database/pre-deployment.sql', 'r') as file: 
				pre_deployment = file.read() 
			pre_deployment_status = pg_sync.execute_query(pre_deployment)
			if pre_deployment_status:
				print(f"{Fore.GREEN}pre_deployment_status:{pre_deployment_status}{Style.RESET_ALL}")
			else:
				print(f"{Fore.RED}pre_deployment_status:{pre_deployment_status}{Style.RESET_ALL}")
				sys.exit(1)

			################ create_allocation_result_flat_gurobi cleanup for non finalized allocation older then one month from now
			try:
				carfg_status = True
				step = 1
				carfg_status = carfg_status and pg_sync.execute_query("""
				do $$
					declare
						_gurobi_table_exists bool;
					begin 
						SELECT case when count(1) > 0 then true else false end into _gurobi_table_exists
						FROM information_schema.tables 
						WHERE table_schema = 'inventory_smart' 
						  AND table_name = 'create_allocation_result_flat_gurobi';
						if _gurobi_table_exists then
							drop table if exists inventory_smart.result_flat_gurobi_analyse_partitions;
							create table inventory_smart.result_flat_gurobi_analyse_partitions as
							select * from (
							select
							schema_name,
							  partition_name,
							  split_part(replace(replace(replace(bound_expr, 'FOR VALUES FROM', ''), '(', ''), ')', ''), ' TO ', 1)::date as start_date,
							  split_part(replace(replace(replace(bound_expr, 'FOR VALUES FROM', ''), '(', ''), ')', ''), ' TO ', -1)::date as end_date
							  from (
							SELECT
								child.relname AS partition_name,
								n.nspname AS schema_name,
								pg_get_expr(c.relpartbound, c.oid) AS bound_expr,
								c.relpartbound
							FROM
								pg_inherits AS i
							JOIN pg_class AS parent ON i.inhparent = parent.oid
							JOIN pg_class AS child ON i.inhrelid = child.oid
							JOIN pg_namespace n ON child.relnamespace = n.oid
							JOIN pg_partitioned_table p ON p.partrelid = parent.oid
							JOIN pg_class c ON c.oid = i.inhrelid
							WHERE
								parent.relname = 'create_allocation_result_flat_gurobi') x ) x
							 where end_date < current_date - '1 month'::interval
							 order by start_date asc;
							
							drop table if exists inventory_smart.result_flat_gurobi_analyse;
							CREATE TABLE inventory_smart.result_flat_gurobi_analyse (
								tbl text NULL,
								allocation_code varchar NULL,
								cnt int8 NULL
							);
						end if;
					end;
				$$;
				""")
			
				step = step + 1 if carfg_status else step
				carfg_status = carfg_status and pg_sync.execute_query("""
				do $$
					declare
						_sql text;
						_pc int;
						_worker text;
						_workers text[];
						_gurobi_table_exists bool;
					begin  
						SELECT case when count(1) > 0 then true else false end into _gurobi_table_exists
						FROM information_schema.tables 
						WHERE table_schema = 'inventory_smart' 
						  AND table_name = 'create_allocation_result_flat_gurobi';
						if _gurobi_table_exists then
							select CEIL(count(1)/50.0) into _pc from inventory_smart.result_flat_gurobi_analyse_partitions;
							for _sql in select string_agg('
								insert into inventory_smart.result_flat_gurobi_analyse(tbl, allocation_code, cnt)
								select
									''' || partition_name || ''' as tbl,
									allocation_code,
									count(1) as cnt
								from
									inventory_smart.' || partition_name || '
								group by 2
								', '; ') from (
								select partition_name, row_number() OVER(ORDER BY
									  start_date
								)/_pc as rn from inventory_smart.result_flat_gurobi_analyse_partitions) x group by rn loop
								select async_query into _worker from public.async_query(_sql);
								_workers := array_append(_workers, _worker);
							end loop;
							FOREACH _worker in array _workers loop
								perform dblink_get_result(_worker);
								perform dblink_disconnect(_worker);
							end loop;
						end if;
					end;
				$$;
				""")
			
				step = step + 1 if carfg_status else step
				carfg_status = carfg_status and pg_sync.execute_query("""
				do $$
					declare
						_tbl text;
						_allocation_codes text[];
						_worker text;
						_workers text[];
						_loop int;
						i INT;
						_gurobi_table_exists bool;
					begin  
						SELECT case when count(1) > 0 then true else false end into _gurobi_table_exists
						FROM information_schema.tables 
						WHERE table_schema = 'inventory_smart' 
						  AND table_name = 'create_allocation_result_flat_gurobi';
						if _gurobi_table_exists then
							select ceil(count(1)/50.0) into _loop from (
								select tbl, array_agg(allocation_code) as allocation_codes from inventory_smart.result_flat_gurobi_analyse x join inventory_smart.plan_master pm 
								on x.allocation_code = pm.plan_code
								where status != 3
								group by tbl
							) x;
							FOR i IN 1.._loop LOOP
								_workers := '{}'::text[];
								for _tbl, _allocation_codes in execute 'select tbl, array_agg(allocation_code) as allocation_codes from inventory_smart.result_flat_gurobi_analyse x join inventory_smart.plan_master pm 
								on x.allocation_code = pm.plan_code
								where status != 3
								group by tbl
								order by 1 asc
								limit 50 offset ' || 50 * (i-1) loop
						--			raise notice '% % %', _tbl, _allocation_codes, _cnt;
								raise notice '%', 'delete from inventory_smart.' || _tbl || ' where allocation_code = any(''' || _allocation_codes::text || '''::text[]);';
									select async_query into _worker from public.async_query('delete from inventory_smart.' || _tbl || ' where allocation_code = any(''' || _allocation_codes::text || '''::text[]);');
									_workers := array_append(_workers, _worker);
						--		commit;
								end loop;
								FOREACH _worker in array _workers loop
									perform dblink_get_result(_worker);
									perform dblink_disconnect(_worker);
								end loop;
							end loop;
						end if;
					end;
				$$;
				""")
			
				step = step + 1 if carfg_status else step
				carfg_status = carfg_status and pg_sync.execute_query("""
				do $$
					declare
						_gurobi_table_exists bool;
					begin 
						SELECT case when count(1) > 0 then true else false end into _gurobi_table_exists
						FROM information_schema.tables 
						WHERE table_schema = 'inventory_smart' 
						  AND table_name = 'create_allocation_result_flat_gurobi';
						if _gurobi_table_exists then
							drop table if exists inventory_smart.result_flat_gurobi_analyse;
							CREATE TABLE inventory_smart.result_flat_gurobi_analyse (
								tbl text NULL,
								allocation_code varchar NULL,
								cnt int8 NULL
							);
						end if;
					end;
				$$;
				""")
			
				step = step + 1 if carfg_status else step
				carfg_status = carfg_status and pg_sync.execute_query("""
				do $$
					declare
						_sql text;
						_pc int;
						_worker text;
						_workers text[];
						_gurobi_table_exists bool;
					begin
						SELECT case when count(1) > 0 then true else false end into _gurobi_table_exists
						FROM information_schema.tables 
						WHERE table_schema = 'inventory_smart' 
						  AND table_name = 'create_allocation_result_flat_gurobi';
						if _gurobi_table_exists then
							select CEIL(count(1)/50.0) into _pc from inventory_smart.result_flat_gurobi_analyse_partitions;
							for _sql in select string_agg('
								insert into inventory_smart.result_flat_gurobi_analyse(tbl, allocation_code, cnt)
								select
									''' || partition_name || ''' as tbl,
									allocation_code,
									count(1) as cnt
								from
									inventory_smart.' || partition_name || '
								group by 2
								', '; ') from (
								select partition_name, row_number() OVER(ORDER BY
									  start_date
								)/_pc as rn from inventory_smart.result_flat_gurobi_analyse_partitions) x group by rn loop
								select async_query into _worker from public.async_query(_sql);
								_workers := array_append(_workers, _worker);
							end loop;
							FOREACH _worker in array _workers loop
								perform dblink_get_result(_worker);
								perform dblink_disconnect(_worker);
							end loop;
							delete from inventory_smart.plan_master where plan_code in(
							select plan_code from inventory_smart.plan_master where plan_code not in(
							select allocation_code from inventory_smart.result_flat_gurobi_analyse
							) and greatest(created_at, updated_at) < current_date - '1 month'::interval and status != 3
							);
						end if;
					end;
				$$;
				""")
			
				if carfg_status:
					print(f"{Fore.GREEN}Success in create_allocation_result_flat_gurobi Cleanup, Step: {str(step)}{Style.RESET_ALL}")
				else:
					print(f"{Fore.RED}Error in create_allocation_result_flat_gurobi Cleanup, Step: {str(step)}{Style.RESET_ALL}")
			except Exception as e:
				print(f"{Fore.RED}Error in create_allocation_result_flat_gurobi Cleanup, Step: {str(step)}{Style.RESET_ALL}", e)

			########################################################################################################################

			################ moving to past allocations
			if client == 'ralphlauren_eu_is':
				your_sp_status = pg_sync.execute_query("call inventory_smart.create_allocation_data_archival();")
				if your_sp_status:
					print(f"{Fore.GREEN}Stored procedure inventory_smart.create_allocation_data_archival executed successfully.{Style.RESET_ALL}")
				else:
					print(f"{Fore.RED}Stored procedure inventory_smart.create_allocation_data_archival failed.{Style.RESET_ALL}")

			################ run retension code

			retension_status = pg_sync.execute_query("CALL data_retention.process_cleanup();")
			if retension_status:
				print(f"{Fore.GREEN}Stored procedure data_retention.process_cleanup() executed successfully.{Style.RESET_ALL}")
			else:
				print(f"{Fore.RED}Stored procedure data_retention.process_cleanup() failed.{Style.RESET_ALL}")

			########################################################################################################################
			
			################ run vacuum code
			m = mp.Manager()
			p = mp.Pool(processes=parellel_jobs, initializer=init_worker, initargs=())
			results = [p.apply_async(run_vacuum, args=(bloat['schemaname'], bloat['tablename'], )) for bloat in bloats]
			p.close()
			p.join()
			########################################################################################################################
			
			#################### health check report
			excel_path = "health_checkup_report.xlsx"
			health_check_status = pg_sync.execute_query("CALL global.db_health_checkup();")
			if health_check_status:
				print(f"{Fore.GREEN}Stored procedure global.db_health_checkup() executed successfully.{Style.RESET_ALL}")
				writer = pd.ExcelWriter(excel_path, engine='openpyxl')
				cat_info = pg_sync.get_results("""
					SELECT health_checkup_id, catagory_name
					FROM global.health_checkup_master
					WHERE is_active
					ORDER BY 1
				""")
				for cat in cat_info:
					cat_id = cat['health_checkup_id']
					catagory_name = cat['catagory_name']
					
					with psycopg2.connect(
						host =     pg_sync.db_host,
						port =     pg_sync.db_port,
						dbname =   pg_sync.db_name,
						user =     pg_sync.db_user,
						password = pg_sync.db_pass
					) as conn:
						with conn.cursor() as cur:
							cur.execute("BEGIN;")
							cur.execute("SELECT * from global.fn_get_health_checkup_logs(%s, %s);", ('health_report', cat_id))
							cur.execute('FETCH ALL IN "health_report";')
							rows = cur.fetchall()
							colnames = [desc[0] for desc in cur.description]
							cur.execute("COMMIT;")

					df = pd.DataFrame(rows, columns=colnames)

					# Clean sheet name
					safe_sheet_name = "".join(c for c in catagory_name if c not in r'[]:*?/\\')
					safe_sheet_name = safe_sheet_name[:31] if len(safe_sheet_name) > 31 else safe_sheet_name

					# Write to Excel
					df.to_excel(writer, sheet_name=safe_sheet_name, index=False)

					# Get the worksheet
					worksheet = writer.sheets[safe_sheet_name]

					# Format columns
					for column in worksheet.columns:
						max_length = 0
						column_letter = get_column_letter(column[0].column)
						for cell in column:
							try:
								if len(str(cell.value)) > max_length:
									max_length = len(str(cell.value))
							except:
								pass
						adjusted_width = (max_length + 2)
						worksheet.column_dimensions[column_letter].width = adjusted_width

					# Format rows
					for row in worksheet.rows:
						max_height = 0
						for cell in row:
							cell.alignment = Alignment(wrap_text=True, vertical='center')
							if cell.value:
								text_lines = str(cell.value).count('\n') + 1
								max_height = max(max_height, text_lines * 15)
						if max_height > 0:
							worksheet.row_dimensions[cell.row].height = max_height

					#print(f"Wrote and formatted sheet for Category: {catagory_name}")
				writer.close()
			else:
				print(f"{Fore.RED}Stored procedure global.db_health_checkup() failed.{Style.RESET_ALL}")
			############################################################################################################################
			
		finally:
			pg_sync.execute_query("call public.ensure_exclusive_db_flow(false, '{}')".format(sync_type)) 
