--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_monthly_metrics_monthly_forecast stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_monthly_metrics_monthly_forecast

DROP PROCEDURE IF EXISTS base_pricing.sp_monthly_metrics_monthly_forecast;

CREATE OR REPLACE PROCEDURE base_pricing.sp_monthly_metrics_monthly_forecast(IN strategy_id integer, IN product_hierarchy_string text, IN min_date date, IN max_date date)
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
-- Temp table for non-KVI products
DROP TABLE IF EXISTS temp_monthly_metrics_products_%s;
CREATE TEMP TABLE temp_monthly_metrics_products_%s AS
SELECT DISTINCT 
    product_id
FROM base_pricing.bp_unlogged_combinations_%s_false;
CREATE INDEX idx_temp_monthly_metrics_products_%s_id1
    ON temp_monthly_metrics_products_%s (product_id);
-- Temp table for KVI products  
DROP TABLE IF EXISTS temp_monthly_metrics_products_kvi_%s;
CREATE TEMP TABLE temp_monthly_metrics_products_kvi_%s AS
SELECT DISTINCT 
    product_id
FROM base_pricing.bp_unlogged_combinations_%s_true;
CREATE INDEX idx_temp_monthly_metrics_products_kvi_%s_id1
    ON temp_monthly_metrics_products_kvi_%s (product_id);
-- Temp table for non-KVI segments
DROP TABLE IF EXISTS temp_monthly_metrics_segments_%s;
CREATE TEMP TABLE temp_monthly_metrics_segments_%s AS
SELECT DISTINCT 
    segment_id
FROM base_pricing.bp_unlogged_combinations_%s_false;
CREATE INDEX idx_temp_monthly_metrics_segments_%s_id1
    ON temp_monthly_metrics_segments_%s (segment_id);
-- Temp table for KVI segments  
DROP TABLE IF EXISTS temp_monthly_metrics_segments_kvi_%s;
CREATE TEMP TABLE temp_monthly_metrics_segments_kvi_%s AS
SELECT DISTINCT
    segment_id
FROM base_pricing.bp_unlogged_combinations_%s_true;
CREATE INDEX idx_temp_monthly_metrics_segments_kvi_%s_id1
    ON temp_monthly_metrics_segments_kvi_%s (segment_id);
-- Non-KVI week split ratios
DROP TABLE IF EXISTS temp_monthly_metrics_week_split_ratios_%s;
CREATE TEMP TABLE temp_monthly_metrics_week_split_ratios_%s AS
SELECT
    product_id,
    bsdsr.channel_id,
    bsdsr.segment_id,
    bsdsr.week_start_date,
    SUM(day_split_ratio) AS week_split_ratio
FROM
    base_pricing.bp_simulation_day_split_ratio bsdsr
    INNER JOIN base_pricing.bp_product_master bpm
        USING (l0_cid, l1_cid, l2_cid, l3_cid)
    INNER JOIN temp_monthly_metrics_products_%s pf
        USING (product_id)
    INNER JOIN temp_monthly_metrics_segments_%s sf
        USING (segment_id)
WHERE
    date BETWEEN '%s' AND '%s'
GROUP BY
    product_id,
    bsdsr.channel_id,
    bsdsr.segment_id,
    bsdsr.week_start_date;
CREATE INDEX idx_temp_monthly_metrics_week_split_ratios_%s_id1
    ON temp_monthly_metrics_week_split_ratios_%s (product_id, channel_id, segment_id, week_start_date);
-- KVI week split ratios
DROP TABLE IF EXISTS temp_monthly_metrics_week_split_ratios_kvi_%s;
CREATE TEMP TABLE temp_monthly_metrics_week_split_ratios_kvi_%s AS
SELECT
    product_id,
    bsdsr.channel_id,
    bsdsr.segment_id,
    bsdsr.week_start_date,
    SUM(day_split_ratio) AS week_split_ratio
FROM
    base_pricing.bp_simulation_day_split_ratio_kvi bsdsr
    INNER JOIN temp_monthly_metrics_products_kvi_%s pf
        USING (product_id)
    INNER JOIN temp_monthly_metrics_segments_kvi_%s sf
        USING (segment_id)
WHERE
    date BETWEEN '%s' AND '%s'
GROUP BY
    product_id,
    bsdsr.channel_id,
    bsdsr.segment_id,
    bsdsr.week_start_date;
CREATE INDEX idx_temp_monthly_metrics_week_split_ratios_kvi_%s_id1
    ON temp_monthly_metrics_week_split_ratios_kvi_%s (product_id, channel_id, segment_id, week_start_date);
-- Non-KVI week data
DROP TABLE IF EXISTS temp_monthly_metrics_week_data_%s;
CREATE TEMP TABLE temp_monthly_metrics_week_data_%s AS
SELECT
    bsw.product_id,
    bsw.channel_id,
    bsw.segment_id,
    bsw.week_start_date,
    bsw.sales_units as predicted_at_current_price,
    (wsr.week_split_ratio * bsw.sales_units) AS week_level_predicted
FROM
    base_pricing.bp_simulation_week bsw
    INNER JOIN temp_monthly_metrics_products_%s pf
        USING (product_id)
    INNER JOIN temp_monthly_metrics_segments_%s sf
        USING (segment_id)
    INNER JOIN temp_monthly_metrics_week_split_ratios_%s wsr
        USING (product_id, channel_id, segment_id, week_start_date)
WHERE
    bsw.week_start_date BETWEEN '%s' AND '%s';
CREATE INDEX idx_temp_monthly_metrics_week_data_%s_id1
    ON temp_monthly_metrics_week_data_%s (product_id, channel_id, segment_id, week_start_date);
-- KVI week data
DROP TABLE IF EXISTS temp_monthly_metrics_week_data_kvi_%s;
CREATE TEMP TABLE temp_monthly_metrics_week_data_kvi_%s AS
SELECT
    bsw.product_id,
    bsw.channel_id,
    bsw.segment_id,
    bsw.week_start_date,
    bsw.sales_units as predicted_at_current_price,
    (wsr.week_split_ratio * bsw.sales_units) AS week_level_predicted
FROM
    base_pricing.bp_simulation_week bsw
    INNER JOIN temp_monthly_metrics_products_kvi_%s pf
        USING (product_id)
    INNER JOIN temp_monthly_metrics_segments_kvi_%s sf
        USING (segment_id)
    INNER JOIN temp_monthly_metrics_week_split_ratios_kvi_%s wsr
        USING (product_id, channel_id, segment_id, week_start_date)
WHERE
    bsw.week_start_date BETWEEN '%s' AND '%s';
CREATE INDEX idx_temp_monthly_metrics_week_data_kvi_%s_id1
    ON temp_monthly_metrics_week_data_kvi_%s (product_id, channel_id, segment_id, week_start_date);
-- Non-KVI store data
DROP TABLE IF EXISTS temp_monthly_metrics_store_data_%s;
CREATE TEMP TABLE temp_monthly_metrics_store_data_%s AS
SELECT
    wd.product_id,
    tsb.effective_price_zone AS store_id,
    wd.segment_id,
    DATE_TRUNC('month', wd.week_start_date)::date AS filter_month,
    SUM(wd.week_level_predicted * bsssr.store_split_ratio)::numeric AS predicted
FROM
    temp_monthly_metrics_week_data_%s wd
    INNER JOIN temp_monthly_metrics_store_split_%s_false bsssr
        USING (product_id, channel_id, segment_id, week_start_date)
    INNER JOIN temp_monthly_metrics_store_breakdown_%s_false tsb
        USING (product_id, store_id, segment_id)
GROUP BY
    wd.product_id,
    tsb.effective_price_zone,
    wd.segment_id,
    DATE_TRUNC('month', wd.week_start_date);
-- KVI store data
DROP TABLE IF EXISTS temp_monthly_metrics_store_data_kvi_%s;
CREATE TEMP TABLE temp_monthly_metrics_store_data_kvi_%s AS
SELECT
    wd.product_id,
    tsb.effective_price_zone AS store_id,
    wd.segment_id,
    DATE_TRUNC('month', wd.week_start_date)::date AS filter_month,
    SUM(wd.week_level_predicted * bsssr.store_split_ratio)::numeric AS predicted
FROM
    temp_monthly_metrics_week_data_kvi_%s wd
    INNER JOIN temp_monthly_metrics_store_split_%s_true bsssr
        USING (product_id, channel_id, segment_id, week_start_date)
    INNER JOIN temp_monthly_metrics_store_breakdown_%s_true tsb
        USING (product_id, store_id, segment_id)
GROUP BY
    wd.product_id,
    tsb.effective_price_zone,
    wd.segment_id,
    DATE_TRUNC('month', wd.week_start_date);
-- FULL Table creation
DROP TABLE IF EXISTS temp_monthly_metrics_monthly_forecast_%s;
CREATE TEMP TABLE temp_monthly_metrics_monthly_forecast_%s AS
SELECT
    td.product_id,
    td.store_id,
    td.segment_id,
    td.filter_month,
    SUM(td.predicted) AS predicted
FROM (
    SELECT * FROM temp_monthly_metrics_store_data_%s
    UNION ALL
    SELECT * FROM temp_monthly_metrics_store_data_kvi_%s
    ) as td
GROUP BY
    td.product_id,
    td.store_id,
    td.segment_id,
    td.filter_month;
-- FULL INDEX creation
CREATE INDEX idx_temp_monthly_metrics_monthly_forecast_%s_id1
    ON temp_monthly_metrics_monthly_forecast_%s USING btree (product_id, store_id, segment_id, filter_month);
$query$,
    -- FILTER_TABLES
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
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    -- WEEK_SPLIT_RATIO
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    min_date,
    max_date,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    min_date,
    max_date,
    strategy_id,
    strategy_id,
    -- WEEK_DATA
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    (min_date - INTERVAL '6 days')::date,
    max_date,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    (min_date - INTERVAL '6 days')::date,
    max_date,
    strategy_id,
    strategy_id,
    -- STORE_DATA
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
    -- FINAL DATA
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id
);
    RAISE NOTICE 'Creating temp_monthly_metrics_monthly_forecast table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken fortemp_monthly_metrics_monthly_forecast table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_monthly_metrics_monthly_forecast', start_time, end_time, end_time - start_time);
END;
$procedure$
;