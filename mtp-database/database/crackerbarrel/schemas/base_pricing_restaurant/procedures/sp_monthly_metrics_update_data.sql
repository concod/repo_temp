--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_monthly_metrics_update_data_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_update_data_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_update_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_update_data(IN strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    join_condition text;
    table_name text := '';
    segment_ids_text text := '9999';
BEGIN
    start_time := clock_timestamp();
    sql_query := format(
$query$
-- DELETE OLD DATA
DROP TABLE IF EXISTS base_pricing_restaurant.bp_strategy_performance_metrics_monthly_%s;
-- CREATE PARTITION
CREATE TABLE base_pricing_restaurant.bp_strategy_performance_metrics_monthly_%s
    PARTITION OF base_pricing_restaurant.bp_strategy_performance_metrics_monthly
    FOR VALUES IN (%s);
-- INSERT NEW DATA
INSERT INTO base_pricing_restaurant.bp_strategy_performance_metrics_monthly (
    strategy_id,
    source,
    opt_level_bins,
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
    mmmf.strategy_id,
    mmmf.source,
    mmmf.opt_level_bins,
    mmmf.product_id,
    mmmf.store_id,
    mmmf.segment_id,
    mmmf.filter_month AS time_period,
    tfdm.fiscal_month AS month,
    tfdm.fiscal_year AS year,
    mmmf.base_price,
    -- BASELINE
    mmmf.baseline_sales_units,
    ROUND((baseline_sales_units * base_price)::NUMERIC, 2) AS baseline_revenue,
    COALESCE(ROUND(((base_price - cost) * baseline_sales_units)::NUMERIC, 2), 0) AS baseline_gross_margin_dollar,
    COALESCE(ROUND(((((base_price - cost) * baseline_sales_units)
        / NULLIF((baseline_sales_units * base_price), 0)) * 100)::NUMERIC, 2), 0) AS baseline_gross_margin_percentage,
    COALESCE(ROUND(((baseline_sales_units * base_price)
        / NULLIF(baseline_sales_units, 0))::NUMERIC, 2), 0) AS baseline_average_selling_price,
    COALESCE(ROUND((((base_price - cost) * baseline_sales_units)
        / NULLIF(baseline_sales_units, 0))::NUMERIC, 2), 0) AS baseline_average_unit_margin,
    -- WITH PROMOTION
    mmmf.sales_units,
    COALESCE(ROUND((sales_units * base_price)::NUMERIC, 2), 0) AS revenue,
    COALESCE(ROUND(((base_price - cost) * sales_units)::NUMERIC, 2), 0) AS gross_margin_dollar,
    COALESCE(ROUND(((((base_price - cost) * sales_units) / NULLIF((sales_units * base_price), 0)) * 100)::NUMERIC, 2), 0) AS gross_margin_percentage,
    COALESCE(ROUND(((sales_units * base_price) / NULLIF(sales_units, 0))::NUMERIC, 2), 0) AS average_selling_price,
    COALESCE(ROUND((((base_price - cost) * sales_units) / NULLIF(sales_units, 0))::NUMERIC, 2), 0) AS average_unit_margin
FROM
    base_pricing_restaurant.temp_monthly_metrics_monthly_forecast_%s mmmf
    INNER JOIN global.tb_fiscal_date_mapping tfdm
        ON tfdm.date_id = mmmf.filter_month;
$query$,
    -- INSERT
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id
);
    -- Execute the table creation
    RAISE NOTICE 'Inserting data into bp_strategy_performance_metrics_monthly for strategy - % : %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for inserting data into bp_strategy_performance_metrics_monthly for strategy - % : %', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_monthly_metrics_update_data',
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;
