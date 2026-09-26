-- liquibase formatted sql
-- changeset abhishek.verma@impactanalytics.co:sync_tb_latest_inventory runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_tb_latest_inventory
-- comment: derived table for tb_latest_inventory

DROP PROCEDURE IF EXISTS public.sync_tb_latest_inventory;

CREATE OR REPLACE PROCEDURE public.sync_tb_latest_inventory()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_tb_latest_inventory';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    TRUNCATE TABLE global.tb_latest_inventory;

    insert into global.tb_latest_inventory
    (product_id, clearance_indicator, "date", oh, it, oo, vendor_oo, total_inventory, clearance_indicator_rf,
     lifecycle, age, "ST", clearance_eligible, store_id)
    select
    product_id, clearance_indicator, "date", oh, it, oo, vendor_oo, total_inventory, clearance_indicator_rf,
    lifecycle, age, "ST", clearance_eligible, store_id
    from public.tb_inventory;
    
    TRUNCATE TABLE global.tb_latest_inventory_agg;
    
    insert into global.tb_latest_inventory_agg
    (product_id, oh, it, oo, vendor_oo, total_inventory)
    select
    product_id, sum(oh),sum(it), sum(oo), sum(vendor_oo), sum(total_inventory)
    from public.tb_inventory
    group by product_id;
    
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
end;
$procedure$;
