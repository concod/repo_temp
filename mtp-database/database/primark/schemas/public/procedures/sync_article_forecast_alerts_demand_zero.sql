--liquibase formatted sql
--changeset pradeep.kumar:update_2 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: added deviation added sync_article__forecast_alerts_demand_zero
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
        article_past_4_week_actuals,
        article_next_4_week_forecast,
        zero_fcst_flag,
        store_level_inacc_fcst_flag,
        article_level_inacc_fcst_flag,
        next_4_week_forecast,
        past_4_week_actuals,
        oh,
        oo,
        it,
        oh_oo_it,
        l0_name,
        l1_name,
        l2_name,
        l3_name,
        product_type,
        item_status,
        launch_date,
        store_name,
        channel,
        region,
        state,
        district,
        store_attribute_1
    )
    SELECT 
        a.article,
        store_code,
        article_past_4_week_actuals,
        article_next_4_week_forecast,
        zero_fcst_flag,
        store_level_inacc_fcst_flag,
        article_level_inacc_fcst_flag,
        next_4_week_forecast,
        past_4_week_actuals,
        oh,
        oo,
        it,
        oh_oo_it,
        NULL AS l0_name,
        NULL AS l1_name,
        l2_name,
        l3_name,
        product_type,
        item_status,
        launch_date,
        store_name,
        channel,
        region,
        state,
        district,
        store_attribute_1
    FROM 
        public.article_forecast_alerts_demand_zero a
    LEFT JOIN (select article, product_description from global.product_attributes_filter group by 1,2) paf on a.article = paf.article 
    ;

		call global.data_ingestion_logs(_log_code, _sp_name, 'end', null, (clock_timestamp() - _st)::text, null);
	exception
		when others then
	        -- Log the error if an exception occurs during any part of the procedure
	        call global.data_ingestion_logs(_log_code, _sp_name, _log_step, SQLERRM, (clock_timestamp() - _st)::text, null);
            raise exception 'Error occurred in the procedure: %', SQLERRM;
	end;
END;
$procedure$;