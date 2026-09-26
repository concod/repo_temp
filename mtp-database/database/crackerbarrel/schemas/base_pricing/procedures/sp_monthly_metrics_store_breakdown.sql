--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_monthly_metrics_store_breakdown stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_monthly_metrics_store_breakdown

DROP PROCEDURE IF EXISTS base_pricing.sp_monthly_metrics_store_breakdown;


CREATE OR REPLACE PROCEDURE base_pricing.sp_monthly_metrics_store_breakdown(IN strategy_id integer, IN kvi_status text)
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
-- Table creation
DROP TABLE IF EXISTS temp_monthly_metrics_store_breakdown_%s_%s;
CREATE TEMP TABLE temp_monthly_metrics_store_breakdown_%s_%s AS
WITH
    zone_data AS (
        SELECT
            product_id,
            store_unnest AS store_id,
            segment_id,
            store_id AS effective_price_zone
        FROM base_pricing.bp_price_reco_current_v2_%s,
        LATERAL UNNEST(store_ids) AS store_unnest
    )
SELECT
    product_id,
    store_id,
    segment_id,
    effective_price_zone
FROM
    zone_data zd
    INNER JOIN base_pricing.bp_unlogged_combinations_%s_%s
        USING (product_id, store_id, segment_id);
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_store_breakdown_%s_%s_id1
    ON temp_monthly_metrics_store_breakdown_%s_%s USING btree (product_id, store_id, segment_id);
$query$,
    strategy_id,
    kvi_status,
    strategy_id,
    kvi_status,
    strategy_id,
    strategy_id,
    kvi_status,
    strategy_id,
    kvi_status,
    strategy_id,
    kvi_status
);
    RAISE NOTICE 'Creating temp_monthly_metrics_store_breakdown table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_store_breakdown table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_monthly_metrics_store_breakdown', start_time, end_time, end_time - start_time);
END;
$procedure$
;