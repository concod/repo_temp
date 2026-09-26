--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_monthly_metrics_store_split stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_monthly_metrics_store_split

DROP PROCEDURE IF EXISTS base_pricing.sp_monthly_metrics_store_split;

CREATE OR REPLACE PROCEDURE base_pricing.sp_monthly_metrics_store_split(IN strategy_id integer, IN kvi_status text, IN product_hierarchy_string text, IN table_type text, IN min_date date, IN max_date date)
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
DROP TABLE IF EXISTS temp_monthly_metrics_store_split_%s_%s;
CREATE TEMP TABLE temp_monthly_metrics_store_split_%s_%s AS
SELECT
    product_id,
    channel_id,
    segment_id,
    week_start_date,
    store_id,
    store_split_ratio
FROM
    base_pricing.bp_simulation_store_split_ratio%s bsssr
    -- -- NON KVI
    INNER JOIN base_pricing.bp_product_master bpm
        USING (%s)
    INNER JOIN (SELECT DISTINCT product_id FROM base_pricing.bp_unlogged_combinations_%s_%s) AS pf
        USING (product_id)
    INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing.bp_unlogged_combinations_%s_%s) AS sf
        USING (segment_id)
WHERE
    week_start_date between '%s' and '%s';
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_store_split_%s_%s_id1
    ON temp_monthly_metrics_store_split_%s_%s USING btree (product_id, channel_id, segment_id, week_start_date);
$query$,
    strategy_id,
    kvi_status,
    strategy_id,
    kvi_status,
    table_type,
    product_hierarchy_string,
    strategy_id,
    kvi_status,
    strategy_id,
    kvi_status,
    (min_date - INTERVAL '6 days')::date,
    max_date,
    strategy_id,
    kvi_status,
    strategy_id,
    kvi_status
);
    RAISE NOTICE 'Creating temp_monthly_metrics_store_split table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_store_split table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_monthly_metrics_store_split', start_time, end_time, end_time - start_time);
END;
$procedure$
;
