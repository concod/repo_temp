--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_update_promo_forecast_using_multiplier_method-19110605 runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for fn_update_promo_forecast_using_multiplier_method

DROP FUNCTION if exists price_promo.fn_update_promo_forecast_using_multiplier_method;
CREATE OR REPLACE FUNCTION price_promo.fn_update_promo_forecast_using_multiplier_method(
    p_promo_id int,
    p_scenario_id int,
    p_new_sales_units float8,
    p_new_baseline_sales_units float8,
    p_old_sales_units float8,
    p_user_id int,
    p_old_baseline_sales_units float8,
    p_from_stacking_view bool default false
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
    _query text;
	_source_table text;
    _sales_units_multiplier float8;
    _baseline_sales_units_multiplier float8;
    _override_table text;
    _override_agg_table text;
BEGIN

    p_new_sales_units = coalesce(p_new_sales_units,p_old_sales_units);
    p_new_baseline_sales_units = coalesce(p_new_baseline_sales_units,p_old_baseline_sales_units);

    _sales_units_multiplier = p_new_sales_units/p_old_sales_units;
    _baseline_sales_units_multiplier = p_new_baseline_sales_units/p_old_baseline_sales_units;

    if p_from_stacking_view then
        if p_scenario_id = 0 then
            _source_table = 'price_promo.ps_recommended_stack_ia';
            _override_table = 'price_promo.ps_recommended_stack_override_ia';
            _override_agg_table = 'price_promo.ps_recommended_stack_override_ia_agg';
        else
            _source_table = 'price_promo.ps_recommended_scenarios_stack';
            _override_table = 'price_promo.ps_recommended_scenarios_stack_override';
            _override_agg_table = 'price_promo.ps_recommended_scenarios_stack_override_agg';
        end if;
    else 
        if p_scenario_id = 0 then
            _source_table = 'price_promo.ps_recommended_ia_projected';
            _override_table = 'price_promo.ps_recommended_override_ia';
            _override_agg_table = 'price_promo.ps_recommended_override_ia_agg';
        else
            _source_table = 'price_promo.ps_recommended_scenarios';
            _override_table = 'price_promo.ps_recommended_override';
            _override_agg_table = 'price_promo.ps_recommended_override_agg';
        end if;
    end if;


    _query = format('
        delete from %2$s
        where promo_id = %1$s %4$s;
        delete from %3$s
        where promo_id = %1$s %4$s;
    ',
    p_promo_id,
    _override_table,
    _override_agg_table,
    case when p_scenario_id !=0 then format('and scenario_id = %1$s',p_scenario_id) else '' end

    );
	execute _query;

    raise notice '_source_table: %', _source_table;

    _query = format('
        insert into %7$s
        (
            event_id,promo_id,
            %8$s
            product_id,recommendation_date,s0_id,
            s1_id,discount_level_value,offer_type_id,
            offer_type_combined_display_name,
            effective_discount,original_price,original_cost,
            discounted_price,
            promo_spend,
            sales_units,
            baseline_sales_units,
            incremental_sales_units,
            sales_units_lift,
            revenue,
            baseline_revenue,
            incremental_revenue,
            revenue_lift,
            margin,
            baseline_margin,
            incremental_margin,
            margin_lift,
            aur,
            aum,
            affinity_units,
            cannibalization_units,
            pull_forward_units,
            affinity_revenue,
            cannibalization_revenue,
            pull_forward_revenue,
            affinity_margin,
            cannibalization_margin,
            pull_forward_margin,
            calculated_discount,
            sales_units_store_day,
            attractiveness_factor,
            store_split_factor,
            day_split_factor,
            fatigue_factor,
            loyalty_factor_final,
            created_by,
            updated_by,
            created_at,
            recommendation_type_id,
            updated_at,
            contribution_revenue,
            contribution_margin
        )
        select 
            event_id,promo_id,
            %8$s
            product_id,recommendation_date,s0_id,
            s1_id,discount_level_value,offer_type_id,
            offer_type_combined_display_name,
            effective_discount,original_price,original_cost,
            discounted_price,
            promo_spend*%3$s as promo_spend,
            sales_units*%3$s as sales_units,
            baseline_sales_units*%4$s baseline_sales_units,
            (sales_units*%3$s)-(baseline_sales_units*%4$s) as incremental_sales_units,
            (sales_units*%3$s)-(baseline_sales_units*%4$s) as sales_units_lift,
            revenue*%3$s as revenue,
            baseline_revenue*%4$s as baseline_revenue,
            (revenue*%3$s) - (baseline_revenue*%4$s) as incremental_revenue,
            (revenue*%3$s) - (baseline_revenue*%4$s) as revenue_lift,
            margin*%3$s as margin,
            baseline_margin*%4$s as baseline_margin,
            (margin*%3$s) - (baseline_margin*%4$s) as incremental_margin,
            (margin*%3$s) - (baseline_margin*%4$s) as margin_lift,
            aur,
            aum,
            affinity_units*%3$s as affinity_units,
            cannibalization_units*%3$s as cannibalization_units,
            pull_forward_units*%3$s as pull_forward_units,
            affinity_revenue*%3$s as affinity_revenue,
            cannibalization_revenue*%3$s as cannibalization_revenue,
            pull_forward_revenue*%3$s as pull_forward_revenue,
            affinity_margin*%3$s as affinity_margin,
            cannibalization_margin*%3$s as cannibalization_margin,
            pull_forward_margin*%3$s as pull_forward_margin,
            calculated_discount,
            sales_units_store_day,
            attractiveness_factor,
            store_split_factor,
            day_split_factor,
            fatigue_factor,
            loyalty_factor_final,
            %6$s as created_by,
            null as updated_by,
            now() as created_at,
            recommendation_type_id,
            null as updated_at,
            contribution_revenue*%3$s as contribution_revenue,
            contribution_margin*%3$s as contribution_margin
        from 
            %5$s
        where promo_id = %1$s 
        %9$s
        ',
    p_promo_id,
    p_scenario_id,
    _sales_units_multiplier,
    _baseline_sales_units_multiplier,
    _source_table,
    p_user_id,
    _override_table,
    case when p_scenario_id !=0 then 'scenario_id,' else '' end,
    case when p_scenario_id !=0 then format('and scenario_id = %1$s',p_scenario_id) else '' end
    );


    raise notice 'query: %', _query;
    execute _query;


    if p_scenario_id = 0 then
        _query = format('
            INSERT INTO %3$s(
                event_id,
                promo_id,
                recommendation_date,
                discount_level_value,
                OFFER_TYPE_COMBINED_DISPLAY_NAME ,
                effective_discount,
                original_price,
                original_cost,
                discounted_price,
                promo_spend,
                sales_units,
                baseline_sales_units,
                incremental_sales_units,
                SALES_UNITS_LIFT,
                revenue,
                baseline_revenue,
                incremental_revenue,
                revenue_lift,
                margin,
                baseline_margin,
                incremental_margin,
                margin_lift,
                aur,
                aum,
                affinity_revenue,
                cannibalization_revenue,
                pull_forward_revenue,
                affinity_margin,
                cannibalization_margin,
                pull_forward_margin,
                contribution_margin,
                contribution_revenue,
                RECOMMENDATION_TYPE_ID ,
                created_by,
                updated_by,
                created_at,
                updated_at
            )
            SELECT
                event_id,
                promo_id,
                recommendation_date,
                MAX(discount_level_value) AS discount_level_value,
                MAX(OFFER_TYPE_COMBINED_DISPLAY_NAME) AS OFFER_TYPE_COMBINED_DISPLAY_NAME,
                AVG(effective_discount) AS effective_discount,
                AVG(original_price) AS original_price,
                AVG(original_cost) AS original_cost,
                AVG(discounted_price) AS discounted_price,
                SUM(promo_spend) AS promo_spend,
                SUM(sales_units) AS sales_units,
                SUM(baseline_sales_units) AS baseline_sales_units,
                SUM(incremental_sales_units) AS incremental_sales_units,
                SUM(SALES_UNITS_LIFT) AS SALES_UNITS_LIFT,
                SUM(revenue) AS revenue,
                SUM(baseline_revenue) AS baseline_revenue,
                SUM(incremental_revenue) AS incremental_revenue,
                SUM(revenue_lift) AS revenue_lift,
                SUM(margin) AS margin,
                SUM(baseline_margin) AS baseline_margin,
                SUM(incremental_margin) AS incremental_margin,
                SUM(margin_lift) AS margin_lift,
                AVG(aur) AS aur,
                AVG(aum) AS aum,
                SUM(affinity_revenue) AS affinity_revenue,
                SUM(cannibalization_revenue) AS cannibalization_revenue,
                SUM(pull_forward_revenue) AS pull_forward_revenue,
                SUM(affinity_margin) AS affinity_margin,
                SUM(cannibalization_margin) AS cannibalization_margin,
                SUM(pull_forward_margin) AS pull_forward_margin,
                sum(contribution_margin) as contribution_margin,
                sum(contribution_revenue) as contribution_revenue,
                MAX(RECOMMENDATION_TYPE_ID) AS RECOMMENDATION_TYPE_ID,
                MAX(created_by) AS created_by,
                MAX(updated_by) AS updated_by,
                MAX(created_at) AS created_at,
                MAX(updated_at) AS updated_at
            FROM
                %2$s
            WHERE
                promo_id = %1$s 
            GROUP BY
                event_id, promo_id, recommendation_date;
            ',
            p_promo_id,
            _override_table,
            _override_agg_table

        );
    else 
        _query = format('
            INSERT INTO %3$s (
                event_id,
                promo_id,
                scenario_id,
                recommendation_date,
                discount_level_value,
                OFFER_TYPE_COMBINED_DISPLAY_NAME ,
                effective_discount,
                original_price,
                original_cost,
                discounted_price,
                promo_spend,
                sales_units,
                baseline_sales_units,
                incremental_sales_units,
                SALES_UNITS_LIFT,
                revenue,
                baseline_revenue,
                incremental_revenue,
                revenue_lift,
                margin,
                baseline_margin,
                incremental_margin,
                margin_lift,
                aur,
                aum,
                affinity_revenue,
                cannibalization_revenue,
                pull_forward_revenue,
                affinity_margin,
                cannibalization_margin,
                pull_forward_margin,
                RECOMMENDATION_TYPE_ID ,
                contribution_margin,
                contribution_revenue,
                created_by,
                updated_by,
                created_at,
                updated_at,
                offer_type_id
            )
            SELECT
                event_id,
                promo_id,
                scenario_id,
                recommendation_date,
                discount_level_value,
                CASE
                    WHEN offer_type_scenario = ''tiered_offer'' THEN concat(effective_discount::int, '' %%'')
                    ELSE OFFER_TYPE_COMBINED_DISPLAY_NAME
                END AS OFFER_TYPE_COMBINED_DISPLAY_NAME ,
                effective_discount,
                original_price,
                original_cost,
                discounted_price,
                promo_spend,
                sales_units,
                baseline_sales_units,
                incremental_sales_units,
                SALES_UNITS_LIFT,
                revenue,
                baseline_revenue,
                incremental_revenue,
                revenue_lift,
                margin,
                baseline_margin,
                incremental_margin,
                margin_lift,
                aur,
                aum,
                affinity_revenue,
                cannibalization_revenue,
                pull_forward_revenue,
                affinity_margin,
                cannibalization_margin,
                pull_forward_margin,
                RECOMMENDATION_TYPE_ID ,
                contribution_margin,
                contribution_revenue,
                created_by,
                updated_by,
                created_at,
                updated_at,
                offer_type_id
            FROM
                (
                SELECT
                    event_id,
                    promo_id,
                    scenario_id,
                    recommendation_date,
                    MAX(discount_level_value) AS discount_level_value,
                    MAX(OFFER_TYPE_COMBINED_DISPLAY_NAME) AS OFFER_TYPE_COMBINED_DISPLAY_NAME,
                    AVG(effective_discount) AS effective_discount,
                    AVG(original_price) AS original_price,
                    AVG(original_cost) AS original_cost,
                    AVG(discounted_price) AS discounted_price,
                    SUM(promo_spend) AS promo_spend,
                    SUM(sales_units) AS sales_units,
                    SUM(baseline_sales_units) AS baseline_sales_units,
                    SUM(incremental_sales_units) AS incremental_sales_units,
                    SUM(SALES_UNITS_LIFT) AS SALES_UNITS_LIFT,
                    SUM(revenue) AS revenue,
                    SUM(baseline_revenue) AS baseline_revenue,
                    SUM(incremental_revenue) AS incremental_revenue,
                    SUM(revenue_lift) AS revenue_lift,
                    SUM(margin) AS margin,
                    SUM(baseline_margin) AS baseline_margin,
                    SUM(incremental_margin) AS incremental_margin,
                    SUM(margin_lift) AS margin_lift,
                    AVG(aur) AS aur,
                    AVG(aum) AS aum,
                    SUM(affinity_revenue) AS affinity_revenue,
                    SUM(cannibalization_revenue) AS cannibalization_revenue,
                    SUM(pull_forward_revenue) AS pull_forward_revenue,
                    SUM(affinity_margin) AS affinity_margin,
                    SUM(cannibalization_margin) AS cannibalization_margin,
                    SUM(pull_forward_margin) AS pull_forward_margin,
                    MAX(RECOMMENDATION_TYPE_ID) AS RECOMMENDATION_TYPE_ID,
                    sum(contribution_margin) as contribution_margin,
                    sum(contribution_revenue) as contribution_revenue,
                    MAX(created_by) AS created_by,
                    MAX(updated_by) AS updated_by,
                    MAX(created_at) AS created_at,
                    now()::timestamptz AS updated_at,
                    MAX(offer_type_id) AS offer_type_id
                FROM
                    %2$s
                WHERE
                    scenario_id = %1$s
                GROUP BY
                    scenario_id,
                    event_id,
                    promo_id,
                    recommendation_date,
                    updated_at
                ) s
                CROSS JOIN
                (
                SELECT
                    DISTINCT offer_type AS offer_type_scenario
                FROM
                    price_promo.ps_scenario_discounts
                WHERE
                    scenario_id = %1$s
                ) b;
            ',
            p_scenario_id,
            _override_table,
            _override_agg_table
        );
    end if;

END
$function$
;
