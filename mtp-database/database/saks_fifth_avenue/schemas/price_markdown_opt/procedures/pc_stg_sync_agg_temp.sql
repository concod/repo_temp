--liquibase formatted sql
--changeset surya.avinash@impactanalytics.co:pc_stg_sync_agg_temp runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_sync_agg_temp

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_sync_agg_temp(IN _strategy_id integer, IN _version text, IN _discount_ref text, IN _ref_temp_ssd text, IN _inv_dates date);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_sync_agg_temp(IN _strategy_id integer, IN _version text, IN _discount_ref text, IN _ref_temp_ssd text, IN _inv_dates date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_stg_sync_agg_temp_query text;
BEGIN

    _stg_sync_agg_temp_query = format(
        'DROP TABLE IF EXISTS price_markdown_opt_temp.syn_agg_temp8_%1$s_%2$s;

		CREATE UNLOGGED TABLE price_markdown_opt_temp.syn_agg_temp8_%1$s_%2$s AS
        WITH ending_rule AS (
            SELECT product_level_id, store_level_id, pcd_id, markdown_type,
                   CASE WHEN markdown_type = ''First Markdown'' THEN 99 ELSE 97 END AS end_rule
            FROM price_markdown.tb_strategy_discount%3$s t1
            WHERE strategy_id = %1$s
        ),
        base AS (
            SELECT t1.*,
                   CASE WHEN end_rule IS NULL THEN ROUND(CAST(selling_price AS numeric), 2)
                        ELSE ROUND(CAST(selling_price - (end_rule::numeric/100) AS numeric)) + (end_rule::numeric/100)
                   END AS effective_price_point
            FROM (
                SELECT strategy_id, product_level_id, store_level_id,
                       pcd_id, recommendation_date, recommended_offer_percentage, channel_info, previous_markdown_percentage,
                       SUM(sales_units) AS sales_units, SUM(revenue) AS revenue, SUM(margin) AS margin,
                       SUM(rem_inv) AS rem_inv, SUM(spend) AS spend,
                       CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
                            ELSE AVG(effective_price_point)
                       END AS selling_price,
                       SUM(sales_units_uncapped) AS sales_units_uncapped
                FROM %4$s
                GROUP BY 1,2,3,4,5,6,7,8
            ) t1
            LEFT JOIN ending_rule t2
            ON t1.product_level_id = t2.product_level_id
            AND t1.store_level_id = t2.store_level_id
            AND t1.pcd_id = t2.pcd_id
        )
        SELECT strategy_id,
               product_level_id,
               store_level_id,
               recommendation_date,
               recommended_offer_percentage,
               effective_price_point,
               pcd_id,
               sales_units,
               margin,
               revenue,
               current_timestamp AS created_at,
               current_timestamp AS updated_at,
               rem_inv,
               spend,
               sales_units_uncapped, channel_info, previous_markdown_percentage
        FROM base;',
        _strategy_id, _version, _discount_ref, _ref_temp_ssd
    );
   raise notice '_stg_sync_agg_temp_query: %', _stg_sync_agg_temp_query;
  execute _stg_sync_agg_temp_query;
END;
$procedure$
;