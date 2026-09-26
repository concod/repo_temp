--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:sync_product_store_hierarchy_mapping runOnChange:true stripComments:false splitStatements:false context:Release_1_1 labels:DAT-1216
--comment: adding l2_name in M&S
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_product_store_hierarchy_mapping();
CREATE OR REPLACE PROCEDURE public.sync_product_store_hierarchy_mapping(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_product_store_hierarchy_mapping';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  delete from "global".product_store_hierarchy_mapping 
  where true;
  insert into "global".product_store_hierarchy_mapping
     (
       market , 
       country , 
      l0_name ,
      l1_name ,
      channel,
      l2_name
     )
  select
       market , 
       country , 
      l0_name ,
      l1_name ,
      channel ,
      l2_name
  from
    public.product_store_hierarchy_mapping;
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