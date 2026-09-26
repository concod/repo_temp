--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_fetch_baseline_sales_data stripComments:false runOnChange:true splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing_restaurant.fn_fetch_baseline_sales_data

DROP FUNCTION IF EXISTS base_pricing_restaurant.fn_fetch_baseline_sales_data;

CREATE OR REPLACE FUNCTION base_pricing_restaurant.fn_fetch_baseline_sales_data(strategy_id integer, product_hierarchy_list text DEFAULT NULL::text)
 RETURNS character varying
 LANGUAGE plpgsql
AS $function$
DECLARE
    query_block_1 text;
    query_block_2 text;
    query_block_3 text;
    filter_table_name text;
    sql_query varchar;
BEGIN
    -- MAIN Query
    sql_query := '
WITH
    dates_data AS (
        SELECT date_id AS date, weeks_start_date AS week_start_date
        FROM (
                SELECT strategy_id, start_date, end_date
                FROM base_pricing_restaurant.bp_strategy_master bsm
                WHERE strategy_id = ' || strategy_id || '
            ) AS bsm
            INNER JOIN global.tb_fiscal_date_mapping tfdm
                ON tfdm.date_id BETWEEN bsm.start_date AND bsm.end_date
    ),
    weeks_data AS (
        SELECT DISTINCT week_start_date
        FROM dates_data
    ),
    week_data AS (
        SELECT
            product_id,
            ' || product_hierarchy_list || ',
            bso.channel_id,
            bso.segment_id,
            bso.week_start_date,
            bso.segment_baseline_sales,
            bso.segment_price,
            bso.segment_cost,
            bsdsr.week_split_ratio * GREATEST(bso.segment_baseline_sales, 0) AS weekly_sales
        FROM
            base_pricing_restaurant.bp_baseline_sales_overall bso
            INNER JOIN (SELECT DISTINCT product_id FROM base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_false) pf
                USING (product_id)
            INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_false) sf
                USING (segment_id)
            INNER JOIN weeks_data
                USING (week_start_date)
            INNER JOIN (
                SELECT
                    product_id,
                    ' || product_hierarchy_list || ',
                    bsdsr.channel_id,
                    bsdsr.segment_id,
                    bsdsr.week_start_date,
                    sum(bsdsr.day_split_ratio) AS week_split_ratio
                FROM
                    base_pricing_restaurant.bp_simulation_day_split_ratio bsdsr
                    INNER JOIN base_pricing_restaurant.bp_product_master bpm
                        USING (' || product_hierarchy_list || ')
                    INNER JOIN (SELECT DISTINCT product_id FROM base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_false) pf
                        USING (product_id)
                    INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_false) sf
                        USING (segment_id)
                    INNER JOIN dates_data
                        USING (date)
                GROUP BY
                    product_id,
                    ' || product_hierarchy_list || ',
                    bsdsr.channel_id,
                    bsdsr.segment_id,
                    bsdsr.week_start_date
            ) AS bsdsr
                USING (product_id, channel_id, segment_id, week_start_date)
    ),
    store_data AS (
        SELECT
            wd.product_id,
            bsssr.store_id,
            wd.segment_id,
            wd.channel_id,
            wd.segment_price,
            wd.segment_cost,
            SUM(wd.weekly_sales * bsssr.store_split_ratio)::NUMERIC AS baseline_sales
        FROM
            week_data AS wd
            INNER JOIN base_pricing_restaurant.bp_simulation_store_split_ratio bsssr
                USING (' || product_hierarchy_list || ', channel_id, segment_id, week_start_date)
            INNER JOIN base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_false buc
                USING (product_id, store_id, segment_id)
        GROUP BY
            wd.product_id,
            bsssr.store_id,
            wd.segment_id,
            wd.channel_id,
            wd.segment_price,
            wd.segment_cost
    ),
    week_data_kvi AS (
        SELECT
            product_id,
            bso.channel_id,
            bso.segment_id,
            bso.week_start_date,
            bso.segment_baseline_sales,
            bso.segment_price,
            bso.segment_cost,
            bsdsr.week_split_ratio * GREATEST(bso.segment_baseline_sales, 0) AS weekly_sales
        FROM
            base_pricing_restaurant.bp_baseline_sales_overall bso
            INNER JOIN (SELECT DISTINCT product_id FROM base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_true) pf
                USING (product_id)
            INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_true) sf
                USING (segment_id)
            INNER JOIN weeks_data
                USING (week_start_date)
            INNER JOIN (
                SELECT
                    product_id,
                    bsdsr.channel_id,
                    bsdsr.segment_id,
                    bsdsr.week_start_date,
                    sum(bsdsr.day_split_ratio) AS week_split_ratio
                FROM
                    base_pricing_restaurant.bp_simulation_day_split_ratio_kvi bsdsr
                    INNER JOIN (SELECT DISTINCT product_id FROM base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_true) pf
                        USING (product_id)
                    INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_true) sf
                        USING (segment_id)
                    INNER JOIN dates_data
                        USING (date)
                GROUP BY
                    product_id,
                    bsdsr.channel_id,
                    bsdsr.segment_id,
                    bsdsr.week_start_date
            ) AS bsdsr
                USING (product_id, channel_id, segment_id, week_start_date)
    ),
    store_data_kvi AS (
        SELECT
            wd.product_id,
            bsssr.store_id,
            wd.segment_id,
            wd.channel_id,
            wd.segment_price,
            wd.segment_cost,
            SUM(wd.weekly_sales * bsssr.store_split_ratio)::NUMERIC AS baseline_sales
        FROM
            week_data_kvi AS wd
            INNER JOIN base_pricing_restaurant.bp_simulation_store_split_ratio_kvi bsssr
                USING (product_id, channel_id, segment_id, week_start_date)
            INNER JOIN base_pricing_restaurant.bp_unlogged_combinations_' || strategy_id || '_true buc
                USING (product_id, store_id, segment_id)
        GROUP BY
            wd.product_id,
            bsssr.store_id,
            wd.segment_id,
            wd.channel_id,
            wd.segment_price,
            wd.segment_cost
    )
SELECT * FROM store_data
UNION ALL
SELECT * FROM store_data_kvi
;
    ';
    RETURN sql_query;
END;
$function$
;