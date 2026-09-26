--liquibase formatted sql
--changeset subhasis.jena@impactanalytics.co:fn_fetch_strategy_simulation_data runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels: liquibase_project_start
--comment: changeset for base_pricing.fn_fetch_strategy_simulation_data

DROP FUNCTION IF EXISTS base_pricing.fn_fetch_strategy_simulation_data;

CREATE OR REPLACE FUNCTION base_pricing.fn_fetch_strategy_simulation_data(strategy_id integer, product_hierarchy_list text)
 RETURNS text
 LANGUAGE plpgsql
AS $function$
DECLARE
    query_block_1 text;
    query_block_2 text;
    query_block_3 text;
    filter_table_name text;
    sql_query text;
BEGIN
    -- MAIN query
    sql_query := '
WITH
    dates_data AS (
        SELECT date_id AS date, weeks_start_date AS week_start_date
        FROM (
                SELECT strategy_id, start_date, end_date
                FROM base_pricing.bp_strategy_master bsm
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
                base_pricing.bp_simulation_week swa
                INNER JOIN (SELECT DISTINCT product_id FROM base_pricing.bp_unlogged_combinations_' || strategy_id || '_false) pf
                    USING (product_id)
                INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing.bp_unlogged_combinations_' || strategy_id || '_false) sf
                    USING (segment_id)
                INNER JOIN weeks_data
                    USING (week_start_date)
        ) AS swa
        INNER JOIN (
            SELECT
                product_id,
                ' || product_hierarchy_list || ',
                bsdsr.channel_id,
                bsdsr.segment_id,
                bsdsr.week_start_date,
                sum(day_split_ratio) AS week_split_ratio
            FROM
                base_pricing.bp_simulation_day_split_ratio bsdsr
                INNER JOIN base_pricing.bp_product_master bpm
                    USING (' || product_hierarchy_list || ')
                INNER JOIN (SELECT DISTINCT product_id FROM base_pricing.bp_unlogged_combinations_' || strategy_id || '_false) pf
                    USING (product_id)
                INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing.bp_unlogged_combinations_' || strategy_id || '_false) sf
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
            MAX(wd.confidence)::numeric AS confidence,
            MAX(wd.promo_source)::integer AS promo_source,
            AVG(wd.weighted_promo_percent)::numeric AS weighted_promo_percent,
            AVG(wd.effective_reference_price)::numeric AS effective_reference_price,
            SUM(wd.week_level_predicted * bsssr.store_split_ratio)::numeric AS predicted
        FROM
            week_data AS wd
            INNER JOIN base_pricing.bp_simulation_store_split_ratio bsssr
                USING (' || product_hierarchy_list || ', channel_id, segment_id, week_start_date)
            INNER JOIN base_pricing.bp_unlogged_combinations_' || strategy_id || '_false buc
                USING (product_id, store_id, segment_id)
        GROUP BY
            wd.product_id,
            bsssr.store_id,
            wd.segment_id,
            wd.price_point,
            wd.channel_id
    ),
    week_data_kvi AS (
        SELECT
            product_id,
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
                base_pricing.bp_simulation_week swa
                INNER JOIN (SELECT DISTINCT product_id FROM base_pricing.bp_unlogged_combinations_' || strategy_id || '_true) pf
                    USING (product_id)
                INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing.bp_unlogged_combinations_' || strategy_id || '_true) sf
                    USING (segment_id)
                INNER JOIN weeks_data
                    USING (week_start_date)
        ) AS swa
        INNER JOIN (
            SELECT
                product_id,
                bsdsr.channel_id,
                bsdsr.segment_id,
                bsdsr.week_start_date,
                sum(day_split_ratio) AS week_split_ratio
            FROM
                base_pricing.bp_simulation_day_split_ratio_kvi bsdsr
                INNER JOIN (SELECT DISTINCT product_id FROM base_pricing.bp_unlogged_combinations_' || strategy_id || '_true) pf
                    USING (product_id)
                INNER JOIN (SELECT DISTINCT segment_id FROM base_pricing.bp_unlogged_combinations_' || strategy_id || '_true) sf
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
        LEFT JOIN base_pricing.bp_simulation_promo_week spw
            USING (product_id, channel_id, segment_id, week_start_date)
    ),
    store_data_kvi AS (
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
            MAX(wd.confidence)::numeric AS confidence,
            MAX(wd.promo_source)::integer AS promo_source,
            AVG(wd.weighted_promo_percent)::numeric AS weighted_promo_percent,
            AVG(wd.effective_reference_price)::numeric AS effective_reference_price,
            SUM(wd.week_level_predicted * bsssr.store_split_ratio)::numeric AS predicted
        FROM
            week_data_kvi AS wd
            INNER JOIN base_pricing.bp_simulation_store_split_ratio_kvi bsssr
                USING (product_id, channel_id, segment_id, week_start_date)
            INNER JOIN base_pricing.bp_unlogged_combinations_' || strategy_id || '_true buc
                USING (product_id, store_id, segment_id)
        GROUP BY
            wd.product_id,
            bsssr.store_id,
            wd.segment_id,
            wd.price_point,
            wd.channel_id
    )
SELECT * FROM store_data
UNION ALL
SELECT * FROM STORE_DATA_KVI
;
    ';
    RETURN sql_query;
END;
$function$
;
