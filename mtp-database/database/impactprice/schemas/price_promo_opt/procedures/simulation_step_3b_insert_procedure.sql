--liquibase formatted sql
--changeset vaibhav.bhosale@impactanalytics.co:simulation_step_3b_insert_procedure runOnChange:true stripComments:false splitStatements:false context:Release_1_0 labels:liquibase_project_start
--comment: stacking changes for simulation_step_3b_insert_procedure

DROP PROCEDURE if exists price_promo_opt.simulation_step_3b_insert_procedure;
CREATE OR REPLACE PROCEDURE price_promo_opt.simulation_step_3b_insert_procedure(IN var_promo_id integer, IN var_scenario_id integer, IN var_simulation_date date, IN var_is_stacked boolean DEFAULT false, IN var_target_normal_prefix text DEFAULT 'ps_recommended_scenarios'::text, IN var_target_stack_prefix text DEFAULT 'ps_recommended_scenarios_stack'::text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $procedure$
DECLARE
    query text;
    date_str text := to_char(var_simulation_date, 'YYYYMMDD');
    table_suffix text := format('%s_%s', var_promo_id, var_scenario_id);
    table_3b text;
    table_ps_rec text;
    v_row_count bigint;
BEGIN
    PERFORM set_config('synchronous_commit','off', true);

    -- Build 3B source table name (must match Step 3 naming)
    IF var_is_stacked THEN
        table_3b := format('simulation_flow_3b_stk_%s_%s', table_suffix, date_str);
        table_ps_rec := format('%s_%s_%s', var_target_stack_prefix, var_scenario_id, date_str);
    ELSE
        table_3b := format('simulation_flow_3b_%s_%s', table_suffix, date_str);
        table_ps_rec := format('%s_%s_%s', var_target_normal_prefix, var_scenario_id, date_str);
    END IF;

    RAISE NOTICE 'Step3B INSERT: source=price_promo_opt_temp.%, target=price_promo.%, stacked=%', table_3b, table_ps_rec, var_is_stacked;

    query := format($fmt$
        INSERT INTO price_promo.%I
        (promo_id, scenario_id, product_id, currency_id, recommendation_date,
        store_reco_level, customer_reco_level,
        offer_type_id, effective_discount, original_cost, discounted_price,
        sales_units, baseline_sales_units, incremental_sales_units, revenue, baseline_revenue, incremental_revenue,
        margin_wo_vf, margin, baseline_margin, incremental_margin, promo_spend,
        contribution_revenue, contribution_margin, coupon_spend, offer_type_combined_display_name)
        SELECT promo_id, scenario_id, product_id, currency_id, recommendation_date,
        store_reco_level, customer_reco_level,
        offer_type_id, effective_discount, original_cost, discounted_price,
        sales_units, baseline_sales_units, incremental_sales_units, revenue, baseline_revenue, incremental_revenue,
        margin_wo_vf, margin, baseline_margin, incremental_margin, promo_spend,
        contribution_revenue, contribution_margin, coupon_spend, offer_type_combined_display_name
        FROM price_promo_opt_temp.%I;
    $fmt$, table_ps_rec, table_3b);

    EXECUTE query;
    GET DIAGNOSTICS v_row_count = ROW_COUNT;
    RAISE NOTICE 'Step3B INSERT: % rows inserted into price_promo.% (stacked=%)', v_row_count, table_ps_rec, var_is_stacked;

END;
$procedure$
;
