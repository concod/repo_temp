--liquibase formatted sql
--changeset aman_lakkoju:product_type_item_status columns added runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: product_type_item_status columns added
--rollback: SELECT 1

DROP PROCEDURE if exists public.sync_alerts_product_store_level();
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_level(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_store_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.alerts_product_store_level 
		where 
		  true; 


		INSERT INTO inventory_smart.alerts_product_store_level (
			article,
			store_code,
			l0_name,
			l1_name,
			l2_name,
			primary_trait_desc,
			l3_name,
			l4_name,
			l5_name,
			channel,
			product_description,
			dc_flag,
			excs_flg,
			shrtfl_flg,
			stckout_flg,
			excess,
			shortfall,
			stockout,
			normal,
			oh,
			it,
			oo,
			lw_units,
			lw_revenue,
			lw_margin,
			size_integrity,
			clearance_alert_flag,
			newly_launched_alert_flag,
			retirement_alert_flag,
			tot_inv,
			promo_percentage,
			wos_oh,
			wos_oh_it,
			wos_oh_oo_it,
			stockout_is_resolved,
			shortfall_is_resolved,
			overstock_is_resolved,
			store_name,
			region,
			state,
			district,
			store_attribute_1,
			uda_value_desc,
			product_type,
			item_status 

		) 
		SELECT 
			article,
			store_code,
			l0_name,
			l1_name,
			l2_name,
			primary_trait_desc,
			l3_name,
			l4_name,
			l5_name,
			channel,
			product_description,
			dc_flag,
			excs_flg,
			shrtfl_flg,
			stckout_flg,
			excess,
			shortfall,
			stockout,
			normal,
			oh,
			it,
			oo,
			lw_units,
			lw_revenue,
			lw_margin,
			size_integrity,
			clearance_alert_flag,
			newly_launched_alert_flag,
			retirement_alert_flag,
			tot_inv,
			promo_percentage,
			wos_oh,
			wos_oh_it,
			wos_oh_oo_it,
			0 as stockout_is_resolved,
			0 as shortfall_is_resolved,
			0 as overstock_is_resolved,
			store_name,
			region,
			state,
			district,
			store_attribute_1,
			uda_value_desc,
			product_type,
			item_status 
		FROM 
		  public.alerts_product_store_level
		  left join (select article,uda_value_desc,product_type,item_status from global.product_attributes_filter where ia_sku_type in ('master','eaches')) paf using(article);
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