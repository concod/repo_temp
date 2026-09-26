--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:update_sync_sku_status_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:RLIS-281
--comment: updated SP for sync_update_sku_status
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_update_sku_status();
CREATE OR REPLACE PROCEDURE public.sync_update_sku_status()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_update_sku_status';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        update "global".product_time_attributes
        set attribute_value ='inactive'
        where attribute_name='status' and attribute_value ='active' and product_code  in 
        (select product_code from "global".product_master where active)  and updated_by is null;
        update "global".product_time_attributes
        set attribute_value = 'active'
        where attribute_name ='status' and attribute_value = 'inactive' and product_code in 
        (select product_code from "global".product_master where not active) and updated_by is null;
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
