--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_monthly_metrics_reco_union stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_monthly_metrics_reco_union

DROP PROCEDURE IF EXISTS base_pricing.sp_monthly_metrics_reco_union;

CREATE OR REPLACE PROCEDURE base_pricing.sp_monthly_metrics_reco_union(IN strategy_id integer)
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
DROP TABLE IF EXISTS temp_monthly_metrics_reco_union_%s;
CREATE TEMP TABLE temp_monthly_metrics_reco_union_%s AS
WITH
    reco_union AS (
        SELECT
            strategy_id,
            product_id,
            store_id,
            segment_id,
            channel_id,
            base_price,
            cost,
            baseline_sales,
            sales_units,
            'finalized' AS source
        FROM base_pricing.bp_price_reco_finalized_v2_%s
        UNION ALL
        SELECT
            strategy_id,
            product_id,
            store_id,
            segment_id,
            channel_id,
            base_price,
            cost,
            baseline_sales,
            sales_units,
            'ia_recommended' AS source
        FROM base_pricing.bp_price_reco_ia_v2_%s
        UNION ALL
        SELECT
            strategy_id,
            product_id,
            store_id,
            segment_id,
            channel_id,
            base_price,
            cost,
            baseline_sales,
            sales_units,
            'current' AS source
        FROM base_pricing.bp_price_reco_current_v2_%s
    )
SELECT *
FROM reco_union;
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_reco_union_%s_id1
    ON temp_monthly_metrics_reco_union_%s USING btree (product_id);
CREATE INDEX idx_temp_monthly_metrics_reco_union_%s_id2
    ON temp_monthly_metrics_reco_union_%s USING btree (store_id);
CREATE INDEX idx_temp_monthly_metrics_reco_union_%s_id3
    ON temp_monthly_metrics_reco_union_%s USING btree (segment_id);
$query$,
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
    RAISE NOTICE 'Creating temp_monthly_metrics_reco_union table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_reco_union table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_monthly_metrics_reco_union', start_time, end_time, end_time - start_time);
END;
$procedure$
;