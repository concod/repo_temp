--liquibase formatted sql
--changeset krithika.s@impactanalytics.co:sp_monthly_metrics_update_metrics stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.sp_monthly_metrics_update_metrics

DROP PROCEDURE IF EXISTS base_pricing.sp_monthly_metrics_update_metrics;

CREATE OR REPLACE PROCEDURE base_pricing.sp_monthly_metrics_update_metrics(IN strategy_id integer)
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
-- DELETE OLD DATA
DELETE FROM base_pricing.bp_strategy_performance_metrics_monthly
WHERE strategy_id = %s;
-- INSERT NEW DATA
INSERT INTO base_pricing.bp_strategy_performance_metrics_monthly (
    strategy_id,
    source,
    product_id,
    store_id,
    segment_id,
    time_period,
    month,
    year,
    base_price,
    -- BASELINE
    baseline_sales_units,
    baseline_revenue,
    baseline_gross_margin_dollar,
    baseline_gross_margin_percentage,
    baseline_average_selling_price,
    baseline_average_unit_margin,
    -- WITH PROMOTION
    sales_units,
    revenue,
    gross_margin_dollar,
    gross_margin_percentage,
    average_selling_price,
    average_unit_margin
)
SELECT
    strategy_id,
    source,
    product_id,
    store_id,
    segment_id,
    filter_month AS time_period,
    tfdm.fiscal_month AS month,
    tfdm.fiscal_year AS year,
    base_price,
    -- BASELINE
    baseline_sales_units,
    ROUND((baseline_sales_units * base_price)::NUMERIC, 2) AS baseline_revenue,
    ROUND(((base_price - cost) * baseline_sales_units)::NUMERIC, 2) AS baseline_gross_margin_dollar,
    ROUND(((((base_price - cost) * baseline_sales_units)
        / NULLIF((baseline_sales_units * base_price), 0)) * 100)::NUMERIC, 2) AS baseline_gross_margin_percentage,
    ROUND(((baseline_sales_units * base_price)
        / NULLIF(baseline_sales_units, 0))::NUMERIC, 2) AS baseline_average_selling_price,
    ROUND((((base_price - cost) * baseline_sales_units)
        / NULLIF(baseline_sales_units, 0))::NUMERIC, 2) AS baseline_average_unit_margin,
    -- WITH PROMOTION
    sales_units,
    ROUND((sales_units * base_price)::NUMERIC, 2) AS revenue,
    ROUND(((base_price - cost) * sales_units)::NUMERIC, 2) AS gross_margin_dollar,
    ROUND(((((base_price - cost) * sales_units)
        / NULLIF((sales_units * base_price), 0)) * 100)::NUMERIC, 2) AS gross_margin_percentage,
    ROUND(((sales_units * base_price)
        / NULLIF(sales_units, 0))::NUMERIC, 2) AS average_selling_price,
    ROUND((((base_price - cost) * sales_units)
        / NULLIF(sales_units, 0))::NUMERIC, 2) AS average_unit_margin
FROM
    temp_monthly_metrics_monthly_sales_%s tfs
    INNER JOIN global.tb_fiscal_date_mapping tfdm
        ON tfdm.date_id = tfs.filter_month;
$query$,
    strategy_id,
    strategy_id
);
    RAISE NOTICE 'Updating data in base_pricing.bp_strategy_performance_metrics_monthly table: %', sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken fortemp_monthly_metrics_update_metrics table : %', end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (strategy_id, 'sp_monthly_metrics_update_metrics', start_time, end_time, end_time - start_time);
END;
$procedure$
;