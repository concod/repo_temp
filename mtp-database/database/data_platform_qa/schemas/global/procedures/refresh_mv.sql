--liquibase formatted sql
--changeset liquibase:refresh_mv runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for refresh_mv
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.refresh_mv();
CREATE OR REPLACE PROCEDURE global.refresh_mv()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare 
	_refresh_mv text;
	_sr_number  integer;
	_std int;
	_st timestamptz;
	_et timestamptz;
	_sql text;
	_table_exists bool;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.refresh_mv';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		set work_mem = '10GB';
		for  _refresh_mv ,_sr_number in 
			WITH RECURSIVE s(start_schemaname,start_mvname,schemaname,mvname,relkind,
				mvoid,depth) AS (
			-- List of mat views -- with no dependencies
			SELECT n.nspname AS start_schemaname, c.relname AS start_mvname,
			n.nspname AS schemaname, c.relname AS mvname, c.relkind,
			c.oid AS mvoid, 0 AS depth
			FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
			WHERE c.relkind='m'
			UNION
			-- Recursively find all things depending on previous level
			SELECT s.start_schemaname, s.start_mvname,
			n.nspname AS schemaname, c.relname AS mvname,
			c.relkind,
			c.oid AS mvoid, depth+1 AS depth
			FROM s
			JOIN pg_depend d ON s.mvoid=d.refobjid
			JOIN pg_rewrite r ON d.objid=r.oid
			JOIN pg_class c ON r.ev_class=c.oid AND (c.relkind IN ('m','v'))
			JOIN pg_namespace n ON n.oid=c.relnamespace
			WHERE s.mvoid <> c.oid -- exclude the current MV which always depends on itself
			),
			lv_list as (
			SELECT DISTINCT ON (schemaname,mvname) schemaname, mvname, depth FROM s
			WHERE relkind='m'
			ORDER BY schemaname, mvname, depth desc)
			SELECT 'REFRESH MATERIALIZED VIEW '||schemaname||'.'|| mvname ||' ;' refresh_mv, depth AS refresh_order
			FROM lv_list 
			where schemaname !='cache'
			ORDER BY depth, schemaname, mvname
		loop
			execute _refresh_mv;	
			raise notice '%',_refresh_mv; 	
		end loop;

		--create partitions for carfg table;
		SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema  = 'inventory_smart'
        and table_name = 'create_allocation_result_flat_gurobi'
          AND table_catalog = current_database()
    	) INTO _table_exists;
    
    	if _table_exists then
			for _std, _st, _et in SELECT 
				replace(
					(s.day :: date):: varchar, 
					'-', 
					''
				):: int4 as start_time_date, 
				timezone('utc', s.day) as start_time, 
				timezone(
					'utc', 
					(s.day + interval '1 day')
				) as end_time 
				FROM 
				generate_series(
					current_date,
					current_date + interval '1 year', 
					interval '1 day'
				) AS s(day) loop
					_sql := 'CREATE TABLE IF NOT EXISTS inventory_smart."create_allocation_result_flat_gurobi_' || _std || '" PARTITION OF inventory_smart.create_allocation_result_flat_gurobi FOR VALUES FROM (''' || _st || ''') TO (''' || _et || ''');';
					raise notice '_sql: %', _sql;
					execute _sql;
			end loop;
		end if;

        --drop cache_result tables for order batching
        do $$
            declare
                _tbl text;
            begin
                for _tbl in select schemaname || '.' || tablename from pg_tables where tablename ilike 'cache_result_%' and schemaname = 'cache' loop
                    execute 'drop table ' || _tbl;
                end loop;
            end
            $$;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
	end ;
$procedure$
;