--liquibase formatted sql
--changeset liquibase:keerthana.reddy@impactanalytics.com: pc_actualization_get_actuals_stg_item_lw_ltd_02062025 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_actualization_get_actuals_stg_item_lw_ltd

DROP PROCEDURE IF EXISTS price_markdown_opt.pc_actualization_get_actuals_stg_item_lw_ltd(IN _temp_item_actuals text, IN _actuals_ssd text, IN _actuals_stg_item_lw_ltd text, IN _product_master text, IN _strategy_id integer, IN _lw_start_date date, IN _txn_max_date date, IN _actuals_max_date date);

CREATE OR REPLACE PROCEDURE price_markdown_opt.pc_actualization_get_actuals_stg_item_lw_ltd(IN _temp_item_actuals text, IN _actuals_ssd text, IN _actuals_stg_item_lw_ltd text, IN _product_master text, IN _strategy_id integer, IN _lw_start_date date, IN _txn_max_date date, IN _actuals_max_date date)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
	_get_actuals_stg_item_lw_ltd_query text;
BEGIN
    -- Drop the existing temp_item_actuals table if it exists
    _get_actuals_stg_item_lw_ltd_query = format('DROP TABLE IF EXISTS %1$s;

        CREATE TABLE IF NOT EXISTS %1$s AS (
            WITH base_actual_lw_data AS (
                SELECT strategy_id, product_id,currency_id,
                    SUM(sales_units) lw_sales_units,
                    SUM(revenue) lw_revenue,
                    SUM(margin) lw_gm_dollar,
                    SUM(spend) lw_markdown_dollar,
                    CASE WHEN SUM(sales_units) > 0
                         THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
                         ELSE AVG(effective_price_point)
                    END AS lw_effective_price_point,
                    CASE WHEN SUM(sales_units) > 0
                         THEN (SUM(recommended_offer_percentage * sales_units) / SUM(sales_units))
                         ELSE AVG(recommended_offer_percentage)
                    END AS lw_recommended_offer_percentage,
                    AVG(recommended_offer_percentage) AS lw_clearance_discount,
                    COALESCE(ROUND(CAST((SUM(margin) / NULLIF(SUM(revenue), 0)) * 100 AS NUMERIC), 2), 0) AS lw_gm_percent,
                    COALESCE(ROUND(CAST(SUM(revenue) / NULLIF(SUM(sales_units), 0) AS NUMERIC), 2), 0) AS lw_aur,
                    COALESCE(ROUND(CAST(SUM(margin) / NULLIF(SUM(sales_units), 0) AS NUMERIC), 2), 0) AS lw_aum,
                    SUM(revenue_with_vat) lw_revenue_with_vat,
                    SUM(margin_with_vat) lw_gm_dollar_with_vat,
                    SUM(spend_with_vat) lw_markdown_dollar_with_vat,
                    CASE WHEN SUM(sales_units) > 0
                         THEN (SUM(effective_price_point_with_vat * sales_units) / SUM(sales_units))
                         ELSE AVG(effective_price_point_with_vat)
                    END AS lw_effective_price_point_with_vat,
                    COALESCE(ROUND(CAST((SUM(revenue_with_vat) / NULLIF(SUM(sales_units), 0)) * 100 AS NUMERIC), 2), 0) AS lw_aur_with_vat,
                    COALESCE(ROUND(CAST((SUM(margin_with_vat) / NULLIF(SUM(sales_units), 0)) * 100 AS NUMERIC), 2), 0) AS lw_aum_with_vat
                FROM %2$s
                WHERE recommendation_date BETWEEN ''%3$s'' AND ''%4$s''
                GROUP BY 1, 2, 3
            ),

            inv_lw_data AS (
                SELECT strategy_id, product_id, SUM(rem_inv) rem_inv
                FROM %2$s
                WHERE recommendation_date = ''%4$s''
                GROUP BY 1, 2
            ),

            actual_lw_data AS (
                SELECT x1.*,
                       COALESCE(lw_sales_units, 0) + COALESCE(rem_inv, 0) AS lw_inventory,
                       ROUND(CAST((lw_sales_units / NULLIF((lw_sales_units + rem_inv), 0)) * 100 AS NUMERIC), 2) AS lw_st_percent
                FROM base_actual_lw_data x1
                LEFT JOIN inv_lw_data x2 USING(strategy_id, product_id)
            ),

            base_actual_ltd_data AS (
                SELECT strategy_id, product_id, till_date_recommended_offer_percentage,
                    till_date_clearance_discount, till_date_effective_price_point, till_date_sales_units,
                    till_date_revenue, till_date_gm_dollar, till_date_gm_percent, till_date_aur,
                    till_date_aum, till_date_markdown_dollar,
                    currency_id, till_date_effective_price_point_with_vat, till_date_revenue_with_vat,
                    till_date_gm_dollar_with_vat, till_date_aur_with_vat, till_date_aum_with_vat,
                    till_date_markdown_dollar_with_vat
                FROM %5$s
                WHERE strategy_id = %6$s
            ),

            txn_ltd_data AS (
                SELECT strategy_id, product_id, currency_id,
                    CASE WHEN SUM(sales_units) > 0
                         THEN (SUM(recommended_offer_percentage * sales_units) / SUM(sales_units))
                         ELSE AVG(recommended_offer_percentage)
                    END AS till_date_recommended_offer_percentage,
                    AVG(recommended_offer_percentage) AS till_date_clearance_discount,
                    CASE WHEN SUM(sales_units) > 0
                         THEN (SUM(effective_price_point * sales_units) / SUM(sales_units))
                         ELSE AVG(effective_price_point)
                    END AS till_date_effective_price_point,
                    SUM(sales_units) AS till_date_sales_units,
                    SUM(revenue) AS till_date_revenue,
                    SUM(margin) AS till_date_gm_dollar,
                    COALESCE(ROUND(CAST((SUM(margin) / NULLIF(SUM(revenue), 0)) * 100 AS NUMERIC), 2), 0) AS till_date_gm_percent,
                    COALESCE(ROUND(CAST(SUM(revenue) / NULLIF(SUM(sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aur,
                    COALESCE(ROUND(CAST(SUM(margin) / NULLIF(SUM(sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aum,
                    SUM(spend) AS till_date_markdown_dollar,
                    CASE WHEN SUM(sales_units) > 0
                         THEN (SUM(effective_price_point_with_vat * sales_units) / SUM(sales_units))
                         ELSE AVG(effective_price_point_with_vat)
                    END AS till_date_effective_price_point_with_vat,
                    SUM(revenue_with_vat) AS till_date_revenue_with_vat,
                    SUM(margin_with_vat) AS till_date_gm_dollar_with_vat,
                    COALESCE(ROUND(CAST(SUM(revenue_with_vat) / NULLIF(SUM(sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aur_with_vat,
                    COALESCE(ROUND(CAST(SUM(margin_with_vat) / NULLIF(SUM(sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aum_with_vat,
                    SUM(spend_with_vat) AS till_date_markdown_dollar_with_vat
                FROM %2$s
                WHERE recommendation_date BETWEEN ''%7$s'' AND ''%4$s''
                GROUP BY 1, 2, 3
            ),

            actual_ltd_data AS (
                SELECT x1.strategy_id, x1.product_id, x1.currency_id, x1.till_date_recommended_offer_percentage,
                    x1.till_date_clearance_discount, x1.till_date_effective_price_point, x1.till_date_sales_units,
                    x1.till_date_revenue, x1.till_date_gm_dollar, x1.till_date_gm_percent, x1.till_date_aur,
                    x1.till_date_aum,
                    ROUND(CAST((x1.till_date_sales_units / NULLIF((x1.till_date_sales_units + x2.rem_inv), 0)) * 100 AS NUMERIC), 2) AS till_date_st_percent,
                    COALESCE(x1.till_date_sales_units, 0) + COALESCE(x2.rem_inv, 0) AS till_date_inventory,
                    x1.till_date_markdown_dollar,
                    x1.till_date_effective_price_point_with_vat,
                    x1.till_date_revenue_with_vat,
                    x1.till_date_gm_dollar_with_vat,
                    x1.till_date_aur_with_vat,
                    x1.till_date_aum_with_vat,
                    x1.till_date_markdown_dollar_with_vat
                FROM (
                    SELECT strategy_id, product_id, currency_id,
                        CASE WHEN SUM(till_date_sales_units) > 0
                             THEN (SUM(till_date_recommended_offer_percentage * till_date_sales_units) / SUM(till_date_sales_units))
                             ELSE AVG(till_date_recommended_offer_percentage)
                        END AS till_date_recommended_offer_percentage,
                        AVG(till_date_recommended_offer_percentage) AS till_date_clearance_discount,
                        CASE WHEN SUM(till_date_sales_units) > 0
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
                        CASE WHEN SUM(till_date_sales_units) > 0
                             THEN (SUM(till_date_effective_price_point_with_vat * till_date_sales_units) / SUM(till_date_sales_units))
                             ELSE AVG(till_date_effective_price_point_with_vat)
                        END AS till_date_effective_price_point_with_vat,
                        SUM(till_date_revenue_with_vat) AS till_date_revenue_with_vat,
                        SUM(till_date_gm_dollar_with_vat) AS till_date_gm_dollar_with_vat,
                        COALESCE(ROUND(CAST(SUM(till_date_revenue_with_vat) / NULLIF(SUM(till_date_sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aur_with_vat,
                        COALESCE(ROUND(CAST(SUM(till_date_gm_dollar_with_vat) / NULLIF(SUM(till_date_sales_units), 0) AS NUMERIC), 2), 0) AS till_date_aum_with_vat,
                        SUM(till_date_markdown_dollar_with_vat) AS till_date_markdown_dollar_with_vat
                    FROM (
                        SELECT * FROM base_actual_ltd_data
                        UNION ALL
                        SELECT * FROM txn_ltd_data
                    ) tab
                    GROUP BY 1, 2, 3
                ) x1
                LEFT JOIN inv_lw_data x2 USING(strategy_id, product_id)
            ),

            final_op AS (
                SELECT c1.strategy_id, c1.product_id, c1.currency_id,
                    c1.lw_recommended_offer_percentage,
                    c1.lw_clearance_discount, c1.lw_effective_price_point, c1.lw_sales_units,
                    c1.lw_revenue, c1.lw_gm_dollar, c1.lw_gm_percent, c1.lw_aur,
                    c1.lw_aum, c1.lw_st_percent, c1.lw_inventory, c1.lw_markdown_dollar,
                    c2.till_date_recommended_offer_percentage,
                    c2.till_date_clearance_discount, c2.till_date_effective_price_point, c2.till_date_sales_units,
                    c2.till_date_revenue, c2.till_date_gm_dollar, c2.till_date_gm_percent, c2.till_date_aur,
                    c2.till_date_aum, c2.till_date_st_percent, c2.till_date_inventory, c2.till_date_markdown_dollar,
                    c1.lw_inventory * c1.lw_effective_price_point AS lw_inventory_retail,
                    c1.lw_inventory * pm.cost AS lw_inventory_cost,
                    c2.till_date_inventory * c2.till_date_effective_price_point AS till_date_inventory_retail,
                    c2.till_date_inventory * pm.cost AS till_date_inventory_cost,
                    c1.lw_effective_price_point_with_vat,
                    c1.lw_revenue_with_vat,
                    c1.lw_gm_dollar_with_vat,
                    c1.lw_aur_with_vat,
                    c1.lw_aum_with_vat,
                    c1.lw_markdown_dollar_with_vat,
                    c2.till_date_effective_price_point_with_vat,
                    c2.till_date_revenue_with_vat,
                    c2.till_date_gm_dollar_with_vat,
                    c2.till_date_aur_with_vat,
                    c2.till_date_aum_with_vat,
                    c2.till_date_markdown_dollar_with_vat,
                    c1.lw_inventory * c1.lw_effective_price_point_with_vat AS lw_inventory_retail_with_vat,
                    c2.till_date_inventory * c2.till_date_effective_price_point_with_vat AS till_date_inventory_retail_with_vat
                FROM actual_ltd_data c2
                LEFT JOIN actual_lw_data c1
                    ON c1.strategy_id = c2.strategy_id
                    AND c1.product_id = c2.product_id
                LEFT JOIN %8$s pm
                    ON c1.product_id = pm.product_id
            )

            SELECT
                strategy_id,
                product_id,
                currency_id,
                ROUND(lw_recommended_offer_percentage::numeric, 2) AS lw_recommended_offer_percentage,
                ROUND(lw_clearance_discount::numeric, 2) AS lw_clearance_discount,
                ROUND(lw_effective_price_point::numeric, 2) AS lw_effective_price_point,
                ROUND(lw_sales_units::numeric, 0) AS lw_sales_units,
                ROUND(lw_revenue::numeric, 2) AS lw_revenue,
                ROUND(lw_gm_dollar::numeric, 2) AS lw_gm_dollar,
                ROUND(lw_gm_percent::numeric, 2) AS lw_gm_percent,
                ROUND(lw_aur::numeric, 2) AS lw_aur,
                ROUND(lw_aum::numeric, 2) AS lw_aum,
                ROUND(lw_st_percent::numeric, 2) AS lw_st_percent,
                ROUND(lw_inventory::numeric, 0) AS lw_inventory,
                ROUND(lw_markdown_dollar::numeric, 2) AS lw_markdown_dollar,
                ROUND(till_date_recommended_offer_percentage::numeric, 2) AS till_date_recommended_offer_percentage,
                ROUND(till_date_clearance_discount::numeric, 2) AS till_date_clearance_discount,
                ROUND(till_date_effective_price_point::numeric, 2) AS till_date_effective_price_point,
                ROUND(till_date_sales_units::numeric, 0) AS till_date_sales_units,
                ROUND(till_date_revenue::numeric, 2) AS till_date_revenue,
                ROUND(till_date_gm_dollar::numeric, 2) AS till_date_gm_dollar,
                ROUND(till_date_gm_percent::numeric, 2) AS till_date_gm_percent,
                ROUND(till_date_aur::numeric, 2) AS till_date_aur,
                ROUND(till_date_aum::numeric, 2) AS till_date_aum,
                ROUND(till_date_st_percent::numeric, 2) AS till_date_st_percent,
                ROUND(till_date_inventory::numeric, 0) AS till_date_inventory,
                ROUND(till_date_markdown_dollar::numeric, 2) AS till_date_markdown_dollar,
                ROUND(lw_inventory_cost::numeric, 2) AS lw_inventory_cost,
                ROUND(lw_inventory_retail::numeric, 2) AS lw_inventory_retail,
                ROUND(till_date_inventory_cost::numeric, 2) AS till_date_inventory_cost,
                ROUND(till_date_inventory_retail::numeric, 2) AS till_date_inventory_retail,
                ROUND(lw_effective_price_point_with_vat::numeric, 2) AS lw_effective_price_point_with_vat,
                ROUND(lw_revenue_with_vat::numeric, 2) AS lw_revenue_with_vat,
                ROUND(lw_gm_dollar_with_vat::numeric, 2) AS lw_gm_dollar_with_vat,
                ROUND(lw_aur_with_vat::numeric, 2) AS lw_aur_with_vat,
                ROUND(lw_aum_with_vat::numeric, 2) AS lw_aum_with_vat,
                ROUND(lw_markdown_dollar_with_vat::numeric, 2) AS lw_markdown_dollar_with_vat,
                ROUND(till_date_effective_price_point_with_vat::numeric, 2) AS till_date_effective_price_point_with_vat,
                ROUND(till_date_revenue_with_vat::numeric, 2) AS till_date_revenue_with_vat,
                ROUND(till_date_gm_dollar_with_vat::numeric, 2) AS till_date_gm_dollar_with_vat,
                ROUND(till_date_aur_with_vat::numeric, 2) AS till_date_aur_with_vat,
                ROUND(till_date_aum_with_vat::numeric, 2) AS till_date_aum_with_vat,
                ROUND(till_date_markdown_dollar_with_vat::numeric, 2) AS till_date_markdown_dollar_with_vat,
                ROUND(lw_inventory_retail_with_vat::numeric, 2) AS lw_inventory_retail_with_vat,
                ROUND(till_date_inventory_retail_with_vat::numeric, 2) AS till_date_inventory_retail_with_vat                
            FROM final_op
        );',
        _temp_item_actuals, _actuals_ssd, _lw_start_date, _txn_max_date, _actuals_stg_item_lw_ltd, _strategy_id,
        _actuals_max_date, _product_master);
        raise notice '_get_actuals_stg_item_lw_ltd_query : %', _get_actuals_stg_item_lw_ltd_query;
        execute _get_actuals_stg_item_lw_ltd_query;
END;
$procedure$
;
