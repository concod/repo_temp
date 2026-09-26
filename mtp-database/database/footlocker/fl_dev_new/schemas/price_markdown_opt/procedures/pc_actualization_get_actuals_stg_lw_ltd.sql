--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com: pc_actualization_get_actuals_stg_lw_ltd_04062025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_actualization_get_actuals_stg_lw_ltd

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_actualization_get_actuals_stg_lw_ltd(IN _tb_temp_actuals text, IN _tb_temp_item_actuals_ text, IN _strategy_id integer);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_actualization_get_actuals_stg_lw_ltd(IN _tb_temp_actuals text, IN _tb_temp_item_actuals_ text, IN _strategy_id integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_get_actuals_stg_lw_ltd_query text;
BEGIN

    _get_actuals_stg_lw_ltd_query = format('DROP TABLE IF EXISTS %1$s;

			CREATE TABLE IF NOT EXISTS %1$s AS (
            WITH base AS (
                SELECT
                    strategy_id,
                    currency_id,
                    CASE
                        WHEN SUM(lw_sales_units) > 0
                        THEN (SUM(lw_recommended_offer_percentage * lw_sales_units) / SUM(lw_sales_units))
                        ELSE AVG(lw_recommended_offer_percentage)
                    END AS lw_recommended_offer_percentage,
                    AVG(lw_recommended_offer_percentage) AS lw_clearance_discount,
                    CASE
                        WHEN SUM(lw_sales_units) > 0
                        THEN (SUM(lw_effective_price_point * lw_sales_units) / SUM(lw_sales_units))
                        ELSE AVG(lw_effective_price_point)
                    END AS lw_effective_price_point,
                    SUM(lw_sales_units) AS lw_sales_units,
                    SUM(lw_revenue) AS lw_revenue,
                    SUM(lw_gm_dollar) AS lw_gm_dollar,
                    COALESCE(ROUND(CAST((SUM(lw_gm_dollar) / NULLIF(SUM(lw_revenue), 0)) * 100 AS NUMERIC), 2), 0) AS lw_gm_percent,
                    COALESCE(ROUND(CAST(SUM(lw_revenue) / NULLIF(SUM(lw_sales_units), 0) AS NUMERIC), 2), 0) AS lw_aur,
                    COALESCE(ROUND(CAST(SUM(lw_gm_dollar) / NULLIF(SUM(lw_sales_units), 0) AS NUMERIC), 2), 0) AS lw_aum,
                    SUM(lw_markdown_dollar) AS lw_markdown_dollar,
                    100 * SUM(lw_sales_units) / NULLIF((SUM(lw_sales_units) + SUM(lw_inventory)), 0) AS lw_st_percent,
                    SUM(lw_inventory) AS lw_inventory,
                    CASE
                        WHEN SUM(till_date_sales_units) > 0
                        THEN (SUM(till_date_recommended_offer_percentage * till_date_sales_units) / SUM(till_date_sales_units))
                        ELSE AVG(till_date_recommended_offer_percentage)
                    END AS till_date_recommended_offer_percentage,
                    AVG(till_date_recommended_offer_percentage) AS till_date_clearance_discount,
                    CASE
                        WHEN SUM(till_date_sales_units) > 0
                        THEN (SUM(till_date_effective_price_point * till_date_sales_units) / SUM(till_date_sales_units))
                        ELSE AVG(till_date_effective_price_point)
                    END AS till_date_effective_price_point,
                    SUM(till_date_sales_units) AS till_date_sales_units,
                    SUM(till_date_revenue) AS till_date_revenue,
                    SUM(till_date_gm_dollar) AS till_date_gm_dollar,
                    COALESCE(ROUND(CAST((SUM(till_date_gm_dollar) / NULLIF(SUM(till_date_revenue), 0)) * 100 AS NUMERIC), 2), 0) AS till_date_gm_percent,
                    COALESCE(ROUND(CAST(SUM(till_date_revenue) / NULLIF(SUM(till_date_sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aur,
                    COALESCE(ROUND(CAST(SUM(till_date_gm_dollar) / NULLIF(SUM(till_date_sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aum,
                    SUM(till_date_markdown_dollar) AS till_date_markdown_dollar,
                    100 * SUM(till_date_sales_units) / NULLIF((SUM(till_date_sales_units) + SUM(till_date_inventory)), 0) AS till_date_st_percent,
                    SUM(till_date_inventory) AS till_date_inventory,
                    SUM(lw_inventory_cost) AS lw_inventory_cost,
                    SUM(lw_inventory_retail) AS lw_inventory_retail,
                    SUM(till_date_inventory_cost) AS till_date_inventory_cost,
                    SUM(till_date_inventory_retail) AS till_date_inventory_retail,
                    CASE
                        WHEN SUM(lw_sales_units) > 0
                        THEN (SUM(lw_effective_price_point_with_vat * lw_sales_units) / SUM(lw_sales_units))
                        ELSE AVG(lw_effective_price_point_with_vat)
                    END AS lw_effective_price_point_with_vat,
                    SUM(lw_revenue_with_vat) AS lw_revenue_with_vat,
                    SUM(lw_gm_dollar_with_vat) AS lw_gm_dollar_with_vat,
                    COALESCE(ROUND(CAST((SUM(lw_gm_dollar_with_vat) / NULLIF(SUM(lw_revenue_with_vat), 0)) * 100 AS NUMERIC), 2), 0) AS lw_gm_percent_with_vat,
                    COALESCE(ROUND(CAST(SUM(lw_revenue_with_vat) / NULLIF(SUM(lw_sales_units), 0) AS NUMERIC), 2), 0) AS lw_aur_with_vat,
                    COALESCE(ROUND(CAST(SUM(lw_gm_dollar_with_vat) / NULLIF(SUM(lw_sales_units), 0) AS NUMERIC), 2), 0) AS lw_aum_with_vat,
                    SUM(lw_markdown_dollar_with_vat) AS lw_markdown_dollar_with_vat,
                    SUM(lw_inventory_retail_with_vat) AS lw_inventory_retail_with_vat,
                    CASE
                        WHEN SUM(till_date_sales_units) > 0
                        THEN (SUM(till_date_effective_price_point_with_vat * till_date_sales_units) / SUM(till_date_sales_units))
                        ELSE AVG(till_date_effective_price_point_with_vat)
                    END AS till_date_effective_price_point_with_vat,
                    SUM(till_date_revenue_with_vat) AS till_date_revenue_with_vat,
                    SUM(till_date_gm_dollar_with_vat) AS till_date_gm_dollar_with_vat,
                    COALESCE(ROUND(CAST((SUM(till_date_gm_dollar_with_vat) / NULLIF(SUM(till_date_revenue_with_vat), 0)) * 100 AS NUMERIC), 2), 0) AS till_date_gm_percent_with_vat,
                    COALESCE(ROUND(CAST(SUM(till_date_revenue_with_vat) / NULLIF(SUM(till_date_sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aur_with_vat,
                    COALESCE(ROUND(CAST(SUM(till_date_gm_dollar_with_vat) / NULLIF(SUM(till_date_sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aum_with_vat,
                    SUM(till_date_markdown_dollar_with_vat) AS till_date_markdown_dollar_with_vat,
                    SUM(till_date_inventory_retail_with_vat) AS till_date_inventory_retail_with_vat
                FROM %2$s
                WHERE strategy_id = %3$s
                GROUP BY
                    strategy_id, currency_id
            )
            SELECT
                strategy_id,
                currency_id,
                ROUND(lw_recommended_offer_percentage::NUMERIC, 2) AS lw_recommended_offer_percentage,
                ROUND(lw_clearance_discount::NUMERIC, 2) AS lw_clearance_discount,
                ROUND(lw_effective_price_point::NUMERIC, 2) AS lw_effective_price_point,
                ROUND(lw_sales_units::NUMERIC, 0) AS lw_sales_units,
                ROUND(lw_revenue::NUMERIC, 2) AS lw_revenue,
                ROUND(lw_gm_dollar::NUMERIC, 2) AS lw_gm_dollar,
                ROUND(lw_gm_percent::NUMERIC, 2) AS lw_gm_percent,
                ROUND(lw_aur::NUMERIC, 2) AS lw_aur,
                ROUND(lw_aum::NUMERIC, 2) AS lw_aum,
                ROUND(lw_st_percent::NUMERIC, 2) AS lw_st_percent,
                ROUND(lw_inventory::NUMERIC, 0) AS lw_inventory,
                ROUND(lw_markdown_dollar::NUMERIC, 2) AS lw_markdown_dollar,
                ROUND(till_date_recommended_offer_percentage::NUMERIC, 2) AS till_date_recommended_offer_percentage,
                ROUND(till_date_clearance_discount::NUMERIC, 2) AS till_date_clearance_discount,
                ROUND(till_date_effective_price_point::NUMERIC, 2) AS till_date_effective_price_point,
                ROUND(till_date_sales_units::NUMERIC, 0) AS till_date_sales_units,
                ROUND(till_date_revenue::NUMERIC, 2) AS till_date_revenue,
                ROUND(till_date_gm_dollar::NUMERIC, 2) AS till_date_gm_dollar,
                ROUND(till_date_gm_percent::NUMERIC, 2) AS till_date_gm_percent,
                ROUND(till_date_aur::NUMERIC, 2) AS till_date_aur,
                ROUND(till_date_aum::NUMERIC, 2) AS till_date_aum,
                ROUND(till_date_st_percent::NUMERIC, 2) AS till_date_st_percent,
                ROUND(till_date_inventory::NUMERIC, 2) AS till_date_inventory,
                ROUND(till_date_markdown_dollar::NUMERIC, 2) AS till_date_markdown_dollar,
                ROUND(lw_inventory_cost::NUMERIC, 2) AS lw_inventory_cost,
                ROUND(lw_inventory_retail::NUMERIC, 2) AS lw_inventory_retail,
                ROUND(till_date_inventory_cost::NUMERIC, 2) AS till_date_inventory_cost,
                ROUND(till_date_inventory_retail::NUMERIC, 2) AS till_date_inventory_retail,
                ROUND(lw_effective_price_point_with_vat::NUMERIC, 2) AS lw_effective_price_point_with_vat,
                ROUND(lw_revenue_with_vat::NUMERIC, 2) AS lw_revenue_with_vat,
                ROUND(lw_gm_dollar_with_vat::NUMERIC, 2) AS lw_gm_dollar_with_vat,
                ROUND(lw_aur_with_vat::NUMERIC, 2) AS lw_aur_with_vat,
                ROUND(lw_aum_with_vat::NUMERIC, 2) AS lw_aum_with_vat,
                ROUND(lw_markdown_dollar_with_vat::NUMERIC, 2) AS lw_markdown_dollar_with_vat,
                ROUND(lw_inventory_retail_with_vat::NUMERIC, 2) AS lw_inventory_retail_with_vat,
                ROUND(till_date_effective_price_point_with_vat::NUMERIC, 2) AS till_date_effective_price_point_with_vat,
                ROUND(till_date_revenue_with_vat::NUMERIC, 2) AS till_date_revenue_with_vat,
                ROUND(till_date_gm_dollar_with_vat::NUMERIC, 2) AS till_date_gm_dollar_with_vat,
                ROUND(till_date_aur_with_vat::NUMERIC, 2) AS till_date_aur_with_vat,
                ROUND(till_date_aum_with_vat::NUMERIC, 2) AS till_date_aum_with_vat,
                ROUND(till_date_markdown_dollar_with_vat::NUMERIC, 2) AS till_date_markdown_dollar_with_vat,
                ROUND(till_date_inventory_retail_with_vat::NUMERIC, 2) AS till_date_inventory_retail_with_vat
            FROM
                base
        );
    ', _tb_temp_actuals, _tb_temp_item_actuals_, _strategy_id);
	raise notice '_get_actuals_stg_lw_ltd_query : %', _get_actuals_stg_lw_ltd_query;
	execute _get_actuals_stg_lw_ltd_query;
END;
$procedure$
;
