--liquibase formatted sql
--changeset swapnil.bhange@impactanalytics.co:sync_latest_inventory_delta_v1 runOnChange:true stripComments:false splitStatements:false context:sync_latest_inventory_delta_v1
--comment: Changeset for sync_latest_inventory_delta_v1
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_latest_inventory_delta();
CREATE OR REPLACE PROCEDURE public.sync_latest_inventory_delta()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_latest_inventory_delta';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	        TRUNCATE TABLE inventory_smart.latest_inventory_delta;

	        INSERT INTO inventory_smart.latest_inventory_delta(
					    "date",
    					channel,
    					product_code,
    					store_code,
    					oh,
    					it,
    					oo,
    					store_type,
    					display_article,
    					updated_at)
					select distinct 
					  date::date as date,
					  channel,
					  product_code,
					  store_code,
					  oh,
					  it,
					  oo,
					  store_type,
					  display_article,
					  Now() AS updated_at
					FROM public.intermediate_inventory_delta
				group by 1,2,3,4,5,6,7,8,9
					;
				
				
				
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
