--liquibase formatted sql
--changeset vishnuvardhan@impactanalytics.co:sp_actual_metrics_refresh_data_4 stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: changeset for base_pricing_restaurant.sp_actual_metrics_refresh_data

DROP PROCEDURE IF EXISTS base_pricing_restaurant.sp_actual_metrics_refresh_data;

CREATE OR REPLACE PROCEDURE base_pricing_restaurant.sp_actual_metrics_refresh_data(IN p_strategy_id integer, IN p_run_date date DEFAULT CURRENT_DATE)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    v_strategy_start      DATE;
    v_strategy_end        DATE;
    v_effective_end       DATE;
    v_tbl_forecast_bins   TEXT := 'temp_actual_forecast_bins_' || p_strategy_id;
    v_tbl_store_mapping   TEXT := 'temp_actual_store_mapping_' || p_strategy_id;
    v_tbl_daily_agg       TEXT := 'temp_actual_daily_agg_' || p_strategy_id;
BEGIN
    -- STEP 0: Get strategy date range
    SELECT start_date, end_date
    INTO v_strategy_start, v_strategy_end
    FROM base_pricing_restaurant.bp_strategy_master
    WHERE strategy_id = p_strategy_id;

    -- Effective end date: don't look beyond run_date or strategy end
    v_effective_end := LEAST(p_run_date, v_strategy_end);

    RAISE NOTICE 'Strategy %: date range % to %, effective end: %, run date: %',
        p_strategy_id, v_strategy_start, v_strategy_end, v_effective_end, p_run_date;

    -- STEP 1: Create temp table with forecast bins as reference.
    -- Always build skeleton from bp_price_reco_current_v2 to ensure all opt_level_bins
    -- are included (bp_strategy_performance_metrics_monthly may be missing some bins,
    -- causing actuals revenue to be undercounted vs the reco tables).
    EXECUTE format('DROP TABLE IF EXISTS %I', v_tbl_forecast_bins);

    EXECUTE format(
        'CREATE TEMP TABLE %I AS
        SELECT DISTINCT
            prc.strategy_id,
            prc.opt_level_bins,
            prc.product_id,
            prc.store_id,
            prc.segment_id,
            months.time_period,
            tfdm.fiscal_month                                             AS month,
            tfdm.fiscal_year                                              AS year,
            prc.base_price
        FROM base_pricing_restaurant.bp_price_reco_current_v2 prc
        CROSS JOIN (
            SELECT DISTINCT
                DATE_TRUNC(''month'', gs::date)::date AS time_period
            FROM generate_series(
                DATE_TRUNC(''month'', %L::date)::date,
                DATE_TRUNC(''month'', %L::date)::date,
                INTERVAL ''1 month''
            ) AS gs
        ) months
        INNER JOIN global.tb_fiscal_date_mapping tfdm ON tfdm.date_id = months.time_period
        WHERE prc.strategy_id = %s',
        v_tbl_forecast_bins,
        v_strategy_start,
        v_effective_end,
        p_strategy_id
    );

    EXECUTE format(
        'CREATE INDEX ON %I (opt_level_bins, time_period)',
        v_tbl_forecast_bins
    );

    -- STEP 2: Get store_ids mapping from price reco
    -- Single scan: unnest store_ids when present, fall back to store_id column otherwise.
    EXECUTE format('DROP TABLE IF EXISTS %I', v_tbl_store_mapping);
    EXECUTE format(
        'CREATE TEMP TABLE %I AS
        SELECT opt_level_bins, product_id, segment_id, unnest(store_ids) AS individual_store_id
        FROM base_pricing_restaurant.bp_price_reco_current_v2
        WHERE strategy_id = %s AND store_ids IS NOT NULL
        UNION ALL
        SELECT opt_level_bins, product_id, segment_id, store_id::integer AS individual_store_id
        FROM base_pricing_restaurant.bp_price_reco_current_v2
        WHERE strategy_id = %s AND store_ids IS NULL',
        v_tbl_store_mapping, p_strategy_id, p_strategy_id
    );

    EXECUTE format(
        'CREATE INDEX ON %I (product_id, individual_store_id, segment_id)',
        v_tbl_store_mapping
    );

    -- STEP 3: Aggregate ALL actuals from daily table
    -- Uses DATE_TRUNC('month', transaction_date) to align with forecast time_period convention.
    EXECUTE format('DROP TABLE IF EXISTS %I', v_tbl_daily_agg);
    EXECUTE format(
        'CREATE TEMP TABLE %I AS
        SELECT
            sm.opt_level_bins,
            DATE_TRUNC(''month'', d.transaction_date)::date AS time_period,
            SUM(d.sales_units)           AS sales_units,
            SUM(d.total_revenue)         AS revenue,
            SUM(d.total_margin)          AS gross_margin_dollar,
            SUM(d.transactions)          AS transactions,
            SUM(d.total_base_cost)       AS total_base_cost,
            SUM(d.total_additional_cost) AS total_additional_cost,
            SUM(d.total_contri_margin)   AS total_contri_margin
        FROM base_pricing_restaurant.bp_transaction_data_daily d
        INNER JOIN %I sm
            ON  d.product_id = sm.product_id
            AND d.store_id   = sm.individual_store_id
            AND d.segment_id = sm.segment_id
        WHERE d.transaction_date >= %L::date
          AND d.transaction_date <= %L::date
        GROUP BY sm.opt_level_bins,
                 DATE_TRUNC(''month'', d.transaction_date)::date',
        v_tbl_daily_agg,
        v_tbl_store_mapping,
        v_strategy_start,
        v_effective_end
    );

    EXECUTE format(
        'CREATE INDEX ON %I (opt_level_bins, time_period)',
        v_tbl_daily_agg
    );

    -- STEP 4: Drop + recreate partition and INSERT final data
    EXECUTE format(
        'DROP TABLE IF EXISTS base_pricing_restaurant.bp_strategy_actual_metrics_monthly_%s',
        p_strategy_id
    );

    EXECUTE format(
        'CREATE TABLE base_pricing_restaurant.bp_strategy_actual_metrics_monthly_%s
         PARTITION OF base_pricing_restaurant.bp_strategy_actual_metrics_monthly
         FOR VALUES IN (%s)',
        p_strategy_id, p_strategy_id
    );

    EXECUTE format(
        'INSERT INTO base_pricing_restaurant.bp_strategy_actual_metrics_monthly (
            strategy_id, opt_level_bins, product_id, store_id, segment_id,
            time_period, month, year, base_price,
            sales_units, revenue, gross_margin_dollar,
            gross_margin_percentage, average_selling_price, average_unit_margin,
            transactions, total_base_cost, total_additional_cost, total_contri_margin
        )
        SELECT
            fb.strategy_id,
            fb.opt_level_bins,
            fb.product_id,
            fb.store_id,
            fb.segment_id,
            fb.time_period,
            fb.month,
            fb.year,
            fb.base_price,
            COALESCE(ac.sales_units, 0),
            COALESCE(ac.revenue, 0),
            COALESCE(ac.gross_margin_dollar, 0),
            CASE
                WHEN COALESCE(ac.revenue, 0) = 0 THEN 0
                ELSE COALESCE(ac.gross_margin_dollar, 0) / ac.revenue * 100
            END,
            CASE
                WHEN COALESCE(ac.sales_units, 0) = 0 THEN 0
                ELSE COALESCE(ac.revenue, 0) / ac.sales_units
            END,
            CASE
                WHEN COALESCE(ac.sales_units, 0) = 0 THEN 0
                ELSE COALESCE(ac.gross_margin_dollar, 0) / ac.sales_units
            END,
            COALESCE(ac.transactions, 0),
            COALESCE(ac.total_base_cost, 0),
            COALESCE(ac.total_additional_cost, 0),
            COALESCE(ac.total_contri_margin, 0)
        FROM %I fb
        LEFT JOIN %I ac
            ON fb.opt_level_bins = ac.opt_level_bins
            AND fb.time_period = ac.time_period',
        v_tbl_forecast_bins,
        v_tbl_daily_agg
    );

    -- STEP 5: Cleanup temp tables
    EXECUTE format('DROP TABLE IF EXISTS %I', v_tbl_forecast_bins);
    EXECUTE format('DROP TABLE IF EXISTS %I', v_tbl_store_mapping);
    EXECUTE format('DROP TABLE IF EXISTS %I', v_tbl_daily_agg);

    RAISE NOTICE 'Actual metrics refreshed for strategy %', p_strategy_id;
END;
$procedure$;
