--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_strategy_forecast_cleanup stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_strategy_forecast_cleanup

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_strategy_forecast_cleanup;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_strategy_forecast_cleanup(IN strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
BEGIN
    start_time := clock_timestamp();
    sql_query := format(
$query$
-- DROP UNLOGGED TABLES
-- PCS FILTER
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_pcs_filter_%s_false;
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_pcs_filter_%s_true;
-- BINS DATA
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_bins_data_%s_false;
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_bins_data_%s_true;
-- SIMULATION DATA
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_simulation_data_%s_false;
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_simulation_data_%s_true;
-- DAY SPLIT
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_day_split_%s_false;
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_day_split_%s_true;
-- STORE SPLIT
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_store_split_%s_false;
DROP TABLE IF EXISTS base_pricing_restaurant.unlogged_strategy_forecast_store_split_%s_true;
$query$,
    -- DROP TABLES
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id
);
    -- Execute the table creation
    RAISE NOTICE 'Cleaning up unlogged_strategy_forecast tables for % : %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for cleaning up unlogged_strategy_forecast tables for % : %', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_strategy_forecast_cleanup',
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;