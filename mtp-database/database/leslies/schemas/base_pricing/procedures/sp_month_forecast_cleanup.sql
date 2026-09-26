--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:sp_month_forecast_cleanup_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_month_forecast_cleanup_1

DROP PROCEDURE IF EXISTS base_pricing.sp_month_forecast_cleanup;

CREATE OR REPLACE PROCEDURE base_pricing.sp_month_forecast_cleanup(IN strategy_id integer)
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
-- MONTHLY SIMULATION DATA
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_simulation_data_%s_false;
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_simulation_data_%s_true;
-- MONTHLY STORE SPLIT
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_month_store_split_intermediate_%s_false;
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_month_store_split_%s_false;
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_month_store_split_intermediate_%s_true;
DROP TABLE IF EXISTS base_pricing.unlogged_month_forecast_month_store_split_%s_true;
-- PCS FILTER (reused from weekly SPs)
DROP TABLE IF EXISTS base_pricing.unlogged_strategy_forecast_pcs_filter_%s_false;
DROP TABLE IF EXISTS base_pricing.unlogged_strategy_forecast_pcs_filter_%s_true;
-- BINS DATA (reused from weekly SPs)
DROP TABLE IF EXISTS base_pricing.unlogged_strategy_forecast_bins_data_%s_false;
DROP TABLE IF EXISTS base_pricing.unlogged_strategy_forecast_bins_data_%s_true;
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
    RAISE NOTICE 'Cleaning up unlogged_month_forecast tables for % : %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for cleaning up unlogged_month_forecast tables for % : %', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_month_forecast_cleanup',
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
