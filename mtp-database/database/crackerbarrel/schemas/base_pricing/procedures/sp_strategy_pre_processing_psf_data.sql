--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_pre_processing_psf_data_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_pre_processing_psf_data_1

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_pre_processing_psf_data;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_pre_processing_psf_data(IN strategy_id integer)
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
-- TABLE creation
DROP TABLE IF EXISTS base_pricing.temp_strategy_pre_processing_psf_data_%s;
CREATE UNLOGGED TABLE base_pricing.temp_strategy_pre_processing_psf_data_%s AS
SELECT
    bsps.product_id,
    bsps.store_id,
    bsps.segment_id,
    bpm.product_name,
    bsm.store_name,
    bcsm.segment_name,
    bsm.s0_name AS channel,
    bsm.s0_cid AS channel_id
FROM (
        SELECT
            bsps.product_id,
            bsps.store_id,
            bsps.segment_id
        FROM base_pricing.bp_strategy_products_stores bsps
        WHERE bsps.strategy_id = %s
    ) AS bsps
    INNER JOIN base_pricing.bp_product_master bpm
        ON bsps.product_id = bpm.product_id
        AND bpm.usable IS TRUE
    INNER JOIN base_pricing.bp_store_master bsm
        ON bsps.store_id = bsm.store_id
        AND bsm.active IS TRUE
    INNER JOIN base_pricing.bp_customer_segment_master bcsm
        ON bsps.segment_id = bcsm.segment_id
        AND bcsm.is_active IS TRUE;
-- INDEX creation
CREATE INDEX idx_temp_strategy_pre_processing_psf_data_%s_id1
    ON base_pricing.temp_strategy_pre_processing_psf_data_%s USING btree (product_id, store_id, segment_id);
$query$,
    -- TABLE
    strategy_id,
    strategy_id,
    strategy_id,
    -- INDEX
    strategy_id,
    strategy_id
);
    RAISE NOTICE 'Creating temp_strategy_pre_processing_psf_data_% - %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_strategy_pre_processing_psf_data_% : %s', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_strategy_pre_processing_psf_data', start_time, end_time, end_time - start_time);
END;
$procedure$
;
