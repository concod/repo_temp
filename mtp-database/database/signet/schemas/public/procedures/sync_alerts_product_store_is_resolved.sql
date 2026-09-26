--liquibase formatted sql
--changeset swapnil.bhange:sync_alerts_product_store_is_resolved_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:123456
--comment: SP for sync_alerts_product_store_is_resolved 
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_is_resolved();
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_is_resolved(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_is_resolved(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_store_is_resolved';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    	    if _is_historic then 
   	 		delete from 
   	 		  "global".alerts_product_store_is_resolved
   	 		where 
   	 		  true;
    		end if;
		INSERT INTO "global".alerts_product_store_is_resolved (
	  product_code,
          store_code,
          fom_is_resolved,
          msviaf_is_resolved
	) 
	select 
	      a.product_code,
          a.store_code,
	      a.fom_is_resolved,
          a.msviaf_is_resolved
	from 
	  inventory_smart.alerts_product_store_level a 
	where 
	      (msviaf_is_resolved = '1' and ms_vs_ia_forecast = 1) 
          or (fom_is_resolved = '1' and forecast_over_max = 1);
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
