--liquibase formatted sql
--changeset abhishek.singh@impactanalytics.co:fn_fetch_strategy_simulation_data_10 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_fetch_strategy_simulation_data_10

DROP FUNCTION IF EXISTS base_pricing.fn_fetch_strategy_simulation_data;

CREATE OR REPLACE FUNCTION base_pricing.fn_fetch_strategy_simulation_data(strategy_id integer, is_kvi boolean, product_hierarchy_list text DEFAULT NULL::text)
 RETURNS TABLE(product_id integer, store_id integer, segment_id integer, price_point real, channel_id integer, elasticity_bp numeric, promo_elasticity numeric, min_cost numeric, base_percentage numeric, confidence numeric, promo_source integer, weighted_promo_percent numeric, effective_reference_price numeric, predicted numeric)
 LANGUAGE plpgsql
AS $function$
DECLARE
    query_block_1 text;
    query_block_2 text;
    query_block_3 text;
    filter_table_name text;
    sql_query text;
BEGIN
    -- CONDITIONAL block
    IF is_kvi THEN
        filter_table_name := format('base_pricing.bp_unlogged_combinations_%s_true', strategy_id);
        query_block_1 := 'product_id,';
        query_block_2 := 'base_pricing.bp_simulation_day_split_ratio_kvi bsdsr
                    INNER JOIN dates_data
                        USING (date)';
        query_block_3 := 'INNER JOIN base_pricing.bp_simulation_store_split_kvi bsssr
                        USING (product_id, channel_id, segment_id, week_start_date)';
    ELSE
        filter_table_name := format('base_pricing.bp_unlogged_combinations_%s_false', strategy_id);
        query_block_1 := 'product_id,
                    ' || product_hierarchy_list || ',';
        query_block_2 := 'base_pricing.bp_simulation_day_split_ratio bsdsr
                    INNER JOIN dates_data
                        USING (date)
                    INNER JOIN base_pricing.bp_product_master bpm
                        USING (' || product_hierarchy_list || ')';
        query_block_3 := 'INNER JOIN base_pricing.bp_simulation_store_split bsssr
                    USING (' || product_hierarchy_list || ', channel_id, segment_id, week_start_date)';
    END IF;
    -- MAIN query
    sql_query := format(
    $fmt$
        WITH
        dates_data AS (
            SELECT date_id AS date, weeks_start_date AS week_start_date
            FROM (
                    SELECT strategy_id, start_date, end_date
                    FROM base_pricing.bp_strategy_master bsm
                    WHERE strategy_id = %s
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
                %s
                swa.channel_id,
                swa.segment_id,
                swa.week_start_date,
                swa.min_cost,
                swa.base_percentage,
                swa.price_point,
                swa.sales_units as predicted_at_current_price,
                swa.elasticity_bp,
                swa.promo_elasticity,
                swa.confidence,
                (week_split_ratio * swa.sales_units) AS week_level_predicted,
                COALESCE(spw.weighted_promo_percent, 0.0) as weighted_promo_percent,
                COALESCE(spw.promo_source, 0) as promo_source,
                COALESCE(spw.reference_price, 0) as reference_price,
                COALESCE(spw.effective_reference_price, 0) as effective_reference_price
            FROM (
                SELECT *
                FROM
                    base_pricing.bp_simulation_week_alt swa
                    INNER JOIN (SELECT DISTINCT product_id, segment_id FROM %s) pf
                        USING (product_id, segment_id)
                    INNER JOIN weeks_data
                        USING (week_start_date)
            ) AS swa
            INNER JOIN (
                SELECT
                    %s
                    bsdsr.channel_id,
                    bsdsr.segment_id,
                    bsdsr.week_start_date,
                    sum(day_split_ratio) AS week_split_ratio
                FROM
                    %s
                    INNER JOIN (SELECT DISTINCT product_id, segment_id FROM %s) pf
                        USING (product_id, segment_id)
                GROUP BY
                    %s
                    bsdsr.channel_id,
                    bsdsr.segment_id,
                    bsdsr.week_start_date
            ) AS bsdsr
                USING (product_id, channel_id, segment_id, week_start_date)
            LEFT JOIN base_pricing.bp_simulation_promo_week spw
                USING (product_id, channel_id, segment_id, week_start_date)
        ),
        store_data AS (
            SELECT
                wd.product_id,
                bsssr.store_id,
                wd.segment_id,
                wd.price_point,
                wd.channel_id,
                AVG(wd.elasticity_bp)::numeric AS elasticity_bp,
                AVG(wd.promo_elasticity)::numeric AS promo_elasticity,
                AVG(wd.min_cost)::numeric AS min_cost,
                AVG(wd.base_percentage)::numeric AS base_percentage,
                AVG(wd.confidence)::numeric AS confidence,
                MAX(wd.promo_source)::integer AS promo_source,
                AVG(wd.weighted_promo_percent)::numeric AS weighted_promo_percent,
                AVG(wd.effective_reference_price)::numeric AS effective_reference_price,
                SUM(wd.week_level_predicted * bsssr.store_split_ratio)::numeric AS predicted
            FROM
                week_data AS wd
                %s
                INNER JOIN %s buc
                    USING (product_id, store_id, segment_id)
            GROUP BY
                wd.product_id,
                bsssr.store_id,
                wd.segment_id,
                wd.price_point,
                wd.channel_id
        )
        SELECT * FROM store_data;
    $fmt$,
        strategy_id,            -- strategy_id
        query_block_1,          -- level of data
        filter_table_name,      -- unlogged_combinations table
        query_block_1,          -- level of data
        query_block_2,          -- date split table join
        filter_table_name,       -- unlogged_combinations table
        query_block_1,          -- level of data
        query_block_3,          -- store split table join
        filter_table_name       -- unlogged_combinations table
    );
    -- RAISE NOTICE 'Final SQL: %', sql_query;
    -- RAISE NOTICE 'HL: %', product_hierarchy_list;
    RETURN QUERY EXECUTE sql_query;
END;
$function$
;