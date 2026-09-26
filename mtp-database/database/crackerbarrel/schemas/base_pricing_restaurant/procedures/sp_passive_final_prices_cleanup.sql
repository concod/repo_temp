--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_passive_final_prices_cleanup stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: changeset for base_pricing_restaurant.sp_passive_final_prices_cleanup

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_passive_final_prices_cleanup;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_passive_final_prices_cleanup()
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
-- Filter tables
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_filter_active;
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_filter_inactive;
-- Raw tables
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_data_raw_active;
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_data_raw_inactive;
-- Product data tables
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_data_active;
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_product_data_inactive;
-- LG data tables
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_lg_data_active;
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_lg_data_inactive;
-- Final table
DROP TABLE IF EXISTS base_pricing_restaurant.temp_passive_final_prices_final_data;
$query$
);
    -- Execute the table creation
    RAISE NOTICE 'Cleaning up passive_final_prices tables : %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for cleaning up passive_final_prices tables : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (0, 'sp_passive_final_prices_cleanup', start_time, end_time, end_time - start_time);
END;
$procedure$
;