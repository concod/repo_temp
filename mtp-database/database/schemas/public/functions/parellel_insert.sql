--liquibase formatted sql
--changeset ashish@impactanalytics.co:parellel_insert runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: changes done for version process
--rollback: SELECT 1
DROP FUNCTION IF EXISTS public.parellel_insert(_query text, _concurrency integer, _st text, _stl text, _idx_name text);
CREATE OR REPLACE FUNCTION public.parellel_insert(_query text, _concurrency integer, _st text, _stl text, _idx_name text)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
	declare
		_idx_sql text;
		_idx_exists bool;
		_psql text;
		--_queue_length int;
		_worker text;
		_workers text[];
		_is_busy int;
		_r record;
		_feedback_cnt float := 0;
		_total_records int;
		_status bool;
		_workers_details jsonb := '{}'::jsonb;
		_if_capacity_available bool;
	begin 
		-- create index for lookup
		if _idx_name is not null then
			SELECT case when count(1) > 0 then true else false end into _idx_exists FROM pg_indexes WHERE indexname = _idx_name;
			if not _idx_exists then
				_idx_sql := 'CREATE INDEX IF NOT EXISTS ' || _idx_name || ' ON ' || _st || ' (' || _stl || ');';
				select async_query into _worker from public.async_query(_idx_sql);
				perform public.async_query_status(_worker, 'index');
				select async_query into _worker from public.async_query('VACUUM (FULL, ANALYSE, VERBOSE) ' || _st);
				perform public.async_query_status(_worker, 'index');
			end if;
		end if;
		--
		-- get capped concurrency according to input + server capacity
		_concurrency := least(_concurrency, 50);
		raise notice '_concurrency: %', _concurrency;

		SELECT ((current_setting('max_connections')::int/2) - count(1)) >= _concurrency into _if_capacity_available FROM pg_stat_activity WHERE pg_stat_activity.datname = current_database();
		raise notice '_if_capacity_available: %', _if_capacity_available;

		IF not _if_capacity_available THEN
			RAISE EXCEPTION 'Requested worker connections (_concurrency = %) not available. Please reduce the worker count.', _concurrency;
		END IF;
		--
		execute 'select count(1) from ' || _st || '' into _total_records;
		raise notice '_total_records: %', _total_records;
		--
		-- exception block
		BEGIN
			for _r in execute 'select quote_literal(' || _stl || ') as val, count(1) as cnt from ' || _st || ' group by 1 order by 2 asc' loop 
				_psql := replace(_query, '{where}', format($$ WHERE %1$s = %2$s $$, _stl, _r.val));
				select async_query into _worker from public.async_query(_psql);
				_workers := array_append(_workers, _worker);
				_workers_details := _workers_details || jsonb_build_object(_worker, _r.val);
				-- if jobs are more then limit
				if array_length(_workers, 1) > _concurrency-1 then
					FOREACH _worker in array _workers loop
						SELECT dblink_is_busy(_worker) into _is_busy;
						if _is_busy = 0 then
							select cnt + _feedback_cnt into _feedback_cnt from dblink_get_result(_worker, true) AS t1(cnt int);
							raise notice 'Progress: %', (_feedback_cnt/_total_records)*100;
							perform dblink_disconnect(_worker);
							_workers := array_remove(_workers, _worker);
							_workers_details := _workers_details - _worker;
						end if;
					end loop;
				end if;
				-- if limit breached
				if array_length(_workers, 1) > _concurrency-1 then
					-- raise notice 'Sleep: %', array_length(_workers, 1);
					perform pg_sleep(5);
				end if;
			end loop;
			-- final cleanup
			raise notice 'Final cleanup: %', array_length(_workers, 1);
			FOREACH _worker in array _workers loop
				select cnt + _feedback_cnt into _feedback_cnt from dblink_get_result(_worker, true) AS t1(cnt int);
				raise notice 'Progress: %', (_feedback_cnt/_total_records)*100;
				perform dblink_disconnect(_worker);
				_workers := array_remove(_workers, _worker);
				_workers_details := _workers_details - _worker;
			end loop;
			_status := true;
		exception when others then 
    		raise notice 'Error: %, Inputs: %', sqlerrm, _workers_details->>_worker;
			_status := false;
		END;
		-- cleanup connections in case any worker failed
		if not _status then
			FOREACH _worker in array _workers loop
				perform dblink_disconnect(_worker);
			end loop;
			RAISE EXCEPTION 'Error in % workers', array_length(_workers, 1);
		end if;
		return _status;
	end 
$function$
;

DROP FUNCTION IF EXISTS public.parellel_insert(_query text, _concurrency integer, _st text, _stl text, _idx_name text, _chunk integer);
CREATE OR REPLACE FUNCTION public.parellel_insert(_query text, _concurrency integer, _st text, _stl text, _idx_name text, _chunk integer)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
	declare
		_idx_sql text;
		_idx_exists bool;
		_psql text;
		--_queue_length int;
		_worker text;
		_workers text[];
		_is_busy int;
		_r record;
		_feedback_cnt float := 0;
		_total_records int;
		_status bool;
		_workers_details jsonb := '{}'::jsonb;
		_if_capacity_available bool;
	begin 
		-- create index for lookup
		if _idx_name is not null then
			SELECT case when count(1) > 0 then true else false end into _idx_exists FROM pg_indexes WHERE indexname = _idx_name;
			if not _idx_exists then
				_idx_sql := 'CREATE INDEX IF NOT EXISTS ' || _idx_name || ' ON ' || _st || ' (' || _stl || ');';
				select async_query into _worker from public.async_query(_idx_sql);
				perform public.async_query_status(_worker, 'index');
				select async_query into _worker from public.async_query('VACUUM (FULL, ANALYSE, VERBOSE) ' || _st);
				perform public.async_query_status(_worker, 'index');
			end if;
		end if;
		--
		-- get capped concurrency according to input + server capacity
		_concurrency := least(_concurrency, 50);
		raise notice '_concurrency: %', _concurrency;

		SELECT ((current_setting('max_connections')::int/2) - count(1)) >= _concurrency into _if_capacity_available FROM pg_stat_activity WHERE pg_stat_activity.datname = current_database();
		raise notice '_if_capacity_available: %', _if_capacity_available;

		IF not _if_capacity_available THEN
			RAISE EXCEPTION 'Requested worker connections (_concurrency = %) not available. Please reduce the worker count.', _concurrency;
		END IF;
		--
		execute 'select count(1) from ' || _st || '' into _total_records;
		raise notice '_total_records: %', _total_records;
		--
		-- exception block
		BEGIN
			--for _r in execute 'select quote_literal(' || _stl || ') as val, count(1) as cnt from ' || _st || ' group by 1 order by 2 asc' loop 
			for _r in execute 'select rn, string_agg(quote_literal(' || _stl || '), '', '') as val, sum(cnt) as cnt from (
				select ' || _stl || ', row_number() over(order by ' || _stl || ')/' || _chunk || ' rn, count(1) as cnt from ' || _st || ' group by ' || _stl || '
			) t group by 1 order by 3 asc' loop 
				--_psql := replace(_query, '{where}', format($$ WHERE %1$s = %2$s $$, _stl, _r.val));
				_psql := replace(_query, '{where}', format($$ WHERE %1$s IN(%2$s) $$, _stl, _r.val));
				-- raise notice '_psql: %', _psql;
				select async_query into _worker from public.async_query(_psql);
				_workers := array_append(_workers, _worker);
				_workers_details := _workers_details || jsonb_build_object(_worker, _r.val);
				-- if jobs are more then limit
				if array_length(_workers, 1) > _concurrency-1 then
					FOREACH _worker in array _workers loop
						SELECT dblink_is_busy(_worker) into _is_busy;
						if _is_busy = 0 then
							select cnt + _feedback_cnt into _feedback_cnt from dblink_get_result(_worker, true) AS t1(cnt int);
							raise notice 'Progress: %', (_feedback_cnt/_total_records)*100;
							perform dblink_disconnect(_worker);
							_workers := array_remove(_workers, _worker);
							_workers_details := _workers_details - _worker;
						end if;
					end loop;
				end if;
				-- if limit breached
				if array_length(_workers, 1) > _concurrency-1 then
					-- raise notice 'Sleep: %', array_length(_workers, 1);
					perform pg_sleep(5);
				end if;
			end loop;
			-- final cleanup
			raise notice 'Final cleanup: %', array_length(_workers, 1);
--			raise notice '_workers: %', _workers;
			if array_length(_workers, 1) > 0 then
				FOREACH _worker in array _workers loop
	--				SELECT dblink_is_busy(_worker) into _is_busy;
	--				raise notice 'A" %', _is_busy;
					select cnt + _feedback_cnt into _feedback_cnt from dblink_get_result(_worker, true) AS t1(cnt int);
	--				raise notice 'B';
					raise notice 'Progress: %', (_feedback_cnt/_total_records)*100;
					perform dblink_disconnect(_worker);
	--				raise notice 'C';
					_workers := array_remove(_workers, _worker);
					_workers_details := _workers_details - _worker;
				end loop;
			end if;
			_status := true;
		exception when others then 
			if current_setting('local.log_step', true) is not null then
				call global.data_ingestion_logs(current_setting('local.log_code', true), current_setting('local.sp_name', true), current_setting('local.log_step', true), SQLERRM, null, null);
			end if;
			raise notice 'Error: %, Inputs: %', SQLERRM, _workers_details->>_worker;
			_status := false;
		END;
		-- cleanup connections in case any worker failed
		if not _status then
			FOREACH _worker in array _workers loop
				perform dblink_disconnect(_worker);
			end loop;
			RAISE EXCEPTION 'Error in % workers', array_length(_workers, 1);
		end if;
		return _status;
	end 
$function$
;

DROP FUNCTION IF EXISTS public.parellel_insert(_query text, _concurrency integer, _st text, _stl text, _idx_name text, _chunk integer, _iterator_id character varying);
CREATE OR REPLACE FUNCTION public.parellel_insert(_query text, _concurrency integer, _st text, _stl text, _idx_name text, _chunk integer, _iterator_id character varying)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
	declare
		_idx_sql text;
		_idx_exists bool;
		_psql text;
		--_queue_length int;
		_worker text;
		_workers text[];
		_is_busy int;
		_r record;
		_feedback_cnt float := 0;
		_total_records int;
		_status bool;
		_workers_details jsonb := '{}'::jsonb;
		_if_capacity_available bool;
	begin 
		-- create index for lookup
		if _idx_name is not null then
			SELECT case when count(1) > 0 then true else false end into _idx_exists FROM pg_indexes WHERE indexname = _idx_name;
			if not _idx_exists then
				_idx_sql := 'CREATE INDEX IF NOT EXISTS ' || _idx_name || ' ON ' || _st || ' (' || _stl || ');';
				select async_query into _worker from public.async_query(_idx_sql);
				perform public.async_query_status(_worker, 'index');
				select async_query into _worker from public.async_query('VACUUM (FULL, ANALYSE, VERBOSE) ' || _st);
				perform public.async_query_status(_worker, 'index');
			end if;
		end if;
		--
		-- get capped concurrency according to input + server capacity
		_concurrency := least(_concurrency, 50);
		raise notice '_concurrency: %', _concurrency;

		SELECT ((current_setting('max_connections')::int/2) - count(1)) >= _concurrency into _if_capacity_available FROM pg_stat_activity WHERE pg_stat_activity.datname = current_database();
		raise notice '_if_capacity_available: %', _if_capacity_available;

		IF not _if_capacity_available THEN
			RAISE EXCEPTION 'Requested worker connections (_concurrency = %) not available. Please reduce the worker count.', _concurrency;
		END IF;
		--
		execute 'create temp table if not exists "' || _iterator_id || '_count" as select count(1) as cnt from ' || _st;
		execute 'select cnt from "' || _iterator_id || '_count"' into _total_records;
		raise notice '_total_records: %', _total_records;
		--
		-- exception block
		BEGIN
			execute 'create temp table if not exists "' || _iterator_id || '_chunk_lookup" as select rn, string_agg(quote_literal(' || _stl || '), '', '') as val, sum(cnt) as cnt from (
				select ' || _stl || ', row_number() over(order by ' || _stl || ')/' || _chunk || ' rn, count(1) as cnt from ' || _st || ' group by ' || _stl || '
			) t group by 1 order by 3 asc';
			for _r in execute 'select * from "' || _iterator_id || '_chunk_lookup"' loop 
				_psql := replace(_query, '{where}', format($$ WHERE %1$s IN(%2$s) $$, _stl, _r.val));
				-- raise notice '_psql: %', _psql;
				select async_query into _worker from public.async_query(_psql);
				_workers := array_append(_workers, _worker);
				_workers_details := _workers_details || jsonb_build_object(_worker, _r.val);
				-- if jobs are more then limit
				if array_length(_workers, 1) > _concurrency-1 then
					FOREACH _worker in array _workers loop
						SELECT dblink_is_busy(_worker) into _is_busy;
						if _is_busy = 0 then
							select cnt + _feedback_cnt into _feedback_cnt from dblink_get_result(_worker, true) AS t1(cnt int);
							raise notice 'Progress: %', (_feedback_cnt/_total_records)*100;
							perform dblink_disconnect(_worker);
							_workers := array_remove(_workers, _worker);
							_workers_details := _workers_details - _worker;
						end if;
					end loop;
				end if;
				-- if limit breached
				if array_length(_workers, 1) > _concurrency-1 then
					-- raise notice 'Sleep: %', array_length(_workers, 1);
					perform pg_sleep(5);
				end if;
			end loop;
			-- final cleanup
			raise notice 'Final cleanup: %', array_length(_workers, 1);
--			raise notice '_workers: %', _workers;
			if array_length(_workers, 1) > 0 then
				FOREACH _worker in array _workers loop
--					SELECT dblink_is_busy(_worker) into _is_busy;
--					raise notice 'A" %', _is_busy;
					select cnt + _feedback_cnt into _feedback_cnt from dblink_get_result(_worker, true) AS t1(cnt int);
--					raise notice 'B';
					raise notice 'Progress: %', (_feedback_cnt/_total_records)*100;
					perform dblink_disconnect(_worker);
					_workers := array_remove(_workers, _worker);
					_workers_details := _workers_details - _worker;
				end loop;
			end if;
			_status := true;
		exception when others then 
			if current_setting('local.log_step', true) is not null then
				call global.data_ingestion_logs(current_setting('local.log_code', true), current_setting('local.sp_name', true), current_setting('local.log_step', true), SQLERRM, null, null);
			end if;
			raise notice 'Error: %, Inputs: %', SQLERRM, _workers_details->>_worker;
			_status := false;
		END;
		-- cleanup connections in case any worker failed
		if not _status then
			FOREACH _worker in array _workers loop
				perform dblink_disconnect(_worker);
			end loop;
			RAISE EXCEPTION 'Error in % workers', array_length(_workers, 1);
		end if;
		return _status;
	end 
$function$
;
