--liquibase formatted sql
--changeset vamsi.balaga@impactanalytics.co:fn_copy_data_to_finalized runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: initial_function_create for fn_copy_data_to_finalized

DROP FUNCTION if exists price_promo.fn_copy_data_to_finalized;
CREATE OR REPLACE FUNCTION price_promo.fn_copy_data_to_finalized(
    p_promo_id int,
    p_scenario_id int,
    p_default text,
    p_user_id int
)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE

    _query text;
    _non_agg_table text;    
    _agg_table text;

BEGIN

    delete from price_promo.ps_recommended_finalized 
    where promo_id = p_promo_id;

    delete from price_promo.ps_recommended_finalized_agg
    where promo_id = p_promo_id;


    if p_default = 'overridden' then
        if p_scenario_id = 0 then
            _non_agg_table = 'price_promo.ps_recommended_override_ia';
            _agg_table = 'price_promo.ps_recommended_override_ia_agg';
        else
            _non_agg_table = 'price_promo.ps_recommended_override';
            _agg_table = 'price_promo.ps_recommended_override_agg';
        end if;
    else
        if p_scenario_id = 0 then
            _non_agg_table = 'price_promo.ps_recommended_ia_projected';
            _agg_table = 'price_promo.ps_recommended_ia_projected_agg';
        else
            _non_agg_table = 'price_promo.ps_recommended_scenarios';
            _agg_table = 'price_promo.ps_recommended_scenarios_agg';
        end if;
    end if;


    _query = format(
        'insert into price_promo.ps_recommended_finalized
        (
            event_id,
            promo_id,
            product_id,
            recommendation_date,
            s0_id,
            s1_id,
            discount_level_value,
            offer_type_id,
            offer_type_combined_display_name,
            effective_discount,
            original_price,
            original_cost,
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
            affinity_revenue,
            cannibalization_revenue,
            pull_forward_revenue,
            affinity_margin,
            cannibalization_margin,
            pull_forward_margin,
            recommendation_type_id,
            created_by,
            updated_by,
            created_at,
            updated_at,
            contribution_revenue,
            contribution_margin
        )
        select
            event_id,
            promo_id,
            product_id,
            recommendation_date,
            s0_id,
            s1_id,
            discount_level_value,
            offer_type_id,
            offer_type_combined_display_name,
            effective_discount,
            original_price,
            original_cost,
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
            affinity_revenue,
            cannibalization_revenue,
            pull_forward_revenue,
            affinity_margin,
            cannibalization_margin,
            pull_forward_margin,
            recommendation_type_id,
            created_by,
            updated_by,
            created_at,
            updated_at,
            contribution_revenue,
            contribution_margin
        from 
            %3$s
        where promo_id = %1$s %2$s;

        insert into price_promo.ps_recommended_finalized_agg
        (
            event_id, 
            promo_id, 
            recommendation_date, 
            discount_level_value, 
            offer_type_combined_display_name, 
            effective_discount, 
            original_price, 
            original_cost, 
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
            affinity_revenue, 
            cannibalization_revenue, 
            pull_forward_revenue, 
            affinity_margin, 
            cannibalization_margin, 
            pull_forward_margin, 
            recommendation_type_id, 
            created_by, 
            updated_by, 
            created_at, 
            updated_at, 
            contribution_revenue, 
            contribution_margin
        )
        select
            event_id, 
            promo_id, 
            recommendation_date, 
            discount_level_value, 
            offer_type_combined_display_name, 
            effective_discount, 
            original_price, 
            original_cost, 
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
            affinity_revenue, 
            cannibalization_revenue, 
            pull_forward_revenue, 
            affinity_margin, 
            cannibalization_margin, 
            pull_forward_margin, 
            recommendation_type_id, 
            created_by, 
            updated_by, 
            created_at, 
            updated_at, 
            contribution_revenue, 
            contribution_margin
        from 
            %4$s
        where promo_id = %1$s %2$s;
    ',
    p_promo_id,
    case when p_scenario_id = 0 then '' else format('and scenario_id = %1$s',p_scenario_id) end,
    _non_agg_table,
    _agg_table
    );


    execute _query;

    update price_promo.promo_master
    set is_overridden_scenario_finalized = 
        case 
        when p_default = 'overridden' then true
        else false 
        end,
        updated_by = p_user_id
    where promo_id = p_promo_id;

END;
$function$
;
