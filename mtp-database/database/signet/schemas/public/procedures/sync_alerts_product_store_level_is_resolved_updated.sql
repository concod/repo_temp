--liquibase formatted sql
--changeset swapnil.bhange:sync_alerts_product_store_level_is_resolved_updated_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:123
--comment: fix for sync_alerts_product_store_level_is_resolved_updated
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level_is_resolved_updated();
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level_is_resolved_updated(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_level_is_resolved_updated()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_store_level_is_resolved_updated';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

		update inventory_smart.alerts_product_store_level a
		SET msviaf_is_resolved = b.msviaf_is_resolved, 
			fom_is_resolved = b.fom_is_resolved
		FROM "global".alerts_product_store_is_resolved b
		where a.product_code = b.product_code
		      AND a.store_code = b.store_code;

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