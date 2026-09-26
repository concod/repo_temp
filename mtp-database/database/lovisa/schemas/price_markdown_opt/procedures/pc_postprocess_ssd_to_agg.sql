--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com:pc_postprocess_ssd_to_agg_26112025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_postprocess_ssd_to_agg

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_postprocess_ssd_to_agg(integer, text, text, integer, date, text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_postprocess_ssd_to_agg(IN _strategy_id integer, IN _markdown_ssd_table text, IN _temp_agg_table text, IN _actual_exist integer, IN _fut_pcd_start_date date, IN _tb_strategy_discount_ia text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_ssd_to_agg_query text;
BEGIN

    _ssd_to_agg_query = format('DROP TABLE IF EXISTS %1$s;

    CREATE UNLOGGED TABLE IF NOT EXISTS %1$s AS
    WITH ending_rule AS
    (
        SELECT product_level_id, store_level_id, pcd_id, markdown_type,
               null AS end_rule
        FROM %2$s t1
        WHERE strategy_id = %3$s
    ),

    base AS
    (
        SELECT t1.*,
               CASE WHEN end_rule IS NULL THEN round(cast(selling_price AS numeric), 2)
               ELSE ROUND(cast(selling_price - (end_rule::numeric / 100) AS numeric)) + (end_rule::numeric / 100)
               END AS effective_price_point,
            CASE WHEN end_rule IS NULL THEN round(cast(selling_price_with_vat AS numeric), 2)
               ELSE ROUND(cast(selling_price_with_vat - (end_rule::numeric / 100) AS numeric)) + (end_rule::numeric / 100)
               END AS effective_price_point_with_vat
        FROM (
            SELECT t1.strategy_id, t1.currency_id, product_level_id, store_level_id,
                   pcd_id, recommendation_date, recommended_offer_percentage, channel_info, previous_markdown_percentage,
                   SUM(sales_units) AS sales_units, SUM(revenue) AS revenue, SUM(margin) AS margin,
                   SUM(rem_inv) AS rem_inv, SUM(spend) AS spend,
                   CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
                        ELSE AVG(effective_price_point) END AS selling_price,
                   SUM(sales_units_uncapped) AS sales_units_uncapped,
                   SUM(revenue_with_vat) AS revenue_with_vat,
                   SUM(margin_with_vat) AS margin_with_vat,
                   SUM(spend_with_vat) AS spend_with_vat,
                   CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point_with_vat * sales_units) / SUM(sales_units))
                        ELSE AVG(effective_price_point_with_vat) END AS selling_price_with_vat
            FROM %4$s t1
            ', _temp_agg_table, _tb_strategy_discount_ia, _strategy_id, _markdown_ssd_table);

    -- Conditional part based on the actual_exist parameter
    IF _actual_exist = 1 THEN
        _ssd_to_agg_query = _ssd_to_agg_query || format('
            WHERE recommendation_date >= ''%1$s''
        ', _fut_pcd_start_date);
    END IF;

    -- Final part of the query to complete the table creation
    _ssd_to_agg_query = _ssd_to_agg_query || format('
        GROUP BY 1, 2, 3, 4, 5, 6, 7, 8, 9
        ) t1
    LEFT JOIN ending_rule t2
    ON t1.product_level_id = t2.product_level_id
    AND t1.store_level_id = t2.store_level_id
    AND t1.pcd_id = t2.pcd_id
    )

    SELECT strategy_id, product_level_id, store_level_id, recommendation_date,
           recommended_offer_percentage, effective_price_point, pcd_id, sales_units,
           margin, revenue, rem_inv, spend, sales_units_uncapped,
           current_timestamp AS created_at, current_timestamp AS updated_at,
           channel_info, previous_markdown_percentage, currency_id,
           effective_price_point_with_vat, margin_with_vat, revenue_with_vat, spend_with_vat
    FROM base;
    ');
   raise notice 'ssd to agg query : %', _ssd_to_agg_query;
  execute _ssd_to_agg_query;
END $procedure$
;
