
--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_cleanup_future_approved_forecast_data_v1 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_cleanup_future_approved_forecast_data_v1

DROP FUNCTION IF EXISTS base_pricing.fn_cleanup_future_approved_forecast_data(int4, timestamp);

CREATE OR REPLACE FUNCTION base_pricing.fn_cleanup_future_approved_forecast_data(p_strategy_id integer, p_max_approval_date timestamp without time zone)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
    -- Clean up week level simulation data
    DELETE FROM base_pricing.bp_last_approved_week_level_simulation
    WHERE strategy_id = p_strategy_id 
    AND week_start_date > (p_max_approval_date::date + interval '6 days')::date;
    
    -- Clean up store split ratio data  
    DELETE FROM base_pricing.bp_last_approved_store_split_ratio
    WHERE strategy_id = p_strategy_id 
    AND week_start_date > (p_max_approval_date::date + interval '6 days')::date;
    
    -- Clean up day split ratio data
    DELETE FROM base_pricing.bp_last_approved_day_split_ratio
    WHERE strategy_id = p_strategy_id 
    AND dates > p_max_approval_date::date;
    
    -- Log cleanup operation
    RAISE NOTICE 'Cleaned up future approved forecast data for strategy_id: %, after date: %', 
        p_strategy_id, p_max_approval_date;
END;
$function$
;
