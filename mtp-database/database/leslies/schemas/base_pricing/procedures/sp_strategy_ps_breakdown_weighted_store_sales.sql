--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_strategy_ps_breakdown_weighted_store_sales_1 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_strategy_ps_breakdown_weighted_store_sales_1

DROP PROCEDURE IF EXISTS base_pricing.sp_strategy_ps_breakdown_weighted_store_sales;

CREATE OR REPLACE PROCEDURE base_pricing.sp_strategy_ps_breakdown_weighted_store_sales(IN strategy_id integer, IN channel_id text, IN segment_id text, IN comparison_column_1 text, IN comparison_value_1 text, IN user_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    weighted_table text;
    agg_sales_table text;
    split_weight_table text;
BEGIN
    start_time := clock_timestamp();
    weighted_table := format(
        'base_pricing.temp_strategy_ps_breakdown_wss_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    agg_sales_table := format(
        'base_pricing.temp_strategy_ps_breakdown_agg_sales_data_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    split_weight_table := format(
        'base_pricing.strategy_ps_breakdown_store_split_data_%s_%s_%s_%s',
        strategy_id,
        comparison_column_1,
        comparison_value_1,
        user_id
    );

    sql_query := format(
$query$

INSERT INTO %s

WITH raw_alloc AS (
    SELECT
        tpr.strategy_id,
        tpr.source,
        tfw.product_id,
        tfw.store_id,
        tfw.segment_id,
        tfw.price_zone_name,
        total_baseline_sales_units,
        total_sales_units,
        tfw.store_weight,
        tfw.total_weight,

        (tpr.total_baseline_sales_units * tfw.store_weight / NULLIF(tfw.total_weight,0)) AS raw_month_baseline_sales,
        FLOOR(tpr.total_baseline_sales_units * tfw.store_weight / NULLIF(tfw.total_weight,0)) AS floor_month_baseline_sales,

        (tpr.total_baseline_sales_units * tfw.store_weight / NULLIF(tfw.total_weight,0))
        - FLOOR(tpr.total_baseline_sales_units * tfw.store_weight / NULLIF(tfw.total_weight,0)) AS baseline_frac_part,

        (tpr.total_sales_units * tfw.store_weight / NULLIF(tfw.total_weight,0)) AS raw_month_sales,
        FLOOR(tpr.total_sales_units * tfw.store_weight / NULLIF(tfw.total_weight,0)) AS floor_month_sales,

        (tpr.total_sales_units * tfw.store_weight / NULLIF(tfw.total_weight,0))
        - FLOOR(tpr.total_sales_units * tfw.store_weight / NULLIF(tfw.total_weight,0)) AS frac_part

    FROM
        %s tpr
        INNER JOIN %s tfw
            USING (product_id, segment_id, price_zone_name)
),

sum_floor AS (
    SELECT
        source,
        product_id,
        segment_id,
        price_zone_name,
        SUM(floor_month_baseline_sales) AS sum_floor_baseline_sales,
        SUM(floor_month_sales) AS sum_floor_sales
    FROM raw_alloc
    GROUP BY source, product_id, segment_id, price_zone_name
),

combination_rank AS (
    SELECT
        ra.*,
        sf.sum_floor_baseline_sales,
        sf.sum_floor_sales,

        (ra.total_baseline_sales_units - sf.sum_floor_baseline_sales) AS baseline_remainder_units,
        (ra.total_sales_units - sf.sum_floor_sales) AS remainder_units,

        ROW_NUMBER() OVER (
            PARTITION BY ra.strategy_id, ra.source, ra.product_id, ra.segment_id, price_zone_name
            ORDER BY ra.baseline_frac_part DESC, ra.store_id
        ) AS baseline_frac_rank,

        ROW_NUMBER() OVER (
            PARTITION BY ra.strategy_id, ra.source, ra.product_id, ra.segment_id, price_zone_name
            ORDER BY ra.frac_part DESC, ra.store_id
        ) AS frac_rank

    FROM raw_alloc ra
    INNER JOIN sum_floor sf
        USING (source, product_id, segment_id, price_zone_name)
),

final_data AS (
    SELECT
        strategy_id,
        source,
        product_id,
        store_id,
        segment_id,
        price_zone_name,

        CASE
            WHEN baseline_frac_rank <= baseline_remainder_units
            THEN floor_month_baseline_sales + 1
            ELSE floor_month_baseline_sales
        END AS store_baseline_sales_units,

        CASE
            WHEN frac_rank <= remainder_units
            THEN floor_month_sales + 1
            ELSE floor_month_sales
        END AS store_sales_units

    FROM combination_rank
)

SELECT
    strategy_id,
    source,
    product_id,
    store_id::int4,
    segment_id,
    price_zone_name,
    store_baseline_sales_units AS baseline_sales_units,
    store_sales_units AS sales_units
FROM final_data;

$query$,
        weighted_table,
        agg_sales_table,
        split_weight_table
    );

    RAISE NOTICE 'Updating weighted store sales table: %', sql_query;

    EXECUTE sql_query;

    end_time := clock_timestamp();

    RAISE NOTICE 'Time taken : %', end_time - start_time;

    INSERT INTO base_pricing.bp_procedure_time_tracking
    (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
    (strategy_id, 'sp_strategy_ps_breakdown_weighted_store_sales', start_time, end_time, end_time - start_time);

END;
$procedure$
;