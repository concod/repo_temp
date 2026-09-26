--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_refresh_scenarios_override runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_opt_refresh_scenarios_override

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_refresh_scenarios_override ;
CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_refresh_scenarios_override(IN p_promo_id integer[], IN _sc_multiplier_table character varying, IN _sco_temp_table character varying, IN _scso_temp_table character varying, IN pccd_table character varying)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$

declare

_query_1 varchar;

_query_2 varchar;

_query_3 varchar;

_scenario_ids integer[];

begin
---------------------------------------------------------------------------------

RAISE NOTICE 'Before enable_nestloop=%', current_setting('enable_nestloop', true);
--PERFORM set_config('enable_nestloop', 'off', true);
SET LOCAL enable_nestloop to off;
RAISE NOTICE 'enable_nestloop=%', current_setting('enable_nestloop', true);

---------------------------------------------------------------------------------

    raise notice '--------------------------------------------------------------------------------------------------------------------';

    select array_agg(scenario_id) from price_promo.scenario_master pm

    where promo_id = any(p_promo_id) into _scenario_ids;



    raise notice 'Scenarios to be refreshed : %', _scenario_ids;



    _query_1 = FORMAT('DROP table if exists %1$s;

						create unlogged table %1$s as

                        (

                        with pccd as materialized

                        (

                        select product_id, store_hierarchy, customer_id, recommendation_date from price_promo.ps_recommended_scenarios prs
						INNER JOIN %5$s using(product_id, store_hierarchy, customer_id, recommendation_date)
                        where prs.scenario_id = any(%2$L)

                        group by 1,2,3,4

                        ),

                        sco_base as materialized

                        (

                        select promo_id, scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date, sales_units, baseline_sales_units, updated_at, ''sc'' as tag

                        from (select * from price_promo.ps_recommended_override where scenario_id = any(%2$L) ) pro

                        join pccd

                        using(product_id,  store_hierarchy, customer_id, recommendation_date)

                        ),

                        sc_base as materialized

                        (

                        select promo_id, scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date, sco_base.sales_units, sco_base.baseline_sales_units, updated_at, ''sc'' as tag,

                        sc.sales_units as sales_normal, sc.baseline_sales_units as normal_baseline

                        from sco_base

                        join (select scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date, sales_units, baseline_sales_units

                        from price_promo.ps_recommended_scenarios

                        where scenario_id = any(%2$L))sc

                        using(scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date)

                        ),

                        fino_base as materialized

                        (

                        select promo_id, sm2.scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date, sales_units, baseline_sales_units, pro.updated_at, ''fin'' as tag

						from (select * from price_promo.ps_recommended_finalized_override where promo_id = any(%3$L)) pro

                        join pccd

                        using(product_id,  store_hierarchy, customer_id, recommendation_date)

                        join price_promo.scenario_master sm2

                        using(promo_id)

                        ),

                        fin_base as materialized

                        (

                        select promo_id, scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date, fino_base.sales_units, fino_base.baseline_sales_units, fino_base.updated_at, ''fin'' as tag,

                        fin.sales_units as sales_normal, fin.baseline_sales_units as normal_baseline

                        from fino_base

                        join (select promo_id, product_id,  store_hierarchy, customer_id, recommendation_date, sales_units, baseline_sales_units

                                from price_promo.ps_recommended_finalized

                        where promo_id = any(%3$L)) fin

                        using(promo_id, product_id,  store_hierarchy, customer_id, recommendation_date)

                        ),

                        base as materialized

                        (

                        select *, row_number() over (partition by scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date order by updated_at desc) as rnk from

                        (select * from sc_base union select * from fin_base) a

                        )

                        select *, coalesce(sales_units/nullif(sales_normal,0),1) as sales_units_multiplier,

                        coalesce(baseline_sales_units/nullif(normal_baseline,0),1) as baseline_sales_units_multiplier from base where rnk = 1

                        );

						ANALYZE %s				

						', _sc_multiplier_table, _scenario_ids, p_promo_id,_sc_multiplier_table, pccd_table);



                    raise notice 'query_1 : %', _query_1;

                    execute _query_1;



                _query_2 = FORMAT('DROP table if exists %1$s;

							create unlogged table %1$s

                                    as

                                    (

                                    select

                                    event_id, promo_id,

                                    prs.scenario_id,

                                    product_id,recommendation_date,offer_type_combined_display_name,store_hierarchy,

                                    customer_id,discount_level_value,offer_type_id,

                                    effective_discount,original_cost,

                                    discounted_price,

                                    promo_spend*coalesce(sales_units_multiplier, 1) as promo_spend,

                                    sales_units*coalesce(sales_units_multiplier, 1) as sales_units,

                                    baseline_sales_units*coalesce(baseline_sales_units_multiplier, 1) baseline_sales_units,

                                    (sales_units*coalesce(sales_units_multiplier, 1))-(baseline_sales_units*coalesce(baseline_sales_units_multiplier, 1)) as incremental_sales_units,

                                    revenue*coalesce(sales_units_multiplier, 1) as revenue,

                                    baseline_revenue*coalesce(baseline_sales_units_multiplier, 1) as baseline_revenue,

                                    (revenue*coalesce(sales_units_multiplier, 1)) - (baseline_revenue*coalesce(baseline_sales_units_multiplier, 1)) as incremental_revenue,

                                    margin*coalesce(sales_units_multiplier, 1) as margin,

                                    baseline_margin*coalesce(baseline_sales_units_multiplier, 1) as baseline_margin,

                                    (margin*coalesce(sales_units_multiplier, 1)) - (baseline_margin*coalesce(baseline_sales_units_multiplier, 1)) as incremental_margin,

                                    affinity_units*coalesce(sales_units_multiplier, 1) as affinity_units,

                                    cannibalization_units*coalesce(sales_units_multiplier, 1) as cannibalization_units,

                                    pull_forward_units*coalesce(sales_units_multiplier, 1) as pull_forward_units,

                                    affinity_revenue*coalesce(sales_units_multiplier, 1) as affinity_revenue,

                                    cannibalization_revenue*coalesce(sales_units_multiplier, 1) as cannibalization_revenue,

                                    pull_forward_revenue*coalesce(sales_units_multiplier, 1) as pull_forward_revenue,

                                    affinity_margin*coalesce(sales_units_multiplier, 1) as affinity_margin,

                                    cannibalization_margin*coalesce(sales_units_multiplier, 1) as cannibalization_margin,

                                    pull_forward_margin*coalesce(sales_units_multiplier, 1) as pull_forward_margin,

                                    calculated_discount,

                                    created_by,

                                    null as updated_by,

                                    created_at,

                                    now() as updated_at,

                                    contribution_revenue*coalesce(sales_units_multiplier, 1) as contribution_revenue,

                                    contribution_margin*coalesce(sales_units_multiplier, 1) as contribution_margin

                                    from (select * from price_promo.ps_recommended_scenarios where scenario_id = any(%2$L)) prs

                                    join (select scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date, sales_units_multiplier, baseline_sales_units_multiplier

                                            from %3$s) sm

                                    using(scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date)

                                    );', _sco_temp_table, _scenario_ids, _sc_multiplier_table);

                        raise notice '_query_2 : %', _query_2;

                        execute _query_2;



            _query_3 = FORMAT(' DROP table if exists %1$s; create unlogged table %1$s

                                    as

                                    (

                                    select

                                    event_id, promo_id,

                                    prs.scenario_id,

                                    product_id,recommendation_date,offer_type_combined_display_name,store_hierarchy,

                                    customer_id,discount_level_value,offer_type_id,

                                    effective_discount,original_cost,

                                    discounted_price,

                                    promo_spend*coalesce(sales_units_multiplier, 1) as promo_spend,

                                    sales_units*coalesce(sales_units_multiplier, 1) as sales_units,

                                    baseline_sales_units*coalesce(baseline_sales_units_multiplier, 1) baseline_sales_units,

                                    (sales_units*coalesce(sales_units_multiplier, 1))-(baseline_sales_units*coalesce(baseline_sales_units_multiplier, 1)) as incremental_sales_units,

                                    revenue*coalesce(sales_units_multiplier, 1) as revenue,

                                    baseline_revenue*coalesce(baseline_sales_units_multiplier, 1) as baseline_revenue,

                                    (revenue*coalesce(sales_units_multiplier, 1)) - (baseline_revenue*coalesce(baseline_sales_units_multiplier, 1)) as incremental_revenue,

                                    margin*coalesce(sales_units_multiplier, 1) as margin,

                                    baseline_margin*coalesce(baseline_sales_units_multiplier, 1) as baseline_margin,

                                    (margin*coalesce(sales_units_multiplier, 1)) - (baseline_margin*coalesce(baseline_sales_units_multiplier, 1)) as incremental_margin,

                                    affinity_units*coalesce(sales_units_multiplier, 1) as affinity_units,

                                    cannibalization_units*coalesce(sales_units_multiplier, 1) as cannibalization_units,

                                    pull_forward_units*coalesce(sales_units_multiplier, 1) as pull_forward_units,

                                    affinity_revenue*coalesce(sales_units_multiplier, 1) as affinity_revenue,

                                    cannibalization_revenue*coalesce(sales_units_multiplier, 1) as cannibalization_revenue,

                                    pull_forward_revenue*coalesce(sales_units_multiplier, 1) as pull_forward_revenue,

                                    affinity_margin*coalesce(sales_units_multiplier, 1) as affinity_margin,

                                    cannibalization_margin*coalesce(sales_units_multiplier, 1) as cannibalization_margin,

                                    pull_forward_margin*coalesce(sales_units_multiplier, 1) as pull_forward_margin,

                                    calculated_discount,

                                    created_by,

                                    null as updated_by,

                                    created_at,

                                    now() as updated_at,

                                    contribution_revenue*coalesce(sales_units_multiplier, 1) as contribution_revenue,

                                    contribution_margin*coalesce(sales_units_multiplier, 1) as contribution_margin

                                    from (select * from price_promo.ps_recommended_scenarios_stack where scenario_id = any(%2$L)) prs

                                    join (select scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date, sales_units_multiplier, baseline_sales_units_multiplier

                                            from %3$s) sm

                                    using(scenario_id, product_id,  store_hierarchy, customer_id, recommendation_date)

                                    );', _scso_temp_table, _scenario_ids, _sc_multiplier_table);

                        raise notice '_query_3 : %', _query_3;

                        execute _query_3;

end;

$procedure$
;
