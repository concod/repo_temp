--liquibase formatted sql
--changeset samarjit.mazumder@impactanalytics.co:sync_alerts_product_level runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:briscoes_sync_alerts_product_level
--comment: initial changeset for sync_alerts_product_level
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_level(IN _is_historic boolean);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_level(IN _is_historic boolean DEFAULT true)
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
		  inventory_smart.alerts_product_level_base 
		where 
		  true; 

		INSERT INTO inventory_smart.alerts_product_level_base (
			    article, l0_name, l1_name, l2_name, l3_name,
			--	 l4_name
				 l5_name,
				 l6_name,
                channel, 
			    sales_org_name,
			    ---Column name change
                excess_flag, shortfall_flag, stockout_flag
                ---
                , excess, shortfall,
                stockout, normal, oh, it, oo, lw_units, lw_revenue, lw_margin, promo_percentage, wos, 
             	size_integrity, week_to_date_sales, last_day_sales, oh_dc, sales_1_ago, sales_2_ago, sales_3_ago, 
                sales_4_ago, aur, clearance_alert_flag, newly_launched_alert_flag, number_of_allocations, 
				wos_oh, wos_oh_it, tot_inv,
				---Newly added
				style_name, sk_is_resolved, shortfall_is_resolved, overstock_is_resolved
				---Newly added 1
				, newly_launched_is_resolved
				   ---Newly added 2
                , local_flag, info_lifecycle_description
                ---Newly added 3
                , nested_pack_alert_flag, nested_pack_is_resolved 
                
		) 
		SELECT 
			    article, l0_name, l1_name, l2_name, l3_name,
			--	 l4_name
				  l5_name,
                l6_name,
                channel,
			    sales_org_name,
			    ---Column name change
                excess_flag, shortfall_flag, stockout_flag
                ---
                , excess, shortfall,
            	stockout, normal, oh, it, oo, lw_units, lw_revenue, lw_margin, promo_percentage, wos, 
                size_integrity, week_to_date_sales, last_day_sales, oh_dc, sales_1_ago, sales_2_ago, sales_3_ago, 
                sales_4_ago, aur, clearance_alert_flag, newly_launched_alert_flag, 0 as  number_of_allocations, 
				wos_oh, wos_oh_it, tot_inv,
				---Newly added
				style_name, stockout_is_resolved as sk_is_resolved, shortfall_is_resolved, overstock_is_resolved
				---Newly added 1
				, newly_launched_is_resolved
				    ---Newly added 2
                , local_flag, info_lifecycle_description
                ---Newly added 3
                , nested_pack_alert_flag, nested_pack_is_resolved 
		FROM 
		  public.alerts_product_level;
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