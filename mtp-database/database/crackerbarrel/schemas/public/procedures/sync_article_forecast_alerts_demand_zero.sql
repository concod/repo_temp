--liquibase formatted sql
--changeset himanshu_jangra:updated product_description added sync_article__forecast_alerts_demand_zero runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: updated product_description added sync_article__forecast_alerts_demand_zero
--rollback: SELECT 1

DROP PROCEDURE IF EXISTS public.sync_article_forecast_alerts_demand_zero();
CREATE OR REPLACE PROCEDURE public.sync_article_forecast_alerts_demand_zero()
LANGUAGE plpgsql
SECURITY DEFINER
AS $procedure$
declare
	_log_code varchar := gen_random_uuid();
	_sp_name varchar := 'public.sync_article_forecast_alerts_demand_zero';
	_log_step varchar;
	_st TIMESTAMP := clock_timestamp();
BEGIN
	call global.data_ingestion_logs(_log_code, _sp_name, 'start', null, (clock_timestamp() - _st)::text, null);
	perform set_config('local.log_code', _log_code, true);
	perform set_config('local.sp_name', _sp_name, true);
	begin

    DELETE FROM inventory_smart.article_forecast_alerts_demand_zero;

    INSERT INTO inventory_smart.article_forecast_alerts_demand_zero (
        article,
        store_code,
        product_description,
        past_4_week_actuals,
        next_4_week_forecast,
        oh,
        oo,
        it,
        oh_oo_it,
        launch_date,
        l2_name,
        l3_name,
        l4_name,
        l5_name,
        primary_trait_desc,
        product_type,
        item_status,
        store_name,
        channel,
        region,
        state,
        district,
        store_attribute_1,
        article_next_4_week_forecast,
        article_past_4_week_actuals,
        zero_fcst_flag,
        store_level_inacc_fcst_flag,
        article_level_inacc_fcst_flag,
        zerodemand_is_resolved,
        store_level_inacc_fcst_is_resolved,
        article_level_inacc_fcst_is_resolved,
		uda_value_desc
    ) 
    SELECT 
        a.article,
        store_code,
        paf.product_description,
        past_4_week_actuals,
        next_4_week_forecast,
        oh,
        oo,
        it,
        oh_oo_it,
        launch_date,
        l2_name,
        l3_name,
        l4_name,
        l5_name,
        primary_trait_desc,
        product_type,
        item_status,
        store_name,
        channel,
        region,
        state,
        district,
        store_attribute_1,
        article_next_4_week_forecast,
        article_past_4_week_actuals,
        zero_fcst_flag,
        store_level_inacc_fcst_flag,
        article_level_inacc_fcst_flag,
        0 AS zerodemand_is_resolved,
        0 AS store_level_inacc_fcst_is_resolved,
        0 AS article_level_inacc_fcst_is_resolved,
		paf.uda_value_desc
    FROM public.forecast_alerts_demand_zero a
	LEFT JOIN (select article, uda_value_desc, product_description from global.product_attributes_filter where ia_sku_type in ('master','eaches')) paf using(article);


		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$
;