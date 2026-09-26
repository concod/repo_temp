--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_get_detailed_simulation_results_base_query_3 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: Stacking changes


DROP FUNCTION IF EXISTS price_promo.fn_get_detailed_simulation_results_base_query;

CREATE OR REPLACE FUNCTION price_promo.fn_get_detailed_simulation_results_base_query(_promo_id integer, _hierarchy_level integer, _target_currency_id integer)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    _scenario_ids TEXT;
    _selected_product_id_column TEXT;
    _selected_product_name_column TEXT;
    final_query TEXT;
    _product_hierarchies_config jsonb;
BEGIN

    select jsonb_object_agg(
        value->>'id',
        value
    ) into _product_hierarchies_config
    from
    jsonb_each(
        (select config_value::jsonb
        from price_promo.tb_tool_configurations
        where module = 'product' and config_name = 'hierarchy_filters'
		)
    )
    where value->>'id' is not null;

    raise notice 'Product hierarchies config: %', _product_hierarchies_config;

    _selected_product_id_column = format('pdm.%1$s',_product_hierarchies_config[_hierarchy_level]['id_column']);
    _selected_product_name_column = format('pdm.%1$s',_product_hierarchies_config[_hierarchy_level]['value_column']);

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
        DROP TABLE IF EXISTS target_currency_cte;

        CREATE TEMPORARY TABLE target_currency_cte AS
            SELECT 
                fn_get_target_currency_id as target_currency_id
            from 
                price_promo.fn_get_target_currency_id(
                    (
                        SELECT array_agg(DISTINCT currency_id) as source_currency_id
                        FROM price_promo.promo_master 
                        WHERE promo_id = %1$s
                    ),
                    %5$L::integer
                );

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
            sum(sc.revenue * pfr.planned_conversion_multiplier) as revenue,
            sum(sc.baseline_revenue * pfr.planned_conversion_multiplier) as baseline_revenue,
            sum(sc.incremental_revenue * pfr.planned_conversion_multiplier) as incremental_revenue,
            sum(sc.affinity_revenue * pfr.planned_conversion_multiplier) as affinity_revenue,
            sum(sc.cannibalization_revenue * pfr.planned_conversion_multiplier) as cannibalization_revenue,
            sum(sc.pull_forward_revenue * pfr.planned_conversion_multiplier) as pull_forward_revenue,
            sum(sc.margin * pfr.planned_conversion_multiplier) as margin,
            sum(sc.baseline_margin * pfr.planned_conversion_multiplier) as baseline_margin,
            sum(sc.incremental_margin * pfr.planned_conversion_multiplier) as incremental_margin,
            sum(sc.affinity_margin * pfr.planned_conversion_multiplier) as affinity_margin,
            sum(sc.cannibalization_margin * pfr.planned_conversion_multiplier) as cannibalization_margin,
            sum(sc.pull_forward_margin * pfr.planned_conversion_multiplier) as pull_forward_margin,
            sum(sc.promo_spend * pfr.planned_conversion_multiplier) as promo_spend
        FROM
            price_promo.ps_recommended_scenarios sc
            LEFT JOIN price_promo.scenario_master sm
            ON sc.promo_id = sm.promo_id
            AND sc.scenario_id = sm.scenario_id
            LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON sc.promo_id = tpof.promo_id
            AND sc.scenario_id = tpof.scenario_id
            inner join 
                global.planned_forex_rate pfr 
                on 
                    sc.recommendation_date = pfr.date 
                    and pfr.source_currency_id = sc.currency_id
                    and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        WHERE
            sc.promo_id = %1$s
            AND sc.scenario_id IN (%2$s)
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
            SUM(iap.revenue * pfr.planned_conversion_multiplier) AS revenue,
            SUM(iap.baseline_revenue * pfr.planned_conversion_multiplier) AS baseline_revenue,
            SUM(iap.incremental_revenue * pfr.planned_conversion_multiplier) AS incremental_revenue,
            SUM(iap.affinity_revenue * pfr.planned_conversion_multiplier) AS affinity_revenue,
            SUM(iap.cannibalization_revenue * pfr.planned_conversion_multiplier) AS cannibalization_revenue,
            SUM(iap.pull_forward_revenue * pfr.planned_conversion_multiplier) AS pull_forward_revenue,
            SUM(iap.margin * pfr.planned_conversion_multiplier) AS margin,
            SUM(iap.baseline_margin * pfr.planned_conversion_multiplier) AS baseline_margin,
            SUM(iap.incremental_margin * pfr.planned_conversion_multiplier) AS incremental_margin,
            SUM(iap.affinity_margin * pfr.planned_conversion_multiplier) AS affinity_margin,
            SUM(iap.cannibalization_margin * pfr.planned_conversion_multiplier) AS cannibalization_margin,
            SUM(iap.pull_forward_margin * pfr.planned_conversion_multiplier) AS pull_forward_margin,
            SUM(iap.promo_spend * pfr.planned_conversion_multiplier) AS promo_spend
        FROM
            price_promo.ps_recommended_ia_projected iap
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON iap.promo_id = tpof.promo_id
            AND tpof.scenario_id = 0
        inner join 
            global.planned_forex_rate pfr 
            on 
                iap.recommendation_date = pfr.date 
                and pfr.source_currency_id = iap.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        WHERE
            iap.promo_id = %1$s
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
            sum(sc.revenue * pfr.planned_conversion_multiplier) as revenue,
            sum(sc.baseline_revenue * pfr.planned_conversion_multiplier) as baseline_revenue,
            sum(sc.incremental_revenue * pfr.planned_conversion_multiplier) as incremental_revenue,
            sum(sc.affinity_revenue * pfr.planned_conversion_multiplier) as affinity_revenue,
            sum(sc.cannibalization_revenue * pfr.planned_conversion_multiplier) as cannibalization_revenue,
            sum(sc.pull_forward_revenue * pfr.planned_conversion_multiplier) as pull_forward_revenue,
            sum(sc.margin * pfr.planned_conversion_multiplier) as margin,
            sum(sc.baseline_margin * pfr.planned_conversion_multiplier) as baseline_margin,
            sum(sc.incremental_margin * pfr.planned_conversion_multiplier) as incremental_margin,
            sum(sc.affinity_margin * pfr.planned_conversion_multiplier) as affinity_margin,
            sum(sc.cannibalization_margin * pfr.planned_conversion_multiplier) as cannibalization_margin,
            sum(sc.pull_forward_margin * pfr.planned_conversion_multiplier) as pull_forward_margin,
            sum(sc.promo_spend * pfr.planned_conversion_multiplier) as promo_spend
        FROM
            price_promo.ps_recommended_override sc
        LEFT JOIN price_promo.scenario_master sm
            ON sc.promo_id = sm.promo_id
            AND sc.scenario_id = sm.scenario_id
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON sc.promo_id = tpof.promo_id
            AND sc.scenario_id = tpof.scenario_id
        inner join 
            global.planned_forex_rate pfr 
            on 
                sc.recommendation_date = pfr.date 
                and pfr.source_currency_id = sc.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        WHERE
            sc.promo_id = %1$s
            AND sc.scenario_id IN (%2$s)
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
            SUM(iap.revenue * pfr.planned_conversion_multiplier) AS revenue,
            SUM(iap.baseline_revenue * pfr.planned_conversion_multiplier) AS baseline_revenue,
            SUM(iap.incremental_revenue * pfr.planned_conversion_multiplier) AS incremental_revenue,
            SUM(iap.affinity_revenue * pfr.planned_conversion_multiplier) AS affinity_revenue,
            SUM(iap.cannibalization_revenue * pfr.planned_conversion_multiplier) AS cannibalization_revenue,
            SUM(iap.pull_forward_revenue * pfr.planned_conversion_multiplier) AS pull_forward_revenue,
            SUM(iap.margin * pfr.planned_conversion_multiplier) AS margin,
            SUM(iap.baseline_margin * pfr.planned_conversion_multiplier) AS baseline_margin,
            SUM(iap.incremental_margin * pfr.planned_conversion_multiplier) AS incremental_margin,
            SUM(iap.affinity_margin * pfr.planned_conversion_multiplier) AS affinity_margin,
            SUM(iap.cannibalization_margin * pfr.planned_conversion_multiplier) AS cannibalization_margin,
            SUM(iap.pull_forward_margin * pfr.planned_conversion_multiplier) AS pull_forward_margin,
            SUM(iap.promo_spend * pfr.planned_conversion_multiplier) AS promo_spend
        FROM
            price_promo.ps_recommended_override_ia iap
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON iap.promo_id = tpof.promo_id
            AND tpof.scenario_id = 0
        inner join 
            global.planned_forex_rate pfr 
            on 
                iap.recommendation_date = pfr.date 
                and pfr.source_currency_id = iap.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        WHERE
            iap.promo_id = %1$s
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
            sum(sc.revenue * pfr.planned_conversion_multiplier) as revenue,
            sum(sc.baseline_revenue * pfr.planned_conversion_multiplier) as baseline_revenue,
            sum(sc.incremental_revenue * pfr.planned_conversion_multiplier) as incremental_revenue,
            sum(sc.affinity_revenue * pfr.planned_conversion_multiplier) as affinity_revenue,
            sum(sc.cannibalization_revenue * pfr.planned_conversion_multiplier) as cannibalization_revenue,
            sum(sc.pull_forward_revenue * pfr.planned_conversion_multiplier) as pull_forward_revenue,
            sum(sc.margin * pfr.planned_conversion_multiplier) as margin,
            sum(sc.baseline_margin * pfr.planned_conversion_multiplier) as baseline_margin,
            sum(sc.incremental_margin * pfr.planned_conversion_multiplier) as incremental_margin,
            sum(sc.affinity_margin * pfr.planned_conversion_multiplier) as affinity_margin,
            sum(sc.cannibalization_margin * pfr.planned_conversion_multiplier) as cannibalization_margin,
            sum(sc.pull_forward_margin * pfr.planned_conversion_multiplier) as pull_forward_margin,
            sum(sc.promo_spend * pfr.planned_conversion_multiplier) as promo_spend
        FROM
            price_promo.ps_recommended_scenarios_stack sc
            LEFT JOIN price_promo.scenario_master sm
            ON sc.promo_id = sm.promo_id
            AND sc.scenario_id = sm.scenario_id
            LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON sc.promo_id = tpof.promo_id
            AND sc.scenario_id = tpof.scenario_id
        inner join 
            global.planned_forex_rate pfr 
            on 
                sc.recommendation_date = pfr.date 
                and pfr.source_currency_id = sc.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        WHERE
            sc.promo_id = %1$s
            AND sc.scenario_id IN (%2$s)
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
            sum(sc.revenue * pfr.planned_conversion_multiplier) as revenue,
            sum(sc.baseline_revenue * pfr.planned_conversion_multiplier) as baseline_revenue,
            sum(sc.incremental_revenue * pfr.planned_conversion_multiplier) as incremental_revenue,
            sum(sc.affinity_revenue * pfr.planned_conversion_multiplier) as affinity_revenue,
            sum(sc.cannibalization_revenue * pfr.planned_conversion_multiplier) as cannibalization_revenue,
            sum(sc.pull_forward_revenue * pfr.planned_conversion_multiplier) as pull_forward_revenue,
            sum(sc.margin * pfr.planned_conversion_multiplier) as margin,
            sum(sc.baseline_margin * pfr.planned_conversion_multiplier) as baseline_margin,
            sum(sc.incremental_margin * pfr.planned_conversion_multiplier) as incremental_margin,
            sum(sc.affinity_margin * pfr.planned_conversion_multiplier) as affinity_margin,
            sum(sc.cannibalization_margin * pfr.planned_conversion_multiplier) as cannibalization_margin,
            sum(sc.pull_forward_margin * pfr.planned_conversion_multiplier) as pull_forward_margin,
            sum(sc.promo_spend * pfr.planned_conversion_multiplier) as promo_spend
        FROM
            price_promo.ps_recommended_scenarios_stack_override sc
            LEFT JOIN price_promo.scenario_master sm
            ON sc.promo_id = sm.promo_id
            AND sc.scenario_id = sm.scenario_id
            LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON sc.promo_id = tpof.promo_id
            AND sc.scenario_id = tpof.scenario_id
        inner join 
            global.planned_forex_rate pfr 
            on 
                sc.recommendation_date = pfr.date 
                and pfr.source_currency_id = sc.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        WHERE
            sc.promo_id = %1$s
            AND sc.scenario_id IN (%2$s)
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
            SUM(iap.revenue * pfr.planned_conversion_multiplier) AS revenue,
            SUM(iap.baseline_revenue * pfr.planned_conversion_multiplier) AS baseline_revenue,
            SUM(iap.incremental_revenue * pfr.planned_conversion_multiplier) AS incremental_revenue,
            SUM(iap.affinity_revenue * pfr.planned_conversion_multiplier) AS affinity_revenue,
            SUM(iap.cannibalization_revenue * pfr.planned_conversion_multiplier) AS cannibalization_revenue,
            SUM(iap.pull_forward_revenue * pfr.planned_conversion_multiplier) AS pull_forward_revenue,
            SUM(iap.margin * pfr.planned_conversion_multiplier) AS margin,
            SUM(iap.baseline_margin * pfr.planned_conversion_multiplier) AS baseline_margin,
            SUM(iap.incremental_margin * pfr.planned_conversion_multiplier) AS incremental_margin,
            SUM(iap.affinity_margin * pfr.planned_conversion_multiplier) AS affinity_margin,
            SUM(iap.cannibalization_margin * pfr.planned_conversion_multiplier) AS cannibalization_margin,
            SUM(iap.pull_forward_margin * pfr.planned_conversion_multiplier) AS pull_forward_margin,
            SUM(iap.promo_spend * pfr.planned_conversion_multiplier) AS promo_spend
        FROM
            price_promo.ps_recommended_stack_ia iap
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON iap.promo_id = tpof.promo_id
            AND tpof.scenario_id = 0
        inner join 
            global.planned_forex_rate pfr 
            on 
                iap.recommendation_date = pfr.date 
                and pfr.source_currency_id = iap.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        WHERE
            iap.promo_id = %1$s
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
            SUM(iap.revenue * pfr.planned_conversion_multiplier) AS revenue,
            SUM(iap.baseline_revenue * pfr.planned_conversion_multiplier) AS baseline_revenue,
            SUM(iap.incremental_revenue * pfr.planned_conversion_multiplier) AS incremental_revenue,
            SUM(iap.affinity_revenue * pfr.planned_conversion_multiplier) AS affinity_revenue,
            SUM(iap.cannibalization_revenue * pfr.planned_conversion_multiplier) AS cannibalization_revenue,
            SUM(iap.pull_forward_revenue * pfr.planned_conversion_multiplier) AS pull_forward_revenue,
            SUM(iap.margin * pfr.planned_conversion_multiplier) AS margin,
            SUM(iap.baseline_margin * pfr.planned_conversion_multiplier) AS baseline_margin,
            SUM(iap.incremental_margin * pfr.planned_conversion_multiplier) AS incremental_margin,
            SUM(iap.affinity_margin * pfr.planned_conversion_multiplier) AS affinity_margin,
            SUM(iap.cannibalization_margin * pfr.planned_conversion_multiplier) AS cannibalization_margin,
            SUM(iap.pull_forward_margin * pfr.planned_conversion_multiplier) AS pull_forward_margin,
            SUM(iap.promo_spend * pfr.planned_conversion_multiplier) AS promo_spend
        FROM
            price_promo.ps_recommended_stack_override_ia iap
        LEFT JOIN price_promo.tb_promo_override_forecast tpof
            ON iap.promo_id = tpof.promo_id
            AND tpof.scenario_id = 0
        inner join 
            global.planned_forex_rate pfr 
            on 
                iap.recommendation_date = pfr.date 
                and pfr.source_currency_id = iap.currency_id
                and pfr.target_currency_id = (SELECT target_currency_id FROM target_currency_cte)
        WHERE
            iap.promo_id = %1$s
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
                %3$s AS product_id_column,
                %4$s AS product_name_column,
                pm.total_inventory AS total_inventory
            FROM
                price_promo.promo_master pm
                LEFT JOIN price_promo.promo_product pp
                ON pm.promo_id = pp.promo_id
                LEFT JOIN price_promo.product_master pdm
                ON pp.product_id = pdm.product_id
                LEFT JOIN metaschema.tb_app_sub_master tasm
                ON pm.recommendation_type_id = tasm.id
            WHERE
                pm.promo_id = %1$s
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
                END as gm_percent,
                CASE
                    WHEN SUM(tsr.baseline_revenue) = 0 OR SUM(tsr.baseline_revenue) IS NULL THEN 0
                    ELSE ROUND(((SUM(tsr.baseline_margin) * 100.0) / NULLIF(SUM(tsr.baseline_revenue), 0))::numeric, 2)
                END AS baseline_gm_percent,
                COALESCE(pdmc.total_inventory, 0) AS total_inventory,
                LEAST(100, GREATEST(0, CASE 
                    WHEN COALESCE(pdmc.total_inventory, 0) = 0 THEN 0 
                    ELSE ROUND(((SUM(tsr.sales_units) / pdmc.total_inventory) * 100)::DECIMAL, 1) 
                END)) AS finalized_st_percent
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
                pdmc.product_name_column,
                pdmc.total_inventory
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
                END as gm_percent,
                CASE
                    WHEN SUM(tiar.baseline_revenue) = 0 OR SUM(tiar.baseline_revenue) IS NULL THEN 0
                    ELSE ROUND(((SUM(tiar.baseline_margin) * 100.0) / NULLIF(SUM(tiar.baseline_revenue), 0))::numeric, 2)
                END AS baseline_gm_percent,
                COALESCE(pdmc.total_inventory, 0) AS total_inventory,
                LEAST(100, GREATEST(0, CASE 
                    WHEN COALESCE(pdmc.total_inventory, 0) = 0 THEN 0 
                    ELSE ROUND(((SUM(tiar.sales_units) / pdmc.total_inventory) * 100)::DECIMAL, 1) 
                END)) AS finalized_st_percent
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
                tiar.is_default,
                pdmc.total_inventory
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
                END as gm_percent,
                CASE
                    WHEN SUM(tosr.baseline_revenue) = 0 OR SUM(tosr.baseline_revenue) IS NULL THEN 0
                    ELSE ROUND(((SUM(tosr.baseline_margin) * 100.0) / NULLIF(SUM(tosr.baseline_revenue), 0))::numeric, 2)
                END AS baseline_gm_percent,
                COALESCE(pdmc.total_inventory, 0) AS total_inventory,
                LEAST(100, GREATEST(0, CASE 
                    WHEN COALESCE(pdmc.total_inventory, 0) = 0 THEN 0 
                    ELSE ROUND(((SUM(tosr.sales_units) / pdmc.total_inventory) * 100)::DECIMAL, 1) 
                END)) AS finalized_st_percent
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
                pdmc.product_name_column,
                pdmc.total_inventory
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
                END as gm_percent,
                CASE
                    WHEN SUM(toiar.baseline_revenue) = 0 OR SUM(toiar.baseline_revenue) IS NULL THEN 0
                    ELSE ROUND(((SUM(toiar.baseline_margin) * 100.0) / NULLIF(SUM(toiar.baseline_revenue), 0))::numeric, 2)
                END AS baseline_gm_percent,
                COALESCE(pdmc.total_inventory, 0) AS total_inventory,
                LEAST(100, GREATEST(0, CASE 
                    WHEN COALESCE(pdmc.total_inventory, 0) = 0 THEN 0 
                    ELSE ROUND(((SUM(toiar.sales_units) / pdmc.total_inventory) * 100)::DECIMAL, 1) 
                END)) AS finalized_st_percent
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
                tpof.is_default,
                pdmc.total_inventory
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
                END as gm_percent,
                CASE
                    WHEN SUM(tsr.baseline_revenue) = 0 OR SUM(tsr.baseline_revenue) IS NULL THEN 0
                    ELSE ROUND(((SUM(tsr.baseline_margin) * 100.0) / NULLIF(SUM(tsr.baseline_revenue), 0))::numeric, 2)
                END AS baseline_gm_percent,
                COALESCE(pdmc.total_inventory, 0) AS total_inventory,
                LEAST(100, GREATEST(0, CASE 
                    WHEN COALESCE(pdmc.total_inventory, 0) = 0 THEN 0 
                    ELSE ROUND(((SUM(tsr.sales_units) / pdmc.total_inventory) * 100)::DECIMAL, 1) 
                END)) AS finalized_st_percent
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
                pdmc.product_name_column,
                pdmc.total_inventory
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
                END as gm_percent,
                CASE
                    WHEN SUM(tiar.baseline_revenue) = 0 OR SUM(tiar.baseline_revenue) IS NULL THEN 0
                    ELSE ROUND(((SUM(tiar.baseline_margin) * 100.0) / NULLIF(SUM(tiar.baseline_revenue), 0))::numeric, 2)
                END AS baseline_gm_percent,
                COALESCE(pdmc.total_inventory, 0) AS total_inventory,
                LEAST(100, GREATEST(0, CASE 
                    WHEN COALESCE(pdmc.total_inventory, 0) = 0 THEN 0 
                    ELSE ROUND(((SUM(tiar.sales_units) / pdmc.total_inventory) * 100)::DECIMAL, 1) 
                END)) AS finalized_st_percent
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
                tiar.is_default,
                pdmc.total_inventory
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
                END as gm_percent,
                CASE
                    WHEN SUM(tosr.baseline_revenue) = 0 OR SUM(tosr.baseline_revenue) IS NULL THEN 0
                    ELSE ROUND(((SUM(tosr.baseline_margin) * 100.0) / NULLIF(SUM(tosr.baseline_revenue), 0))::numeric, 2)
                END AS baseline_gm_percent,
                COALESCE(pdmc.total_inventory, 0) AS total_inventory,
                LEAST(100, GREATEST(0, CASE 
                    WHEN COALESCE(pdmc.total_inventory, 0) = 0 THEN 0 
                    ELSE ROUND(((SUM(tosr.sales_units) / pdmc.total_inventory) * 100)::DECIMAL, 1) 
                END)) AS finalized_st_percent
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
                pdmc.product_name_column,
                pdmc.total_inventory
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
                END as gm_percent,
                CASE
                    WHEN SUM(toiar.baseline_revenue) = 0 OR SUM(toiar.baseline_revenue) IS NULL THEN 0
                    ELSE ROUND(((SUM(toiar.baseline_margin) * 100.0) / NULLIF(SUM(toiar.baseline_revenue), 0))::numeric, 2)
                END AS baseline_gm_percent,
                COALESCE(pdmc.total_inventory, 0) AS total_inventory,
                LEAST(100, GREATEST(0, CASE 
                    WHEN COALESCE(pdmc.total_inventory, 0) = 0 THEN 0 
                    ELSE ROUND(((SUM(toiar.sales_units) / pdmc.total_inventory) * 100)::DECIMAL, 1) 
                END)) AS finalized_st_percent
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
                tpof.is_default,
                pdmc.total_inventory
        )
        ',
            _promo_id,
            _scenario_ids,
            _selected_product_id_column,
            _selected_product_name_column,
            COALESCE(_target_currency_id, NULL)
        );

    RETURN final_query;
END;
$function$
;
