--liquibase formatted sql
--changeset kanishka.parashar@impactanalytics.co:adding_store_time_attributes_sp1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start1
--comment: sync_store_time_attributes1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_store_time_attributes();

CREATE OR REPLACE PROCEDURE public.sync_store_time_attributes()
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_store_time_attributes';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		select async_query into _worker from public.async_query('call global.build_list_partitions(''store_time_attributes'')');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice '	Step 1: %', (clock_timestamp() - _st);
	
 		perform public.parellel_insert('WITH rows AS (
    	INSERT INTO global.store_time_attributes
        (store_code,attribute_name,attribute_value, start_time, end_time)
	    select 	x.store_code, 
				x.attribute_name, 
				x.attribute_value,
                x.season_start_date,
 				x.season_end_date
    	FROM
        public.store_status x
		join global.store_master sm using(store_code) 
		{where} 
		ON CONFLICT (store_code, attribute_name, start_time,end_time) DO
    	UPDATE
    	SET
        attribute_value = EXCLUDED.attribute_value
		RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.store_status', 'store_code', 'psst_idx', 500);
 		raise notice 'Step2: %', (clock_timestamp() - _st);

 		perform public.parellel_insert('WITH rows AS (
    	INSERT INTO global.store_time_attributes
        (store_code,attribute_name,attribute_value, start_time, end_time)
	    select 	x.dc_code, 
				x.attribute_name, 
				x.attribute_value,
                x.start_date,
 				x.end_date
    	FROM
        public.dc_status x
		{where} 
		ON CONFLICT (store_code, attribute_name, start_time,end_time) DO
    	UPDATE
    	SET
        attribute_value = EXCLUDED.attribute_value
		RETURNING 1
		) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.dc_status', 'dc_code', 'pdcst_idx', 500);
 	 	raise notice 'Step3: %', (clock_timestamp() - _st);
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$
;
