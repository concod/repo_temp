--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_pre_processing_cleanup_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_pre_processing_cleanup_1

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_pre_processing_cleanup;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_pre_processing_cleanup(IN strategy_id integer)
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
-- FILTER TABLES
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_product_data_%s;
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_psf_data_%s;
-- GRANULAR DATA
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_granular_data_raw_%s;
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_granular_data_%s;
-- BUCKET DATA
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_bucket_data_primary_%s;
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_bucket_data_secondary_%s;
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_bucket_data_tertiary_%s;
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_bucket_data_quaternary_%s;
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_bucket_combine_%s;
-- FIN DATA
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_fin_data_%s;
-- AGG DATA
--DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_agg_data_raw_%s;
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_agg_data_%s;
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
    strategy_id,
    strategy_id,
    strategy_id
);
    -- Execute the table creation
    RAISE NOTICE 'Cleaning up strategy_pre_processing tables for % : %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for cleaning up strategy_pre_processing tables for % : %', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_cleanup', start_time, end_time, end_time - start_time);
END;
$procedure$
;
