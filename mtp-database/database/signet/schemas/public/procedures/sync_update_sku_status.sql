--liquibase formatted sql
--changeset sri.harsha@impactanalytics.co:update_sync_sku_status_revert runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:MTP-45360
--comment: Reverting SP to make deleted SKUs inactive , and make them back active if they are activated through feed & supersession skus handling
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
		where attribute_name='status' and attribute_value ='active' and product_code  not in 
		(select product_code  from public.product_validated_table pvt);

		update "global".product_time_attributes
		set attribute_value = 'active'
		where attribute_name ='status' and attribute_value = 'inactive' and product_code in 
		(select product_code  from public.product_validated_table pvt) and updated_by is null
		AND CURRENT_DATE BETWEEN start_time AND end_time;
		
		create TEMPORARY table supersession_sku_status_update as (
		select old_product_code as product_code,old_l0_name as l0_name,'active' as attribute_value
		from inventory_smart.style_mapping_table where current_date > end_date group by 1,2,3
		union all 
		select old_product_code as product_code,old_l0_name as l0_name,'inactive' as attribute_value
		from inventory_smart.style_mapping_table where current_date between start_date and end_date group by 1,2,3);
		
		update "global".product_time_attributes a
		set attribute_value = b.attribute_value
		from supersession_sku_status_update b
		where b.l0_name=a.l0_name and b.product_code=a.product_code and (current_date between  start_time and end_time); 

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