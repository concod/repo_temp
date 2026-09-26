--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_get_detailed_simulation_results_base_query_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Stacking changes


DROP FUNCTION IF EXISTS price_promo.fn_get_detailed_simulation_results_base_query;

CREATE OR REPLACE FUNCTION price_promo.fn_get_detailed_simulation_results_base_query(_promo_id integer, _hierarchy_level integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _scenario_ids TEXT;
    _selected_product_id_column TEXT;
    _selected_product_name_column TEXT;
    final_query TEXT;
BEGIN
    -- Determine the column to use based on the hierarchy level
    CASE _hierarchy_level
        WHEN 0 THEN
            _selected_product_id_column := 'l0_id';
            _selected_product_name_column := 'l0_cuq';
        WHEN 1 THEN
            _selected_product_id_column := 'l1_id';
            _selected_product_name_column := 'l1_cuq';
        WHEN 2 THEN
            _selected_product_id_column := 'l2_id';
            _selected_product_name_column := 'l2_cuq';
        WHEN 3 THEN
            _selected_product_id_column := 'l3_id';
            _selected_product_name_column := 'l3_cuq';
        WHEN 4 THEN
            _selected_product_id_column := 'l4_id';
            _selected_product_name_column := 'l4_cuq';
        WHEN 5 THEN 
        	_selected_product_id_column := 'l5_id';
            _selected_product_name_column := 'l5_cuq';
        WHEN -1 THEN
            _selected_product_id_column := 'brand';
            _selected_product_name_column := 'brand';
    END CASE;

    SELECT string_agg(scenario_id::TEXT, ',')
    INTO _scenario_ids
    FROM price_promo.scenario_master sm
    WHERE sm.promo_id = _promo_id;

    -- Build the final query
    final_query := format(
        'DROP TABLE IF EXISTS temp_scenario_results;
        DROP TABLE IF EXISTS temp_ia_reccommend_results;
        DROP TABLE IF EXISTS temp_override_scenario_results;
        DROP TABLE IF EXISTS temp_override_ia_reccommend_results;
		DROP TABLE IF EXISTS temp_stacked_scenario_results;
		DROP TABLE IF EXISTS temp_stacked_override_scenario_results;
		DROP TABLE IF EXISTS temp_stacked_ia_reccommend_results;
		DROP TABLE IF EXISTS temp_stacked_override_ia_reccommend_results;

        CREATE TEMPORARY TABLE temp_scenario_results AS
        SELECT
            sc.promo_id,
            sc.scenario_id,
            sm.scenario_order_id,
            sm.scenario_name,
            sc.product_id,
            tpof.is_default,
            sum(sc.sales_units) as sales_units,
            sum(sc.baseline_sales_units) as baseline_sales_units,
            sum(sc.incremental_sales_units) as incremental_sales_units,
            sum(sc.revenue) as revenue,
            sum(sc.baseline_revenue) as baseline_revenue,
            sum(sc.incremental_revenue) as incremental_revenue,
            sum(sc.affinity_revenue) as affinity_revenue,
            sum(sc.cannibalization_revenue) as cannibalization_revenue,
            sum(sc.pull_forward_revenue) as pull_forward_revenue,
            sum(sc.margin) as margin,
            sum(sc.baseline_margin) as baseline_margin,
            sum(sc.incremental_margin) as incremental_margin,
            sum(sc.affinity_margin) as affinity_margin,
            sum(sc.cannibalization_margin) as cannibalization_margin,
            sum(sc.pull_forward_margin) as pull_forward_margin,
            sum(sc.promo_spend) as promo_spend
        FROM
            price_promo.ps_recommended_scenarios sc
            LEFT JOIN price_promo.scenario_master sm
            ON sc.promo_id = sm.promo_id
            AND sc.scenario_id = sm.scenario_id
            LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON sc.promo_id = tpof.promo_id
            AND sc.scenario_id = tpof.scenario_id
        WHERE
            sc.promo_id = %L
            AND sc.scenario_id IN (%s)
        GROUP BY
            sc.promo_id,
            sc.scenario_id,
            sm.scenario_order_id,
            sm.scenario_name,
            sc.product_id,
            tpof.is_default;


        CREATE TEMPORARY TABLE temp_ia_reccommend_results AS
        SELECT
            iap.promo_id,
            iap.product_id,
            tpof.is_default,
            SUM(iap.sales_units) AS sales_units,
            SUM(iap.baseline_sales_units) AS baseline_sales_units,
            SUM(iap.incremental_sales_units) AS incremental_sales_units,
            SUM(iap.revenue) AS revenue,
            SUM(iap.baseline_revenue) AS baseline_revenue,
            SUM(iap.incremental_revenue) AS incremental_revenue,
            SUM(iap.affinity_revenue) AS affinity_revenue,
            SUM(iap.cannibalization_revenue) AS cannibalization_revenue,
            SUM(iap.pull_forward_revenue) AS pull_forward_revenue,
            SUM(iap.margin) AS margin,
            SUM(iap.baseline_margin) AS baseline_margin,
            SUM(iap.incremental_margin) AS incremental_margin,
            SUM(iap.affinity_margin) AS affinity_margin,
            SUM(iap.cannibalization_margin) AS cannibalization_margin,
            SUM(iap.pull_forward_margin) AS pull_forward_margin,
            SUM(iap.promo_spend) AS promo_spend
        FROM
            price_promo.ps_recommended_ia_projected iap
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON iap.promo_id = tpof.promo_id
            AND tpof.scenario_id = 0
        WHERE
            iap.promo_id = %L
        GROUP BY
            iap.promo_id,
            iap.product_id,
            tpof.is_default;


        CREATE TEMPORARY TABLE temp_override_scenario_results AS
        SELECT
            sc.promo_id,
            sc.scenario_id,
            sm.scenario_order_id,
            sm.scenario_name,
            sc.product_id,
            tpof.is_default,
            sum(sc.sales_units) as sales_units,
            sum(sc.baseline_sales_units) as baseline_sales_units,
            sum(sc.incremental_sales_units) as incremental_sales_units,
            sum(sc.revenue) as revenue,
            sum(sc.baseline_revenue) as baseline_revenue,
            sum(sc.incremental_revenue) as incremental_revenue,
            sum(sc.affinity_revenue) as affinity_revenue,
            sum(sc.cannibalization_revenue) as cannibalization_revenue,
            sum(sc.pull_forward_revenue) as pull_forward_revenue,
            sum(sc.margin) as margin,
            sum(sc.baseline_margin) as baseline_margin,
            sum(sc.incremental_margin) as incremental_margin,
            sum(sc.affinity_margin) as affinity_margin,
            sum(sc.cannibalization_margin) as cannibalization_margin,
            sum(sc.pull_forward_margin) as pull_forward_margin,
            sum(sc.promo_spend) as promo_spend
        FROM
            price_promo.ps_recommended_override sc
        LEFT JOIN price_promo.scenario_master sm
            ON sc.promo_id = sm.promo_id
            AND sc.scenario_id = sm.scenario_id
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON sc.promo_id = tpof.promo_id
            AND sc.scenario_id = tpof.scenario_id
        WHERE
            sc.promo_id = %L
            AND sc.scenario_id IN (%s)
        GROUP BY
            sc.promo_id,
            sc.scenario_id,
            sm.scenario_order_id,
            sm.scenario_name,
            sc.product_id,
            tpof.is_default;


        CREATE TEMPORARY TABLE temp_override_ia_reccommend_results AS
        SELECT
            iap.promo_id,
            iap.product_id,
            tpof.is_default,
            SUM(iap.sales_units) AS sales_units,
            SUM(iap.baseline_sales_units) AS baseline_sales_units,
            SUM(iap.incremental_sales_units) AS incremental_sales_units,
            SUM(iap.revenue) AS revenue,
            SUM(iap.baseline_revenue) AS baseline_revenue,
            SUM(iap.incremental_revenue) AS incremental_revenue,
            SUM(iap.affinity_revenue) AS affinity_revenue,
            SUM(iap.cannibalization_revenue) AS cannibalization_revenue,
            SUM(iap.pull_forward_revenue) AS pull_forward_revenue,
            SUM(iap.margin) AS margin,
            SUM(iap.baseline_margin) AS baseline_margin,
            SUM(iap.incremental_margin) AS incremental_margin,
            SUM(iap.affinity_margin) AS affinity_margin,
            SUM(iap.cannibalization_margin) AS cannibalization_margin,
            SUM(iap.pull_forward_margin) AS pull_forward_margin,
            SUM(iap.promo_spend) AS promo_spend
        FROM
            price_promo.ps_recommended_override_ia iap
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON iap.promo_id = tpof.promo_id
            AND tpof.scenario_id = 0
        WHERE
            iap.promo_id = %L
        GROUP BY
            iap.promo_id,
            iap.product_id,
            tpof.is_default;

		CREATE TEMPORARY TABLE temp_stacked_scenario_results AS
        SELECT
            sc.promo_id,
            sc.scenario_id,
            sm.scenario_order_id,
            sm.scenario_name,
            sc.product_id,
            tpof.is_default,
            sum(sc.sales_units) as sales_units,
            sum(sc.baseline_sales_units) as baseline_sales_units,
            sum(sc.incremental_sales_units) as incremental_sales_units,
            sum(sc.revenue) as revenue,
            sum(sc.baseline_revenue) as baseline_revenue,
            sum(sc.incremental_revenue) as incremental_revenue,
            sum(sc.affinity_revenue) as affinity_revenue,
            sum(sc.cannibalization_revenue) as cannibalization_revenue,
            sum(sc.pull_forward_revenue) as pull_forward_revenue,
            sum(sc.margin) as margin,
            sum(sc.baseline_margin) as baseline_margin,
            sum(sc.incremental_margin) as incremental_margin,
            sum(sc.affinity_margin) as affinity_margin,
            sum(sc.cannibalization_margin) as cannibalization_margin,
            sum(sc.pull_forward_margin) as pull_forward_margin,
            sum(sc.promo_spend) as promo_spend
        FROM
            price_promo.ps_recommended_scenarios_stack sc
            LEFT JOIN price_promo.scenario_master sm
            ON sc.promo_id = sm.promo_id
            AND sc.scenario_id = sm.scenario_id
            LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON sc.promo_id = tpof.promo_id
            AND sc.scenario_id = tpof.scenario_id
        WHERE
            sc.promo_id = %L
            AND sc.scenario_id IN (%s)
        GROUP BY
            sc.promo_id,
            sc.scenario_id,
            sm.scenario_order_id,
            sm.scenario_name,
            sc.product_id,
            tpof.is_default;

		CREATE TEMPORARY TABLE temp_stacked_override_scenario_results AS
        SELECT
            sc.promo_id,
            sc.scenario_id,
            sm.scenario_order_id,
            sm.scenario_name,
            sc.product_id,
            tpof.is_default,
            sum(sc.sales_units) as sales_units,
            sum(sc.baseline_sales_units) as baseline_sales_units,
            sum(sc.incremental_sales_units) as incremental_sales_units,
            sum(sc.revenue) as revenue,
            sum(sc.baseline_revenue) as baseline_revenue,
            sum(sc.incremental_revenue) as incremental_revenue,
            sum(sc.affinity_revenue) as affinity_revenue,
            sum(sc.cannibalization_revenue) as cannibalization_revenue,
            sum(sc.pull_forward_revenue) as pull_forward_revenue,
            sum(sc.margin) as margin,
            sum(sc.baseline_margin) as baseline_margin,
            sum(sc.incremental_margin) as incremental_margin,
            sum(sc.affinity_margin) as affinity_margin,
            sum(sc.cannibalization_margin) as cannibalization_margin,
            sum(sc.pull_forward_margin) as pull_forward_margin,
            sum(sc.promo_spend) as promo_spend
        FROM
            price_promo.ps_recommended_scenarios_stack_override sc
            LEFT JOIN price_promo.scenario_master sm
            ON sc.promo_id = sm.promo_id
            AND sc.scenario_id = sm.scenario_id
            LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON sc.promo_id = tpof.promo_id
            AND sc.scenario_id = tpof.scenario_id
        WHERE
            sc.promo_id = %L
            AND sc.scenario_id IN (%s)
        GROUP BY
            sc.promo_id,
            sc.scenario_id,
            sm.scenario_order_id,
            sm.scenario_name,
            sc.product_id,
            tpof.is_default;

		CREATE TEMPORARY TABLE temp_stacked_ia_reccommend_results AS
        SELECT
            iap.promo_id,
            iap.product_id,
            tpof.is_default,
            SUM(iap.sales_units) AS sales_units,
            SUM(iap.baseline_sales_units) AS baseline_sales_units,
            SUM(iap.incremental_sales_units) AS incremental_sales_units,
            SUM(iap.revenue) AS revenue,
            SUM(iap.baseline_revenue) AS baseline_revenue,
            SUM(iap.incremental_revenue) AS incremental_revenue,
            SUM(iap.affinity_revenue) AS affinity_revenue,
            SUM(iap.cannibalization_revenue) AS cannibalization_revenue,
            SUM(iap.pull_forward_revenue) AS pull_forward_revenue,
            SUM(iap.margin) AS margin,
            SUM(iap.baseline_margin) AS baseline_margin,
            SUM(iap.incremental_margin) AS incremental_margin,
            SUM(iap.affinity_margin) AS affinity_margin,
            SUM(iap.cannibalization_margin) AS cannibalization_margin,
            SUM(iap.pull_forward_margin) AS pull_forward_margin,
            SUM(iap.promo_spend) AS promo_spend
        FROM
            price_promo.ps_recommended_stack_ia iap
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON iap.promo_id = tpof.promo_id
            AND tpof.scenario_id = 0
        WHERE
            iap.promo_id = %L
        GROUP BY
            iap.promo_id,
            iap.product_id,
            tpof.is_default;

		CREATE TEMPORARY TABLE temp_stacked_override_ia_reccommend_results AS
        SELECT
            iap.promo_id,
            iap.product_id,
            tpof.is_default,
            SUM(iap.sales_units) AS sales_units,
            SUM(iap.baseline_sales_units) AS baseline_sales_units,
            SUM(iap.incremental_sales_units) AS incremental_sales_units,
            SUM(iap.revenue) AS revenue,
            SUM(iap.baseline_revenue) AS baseline_revenue,
            SUM(iap.incremental_revenue) AS incremental_revenue,
            SUM(iap.affinity_revenue) AS affinity_revenue,
            SUM(iap.cannibalization_revenue) AS cannibalization_revenue,
            SUM(iap.pull_forward_revenue) AS pull_forward_revenue,
            SUM(iap.margin) AS margin,
            SUM(iap.baseline_margin) AS baseline_margin,
            SUM(iap.incremental_margin) AS incremental_margin,
            SUM(iap.affinity_margin) AS affinity_margin,
            SUM(iap.cannibalization_margin) AS cannibalization_margin,
            SUM(iap.pull_forward_margin) AS pull_forward_margin,
            SUM(iap.promo_spend) AS promo_spend
        FROM
            price_promo.ps_recommended_stack_override_ia iap
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON iap.promo_id = tpof.promo_id
            AND tpof.scenario_id = 0
        WHERE
            iap.promo_id = %L
        GROUP BY
            iap.promo_id,
            iap.product_id,
            tpof.is_default;

        WITH prod_master_cte AS (
            SELECT
                pm.promo_id,
                pm.name AS promo_name,
                pm.recommendation_type_id,
                tasm.name AS recommendation_type,
                pm.last_approved_scenario_id,
                pp.product_id,
                %s AS product_id_column,
                %I AS product_name_column
            FROM
                price_promo.promo_master pm
                LEFT JOIN price_promo.promo_product pp
                ON pm.promo_id = pp.promo_id
                LEFT JOIN price_promo.product_master pdm
                ON pp.product_id = pdm.product_id
                LEFT JOIN metaschema.tb_app_sub_master tasm
                ON pm.recommendation_type_id = tasm.id
            WHERE
                pm.promo_id = %L
        ),
        final_metrics_cte AS (
            SELECT
                tsr.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                ''resimulation'' AS scenario_type,
                tsr.scenario_id,
                tsr.scenario_order_id,
                tsr.scenario_name,
                tsr.is_default,
                pdmc.product_id_column AS product_id,
                pdmc.product_name_column AS product_name,
                ROUND(SUM(tsr.sales_units)::decimal, 2) AS sales_units,
                ROUND(SUM(tsr.baseline_sales_units)::decimal, 2) AS baseline_sales_units,
                ROUND(SUM(tsr.incremental_sales_units)::decimal, 2) AS incremental_sales_units,
                ROUND(SUM(tsr.revenue)::decimal, 2) AS revenue,
                ROUND(SUM(tsr.baseline_revenue)::decimal, 2) AS baseline_revenue,
                ROUND(SUM(tsr.incremental_revenue)::decimal, 2) AS incremental_revenue,
                ROUND(SUM(tsr.affinity_revenue)::decimal, 2) AS affinity_revenue,
                ROUND(SUM(tsr.cannibalization_revenue)::decimal, 2) AS cannibalization_revenue,
                ROUND(SUM(tsr.pull_forward_revenue)::decimal, 2) AS pull_forward_revenue,
                ROUND(SUM(tsr.margin)::decimal, 2) AS margin,
                ROUND(SUM(tsr.baseline_margin)::decimal, 2) AS baseline_margin,
                ROUND(SUM(tsr.incremental_margin)::decimal, 2) AS incremental_margin,
                ROUND(SUM(tsr.affinity_margin)::decimal, 2) AS affinity_margin,
                ROUND(SUM(tsr.cannibalization_margin)::decimal, 2) AS cannibalization_margin,
                ROUND(SUM(tsr.pull_forward_margin)::decimal, 2) AS pull_forward_margin,
                ROUND(SUM(tsr.promo_spend)::decimal, 2) AS promo_spend,
                CASE
                    WHEN SUM(tsr.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tsr.revenue)::decimal, 2) / NULLIF(ROUND(SUM(tsr.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aur,
                CASE
                    WHEN SUM(tsr.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tsr.margin)::decimal, 2) / NULLIF(ROUND(SUM(tsr.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aum,
                CASE
                    WHEN SUM(tsr.revenue) = 0 THEN NULL
                    ELSE ROUND(
                        (SUM(tsr.margin)::decimal * 100) / NULLIF(SUM(tsr.revenue), 0)::decimal,
                        2
                    )
                END as gm_percent
            FROM
                temp_scenario_results tsr
                LEFT JOIN prod_master_cte pdmc
                ON tsr.product_id = pdmc.product_id
            GROUP BY
                tsr.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                tsr.scenario_id,
                tsr.scenario_order_id,
                tsr.scenario_name,
                tsr.is_default,
                pdmc.product_id_column,
                pdmc.product_name_column
            UNION ALL
            SELECT
                tiar.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                ''optimize'' AS scenario_type,
                0 AS scenario_id,
                0 AS scenario_order_id,
                ''IA Recommend'' AS scenario_name,
                tiar.is_default,
                pdmc.product_id_column AS product_id,
                pdmc.product_name_column AS product_name,
                ROUND(SUM(tiar.sales_units)::decimal, 2) AS sales_units,
                ROUND(SUM(tiar.baseline_sales_units)::decimal, 2) AS baseline_sales_units,
                ROUND(SUM(tiar.incremental_sales_units)::decimal, 2) AS incremental_sales_units,
                ROUND(SUM(tiar.revenue)::decimal, 2) AS revenue,
                ROUND(SUM(tiar.baseline_revenue)::decimal, 2) AS baseline_revenue,
                ROUND(SUM(tiar.incremental_revenue)::decimal, 2) AS incremental_revenue,
                ROUND(SUM(tiar.affinity_revenue)::decimal, 2) AS affinity_revenue,
                ROUND(SUM(tiar.cannibalization_revenue)::decimal, 2) AS cannibalization_revenue,
                ROUND(SUM(tiar.pull_forward_revenue)::decimal, 2) AS pull_forward_revenue,
                ROUND(SUM(tiar.margin)::decimal, 2) AS margin,
                ROUND(SUM(tiar.baseline_margin)::decimal, 2) AS baseline_margin,
                ROUND(SUM(tiar.incremental_margin)::decimal, 2) AS incremental_margin,
                ROUND(SUM(tiar.affinity_margin)::decimal, 2) AS affinity_margin,
                ROUND(SUM(tiar.cannibalization_margin)::decimal, 2) AS cannibalization_margin,
                ROUND(SUM(tiar.pull_forward_margin)::decimal, 2) AS pull_forward_margin,
                ROUND(SUM(tiar.promo_spend)::decimal, 2) AS promo_spend,
                CASE
                    WHEN SUM(tiar.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tiar.revenue)::decimal, 2) / NULLIF(ROUND(SUM(tiar.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aur,
                CASE
                    WHEN SUM(tiar.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tiar.margin)::decimal, 2) / NULLIF(ROUND(SUM(tiar.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aum,
                CASE
                    WHEN SUM(tiar.revenue) = 0 THEN NULL
                    ELSE ROUND(
                        (SUM(tiar.margin)::decimal * 100) / NULLIF(SUM(tiar.revenue), 0)::decimal,
                        2
                    )
                END as gm_percent
            FROM
                temp_ia_reccommend_results tiar
                LEFT JOIN prod_master_cte pdmc
                ON tiar.product_id = pdmc.product_id
            GROUP BY
                tiar.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                pdmc.product_id_column,
                pdmc.product_name_column,
                tiar.is_default
            UNION ALL
            SELECT
                tosr.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                ''override_resimulation'' AS scenario_type,
                tosr.scenario_id,
                tosr.scenario_order_id,
                tosr.scenario_name,
                tosr.is_default,
                pdmc.product_id_column AS product_id,
                pdmc.product_name_column AS product_name,
                ROUND(SUM(tosr.sales_units)::decimal, 2) AS sales_units,
                ROUND(SUM(tosr.baseline_sales_units)::decimal, 2) AS baseline_sales_units,
                ROUND(SUM(tosr.incremental_sales_units)::decimal, 2) AS incremental_sales_units,
                ROUND(SUM(tosr.revenue)::decimal, 2) AS revenue,
                ROUND(SUM(tosr.baseline_revenue)::decimal, 2) AS baseline_revenue,
                ROUND(SUM(tosr.incremental_revenue)::decimal, 2) AS incremental_revenue,
                ROUND(SUM(tosr.affinity_revenue)::decimal, 2) AS affinity_revenue,
                ROUND(SUM(tosr.cannibalization_revenue)::decimal, 2) AS cannibalization_revenue,
                ROUND(SUM(tosr.pull_forward_revenue)::decimal, 2) AS pull_forward_revenue,
                ROUND(SUM(tosr.margin)::decimal, 2) AS margin,
                ROUND(SUM(tosr.baseline_margin)::decimal, 2) AS baseline_margin,
                ROUND(SUM(tosr.incremental_margin)::decimal, 2) AS incremental_margin,
                ROUND(SUM(tosr.affinity_margin)::decimal, 2) AS affinity_margin,
                ROUND(SUM(tosr.cannibalization_margin)::decimal, 2) AS cannibalization_margin,
                ROUND(SUM(tosr.pull_forward_margin)::decimal, 2) AS pull_forward_margin,
                ROUND(SUM(tosr.promo_spend)::decimal, 2) AS promo_spend,
                CASE
                    WHEN SUM(tosr.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tosr.revenue)::decimal, 2) / NULLIF(ROUND(SUM(tosr.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aur,
                CASE
                    WHEN SUM(tosr.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tosr.margin)::decimal, 2) / NULLIF(ROUND(SUM(tosr.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aum,
                CASE
                    WHEN SUM(tosr.revenue) = 0 THEN NULL
                    ELSE ROUND(
                        (SUM(tosr.margin)::decimal * 100) / NULLIF(SUM(tosr.revenue), 0)::decimal,
                        2
                    )
                END as gm_percent
            FROM
                temp_override_scenario_results tosr
                LEFT JOIN prod_master_cte pdmc
                ON tosr.product_id = pdmc.product_id
            GROUP BY
                tosr.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                tosr.scenario_id,
                tosr.scenario_order_id,
                tosr.scenario_name,
                tosr.is_default,
                pdmc.product_id_column,
                pdmc.product_name_column
            UNION ALL
            SELECT
                toiar.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                ''override_optimize'' AS scenario_type,
                0 AS scenario_id,
                0 AS scenario_order_id,
                ''Override IA Optimize'' AS scenario_name,
                tpof.is_default,
                pdmc.product_id_column AS product_id,
                pdmc.product_name_column AS product_name,
                ROUND(SUM(toiar.sales_units)::decimal, 2) AS sales_units,
                ROUND(SUM(toiar.baseline_sales_units)::decimal, 2) AS baseline_sales_units,
                ROUND(SUM(toiar.incremental_sales_units)::decimal, 2) AS incremental_sales_units,
                ROUND(SUM(toiar.revenue)::decimal, 2) AS revenue,
                ROUND(SUM(toiar.baseline_revenue)::decimal, 2) AS baseline_revenue,
                ROUND(SUM(toiar.incremental_revenue)::decimal, 2) AS incremental_revenue,
                ROUND(SUM(toiar.affinity_revenue)::decimal, 2) AS affinity_revenue,
                ROUND(SUM(toiar.cannibalization_revenue)::decimal, 2) AS cannibalization_revenue,
                ROUND(SUM(toiar.pull_forward_revenue)::decimal, 2) AS pull_forward_revenue,
                ROUND(SUM(toiar.margin)::decimal, 2) AS margin,
                ROUND(SUM(toiar.baseline_margin)::decimal, 2) AS baseline_margin,
                ROUND(SUM(toiar.incremental_margin)::decimal, 2) AS incremental_margin,
                ROUND(SUM(toiar.affinity_margin)::decimal, 2) AS affinity_margin,
                ROUND(SUM(toiar.cannibalization_margin)::decimal, 2) AS cannibalization_margin,
                ROUND(SUM(toiar.pull_forward_margin)::decimal, 2) AS pull_forward_margin,
                ROUND(SUM(toiar.promo_spend)::decimal, 2) AS promo_spend,
                CASE
                    WHEN SUM(toiar.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(toiar.revenue)::decimal, 2) / NULLIF(ROUND(SUM(toiar.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aur,
                CASE
                    WHEN SUM(toiar.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(toiar.margin)::decimal, 2) / NULLIF(ROUND(SUM(toiar.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aum,
                CASE
                    WHEN SUM(toiar.revenue) = 0 THEN NULL
                    ELSE ROUND(
                        (SUM(toiar.margin)::decimal * 100) / NULLIF(SUM(toiar.revenue), 0)::decimal,
                        2
                    )
                END as gm_percent
            FROM
                temp_override_ia_reccommend_results toiar
                LEFT JOIN prod_master_cte pdmc
                ON toiar.product_id = pdmc.product_id
                LEFT JOIN price_promo.tb_promo_override_forecast tpof
                ON toiar.promo_id = tpof.promo_id
                AND tpof.scenario_id = 0
            GROUP BY
                toiar.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                pdmc.product_id_column,
                pdmc.product_name_column,
                tpof.is_default
			UNION ALL
			SELECT
                tsr.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                ''stacked_resimulation'' AS scenario_type,
                tsr.scenario_id,
                tsr.scenario_order_id,
                tsr.scenario_name,
                tsr.is_default,
                pdmc.product_id_column AS product_id,
                pdmc.product_name_column AS product_name,
                ROUND(SUM(tsr.sales_units)::decimal, 2) AS sales_units,
                ROUND(SUM(tsr.baseline_sales_units)::decimal, 2) AS baseline_sales_units,
                ROUND(SUM(tsr.incremental_sales_units)::decimal, 2) AS incremental_sales_units,
                ROUND(SUM(tsr.revenue)::decimal, 2) AS revenue,
                ROUND(SUM(tsr.baseline_revenue)::decimal, 2) AS baseline_revenue,
                ROUND(SUM(tsr.incremental_revenue)::decimal, 2) AS incremental_revenue,
                ROUND(SUM(tsr.affinity_revenue)::decimal, 2) AS affinity_revenue,
                ROUND(SUM(tsr.cannibalization_revenue)::decimal, 2) AS cannibalization_revenue,
                ROUND(SUM(tsr.pull_forward_revenue)::decimal, 2) AS pull_forward_revenue,
                ROUND(SUM(tsr.margin)::decimal, 2) AS margin,
                ROUND(SUM(tsr.baseline_margin)::decimal, 2) AS baseline_margin,
                ROUND(SUM(tsr.incremental_margin)::decimal, 2) AS incremental_margin,
                ROUND(SUM(tsr.affinity_margin)::decimal, 2) AS affinity_margin,
                ROUND(SUM(tsr.cannibalization_margin)::decimal, 2) AS cannibalization_margin,
                ROUND(SUM(tsr.pull_forward_margin)::decimal, 2) AS pull_forward_margin,
                ROUND(SUM(tsr.promo_spend)::decimal, 2) AS promo_spend,
                CASE
                    WHEN SUM(tsr.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tsr.revenue)::decimal, 2) / NULLIF(ROUND(SUM(tsr.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aur,
                CASE
                    WHEN SUM(tsr.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tsr.margin)::decimal, 2) / NULLIF(ROUND(SUM(tsr.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aum,
                CASE
                    WHEN SUM(tsr.revenue) = 0 THEN NULL
                    ELSE ROUND(
                        (SUM(tsr.margin)::decimal * 100) / NULLIF(SUM(tsr.revenue), 0)::decimal,
                        2
                    )
                END as gm_percent
            FROM
                temp_stacked_scenario_results tsr
                LEFT JOIN prod_master_cte pdmc
                ON tsr.product_id = pdmc.product_id
            GROUP BY
                tsr.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                tsr.scenario_id,
                tsr.scenario_order_id,
                tsr.scenario_name,
                tsr.is_default,
                pdmc.product_id_column,
                pdmc.product_name_column
			UNION ALL
			SELECT
                tiar.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                ''stacked_optimize'' AS scenario_type,
                0 AS scenario_id,
                0 AS scenario_order_id,
                ''IA Recommend'' AS scenario_name,
                tiar.is_default,
                pdmc.product_id_column AS product_id,
                pdmc.product_name_column AS product_name,
                ROUND(SUM(tiar.sales_units)::decimal, 2) AS sales_units,
                ROUND(SUM(tiar.baseline_sales_units)::decimal, 2) AS baseline_sales_units,
                ROUND(SUM(tiar.incremental_sales_units)::decimal, 2) AS incremental_sales_units,
                ROUND(SUM(tiar.revenue)::decimal, 2) AS revenue,
                ROUND(SUM(tiar.baseline_revenue)::decimal, 2) AS baseline_revenue,
                ROUND(SUM(tiar.incremental_revenue)::decimal, 2) AS incremental_revenue,
                ROUND(SUM(tiar.affinity_revenue)::decimal, 2) AS affinity_revenue,
                ROUND(SUM(tiar.cannibalization_revenue)::decimal, 2) AS cannibalization_revenue,
                ROUND(SUM(tiar.pull_forward_revenue)::decimal, 2) AS pull_forward_revenue,
                ROUND(SUM(tiar.margin)::decimal, 2) AS margin,
                ROUND(SUM(tiar.baseline_margin)::decimal, 2) AS baseline_margin,
                ROUND(SUM(tiar.incremental_margin)::decimal, 2) AS incremental_margin,
                ROUND(SUM(tiar.affinity_margin)::decimal, 2) AS affinity_margin,
                ROUND(SUM(tiar.cannibalization_margin)::decimal, 2) AS cannibalization_margin,
                ROUND(SUM(tiar.pull_forward_margin)::decimal, 2) AS pull_forward_margin,
                ROUND(SUM(tiar.promo_spend)::decimal, 2) AS promo_spend,
                CASE
                    WHEN SUM(tiar.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tiar.revenue)::decimal, 2) / NULLIF(ROUND(SUM(tiar.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aur,
                CASE
                    WHEN SUM(tiar.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tiar.margin)::decimal, 2) / NULLIF(ROUND(SUM(tiar.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aum,
                CASE
                    WHEN SUM(tiar.revenue) = 0 THEN NULL
                    ELSE ROUND(
                        (SUM(tiar.margin)::decimal * 100) / NULLIF(SUM(tiar.revenue), 0)::decimal,
                        2
                    )
                END as gm_percent
            FROM
                temp_stacked_ia_reccommend_results tiar
                LEFT JOIN prod_master_cte pdmc
                ON tiar.product_id = pdmc.product_id
            GROUP BY
                tiar.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                pdmc.product_id_column,
                pdmc.product_name_column,
                tiar.is_default
			UNION ALL
			SELECT
                tosr.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                ''stacked_override_resimulation'' AS scenario_type,
                tosr.scenario_id,
                tosr.scenario_order_id,
                tosr.scenario_name,
                tosr.is_default,
                pdmc.product_id_column AS product_id,
                pdmc.product_name_column AS product_name,
                ROUND(SUM(tosr.sales_units)::decimal, 2) AS sales_units,
                ROUND(SUM(tosr.baseline_sales_units)::decimal, 2) AS baseline_sales_units,
                ROUND(SUM(tosr.incremental_sales_units)::decimal, 2) AS incremental_sales_units,
                ROUND(SUM(tosr.revenue)::decimal, 2) AS revenue,
                ROUND(SUM(tosr.baseline_revenue)::decimal, 2) AS baseline_revenue,
                ROUND(SUM(tosr.incremental_revenue)::decimal, 2) AS incremental_revenue,
                ROUND(SUM(tosr.affinity_revenue)::decimal, 2) AS affinity_revenue,
                ROUND(SUM(tosr.cannibalization_revenue)::decimal, 2) AS cannibalization_revenue,
                ROUND(SUM(tosr.pull_forward_revenue)::decimal, 2) AS pull_forward_revenue,
                ROUND(SUM(tosr.margin)::decimal, 2) AS margin,
                ROUND(SUM(tosr.baseline_margin)::decimal, 2) AS baseline_margin,
                ROUND(SUM(tosr.incremental_margin)::decimal, 2) AS incremental_margin,
                ROUND(SUM(tosr.affinity_margin)::decimal, 2) AS affinity_margin,
                ROUND(SUM(tosr.cannibalization_margin)::decimal, 2) AS cannibalization_margin,
                ROUND(SUM(tosr.pull_forward_margin)::decimal, 2) AS pull_forward_margin,
                ROUND(SUM(tosr.promo_spend)::decimal, 2) AS promo_spend,
                CASE
                    WHEN SUM(tosr.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tosr.revenue)::decimal, 2) / NULLIF(ROUND(SUM(tosr.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aur,
                CASE
                    WHEN SUM(tosr.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(tosr.margin)::decimal, 2) / NULLIF(ROUND(SUM(tosr.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aum,
                CASE
                    WHEN SUM(tosr.revenue) = 0 THEN NULL
                    ELSE ROUND(
                        (SUM(tosr.margin)::decimal * 100) / NULLIF(SUM(tosr.revenue), 0)::decimal,
                        2
                    )
                END as gm_percent
            FROM
                temp_stacked_override_scenario_results tosr
                LEFT JOIN prod_master_cte pdmc
                ON tosr.product_id = pdmc.product_id
            GROUP BY
                tosr.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                tosr.scenario_id,
                tosr.scenario_order_id,
                tosr.scenario_name,
                tosr.is_default,
                pdmc.product_id_column,
                pdmc.product_name_column
			UNION ALL
			SELECT
                toiar.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                ''stacked_override_optimize'' AS scenario_type,
                0 AS scenario_id,
                0 AS scenario_order_id,
                ''Override IA Optimize'' AS scenario_name,
                tpof.is_default,
                pdmc.product_id_column AS product_id,
                pdmc.product_name_column AS product_name,
                ROUND(SUM(toiar.sales_units)::decimal, 2) AS sales_units,
                ROUND(SUM(toiar.baseline_sales_units)::decimal, 2) AS baseline_sales_units,
                ROUND(SUM(toiar.incremental_sales_units)::decimal, 2) AS incremental_sales_units,
                ROUND(SUM(toiar.revenue)::decimal, 2) AS revenue,
                ROUND(SUM(toiar.baseline_revenue)::decimal, 2) AS baseline_revenue,
                ROUND(SUM(toiar.incremental_revenue)::decimal, 2) AS incremental_revenue,
                ROUND(SUM(toiar.affinity_revenue)::decimal, 2) AS affinity_revenue,
                ROUND(SUM(toiar.cannibalization_revenue)::decimal, 2) AS cannibalization_revenue,
                ROUND(SUM(toiar.pull_forward_revenue)::decimal, 2) AS pull_forward_revenue,
                ROUND(SUM(toiar.margin)::decimal, 2) AS margin,
                ROUND(SUM(toiar.baseline_margin)::decimal, 2) AS baseline_margin,
                ROUND(SUM(toiar.incremental_margin)::decimal, 2) AS incremental_margin,
                ROUND(SUM(toiar.affinity_margin)::decimal, 2) AS affinity_margin,
                ROUND(SUM(toiar.cannibalization_margin)::decimal, 2) AS cannibalization_margin,
                ROUND(SUM(toiar.pull_forward_margin)::decimal, 2) AS pull_forward_margin,
                ROUND(SUM(toiar.promo_spend)::decimal, 2) AS promo_spend,
                CASE
                    WHEN SUM(toiar.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(toiar.revenue)::decimal, 2) / NULLIF(ROUND(SUM(toiar.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aur,
                CASE
                    WHEN SUM(toiar.sales_units) = 0 THEN NULL
                    ELSE ROUND(
                        ROUND(SUM(toiar.margin)::decimal, 2) / NULLIF(ROUND(SUM(toiar.sales_units)::decimal, 2), 0)::decimal,
                        2
                    )
                END as aum,
                CASE
                    WHEN SUM(toiar.revenue) = 0 THEN NULL
                    ELSE ROUND(
                        (SUM(toiar.margin)::decimal * 100) / NULLIF(SUM(toiar.revenue), 0)::decimal,
                        2
                    )
                END as gm_percent
            FROM
                temp_stacked_override_ia_reccommend_results toiar
                LEFT JOIN prod_master_cte pdmc
                ON toiar.product_id = pdmc.product_id
                LEFT JOIN price_promo.tb_promo_override_forecast tpof
                ON toiar.promo_id = tpof.promo_id
                AND tpof.scenario_id = 0
            GROUP BY
                toiar.promo_id,
                pdmc.promo_name,
                pdmc.recommendation_type_id,
                pdmc.recommendation_type,
                pdmc.last_approved_scenario_id,
                pdmc.product_id_column,
                pdmc.product_name_column,
                tpof.is_default
        )
        ',
            _promo_id,
            _scenario_ids,
            _promo_id,
            _promo_id,
            _scenario_ids,
            _promo_id,
            _promo_id,
            _scenario_ids,
            _promo_id,
            _scenario_ids,
            _promo_id,
            _promo_id,
            _selected_product_id_column,
            _selected_product_name_column,
            _promo_id
        );

    RETURN final_query;
END;
$function$
;
