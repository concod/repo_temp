--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_monthly_metrics_combination_weights stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_monthly_metrics_combination_weights

DROP PROCEDURE IF EXISTS base_pricing.sp_monthly_metrics_combination_weights;

CREATE OR REPLACE PROCEDURE base_pricing.sp_monthly_metrics_combination_weights(IN strategy_id integer)
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
DROP TABLE IF EXISTS temp_monthly_metrics_combination_weights_%s;
CREATE TEMP TABLE temp_monthly_metrics_combination_weights_%s AS
WITH
    total_weights AS (
        SELECT
            tfs.product_id,
            tfs.store_id,
            tfs.segment_id,
            SUM(tfs.predicted) AS total_weight
        FROM
            temp_monthly_metrics_monthly_forecast_%s tfs
        GROUP BY
            product_id,
            store_id,
            segment_id
    )
SELECT
    tfs.product_id,
    tfs.store_id,
    tfs.segment_id,
    tfs.filter_month,
    tfs.predicted AS monthly_weight,
    tw.total_weight
FROM
    temp_monthly_metrics_monthly_forecast_%s tfs
    INNER JOIN total_weights tw
        USING (product_id, store_id, segment_id);
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_combination_weights_%s_id1
    ON temp_monthly_metrics_combination_weights_%s USING btree (product_id, store_id, segment_id, filter_month);
$query$,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id
);
    RAISE NOTICE 'Creating temp_monthly_metrics_combination_weights table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken fortemp_monthly_metrics_combination_weights table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_monthly_metrics_combination_weights', start_time, end_time, end_time - start_time);
END;
$procedure$
;