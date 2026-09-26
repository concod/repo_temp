--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_monthly_metrics_monthly_sales stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_monthly_sales

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_monthly_sales;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_monthly_sales(IN strategy_id integer)
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
DROP TABLE IF EXISTS temp_monthly_metrics_monthly_sales_%s;
CREATE TEMP TABLE temp_monthly_metrics_monthly_sales_%s AS
WITH
    raw_alloc AS (
        SELECT
            tpr.strategy_id,
            tpr.source,
            tpr.product_id,
            tpr.store_id,
            tpr.segment_id,
            tpr.base_price,
            tpr.cost,
            tpr.baseline_sales AS total_baseline_sales_units,
            tpr.sales_units AS total_sales_units,
            tfw.filter_month,
            tfw.monthly_weight,
            tfw.total_weight,
            -- BASELINE SALES UNITS split with Fractional part for tie-breaking
            (tpr.baseline_sales * tfw.monthly_weight / NULLIF(tfw.total_weight, 0)) AS raw_month_baseline_sales,
            FLOOR(tpr.baseline_sales * tfw.monthly_weight / NULLIF(tfw.total_weight, 0)) AS floor_month_baseline_sales,
            (tpr.baseline_sales * tfw.monthly_weight / NULLIF(tfw.total_weight, 0))
                - FLOOR(tpr.baseline_sales * tfw.monthly_weight / NULLIF(tfw.total_weight, 0)) AS baseline_frac_part,
            -- SALES UNITS split with Fractional part for tie-breaking
            (tpr.sales_units * tfw.monthly_weight / NULLIF(tfw.total_weight, 0)) AS raw_month_sales,
            FLOOR(tpr.sales_units * tfw.monthly_weight / NULLIF(tfw.total_weight, 0)) AS floor_month_sales,
            (tpr.sales_units * tfw.monthly_weight / NULLIF(tfw.total_weight, 0))
                - FLOOR(tpr.sales_units * tfw.monthly_weight / NULLIF(tfw.total_weight, 0)) AS frac_part
        FROM
            temp_monthly_metrics_reco_union_%s tpr
            INNER JOIN temp_monthly_metrics_combination_weights_%s tfw
                USING (product_id, store_id, segment_id)
    ),
    sum_floor AS (
        SELECT
            source,
            product_id,
            store_id,
            segment_id,
            SUM(floor_month_baseline_sales) AS sum_floor_baseline_sales,
            SUM(floor_month_sales) AS sum_floor_sales
        FROM raw_alloc
        GROUP BY
            source,
            product_id,
            store_id,
            segment_id
    ),
    combination_rank AS (
        SELECT
            ra.*,
            sf.sum_floor_baseline_sales,
            sf.sum_floor_sales,
            -- Calculate how many units remain to be distributed due to rounding
            (ra.total_baseline_sales_units - sf.sum_floor_baseline_sales) AS baseline_remainder_units,
            (ra.total_sales_units - sf.sum_floor_sales) AS remainder_units,
            -- Rank months by fractional part (descending) for fair distribution and store_id for consistency
            ROW_NUMBER() OVER (
                PARTITION BY ra.strategy_id, ra.source, ra.product_id, ra.store_id, ra.segment_id
                ORDER BY ra.baseline_frac_part, ra.store_id DESC, ra.filter_month
            ) AS baseline_frac_rank,
            ROW_NUMBER() OVER (
                PARTITION BY ra.strategy_id, ra.source, ra.product_id, ra.store_id, ra.segment_id
                ORDER BY ra.frac_part, ra.store_id DESC, ra.filter_month
            ) AS frac_rank
        FROM
            raw_alloc ra
            INNER JOIN sum_floor sf
                USING (source, product_id, store_id, segment_id)
    ),
    final_data AS (
        SELECT
            strategy_id,
            source,
            product_id,
            store_id,
            segment_id,
            base_price,
            cost,
            total_baseline_sales_units,
            total_sales_units,
            filter_month,
            monthly_weight,
            total_weight,
            raw_month_baseline_sales,
            raw_month_sales,
            floor_month_baseline_sales,
            floor_month_sales,
            -- Add 1 to the floor for the top N months with highest fractional part
            CASE
                WHEN baseline_frac_rank <= baseline_remainder_units
                    THEN floor_month_baseline_sales + 1
                ELSE floor_month_baseline_sales
            END AS monthly_baseline_sales_units,
            -- Add 1 to the floor for the top N months with highest fractional part
            CASE
                WHEN frac_rank <= remainder_units
                    THEN floor_month_sales + 1
                ELSE floor_month_sales
            END AS monthly_sales_units
        FROM combination_rank
    )
SELECT
    strategy_id,
    source,
    product_id,
    store_id,
    segment_id,
    base_price,
    cost,
    filter_month,
    monthly_baseline_sales_units as baseline_sales_units,
    monthly_sales_units as sales_units
FROM final_data;
-- INDEX creation
CREATE INDEX idx_temp_monthly_metrics_monthly_sales_%s_id1
    ON temp_monthly_metrics_monthly_sales_%s USING btree (product_id, store_id, segment_id, filter_month);
$query$,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id
);
    RAISE NOTICE 'Creating temp_monthly_metrics_monthly_sales table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken fortemp_monthly_metrics_monthly_sales table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_monthly_metrics_monthly_sales', start_time, end_time, end_time - start_time);
END;
$procedure$
;