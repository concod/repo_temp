--liquibase formatted sql
--changeset yashraj.jha@impactanalytics.co:sp_monthly_metrics_monthly_forecast_2 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_monthly_metrics_monthly_forecast_2

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_monthly_metrics_monthly_forecast;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_monthly_metrics_monthly_forecast(IN strategy_id integer, IN non_kvi_count integer, IN kvi_count integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    start_time timestamp;
    end_time timestamp;
    sql_query text;
    is_kvi_flag text;
    select_statement text := '';
    union_all_check text := '';
    i integer := 0;
BEGIN
    start_time := clock_timestamp();
    -- INTERMEDIATE TABLE query setup based on counts
    FOR i IN 1..2 LOOP
        IF (i = 1 AND non_kvi_count > 0) OR (i = 2 AND kvi_count > 0) THEN
            IF select_statement != '' THEN
                union_all_check := 'UNION ALL
    ';
            END IF;
            select_statement := select_statement || union_all_check || format(
$query$
SELECT
    sfss.opt_level_bins,
    sfsd.product_id,
    sfss.effective_price_zone as store_id,
    sfsd.segment_id,
    sfsd.channel_id,
    date_trunc('month', sfsd.week_start_date)::date AS filter_month,
    sfsd.min_cost,
    sfsd.base_percentage,
    sfsd.elasticity_bp,
    sfsd.promo_elasticity,
    GREATEST(SUM(sfsd.sales_units * sfds.week_split_ratio * sfss.bin_split_ratio), 0) AS monthly_zone_predicted
FROM
    base_pricing_restaurant.temp_monthly_metrics_simulation_data_%s_%s sfsd
    INNER JOIN base_pricing_restaurant.temp_monthly_metrics_day_split_%s_%s sfds
        USING (product_id, channel_id, segment_id, week_start_date)
    INNER JOIN base_pricing_restaurant.temp_monthly_metrics_store_split_%s_%s sfss
        USING (product_id, channel_id, segment_id, week_start_date)
GROUP BY
    sfss.opt_level_bins,
    sfsd.product_id,
    sfss.effective_price_zone,
    sfsd.segment_id,
    sfsd.channel_id,
    date_trunc('month', sfsd.week_start_date),
    sfsd.min_cost,
    sfsd.base_percentage,
    sfsd.elasticity_bp,
    sfsd.promo_elasticity
$query$,
    strategy_id,
    CASE WHEN i = 1 THEN 'false' ELSE 'true' END,
    strategy_id,
    CASE WHEN i = 1 THEN 'false' ELSE 'true' END,
    strategy_id,
    CASE WHEN i = 1 THEN 'false' ELSE 'true' END
);
        END IF;
    END LOOP;
    -- Check for no data
    IF select_statement = '' THEN
        RAISE NOTICE 'No data to process (non_kvi_count: %, kvi_count: %) for strategy - %', non_kvi_count, kvi_count, strategy_id;
        RETURN;
    END IF;
    -- INTERMEDIATE TABLE
    sql_query := format(
$query$
-- INTERMEDIATE TABLE creation
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_monthly_forecast_intermediate_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_monthly_forecast_intermediate_%s AS
%s;
-- INTERMEDIATE INDEX CREATION
CREATE INDEX idx_temp_monthly_metrics_monthly_forecast_intermediate_%s_id1
    ON base_pricing_restaurant.temp_monthly_metrics_monthly_forecast_intermediate_%s USING btree (product_id, store_id, segment_id);
$query$,
    -- INTERMEDIATE TABLE
    strategy_id,
    strategy_id,
    select_statement,
    strategy_id,
    strategy_id
);
    -- Execute the table creation
    RAISE NOTICE 'Creating temp_monthly_metrics_monthly_forecast_intermediate_% table : %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for temp_monthly_metrics_monthly_forecast_intermediate_% table : %', strategy_id, end_time - start_time;
    -- INSERT DATA
    sql_query := format(
$query$
DROP TABLE IF EXISTS base_pricing_restaurant.temp_monthly_metrics_monthly_forecast_%s;
CREATE UNLOGGED TABLE base_pricing_restaurant.temp_monthly_metrics_monthly_forecast_%s AS
SELECT
    mmpr.strategy_id,
    mmpr.source,
    mmpr.opt_level_bins,
    mmpr.product_id,
    mmpr.store_id,
    mmpr.segment_id,
    mmpr.channel_id,
    mmpr.store_ids,
    mmpr.base_price,
    mmpr.cost,
    mmmfi.filter_month,
    COALESCE(ROUND(GREATEST(
        (mmmfi.monthly_zone_predicted *
            (1 + mmmfi.elasticity_bp *
                (((mmpr.base_price - mmmfi.min_cost)/NULLIF(mmmfi.min_cost, 0)) - mmmfi.base_percentage)
            )
        ), 0)::NUMERIC, 0), 0) AS baseline_sales_units,
    COALESCE(ROUND(GREATEST(
        (mmmfi.monthly_zone_predicted *
            (1 + mmmfi.elasticity_bp *
                (((mmpr.base_price - mmmfi.min_cost)/NULLIF(mmmfi.min_cost, 0)) - mmmfi.base_percentage)
            )
        ) * (1 + COALESCE(mmpr.promotion_applied, 0) * COALESCE(mmmfi.promo_elasticity, 0)), 0)::NUMERIC, 0), 0) AS sales_units
FROM
    base_pricing_restaurant.temp_monthly_metrics_price_recommendations_%s mmpr
    LEFT JOIN base_pricing_restaurant.temp_monthly_metrics_monthly_forecast_intermediate_%s mmmfi
        ON mmpr.opt_level_bins = mmmfi.opt_level_bins;
$query$,
    -- INSERT
    strategy_id,
    strategy_id,
    strategy_id,
    strategy_id
);
    -- Execute the table creation
    RAISE NOTICE 'Creating temp_monthly_metrics_monthly_forecast_% table : %', strategy_id, sql_query;
    EXECUTE sql_query;
    end_time := clock_timestamp();
    RAISE NOTICE 'Time taken for creating temp_monthly_metrics_monthly_forecast_% table : %', strategy_id, end_time - start_time;
    -- TIME tracking
    INSERT INTO base_pricing_restaurant.bp_procedure_time_tracking
        (strategy_id, procedure, start_date, end_date, time_taken)
    VALUES
        (
            strategy_id,
            'sp_monthly_metrics_monthly_forecast',
            start_time,
            end_time,
            end_time - start_time
        );
END;
$procedure$
;