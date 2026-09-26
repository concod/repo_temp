import os
import json
import sys
import load_env
from services import PGSync
from colorama import Fore, Back, Style

connection_exception = False
client = os.environ.get('CLIENT')

env = os.environ.get('ENV')
cs_map = json.loads(os.environ.get('SCHEMAS'))
schemas = cs_map[client]['schemas']
is_hard_cleanup = os.environ.get('HARD_CLEANUP')

invenory_cred = os.environ.get("{}_{}".format(client, env))
non_invenory_cred = os.environ.get("{}_{}_non_inventory".format(client, env))

#print(client, env, schemas, invenory_cred, non_invenory_cred)

if env not in ['test', 'uat', 'prod']: # Env must be dev,test or prod only will never do this for dev as schema will never alignemnt and permissions also can not revoke
	print(f"{Fore.RED}{client} {env}, is not a valid environment to run this setup. Exiting...{Style.RESET_ALL}")
	sys.exit(1)

if invenory_cred:
	try:
		pg_sync_inventory = PGSync(client, env, False) #False server connection
		pg_sync_inventory.connection_check()
	except Exception as e:
		connection_exception = True
else:
	connection_exception = True

if connection_exception:
	print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, please check with the DevOps for Inventory cluster. Exiting...{Style.RESET_ALL}")
	sys.exit(1)

if non_invenory_cred:
	try:
		pg_sync_non_inventory = PGSync(client, env + '_non_inventory', False) #False server connection
		pg_sync_non_inventory.connection_check()
	except Exception as e:
		connection_exception = True
else:
	connection_exception = True

if connection_exception:
	print(f"{Fore.RED}{client} {env}, ⚠️ Connection Error, please check with the DevOps for Non Inventory cluster. Exiting...{Style.RESET_ALL}")
	sys.exit(1)

def cleanup_rep(cat="All"):
	print("cleanup_rep", cat)
	pub_con = ""
	sub_con = ""
	if cat != "All":
		pub_con = f"where pubname = '{cat}_pub'"
		sub_con = f"where subname = '{cat}_sub'"
	status = pg_sync_non_inventory.execute_query_with_reuseable_cursor("""
		DO $$
			declare 
				sub_name text;
				_sql text;
			begin
				for sub_name in select subname from pg_subscription {sub_con} order by 1 loop
					_sql:= 'ALTER SUBSCRIPTION ' || sub_name || ' DISABLE;
							ALTER SUBSCRIPTION '|| sub_name || ' SET (slot_name = NONE);
							DROP SUBSCRIPTION ' || sub_name || ' CASCADE;';
					raise notice '_sql: %',_sql;
					execute _sql;
				end loop ;
			end;
		$$;
	""".format(sub_con=sub_con))
	if status:
		print(f"{Fore.GREEN}	{cat} subscription cleanup successfully{Style.RESET_ALL}")
	else:
		print(f"{Fore.RED}	{cat} subscription cleanup failed. Exiting...{Style.RESET_ALL}")
		sys.exit(1)

	status = pg_sync_inventory.execute_query_with_reuseable_cursor("""
		DO $$
		declare 
			pub_name text ;
			_sql text;
		begin
			for pub_name in select pubname from pg_publication {pub_con} order by 1 loop
				IF EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name =  replace(pub_name, 'pub', 'sub')) THEN
					perform pg_drop_replication_slot( replace(pub_name, 'pub', 'sub') );
				END IF;
				_sql:= 'DROP PUBLICATION ' || pub_name || ';';
				raise notice '_sql: %',_sql;
				execute _sql;
			end loop ;
		end ;
		$$;
	""".format(pub_con=pub_con))
	if status:
		print(f"{Fore.GREEN}	{cat} publication cleanup successfully{Style.RESET_ALL}")
	else:
		print(f"{Fore.RED}	{cat} publication cleanup failed. Exiting...{Style.RESET_ALL}")
		sys.exit(1)

################################## Connection Checks finished ##################################
print("\n")

if is_hard_cleanup == 'TRUE':
	print("Hard cleanup...")
	cleanup_rep()
	print("\n")

################################## Hard Cleanup finished ##################################

down_slots = pg_sync_inventory.get_results("""
		SELECT coalesce(array_agg(name), '{}'::text[]) as down_slots
		FROM (
			SELECT *
			FROM (
				-- Get all publication names and derive a common 'name' field
				SELECT 
					pubname, 
					REPLACE(pubname, '_pub', '') AS name
				FROM pg_publication
			) pub
			-- Join with replication slot data using common name
			LEFT JOIN (
				SELECT 
					slot_name,
					REPLACE(slot_name, '_sub', '') AS name,
					active,
					inactive_since,
					LEAST(sa.query_start, sa.xact_start) as active_since,
					pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), restart_lsn)) AS retained_wal_size,
					pg_size_pretty(pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn)) AS lag_bytes,
					pg_wal_lsn_diff(pg_current_wal_lsn(), confirmed_flush_lsn) AS lag_raw_bytes
				FROM pg_replication_slots prs left JOIN pg_stat_activity sa ON prs.active_pid = sa.pid
			) slot USING (name)
		) dt
		-- Alert conditions
		WHERE 
			active IS NULL 
			OR active = FALSE 
			OR active_since is null
			OR active_since > now() - INTERVAL '5 minutes';""")

if down_slots and len(down_slots) == 1:
	down_slots = down_slots[0]['down_slots']
	if len(down_slots) == 1:
		print("down_slots", down_slots)
		for ds in down_slots:
			cleanup_rep(ds)
			print("\n")

################################## Slots repair finished ##################################

# query to get type as pub/sub name and list of tables
pk_table_sql = """
select schema_name as table_schema, table_name, true as is_pk,
--table_type,
case
	when table_name ilike '%_generic_schema_mapping' then 'gsm' 
	when table_name in('product_master', 'product_attributes', 'product_attributes_filter', 'product_hierarchies_filter', 'product_group_rules', 'expired_products', 'product_group_definitions', 'product_group_definitions_rules_mapping', 'product_groups', 'product_groups_aggregation_mapping', 'product_groups_mapping', 'product_hierarchies', 'product_time_attributes') then 'product'
	when table_name in('store_master', 'store_attributes', 'store_attributes_filter', 'store_hierarchies_filter', 'distribution_centres', 'fulfilment_centres', 'aggregated_store_groups_mapping', 'aggregation_mapping_aggregation_store', 'expired_stores', 'new_store_attributes', 'new_store_data', 'new_store_mapping', 'new_store_reserve', 'new_store_reserve_allocation_results', 'store_grade_master', 'store_grade_nomenclature', 'store_grade_results', 'store_groups', 'store_groups_mapping', 'store_hierarchies', 'store_time_attributes', 'new_store_change_log') then 'store'
	when table_name ilike 'product_mapping_%' then 'mapping'
	when table_name in('user_access_hierarchy_mapping', 'user_attributes', 'user_starred_notes', 'user_notification_settings', 'user_preference_table_config', 'user_master', 'acl_master', 'action_master', 'application_master', 'module_master', 'roles_master', 'screen_master', 'tenant_application_screen_config', 'tenant_attribute_master', 'tenant_context', 'tenant_hierarchy_levels', 'tenant_hierarchy_mapping', 'tenant_master', 'tenant_signin_details', 'default_user_table_view_mapping', 'enable_module_level_table_uam', 'role_action_module_mapping') then 'user'
	when table_name in('dimensions', 'filter_configurations_mapping', 'table_configurations_mapping', 'fiscal_date_mapping', 'configurator_frontend_templates', 'configurator_mandatory_attributes', 'filter_configurations', 'filter_configurations_compulsory_mapping', 'filter_user_configurations_mapping', 'fmt_mapping', 'generic_master_mapping', 'keyboard_shortcut_actions', 'keyboard_shortcut_keys', 'mail_notification_mapping', 'configurator_sidelayout', 'default_attributes', 'table_config_views', 'table_configurations', 'upload_filter_configurations_mapping') then 'csv_sync'
else 'others' end as type
from (
SELECT 
    n.nspname as schema_name,
    t.relname as table_name,
--    c.conname as constraint_name,
--    string_agg(a.attname, ', ' ORDER BY array_position(c.conkey, a.attnum)) as pk_columns,
    CASE 
        WHEN t.relispartition THEN 'Partition (own PK)'
        WHEN EXISTS (
            SELECT 1 FROM pg_inherits i 
            WHERE i.inhparent = t.oid
        ) THEN 'Parent Table'
        ELSE 'Regular Table'
    END as table_type
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
JOIN pg_namespace n ON t.relnamespace = n.oid
JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = ANY(c.conkey)
WHERE c.contype = 'p'
    AND n.nspname = 'global'
    AND (
        -- Include non-partitioned tables
        NOT t.relispartition
        OR
        -- Include partitions only if constraint is locally defined
        (t.relispartition AND c.conislocal = true)
    )
GROUP BY n.nspname, t.relname, c.conname, t.relispartition, t.oid
) list where table_name not in ('product_time_attributes_bkp', 'product_hierarchies_filter_patch_backup', 'rcl_priority_mapping', 'sp_logs', 'rcl_master', 'rcl_versioning', 'master_rcl_input',
	  'dynamic_ddl_for_replication', 'index_drop_create', 'health_checkup_summary', 'health_checkup_master', 'health_checkup_logs', 'mtp_audit_log', 'sp_calls_statistics', 'versioning', 'audit_log_control', 'data_ingestion_logs', 'delta_tracker')
	  and table_name not like 'rcl_%'
	  order by 4 asc
"""

inventory_pk_mapping = pg_sync_inventory.get_results(pk_table_sql)
non_inventory_pk_mapping = pg_sync_non_inventory.get_results(pk_table_sql)

non_pk_tables_inventory = []       # Tables in global inventory cluster where pk is not set
non_pk_tables_non_inventory = []   # Tables in global non inventory cluster where pk is not set
replication_ready_tables = []      # Tables in global inventory and non inventory cluster where pk set
replication_guilty_tables = []     # Where pk set in inventory and not set in non inventory cluster

for inv_pk_tbl in inventory_pk_mapping:
	if not inv_pk_tbl['is_pk']:
		non_pk_tables_inventory.append(inv_pk_tbl)
	else:
		f = False
		for non_inv_pk_tbl in non_inventory_pk_mapping:
			if inv_pk_tbl['table_schema'] == non_inv_pk_tbl['table_schema'] and inv_pk_tbl['table_name'] == non_inv_pk_tbl['table_name'] and inv_pk_tbl['is_pk'] == non_inv_pk_tbl['is_pk']:
				f = True
				replication_ready_tables.append(inv_pk_tbl)
		if not f:
			replication_guilty_tables.append(inv_pk_tbl)

replication_map = {}

for rrt in replication_ready_tables:
	if rrt['type'] not in replication_map.keys():
		replication_map[rrt['type']] = []
	replication_map[rrt['type']].append(rrt)

for cat in replication_map:
	# detect down ? then repair
####	print("\n") 
####	is_active_sql = """
####	select 
####	  case when count(1) > 0 
####	  or (
####	    select 
####	      count(1) 
####	    from 
####	      pg_replication_slots
####	  ) = 0 then false else true end as is_active 
####	from 
####	  (
####	    SELECT 
####	      active, 
####	      inactive_since, 
####	      LEAST(sa.query_start, sa.xact_start) as active_since 
####	    FROM 
####	      pg_replication_slots prs 
####	      JOIN pg_stat_activity sa ON prs.active_pid = sa.pid
####	  ) x 
####	where 
####	  active = false 
####	  or inactive_since is not null 
####	  or active_since > now() - INTERVAL '5 minutes'
####	"""
####	is_active_result = pg_sync_inventory.get_results(is_active_sql)
####	# Only run the following steps if is_active is True
####	if is_active_result and is_active_result[0].get('is_active', False) is True:
####		# Drop subscription if exist
####		status = pg_sync_non_inventory.execute_query_with_reuseable_cursor("""
####		DO $$
####		BEGIN
####		  IF EXISTS (SELECT 1 FROM pg_subscription WHERE subname = '{cat}_sub') THEN
####			ALTER SUBSCRIPTION {cat}_sub DISABLE;
####			ALTER SUBSCRIPTION {cat}_sub SET (slot_name = NONE);
####			DROP SUBSCRIPTION {cat}_sub CASCADE;
####		  END IF;
####		END$$;
####		""".format(cat=cat))
####		if status:
####			print(f"{Fore.GREEN}{cat} subscription dropped successfully from non-inventory cluster{Style.RESET_ALL}".format(cat=cat))
####		else:
####			print(f"{Fore.RED}Failed to drop {cat} subscription from non-inventory cluster (or it did not exist){Style.RESET_ALL}".format(cat=cat))
####			sys.exit(1)	
####		# Drop replication slot if exists on publisher
####		status = pg_sync_inventory.execute_query_with_reuseable_cursor("""
####		DO $$
####		BEGIN
####		  IF EXISTS (SELECT 1 FROM pg_replication_slots WHERE slot_name = '{cat}_sub') THEN
####			PERFORM pg_drop_replication_slot('{cat}_sub');
####		  END IF;
####		END$$;
####		""".format(cat=cat))
####		if status:
####			print(f"{Fore.GREEN}{cat} replication slot dropped successfully from inventory cluster{Style.RESET_ALL}".format(cat=cat))
####		else:
####			print(f"{Fore.RED}Failed to drop {cat} replication slot from inventory cluster (or it did not exist){Style.RESET_ALL}".format(cat=cat))
####			sys.exit(1)
####		# Drop publication if exists on publisher
####		status = pg_sync_inventory.execute_query_with_reuseable_cursor("""
####		DO $$
####		BEGIN
####		  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = '{cat}_pub') THEN
####			DROP PUBLICATION {cat}_pub;
####		  END IF;
####		END$$;
####		""".format(cat=cat))
####		if status:
####			print(f"{Fore.GREEN}{cat} publication dropped successfully from inventory cluster{Style.RESET_ALL}".format(cat=cat))
####		else:
####			print(f"{Fore.RED}Failed to drop {cat} publication from inventory cluster (or it did not exist){Style.RESET_ALL}".format(cat=cat))
####			sys.exit(1)
####	# If is_active is not True, do not execute any of the above steps for this table

	# Create pub if not exist
	status = pg_sync_inventory.execute_query_with_reuseable_cursor("""
	DO $$
	BEGIN
	  IF NOT EXISTS (
		SELECT 1 FROM pg_catalog.pg_publication WHERE pubname = '{cat}_pub'
	  ) THEN
		CREATE PUBLICATION {cat}_pub;
	  END IF;
	END$$;""".format(cat=cat))
	if status:
		print(f"{Fore.GREEN}{cat} publication setup successfully{Style.RESET_ALL}".format(cat=cat))
	else:
		print(f"{Fore.RED}{cat} publication setup failed. Exiting...{Style.RESET_ALL}".format(cat=cat))
		sys.exit(1)
		
	for tbl in replication_map[cat]:
		# Add table to pub if not exist
		status = pg_sync_inventory.execute_query_with_reuseable_cursor("""
		DO $$
		DECLARE
			v_identity CHAR;
		BEGIN
			SELECT relreplident INTO v_identity
			FROM pg_class
			WHERE relname = '{tbl}'
			  AND relnamespace = '{schema}'::regnamespace;
			IF v_identity <> 'f' THEN
				EXECUTE 'ALTER TABLE {schema}.{tbl} REPLICA IDENTITY FULL';
			END IF;
		END $$;""".format(schema=tbl['table_schema'], tbl=tbl['table_name']))
		if status:
			print(f"{Fore.GREEN}    Table {tbl['table_schema']}.{tbl['table_name']} identify set {Style.RESET_ALL}")
		else:
			print(f"{Fore.RED}    Table {tbl['table_schema']}.{tbl['table_name']} identify not set {Style.RESET_ALL}")
			sys.exit(1)

		status = pg_sync_inventory.execute_query_with_reuseable_cursor("""
		DO $$
		BEGIN
		   BEGIN
			  ALTER PUBLICATION {cat}_pub ADD TABLE {schema}.{tbl};
		   EXCEPTION
			  WHEN duplicate_object THEN
				 RAISE NOTICE 'Table % already in publication', '{schema}.{tbl}';
			  WHEN others THEN
				 RAISE WARNING 'Unexpected error while adding table %: % (SQLSTATE: %)', '{schema}.{tbl}', SQLERRM, SQLSTATE;
		   END;
		END;
		$$;
		""".format(cat=cat, schema=tbl['table_schema'], tbl=tbl['table_name']))
		if status:
			print(f"{Fore.GREEN}    Table {tbl['table_schema']}.{tbl['table_name']} added into {cat}{Style.RESET_ALL}")
		else:
			print(f"{Fore.RED}    Table {tbl['table_schema']}.{tbl['table_name']} not added into {cat}{Style.RESET_ALL}")
			sys.exit(1)

	# Create slot on pub if not exist
	status = pg_sync_inventory.execute_query_with_reuseable_cursor("""
	DO $$
	BEGIN
		IF NOT EXISTS (
			SELECT 1 FROM pg_replication_slots WHERE slot_name = '{cat}_sub'
		) THEN
			PERFORM pg_create_logical_replication_slot('{cat}_sub', 'pgoutput');
		END IF;
	END $$;
	""".format(cat=cat))
	if status:
		print(f"{Fore.GREEN}{cat} replication slot enabled successfully{Style.RESET_ALL}")
	else:
		print(f"{Fore.RED}{cat} replication slot not enabled successfully. Exiting...{Style.RESET_ALL}")
		sys.exit(1)

	# Create subscription if not exist
	status = pg_sync_non_inventory.execute_query_with_reuseable_cursor("""
	DO $$
	BEGIN
		IF NOT EXISTS (
		  SELECT 1 FROM pg_subscription WHERE subname = '{cat}_sub'
		) THEN
		  CREATE SUBSCRIPTION {cat}_sub
		  CONNECTION 'host={inv_host} port={inv_port} dbname={inv_dbname} password={inv_pass} user={inv_user} application_name={cat}_sub'
		  PUBLICATION {cat}_pub WITH (
			copy_data = false,
			binary = true,
			streaming = true,
			create_slot = false,
			enabled = false,
			slot_name = '{cat}_sub',
			synchronous_commit = 'remote_apply'
		  );
		END IF;
	END;
	$$;""".format(cat=cat, inv_host=pg_sync_inventory.db_host_original, inv_port=pg_sync_inventory.db_port_original, inv_dbname=pg_sync_inventory.db_name, inv_user=pg_sync_inventory.db_user, inv_pass=pg_sync_inventory.db_pass))
	if status:
		print(f"{Fore.GREEN}{cat} subscription setup successfully{Style.RESET_ALL}")
	else:
		print(f"{Fore.RED}{cat} subscription setup failed. Exiting...{Style.RESET_ALL}")
		sys.exit(1)

	# Enable subscription if not exist
	status = pg_sync_non_inventory.execute_query_with_reuseable_cursor("""
	ALTER SUBSCRIPTION {cat}_sub ENABLE;""".format(cat=cat))
	if status:
		print(f"{Fore.GREEN}{cat} subscription enabled successfully{Style.RESET_ALL}")
	else:
		print(f"{Fore.RED}{cat} subscription not enabled successfully. Exiting...{Style.RESET_ALL}")
		sys.exit(1)

	# Refresh subscription if not exist
	status = pg_sync_non_inventory.execute_query_unsafe("""
	ALTER SUBSCRIPTION {cat}_sub REFRESH PUBLICATION;""".format(cat=cat))
	if status:
		print(f"{Fore.GREEN}{cat} subscription refreshed successfully{Style.RESET_ALL}")
	else:
		print(f"{Fore.RED}{cat} subscription not refreshed successfully{Style.RESET_ALL}")
		sys.exit(1)
	print("\n")

################################## Replication setup finished ##################################

####	# Check replication slot status on inventory cluster
####	slot_status = pg_sync_inventory.get_results(f" SELECT CASE WHEN active is null or active=true THEN true ELSE false END as slot_status FROM pg_replication_slots WHERE slot_name = '{cat}_sub'; ")
####	if slot_status:
####		# There should be only one row if the slot exists
####		is_active = slot_status[0]['slot_status']  # active column
####		if is_active:
####			print(f"{Fore.GREEN}Replication slot '{cat}_sub' is active.{Style.RESET_ALL}")
####		else:
####			print(f"{Fore.RED}Replication slot '{cat}_sub' exists but is not active.{Style.RESET_ALL}")
####			sys.exit(1)
####	else:
####		print(f"{Fore.RED}Replication slot '{cat}_sub' not found on inventory cluster.{Style.RESET_ALL}")
####		sys.exit(1)

# Revoking Permissions from non inventory cluster
print("Revoking Permissions ...\n")
role_name_backend = "{}-{}-{}".format(pg_sync_non_inventory.project, env, 'backend') if env == 'uat' else "{}-{}".format(pg_sync_non_inventory.project, 'backend')
role_name_di = "{}-{}-{}".format(pg_sync_non_inventory.project, env, 'dataingestion') if env == 'uat' else "{}-{}".format(pg_sync_non_inventory.project, 'dataingestion')
role_name_readonly = "{}-{}-{}".format(pg_sync_non_inventory.project, env, 'readonly') if env == 'uat' else "{}-{}".format(pg_sync_non_inventory.project, 'readonly')

roles = [role_name_readonly, role_name_di, role_name_backend]
for r in roles:
	status = pg_sync_non_inventory.execute_query_with_reuseable_cursor("""
	DO $do$
	DECLARE
		_schema text;
		_st text;
		_sec bool;
	BEGIN
		FOR _schema IN SELECT schema_name FROM information_schema.schemata WHERE schema_name IN('global', 'public') LOOP
				for _st, _sec in select p.oid::regprocedure::text as proc_name, p.prosecdef as is_sec_def
				from
					pg_proc p
				join pg_namespace n on
					n.oid = p.pronamespace
				where
					n.nspname = _schema
					and prokind in('f')
					and probin is null
					and pg_get_userbyid(proowner) != 'cloudsqladmin' loop 
						if _sec then
							execute 'REVOKE EXECUTE ON FUNCTION ' || _st || ' FROM "{role_name}";';
						else
							execute 'GRANT EXECUTE ON FUNCTION ' || _st || ' TO "{role_name}";';
						end if;
				end loop;
				for _st, _sec in select p.oid::regprocedure::text as proc_name, p.prosecdef as is_sec_def
				from
					pg_proc p
				join pg_namespace n on
					n.oid = p.pronamespace
				where
					n.nspname = _schema
					and prokind in('p')
					and probin is null
					and pg_get_userbyid(proowner) != 'cloudsqladmin' loop 
						if _sec then
							execute 'REVOKE EXECUTE ON PROCEDURE ' || _st || ' FROM "{role_name}";';
						else
							execute 'GRANT EXECUTE ON PROCEDURE ' || _st || ' TO "{role_name}";';
						end if;
				end loop;
			EXECUTE format($$ REVOKE ALL ON ALL TABLES IN SCHEMA %I FROM "{role_name}"; $$, _schema);
			EXECUTE format($$ GRANT SELECT ON ALL TABLES IN SCHEMA %I TO "{role_name}"; $$, _schema);
			
			EXECUTE format($$ ALTER DEFAULT PRIVILEGES IN SCHEMA %I GRANT SELECT ON TABLES TO "{role_name}"; $$, _schema);
		END LOOP;
	END $do$;""".format(role_name=r))
	if status:
		print(f"{Fore.GREEN}Success in permissions setting {r}{Style.RESET_ALL}")
	else:
		print(f"{Fore.RED}Error in permissions setting {r}{Style.RESET_ALL}")
		sys.exit(1)

################################## Permissions setup finished ##################################

del pg_sync_inventory
del pg_sync_non_inventory

# Check variables def
if len(non_pk_tables_inventory) > 0:
	print(f"{Fore.RED}Non PK Tables in Inventory Cluster{Style.RESET_ALL}")
	for i in non_pk_tables_inventory:
		print(f"{Fore.RED}    {i['table_schema']}.{i['table_name']}{Style.RESET_ALL}")

if len(non_pk_tables_non_inventory) > 0:
	print(f"{Fore.RED}Non PK Tables in Non Inventory Cluster{Style.RESET_ALL}")
	for i in non_pk_tables_non_inventory:
		print(f"{Fore.RED}    {i['table_schema']}.{i['table_name']}{Style.RESET_ALL}")

if len(replication_guilty_tables) > 0:
	print(f"{Fore.RED}Non Replicating Tables{Style.RESET_ALL}")
	for i in replication_guilty_tables:
		print(f"{Fore.RED}    {i['table_schema']}.{i['table_name']}{Style.RESET_ALL}")


#SECRET_PROJECT_ID=ia-securearmor PROJECT_ID=mtp ENV=test CLIENT=carters HARD_CLEANUP=TRUE ./replication_setup.sh
