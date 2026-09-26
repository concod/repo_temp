--liquibase formatted sql
--changeset liquibase:sync_oms_deep_dive_base runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial changeset for sync_oms_deep_dive_base
--rollback: SELECT 1
--changeset aman_lakkoju:ecom_forecast_org,net_allocation_total_0,SMA_inv column added runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-43713
--comment: ecom_forecast_org,net_allocation_total_0,SMA_inv column added
DROP PROCEDURE IF EXISTS public.sync_oms_deep_dive_base();
CREATE OR REPLACE PROCEDURE public.sync_oms_deep_dive_base(IN _is_historic boolean DEFAULT false)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_oms_deep_dive_base';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
  
   if _is_historic then 
             delete from 
               inventory_smart.oms_deep_dive_base 
             where 
               true;
         end if;
   insert into inventory_smart.oms_deep_dive_base
       (   	id,
       		product_code,
		   	dc_id,
		   	fiscal_year_week ,
			week ,
			"Month" ,
			predicted_qty ,
			eff_lead_time ,
			rolling_std_dev ,
			rolling_forecast ,
			variance ,
			safety_stock ,
			receipt1 ,
			receipt1_qc,
			total_dc_forecast ,
			dc_inv,
			total_stores,
			total_mins,
			additional_forecast,
			additional_inventory,
			lost_sales,
			inventory_deficit,
			ecom_forecast,
			ecom_reserve,
			excess_inv,
			ecom_forecast_org,
			net_allocation_total_0,
			SMA_inv
        )
   select
    nextval('inventory_smart.oms_deep_dive_base_id_seq') as id,
   	product_code,
   	dc_id,
   	fiscal_year_week ,
	week::date,
	"Month" ,
	predicted_qty,
	eff_lead_time ,
	rolling_std_dev,
	rolling_forecast,
	variance ,
	safety_stock ,
	receipt1,
	receipt1_qc,
	total_dc_forecast ,
	dc_inv,
	total_stores,
	total_mins,
	additional_forecast,
	ROUND(additional_inventory::numeric,3)::float4,
	lost_sales,
	inventory_deficit,
	ecom_forecast,
	ecom_reserve,
	excess_inv_ew,
	ecom_forecast_org,
	net_allocation_total_0,
	SMA_inv       
   from
     
     public.oms_deep_dive_base
   ON conflict on constraint uk_oms_deep_dive_base DO NOTHING;
  
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
