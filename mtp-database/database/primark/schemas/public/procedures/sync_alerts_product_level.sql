--liquibase formatted sql
--changeset aman_lakkoju:sync_alerts_product_level_updated runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sync_alerts_product_level_updated
--comment: sync_alerts_product_level_updated
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_alerts_product_level();
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_level()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
		delete from 
		  inventory_smart.alerts_product_level
		where 
		  true; 


		INSERT INTO inventory_smart.alerts_product_level (
			article,
			channel,
			launch_date,
			l0_name,
			l1_name,
			l2_name,
			l3_name,
			product_description,
			product_type,
			item_status,
			excess,
			shortfall,
			stockout,
			normal,
			oh,
			it,
			oo,
			dc_oh,
			dc_oo,
			tot_inv,
			sales_1_ago,
			lw_revenue,
			lw_margin,
			promo_percentage,
			wos_oh,
			wos_oh_it,
			wos_oh_oo_it,
			size_integrity,
			clearance_alert_flag,
			newly_launched_alert_flag,
			retirement_alert_flag,
			excs_flg,
			stckout_flg,
			shrtfl_flg,
			stockout_is_resolved,
			shortfall_is_resolved,
			overstock_is_resolved,
			new_product_is_resolved,
			new_product_alert_flag,
			clearance_date,
			clearance_is_resolved
		)
		SELECT 
			article,
			channel,
			launch_date,
			l0_name,
			l1_name,
			l2_name,
			l3_name,
			product_description,
			a.product_type,
			a.item_status,
			excess,
			shortfall,
			stockout,
			normal,
			oh,
			it,
			oo,
			dc_oh,
			dc_oo,
			tot_inv,
			sales_1_ago,
			lw_revenue,
			lw_margin,
			promo_percentage,
			wos_oh,
			wos_oh_it,
			wos_oh_oo_it,
			size_integrity,
			clearance_alert_flag,
			newly_launched_alert_flag,
			retirement_alert_flag,
			excs_flg,
			stckout_flg,
			shrtfl_flg,
			stockout_is_resolved,
			shortfall_is_resolved,
			overstock_is_resolved,
			new_product_is_resolved,
			new_product_alert_flag,
			clearance_date,
			clearance_is_resolved
		FROM 
		  public.alerts_product_level a
		  left join (select distinct article,product_type,item_status from global.product_attributes_filter ) paf using(article);
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
