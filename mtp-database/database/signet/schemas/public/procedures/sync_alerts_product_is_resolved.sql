--liquibase formatted sql
--changeset swapnil.bhange:sync_alerts_product_is_resolved_1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:123456
--comment: SP for sync_alerts_product_is_resolved_1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_is_resolved();
DROP PROCEDURE IF EXISTS public.sync_alerts_product_is_resolved(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_is_resolved(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_is_resolved';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
	    if _is_historic then 
   	 		delete from 
   	 		  "global".alerts_product_is_resolved
   	 		where 
   	 		  true;
    		end if;
      	
	  	INSERT INTO "global".alerts_product_is_resolved (
	  product_code,
	  cf_is_resolved,
      nsfe_is_resolved,
      pdfesc_is_resolved,
      uip_is_resolved ,
      uisc_is_resolved,
      pdfep_is_resolved,
	  zfsa_is_resolved,
	  zfea_is_resolved
	) 
select 
	a.product_code,
    a.cf_is_resolved,
    a.nsfe_is_resolved,
    a.pdfesc_is_resolved,
    a.uip_is_resolved ,
    a.uisc_is_resolved,
    a.pdfep_is_resolved,
	a.zfsa_is_resolved,
	a.zfea_is_resolved
	from 
	  inventory_smart.alerts_product_level a 
	where 
	  (cf_is_resolved = '1' and constrained_forecast = 1) 
	  or (nsfe_is_resolved = '1' and new_skus_forecast_error = 1)
	  or (pdfesc_is_resolved = '1' and percentage_dc_forecast_error_sd_cl = 1)
	  or (uip_is_resolved = '1' and unproductive_inventory_prog = 1)
	  or (uisc_is_resolved = '1' and unproductive_inventory_sd_cl = 1)
	  or (pdfep_is_resolved = '1' and percentage_dc_forecast_error_prog = 1)
	  or (zfsa_is_resolved = '1' and zero_forecast_sku_alert = 1)
	  or (zfea_is_resolved = '1' and zero_forecast_ecom_alert = 1);
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
