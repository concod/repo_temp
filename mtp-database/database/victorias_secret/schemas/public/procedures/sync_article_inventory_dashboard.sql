--liquibase formatted sql
--changeset shinde.samarth@impactanalytics.co:sync_article_inventory_dashboard_v7 runOnChange:true stripComments:false splitStatements:false context:VS_inv_smart labels:VS-835
--comment: Updated SP for new Schema for the DD enhancement
--rollback: SELECT 1
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard();
DROP PROCEDURE IF EXISTS public.sync_article_inventory_dashboard(bool);
CREATE OR REPLACE PROCEDURE public.sync_article_inventory_dashboard()
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_inventory_dashboard';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
begin
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
        delete from 
          inventory_smart.article_inventory_dashboard
        where 
          true;
        insert into inventory_smart.article_inventory_dashboard (
            article,
            l6_name,
            color,            
            store_code,
            store_name,
            store_tier,
            location_hierarchy_region_code,
            s1_name,
            s3_name,
            s4_name,
            l0_name,
            l2_name,
            l3_name,
            l4_name,
            l5_name,
            flex_style,
            generic,
            sizes_mat,
            form,
            user_defined_1,
            user_defined_2,
            user_defined_3,
            user_defined_4,
            user_defined_5,
            user_defined_6,
            choice_status,
            oh,
            it,
            oo,
            wip,
            rfid_delta,
            epc_units,
            store_reserve,
            initial_oh,
            tot_inv,
            last_week_sales,
            last_4_week_sales,
            last_8_week_sales,
            week_to_date_sales ,
            last_week_revenue ,
            last_week_margin ,
            last_week_margin_percentage,
            promo_percentage ,
            forward_wos,
            size_integrity_oh, 
            size_integrity_oh_oo_it, 
            excess,
            normal,
            shortfall,
            stockout, 
            oh_dc,
            oo_dc ,
            it_dc,
            total_store_dc_inv,
            aur,
            forecast_over_target_wos,
            l4w_avg_sales,
            l8w_avg_sales,
            week_count_l4w,
            week_count_l8w,
            channel,
            collection,		
			      masterstyle_descr,			
			      subbrand_code_desc,			
			      product_lifecycle,
            current_assortment_group,
			      current_floorset,
			      current_week_forecast,
			      next_4_week_forecast,
			      next_8_week_forecast,
            twos,
            l1w_sales,
            l2w_sales,
            l3w_sales,
            l4w_sales,
            l5w_sales,
            l6w_sales,
            l7w_sales,
            l8w_sales
        ) 
        SELECT 
            choice,
            l6_name,
            color,
            store_code,
            x.store_name,
            x.store_tier,
            x.location_hierarchy_region_code,
            x.s1_name,
            x.s3_name,
            x.s4_name,
            l0_name,
            l2_name,
            l3_name,
            l4_name,
            l5_name,
            flex_style,
            generic,
            sizes_mat,
            form,
            user_defined_1,
            user_defined_2,
            user_defined_3,
            user_defined_4,
            user_defined_5,
            user_defined_6,
            choice_status,
            oh,
            it,
            oo,
            wip,
            rfid_delta,
            epc_units,
            store_reserve,
            initial_oh,
            total_inv,
            lw_sales,
            last_4_week_sales,
            last_8_week_sales,
            week_to_day_sales ,
            lw_revenue ,
            lw_margin ,
            lw_gm_perc,
            promo_percentage ,
            forward_wos,
            size_integrity_oh, 
            size_integrity_oh_oo_it, 
            excess,
            normal,
            shortfall,
            stockout, 
            oh_dc,
            oo_dc ,
            it_dc,
            total_store_dc_inv,
            aur,
            forecast_over_target_wos,
            l4w_avg_sales,
            l8w_avg_sales,
            week_count_l4w,
            week_count_l8w,
            x.channel,
            collection,		
			      masterstyle_descr,			
			      subbrand_code_desc,			
			      product_lifecycle,
            current_assortment_group,
			      current_floorset,
			      current_week_forecast,
			      next_4_week_forecast,
			      next_8_week_forecast,
            twos,
            l1w_sales,
            l2w_sales,
            l3w_sales,
            l4w_sales,
            l5w_sales,
            l6w_sales,
            l7w_sales,
            l8w_sales
        FROM 
          public.article_inventory_dashboard x
          join global.store_master sm using(store_code);
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
