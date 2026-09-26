--liquibase formatted sql
--changeset ashish@impactanalytics.co:post_ingestion_maintinance runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: initial changeset for post_ingestion_maintinance
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.post_ingestion_maintinance();
CREATE OR REPLACE PROCEDURE public.post_ingestion_maintinance()
 LANGUAGE plpgsql
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.post_ingestion_maintinance';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
		_worker text;
		_workers_status bool := true;
		_worker_status bool;
		_rs jsonb;
		_rss jsonb[];
		_r record;
		_task jsonb;
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		_st := clock_timestamp();
		FOR _r in select bucket, defs from global.post_ingestion_items order by bucket asc loop
			FOREACH _task in array _r.defs loop
				select async_query into _worker from public.async_query(_task->>'def');
				_rss := array_append(_rss, (_task || jsonb_build_object('worker', _worker)));
--				raise notice '%, %', _r.bucket, _task;
			end loop;
			FOREACH _rs in array _rss loop
				select async_query_status into _worker_status from public.async_query_status(_rs->>'worker', _rs->>'type');
				_workers_status := _workers_status and _worker_status;
			end loop;
			_rss := '{}'::jsonb[];
			raise notice '_bucket: %, _workers_status: %, _time_taken: %', _r.bucket, _workers_status, (clock_timestamp() - _st);
		end loop;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end
$procedure$
;

