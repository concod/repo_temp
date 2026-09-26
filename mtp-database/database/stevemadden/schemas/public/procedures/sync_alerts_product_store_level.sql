--liquibase formatted sql
--changeset sriraj.varanasi@impactanalytics.co:sync_alerts_products_store_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:sm_sync_alerts_products_store_level
--comment: initial changeset for sync_alerts_products_store_level
--rollback: SELECT 1-- DROP PROCEDURE public.sync_alerts_product_store_level(bool);
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level(IN _is_historic boolean);
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
			article, store_code, l0_name, l1_name, l2_name, l3_name, l4_name, climate, 
			state, city, s1_name, s3_name, product_group, store_group, channel, product_description,
			dc_flag, excs_flg, shrtfl_flg, stckout_flg, excess, shortfall, stockout, normal, oh, it,
			oo, lw_units, lw_revenue, lw_margin, promo_percentage, wos, size_integrity, week_to_date_sales,
			last_day_sales, oh_dc, sales_1_ago, sales_2_ago, sales_3_ago, sales_4_ago, aur, excs_is_resolved,
			shrtfl_is_resolved, stckout_is_resolved, clearance_alert_flag, newly_launched_alert_flag,
			clearance_is_resolved, newly_launched_is_resolved, vendor_case_pack
			-- newly added columns sriraj.varanasi@impactanalytics.co
			, number_of_allocations,wos_oh, wos_oh_it, tot_inv,special_classification, style_name
			-- newly added columns samarjit.mazumder@impactanalytics.co
			, s2_name
		) 
		SELECT 
			article, store_code, l0_name, l1_name, l2_name, l3_name, l4_name, climate,
			state, city, s1_name, s3_name, product_group, store_group, channel, product_description,
			dc_flag, excs_flg, shrtfl_flg, stckout_flg, excess, shortfall, stockout, normal, oh, it,
			oo, lw_units, lw_revenue, lw_margin, promo_percentage, wos, size_integrity, week_to_date_sales,
			last_day_sales, oh_dc, sales_1_ago, sales_2_ago, sales_3_ago, sales_4_ago, aur, excs_is_resolved,
			shrtfl_is_resolved, stckout_is_resolved, clearance_alert_flag, newly_launched_alert_flag,
			clearance_is_resolved, newly_launched_is_resolved, vendor_case_pack
			-- newly added columns sriraj.varanasi@impactanalytics.co

			, 0 as number_of_allocations,wos_oh, wos_oh_it, tot_inv, special_classification, style_name
			-- newly added columns samarjit.mazumder@impactanalytics.co
			, city as s2_name
		FROM 
		  public.alerts_product_store_level;
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
