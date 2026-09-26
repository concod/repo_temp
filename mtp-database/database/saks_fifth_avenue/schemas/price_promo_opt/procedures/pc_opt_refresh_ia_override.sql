--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:pc_opt_refresh_ia_override runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_update
--comment: initial changeset for pc_update_is_processing_flag

DROP PROCEDURE IF EXISTS price_promo_opt.pc_opt_refresh_ia_override;

CREATE OR REPLACE PROCEDURE price_promo_opt.pc_opt_refresh_ia_override(IN p_promo_id integer[], IN _ia_multiplier_table text, IN _iao_temp_table text, IN _iaso_temp_table text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
declare
_query_1 text;
_query_2 text;
_query_3 text;
begin
    raise notice '--------------------------------------------------------------------------------------------------------------------';

    raise notice 'Promos to be refreshed : %', p_promo_id;

    _query_1 = FORMAT('DROP table if exists %1$s; create unlogged table %1$s as
                        (
                        with pccd as
                        (
                        select product_id, s0_id, s1_id, recommendation_date from price_promo.ps_recommended_ia_projected prs
                        where promo_id = any(%2$L)
                        group by 1,2,3,4
                        ),
                        iao_base as
                        (
                        select promo_id, product_id, s0_id, s1_id, recommendation_date, sales_units, baseline_sales_units, updated_at, ''ia'' as tag
                        from price_promo.ps_recommended_override_ia pro
                        join pccd
                        using(product_id, s0_id, s1_id, recommendation_date)
                        ),
                        ia_base as
                        (
                        select promo_id, product_id, s0_id, s1_id, recommendation_date, iao_base.sales_units, iao_base.baseline_sales_units, updated_at, ''ia'' as tag,
                        ia.sales_units as sales_normal, ia.baseline_sales_units as normal_baseline
                        from iao_base
                        join (select product_id, s0_id, s1_id, recommendation_date, sales_units, baseline_sales_units
                        from price_promo.ps_recommended_ia_projected
                        where promo_id = any(%2$L)) ia
                        using(product_id, s0_id, s1_id, recommendation_date)
                        ),
                        fino_base as
                        (
                        select promo_id, product_id, s0_id, s1_id, recommendation_date, sales_units, baseline_sales_units, updated_at, ''fin'' as tag from price_promo.ps_recommended_finalized_override pro
                        join pccd
                        using(product_id, s0_id, s1_id, recommendation_date)
                        ),
                        fin_base as
                        (
                        select promo_id, product_id, s0_id, s1_id, recommendation_date, fino_base.sales_units, fino_base.baseline_sales_units, updated_at, ''fin'' as tag,
                        fin.sales_units as sales_normal, fin.baseline_sales_units as normal_baseline
                        from fino_base
                        join (select promo_id, product_id, s0_id, s1_id, recommendation_date, sales_units, baseline_sales_units
                                from price_promo.ps_recommended_finalized
                        where promo_id = any(%2$L)) fin
                        using(promo_id, product_id, s0_id, s1_id, recommendation_date)
                        ),
                        base as
                        (
                        select *, row_number() over (partition by product_id, s0_id, s1_id, recommendation_date order by updated_at desc) as rnk from
                        (select * from ia_base union select * from fin_base) a
                        )
                        select *, coalesce(sales_units/nullif(sales_normal,0),1) as sales_units_multiplier,
                        coalesce(baseline_sales_units/nullif(normal_baseline,0),1) as baseline_sales_units_multiplier from base where rnk = 1
                        );', _ia_multiplier_table, p_promo_id);

                    raise notice 'query_1 : %', _query_1;
                    execute _query_1;

                _query_2 = FORMAT('DROP table if exists %1$s; create unlogged table %1$s
                                    as
                                    (
                                    select
                                    event_id, promo_id,
                                    prs.scenario_id,
                                    product_id,recommendation_date,s0_id,
                                    s1_id,discount_level_value,offer_type_id,
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
                                    from (select * from price_promo.ps_recommended_ia_projected where promo_id = any(%2$L)) prs
                                    join (select promo_id, product_id, s0_id, s1_id, recommendation_date, sales_units_multiplier, baseline_sales_units_multiplier
                                            from %3$s) sm
                                    using(promo_id, product_id, s0_id, s1_id, recommendation_date)
                                    );', _iao_temp_table, p_promo_id, _ia_multiplier_table);
                        raise notice '_query_2 : %', _query_2;
                        execute _query_2;

            _query_3 = FORMAT('DROP table if exists %1$s;
									create unlogged table %1$s
                                    as
                                    (
                                    select
                                    event_id, promo_id,
                                    prs.scenario_id,
                                    product_id,recommendation_date,s0_id,
                                    s1_id,discount_level_value,offer_type_id,
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
                                    from (select * from price_promo.ps_recommended_stack_ia where promo_id = any(%2$L)) prs
                                    join (select promo_id, product_id, s0_id, s1_id, recommendation_date, sales_units_multiplier, baseline_sales_units_multiplier
                                            from %3$s) sm
                                    using(promo_id, product_id, s0_id, s1_id, recommendation_date)
                                    );', _iaso_temp_table, p_promo_id, _ia_multiplier_table);
                        raise notice '_query_3 : %', _query_3;
                        execute _query_3;
end;
$procedure$
;
