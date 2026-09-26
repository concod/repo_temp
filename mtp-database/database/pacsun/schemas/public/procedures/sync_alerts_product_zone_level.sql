--liquibase formatted sql
--changeset sreevathsa.sp@impactanalytics.co:sync_alerts_product_zone_level_v3 runOnChange:true stripComments:false splitStatements:false context:ASync_Procedures labels:pacsun_sync_alerts_product_zone_level
--comment: initial changeset for sync_alerts_product_zone_level 

DROP PROCEDURE if exists  public.sync_alerts_product_zone_level();

CREATE OR REPLACE PROCEDURE public.sync_alerts_product_zone_level()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_alerts_product_zone_level';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin
    delete from 
		  inventory_smart.alerts_product_zone_level 
		where 
		  true; 
    INSERT INTO inventory_smart.alerts_product_zone_level (
        article,
        style,
        color_name,
        l0_name,
        l1_name,
        l2_name,
        l3_id_name,
        l4_id,
        brand,
        markdown_ind,
        product_description,
        first_sale_date,
        last_receipt_date,
        s0_name,
        oh,
        it,
        dc_available,
        past_4wks_actual_sales,
        forecast_4_next_wk,
        forecast_deviation_pct,
        past_4wks_store_count,
        next_4wks_store_count,
        store_count_deviation_pct,
        ly_past_4wks_actual_sales,
        ly_next_4wks_actual_sales,
        ly_deviation_pct,
        past_4_weeks_actual_promo,
        next_4_weeks_planned_promo,
        promo_deviation_pct,
        clearance_alert_flag,
        newly_launched_alert_flag,
        "Retirement_alert_flag",
        mfp_forecast_sales_qty,
        mfp_deviation,
        recent_deviation_flag,
        mfp_deviation_flag,
        recent_deviation_is_resolved,
        mfp_deviation_is_resolved,
        ladder
    )
    SELECT distinct
        apzl.article,
        paf.style,
        apzl.color_name,
        paf.l0_name,
        paf.l1_name,
        paf.l2_name,
        apzl.l3_id_name,
        paf.l4_id,
        apzl.brand,
        paf.markdown_ind,
        pd.style_color_description as product_description,
        apzl.first_sale_date,
        apzl.last_receipt_date,
        apzl."zone" as s0_name,
        apzl.store_oh as oh,
        apzl.store_it as it,
        apzl.dc_available,
        apzl.past_4wks_actual_sales,
        apzl.forecast_4_next_wk,
        apzl.forecast_deviation_pct,
        apzl.past_4wks_store_count,
        apzl.next_4wks_store_count,
        apzl.store_count_deviation_pct,
        apzl.ly_past_4wks_actual_sales,
        apzl.ly_next_4wks_actual_sales,
        apzl.ly_deviation_pct,
        apzl.past_4_weeks_actual_promo,
        apzl.next_4_weeks_planned_promo,
        apzl.promo_deviation_pct,
        apzl.clearance_alert_flag,
        apzl.newly_launched_alert_flag,
        apzl."Retirement_alert_flag",
        apzl.mfp_forecast_sales_qty,
        apzl.MFP_deviation,
        apzl.recent_deviation_flag,
        apzl.mfp_deviation_flag,
        apzl.recent_deviation_is_resolved,
        apzl.mfp_deviation_is_resolved,
        paf.ladder
    FROM public.alerts_product_zone_level apzl
    LEFT JOIN global.product_attributes_filter paf
        ON apzl.article = paf.article
    left join (select article,max(style_color_description) style_color_description from global.product_attributes_filter group by 1) pd on paf.article = pd.article;
		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END
$procedure$;
