--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_cleanup_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_ps_breakdown_cleanup_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_ps_breakdown_cleanup;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_ps_breakdown_cleanup(IN strategy_id integer, IN comparison_column_1 text, IN comparison_value_1 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
BEGIN
    start_time := clock_timestamp();

    -- Clean the comparison value (replace special characters with underscore)

    -- Build a single DROP statement for all temporary tables except wss
    sql_query := format(
$query$
-- FILTER TABLE
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_ps_breakdown_filter_%s_%s_%s_%s;

-- FILTER SPLIT TABLES (both false and true)
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_ps_breakdown_filter_split_%s_false_%s_%s_%s;
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_ps_breakdown_filter_split_%s_true_%s_%s_%s;

-- STORE SPLIT DATA
DROP TABLE IF EXISTS base_pricing_restaurant.strategy_ps_breakdown_store_split_data_%s_%s_%s_%s;

-- AGGREGATED SALES DATA
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_ps_breakdown_agg_sales_data_%s_%s_%s_%s;

-- WSS TABLE
DROP TABLE IF EXISTS base_pricing_restaurant.temp_strategy_ps_breakdown_wss_%s_%s_%s_%s;

$query$,
        -- filter table
        strategy_id, comparison_column_1, comparison_value_1, user_id,
        -- split false
        strategy_id, comparison_column_1, comparison_value_1, user_id,
        -- split true
        strategy_id, comparison_column_1, comparison_value_1, user_id,
        -- store split data
        strategy_id, comparison_column_1, comparison_value_1, user_id,
        -- aggregated sales data
        strategy_id, comparison_column_1, comparison_value_1, user_id,
		-- WSS table ✅ (new)
		strategy_id, comparison_column_1, comparison_value_1, user_id
    );

    RAISE NOTICE 'Cleaning PS breakdown tables for strategy % : %', strategy_id, sql_query;

    EXECUTE sql_query;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken for PS breakdown cleanup : %', end_time - start_time;

    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_ps_breakdown_cleanup', start_time, end_time, end_time - start_time);
END;
$procedure$
;