--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_alerts_product_store_level_change_v7 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_alerts_product_store_level
--comment: initial changeset for sync_alerts_product_store_level 

DROP PROCEDURE if exists  public.sync_alerts_product_store_level();

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
            l3_id_name,
            style,
            l4_id,
            l5_name,
            country,
            s1_id_name,
            s2_id_name,
            s3_id_name,
            s4_name,
            channel,
            channel_name,
            product_description,
            dc_flag,
            excs_flg,
            shrtfl_flg,
            stckout_flg,
            overstock,
            shortfall,
            stockout,
            normal,
            oh,
            it,
            oo,
            lw_units,
            lw_revenue,
            lw_margin,
            promo_percentage,
            wos_oh,
            size_integrity,
            week_to_date_sales,
            last_day_sales,
            oh_dc,
            sales_1_ago,
            sales_2_ago,
            sales_3_ago,
            sales_4_ago,
            sales_5_ago,
            sales_6_ago,
            sales_7_ago,
            sales_8_ago,
            L4W_sales,
            L8W_sales,
            lw_aur,
            clearance_alert_flag,
            newly_launched_alert_flag,
            "Retirement_alert_flag",
            color_name,
            brand,
            in_stock_percentage,
            markdown_ind,
            first_sale_date,
            last_receipt_date,
            lw_price,
            lw_aps,
            sell_through_rate,
            wos_oh_it,
            forecast_this_wk,
            forecast_next_week,
            forecast_4_next_week,
            forecast_8_next_week,
            no_of_stores_oh,
            store_name,
            store_tier,
            excs_is_resolved,
            shrtfl_is_resolved,
            stckout_is_resolved,
            oo_dc,
            lw_discount,
            ladder,
			s0_name,
			state_name,
			country_name,
			store_code_name,
      dc_available
        ) 
        SELECT distinct
            apsl.article,
            apsl.store_code,
            paf.l0_name,
            paf.l1_name,
            paf.l2_name,
            apsl.l3_id_name,
            paf.style,
            paf.l4_id,
            paf.l5_name,
            apsl.country,
            apsl.s1_id_name,
            apsl.s2_id_name,
            apsl.s3_id_name,
            apsl.s4_name,
            apsl.channel,
            apsl.channel_name,
            pd.style_color_description as product_description,
            apsl.dc_flag,
            apsl.excs_flg,
            apsl.shrtfl_flg,
            apsl.stckout_flg,
            apsl.overstock,
            apsl.shortfall,
            apsl.stockout,
            apsl.normal,
            apsl.oh,
            apsl.it,
            apsl.oo,
            apsl.lw_units,
            apsl.lw_revenue,
            apsl.lw_margin,
            apsl.promo_percentage,
            apsl.wos_oh,
            apsl.size_integrity,
            apsl.week_to_date_sales,
            apsl.last_day_sales,
            apsl.oh_dc,
            apsl.sales_1_ago,
            apsl.sales_2_ago,
            apsl.sales_3_ago,
            apsl.sales_4_ago,
            apsl.sales_5_ago,
            apsl.sales_6_ago,
            apsl.sales_7_ago,
            apsl.sales_8_ago,
            (coalesce(apsl.sales_1_ago,0)+coalesce(apsl.sales_2_ago,0)+coalesce(apsl.sales_3_ago,0)+coalesce(apsl.sales_4_ago,0)) as L4W_sales,
            (coalesce(apsl.sales_1_ago,0)+coalesce(apsl.sales_2_ago,0)+coalesce(apsl.sales_3_ago,0)+coalesce(apsl.sales_4_ago,0)+coalesce(apsl.sales_5_ago,0)+coalesce(apsl.sales_6_ago,0)+coalesce(apsl.sales_7_ago,0)+coalesce(apsl.sales_8_ago,0)) as L8W_sales,
            apsl.lw_aur,
            apsl.clearance_alert_flag,
            apsl.newly_launched_alert_flag,
            apsl."Retirement_alert_flag",
            paf.color_name,
            paf.brand,
            apsl.in_stock_percentage,
            case when paf.markdown_ind = 'Y' then true else false end as markdown_ind,
            apsl.first_sale_date,
            apsl.last_receipt_date,
            apsl.lw_price,
            apsl.lw_aps,
            apsl.sell_through_rate,
            apsl.wos_oh_it,
            apsl.forecast_this_wk,
            apsl.forecast_next_wk,
            apsl.forecast_4_next_wk,
            apsl.forecast_8_next_wk,
            apsl.no_of_stores_oh,
            apsl.store_name,
            apsl.store_tier,
            apsl.excs_is_resolved,
            apsl.shrtfl_is_resolved,
            apsl.stckout_is_resolved,
            apsl.dc_oo as oo_dc,
            apsl.lw_discount_amount as lw_discount,
            paf.ladder,
			saf.s0_name,
			saf.state_name,
			saf.country_name,
			saf.store_code_name,
      apsl.dc_available
        FROM 
		  public.alerts_product_store_level apsl
          LEFT JOIN global.product_attributes_filter paf ON apsl.article = paf.article
          LEFT JOIN global.store_attributes_filter saf using(store_code)
          left join (select article,max(style_color_description) style_color_description from global.product_attributes_filter group by 1) pd on paf.article = pd.article
		;
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