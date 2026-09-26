--liquibase formatted sql
--changeset kamaleshwaran.k:refresh_mv runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:updating refresh_mv
--comment: initial changeset for refresh_mv
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS global.refresh_mv();
CREATE OR REPLACE PROCEDURE global.refresh_mv()
 LANGUAGE plpgsql
AS $procedure$
DECLARE 
	_refresh_mvs text[];
	_refresh_mv text;
	_worker text;
	_workers text[];
	_st TIMESTAMP := clock_timestamp();
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'global.refresh_mv';
	_log_step varchar;
	_batch_count integer := 0;
	_mv_count integer := 0;
	_mv_details jsonb := '[]'::jsonb;
	_current_batch_mvs jsonb := '[]'::jsonb;
	_mv_name text;
	_refresh_type text;
BEGIN

	CALL global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	PERFORM set_config('local.log_code', _log_code, true);
	PERFORM set_config('local.sp_name', _sp_name, true);

	BEGIN
		_log_step := 'Analyze materialized view dependencies and build refresh plan';
		PERFORM set_config('local.log_step', _log_step, true);
		
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, null);

		_log_step := 'Execute materialized view refresh in dependency order';
		PERFORM set_config('local.log_step', _log_step, true);
		
		for _refresh_mvs in WITH RECURSIVE s(start_schemaname,start_mvname,schemaname,mvname,relkind,
		    mvoid,depth) AS (
		    SELECT n.nspname AS start_schemaname, c.relname AS start_mvname,
		    n.nspname AS schemaname, c.relname AS mvname, c.relkind,
		    c.oid AS mvoid, 0 AS depth
		    FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
		    WHERE c.relkind='m'
		    UNION
		    SELECT s.start_schemaname, s.start_mvname,
		    n.nspname AS schemaname, c.relname AS mvname,
		    c.relkind,
		    c.oid AS mvoid, depth+1 AS depth
		    FROM s
		    JOIN pg_depend d ON s.mvoid=d.refobjid
		    JOIN pg_rewrite r ON d.objid=r.oid
		    JOIN pg_class c ON r.ev_class=c.oid AND (c.relkind IN ('m','v'))
		    JOIN pg_namespace n ON n.oid=c.relnamespace
		    WHERE s.mvoid <> c.oid
		), lv_list as (
		    SELECT DISTINCT ON (schemaname,mvname) schemaname, mvname, depth FROM s
		    WHERE relkind='m'
		    ORDER BY schemaname, mvname, depth desc
		)
		select 
			array_agg(
			case when has_unique_index then 'REFRESH MATERIALIZED VIEW CONCURRENTLY ' || quote_ident(schemaname) || '.' || quote_ident(mvname) || ';'
			else 'REFRESH MATERIALIZED VIEW ' || quote_ident(schemaname) || '.' || quote_ident(mvname) || ';'
			end)
		from (
		    SELECT 
		        l.schemaname,
		        l.mvname, 
		        l.depth,
		        EXISTS (
		            SELECT 1
		            FROM pg_index i
		            JOIN pg_class c ON i.indrelid = c.oid
		            JOIN pg_namespace n ON c.relnamespace = n.oid
		            WHERE n.nspname = l.schemaname
		            AND c.relname = l.mvname
		            AND i.indisunique = true
		        ) as has_unique_index
		    FROM lv_list l
		    WHERE l.schemaname !='cache'
		   ) x group by schemaname, depth, has_unique_index
		 ORDER BY depth asc, (schemaname = 'global') desc loop
		 
			_batch_count := _batch_count + 1;
			_current_batch_mvs := '[]'::jsonb;
			raise notice 'Processing batch %: %', _batch_count, _refresh_mvs;
			
			_workers := '{}'::text[];
			FOREACH _refresh_mv in array _refresh_mvs loop
				_mv_count := _mv_count + 1;
				
				-- Extract MV name and refresh type for logging
				_mv_name := regexp_replace(_refresh_mv, '^(REFRESH MATERIALIZED VIEW (CONCURRENTLY )?)', '');
				_mv_name := regexp_replace(_mv_name, ';$', '');
				_refresh_type := CASE 
					WHEN _refresh_mv LIKE '%CONCURRENTLY%' THEN 'CONCURRENT'
					ELSE 'REGULAR'
				END;
				
				-- Add to current batch tracking
				_current_batch_mvs := _current_batch_mvs || jsonb_build_object(
					'mv_name', _mv_name,
					'refresh_type', _refresh_type,
					'batch_number', _batch_count
				);
				
				raise notice 'Refreshing MV %: % (%)', _mv_count, _mv_name, _refresh_type;
				select async_query into _worker from public.async_query('call global.execute_as_admin(''' || _refresh_mv || ''');');
				_workers := array_append(_workers, _worker);
			end loop;
			
			-- Add current batch MVs to overall tracking
			_mv_details := _mv_details || _current_batch_mvs;
			
			FOREACH _worker in array _workers loop
				perform dblink_get_result(_worker);
				perform dblink_disconnect(_worker);
			end loop;
			
			-- Log batch completion with MV details
			CALL global.data_ingestion_logs(_log_code, _sp_name, 'Completed batch ' || _batch_count::text, null, (clock_timestamp() - _st)::text, _current_batch_mvs);
			
		end loop;

		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, _mv_details);

		_log_step := 'Completed all materialized view refreshes';
		PERFORM set_config('local.log_step', _log_step, true);
		
		RAISE NOTICE 'Successfully processed % batches with % total materialized views', _batch_count, _mv_count;
		
		-- Log final summary with complete MV details
		CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, null, (clock_timestamp() - _st)::text, 
			jsonb_build_object(
				'total_batches', _batch_count,
				'total_mvs', _mv_count,
				'mv_details', _mv_details
			));

	EXCEPTION
		WHEN OTHERS THEN
			-- Log the error with current MV details
			CALL global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, 
				jsonb_build_object(
					'batches_completed', _batch_count,
					'mvs_processed', _mv_count,
					'mv_details', _mv_details
				));
			RAISE EXCEPTION 'Error occurred in the procedure: %', SQLERRM;
	END;

	CALL global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, 
		jsonb_build_object(
			'total_batches', _batch_count,
			'total_mvs', _mv_count,
			'execution_summary', 'All materialized views refreshed successfully'
		));

END;
$procedure$
;
