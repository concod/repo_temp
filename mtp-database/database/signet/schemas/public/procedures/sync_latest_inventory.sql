--liquibase formatted sql
--changeset liquibase:sync_latest_inventory runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_latest_inventory
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_latest_inventory();
CREATE OR REPLACE PROCEDURE public.sync_latest_inventory()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_latest_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.latest_inventory 
		where 
		  true;
		insert into inventory_smart.latest_inventory (
		  product_code, store_code, child_sku, 
		  oh, it, oo
		) 
		SELECT 
		  product_code, 
		  store_code, 
		  child_sku, 
		  oh, 
		  it, 
		  oo 
		FROM 
		  public.latest_inventory x 
		  join global.product_master using(product_code);
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
