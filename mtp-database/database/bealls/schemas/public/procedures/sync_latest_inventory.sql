--liquibase formatted sql
--changeset ujjawal.singh@impactanalytics.co:sync_latest_inventory runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:custom_sync_latest_inventory
--comment: creating sp for latest_inventory


DROP PROCEDURE IF EXISTS public.sync_latest_inventory();
CREATE OR REPLACE PROCEDURE public.sync_latest_inventory()
 LANGUAGE plpgsql
AS $procedure$
declare
        _worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_latest_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
     begin     
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
         select async_query into _worker from public.async_query('truncate inventory_smart.latest_inventory;');
          
         perform public.async_query_status(_worker, 'cleanup');
         raise notice 'Step1: %', (clock_timestamp() - _st);

         perform public.parellel_insert('WITH rows AS (
            insert into inventory_smart.latest_inventory (
              product_code, store_code, channel,date, 
              oh, it, oo
            ) 
         SELECT 
              product_code, 
              store_code, 
              channel, 
        date,
              oh, 
              it, 
              oo
            FROM 
           public.latest_inventory {where} on conflict do nothing RETURNING 1
        ) 
        SELECT 
          count(1) as cnt 
        FROM 
          rows;', 50, 'public.latest_inventory', 'product_code', 'pli_idx', 500);
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