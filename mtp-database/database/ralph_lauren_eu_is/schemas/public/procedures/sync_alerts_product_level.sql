--liquibase formatted sql
--changeset vivek.subramanya@impactanalytics.co:sync_alerts_product_level_MTP-20674 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:MTP-20674
--comment: SP reference fixes
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_alerts_product_level();
DROP PROCEDURE IF EXISTS public.alerts_product_level();
DROP PROCEDURE IF EXISTS public.sync_alerts_product_level(IN _is_historic boolean);
DROP PROCEDURE IF EXISTS public.alerts_product_level(IN _is_historic boolean);
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
		  inventory_smart.alerts_product_level 
		where 
		  true; 

		INSERT INTO inventory_smart.alerts_product_level (
			article,l0_name,l1_name,l2_name,l3_name,
			l4_name,dtc_year,pfs_year,dtc_season,pfs_season,brand,product_description,style_color_id,dc_flag,excs_flg,shrtfl_flg,stckout_flg,
			oh,it,oo,lw_units,lw_revenue,lw_margin,lw_gm_perc,promo_percentage,wos,size_integrity,week_to_date_sales,
			last_day_sales,oh_dc,sales_1_ago,sales_2_ago,sales_3_ago,sales_4_ago,sales_5_ago,sales_6_ago,sales_7_ago,sales_8_ago,
			aur,excs_is_resolved,shrtfl_is_resolved,stckout_is_resolved
		) 
		SELECT 
			article,l0_name,l1_name,l2_name,l3_name,
			l4_name,dtc_year,pfs_year,dtc_season,pfs_season,brand,product_description,style_color_id,dc_flag,excs_flg,shrtfl_flg,stckout_flg,
			oh,it,oo,lw_units,lw_revenue,lw_margin,lw_gm_perc,promo_percentage,wos,size_integrity,week_to_date_sales,
			last_day_sales,oh_dc,sales_1_ago,sales_2_ago,sales_3_ago,sales_4_ago,sales_5_ago,sales_6_ago,sales_7_ago,sales_8_ago,
			aur,excs_is_resolved,shrtfl_is_resolved,stckout_is_resolved
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
