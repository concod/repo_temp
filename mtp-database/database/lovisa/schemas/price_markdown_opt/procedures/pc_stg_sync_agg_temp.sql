--liquibase formatted sql
--changeset keerthana.reddy@impactanalytics.co::pc_stg_sync_agg_temp_11032026 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_stg_sync_agg_temp

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_stg_sync_agg_temp(IN _strategy_id integer, IN _version text, IN _discount_ref text, IN _ref_temp_ssd text, IN _inv_dates date, IN _currency_type text);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_stg_sync_agg_temp(IN _strategy_id integer, IN _version text, IN _discount_ref text, IN _ref_temp_ssd text, IN _inv_dates date, IN _currency_type text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_stg_sync_agg_temp_query text;
BEGIN

    _stg_sync_agg_temp_query = format(
        'DROP TABLE IF EXISTS price_markdown_opt_temp.syn_agg_temp8_%1$s_%2$s_%5$s;

		CREATE UNLOGGED TABLE price_markdown_opt_temp.syn_agg_temp8_%1$s_%2$s_%5$s AS
        WITH base AS (
                SELECT strategy_id, currency_id, product_level_id, store_level_id,
                       pcd_id, recommendation_date, recommended_offer_percentage, channel_info, previous_markdown_percentage,
                       SUM(sales_units) AS sales_units, SUM(revenue) AS revenue, SUM(margin) AS margin,
                       SUM(rem_inv) AS rem_inv, SUM(spend) AS spend,
                       CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
                            ELSE AVG(effective_price_point)
                       END AS selling_price,
                       SUM(sales_units_uncapped) AS sales_units_uncapped,
                       SUM(revenue_with_vat) AS revenue_with_vat,
                       SUM(margin_with_vat) AS margin_with_vat,
                       SUM(spend_with_vat) AS spend_with_vat,
                       CASE WHEN SUM(sales_units) > 0 THEN (SUM(effective_price_point_with_vat * sales_units) / SUM(sales_units))
                            ELSE AVG(effective_price_point_with_vat)
                       END AS selling_price_with_vat
                FROM price_markdown_opt_temp.%4$s
                GROUP BY 1,2,3,4,5,6,7,8,9
           
        )
        SELECT strategy_id,
               product_level_id,
               store_level_id,
               recommendation_date,
               recommended_offer_percentage,
               ROUND(CAST(selling_price AS numeric), 2) AS effective_price_point,
               pcd_id,
               sales_units,
               margin,
               revenue,
               current_timestamp AS created_at,
               current_timestamp AS updated_at,
               rem_inv,
               spend,
               sales_units_uncapped, channel_info, previous_markdown_percentage,
               currency_id,
               ROUND(CAST(selling_price_with_vat AS numeric), 2) AS effective_price_point_with_vat,
               margin_with_vat,
               revenue_with_vat,
               spend_with_vat
        FROM base;',
        _strategy_id, _version, _discount_ref, _ref_temp_ssd, _currency_type
    );
   raise notice '_stg_sync_agg_temp_query: %', _stg_sync_agg_temp_query;
  execute _stg_sync_agg_temp_query;
END;
$procedure$
;