--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:sync_po_master runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: removed filters
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_po_master();
CREATE OR REPLACE PROCEDURE public.sync_po_master()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_po_master';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		delete from 
 		  inventory_smart.po_master 
 		where 
 		  true;
 		insert into inventory_smart.po_master (
 		  po_code, product_code, channel, requirement_date, po_date,
 		  dc_code,ordered_qty, allocated_qty, available_qty,not_before_date
 		) 
 		SELECT 
 		  po_code, 
 		  product_code, 
 		  channel, 
 		  requirement_date, 
 		  po_date,
 		  dc.dc_code,
 		  available_qty AS ordered_qty,
 		  allocated_qty, 
 		  available_qty,
 		  not_before_date
 		FROM 
 		  public.po_master_derived x 
 		  join global.store_master dc on x.dc_code = dc.store_code 
 		  join global.product_master pm using(product_code);
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

