--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:sync_latest_inventory runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:DAT-832
--comment: sync_latest_inventory delete replaced with truncate
--rollback: SELECT 1
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
 		select async_query into _worker from public.async_query('truncate table
 		  inventory_smart.latest_inventory;');
 		perform public.async_query_status(_worker, 'cleanup');
 		-- raise notice 'Step1: %', (clock_timestamp() - _st);

 		-- perform global.create_drop_index_list_ingestion('inventory_smart', 'latest_inventory', true);
 		-- raise notice 'Step2: %', (clock_timestamp() - _st);

 		perform public.parellel_insert('WITH rows AS (
			insert into inventory_smart.latest_inventory (
			  product_code, store_code, channel, 
			  oh, it, oo, book_inv, rfid_inv
			) 
			SELECT 
			  product_code, 
			  store_code, 
			  channel, 
			  oh, 
			  it, 
			  oo, book_inv, rfid_inv 
			FROM 
			  public.latest_inventory {where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.latest_inventory', 'store_code', 'pli_idx');
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
