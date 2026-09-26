--liquibase formatted sql
--changeset navin.chandan@impactanalytics.co:sync_kpi_result_2 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:briscoes_sync_kpi_result
--comment: initial changeset for sync_kpi_result
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_kpi_result();

CREATE OR REPLACE PROCEDURE public.sync_kpi_result()
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_kpi_result';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		select async_query into _worker from public.async_query('truncate table inventory_smart.kpi_result;');
		perform public.async_query_status(_worker, 'cleanup');
		raise notice 'Step1: %', (clock_timestamp() - _st);
 		
        perform public.parellel_insert('WITH rows AS (
	    insert into inventory_smart.kpi_result (
			  granularity, store_code, product_code, calculation_date, kpi_values, calculated_at, article			  
			) 
			select 
              granularity, store_code, product_code, calculation_date, kpi_values::jsonb, calculated_at::timestamp, article    
            from 
              public.kpi_result {where} RETURNING 1
        ) 
		SELECT 
		  count(1) as cnt 
		FROM 
		  rows;', 50, 'public.kpi_result', 'product_code', 'pkpi_res_idx', 10000);
 		raise notice 'Step2: %', (clock_timestamp() - _st);
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
