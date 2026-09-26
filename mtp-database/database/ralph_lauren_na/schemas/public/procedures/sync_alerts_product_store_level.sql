--liquibase formatted sql
--changeset pooja.shekar:sync_alerts_product_store_level_rtl_zone_id_column_addiiton runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:MTP-69186
--comment: added rtl_zone_id column
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_store_level(bool);
CREATE OR REPLACE PROCEDURE public.sync_alerts_product_store_level(IN _is_historic boolean DEFAULT true)
 LANGUAGE plpgsql
AS $procedure$
declare
		_worker text;
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_store_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
 	begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
 		select async_query into _worker from public.async_query('truncate table
 		  inventory_smart.alerts_product_store_level;');
 		perform public.async_query_status(_worker, 'cleanup');
 		 raise notice 'Step1: %', (clock_timestamp() - _st);

-- 		 perform global.create_drop_index_list_ingestion('inventory_smart', 'latest_inventory', true);
-- 		 raise notice 'Step2: %', (clock_timestamp() - _st);

 		perform public.parellel_insert('WITH rows AS (
			INSERT INTO inventory_smart.alerts_product_store_level (
			article,store_code,l0_name,l1_name,l2_name,l3_name,
			l4_name,dtc_year,pfs_year,dtc_season,pfs_season,brand,country,district,region,climate,state,city,
			channel,product_description,style_color_id,dc_flag,excs_flg,shrtfl_flg,stckout_flg,
			oh,it,oo,lw_units,lw_revenue,lw_margin,lw_gm_perc,promo_percentage,wos,size_integrity,week_to_date_sales,
			last_day_sales,oh_dc,sales_1_ago,sales_2_ago,sales_3_ago,sales_4_ago,sales_5_ago,sales_6_ago,sales_7_ago,sales_8_ago,
			aur,excs_is_resolved,shrtfl_is_resolved,stckout_is_resolved,s1_name,s2_id,s3_name,s4_name,store_group,product_group, excess,shortfall,stockout,normal,
			clearance_alert_flag,markdown_alert_flag,floorset_alert_flag,newly_launched_alert_flag,clearance_is_resolved,markdown_is_resolved,floorset_is_resolved,newly_launched_is_resolved,number_of_allocations,rtl_coordinate_group_desc,source_code,vendor_case_pack,model_description,clearance,markdown,floorset,newlylaunched,dc_instock_pct
		) 
		SELECT 
			article,store_code,l0_name,l1_name,l2_name,l3_name,
			l4_name,dtc_year,pfs_year,dtc_season,pfs_season,brand,country,district,region,climate,state,city,
			channel,product_description,style_color_id,dc_flag,excs_flg,shrtfl_flg,stckout_flg,
			oh,it,oo,lw_units,lw_revenue,lw_margin,lw_gm_perc,promo_percentage,wos,size_integrity,week_to_date_sales,
			last_day_sales,oh_dc,sales_1_ago,sales_2_ago,sales_3_ago,sales_4_ago,sales_5_ago,sales_6_ago,sales_7_ago,sales_8_ago,
			aur,excs_is_resolved,shrtfl_is_resolved,stckout_is_resolved,s1_name,s2_id,s3_name,s4_name,store_group,product_group, excess,shortfall,stockout,normal,
			clearance_alert_flag,markdown_alert_flag,floorset_alert_flag,newly_launched_alert_flag,clearance_is_resolved,markdown_is_resolved,floorset_is_resolved,newly_launched_is_resolved, 0 number_of_allocations,rtl_coordinate_group_desc,source_code,vendor_case_pack,model_description,clearance,markdown,floorset,newlylaunched,dc_instock_pct
		FROM 
		  public.alerts_product_store_level {where} RETURNING 1
			) 
			SELECT 
			  count(1) as cnt 
			FROM 
			  rows;', 50, 'public.alerts_product_store_level', 'article', 'li_idx', 100);
		raise notice 'Step2: %', (clock_timestamp() - _st);
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