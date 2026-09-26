--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_monthly_metrics_main stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_main

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_main;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_main(IN strategy_id integer, IN product_hierarchy_string text, IN start_date date, IN end_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
BEGIN
    start_time := clock_timestamp();
    RAISE NOTICE 'STARTING Monthly Metrics Calculation for Strategy - : %', strategy_id;
    -- PROCEDURE CALLS
    -- STEP 1: Extract & Combine Price Reco Data
    CALL base_pricing_restaurant.sp_monthly_metrics_reco_union(strategy_id);
    -- STEP 2.1: Store Breakdown (KVI)
    CALL base_pricing_restaurant.sp_monthly_metrics_store_breakdown(strategy_id, 'true');
    -- STEP 2.2: Store Breakdown (NON-KVI)
    CALL base_pricing_restaurant.sp_monthly_metrics_store_breakdown(strategy_id, 'false');
    -- STEP 3.1: Store Split (KVI)
    CALL base_pricing_restaurant.sp_monthly_metrics_store_split(strategy_id, 'true', 'product_id', '_kvi', start_date, end_date);
    -- STEP 3.2: Store Split (Non-KVI)
    CALL base_pricing_restaurant.sp_monthly_metrics_store_split(strategy_id, 'false', product_hierarchy_string, '', start_date, end_date);
    -- STEP 4: Monthly Forecast
    CALL base_pricing_restaurant.sp_monthly_metrics_monthly_forecast(strategy_id, product_hierarchy_string, start_date, end_date);
    -- STEP 5: Combination Weights
    CALL base_pricing_restaurant.sp_monthly_metrics_combination_weights(strategy_id);
    -- STEP 6: Monthly Sales
    CALL base_pricing_restaurant.sp_monthly_metrics_monthly_sales(strategy_id);
    -- STEP 7: Update Metrics
    CALL base_pricing_restaurant.sp_monthly_metrics_update_metrics(strategy_id);
    --
    RAISE NOTICE 'FINISHED Monthly Metrics Calculation for Strategy - : %', strategy_id;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_monthly_metrics_main', start_time, end_time, end_time - start_time);
END;
$procedure$
;