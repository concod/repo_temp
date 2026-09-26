--liquibase formatted sql
--changeset harsh.singh@impactanalytics.co:fn_detailed_simulation_results_report runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_detailed_simulation_results_report

DROP FUNCTION if exists price_promo.fn_detailed_simulation_results_report;
CREATE OR REPLACE FUNCTION price_promo.fn_detailed_simulation_results_report(_promo_id integer, _aggregation integer)
 RETURNS TABLE(promo_id integer, promo_name text, product_name text, scenario_name character varying, sales_units numeric, total_sales_units numeric, baseline_sales_units numeric, incremental_sales_units numeric, revenue numeric, total_revenue numeric, baseline_revenue numeric, incremental_revenue numeric, affinity_revenue numeric, cannibalization_revenue numeric, pull_forward_revenue numeric, margin numeric, total_margin numeric, baseline_margin numeric, incremental_margin numeric, affinity_margin numeric, cannibalization_margin numeric, pull_forward_margin numeric, promo_spend numeric, aur numeric, aum numeric, gm_percent numeric, override_sales_units numeric, override_total_sales_units numeric, override_baseline_sales_units numeric, override_incremental_sales_units numeric, override_revenue numeric, override_total_revenue numeric, override_baseline_revenue numeric, override_incremental_revenue numeric, override_affinity_revenue numeric, override_cannibalization_revenue numeric, override_pull_forward_revenue numeric, override_margin numeric, override_total_margin numeric, override_baseline_margin numeric, override_incremental_margin numeric, override_affinity_margin numeric, override_cannibalization_margin numeric, override_pull_forward_margin numeric, override_promo_spend numeric, override_aur numeric, override_aum numeric, override_gm_percent numeric, stacked_sales_units numeric, stacked_total_sales_units numeric, stacked_baseline_sales_units numeric, stacked_incremental_sales_units numeric, stacked_revenue numeric, stacked_total_revenue numeric, stacked_baseline_revenue numeric, stacked_incremental_revenue numeric, stacked_affinity_revenue numeric, stacked_cannibalization_revenue numeric, stacked_pull_forward_revenue numeric, stacked_margin numeric, stacked_total_margin numeric, stacked_baseline_margin numeric, stacked_incremental_margin numeric, stacked_affinity_margin numeric, stacked_cannibalization_margin numeric, stacked_pull_forward_margin numeric, stacked_promo_spend numeric, stacked_aur numeric, stacked_aum numeric, stacked_gm_percent numeric, stacked_override_sales_units numeric, stacked_override_total_sales_units numeric, stacked_override_baseline_sales_units numeric, stacked_override_incremental_sales_units numeric, stacked_override_revenue numeric, stacked_override_total_revenue numeric, stacked_override_baseline_revenue numeric, stacked_override_incremental_revenue numeric, stacked_override_affinity_revenue numeric, stacked_override_cannibalization_revenue numeric, stacked_override_pull_forward_revenue numeric, stacked_override_margin numeric, stacked_override_total_margin numeric, stacked_override_baseline_margin numeric, stacked_override_incremental_margin numeric, stacked_override_affinity_margin numeric, stacked_override_cannibalization_margin numeric, stacked_override_pull_forward_margin numeric, stacked_override_promo_spend numeric, stacked_override_aur numeric, stacked_override_aum numeric, stacked_override_gm_percent numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    scenario_list INTEGER[];
    vl_test_query text;
BEGIN
    -- Fetch the list of scenarios for the given promo_id
    SELECT ARRAY_AGG(sm.scenario_id) INTO scenario_list
    FROM price_promo.scenario_master sm
    WHERE sm.promo_id = _promo_id;

    vl_test_query := format('WITH temp_scenario_results AS (
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
	    sc.scenario_id in (%1$s)
	GROUP BY
	    sc.promo_id,
	    sc.scenario_id,
	    sm.scenario_order_id,
	    sm.scenario_name,
	    sc.product_id,
	    tpof.is_default
	),

	temp_ia_reccommend_results AS (
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
	    iap.promo_id = %2$L
	GROUP BY
	    iap.promo_id,
	    iap.product_id,
	    tpof.is_default
	),
	
	temp_override_scenario_results AS (
	SELECT
	    sc.promo_id,
	    sc.scenario_id,
	    sc.product_id,
	    sum(sc.sales_units) as override_sales_units,
	    sum(sc.baseline_sales_units) as override_baseline_sales_units,
	    sum(sc.incremental_sales_units) as override_incremental_sales_units,
	    sum(sc.revenue) as override_revenue,
	    sum(sc.baseline_revenue) as override_baseline_revenue,
	    sum(sc.incremental_revenue) as override_incremental_revenue,
	    sum(sc.affinity_revenue) as override_affinity_revenue,
	    sum(sc.cannibalization_revenue) as override_cannibalization_revenue,
	    sum(sc.pull_forward_revenue) as override_pull_forward_revenue,
	    sum(sc.margin) as override_margin,
	    sum(sc.baseline_margin) as override_baseline_margin,
	    sum(sc.incremental_margin) as override_incremental_margin,
	    sum(sc.affinity_margin) as override_affinity_margin,
	    sum(sc.cannibalization_margin) as override_cannibalization_margin,
	    sum(sc.pull_forward_margin) as override_pull_forward_margin,
	    sum(sc.promo_spend) as override_promo_spend
	FROM
	    price_promo.ps_recommended_override sc
	LEFT JOIN price_promo.scenario_master sm
	    ON sc.promo_id = sm.promo_id
	    AND sc.scenario_id = sm.scenario_id
	LEFT JOIN price_promo.tb_promo_override_forecast tpof
	    ON sc.promo_id = tpof.promo_id
	    AND sc.scenario_id = tpof.scenario_id
	WHERE
	    sc.scenario_id in (%1$s)
	GROUP BY
	    sc.promo_id,
	    sc.scenario_id,
	    sm.scenario_order_id,
	    sm.scenario_name,
	    sc.product_id,
	    tpof.is_default
	),
	temp_override_ia_reccommend_results AS (
	SELECT
	    iap.promo_id,
	    iap.product_id,
	    SUM(iap.sales_units) AS override_sales_units,
	    SUM(iap.baseline_sales_units) AS override_baseline_sales_units,
	    SUM(iap.incremental_sales_units) AS override_incremental_sales_units,
	    SUM(iap.revenue) AS override_revenue,
	    SUM(iap.baseline_revenue) AS override_baseline_revenue,
	    SUM(iap.incremental_revenue) AS override_incremental_revenue,
	    SUM(iap.affinity_revenue) AS override_affinity_revenue,
	    SUM(iap.cannibalization_revenue) AS override_cannibalization_revenue,
	    SUM(iap.pull_forward_revenue) AS override_pull_forward_revenue,
	    SUM(iap.margin) AS override_margin,
	    SUM(iap.baseline_margin) AS override_baseline_margin,
	    SUM(iap.incremental_margin) AS override_incremental_margin,
	    SUM(iap.affinity_margin) AS override_affinity_margin,
	    SUM(iap.cannibalization_margin) AS override_cannibalization_margin,
	    SUM(iap.pull_forward_margin) AS override_pull_forward_margin,
	    SUM(iap.promo_spend) AS override_promo_spend
	FROM
	    price_promo.ps_recommended_override_ia iap
	LEFT JOIN price_promo.tb_promo_override_forecast tpof
	    ON iap.promo_id = tpof.promo_id
	    AND tpof.scenario_id = 0
	WHERE
	    iap.promo_id = %2$L
	GROUP BY
	    iap.promo_id,
	    iap.product_id,
	    tpof.is_default
	),
	temp_stacked_scenario_results AS (
	SELECT
	    sc.promo_id,
	    sc.scenario_id,
	    sc.product_id,
	    tpof.is_default,
	    sum(sc.sales_units) as stacked_sales_units,
	    sum(sc.baseline_sales_units) as stacked_baseline_sales_units,
	    sum(sc.incremental_sales_units) as stacked_incremental_sales_units,
	    sum(sc.revenue) as stacked_revenue,
	    sum(sc.baseline_revenue) as stacked_baseline_revenue,
	    sum(sc.incremental_revenue) as stacked_incremental_revenue,
	    sum(sc.affinity_revenue) as stacked_affinity_revenue,
	    sum(sc.cannibalization_revenue) as stacked_cannibalization_revenue,
	    sum(sc.pull_forward_revenue) as stacked_pull_forward_revenue,
	    sum(sc.margin) as stacked_margin,
	    sum(sc.baseline_margin) as stacked_baseline_margin,
	    sum(sc.incremental_margin) as stacked_incremental_margin,
	    sum(sc.affinity_margin) as stacked_affinity_margin,
	    sum(sc.cannibalization_margin) as stacked_cannibalization_margin,
	    sum(sc.pull_forward_margin) as stacked_pull_forward_margin,
	    sum(sc.promo_spend) as stacked_promo_spend
	FROM
	    price_promo.ps_recommended_scenarios_stack sc
	    LEFT JOIN price_promo.scenario_master sm
	    ON sc.promo_id = sm.promo_id
	    AND sc.scenario_id = sm.scenario_id
	    LEFT JOIN price_promo.tb_promo_override_forecast tpof
	    ON sc.promo_id = tpof.promo_id
	    AND sc.scenario_id = tpof.scenario_id
	WHERE
	    sc.promo_id = %2$L
	GROUP BY
	    sc.promo_id,
	    sc.scenario_id,
	    sc.product_id,
	    tpof.is_default
	),
	temp_stacked_ia_reccommend_results AS (
	SELECT
	    iap.promo_id,
	    iap.product_id,
	    tpof.is_default,
	    SUM(iap.sales_units) AS stacked_sales_units,
	    SUM(iap.baseline_sales_units) AS stacked_baseline_sales_units,
	    SUM(iap.incremental_sales_units) AS stacked_incremental_sales_units,
	    SUM(iap.revenue) AS stacked_revenue,
	    SUM(iap.baseline_revenue) AS stacked_baseline_revenue,
	    SUM(iap.incremental_revenue) AS stacked_incremental_revenue,
	    SUM(iap.affinity_revenue) AS stacked_affinity_revenue,
	    SUM(iap.cannibalization_revenue) AS stacked_cannibalization_revenue,
	    SUM(iap.pull_forward_revenue) AS stacked_pull_forward_revenue,
	    SUM(iap.margin) AS stacked_margin,
	    SUM(iap.baseline_margin) AS stacked_baseline_margin,
	    SUM(iap.incremental_margin) AS stacked_incremental_margin,
	    SUM(iap.affinity_margin) AS stacked_affinity_margin,
	    SUM(iap.cannibalization_margin) AS stacked_cannibalization_margin,
	    SUM(iap.pull_forward_margin) AS stacked_pull_forward_margin,
	    SUM(iap.promo_spend) AS stacked_promo_spend
	FROM
	    price_promo.ps_recommended_stack_ia iap
	LEFT JOIN price_promo.tb_promo_override_forecast tpof
	    ON iap.promo_id = tpof.promo_id
	    AND tpof.scenario_id = 0
	WHERE
	    iap.promo_id = %2$L
	GROUP BY
	    iap.promo_id,
	    iap.product_id,
	    tpof.is_default
	),
	temp_stacked_override_scenario_results AS (
	SELECT
	    sc.promo_id,
	    sc.scenario_id,
	    sc.product_id,
	    sum(sc.sales_units) as stacked_override_sales_units,
	    sum(sc.baseline_sales_units) as stacked_override_baseline_sales_units,
	    sum(sc.incremental_sales_units) as stacked_override_incremental_sales_units,
	    sum(sc.revenue) as stacked_override_revenue,
	    sum(sc.baseline_revenue) as stacked_override_baseline_revenue,
	    sum(sc.incremental_revenue) as stacked_override_incremental_revenue,
	    sum(sc.affinity_revenue) as stacked_override_affinity_revenue,
	    sum(sc.cannibalization_revenue) as stacked_override_cannibalization_revenue,
	    sum(sc.pull_forward_revenue) as stacked_override_pull_forward_revenue,
	    sum(sc.margin) as stacked_override_margin,
	    sum(sc.baseline_margin) as stacked_override_baseline_margin,
	    sum(sc.incremental_margin) as stacked_override_incremental_margin,
	    sum(sc.affinity_margin) as stacked_override_affinity_margin,
	    sum(sc.cannibalization_margin) as stacked_override_cannibalization_margin,
	    sum(sc.pull_forward_margin) as stacked_override_pull_forward_margin,
	    sum(sc.promo_spend) as stacked_override_promo_spend
	FROM
	    price_promo.ps_recommended_scenarios_stack_override sc
	LEFT JOIN price_promo.scenario_master sm
	    ON sc.promo_id = sm.promo_id
	    AND sc.scenario_id = sm.scenario_id
	LEFT JOIN price_promo.tb_promo_override_forecast tpof
	    ON sc.promo_id = tpof.promo_id
	    AND sc.scenario_id = tpof.scenario_id
	WHERE
	    sc.promo_id = %2$L
	GROUP BY
	    sc.promo_id,
	    sc.scenario_id,
	    sm.scenario_order_id,
	    sm.scenario_name,
	    sc.product_id,
	    tpof.is_default
	),
	temp_stacked_override_ia_reccommend_results AS (
	SELECT
	    iap.promo_id,
	    iap.product_id,
	    SUM(iap.sales_units) AS stacked_override_sales_units,
	    SUM(iap.baseline_sales_units) AS stacked_override_baseline_sales_units,
	    SUM(iap.incremental_sales_units) AS stacked_override_incremental_sales_units,
	    SUM(iap.revenue) AS stacked_override_revenue,
	    SUM(iap.baseline_revenue) AS stacked_override_baseline_revenue,
	    SUM(iap.incremental_revenue) AS stacked_override_incremental_revenue,
	    SUM(iap.affinity_revenue) AS stacked_override_affinity_revenue,
	    SUM(iap.cannibalization_revenue) AS stacked_override_cannibalization_revenue,
	    SUM(iap.pull_forward_revenue) AS stacked_override_pull_forward_revenue,
	    SUM(iap.margin) AS stacked_override_margin,
	    SUM(iap.baseline_margin) AS stacked_override_baseline_margin,
	    SUM(iap.incremental_margin) AS stacked_override_incremental_margin,
	    SUM(iap.affinity_margin) AS stacked_override_affinity_margin,
	    SUM(iap.cannibalization_margin) AS stacked_override_cannibalization_margin,
	    SUM(iap.pull_forward_margin) AS stacked_override_pull_forward_margin,
	    SUM(iap.promo_spend) AS stacked_override_promo_spend
	FROM
	    price_promo.ps_recommended_stack_override_ia iap
	LEFT JOIN price_promo.tb_promo_override_forecast tpof
	    ON iap.promo_id = tpof.promo_id
	    AND tpof.scenario_id = 0
	WHERE
	    iap.promo_id = %2$L
	GROUP BY
	    iap.promo_id,
	    iap.product_id,
	    tpof.is_default
	),
	prod_master_cte AS (
	    SELECT
	        pm.promo_id,
	        pm.name AS promo_name,
	        pm.recommendation_type_id,
	        tasm.name AS recommendation_type,
	        pm.last_approved_scenario_id,
	        pp.product_id,
	        case
	            when %3$L = 0 then l0_id
	            when %3$L = 1 then l1_id
	            when %3$L = 2 then l2_id
	            when %3$L = 3 then l3_id
	            when %3$L = 4 then l4_id
	            when %3$L = 5 then l5_id
	            when %3$L = -1 then brand
	        end as product_id_column,
	        case
	            when %3$L = 0 then l0_cuq
	            when %3$L = 1 then l1_cuq
	            when %3$L = 2 then l2_cuq
	            when %3$L = 3 then l3_cuq
	            when %3$L = 4 then l4_cuq
	            when %3$L = 5 then l5_cuq
	            when %3$L = -1 then brand
	        end as product_name_column
	
	    FROM
	        price_promo.promo_master pm
	        LEFT JOIN price_promo.promo_product pp
	        ON pm.promo_id = pp.promo_id
	        LEFT JOIN price_promo.product_master pdm
	        ON pp.product_id = pdm.product_id
	        LEFT JOIN metaschema.tb_app_sub_master tasm
	        ON pm.recommendation_type_id = tasm.id
	    WHERE
	        pm.promo_id = %2$L
	),
	final_original_metrics_cte AS (
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
	),
	final_override_metrics_cte as (
	    SELECT
	        tosr.promo_id,
	        tosr.scenario_id,
	        pdmc.product_id_column AS product_id,
	        pdmc.product_name_column AS product_name,
	        ROUND(SUM(tosr.override_sales_units)::decimal, 2) AS override_sales_units,
	        ROUND(SUM(tosr.override_baseline_sales_units)::decimal, 2) AS override_baseline_sales_units,
	        ROUND(SUM(tosr.override_incremental_sales_units)::decimal, 2) AS override_incremental_sales_units,
	        ROUND(SUM(tosr.override_revenue)::decimal, 2) AS override_revenue,
	        ROUND(SUM(tosr.override_baseline_revenue)::decimal, 2) AS override_baseline_revenue,
	        ROUND(SUM(tosr.override_incremental_revenue)::decimal, 2) AS override_incremental_revenue,
	        ROUND(SUM(tosr.override_affinity_revenue)::decimal, 2) AS override_affinity_revenue,
	        ROUND(SUM(tosr.override_cannibalization_revenue)::decimal, 2) AS override_cannibalization_revenue,
	        ROUND(SUM(tosr.override_pull_forward_revenue)::decimal, 2) AS override_pull_forward_revenue,
	        ROUND(SUM(tosr.override_margin)::decimal, 2) AS override_margin,
	        ROUND(SUM(tosr.override_baseline_margin)::decimal, 2) AS override_baseline_margin,
	        ROUND(SUM(tosr.override_incremental_margin)::decimal, 2) AS override_incremental_margin,
	        ROUND(SUM(tosr.override_affinity_margin)::decimal, 2) AS override_affinity_margin,
	        ROUND(SUM(tosr.override_cannibalization_margin)::decimal, 2) AS override_cannibalization_margin,
	        ROUND(SUM(tosr.override_pull_forward_margin)::decimal, 2) AS override_pull_forward_margin,
	        ROUND(SUM(tosr.override_promo_spend)::decimal, 2) AS override_promo_spend,
	        CASE
	            WHEN SUM(tosr.override_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(tosr.override_revenue)::decimal, 2) / NULLIF(ROUND(SUM(tosr.override_sales_units)::decimal, 2), 0)::decimal,2
	            )
	        END as override_aur,
	        CASE
	            WHEN SUM(tosr.override_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(tosr.override_margin)::decimal, 2) / NULLIF(ROUND(SUM(tosr.override_sales_units)::decimal,2),0)::decimal,2
	            )
	        END as override_aum,
	        CASE
	            WHEN SUM(tosr.override_revenue) = 0 THEN NULL
	            ELSE ROUND(
	                (SUM(tosr.override_margin)::decimal * 100) / NULLIF(SUM(tosr.override_revenue), 0)::decimal,2
	            )
	        END as override_gm_percent
	    FROM
	        temp_override_scenario_results tosr
	        LEFT JOIN prod_master_cte pdmc
	        ON tosr.product_id = pdmc.product_id
	    GROUP BY
	        tosr.promo_id,
	        tosr.scenario_id,
	        pdmc.product_id_column,
	        pdmc.product_name_column
	    UNION ALL
	    SELECT
	        toiar.promo_id,
	        0 AS scenario_id,
	        pdmc.product_id_column AS product_id,
	        pdmc.product_name_column AS product_name,
	        ROUND(SUM(toiar.override_sales_units)::decimal, 2) AS taoverride_sales_units,
	        ROUND(SUM(toiar.override_baseline_sales_units)::decimal, 2) AS taoverride_baseline_sales_units,
	        ROUND(SUM(toiar.override_incremental_sales_units)::decimal, 2) AS taoverride_incremental_sales_units,
	        ROUND(SUM(toiar.override_revenue)::decimal, 2) AS taoverride_revenue,
	        ROUND(SUM(toiar.override_baseline_revenue)::decimal, 2) AS taoverride_baseline_revenue,
	        ROUND(SUM(toiar.override_incremental_revenue)::decimal, 2) AS taoverride_incremental_revenue,
	        ROUND(SUM(toiar.override_affinity_revenue)::decimal, 2) AS taoverride_affinity_revenue,
	        ROUND(SUM(toiar.override_cannibalization_revenue)::decimal, 2) AS taoverride_cannibalization_revenue,
	        ROUND(SUM(toiar.override_pull_forward_revenue)::decimal, 2) AS taoverride_pull_forward_revenue,
	        ROUND(SUM(toiar.override_margin)::decimal, 2) AS taoverride_margin,
	        ROUND(SUM(toiar.override_baseline_margin)::decimal, 2) AS taoverride_baseline_margin,
	        ROUND(SUM(toiar.override_incremental_margin)::decimal, 2) AS taoverride_incremental_margin,
	        ROUND(SUM(toiar.override_affinity_margin)::decimal, 2) AS taoverride_affinity_margin,
	        ROUND(SUM(toiar.override_cannibalization_margin)::decimal, 2) AS taoverride_cannibalization_margin,
	        ROUND(SUM(toiar.override_pull_forward_margin)::decimal, 2) AS taoverride_pull_forward_margin,
	        ROUND(SUM(toiar.override_promo_spend)::decimal, 2) AS taoverride_promo_spend,
	        CASE
	            WHEN SUM(toiar.override_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(toiar.override_revenue)::decimal, 2) / NULLIF(ROUND(SUM(toiar.override_sales_units)::decimal, 2), 0)::decimal,2
	            )
	        END as taoverride_aur,
	        CASE
	            WHEN SUM(toiar.override_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(toiar.override_margin)::decimal, 2) / NULLIF(ROUND(SUM(toiar.override_sales_units)::decimal,2),0)::decimal,2
	            )
	        END as taoverride_aum,
	        CASE
	            WHEN SUM(toiar.override_revenue) = 0 THEN NULL
	            ELSE ROUND(
	                (SUM(toiar.override_margin)::decimal * 100) / NULLIF(SUM(toiar.override_revenue), 0)::decimal,2
	            )
	        END as taoverride_gm_percent
	    FROM
	        temp_override_ia_reccommend_results toiar
	        LEFT JOIN prod_master_cte pdmc
	        ON toiar.product_id = pdmc.product_id
	        LEFT JOIN price_promo.tb_promo_override_forecast tpof
	        ON toiar.promo_id = tpof.promo_id
	        AND tpof.scenario_id = 0
	    GROUP BY
	        toiar.promo_id,
	        pdmc.product_id_column,
	        pdmc.product_name_column
	),
	final_stacked_metrics_cte as(
	        SELECT
	        tsr.promo_id,
	        tsr.scenario_id,
	        pdmc.product_id_column AS product_id,
	        pdmc.product_name_column AS product_name,
	        ROUND(SUM(tsr.stacked_sales_units)::decimal, 2) AS stacked_sales_units,
	        ROUND(SUM(tsr.stacked_baseline_sales_units)::decimal, 2) AS stacked_baseline_sales_units,
	        ROUND(SUM(tsr.stacked_incremental_sales_units)::decimal, 2) AS stacked_incremental_sales_units,
	        ROUND(SUM(tsr.stacked_revenue)::decimal, 2) AS stacked_revenue,
	        ROUND(SUM(tsr.stacked_baseline_revenue)::decimal, 2) AS stacked_baseline_revenue,
	        ROUND(SUM(tsr.stacked_incremental_revenue)::decimal, 2) AS stacked_incremental_revenue,
	        ROUND(SUM(tsr.stacked_affinity_revenue)::decimal, 2) AS stacked_affinity_revenue,
	        ROUND(SUM(tsr.stacked_cannibalization_revenue)::decimal, 2) AS stacked_cannibalization_revenue,
	        ROUND(SUM(tsr.stacked_pull_forward_revenue)::decimal, 2) AS stacked_pull_forward_revenue,
	        ROUND(SUM(tsr.stacked_margin)::decimal, 2) AS stacked_margin,
	        ROUND(SUM(tsr.stacked_baseline_margin)::decimal, 2) AS stacked_baseline_margin,
	        ROUND(SUM(tsr.stacked_incremental_margin)::decimal, 2) AS stacked_incremental_margin,
	        ROUND(SUM(tsr.stacked_affinity_margin)::decimal, 2) AS stacked_affinity_margin,
	        ROUND(SUM(tsr.stacked_cannibalization_margin)::decimal, 2) AS stacked_cannibalization_margin,
	        ROUND(SUM(tsr.stacked_pull_forward_margin)::decimal, 2) AS stacked_pull_forward_margin,
	        ROUND(SUM(tsr.stacked_promo_spend)::decimal, 2) AS stacked_promo_spend,
	        CASE
	            WHEN SUM(tsr.stacked_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(tsr.stacked_revenue)::decimal, 2) / NULLIF(ROUND(SUM(tsr.stacked_sales_units)::decimal, 2), 0)::decimal,
	                2
	            )
	        END as stacked_aur,
	        CASE
	            WHEN SUM(tsr.stacked_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(tsr.stacked_margin)::decimal, 2) / NULLIF(ROUND(SUM(tsr.stacked_sales_units)::decimal, 2), 0)::decimal,
	                2
	            )
	        END as stacked_aum,
	        CASE
	            WHEN SUM(tsr.stacked_revenue) = 0 THEN NULL
	            ELSE ROUND(
	                (SUM(tsr.stacked_margin)::decimal * 100) / NULLIF(SUM(tsr.stacked_revenue), 0)::decimal,
	                2
	            )
	        END as stacked_gm_percent
	    FROM
	        temp_stacked_scenario_results tsr
	        LEFT JOIN prod_master_cte pdmc
	        ON tsr.product_id = pdmc.product_id
	    GROUP BY
	        tsr.promo_id,
	        tsr.scenario_id,
	        tsr.is_default,
	        pdmc.product_id_column,
	        pdmc.product_name_column
	    UNION ALL
	    SELECT
	        tiar.promo_id,
	        0 AS scenario_id,
	        pdmc.product_id_column AS product_id,
	        pdmc.product_name_column AS product_name,
	        ROUND(SUM(tiar.stacked_sales_units)::decimal, 2) AS stacked_sales_units,
	        ROUND(SUM(tiar.stacked_baseline_sales_units)::decimal, 2) AS stacked_baseline_sales_units,
	        ROUND(SUM(tiar.stacked_incremental_sales_units)::decimal, 2) AS stacked_incremental_sales_units,
	        ROUND(SUM(tiar.stacked_revenue)::decimal, 2) AS stacked_revenue,
	        ROUND(SUM(tiar.stacked_baseline_revenue)::decimal, 2) AS stacked_baseline_revenue,
	        ROUND(SUM(tiar.stacked_incremental_revenue)::decimal, 2) AS stacked_incremental_revenue,
	        ROUND(SUM(tiar.stacked_affinity_revenue)::decimal, 2) AS stacked_affinity_revenue,
	        ROUND(SUM(tiar.stacked_cannibalization_revenue)::decimal, 2) AS stacked_cannibalization_revenue,
	        ROUND(SUM(tiar.stacked_pull_forward_revenue)::decimal, 2) AS stacked_pull_forward_revenue,
	        ROUND(SUM(tiar.stacked_margin)::decimal, 2) AS stacked_margin,
	        ROUND(SUM(tiar.stacked_baseline_margin)::decimal, 2) AS stacked_baseline_margin,
	        ROUND(SUM(tiar.stacked_incremental_margin)::decimal, 2) AS stacked_incremental_margin,
	        ROUND(SUM(tiar.stacked_affinity_margin)::decimal, 2) AS stacked_affinity_margin,
	        ROUND(SUM(tiar.stacked_cannibalization_margin)::decimal, 2) AS stacked_cannibalization_margin,
	        ROUND(SUM(tiar.stacked_pull_forward_margin)::decimal, 2) AS stacked_pull_forward_margin,
	        ROUND(SUM(tiar.stacked_promo_spend)::decimal, 2) AS stacked_promo_spend,
	        CASE
	            WHEN SUM(tiar.stacked_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(tiar.stacked_revenue)::decimal, 2) / NULLIF(ROUND(SUM(tiar.stacked_sales_units)::decimal, 2), 0)::decimal,
	                2
	            )
	        END as stacked_aur,
	        CASE
	            WHEN SUM(tiar.stacked_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(tiar.stacked_margin)::decimal, 2) / NULLIF(ROUND(SUM(tiar.stacked_sales_units)::decimal, 2), 0)::decimal,
	                2
	            )
	        END as stacked_aum,
	        CASE
	            WHEN SUM(tiar.stacked_revenue) = 0 THEN NULL
	            ELSE ROUND(
	                (SUM(tiar.stacked_margin)::decimal * 100) / NULLIF(SUM(tiar.stacked_revenue), 0)::decimal,
	                2
	            )
	        END as stacked_gm_percent
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
	),
	final_stacked_override_metrics_cte as(
	    SELECT
	        tosr.promo_id,
	        tosr.scenario_id,
	        pdmc.product_id_column AS product_id,
	        pdmc.product_name_column AS product_name,
	        ROUND(SUM(tosr.stacked_override_sales_units)::decimal, 2) AS stacked_override_sales_units,
	        ROUND(SUM(tosr.stacked_override_baseline_sales_units)::decimal, 2) AS stacked_override_baseline_sales_units,
	        ROUND(SUM(tosr.stacked_override_incremental_sales_units)::decimal, 2) AS stacked_override_incremental_sales_units,
	        ROUND(SUM(tosr.stacked_override_revenue)::decimal, 2) AS stacked_override_revenue,
	        ROUND(SUM(tosr.stacked_override_baseline_revenue)::decimal, 2) AS stacked_override_baseline_revenue,
	        ROUND(SUM(tosr.stacked_override_incremental_revenue)::decimal, 2) AS stacked_override_incremental_revenue,
	        ROUND(SUM(tosr.stacked_override_affinity_revenue)::decimal, 2) AS stacked_override_affinity_revenue,
	        ROUND(SUM(tosr.stacked_override_cannibalization_revenue)::decimal, 2) AS stacked_override_cannibalization_revenue,
	        ROUND(SUM(tosr.stacked_override_pull_forward_revenue)::decimal, 2) AS stacked_override_pull_forward_revenue,
	        ROUND(SUM(tosr.stacked_override_margin)::decimal, 2) AS stacked_override_margin,
	        ROUND(SUM(tosr.stacked_override_baseline_margin)::decimal, 2) AS stacked_override_baseline_margin,
	        ROUND(SUM(tosr.stacked_override_incremental_margin)::decimal, 2) AS stacked_override_incremental_margin,
	        ROUND(SUM(tosr.stacked_override_affinity_margin)::decimal, 2) AS stacked_override_affinity_margin,
	        ROUND(SUM(tosr.stacked_override_cannibalization_margin)::decimal, 2) AS stacked_override_cannibalization_margin,
	        ROUND(SUM(tosr.stacked_override_pull_forward_margin)::decimal, 2) AS stacked_override_pull_forward_margin,
	        ROUND(SUM(tosr.stacked_override_promo_spend)::decimal, 2) AS stacked_override_promo_spend,
	        CASE
	            WHEN SUM(tosr.stacked_override_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(tosr.stacked_override_revenue)::decimal, 2) / NULLIF(ROUND(SUM(tosr.stacked_override_sales_units)::decimal, 2), 0)::decimal,2
	            )
	        END as stacked_override_aur,
	        CASE
	            WHEN SUM(tosr.stacked_override_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(tosr.stacked_override_margin)::decimal, 2) / NULLIF(ROUND(SUM(tosr.stacked_override_sales_units)::decimal,2),0)::decimal,2
	            )
	        END as stacked_override_aum,
	        CASE
	            WHEN SUM(tosr.stacked_override_revenue) = 0 THEN NULL
	            ELSE ROUND(
	                (SUM(tosr.stacked_override_margin)::decimal * 100) / NULLIF(SUM(tosr.stacked_override_revenue), 0)::decimal,2
	            )
	        END as stacked_override_gm_percent
	    FROM
	        temp_stacked_override_scenario_results tosr
	        LEFT JOIN prod_master_cte pdmc
	        ON tosr.product_id = pdmc.product_id
	    GROUP BY
	        tosr.promo_id,
	        tosr.scenario_id,
	        pdmc.product_id_column,
	        pdmc.product_name_column
	    UNION ALL
	    SELECT
	        toiar.promo_id,
	        0 AS scenario_id,
	        pdmc.product_id_column AS product_id,
	        pdmc.product_name_column AS product_name,
	        ROUND(SUM(toiar.stacked_override_sales_units)::decimal, 2) AS stacked_override_sales_units,
	        ROUND(SUM(toiar.stacked_override_baseline_sales_units)::decimal, 2) AS stacked_override_baseline_sales_units,
	        ROUND(SUM(toiar.stacked_override_incremental_sales_units)::decimal, 2) AS stacked_override_incremental_sales_units,
	        ROUND(SUM(toiar.stacked_override_revenue)::decimal, 2) AS stacked_override_revenue,
	        ROUND(SUM(toiar.stacked_override_baseline_revenue)::decimal, 2) AS stacked_override_baseline_revenue,
	        ROUND(SUM(toiar.stacked_override_incremental_revenue)::decimal, 2) AS stacked_override_incremental_revenue,
	        ROUND(SUM(toiar.stacked_override_affinity_revenue)::decimal, 2) AS stacked_override_affinity_revenue,
	        ROUND(SUM(toiar.stacked_override_cannibalization_revenue)::decimal, 2) AS stacked_override_cannibalization_revenue,
	        ROUND(SUM(toiar.stacked_override_pull_forward_revenue)::decimal, 2) AS stacked_override_pull_forward_revenue,
	        ROUND(SUM(toiar.stacked_override_margin)::decimal, 2) AS stacked_override_margin,
	        ROUND(SUM(toiar.stacked_override_baseline_margin)::decimal, 2) AS stacked_override_baseline_margin,
	        ROUND(SUM(toiar.stacked_override_incremental_margin)::decimal, 2) AS stacked_override_incremental_margin,
	        ROUND(SUM(toiar.stacked_override_affinity_margin)::decimal, 2) AS stacked_override_affinity_margin,
	        ROUND(SUM(toiar.stacked_override_cannibalization_margin)::decimal, 2) AS stacked_override_cannibalization_margin,
	        ROUND(SUM(toiar.stacked_override_pull_forward_margin)::decimal, 2) AS stacked_override_pull_forward_margin,
	        ROUND(SUM(toiar.stacked_override_promo_spend)::decimal, 2) AS stacked_override_promo_spend,
	        CASE
	            WHEN SUM(toiar.stacked_override_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(toiar.stacked_override_revenue)::decimal, 2) / NULLIF(ROUND(SUM(toiar.stacked_override_sales_units)::decimal, 2), 0)::decimal,2
	            )
	        END as stacked_override_aur,
	        CASE
	            WHEN SUM(toiar.stacked_override_sales_units) = 0 THEN NULL
	            ELSE ROUND(
	                ROUND(SUM(toiar.stacked_override_margin)::decimal, 2) / NULLIF(ROUND(SUM(toiar.stacked_override_sales_units)::decimal,2),0)::decimal,2
	            )
	        END as stacked_override_aum,
	        CASE
	            WHEN SUM(toiar.stacked_override_revenue) = 0 THEN NULL
	            ELSE ROUND(
	                (SUM(toiar.stacked_override_margin)::decimal * 100) / NULLIF(SUM(toiar.stacked_override_revenue), 0)::decimal,2
	            )
	        END as stacked_override_gm_percent
	    FROM
	        temp_stacked_override_ia_reccommend_results toiar
	        LEFT JOIN prod_master_cte pdmc
	        ON toiar.product_id = pdmc.product_id
	        LEFT JOIN price_promo.tb_promo_override_forecast tpof
	        ON toiar.promo_id = tpof.promo_id
	        AND tpof.scenario_id = 0
	    GROUP BY
	        toiar.promo_id,
	        pdmc.product_id_column,
	        pdmc.product_name_column
	),
    final_metrics_cte AS (
        SELECT *
        FROM final_original_metrics_cte fom
        LEFT JOIN final_override_metrics_cte fomc USING (promo_id, scenario_id, product_id, product_name)
        LEFT JOIN final_stacked_metrics_cte fsmc USING (promo_id, scenario_id, product_id, product_name)
        LEFT JOIN final_stacked_override_metrics_cte fsomc USING (promo_id, scenario_id, product_id, product_name)
    )
	SELECT
	    fmc.promo_id,
	    fmc.promo_name,
	    fmc.product_name,
	    fmc.scenario_name,
	    fmc.sales_units,
	    fmc.sales_units as total_sales_units,
	    fmc.baseline_sales_units,
	    fmc.incremental_sales_units,
	    fmc.revenue,
	    fmc.revenue as total_revenue,
	    fmc.baseline_revenue,
	    fmc.incremental_revenue,
	    fmc.affinity_revenue,
	    fmc.cannibalization_revenue,
	    fmc.pull_forward_revenue,
	    fmc.margin,
	    fmc.margin as total_margin,
	    fmc.baseline_margin,
	    fmc.incremental_margin,
	    fmc.affinity_margin,
	    fmc.cannibalization_margin,
	    fmc.pull_forward_margin,
	    fmc.promo_spend,
	    fmc.aur,
	    fmc.aum,
	    fmc.gm_percent,
	    fmc.override_sales_units,
	    fmc.override_sales_units as override_total_sales_units,
	    fmc.override_baseline_sales_units,
	    fmc.override_incremental_sales_units,
	    fmc.override_revenue,
	    fmc.override_revenue as override_total_revenue,
	    fmc.override_baseline_revenue,
	    fmc.override_incremental_revenue,
	    fmc.override_affinity_revenue,
	    fmc.override_cannibalization_revenue,
	    fmc.override_pull_forward_revenue,
	    fmc.override_margin,
	    fmc.override_margin as override_total_margin,
	    fmc.override_baseline_margin,
	    fmc.override_incremental_margin,
	    fmc.override_affinity_margin,
	    fmc.override_cannibalization_margin,
	    fmc.override_pull_forward_margin,
	    fmc.override_promo_spend,
	    fmc.override_aur,
	    fmc.override_aum,
	    fmc.override_gm_percent,
	    fmc.stacked_sales_units,
	    fmc.stacked_sales_units as stacked_total_sales_units,
	    fmc.stacked_baseline_sales_units,
	    fmc.stacked_incremental_sales_units,
	    fmc.stacked_revenue,
	    fmc.stacked_revenue as stacked_total_revenue,
	    fmc.stacked_baseline_revenue,
	    fmc.stacked_incremental_revenue,
	    fmc.stacked_affinity_revenue,
	    fmc.stacked_cannibalization_revenue,
	    fmc.stacked_pull_forward_revenue,
	    fmc.stacked_margin,
	    fmc.stacked_margin as stacked_total_margin,
	    fmc.stacked_baseline_margin,
	    fmc.stacked_incremental_margin,
	    fmc.stacked_affinity_margin,
	    fmc.stacked_cannibalization_margin,
	    fmc.stacked_pull_forward_margin,
	    fmc.stacked_promo_spend,
	    fmc.stacked_aur,
	    fmc.stacked_aum,
	    fmc.stacked_gm_percent,
	    fmc.stacked_override_sales_units,
	    fmc.stacked_override_sales_units as stacked_override_total_sales_units,
	    fmc.stacked_override_baseline_sales_units,
	    fmc.stacked_override_incremental_sales_units,
	    fmc.stacked_override_revenue,
	    fmc.stacked_override_revenue as stacked_override_total_revenue,
	    fmc.stacked_override_baseline_revenue,
	    fmc.stacked_override_incremental_revenue,
	    fmc.stacked_override_affinity_revenue,
	    fmc.stacked_override_cannibalization_revenue,
	    fmc.stacked_override_pull_forward_revenue,
	    fmc.stacked_override_margin,
	    fmc.stacked_override_margin as stacked_override_total_margin,
	    fmc.stacked_override_baseline_margin,
	    fmc.stacked_override_incremental_margin,
	    fmc.stacked_override_affinity_margin,
	    fmc.stacked_override_cannibalization_margin,
	    fmc.stacked_override_pull_forward_margin,
	    fmc.stacked_override_promo_spend,
	    fmc.stacked_override_aur,
	    fmc.stacked_override_aum,
	    fmc.stacked_override_gm_percent
	FROM
	    final_metrics_cte fmc ', array_to_string(scenario_list, ','), _promo_id, _aggregation);
    raise notice ' query  ---- %', vl_test_query;
    return query execute vl_test_query;
END;
$function$
;
